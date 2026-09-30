import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import app from './index';
import { optionalAuth, requireAuth } from './middleware/auth';
import type { AppEnv } from './types';

describe('Better Auth & Protected Routes (@et-chess/api)', () => {
  it('GET /api/me returns 401 Unauthorized without session headers', async () => {
    const res = await app.request('/api/me');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Unauthorized');
  });

  it('GET /api/auth/get-session responds to Better Auth endpoint', async () => {
    const res = await app.request('/api/auth/get-session');
    // Better Auth get-session returns 200 with null session when unauthenticated
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      const data = await res.json();
      expect(data).toBeNull();
    }
  });

  it('POST /api/auth/sign-in/email returns 400 or validation error when credentials missing', async () => {
    const res = await app.request('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    // Should reject invalid empty sign-in body
    expect([400, 422]).toContain(res.status);
  });

  it('requireAuth middleware protects arbitrary routes and blocks unauthenticated callers', async () => {
    const testApp = new Hono<AppEnv>();
    testApp.get('/protected', requireAuth, (c) => c.json({ ok: true }));

    const res = await testApp.request('/protected');
    expect(res.status).toBe(401);
  });

  it('optionalAuth middleware allows unauthenticated requests to proceed with undefined user', async () => {
    const testApp = new Hono<AppEnv>();
    testApp.get('/public-or-private', optionalAuth, (c) => {
      const user = c.get('user');
      return c.json({ authenticated: !!user });
    });

    const res = await testApp.request('/public-or-private');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { authenticated: boolean };
    expect(body.authenticated).toBe(false);
  });
});
