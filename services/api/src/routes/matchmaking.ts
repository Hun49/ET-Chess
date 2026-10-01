import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import * as schema from '../db/schema';
import { requireAdmin, requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

export const matchmakingRoute = new Hono<AppEnv>()
  // WebSocket upgrade to join matchmaking queue (requires authentication)
  .get('/queue', requireAuth, async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!c.env?.MATCHMAKER) {
      return c.json({ error: 'Matchmaker Durable Object binding unavailable' }, 503);
    }

    const doId = c.env.MATCHMAKER.idFromName('global');
    const stub = c.env.MATCHMAKER.get(doId);

    const userId = user.id;
    let displayName = user.name || 'Player';
    let rating = 1200;

    // Derive canonical rating and displayName from server-side D1 profile
    if (c.env?.DB) {
      try {
        const db = drizzle(c.env.DB, { schema });
        const [profile] = await db
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, userId));
        if (profile) {
          rating = profile.rating;
          if (profile.displayName) {
            displayName = profile.displayName;
          }
        }
      } catch (err) {
        console.warn('Could not load user profile for matchmaking, falling back to defaults:', err);
      }
    }

    const url = new URL(c.req.url);
    url.searchParams.set('userId', userId);
    url.searchParams.set('displayName', displayName);
    url.searchParams.set('rating', rating.toString());

    const forwardRequest = new Request(url.toString(), c.req.raw);
    return stub.fetch(forwardRequest);
  })

  // Leave matchmaking queue via HTTP POST (requires authentication)
  .post('/leave', requireAuth, async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!c.env?.MATCHMAKER) {
      return c.json({ error: 'Matchmaker Durable Object binding unavailable' }, 503);
    }

    const doId = c.env.MATCHMAKER.idFromName('global');
    const stub = c.env.MATCHMAKER.get(doId);

    // Strictly enforce canonical authenticated user.id; completely ignore client body userId
    return stub.fetch(
      new Request('http://matchmaker/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      }),
    );
  })

  // Inspect matchmaking queue status (restricted to admin users only)
  .get('/status', requireAdmin, async (c) => {
    if (!c.env?.MATCHMAKER) {
      return c.json({ error: 'Matchmaker Durable Object binding unavailable' }, 503);
    }

    const doId = c.env.MATCHMAKER.idFromName('global');
    const stub = c.env.MATCHMAKER.get(doId);

    return stub.fetch(new Request('http://matchmaker/queue', { method: 'GET' }));
  });
