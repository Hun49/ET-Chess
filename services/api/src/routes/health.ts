import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const healthRoute = new Hono<AppEnv>().get('/', (c) => {
  return c.json({ status: 'ok' as const }, 200);
});
