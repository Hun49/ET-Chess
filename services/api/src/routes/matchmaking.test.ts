import { describe, expect, it, vi } from 'vitest';
import app from '../index';

describe('Matchmaking Routes (/matchmaking)', () => {
  it('returns 503 if MATCHMAKER DO binding is missing', async () => {
    const res = await app.request('/matchmaking/queue?userId=user_1');
    expect(res.status).toBe(503);
    const body = (await res.json()) as any;
    expect(body.error).toContain('Matchmaker Durable Object binding unavailable');
  });

  it('returns 401 if user ID is missing and unauthenticated', async () => {
    const mockEnv = {
      MATCHMAKER: {
        idFromName: vi.fn().mockReturnValue('mock-id'),
        get: vi.fn().mockReturnValue({
          fetch: vi.fn(),
        }),
      },
    };

    const res = await app.request('/matchmaking/queue', {}, mockEnv as any);
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error).toContain('User ID is required');
  });

  it('forwards queue WebSocket request to MatchmakerDO when valid', async () => {
    const mockUpgradeRes = new Response(null, { status: 200 });
    Object.defineProperty(mockUpgradeRes, 'status', { value: 101 });
    const mockFetch = vi.fn().mockResolvedValue(mockUpgradeRes);
    const mockEnv = {
      MATCHMAKER: {
        idFromName: vi.fn().mockReturnValue('mock-id'),
        get: vi.fn().mockReturnValue({
          fetch: mockFetch,
        }),
      },
    };

    const res = await app.request(
      '/matchmaking/queue?userId=user_1&displayName=Alice&rating=1450',
      {
        headers: { Upgrade: 'websocket' },
      },
      mockEnv as any,
    );

    expect(res.status).toBe(101);
    expect(mockEnv.MATCHMAKER.idFromName).toHaveBeenCalledWith('global');
    expect(mockFetch).toHaveBeenCalled();
  });

  it('forwards leave request to MatchmakerDO', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, count: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const mockEnv = {
      MATCHMAKER: {
        idFromName: vi.fn().mockReturnValue('mock-id'),
        get: vi.fn().mockReturnValue({
          fetch: mockFetch,
        }),
      },
    };

    const res = await app.request(
      '/matchmaking/leave',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user_1' }),
      },
      mockEnv as any,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.ok).toBe(true);
  });

  it('forwards status request to MatchmakerDO', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 2, players: [] }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const mockEnv = {
      MATCHMAKER: {
        idFromName: vi.fn().mockReturnValue('mock-id'),
        get: vi.fn().mockReturnValue({
          fetch: mockFetch,
        }),
      },
    };

    const res = await app.request('/matchmaking/status', {}, mockEnv as any);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.count).toBe(2);
  });
});
