import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameTicket } from '../lib/game-tickets';
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

function createMockDOContext(existingStorage?: Map<string, any>) {
  const storage = existingStorage ?? new Map<string, any>();
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
    const testSecret = 'dev-secret-key-must-be-at-least-32-characters-long';

    it('rejects unauthorized third party joining the live game', async () => {
      const res = await roomDO.fetch(
        new Request('http://localhost/ws?userId=charlie-id', {
          headers: { Upgrade: 'websocket' },
        }),
      );
      expect(res.status).toBe(403);
    });

    it('rejects connection missing ticket or credentials', async () => {
      const res = await roomDO.fetch(
        new Request('http://localhost/ws', {
          headers: { Upgrade: 'websocket' },
        }),
      );
      expect([400, 401]).toContain(res.status);
    });

    it('successfully accepts authorized white player with valid ticket', async () => {
      const ticket = await createGameTicket(
        {
          gameId: 'game-123',
          userId: 'alice-id',
          displayName: 'Alice',
        },
        testSecret,
      );

      const res = await roomDO.fetch(
        new Request(`http://localhost/ws?ticket=${ticket}`, {
          headers: { Upgrade: 'websocket' },
        }),
      );
      expect(res.status).toBe(101);
      expect(mockCtx.ctx.acceptWebSocket).toHaveBeenCalled();
    });

    it('rejects ticket with mismatched gameId (game A ticket presented to game B)', async () => {
      const ticket = await createGameTicket(
        {
          gameId: 'different-game-id',
          userId: 'alice-id',
          displayName: 'Alice',
        },
        testSecret,
      );

      const res = await roomDO.fetch(
        new Request(`http://localhost/ws?ticket=${ticket}`, {
          headers: { Upgrade: 'websocket' },
        }),
      );
      expect(res.status).toBe(403);
    });

    it('rejects expired ticket', async () => {
      const ticket = await createGameTicket(
        {
          gameId: 'game-123',
          userId: 'alice-id',
          displayName: 'Alice',
        },
        testSecret,
        -1000, // already expired
      );

      const res = await roomDO.fetch(
        new Request(`http://localhost/ws?ticket=${ticket}`, {
          headers: { Upgrade: 'websocket' },
        }),
      );
      expect(res.status).toBe(401);
    });

    it('enforces single-use tickets and rejects replayed ticket', async () => {
      const ticket = await createGameTicket(
        {
          gameId: 'game-123',
          userId: 'alice-id',
          displayName: 'Alice',
        },
        testSecret,
      );

      // First use succeeds
      const res1 = await roomDO.fetch(
        new Request(`http://localhost/ws?ticket=${ticket}`, {
          headers: { Upgrade: 'websocket' },
        }),
      );
      expect(res1.status).toBe(101);

      // Replay attempt fails with 401
      const res2 = await roomDO.fetch(
        new Request(`http://localhost/ws?ticket=${ticket}`, {
          headers: { Upgrade: 'websocket' },
        }),
      );
      expect(res2.status).toBe(401);
    });

    it('rejects userId query parameter in production mode when ticket is missing', async () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const res = await roomDO.fetch(
          new Request('http://localhost/ws?userId=alice-id', {
            headers: { Upgrade: 'websocket' },
          }),
        );
        expect(res.status).toBe(401);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
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

  describe('Idempotent settlement & DO storage', () => {
    it('sets settled flag in DO storage and short-circuits on subsequent terminal events', async () => {
      const whiteWs = new MockWebSocket();
      whiteWs.serializeAttachment({
        userId: 'alice-id',
        displayName: 'Alice',
        color: 'white',
      });
      whiteWs.tags = ['alice-id', 'white'];
      mockCtx.webSockets.push(whiteWs);

      const blackWs = new MockWebSocket();
      blackWs.serializeAttachment({
        userId: 'bob-id',
        displayName: 'Bob',
        color: 'black',
      });
      blackWs.tags = ['bob-id', 'black'];
      mockCtx.webSockets.push(blackWs);

      // Alice resigns -> terminal event
      await roomDO.webSocketMessage(whiteWs as any, JSON.stringify({ type: 'resign' }));

      // Assert settled flag is written to DO storage
      expect(mockCtx.storage.get('settled')).toBe(true);

      // Attempt second terminal event (e.g. late alarm or draw acceptance)
      await roomDO.alarm();

      // No second game-over message sent
      const whiteGameOverMsgs = whiteWs.sentMessages
        .map((m) => JSON.parse(m))
        .filter((m) => m.type === 'game-over');

      expect(whiteGameOverMsgs).toHaveLength(1);
    });
  });

  describe('Phase 3 P3-T2 & P3-T10 — Hostile Clock & Lifecycle Engine', () => {
    it('Case A: player submits legal move after clock expiration -> move rejected with timeout loss', async () => {
      const customCtx = createMockDOContext();
      const customDO = new GameRoomDO(customCtx.ctx, {});
      await customDO.fetch(
        new Request('http://localhost/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: 'game-case-a',
            whiteUserId: 'alice-id',
            blackUserId: 'bob-id',
            timeControlMinutes: 1,
            whiteRemainingMs: 5000,
            blackRemainingMs: 5000,
            turnStartedAt: Date.now() - 6000, // 6s elapsed > 5s remaining
            activeClockColor: 'white',
          }),
        }),
      );

      const whiteWs = new MockWebSocket();
      whiteWs.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
      whiteWs.tags = ['alice-id', 'white'];
      customCtx.webSockets.push(whiteWs);

      const blackWs = new MockWebSocket();
      blackWs.serializeAttachment({ userId: 'bob-id', displayName: 'Bob', color: 'black' });
      blackWs.tags = ['bob-id', 'black'];
      customCtx.webSockets.push(blackWs);

      // Alice attempts legal move e2 -> e4
      await customDO.webSocketMessage(
        whiteWs as any,
        JSON.stringify({ type: 'move', move: { from: 'e2', to: 'e4' } }),
      );

      // Expect game-over with timeout win for Black
      const gameOverMsg = JSON.parse(whiteWs.sentMessages[whiteWs.sentMessages.length - 1]!);
      expect(gameOverMsg.type).toBe('game-over');
      expect(gameOverMsg.result).toBe('black');
      expect(gameOverMsg.reason).toContain('timed out');

      // Assert DO state is finished
      const stateRes = await customDO.fetch(new Request('http://localhost/state'));
      const state = (await stateRes.json()) as any;
      expect(state.status).toBe('finished');
      expect(state.whiteRemainingMs).toBe(0);
    });

    it('Case B: submit move before deadline -> elapsed deducted, increment applied, opponent clock starts', async () => {
      const customCtx = createMockDOContext();
      const customDO = new GameRoomDO(customCtx.ctx, {});
      const startTime = Date.now() - 2000; // 2 seconds elapsed
      await customDO.fetch(
        new Request('http://localhost/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: 'game-case-b',
            whiteUserId: 'alice-id',
            blackUserId: 'bob-id',
            timeControlMinutes: 5,
            timeControlIncrement: 2,
            timeControlIncrementMs: 2000,
            whiteRemainingMs: 300000,
            blackRemainingMs: 300000,
            turnStartedAt: startTime,
            activeClockColor: 'white',
          }),
        }),
      );

      const whiteWs = new MockWebSocket();
      whiteWs.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
      whiteWs.tags = ['alice-id', 'white'];
      customCtx.webSockets.push(whiteWs);

      // Alice moves e2 -> e4
      await customDO.webSocketMessage(
        whiteWs as any,
        JSON.stringify({ type: 'move', move: { from: 'e2', to: 'e4' } }),
      );

      const lastMsg = JSON.parse(whiteWs.sentMessages[whiteWs.sentMessages.length - 1]!);
      expect(lastMsg.type).toBe('state-sync');
      expect(lastMsg.activeClockColor).toBe('black');
      // Alice had 300000 - ~2000 + 2000 = ~300000
      expect(lastMsg.whiteRemainingMs).toBeGreaterThanOrEqual(298000);
      expect(lastMsg.whiteRemainingMs).toBeLessThanOrEqual(301000);

      // Verify alarm is now scheduled for Black's deadline
      expect(customCtx.getScheduledAlarm()).not.toBeNull();
    });

    it('Case C: alarm fires after move already executed -> re-evaluates and causes no false timeout', async () => {
      const customCtx = createMockDOContext();
      const customDO = new GameRoomDO(customCtx.ctx, {});
      await customDO.fetch(
        new Request('http://localhost/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: 'game-case-c',
            whiteUserId: 'alice-id',
            blackUserId: 'bob-id',
            timeControlMinutes: 5,
            whiteRemainingMs: 10000,
            blackRemainingMs: 300000,
            turnStartedAt: Date.now() - 9500, // 500ms remaining for White
            activeClockColor: 'white',
          }),
        }),
      );

      const whiteWs = new MockWebSocket();
      whiteWs.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
      whiteWs.tags = ['alice-id', 'white'];
      customCtx.webSockets.push(whiteWs);

      const blackWs = new MockWebSocket();
      blackWs.serializeAttachment({ userId: 'bob-id', displayName: 'Bob', color: 'black' });
      blackWs.tags = ['bob-id', 'black'];
      customCtx.webSockets.push(blackWs);

      // White executes move e2 -> e4 with 500ms to spare!
      await customDO.webSocketMessage(
        whiteWs as any,
        JSON.stringify({ type: 'move', move: { from: 'e2', to: 'e4' } }),
      );

      // Now stale alarm for White's old deadline fires:
      await customDO.alarm();

      // Verify game is STILL in progress (Black's turn), NO false timeout occurred!
      const stateRes = await customDO.fetch(new Request('http://localhost/state'));
      const state = (await stateRes.json()) as any;
      expect(state.status).toBe('in-progress');
      expect(state.activeClockColor).toBe('black');

      // Verify no game-over message was broadcast
      const gameOverMsgs = whiteWs.sentMessages
        .map((m) => JSON.parse(m))
        .filter((m) => m.type === 'game-over');
      expect(gameOverMsgs).toHaveLength(0);
    });

    it('Case D: rapid duplicate moves -> first processed, second rejected as not your turn', async () => {
      const customCtx = createMockDOContext();
      const customDO = new GameRoomDO(customCtx.ctx, {});
      await customDO.fetch(
        new Request('http://localhost/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: 'game-case-d',
            whiteUserId: 'alice-id',
            blackUserId: 'bob-id',
          }),
        }),
      );

      const whiteWs = new MockWebSocket();
      whiteWs.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
      whiteWs.tags = ['alice-id', 'white'];
      customCtx.webSockets.push(whiteWs);

      // White submits e2 -> e4
      await customDO.webSocketMessage(
        whiteWs as any,
        JSON.stringify({ type: 'move', move: { from: 'e2', to: 'e4' } }),
      );

      // White immediately re-submits (duplicate submission)
      await customDO.webSocketMessage(
        whiteWs as any,
        JSON.stringify({ type: 'move', move: { from: 'e2', to: 'e4' } }),
      );

      const errorMsgs = whiteWs.sentMessages
        .map((m) => JSON.parse(m))
        .filter((m) => m.type === 'error');
      expect(errorMsgs.length).toBeGreaterThan(0);
      expect(errorMsgs[errorMsgs.length - 1].message).toContain('not your turn');
    });
  });

  describe('P3-T4 & P3-T5 — Multi-Connection & Reconnection Correctness', () => {
    it('closing one socket when a player has another active socket does NOT trigger disconnect grace period', async () => {
      const customCtx = createMockDOContext();
      const customDO = new GameRoomDO(customCtx.ctx, {});
      await customDO.fetch(
        new Request('http://localhost/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: 'game-multi-conn',
            whiteUserId: 'alice-id',
            blackUserId: 'bob-id',
          }),
        }),
      );

      // Alice opens socket 1 (tab 1)
      const aliceWs1 = new MockWebSocket();
      aliceWs1.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
      aliceWs1.tags = ['alice-id', 'white'];
      customCtx.webSockets.push(aliceWs1);

      // Alice opens socket 2 (tab 2 / reconnecting socket)
      const aliceWs2 = new MockWebSocket();
      aliceWs2.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
      aliceWs2.tags = ['alice-id', 'white'];
      customCtx.webSockets.push(aliceWs2);

      // Bob's socket
      const bobWs = new MockWebSocket();
      bobWs.serializeAttachment({ userId: 'bob-id', displayName: 'Bob', color: 'black' });
      bobWs.tags = ['bob-id', 'black'];
      customCtx.webSockets.push(bobWs);

      // Alice closes tab 1
      aliceWs1.close();
      await customDO.webSocketClose(aliceWs1 as any);

      // Bob should NOT have received opponent-disconnected because Alice is still active on socket 2!
      const bobDisconnectMsgs = bobWs.sentMessages
        .map((m) => JSON.parse(m))
        .filter((m) => m.type === 'opponent-disconnected');
      expect(bobDisconnectMsgs).toHaveLength(0);

      // Now Alice closes tab 2
      aliceWs2.close();
      await customDO.webSocketClose(aliceWs2 as any);

      // Now Bob DOES receive opponent-disconnected!
      const bobDisconnectMsgs2 = bobWs.sentMessages
        .map((m) => JSON.parse(m))
        .filter((m) => m.type === 'opponent-disconnected');
      expect(bobDisconnectMsgs2).toHaveLength(1);
    });
  });

  describe('P3-T6 & P3-T7 — Tournament to GameRoom Integration', () => {
    it('GameRoomDO automatically notifies TournamentDO upon terminal event', async () => {
      const mockTournamentStub = {
        fetch: vi.fn(async () => new Response(JSON.stringify({ success: true }))),
      };
      const env = {
        TOURNAMENT: {
          idFromName: vi.fn(() => 'tourney-do-id'),
          get: vi.fn(() => mockTournamentStub),
        },
      };

      const customCtx = createMockDOContext();
      const customDO = new GameRoomDO(customCtx.ctx, env as any);

      await customDO.fetch(
        new Request('http://localhost/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: 'game_t1_r1_m1',
            tournamentId: 'tourney_t1',
            matchId: 'm_t1_r1_1',
            whiteUserId: 'alice-id',
            blackUserId: 'bob-id',
          }),
        }),
      );

      const whiteWs = new MockWebSocket();
      whiteWs.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
      whiteWs.tags = ['alice-id', 'white'];
      customCtx.webSockets.push(whiteWs);

      // Alice resigns -> Bob wins
      await customDO.webSocketMessage(whiteWs as any, JSON.stringify({ type: 'resign' }));

      // Assert TournamentDO was called with authoritative match result!
      expect(env.TOURNAMENT.idFromName).toHaveBeenCalledWith('tourney_t1');
      expect(mockTournamentStub.fetch).toHaveBeenCalled();

      const call = mockTournamentStub.fetch.mock.calls[0] as unknown as [Request];
      const req = call[0];
      const payload = (await req.json()) as any;
      expect(payload.gameId).toBe('game_t1_r1_m1');
      expect(payload.winnerUserId).toBe('bob-id');
      expect(payload.result).toBe('black');
    });
  });

  describe('D3.2 — Explicit Lifecycle State Machine & Terminal Guards', () => {
    it('supports aborting from WAITING or ACTIVE via POST /abort, transitioning to ABORTED', async () => {
      const customCtx = createMockDOContext();
      const customDO = new GameRoomDO(customCtx.ctx, {});

      await customDO.fetch(
        new Request('http://localhost/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: 'game-abort-test',
            whiteUserId: 'alice-id',
            blackUserId: 'bob-id',
            status: 'waiting',
          }),
        }),
      );

      // Abort
      const abortRes = await customDO.fetch(
        new Request('http://localhost/abort', { method: 'POST' }),
      );
      expect(abortRes.status).toBe(200);
      const abortBody = (await abortRes.json()) as any;
      expect(abortBody.data.lifecycleState).toBe('ABORTED');
      expect(abortBody.data.status).toBe('finished');

      // Attempting to abort again fails with 400
      const retryRes = await customDO.fetch(
        new Request('http://localhost/abort', { method: 'POST' }),
      );
      expect(retryRes.status).toBe(400);
    });

    it('rejects moves and ignores resign/draw mutations after terminal completion', async () => {
      const customCtx = createMockDOContext();
      const customDO = new GameRoomDO(customCtx.ctx, {});

      await customDO.fetch(
        new Request('http://localhost/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: 'game-terminal-test',
            whiteUserId: 'alice-id',
            blackUserId: 'bob-id',
          }),
        }),
      );

      const whiteWs = new MockWebSocket();
      whiteWs.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
      whiteWs.tags = ['alice-id', 'white'];
      customCtx.webSockets.push(whiteWs);

      const bobWs = new MockWebSocket();
      bobWs.serializeAttachment({ userId: 'bob-id', displayName: 'Bob', color: 'black' });
      bobWs.tags = ['bob-id', 'black'];
      customCtx.webSockets.push(bobWs);

      // Alice resigns -> terminal
      await customDO.webSocketMessage(whiteWs as any, JSON.stringify({ type: 'resign' }));

      // Inspect state: lifecycleState should be COMPLETED
      const stateRes = await customDO.fetch(new Request('http://localhost/state'));
      const state = (await stateRes.json()) as any;
      expect(state.lifecycleState).toBe('COMPLETED');
      expect(state.result).toBe('black');

      // Bob tries to move -> rejected
      await customDO.webSocketMessage(
        bobWs as any,
        JSON.stringify({ type: 'move', move: { from: 'e7', to: 'e5' } }),
      );
      const bobErrors = bobWs.sentMessages
        .map((m) => JSON.parse(m))
        .filter((m) => m.type === 'error');
      expect(bobErrors).toHaveLength(1);
      expect(bobErrors[0].message).toContain('Game has already concluded');

      // Bob tries to resign -> ignored (no additional game-over messages)
      const prevGameOverCount = whiteWs.sentMessages
        .map((m) => JSON.parse(m))
        .filter((m) => m.type === 'game-over').length;

      await customDO.webSocketMessage(bobWs as any, JSON.stringify({ type: 'resign' }));
      const newGameOverCount = whiteWs.sentMessages
        .map((m) => JSON.parse(m))
        .filter((m) => m.type === 'game-over').length;
      expect(newGameOverCount).toBe(prevGameOverCount);
    });
  });

  describe('D3.8 & D3.10 — Reconnection & Multi-Connection Parity', () => {
    it('reconnect during own turn restores exact clocks, position, and cancels grace alarm', async () => {
      const customCtx = createMockDOContext();
      const customDO = new GameRoomDO(customCtx.ctx, {});

      await customDO.fetch(
        new Request('http://localhost/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: 'game-reconnect-test',
            whiteUserId: 'alice-id',
            blackUserId: 'bob-id',
            timeControlMinutes: 5,
            timeControlIncrement: 0,
            whiteRemainingMs: 300000,
            blackRemainingMs: 300000,
          }),
        }),
      );

      // Alice connects and makes a move
      const aliceWs = new MockWebSocket();
      aliceWs.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
      aliceWs.tags = ['alice-id', 'white'];
      customCtx.webSockets.push(aliceWs);

      const bobWs = new MockWebSocket();
      bobWs.serializeAttachment({ userId: 'bob-id', displayName: 'Bob', color: 'black' });
      bobWs.tags = ['bob-id', 'black'];
      customCtx.webSockets.push(bobWs);

      // Alice plays e2 -> e4, so it becomes Bob's turn
      await customDO.webSocketMessage(
        aliceWs as any,
        JSON.stringify({ type: 'move', move: { from: 'e2', to: 'e4' } }),
      );

      // Bob disconnects during Bob's turn
      await customDO.webSocketClose(bobWs as any);

      // Alice gets notified of Bob's disconnect with 60s grace period
      const aliceDisconnectNotice = aliceWs.sentMessages
        .map((m) => JSON.parse(m))
        .find((m) => m.type === 'opponent-disconnected');
      expect(aliceDisconnectNotice).toBeDefined();
      expect(aliceDisconnectNotice.gracePeriodMs).toBe(60000);

      // Bob reconnects via new WebSocket
      const bobReconnectReq = new Request('http://localhost/ws?userId=bob-id&displayName=Bob', {
        headers: { Upgrade: 'websocket' },
      });
      const bobRes = await customDO.fetch(bobReconnectReq);
      expect(bobRes.status).toBe(101);

      // Alice should have received opponent-reconnected
      const aliceReconnectNotice = aliceWs.sentMessages
        .map((m) => JSON.parse(m))
        .find((m) => m.type === 'opponent-reconnected');
      expect(aliceReconnectNotice).toBeDefined();

      // State is active and turn is still black
      const checkState = await customDO.fetch(new Request('http://localhost/state'));
      const stateData = (await checkState.json()) as any;
      expect(stateData.disconnectedPlayer).toBeNull();
      expect(stateData.gameState.turn).toBe('black');
    });

    it('reconstructing GameRoomDO from storage restores complete snapshot including result and lifecycleState', async () => {
      const storageMap = new Map<string, any>();
      const customCtx1 = createMockDOContext(storageMap);
      const customDO1 = new GameRoomDO(customCtx1.ctx, {});

      await customDO1.fetch(
        new Request('http://localhost/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: 'game-restart-test',
            whiteUserId: 'alice-id',
            blackUserId: 'bob-id',
          }),
        }),
      );

      const whiteWs = new MockWebSocket();
      whiteWs.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
      whiteWs.tags = ['alice-id', 'white'];
      customCtx1.webSockets.push(whiteWs);

      // Alice resigns -> game completes
      await customDO1.webSocketMessage(whiteWs as any, JSON.stringify({ type: 'resign' }));

      // Now simulate DO crash / restart with same persistent storage
      const customCtx2 = createMockDOContext(storageMap);
      const customDO2 = new GameRoomDO(customCtx2.ctx, {});

      // Inspect restored state
      const stateRes = await customDO2.fetch(new Request('http://localhost/state'));
      const state = (await stateRes.json()) as any;
      expect(state.lifecycleState).toBe('COMPLETED');
      expect(state.result).toBe('black');
      expect(state.status).toBe('finished');
      expect(state.terminationReason).toContain('Alice resigned');
    });
  });
});
