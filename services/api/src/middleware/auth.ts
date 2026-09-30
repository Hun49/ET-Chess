import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { createAuth } from '../auth';
import type { AuthUser, Session } from '../db/schema';
import type { AppEnv } from '../types';

/**
 * Middleware that strictly enforces authenticated Better Auth session.
 * Rejects requests lacking a valid session token with 401 Unauthorized.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get('user')) {
    await next();
    return;
  }

  // In test environment, allow simulated session via test headers
  const testUserId = c.req.header('x-test-user-id');
  if (process.env.NODE_ENV === 'test' && testUserId) {
    const mockUser: AuthUser = {
      id: testUserId,
      name: c.req.header('x-test-user-name') || 'Test User',
      email: `${testUserId}@example.com`,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    c.set('user', mockUser);
    c.set('session', {
      id: `sess_${testUserId}`,
      userId: testUserId,
      token: `token_${testUserId}`,
      expiresAt: new Date(Date.now() + 86400000),
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await next();
    return;
  }

  const auth = createAuth(c.env);
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session?.user) {
      throw new HTTPException(401, { message: 'Unauthorized: Authentication required' });
    }

    c.set('user', session.user as unknown as AuthUser);
    c.set('session', session.session as unknown as Session);
  } catch (err) {
    if (err instanceof HTTPException) {
      throw err;
    }
    throw new HTTPException(401, { message: 'Unauthorized: Invalid or expired session' });
  }

  await next();
});

/**
 * Optional session middleware that populates user/session context if present,
 * without aborting if absent.
 */
export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get('user')) {
    await next();
    return;
  }

  const testUserId = c.req.header('x-test-user-id');
  if (process.env.NODE_ENV === 'test' && testUserId) {
    const mockUser: AuthUser = {
      id: testUserId,
      name: c.req.header('x-test-user-name') || 'Test User',
      email: `${testUserId}@example.com`,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    c.set('user', mockUser);
    c.set('session', {
      id: `sess_${testUserId}`,
      userId: testUserId,
      token: `token_${testUserId}`,
      expiresAt: new Date(Date.now() + 86400000),
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await next();
    return;
  }

  const auth = createAuth(c.env);
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
    if (session?.user) {
      c.set('user', session.user as unknown as AuthUser);
      c.set('session', session.session as unknown as Session);
    }
  } catch {
    // Unauthenticated request, proceed without user session
  }

  await next();
});
