import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { createAuth } from '../auth';
import * as schema from '../db/schema';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

export const authRoute = new Hono<AppEnv>().all('/*', (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

export const profileRoute = new Hono<AppEnv>().get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const d1 = c.env.DB;
  if (!d1) {
    return c.json({
      user,
      profile: {
        userId: user.id,
        displayName: user.name || 'Player',
        rating: 1200,
        gamesPlayed: 0,
      },
    });
  }

  const db = drizzle(d1, { schema });
  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, user.id));

  return c.json({
    user,
    profile: profile ?? {
      userId: user.id,
      displayName: user.name || 'Player',
      rating: 1200,
      gamesPlayed: 0,
    },
  });
});
