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

  // In test environment ONLY, allow simulated session via test headers.
  // In production, test headers are strictly ignored and rejected.
  const isProd = process.env.NODE_ENV === 'production';
  const testUserId =
    !isProd && process.env.NODE_ENV === 'test' ? c.req.header('x-test-user-id') : undefined;

  if (testUserId) {
    const mockRole = c.req.header('x-test-user-role') || 'user';
    const mockUser: AuthUser = {
      id: testUserId,
      name: c.req.header('x-test-user-name') || 'Test User',
      email: `${testUserId}@example.com`,
      emailVerified: true,
      image: null,
      role: mockRole,
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

  try {
    const auth = createAuth(c.env);
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
 * Middleware that strictly enforces authenticated Better Auth session with admin role.
 * Rejects unauthenticated callers with 401 and non-admin callers with 403 Forbidden.
 */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  // Ensure user is loaded first via requireAuth logic
  if (!c.get('user')) {
    const isProd = process.env.NODE_ENV === 'production';
    const testUserId =
      !isProd && process.env.NODE_ENV === 'test' ? c.req.header('x-test-user-id') : undefined;

    if (testUserId) {
      const mockRole = c.req.header('x-test-user-role') || 'user';
      const mockUser: AuthUser = {
        id: testUserId,
        name: c.req.header('x-test-user-name') || 'Test User',
        email: `${testUserId}@example.com`,
        emailVerified: true,
        image: null,
        role: mockRole,
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
    } else {
      try {
        const auth = createAuth(c.env);
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
    }
  }

  const currentUser = c.get('user');
  if (!currentUser) {
    throw new HTTPException(401, { message: 'Unauthorized: Authentication required' });
  }

  if (currentUser.role !== 'admin') {
    throw new HTTPException(403, { message: 'Forbidden: Admin access required' });
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

  const isProd = process.env.NODE_ENV === 'production';
  const testUserId =
    !isProd && process.env.NODE_ENV === 'test' ? c.req.header('x-test-user-id') : undefined;

  if (testUserId) {
    const mockRole = c.req.header('x-test-user-role') || 'user';
    const mockUser: AuthUser = {
      id: testUserId,
      name: c.req.header('x-test-user-name') || 'Test User',
      email: `${testUserId}@example.com`,
      emailVerified: true,
      image: null,
      role: mockRole,
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

  try {
    const auth = createAuth(c.env);
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
