import { zValidator } from '@hono/zod-validator';
import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import * as schema from '../db/schema';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';
import { createTournamentSchema } from '../validation/tournament.schema';

const tournamentHostsFallback = new Map<string, string>();

export const tournamentsRoute = new Hono<AppEnv>()
  // List tournaments
  .get('/', async (c) => {
    if (!c.env?.DB) {
      return c.json({ tournaments: [] }, 200);
    }
    const db = drizzle(c.env.DB, { schema });
    const list = await db
      .select()
      .from(schema.tournaments)
      .orderBy(desc(schema.tournaments.createdAt))
      .limit(20);
    return c.json({ tournaments: list }, 200);
  })

  // Create new tournament
  .post(
    '/',
    requireAuth,
    zValidator('json', createTournamentSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'Validation failed', issues: result.error.issues }, 400);
      }
    }),
    async (c) => {
      if (!c.env?.TOURNAMENT) {
        return c.json({ error: 'Tournament Durable Object binding unavailable' }, 503);
      }

      const body = c.req.valid('json');
      const user = c.var.user!;
      const tournamentId = `t_${crypto.randomUUID().slice(0, 8)}`;
      tournamentHostsFallback.set(tournamentId, user.id);

      // Persist in D1
      if (c.env.DB) {
        const db = drizzle(c.env.DB, { schema });
        await db.insert(schema.tournaments).values({
          id: tournamentId,
          roomId: tournamentId,
          name: body.name,
          hostUserId: user.id,
          status: 'registering',
          createdAt: new Date(),
        });
      }

      // Initialize DO
      const doId = c.env.TOURNAMENT.idFromName(tournamentId);
      const stub = c.env.TOURNAMENT.get(doId);

      await stub.fetch(
        new Request('http://tournament/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: tournamentId, name: body.name, hostUserId: user.id }),
        }),
      );

      // Auto-join creator
      const joinRes = await stub.fetch(
        new Request('http://tournament/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            displayName: user.name,
          }),
        }),
      );

      const json = (await joinRes.json().catch(() => ({}))) as any;
      return c.json(
        {
          success: true,
          tournament: {
            ...(json.tournament || {}),
            id: tournamentId,
            name: body.name,
            hostUserId: user.id,
          },
        },
        201,
      );
    },
  )

  // Get tournament state
  .get('/:id', async (c) => {
    const tournamentId = c.req.param('id');
    if (!c.env?.TOURNAMENT) {
      return c.json({ error: 'Tournament Durable Object binding unavailable' }, 503);
    }
    const doId = c.env.TOURNAMENT.idFromName(tournamentId);
    const stub = c.env.TOURNAMENT.get(doId);
    return stub.fetch(new Request('http://tournament/state', { method: 'GET' }));
  })

  // Join tournament
  .post('/:id/join', requireAuth, async (c) => {
    const tournamentId = c.req.param('id');
    if (!c.env?.TOURNAMENT) {
      return c.json({ error: 'Tournament Durable Object binding unavailable' }, 503);
    }
    const user = c.var.user!;
    const doId = c.env.TOURNAMENT.idFromName(tournamentId);
    const stub = c.env.TOURNAMENT.get(doId);

    return stub.fetch(
      new Request('http://tournament/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          displayName: user.name,
        }),
      }),
    );
  })

  // Start tournament (authorized host only)
  .post('/:id/start', requireAuth, async (c) => {
    const user = c.var.user!;
    const tournamentId = c.req.param('id');
    if (!c.env?.TOURNAMENT) {
      return c.json({ error: 'Tournament Durable Object binding unavailable' }, 503);
    }

    let hostUserId: string | null = null;
    if (c.env.DB) {
      const db = drizzle(c.env.DB, { schema });
      const [row] = await db
        .select()
        .from(schema.tournaments)
        .where(eq(schema.tournaments.id, tournamentId));
      if (row?.hostUserId) {
        hostUserId = row.hostUserId;
      }
    }

    if (!hostUserId) {
      hostUserId = tournamentHostsFallback.get(tournamentId) || null;
    }

    const doId = c.env.TOURNAMENT.idFromName(tournamentId);
    const stub = c.env.TOURNAMENT.get(doId);

    if (!hostUserId) {
      const stateRes = await stub.fetch(new Request('http://tournament/state', { method: 'GET' }));
      const state = (await stateRes.json().catch(() => ({}))) as any;
      hostUserId = state?.tournament?.hostUserId || null;
    }

    if (hostUserId && hostUserId !== user.id && (user as any).role !== 'admin') {
      return c.json({ error: 'Forbidden: Only the tournament host can start the tournament' }, 403);
    }

    return stub.fetch(
      new Request('http://tournament/start', {
        method: 'POST',
      }),
    );
  })

  // Match result submission - disabled for public clients
  .post('/:id/match-result', async (c) => {
    return c.json({ error: 'Forbidden: Match results cannot be submitted by clients' }, 403);
  })

  // WebSocket proxy for live bracket updates
  .get('/:id/websocket', async (c) => {
    const tournamentId = c.req.param('id');
    if (!c.env?.TOURNAMENT) {
      return c.json({ error: 'Tournament Durable Object binding unavailable' }, 503);
    }
    const doId = c.env.TOURNAMENT.idFromName(tournamentId);
    const stub = c.env.TOURNAMENT.get(doId);
    return stub.fetch(c.req.raw);
  });
