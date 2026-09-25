import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { healthRoute } from './routes/health';
import { reportsRoute } from './routes/reports';
import { usersRoute } from './routes/users';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>()
  .route('/health', healthRoute)
  .route('/reports', reportsRoute)
  .route('/users', usersRoute);

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
export default app;
