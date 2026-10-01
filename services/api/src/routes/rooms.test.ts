import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRoomsStore } from '../data/rooms-store';
import app from '../index';

describe('Friend Challenge Rooms API (/rooms)', () => {
  const hostUser = {
    id: 'usr_host_123',
    name: 'Magnus Host',
  };

  const guestUser = {
    id: 'usr_guest_456',
    name: 'Hikaru Guest',
  };

  const hostHeaders = {
    'Content-Type': 'application/json',
    'x-test-user-id': hostUser.id,
    'x-test-user-name': hostUser.name,
  };

  const guestHeaders = {
    'Content-Type': 'application/json',
    'x-test-user-id': guestUser.id,
    'x-test-user-name': guestUser.name,
  };

  beforeEach(() => {
    resetRoomsStore();
  });

  it('rejects room creation if not authenticated', async () => {
    const res = await app.request('/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeControlMinutes: 5,
        timeControlIncrement: 3,
        hostColor: 'white',
      }),
    });

    expect(res.status).toBe(401);
  });

  it('creates a room with 6-char code when authenticated', async () => {
    const res = await app.request('/rooms', {
      method: 'POST',
      headers: hostHeaders,
      body: JSON.stringify({
        timeControlMinutes: 5,
        timeControlIncrement: 3,
        hostColor: 'white',
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.room).toBeDefined();
    expect(body.room.id).toBeDefined();
    expect(body.room.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(body.room.hostUserId).toBe(hostUser.id);
    expect(body.room.timeControlMinutes).toBe(5);
    expect(body.room.timeControlIncrement).toBe(3);
    expect(body.room.hostColor).toBe('white');
    expect(body.room.status).toBe('waiting');
  });

  it('retrieves room details by id via GET /rooms/:roomId', async () => {
    // 1. Create room
    const createRes = await app.request('/rooms', {
      method: 'POST',
      headers: hostHeaders,
      body: JSON.stringify({
        timeControlMinutes: 10,
        timeControlIncrement: 0,
        hostColor: 'black',
      }),
    });
    const { room } = (await createRes.json()) as any;

    // 2. Fetch room
    const getRes = await app.request(`/rooms/${room.id}`, {
      headers: hostHeaders,
    });
    expect(getRes.status).toBe(200);
    const getBody = (await getRes.json()) as any;
    expect(getBody.room.id).toBe(room.id);
    expect(getBody.room.code).toBe(room.code);
    expect(getBody.room.hostColor).toBe('black');
  });

  it('returns 404 for nonexistent room id when authenticated', async () => {
    const res = await app.request('/rooms/nonexistent-uuid-12345', {
      headers: hostHeaders,
    });
    expect(res.status).toBe(404);
  });

  it('allows a second user to join room with 6-char code', async () => {
    // 1. Host creates room
    const createRes = await app.request('/rooms', {
      method: 'POST',
      headers: hostHeaders,
      body: JSON.stringify({
        timeControlMinutes: 3,
        timeControlIncrement: 2,
        hostColor: 'white',
      }),
    });
    const { room } = (await createRes.json()) as any;

    // 2. Guest joins with code
    const joinRes = await app.request(`/rooms/${room.code}/join`, {
      method: 'POST',
      headers: guestHeaders,
    });

    expect(joinRes.status).toBe(200);
    const joinBody = (await joinRes.json()) as any;
    expect(joinBody.room.status).toBe('ready');
    expect(joinBody.room.guestUserId).toBe(guestUser.id);
    expect(joinBody.room.whiteUserId).toBe(hostUser.id);
    expect(joinBody.room.blackUserId).toBe(guestUser.id);
  });

  it('rejects host trying to join their own room as guest', async () => {
    const createRes = await app.request('/rooms', {
      method: 'POST',
      headers: hostHeaders,
      body: JSON.stringify({
        timeControlMinutes: 5,
        timeControlIncrement: 0,
      }),
    });
    const { room } = (await createRes.json()) as any;

    const joinRes = await app.request(`/rooms/${room.code}/join`, {
      method: 'POST',
      headers: hostHeaders,
    });

    expect(joinRes.status).toBe(400);
    const joinBody = (await joinRes.json()) as any;
    expect(joinBody.error).toContain('cannot join your own room');
  });

  it('starts the room and invokes GameRoomDO init when binding is present', async () => {
    // 1. Host creates room
    const createRes = await app.request('/rooms', {
      method: 'POST',
      headers: hostHeaders,
      body: JSON.stringify({
        timeControlMinutes: 5,
        timeControlIncrement: 0,
        hostColor: 'white',
      }),
    });
    const { room } = (await createRes.json()) as any;

    // 2. Guest joins
    await app.request(`/rooms/${room.code}/join`, {
      method: 'POST',
      headers: guestHeaders,
    });

    // Mock DO stub
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
    const mockDOStub = {
      fetch: fetchSpy,
    };
    const mockDONamespace = {
      idFromName: vi.fn((name: string) => ({ name })),
      get: vi.fn(() => mockDOStub),
    };

    // 3. Host starts game
    const startRes = await app.request(
      `/rooms/${room.id}/start`,
      {
        method: 'POST',
        headers: hostHeaders,
      },
      {
        GAME_ROOM: mockDONamespace as any,
      },
    );

    expect(startRes.status).toBe(200);
    const startBody = (await startRes.json()) as any;
    expect(startBody.success).toBe(true);
    expect(startBody.room.status).toBe('active');

    // DO stub was invoked with init payload
    expect(mockDONamespace.idFromName).toHaveBeenCalledWith(room.id);
    expect(mockDOStub.fetch).toHaveBeenCalled();
    const [calledReq] = fetchSpy.mock.calls[0] as unknown as [Request];
    expect(calledReq.url).toContain('/init');
    const calledBody = (await calledReq.json()) as any;
    expect(calledBody.gameId).toBe(room.id);
    expect(calledBody.whiteUserId).toBe(hostUser.id);
    expect(calledBody.blackUserId).toBe(guestUser.id);
  });

  it('preserves assigned colors deterministically across multiple GET requests when hostColor is random', async () => {
    // 1. Host creates room with random color
    const createRes = await app.request('/rooms', {
      method: 'POST',
      headers: hostHeaders,
      body: JSON.stringify({
        timeControlMinutes: 5,
        timeControlIncrement: 0,
        hostColor: 'random',
      }),
    });
    const { room } = (await createRes.json()) as any;

    // 2. Guest joins
    const joinRes = await app.request(`/rooms/${room.code}/join`, {
      method: 'POST',
      headers: guestHeaders,
    });
    const joinBody = (await joinRes.json()) as any;
    const initialWhite = joinBody.room.whiteUserId;
    const initialBlack = joinBody.room.blackUserId;

    expect(initialWhite).toBeDefined();
    expect(initialBlack).toBeDefined();
    expect(initialWhite).not.toBe(initialBlack);

    // 3. Make 20 subsequent GET requests and assert the colors NEVER change/flip
    for (let i = 0; i < 20; i++) {
      const getRes = await app.request(`/rooms/${room.id}`, {
        headers: hostHeaders,
      });
      expect(getRes.status).toBe(200);
      const getBody = (await getRes.json()) as any;
      expect(getBody.room.whiteUserId).toBe(initialWhite);
      expect(getBody.room.blackUserId).toBe(initialBlack);
    }
  });

  it('throws and propagates database errors when D1 is bound instead of silently falling back', async () => {
    // Mock failing D1 database
    const failingD1: any = {
      prepare: vi.fn(() => {
        throw new Error('D1 storage unavailable / disk full');
      }),
      batch: vi.fn(async () => {
        throw new Error('D1 transaction aborted');
      }),
      exec: vi.fn(async () => {
        throw new Error('D1 exec failed');
      }),
    };

    const res = await app.request(
      '/rooms',
      {
        method: 'POST',
        headers: hostHeaders,
        body: JSON.stringify({
          timeControlMinutes: 5,
          timeControlIncrement: 0,
          hostColor: 'white',
        }),
      },
      {
        DB: failingD1,
      },
    );

    // Should return 500 error instead of silently falling back to in-memory success
    expect(res.status).toBe(500);
  });
});
