import { describe, expect, it, vi } from 'vitest';
import app from '../index';

describe('Tournaments Routes (/tournaments)', () => {
  const hostUser = {
    id: 'usr_host_1',
    name: 'Magnus Host',
  };

  const hostHeaders = {
    'Content-Type': 'application/json',
    'x-test-user-id': hostUser.id,
    'x-test-user-name': hostUser.name,
  };

  it('GET /tournaments returns empty array when DB has no tournaments', async () => {
    const res = await app.request('/tournaments');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.tournaments).toEqual([]);
  });

  it('POST /tournaments rejects unauthenticated requests', async () => {
    const res = await app.request('/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Championship' }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /tournaments returns 503 if TOURNAMENT binding is unavailable', async () => {
    const res = await app.request('/tournaments', {
      method: 'POST',
      headers: hostHeaders,
      body: JSON.stringify({ name: 'Championship' }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as any;
    expect(body.error).toContain('Tournament Durable Object binding unavailable');
  });

  it('POST /tournaments creates tournament and auto-joins host', async () => {
    const mockStub = {
      fetch: vi.fn().mockImplementation((req: Request) => {
        if (req.url.endsWith('/init')) {
          return Promise.resolve(new Response(JSON.stringify({ ok: true })));
        }
        if (req.url.endsWith('/join')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                tournament: {
                  id: 't_mock',
                  name: 'Championship',
                  status: 'registering',
                  participants: [{ userId: hostUser.id, displayName: hostUser.name }],
                },
              }),
            ),
          );
        }
        return Promise.resolve(new Response(JSON.stringify({ ok: true })));
      }),
    };

    const mockEnv = {
      TOURNAMENT: {
        idFromName: vi.fn().mockReturnValue('mock-tournament-id'),
        get: vi.fn().mockReturnValue(mockStub),
      },
    };

    const res = await app.request(
      '/tournaments',
      {
        method: 'POST',
        headers: hostHeaders,
        body: JSON.stringify({ name: 'Championship' }),
      },
      mockEnv as any,
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.tournament.name).toBe('Championship');
    expect(mockStub.fetch).toHaveBeenCalledTimes(2); // init + join
  });

  it('GET /tournaments/:id fetches state from TOURNAMENT DO', async () => {
    const mockStub = {
      fetch: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            tournament: {
              id: 't_mock',
              name: 'Spring Cup',
              status: 'registering',
            },
          }),
        ),
      ),
    };

    const mockEnv = {
      TOURNAMENT: {
        idFromName: vi.fn().mockReturnValue('mock-id'),
        get: vi.fn().mockReturnValue(mockStub),
      },
    };

    const res = await app.request('/tournaments/t_mock', {}, mockEnv as any);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.tournament.name).toBe('Spring Cup');
  });

  it('POST /tournaments/:id/start forwards start command to TOURNAMENT DO', async () => {
    const mockStub = {
      fetch: vi.fn().mockImplementation(
        () =>
          new Response(
            JSON.stringify({
              success: true,
              tournament: {
                id: 't_mock',
                status: 'in-progress',
                hostUserId: hostUser.id,
              },
            }),
          ),
      ),
    };

    const mockEnv = {
      TOURNAMENT: {
        idFromName: vi.fn().mockReturnValue('mock-id'),
        get: vi.fn().mockReturnValue(mockStub),
      },
    };

    const res = await app.request(
      '/tournaments/t_mock/start',
      {
        method: 'POST',
        headers: hostHeaders,
      },
      mockEnv as any,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.tournament.status).toBe('in-progress');
  });
});
