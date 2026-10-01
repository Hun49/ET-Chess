import { desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { listRooms } from '../data/rooms-store';
import * as schema from '../db/schema';
import { requireAdmin } from '../middleware/auth';
import type { AppEnv } from '../types';

export const adminRoute = new Hono<AppEnv>()
  .use('*', requireAdmin)
  // List online rooms
  .get('/rooms', async (c) => {
    const rooms = await listRooms(c.env?.DB);
    return c.json({ rooms }, 200);
  })

  // List tournaments
  .get('/tournaments', async (c) => {
    if (!c.env?.DB) {
      return c.json({ tournaments: [] }, 200);
    }
    try {
      const db = drizzle(c.env.DB, { schema });
      const tournaments = await db
        .select()
        .from(schema.tournaments)
        .orderBy(desc(schema.tournaments.createdAt))
        .limit(50);
      return c.json({ tournaments }, 200);
    } catch (err) {
      console.error('Failed to query tournaments from D1 in admin overview:', err);
      return c.json({ tournaments: [] }, 200);
    }
  })

  // Overview stats
  .get('/stats', async (c) => {
    const rooms = await listRooms(c.env?.DB);
    const activeRooms = rooms.filter((r) => r.status === 'active').length;
    const waitingRooms = rooms.filter((r) => r.status === 'waiting' || r.status === 'ready').length;

    let totalTournaments = 0;
    let activeTournaments = 0;

    if (c.env?.DB) {
      try {
        const db = drizzle(c.env.DB, { schema });
        const tourneys = await db.select().from(schema.tournaments);
        totalTournaments = tourneys.length;
        activeTournaments = tourneys.filter(
          (t) => t.status === 'in-progress' || t.status === 'registering',
        ).length;
      } catch (err) {
        console.error('Failed to query tournaments count from D1 in admin stats:', err);
      }
    }

    return c.json(
      {
        totalRooms: rooms.length,
        activeRooms,
        waitingRooms,
        totalTournaments,
        activeTournaments,
      },
      200,
    );
  });
