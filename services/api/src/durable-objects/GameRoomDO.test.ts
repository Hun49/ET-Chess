import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameRoomDO } from './GameRoomDO';

class MockWebSocket {
  public sentMessages: string[] = [];
  public attachment: any = null;
  public tags: string[] = [];
  public readyState = 1;

  serializeAttachment(attachment: any) {
    this.attachment = attachment;
  }

  deserializeAttachment() {
    return this.attachment;
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = 3;
  }
}

class MockWebSocketPair {
  0: MockWebSocket;
  1: MockWebSocket;
  constructor() {
    this[0] = new MockWebSocket();
    this[1] = new MockWebSocket();
  }
}

(globalThis as unknown as Record<string, unknown>).WebSocketPair = MockWebSocketPair;

const OriginalResponse = (globalThis as any).__OriginalResponse || globalThis.Response;
(globalThis as any).__OriginalResponse = OriginalResponse;

class MockResponse extends OriginalResponse {
  constructor(body?: any, init?: ResponseInit & { webSocket?: any }) {
    if (init && init.status === 101) {
      super(body, { ...init, status: 200 });
      Object.defineProperty(this, 'status', { value: 101, configurable: true });
      if (init.webSocket) {
        Object.defineProperty(this, 'webSocket', { value: init.webSocket, configurable: true });
      }
      return;
    }
    super(body, init);
    if (init && (init as any).webSocket) {
      Object.defineProperty(this, 'webSocket', {
        value: (init as any).webSocket,
        configurable: true,
      });
    }
  }
}
(globalThis as unknown as Record<string, unknown>).Response = MockResponse;

function createMockDOContext() {
  const storage = new Map<string, any>();
  let scheduledAlarm: number | null = null;
  const webSockets: MockWebSocket[] = [];

  const ctx: any = {
    storage: {
      get: vi.fn(async (key: string) => storage.get(key)),
      put: vi.fn(async (key: string, val: any) => {
        storage.set(key, val);
      }),
      delete: vi.fn(async (key: string) => {
        storage.delete(key);
      }),
      setAlarm: vi.fn(async (time: number) => {
        scheduledAlarm = time;
      }),
      deleteAlarm: vi.fn(async () => {
        scheduledAlarm = null;
      }),
      getAlarm: vi.fn(async () => scheduledAlarm),
    },
    acceptWebSocket: vi.fn((ws: any, tags: string[] = []) => {
      ws.tags = tags;
      webSockets.push(ws);
    }),
    getWebSockets: vi.fn((tag?: string) => {
      if (!tag) return webSockets;
      return webSockets.filter((ws) => ws.tags.includes(tag));
    }),
  };

  return { ctx, storage, webSockets, getScheduledAlarm: () => scheduledAlarm };
}

describe('GameRoomDO Server-Authoritative Live Engine', () => {
  let mockCtx: ReturnType<typeof createMockDOContext>;
  let roomDO: GameRoomDO;

  beforeEach(async () => {
    mockCtx = createMockDOContext();
    roomDO = new GameRoomDO(mockCtx.ctx, {});

    // Initialize game with two players
    await roomDO.fetch(
      new Request('http://localhost/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'game-123',
          whiteUserId: 'alice-id',
          whiteDisplayName: 'Alice',
          blackUserId: 'bob-id',
          blackDisplayName: 'Bob',
        }),
      }),
    );
  });

  describe('Handshake & Authorization', () => {
    it('rejects unauthorized third party joining the live game', async () => {
      const res = await roomDO.fetch(
        new Request('http://localhost/ws?userId=charlie-id', {
          headers: { Upgrade: 'websocket' },
        }),
      );
      expect(res.status).toBe(403);
    });

    it('rejects connection missing userId query param', async () => {
      const res = await roomDO.fetch(
        new Request('http://localhost/ws', {
          headers: { Upgrade: 'websocket' },
        }),
      );
      expect(res.status).toBe(400);
    });

    it('successfully accepts authorized white player with 101 Switching Protocols', async () => {
      const res = await roomDO.fetch(
        new Request('http://localhost/ws?userId=alice-id', {
          headers: { Upgrade: 'websocket' },
        }),
      );
      expect(res.status).toBe(101);
      expect(mockCtx.ctx.acceptWebSocket).toHaveBeenCalled();
    });
  });

  describe('Move validation & Scholar’s mate progression', () => {
    let whiteWs: MockWebSocket;
    let blackWs: MockWebSocket;

    beforeEach(() => {
      whiteWs = new MockWebSocket();
      whiteWs.serializeAttachment({
        userId: 'alice-id',
        displayName: 'Alice',
        color: 'white',
      });
      whiteWs.tags = ['alice-id', 'white'];
      mockCtx.webSockets.push(whiteWs);

      blackWs = new MockWebSocket();
      blackWs.serializeAttachment({
        userId: 'bob-id',
        displayName: 'Bob',
        color: 'black',
      });
      blackWs.tags = ['bob-id', 'black'];
      mockCtx.webSockets.push(blackWs);
    });

    it('rejects move when it is not sender’s turn without mutating state', async () => {
      // Black tries to move first
      await roomDO.webSocketMessage(
        blackWs as any,
        JSON.stringify({
          type: 'move',
          move: { from: 'e7', to: 'e5' },
        }),
      );

      expect(blackWs.sentMessages).toHaveLength(1);
      const parsed = JSON.parse(blackWs.sentMessages[0]!);
      expect(parsed.type).toBe('error');
      expect(parsed.message).toContain('not your turn');
    });

    it('rejects illegal move without mutating state', async () => {
      // White tries illegal move e2 -> e5
      await roomDO.webSocketMessage(
        whiteWs as any,
        JSON.stringify({
          type: 'move',
          move: { from: 'e2', to: 'e5' },
        }),
      );

      expect(whiteWs.sentMessages).toHaveLength(1);
      const parsed = JSON.parse(whiteWs.sentMessages[0]!);
      expect(parsed.type).toBe('error');
      expect(parsed.message).toMatch(/(Invalid|Illegal) move/);
    });

    it('applies legal move and broadcasts state-sync to both players', async () => {
      // White plays e2 -> e4
      await roomDO.webSocketMessage(
        whiteWs as any,
        JSON.stringify({
          type: 'move',
          move: { from: 'e2', to: 'e4' },
        }),
      );

      // Both sockets should have received the state-sync broadcast
      expect(whiteWs.sentMessages.length).toBeGreaterThan(0);
      expect(blackWs.sentMessages.length).toBeGreaterThan(0);

      const syncMsg = JSON.parse(whiteWs.sentMessages[whiteWs.sentMessages.length - 1]!);
      expect(syncMsg.type).toBe('state-sync');
      expect(syncMsg.gameState.turn).toBe('black');
      expect(syncMsg.gameState.moveHistory).toHaveLength(1);
    });

    it('completes full Scholar’s mate sequence and broadcasts game-over', async () => {
      // 1. e4 e5
      await roomDO.webSocketMessage(
        whiteWs as any,
        JSON.stringify({ type: 'move', move: { from: 'e2', to: 'e4' } }),
      );
      await roomDO.webSocketMessage(
        blackWs as any,
        JSON.stringify({ type: 'move', move: { from: 'e7', to: 'e5' } }),
      );

      // 2. Qh5 Nc6
      await roomDO.webSocketMessage(
        whiteWs as any,
        JSON.stringify({ type: 'move', move: { from: 'd1', to: 'h5' } }),
      );
      await roomDO.webSocketMessage(
        blackWs as any,
        JSON.stringify({ type: 'move', move: { from: 'b8', to: 'c6' } }),
      );

      // 3. Bc4 Nf6
      await roomDO.webSocketMessage(
        whiteWs as any,
        JSON.stringify({ type: 'move', move: { from: 'f1', to: 'c4' } }),
      );
      await roomDO.webSocketMessage(
        blackWs as any,
        JSON.stringify({ type: 'move', move: { from: 'g8', to: 'f6' } }),
      );

      // 4. Qxf7#
      await roomDO.webSocketMessage(
        whiteWs as any,
        JSON.stringify({ type: 'move', move: { from: 'h5', to: 'f7' } }),
      );

      const lastWhiteMsg = JSON.parse(whiteWs.sentMessages[whiteWs.sentMessages.length - 1]!);
      expect(lastWhiteMsg.type).toBe('game-over');
      expect(lastWhiteMsg.result).toBe('white');
      expect(lastWhiteMsg.reason).toContain('Checkmate');

      const lastBlackMsg = JSON.parse(blackWs.sentMessages[blackWs.sentMessages.length - 1]!);
      expect(lastBlackMsg.type).toBe('game-over');
      expect(lastBlackMsg.result).toBe('white');
    });
  });

  describe('Resignation and Draw Negotiations', () => {
    let whiteWs: MockWebSocket;
    let blackWs: MockWebSocket;

    beforeEach(() => {
      whiteWs = new MockWebSocket();
      whiteWs.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
      whiteWs.tags = ['alice-id', 'white'];
      mockCtx.webSockets.push(whiteWs);

      blackWs = new MockWebSocket();
      blackWs.serializeAttachment({ userId: 'bob-id', displayName: 'Bob', color: 'black' });
      blackWs.tags = ['bob-id', 'black'];
      mockCtx.webSockets.push(blackWs);
    });

    it('white resigns immediately awards black the win', async () => {
      await roomDO.webSocketMessage(whiteWs as any, JSON.stringify({ type: 'resign' }));

      const lastMsg = JSON.parse(blackWs.sentMessages[blackWs.sentMessages.length - 1]!);
      expect(lastMsg.type).toBe('game-over');
      expect(lastMsg.result).toBe('black');
      expect(lastMsg.reason).toContain('Alice resigned');
    });

    it('draw offer relays to opponent and acceptance ends game in draw', async () => {
      // White offers draw
      await roomDO.webSocketMessage(whiteWs as any, JSON.stringify({ type: 'draw-offer' }));
      expect(blackWs.sentMessages).toHaveLength(1);
      expect(JSON.parse(blackWs.sentMessages[0]!).type).toBe('draw-offered');

      // Black accepts
      await roomDO.webSocketMessage(
        blackWs as any,
        JSON.stringify({ type: 'draw-response', accept: true }),
      );

      const lastMsg = JSON.parse(whiteWs.sentMessages[whiteWs.sentMessages.length - 1]!);
      expect(lastMsg.type).toBe('game-over');
      expect(lastMsg.result).toBe('draw');
      expect(lastMsg.reason).toContain('Draw agreed');
    });
  });

  describe('Disconnection, Grace Period & Forfeit Alarms', () => {
    let whiteWs: MockWebSocket;
    let blackWs: MockWebSocket;

    beforeEach(() => {
      whiteWs = new MockWebSocket();
      whiteWs.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
      whiteWs.tags = ['alice-id', 'white'];
      mockCtx.webSockets.push(whiteWs);

      blackWs = new MockWebSocket();
      blackWs.serializeAttachment({ userId: 'bob-id', displayName: 'Bob', color: 'black' });
      blackWs.tags = ['bob-id', 'black'];
      mockCtx.webSockets.push(blackWs);
    });

    it('unexpected socket close broadcasts opponent-disconnected with 60s grace period and sets alarm', async () => {
      await roomDO.webSocketClose(blackWs as any);

      // White receives opponent-disconnected message
      const lastWhiteMsg = JSON.parse(whiteWs.sentMessages[whiteWs.sentMessages.length - 1]!);
      expect(lastWhiteMsg.type).toBe('opponent-disconnected');
      expect(lastWhiteMsg.gracePeriodMs).toBe(60000);

      // Alarm was scheduled for 60 seconds
      expect(mockCtx.ctx.storage.setAlarm).toHaveBeenCalled();
      expect(mockCtx.getScheduledAlarm()).not.toBeNull();
    });

    it('player reconnects within grace period cancels alarm and broadcasts opponent-reconnected', async () => {
      await roomDO.webSocketClose(blackWs as any);
      expect(mockCtx.getScheduledAlarm()).not.toBeNull();

      // Black reconnects via WebSocket upgrade
      const reconnectRes = await roomDO.fetch(
        new Request('http://localhost/ws?userId=bob-id', {
          headers: { Upgrade: 'websocket' },
        }),
      );
      expect(reconnectRes.status).toBe(101);

      // Alarm cancelled
      expect(mockCtx.ctx.storage.deleteAlarm).toHaveBeenCalled();
      expect(mockCtx.getScheduledAlarm()).toBeNull();

      // White receives opponent-reconnected broadcast
      const reconnectedMsg = JSON.parse(whiteWs.sentMessages[whiteWs.sentMessages.length - 1]!);
      expect(reconnectedMsg.type).toBe('opponent-reconnected');
    });

    it('alarm timeout when player never reconnects awards forfeit win to remaining player', async () => {
      await roomDO.webSocketClose(blackWs as any);

      // 60s alarm fires
      await roomDO.alarm();

      const lastWhiteMsg = JSON.parse(whiteWs.sentMessages[whiteWs.sentMessages.length - 1]!);
      expect(lastWhiteMsg.type).toBe('game-over');
      expect(lastWhiteMsg.result).toBe('white');
      expect(lastWhiteMsg.reason).toContain('Opponent disconnected and forfeited match');
    });
  });
});
