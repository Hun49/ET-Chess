import { Hono } from 'hono';
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

export const app = new Hono<AppEnv>()
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

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  if (err instanceof SyntaxError) {
    return c.json({ error: 'Malformed JSON in request body' }, 400);
  }
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

export type AppType = typeof app;
