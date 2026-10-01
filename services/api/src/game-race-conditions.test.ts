import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameRoomDO } from './durable-objects/GameRoomDO';

class MockWebSocket {
  sentMessages: string[] = [];
  closed = false;
  readyState = 1; // WebSocket.OPEN
  attachment: any = null;
  tags: string[] = [];

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = 3; // WebSocket.CLOSED
  }

  serializeAttachment(att: any) {
    this.attachment = att;
  }

  deserializeAttachment() {
    return this.attachment;
  }
}

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

describe('Phase 3 Deliverables D3.21 & D3.22 — Game Terminal-Event Race Conditions', () => {
  let mockCtx: ReturnType<typeof createMockDOContext>;
  let roomDO: GameRoomDO;

  beforeEach(async () => {
    mockCtx = createMockDOContext();
    roomDO = new GameRoomDO(mockCtx.ctx, {});

    await roomDO.fetch(
      new Request('http://localhost/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'race-game-1',
          whiteUserId: 'alice-id',
          whiteDisplayName: 'Alice',
          blackUserId: 'bob-id',
          blackDisplayName: 'Bob',
          timeControlMinutes: 5,
          timeControlIncrement: 0,
          whiteRemainingMs: 1000,
          blackRemainingMs: 300000,
          turnStartedAt: Date.now() - 950, // 50ms left
          activeClockColor: 'white',
        }),
      }),
    );
  });

  it('Race 1: move() vs timeout alarm() resolves deterministically without double result or corruption', async () => {
    const whiteWs = new MockWebSocket();
    whiteWs.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
    whiteWs.tags = ['alice-id', 'white'];
    mockCtx.webSockets.push(whiteWs);

    const bobWs = new MockWebSocket();
    bobWs.serializeAttachment({ userId: 'bob-id', displayName: 'Bob', color: 'black' });
    bobWs.tags = ['bob-id', 'black'];
    mockCtx.webSockets.push(bobWs);

    // Concurrently trigger move and alarm
    const movePromise = roomDO.webSocketMessage(
      whiteWs as any,
      JSON.stringify({ type: 'move', move: { from: 'e2', to: 'e4' } }),
    );
    const alarmPromise = roomDO.alarm();

    await Promise.allSettled([movePromise, alarmPromise]);

    const stateRes = await roomDO.fetch(new Request('http://localhost/state'));
    const state = (await stateRes.json()) as any;

    // Either move landed (turn flipped to black) OR timeout triggered (status finished, winner black)
    if (state.status === 'finished') {
      expect(state.lifecycleState).toBe('COMPLETED');
      expect(state.result).toBe('black');
      expect(state.terminationReason).toContain('timed out');
    } else {
      expect(state.status).toBe('in-progress');
      expect(state.gameState.turn).toBe('black');
      expect(state.activeClockColor).toBe('black');
    }

    // Settled idempotency check: only at most one game-over message was ever broadcast
    const gameOverMsgs = whiteWs.sentMessages
      .map((m) => JSON.parse(m))
      .filter((m) => m.type === 'game-over');
    expect(gameOverMsgs.length).toBeLessThanOrEqual(1);
  });

  it('Race 2: resign() vs timeout alarm() resolves to exactly one terminal result', async () => {
    const whiteWs = new MockWebSocket();
    whiteWs.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
    whiteWs.tags = ['alice-id', 'white'];
    mockCtx.webSockets.push(whiteWs);

    // Resign and alarm executed concurrently
    const resignPromise = roomDO.webSocketMessage(
      whiteWs as any,
      JSON.stringify({ type: 'resign' }),
    );
    const alarmPromise = roomDO.alarm();

    await Promise.allSettled([resignPromise, alarmPromise]);

    const stateRes = await roomDO.fetch(new Request('http://localhost/state'));
    const state = (await stateRes.json()) as any;

    expect(state.status).toBe('finished');
    expect(state.lifecycleState).toBe('COMPLETED');
    expect(state.result).toBe('black');

    // Exactly one game-over message
    const gameOverMsgs = whiteWs.sentMessages
      .map((m) => JSON.parse(m))
      .filter((m) => m.type === 'game-over');
    expect(gameOverMsgs).toHaveLength(1);
  });

  it('Race 3: simultaneous resign() from both players handles the race without conflicting results', async () => {
    const whiteWs = new MockWebSocket();
    whiteWs.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
    whiteWs.tags = ['alice-id', 'white'];
    mockCtx.webSockets.push(whiteWs);

    const bobWs = new MockWebSocket();
    bobWs.serializeAttachment({ userId: 'bob-id', displayName: 'Bob', color: 'black' });
    bobWs.tags = ['bob-id', 'black'];
    mockCtx.webSockets.push(bobWs);

    // Both players submit resign concurrently
    const whiteResign = roomDO.webSocketMessage(whiteWs as any, JSON.stringify({ type: 'resign' }));
    const bobResign = roomDO.webSocketMessage(bobWs as any, JSON.stringify({ type: 'resign' }));

    await Promise.allSettled([whiteResign, bobResign]);

    const stateRes = await roomDO.fetch(new Request('http://localhost/state'));
    const state = (await stateRes.json()) as any;

    expect(state.status).toBe('finished');
    expect(state.lifecycleState).toBe('COMPLETED');
    // Result is deterministically either 'black' or 'white' (first processed wins)
    expect(['white', 'black']).toContain(state.result);

    // Only 1 game-over broadcast was sent
    const gameOverMsgs = whiteWs.sentMessages
      .map((m) => JSON.parse(m))
      .filter((m) => m.type === 'game-over');
    expect(gameOverMsgs).toHaveLength(1);
  });

  it('Race 4: disconnect grace vs clock expiration evaluates the earliest deadline correctly', async () => {
    // White clock has 200ms remaining, started 250ms ago
    const now = Date.now();
    const startTime = now - 250;
    await roomDO.fetch(
      new Request('http://localhost/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'race-game-disc',
          whiteUserId: 'alice-id',
          blackUserId: 'bob-id',
          whiteRemainingMs: 200,
          turnStartedAt: startTime,
          activeClockColor: 'white',
        }),
      }),
    );

    const whiteWs = new MockWebSocket();
    whiteWs.serializeAttachment({ userId: 'alice-id', displayName: 'Alice', color: 'white' });
    whiteWs.tags = ['alice-id', 'white'];
    mockCtx.webSockets.push(whiteWs);

    // White closes socket -> disconnect grace is 60,000ms, but clock expires in 200ms
    await roomDO.webSocketClose(whiteWs as any);

    // Alarm is scheduled for earliest: now + 200ms (clock deadline), NOT now + 60000ms
    const scheduled = mockCtx.getScheduledAlarm();
    expect(scheduled).toBeDefined();
    expect(scheduled!).toBeLessThanOrEqual(now + 250);

    // Simulate 300ms passing -> alarm fires
    const stateResBefore = await roomDO.fetch(new Request('http://localhost/state'));
    const stateBefore = (await stateResBefore.json()) as any;
    expect(stateBefore.disconnectedPlayer).toBeDefined();

    // Alarm fires
    await roomDO.alarm();

    const stateResAfter = await roomDO.fetch(new Request('http://localhost/state'));
    const stateAfter = (await stateResAfter.json()) as any;

    // Terminal result is clock timeout (since elapsed >= remaining time)
    expect(stateAfter.status).toBe('finished');
    expect(stateAfter.lifecycleState).toBe('COMPLETED');
    expect(stateAfter.result).toBe('black');
  });
});
