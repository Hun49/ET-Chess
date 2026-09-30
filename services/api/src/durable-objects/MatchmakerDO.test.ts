import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatchmakerDO } from './MatchmakerDO';

class MockWebSocket {
  public sentMessages: string[] = [];
  public attachment: any = null;
  public readyState = 1;
  public closed = false;

  serializeAttachment(attachment: any) {
    this.attachment = attachment;
  }

  deserializeAttachment() {
    return this.attachment;
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close(_code?: number, _reason?: string) {
    this.readyState = 3;
    this.closed = true;
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
  let scheduledAlarm: number | null = null;
  const webSockets: MockWebSocket[] = [];

  const ctx: any = {
    storage: {
      setAlarm: vi.fn(async (time: number) => {
        scheduledAlarm = time;
      }),
      deleteAlarm: vi.fn(async () => {
        scheduledAlarm = null;
      }),
      getAlarm: vi.fn(async () => scheduledAlarm),
    },
    acceptWebSocket: vi.fn((ws: any) => {
      webSockets.push(ws);
    }),
  };

  return { ctx, getScheduledAlarm: () => scheduledAlarm };
}

describe('MatchmakerDO (Queue Coordinator)', () => {
  let matchmaker: MatchmakerDO;
  let mockEnv: any;
  let mockCtx: any;

  beforeEach(() => {
    const { ctx } = createMockDOContext();
    mockCtx = ctx;
    mockEnv = {};
    matchmaker = new MatchmakerDO(mockCtx, mockEnv);
  });

  it('calculates expanding rating window (+50 every 15s elapsed)', () => {
    const joinedAt = 100000;
    // 0s elapsed
    expect(matchmaker.getRatingWindow(joinedAt, 100000)).toBe(200);
    // 14s elapsed
    expect(matchmaker.getRatingWindow(joinedAt, 114000)).toBe(200);
    // 15s elapsed
    expect(matchmaker.getRatingWindow(joinedAt, 115000)).toBe(250);
    // 30s elapsed
    expect(matchmaker.getRatingWindow(joinedAt, 130000)).toBe(300);
    // 60s elapsed
    expect(matchmaker.getRatingWindow(joinedAt, 160000)).toBe(400);
  });

  it('pairs two players within base rating window immediately', () => {
    const p1 = {
      userId: 'user_1',
      displayName: 'Alice',
      rating: 1500,
      joinedAt: 1000,
    };
    const p2 = {
      userId: 'user_2',
      displayName: 'Bob',
      rating: 1650, // diff = 150 <= 200
      joinedAt: 2000,
    };

    matchmaker.setQueue([p1, p2]);
    const matches = matchmaker.matchPlayers(2000);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.player1.userId).toBe('user_1');
    expect(matches[0]?.player2.userId).toBe('user_2');
    expect(matches[0]?.gameId).toBeDefined();
    // One white, one black
    expect(['white', 'black']).toContain(matches[0]?.player1Color);
    expect(matches[0]?.player2Color).not.toBe(matches[0]?.player1Color);

    // Queue is empty after pairing
    expect(matchmaker.getQueue()).toHaveLength(0);
  });

  it('does not pair players outside initial window until window expands', () => {
    const p1 = {
      userId: 'user_1',
      displayName: 'Alice',
      rating: 1400,
      joinedAt: 10000,
    };
    const p2 = {
      userId: 'user_2',
      displayName: 'Bob',
      rating: 1750, // diff = 350 > 200
      joinedAt: 10000,
    };

    matchmaker.setQueue([p1, p2]);

    // Check at T = 10000 (0s elapsed): diff 350 > window 200 -> no match
    const initialMatches = matchmaker.matchPlayers(10000);
    expect(initialMatches).toHaveLength(0);
    expect(matchmaker.getQueue()).toHaveLength(2);

    // Check at T = 30000 (20s elapsed): window = 250 -> no match
    const earlyMatches = matchmaker.matchPlayers(30000);
    expect(earlyMatches).toHaveLength(0);

    // Check at T = 55000 (45s elapsed): window = 200 + 3*50 = 350 -> MATCH!
    const expandedMatches = matchmaker.matchPlayers(55000);
    expect(expandedMatches).toHaveLength(1);
    expect(matchmaker.getQueue()).toHaveLength(0);
  });

  it('removes player from queue immediately when WebSocket disconnects', async () => {
    const ws = new MockWebSocket();
    ws.serializeAttachment({ userId: 'user_disconnect_me' });

    matchmaker.setQueue([
      {
        userId: 'user_disconnect_me',
        displayName: 'Dave',
        rating: 1500,
        joinedAt: Date.now(),
        webSocket: ws as any,
      },
    ]);

    expect(matchmaker.getQueue()).toHaveLength(1);

    // Socket dropped
    await matchmaker.webSocketClose(ws as any);

    // Player removed, cannot be matched
    expect(matchmaker.getQueue()).toHaveLength(0);
  });

  it('handles WebSocket upgrade handshake and confirms queued status', async () => {
    const req = new Request(
      'https://example.com/matchmaking/queue?userId=user_ws&displayName=Carol&rating=1450',
      {
        headers: { Upgrade: 'websocket' },
      },
    );

    const res = await matchmaker.fetch(req);
    expect(res.status).toBe(101);

    const queue = matchmaker.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.userId).toBe('user_ws');
    expect(queue[0]?.rating).toBe(1450);

    // WebSocket received { type: 'queued' }
    const ws = queue[0]?.webSocket as unknown as MockWebSocket;
    expect(ws.sentMessages).toHaveLength(1);
    const sent = JSON.parse(ws.sentMessages[0]!);
    expect(sent.type).toBe('queued');
    expect(sent.rating).toBe(1450);
  });
});
