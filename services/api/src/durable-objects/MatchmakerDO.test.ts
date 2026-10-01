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

function createMockDOContext(sharedStorage = new Map<string, any>()) {
  let scheduledAlarm: number | null = null;
  const webSockets: MockWebSocket[] = [];

  const ctx: any = {
    storage: {
      get: vi.fn(async <T>(key: string): Promise<T | undefined> => sharedStorage.get(key)),
      put: vi.fn(async (key: string, val: any): Promise<void> => {
        sharedStorage.set(key, val);
      }),
      delete: vi.fn(async (key: string): Promise<boolean> => sharedStorage.delete(key)),
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
    getWebSockets: vi.fn((tag?: string) => {
      if (!tag) return webSockets;
      return webSockets.filter((ws) => {
        const att = ws.deserializeAttachment();
        return att?.userId === tag;
      });
    }),
  };

  return { ctx, storage: sharedStorage, getScheduledAlarm: () => scheduledAlarm };
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

  it('persists queue state to DO storage and reconstructs queue across DO re-instantiation / restart', async () => {
    const sharedStorage = new Map<string, any>();
    const { ctx: ctx1 } = createMockDOContext(sharedStorage);
    const mm1 = new MatchmakerDO(ctx1, mockEnv);

    // Player 1 joins mm1
    const req1 = new Request(
      'https://example.com/matchmaking/queue?userId=user_survivor&displayName=Survivor&rating=1600',
      { headers: { Upgrade: 'websocket' } },
    );
    await mm1.fetch(req1);

    expect(mm1.getQueue()).toHaveLength(1);
    expect(sharedStorage.has('matchmaking_queue')).toBe(true);

    // Simulate DO eviction/restart: create new instance with same persistent storage
    const { ctx: ctx2 } = createMockDOContext(sharedStorage);
    const mm2 = new MatchmakerDO(ctx2, mockEnv);

    // Queue endpoint fetches queue, triggering ensureLoaded
    const reqInspect = new Request('https://example.com/matchmaking/queue', { method: 'GET' });
    const resInspect = await mm2.fetch(reqInspect);
    const data = (await resInspect.json()) as any;

    expect(data.count).toBe(1);
    expect(data.players[0].userId).toBe('user_survivor');
    expect(data.players[0].rating).toBe(1600);
    expect(data.players[0].status).toBe('QUEUED');
  });

  it('rolls back players from PROVISIONING to QUEUED if GameRoomDO initialization fails, preventing player loss', async () => {
    // Mock GAME_ROOM DO binding that fails
    const failingEnv: any = {
      GAME_ROOM: {
        idFromName: vi.fn(() => 'fail_room_id'),
        get: vi.fn(() => ({
          fetch: vi.fn(async () => new Response('Internal DO error', { status: 500 })),
        })),
      },
    };

    const mmFailing = new MatchmakerDO(mockCtx, failingEnv);

    const p1 = {
      userId: 'user_p1',
      displayName: 'Player One',
      rating: 1500,
      joinedAt: 1000,
    };
    const p2 = {
      userId: 'user_p2',
      displayName: 'Player Two',
      rating: 1550,
      joinedAt: 1000,
    };

    mmFailing.setQueue([p1, p2]);
    const matches = mmFailing.matchPlayers(1000);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.reservationId).toBeDefined();

    // Before dispatch: players are RESERVED in persistent queue entries
    expect(mmFailing.getAllQueueEntries()[0]!.status).toBe('RESERVED');
    expect(mmFailing.getAllQueueEntries()[1]!.status).toBe('RESERVED');

    // Attempt dispatch with failing DO
    await mmFailing.dispatchMatches(matches);

    // Players MUST NOT be dropped from queue, and must be rolled back to QUEUED!
    const queueAfter = mmFailing.getQueue();
    expect(queueAfter).toHaveLength(2);
    expect(queueAfter[0]!.status).toBe('QUEUED');
    expect(queueAfter[0]!.reservationId).toBeNull();
    expect(queueAfter[1]!.status).toBe('QUEUED');
    expect(queueAfter[1]!.reservationId).toBeNull();
  });

  it('prevents duplicate queue entries for the same user', async () => {
    const req1 = new Request(
      'https://example.com/matchmaking/queue?userId=user_dup&displayName=Duplicate&rating=1300',
      { headers: { Upgrade: 'websocket' } },
    );
    await matchmaker.fetch(req1);

    expect(matchmaker.getQueue()).toHaveLength(1);

    // Re-join with same userId
    const req2 = new Request(
      'https://example.com/matchmaking/queue?userId=user_dup&displayName=DuplicateUpdated&rating=1350',
      { headers: { Upgrade: 'websocket' } },
    );
    await matchmaker.fetch(req2);

    // Should still have only 1 player in queue, updated
    const queue = matchmaker.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]!.displayName).toBe('DuplicateUpdated');
    expect(queue[0]!.rating).toBe(1350);
  });
});
