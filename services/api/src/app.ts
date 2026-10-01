import { type ErrorHandler, Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { adminRoute } from './routes/admin';
import { authRoute, profileRoute } from './routes/auth';
import { healthRoute } from './routes/health';
import { matchmakingRoute } from './routes/matchmaking';
import { reportsRoute } from './routes/reports';
import { roomsRoute } from './routes/rooms';
import { tournamentsRoute } from './routes/tournaments';
import { usersRoute } from './routes/users';
import type { AppEnv } from './types';

const corsMiddleware = cors({
  origin: (origin, c) => {
    if (!origin) return null;
    const envOrigins = c.env?.ALLOWED_ORIGINS
      ? c.env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim())
      : [];
    const devOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:8081',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8081',
    ];
    const allowed = [...envOrigins, ...devOrigins];
    if (allowed.includes(origin)) {
      return origin;
    }
    return null;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'Cookie',
    'x-test-user-id',
    'x-test-user-name',
    'x-test-user-role',
  ],
  exposeHeaders: ['Set-Cookie'],
});

export const app = new Hono<AppEnv>()
  // Strict, credentialed CORS middleware with environment-specific allowlist
  .use('*', async (c, next) => {
    if (c.req.header('Upgrade')?.toLowerCase() === 'websocket') {
      return next();
    }
    return corsMiddleware(c, next);
  })
  .route('/health', healthRoute)
  .route('/reports', reportsRoute)
  .route('/users', usersRoute)
  .route('/rooms', roomsRoute)
  .route('/matchmaking', matchmakingRoute)
  .route('/tournaments', tournamentsRoute)
  .route('/admin', adminRoute)
  .route('/api/auth', authRoute)
  .route('/api', profileRoute);

app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  if (err instanceof SyntaxError) {
    return c.json({ error: 'Malformed JSON in request body' }, 400);
  }

  // Internal logging without credential leakage
  console.error(
    'Unhandled internal server error:',
    err instanceof Error ? err.stack || err.message : err,
  );

  const isProd = process.env.NODE_ENV === 'production';
  return c.json(
    { error: isProd ? 'Internal Server Error' : err.message || 'Internal Server Error' },
    500,
  );
};

app.onError(errorHandler);

export type AppType = typeof app;
