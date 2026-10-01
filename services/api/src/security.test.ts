import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app, errorHandler } from './app';
import { createAuth } from './auth';
import { resetRoomsStore } from './data/rooms-store';
import { resetStore } from './data/store';

describe('Phase 1 — Security & Identity Boundary Hardening', () => {
  beforeEach(() => {
    resetStore();
    resetRoomsStore();
  });

  describe('1. Authentication & Middleware (Tasks 1 & 2)', () => {
    it('rejects unauthenticated room creation with 401', async () => {
      const res = await app.request('/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeControlMinutes: 10,
          timeControlIncrement: 0,
          hostColor: 'white',
        }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects invalid or forged session token with 401', async () => {
      const res = await app.request('/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: 'better-auth.session_token=forged-or-invalid-token',
        },
        body: JSON.stringify({
          timeControlMinutes: 10,
          timeControlIncrement: 0,
          hostColor: 'white',
        }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects test identity headers when environment is production', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const res = await app.request('/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-test-user-id': 'hacker_123',
          },
          body: JSON.stringify({
            timeControlMinutes: 10,
            timeControlIncrement: 0,
            hostColor: 'white',
          }),
        });
        // In production, x-test-user-id MUST NOT authenticate
        expect(res.status).toBe(401);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('2. Friend-Room Authorization (Task 3)', () => {
    it('prevents non-host (guest) from starting the room (returns 403)', async () => {
      // Create room as user_host
      const createRes = await app.request('/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': 'user_host',
          'x-test-user-name': 'Host Player',
        },
        body: JSON.stringify({
          timeControlMinutes: 5,
          timeControlIncrement: 0,
          hostColor: 'white',
        }),
      });
      expect(createRes.status).toBe(201);
      const { room } = (await createRes.json()) as any;

      // Guest joins
      const joinRes = await app.request(`/rooms/${room.code}/join`, {
        method: 'POST',
        headers: {
          'x-test-user-id': 'user_guest',
          'x-test-user-name': 'Guest Player',
        },
      });
      expect(joinRes.status).toBe(200);

      // Guest attempts to start match -> MUST be rejected with 403 Forbidden!
      const startRes = await app.request(`/rooms/${room.id}/start`, {
        method: 'POST',
        headers: {
          'x-test-user-id': 'user_guest',
        },
      });
      expect(startRes.status).toBe(403);
    });

    it('prevents unauthorized third-party from viewing private room details', async () => {
      // Create room as user_host
      const createRes = await app.request('/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': 'user_host',
        },
        body: JSON.stringify({
          timeControlMinutes: 5,
          timeControlIncrement: 0,
          hostColor: 'white',
        }),
      });
      const { room } = (await createRes.json()) as any;

      // Unauthenticated request to GET /rooms/:id -> 401
      const unauthRes = await app.request(`/rooms/${room.id}`);
      expect(unauthRes.status).toBe(401);

      // Unrelated third party request -> 403 or 404
      const thirdPartyRes = await app.request(`/rooms/${room.id}`, {
        headers: {
          'x-test-user-id': 'unrelated_stranger',
        },
      });
      expect([403, 404]).toContain(thirdPartyRes.status);
    });

    it('prevents unauthorized third-party from obtaining a game ticket for a private room', async () => {
      // Create room as user_host
      const createRes = await app.request('/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': 'user_host',
        },
        body: JSON.stringify({
          timeControlMinutes: 5,
          timeControlIncrement: 0,
          hostColor: 'white',
        }),
      });
      const { room } = (await createRes.json()) as any;

      // Stranger tries to get a game ticket for this room -> 403
      const ticketRes = await app.request(`/rooms/${room.id}/ticket`, {
        method: 'POST',
        headers: {
          'x-test-user-id': 'unrelated_stranger',
        },
      });
      expect(ticketRes.status).toBe(403);
    });
  });

  describe('3. Matchmaking Authorization (Task 5)', () => {
    it('requires authentication for queueing and ignores client-supplied userId', async () => {
      // Unauthenticated queue request -> 401
      const unauthRes = await app.request('/matchmaking/queue?userId=victim_123');
      expect(unauthRes.status).toBe(401);
    });

    it('ignores client-supplied rating and derives rating from server profile', async () => {
      const mockDONamespace = {
        idFromName: vi.fn().mockReturnValue('global-id'),
        get: vi.fn().mockReturnValue({
          fetch: vi.fn().mockImplementation((req: Request) => {
            const url = new URL(req.url);
            // Verify what reached the MatchmakerDO
            return new Response(
              JSON.stringify({
                queuedUserId: url.searchParams.get('userId'),
                queuedRating: url.searchParams.get('rating'),
              }),
            );
          }),
        }),
      };

      const res = await app.request(
        '/matchmaking/queue?userId=victim_123&rating=2800&displayName=SuperGrandmaster',
        {
          headers: {
            'x-test-user-id': 'legit_user',
            'x-test-user-name': 'Legit Player',
          },
        },
        { MATCHMAKER: mockDONamespace } as any,
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      // Must be the authenticated user's ID, NOT victim_123
      expect(data.queuedUserId).toBe('legit_user');
      // Rating must be default (1200) or DB profile, NOT the attacker's 2800!
      expect(data.queuedRating).toBe('1200');
    });

    it('prevents user A from removing user B in /matchmaking/leave', async () => {
      const mockDONamespace = {
        idFromName: vi.fn().mockReturnValue('global-id'),
        get: vi.fn().mockReturnValue({
          fetch: vi.fn().mockImplementation(async (req: Request) => {
            const body = await req.json();
            return new Response(JSON.stringify({ removedUserId: (body as any).userId }));
          }),
        }),
      };

      // Attacker tries to kick victim from queue
      const res = await app.request(
        '/matchmaking/leave',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-test-user-id': 'attacker_user',
          },
          body: JSON.stringify({ userId: 'victim_user' }),
        },
        { MATCHMAKER: mockDONamespace } as any,
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      // Server must only remove attacker_user, completely ignoring client body userId
      expect(data.removedUserId).toBe('attacker_user');
    });

    it('restricts queue status inspection to admins only', async () => {
      // Normal user trying to inspect queue status -> 403 Forbidden
      const res = await app.request('/matchmaking/status', {
        headers: {
          'x-test-user-id': 'normal_user',
          'x-test-user-role': 'user',
        },
      });
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('4. Tournament Authorization (Task 6)', () => {
    it('prevents non-host from starting a tournament (returns 403)', async () => {
      const mockDO = {
        idFromName: vi.fn().mockReturnValue('tourney-id'),
        get: vi.fn().mockReturnValue({
          fetch: vi.fn().mockImplementation(async (req: Request) => {
            if (req.url.includes('/init')) {
              return new Response(JSON.stringify({ success: true }));
            }
            if (req.url.includes('/join')) {
              return new Response(
                JSON.stringify({ tournament: { id: 't_mock', name: 'Open Cup' } }),
              );
            }
            return new Response(JSON.stringify({ success: true }));
          }),
        }),
      };

      // Host creates tournament
      const createRes = await app.request(
        '/tournaments',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-test-user-id': 'tourney_host',
          },
          body: JSON.stringify({ name: 'Championship' }),
        },
        { TOURNAMENT: mockDO } as any,
      );
      expect(createRes.status).toBe(201);
      const { tournament } = (await createRes.json()) as any;

      // Attacker tries to start tournament -> 403
      const startRes = await app.request(
        `/tournaments/${tournament.id}/start`,
        {
          method: 'POST',
          headers: {
            'x-test-user-id': 'attacker_random',
          },
        },
        { TOURNAMENT: mockDO } as any,
      );
      expect(startRes.status).toBe(403);
    });

    it('rejects public client match-result submission', async () => {
      // Public /:id/match-result should be disabled/rejected or require internal secret
      const res = await app.request('/tournaments/t_123/match-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: 'm_1',
          winnerUserId: 'attacker_self',
        }),
      });
      expect([401, 403, 404, 405]).toContain(res.status);
    });
  });

  describe('5. Admin & Reports Authorization (Tasks 7 & 8)', () => {
    it('rejects unauthenticated access to /admin/* with 401', async () => {
      const res = await app.request('/admin/stats');
      expect(res.status).toBe(401);
    });

    it('rejects normal user access to /admin/* with 403', async () => {
      const res = await app.request('/admin/stats', {
        headers: {
          'x-test-user-id': 'regular_user',
          'x-test-user-role': 'user',
        },
      });
      expect(res.status).toBe(403);
    });

    it('allows admin user access to /admin/* with 200', async () => {
      const res = await app.request('/admin/stats', {
        headers: {
          'x-test-user-id': 'admin_user',
          'x-test-user-role': 'admin',
        },
      });
      expect(res.status).toBe(200);
    });

    it('requires authentication for report creation and derives reporterId from session', async () => {
      // Unauthenticated report create -> 401
      const unauthRes = await app.request('/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: 'forged_reporter',
          reason: 'Engine use',
        }),
      });
      expect(unauthRes.status).toBe(401);

      // Authenticated report create ignores forged reporterId
      const authRes = await app.request('/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': 'real_reporter',
        },
        body: JSON.stringify({
          reporterId: 'forged_reporter',
          reason: 'Engine use suspected',
        }),
      });
      expect(authRes.status).toBe(201);
      const data = (await authRes.json()) as any;
      expect(data.reporterId).toBe('real_reporter');
    });

    it('restricts listing reports to admins only', async () => {
      // Unauthenticated -> 401
      const unauthRes = await app.request('/reports');
      expect([401, 403]).toContain(unauthRes.status);

      // Normal user -> 403
      const userRes = await app.request('/reports', {
        headers: {
          'x-test-user-id': 'regular_user',
          'x-test-user-role': 'user',
        },
      });
      expect(userRes.status).toBe(403);

      // Admin user -> 200
      const adminRes = await app.request('/reports', {
        headers: {
          'x-test-user-id': 'admin_user',
          'x-test-user-role': 'admin',
        },
      });
      expect(adminRes.status).toBe(200);
    });
  });

  describe('6. Production Security Configuration (Task 10)', () => {
    it('fails safely when BETTER_AUTH_SECRET is missing or invalid in production', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        expect(() => {
          createAuth({
            BETTER_AUTH_SECRET: 'short',
          } as any);
        }).toThrow(/BETTER_AUTH_SECRET/);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('does not return raw exception details in 500 error responses in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const testApp = new (await import('hono')).Hono<any>();
        testApp.onError(errorHandler);
        testApp.get('/crash', () => {
          throw new Error('Sensitive database credentials or SQL query leaked!');
        });

        const res = await testApp.request('/crash');
        expect(res.status).toBe(500);
        const body = (await res.json()) as any;
        expect(body.error).toBe('Internal Server Error');
        expect(JSON.stringify(body)).not.toContain('Sensitive database credentials');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('configures explicit CORS allowlist and credentialed headers correctly', async () => {
      // 1. Allowed origin receives exact matching origin header and credentials: true
      const allowedRes = await app.request('/health', {
        headers: {
          Origin: 'http://localhost:5173',
        },
      });
      expect(allowedRes.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
      expect(allowedRes.headers.get('access-control-allow-credentials')).toBe('true');

      // 2. Disallowed/malicious origin does NOT receive allow-origin header (blocked by browser)
      const disallowedRes = await app.request('/health', {
        headers: {
          Origin: 'https://evil-phishing-site.com',
        },
      });
      expect(disallowedRes.headers.get('access-control-allow-origin')).toBeNull();

      // 3. Never returns wildcard '*' when credentials are used
      expect(allowedRes.headers.get('access-control-allow-origin')).not.toBe('*');
    });
  });
});
