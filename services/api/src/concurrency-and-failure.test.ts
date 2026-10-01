import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoom, joinRoom, resetRoomsStore } from './data/rooms-store';
import { GameRoomDO } from './durable-objects/GameRoomDO';
import { MatchmakerDO } from './durable-objects/MatchmakerDO';

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
    acceptWebSocket: vi.fn((ws: any, tags: string[] = []) => {
      ws.tags = tags;
      webSockets.push(ws);
    }),
    getWebSockets: vi.fn((tag?: string) => {
      if (!tag) return webSockets;
      return webSockets.filter(
        (ws) => ws.tags?.includes(tag) || ws.deserializeAttachment()?.userId === tag,
      );
    }),
  };

  return { ctx, storage: sharedStorage, webSockets, getScheduledAlarm: () => scheduledAlarm };
}

describe('Phase 2 — Concurrency & Failure Injection Tests', () => {
  beforeEach(() => {
    resetRoomsStore();
  });

  describe('1. Concurrency Invariants', () => {
    it('concurrent room join conflict: only one player claims open room slot', async () => {
      const room = await createRoom('host_user_1', {
        timeControlMinutes: 10,
        timeControlIncrement: 0,
        hostColor: 'random',
        kind: 'friend',
      });

      // User A and User B concurrently attempt to join the same room code
      const results = await Promise.allSettled([
        joinRoom(room.code, 'guest_alice'),
        joinRoom(room.code, 'guest_bob'),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly one join must succeed
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // The rejected one failed with room not open
      const rejectedError = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectedError.message).toContain('Room is not open for joining');
    });

    it('concurrent matchmaking queue additions: multiple players join simultaneously without loss or corruption', async () => {
      const storage = new Map<string, any>();
      const { ctx } = createMockDOContext(storage);
      const mm = new MatchmakerDO(ctx, {} as any);

      const players = [
        { id: 'user_c1', name: 'Player 1', rating: 1000 },
        { id: 'user_c2', name: 'Player 2', rating: 1400 },
        { id: 'user_c3', name: 'Player 3', rating: 1800 },
        { id: 'user_c4', name: 'Player 4', rating: 2200 },
      ];

      // Concurrently execute WebSocket queue requests
      await Promise.all(
        players.map((p) =>
          mm.fetch(
            new Request(
              `https://example.com/matchmaking/queue?userId=${p.id}&displayName=${encodeURIComponent(p.name)}&rating=${p.rating}`,
              { headers: { Upgrade: 'websocket' } },
            ),
          ),
        ),
      );

      // All 4 players are registered in persistent queue (rating diff 400 > initial 200 window, so none matched instantly)
      expect(mm.getQueue()).toHaveLength(4);

      // Form matches after window expands (60s elapsed -> window = 200 + 4*50 = 400)
      const matches = mm.matchPlayers(Date.now() + 60000);
      expect(matches).toHaveLength(2);

      // Unique games and all players distinct
      const matchedUserIds = matches.flatMap((m) => [m.player1.userId, m.player2.userId]);
      const uniqueMatchedUsers = new Set(matchedUserIds);
      expect(uniqueMatchedUsers.size).toBe(4);
    });

    it('concurrent terminal game events: simultaneous resignations settle exactly once', async () => {
      const sharedStorage = new Map<string, any>();
      const { ctx, webSockets } = createMockDOContext(sharedStorage);
      const roomDO = new GameRoomDO(ctx, {} as any);

      // Init game
      await roomDO.fetch(
        new Request('http://localhost/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: 'game_concurrent_settle',
            whiteUserId: 'alice_white',
            whiteDisplayName: 'Alice',
            blackUserId: 'bob_black',
            blackDisplayName: 'Bob',
          }),
        }),
      );

      const whiteWs = new MockWebSocket();
      whiteWs.serializeAttachment({ userId: 'alice_white', displayName: 'Alice', color: 'white' });
      whiteWs.tags = ['alice_white', 'white'];
      webSockets.push(whiteWs);

      const blackWs = new MockWebSocket();
      blackWs.serializeAttachment({ userId: 'bob_black', displayName: 'Bob', color: 'black' });
      blackWs.tags = ['bob_black', 'black'];
      webSockets.push(blackWs);

      // Alice and Bob simultaneously resign at the exact same millisecond
      await Promise.all([
        roomDO.webSocketMessage(whiteWs as any, JSON.stringify({ type: 'resign' })),
        roomDO.webSocketMessage(blackWs as any, JSON.stringify({ type: 'resign' })),
      ]);

      // DO settled flag must be set
      expect(sharedStorage.get('settled')).toBe(true);

      // Only one game-over event was broadcast to whiteWs
      const whiteGameOverMsgs = whiteWs.sentMessages
        .map((m) => JSON.parse(m))
        .filter((m) => m.type === 'game-over');
      expect(whiteGameOverMsgs).toHaveLength(1);
    });
  });

  describe('2. Failure Injection & Resilience', () => {
    it('matchmaking provisioning failure: rolls back reserved players to QUEUED without dropping them', async () => {
      const storage = new Map<string, any>();
      const { ctx } = createMockDOContext(storage);

      // Mock GAME_ROOM binding that throws an exception during init
      const failingEnv: any = {
        GAME_ROOM: {
          idFromName: vi.fn(() => 'crashed_do_id'),
          get: vi.fn(() => ({
            fetch: vi.fn(async () => {
              throw new Error('Durable Object initialization timed out or worker crashed');
            }),
          })),
        },
      };

      const mm = new MatchmakerDO(ctx, failingEnv);
      mm.setQueue([
        { userId: 'u_fail_1', displayName: 'P1', rating: 1400, joinedAt: 1000 },
        { userId: 'u_fail_2', displayName: 'P2', rating: 1410, joinedAt: 1000 },
      ]);

      const matches = mm.matchPlayers(1000);
      expect(matches).toHaveLength(1);

      // Execute dispatch where downstream DO fails
      await mm.dispatchMatches(matches);

      // Verify players were NOT dropped from the queue, and are restored to QUEUED state
      const queueAfter = mm.getQueue();
      expect(queueAfter).toHaveLength(2);
      expect(queueAfter[0]!.status).toBe('QUEUED');
      expect(queueAfter[0]!.reservationId).toBeNull();
      expect(queueAfter[1]!.status).toBe('QUEUED');
      expect(queueAfter[1]!.reservationId).toBeNull();
    });

    it('database failure injection during room creation: throws explicitly without silent in-memory fallback', async () => {
      const failingD1: any = {
        prepare: vi.fn(() => {
          throw new Error('SQLite database is locked / disk full');
        }),
      };

      await expect(
        createRoom(
          'user_host_fail',
          {
            timeControlMinutes: 5,
            timeControlIncrement: 0,
            hostColor: 'white',
            kind: 'friend',
          },
          failingD1,
        ),
      ).rejects.toThrow('SQLite database is locked / disk full');
    });

    it('database failure injection during room join: throws explicitly without silent in-memory fallback', async () => {
      // First call succeeds for getRoomByCode, but fails on update
      let callCount = 0;
      const failingD1OnUpdate: any = {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            all: vi.fn(async () => {
              callCount++;
              if (callCount === 1) {
                // Select room succeeds
                return {
                  results: [
                    {
                      id: 'room_mock_id',
                      code: 'TST999',
                      host_user_id: 'host_u',
                      guest_user_id: null,
                      white_user_id: null,
                      black_user_id: null,
                      time_control_minutes: 5,
                      time_control_increment: 0,
                      host_color: 'white',
                      kind: 'friend',
                      status: 'waiting',
                      created_at: Math.floor(Date.now() / 1000),
                    },
                  ],
                };
              }
              // Update fails
              throw new Error('D1 transaction deadlock');
            }),
          })),
        })),
      };

      await expect(joinRoom('TST999', 'guest_u', failingD1OnUpdate)).rejects.toThrow();
    });

    it('mid-game DO eviction and restart: state reconstruction allows play to resume seamlessly', async () => {
      const sharedStorage = new Map<string, any>();
      const { ctx: ctx1, webSockets: sockets1 } = createMockDOContext(sharedStorage);

      // 1. First DO instance starts game
      const roomDO1 = new GameRoomDO(ctx1, {} as any);
      await roomDO1.fetch(
        new Request('http://localhost/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: 'game_restart_test',
            whiteUserId: 'alice_id',
            whiteDisplayName: 'Alice',
            blackUserId: 'bob_id',
            blackDisplayName: 'Bob',
          }),
        }),
      );

      const aliceWs1 = new MockWebSocket();
      aliceWs1.serializeAttachment({ userId: 'alice_id', displayName: 'Alice', color: 'white' });
      aliceWs1.tags = ['alice_id', 'white'];
      sockets1.push(aliceWs1);

      // Alice plays 1. e4
      await roomDO1.webSocketMessage(
        aliceWs1 as any,
        JSON.stringify({ type: 'move', move: { from: 'e2', to: 'e4' } }),
      );

      // State is in sharedStorage
      expect(sharedStorage.has('room_data')).toBe(true);

      // 2. Simulate DO eviction and restart with instance 2
      const { ctx: ctx2, webSockets: sockets2 } = createMockDOContext(sharedStorage);
      const roomDO2 = new GameRoomDO(ctx2, {} as any);

      const bobWs2 = new MockWebSocket();
      bobWs2.serializeAttachment({ userId: 'bob_id', displayName: 'Bob', color: 'black' });
      bobWs2.tags = ['bob_id', 'black'];
      sockets2.push(bobWs2);

      // Bob connects to restarted DO and plays 1... e5
      await roomDO2.webSocketMessage(
        bobWs2 as any,
        JSON.stringify({ type: 'move', move: { from: 'e7', to: 'e5' } }),
      );

      // Move accepted! Both moves recorded in reconstructed game state!
      expect(bobWs2.sentMessages.length).toBeGreaterThan(0);
      const syncMsg = JSON.parse(bobWs2.sentMessages[bobWs2.sentMessages.length - 1]!);
      expect(syncMsg.type).toBe('state-sync');
      expect(syncMsg.gameState.moveHistory).toHaveLength(2);
      expect(syncMsg.gameState.moveHistory[0]).toEqual({ from: 'e2', to: 'e4' });
      expect(syncMsg.gameState.moveHistory[1]).toEqual({ from: 'e7', to: 'e5' });
      expect(syncMsg.gameState.turn).toBe('white');
    });
  });
});
