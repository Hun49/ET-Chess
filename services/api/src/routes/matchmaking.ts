import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import * as schema from '../db/schema';
import type { AppEnv } from '../types';

export const matchmakingRoute = new Hono<AppEnv>()
  // WebSocket upgrade to join matchmaking queue
  .get('/queue', async (c) => {
    if (!c.env?.MATCHMAKER) {
      return c.json({ error: 'Matchmaker Durable Object binding unavailable' }, 503);
    }

    const doId = c.env.MATCHMAKER.idFromName('global');
    const stub = c.env.MATCHMAKER.get(doId);

    const url = new URL(c.req.url);
    const userId = url.searchParams.get('userId') || c.var.user?.id;
    let displayName = url.searchParams.get('displayName') || c.var.user?.name || 'Player';
    let rating = url.searchParams.get('rating')
      ? parseInt(url.searchParams.get('rating')!, 10)
      : 1200;

    if (!userId) {
      return c.json({ error: 'User ID is required to queue for matchmaking' }, 401);
    }

    if (c.env?.DB && !url.searchParams.get('rating')) {
      try {
        const db = drizzle(c.env.DB, { schema });
        const [profile] = await db
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, userId));
        if (profile) {
          rating = profile.rating;
          displayName = profile.displayName || displayName;
        }
      } catch {
        // Fallback to default
      }
    }

    url.searchParams.set('userId', userId);
    url.searchParams.set('displayName', displayName);
    url.searchParams.set('rating', rating.toString());

    const forwardRequest = new Request(url.toString(), c.req.raw);
    return stub.fetch(forwardRequest);
  })

  // Leave matchmaking queue via HTTP POST
  .post('/leave', async (c) => {
    if (!c.env?.MATCHMAKER) {
      return c.json({ error: 'Matchmaker Durable Object binding unavailable' }, 503);
    }

    const doId = c.env.MATCHMAKER.idFromName('global');
    const stub = c.env.MATCHMAKER.get(doId);
    const body = await c.req.json().catch(() => ({}));

    return stub.fetch(
      new Request('http://matchmaker/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  })

  // Inspect matchmaking queue status
  .get('/status', async (c) => {
    if (!c.env?.MATCHMAKER) {
      return c.json({ error: 'Matchmaker Durable Object binding unavailable' }, 503);
    }

    const doId = c.env.MATCHMAKER.idFromName('global');
    const stub = c.env.MATCHMAKER.get(doId);

    return stub.fetch(new Request('http://matchmaker/queue', { method: 'GET' }));
  });
