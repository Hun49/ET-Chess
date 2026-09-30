import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import type { Bindings } from '../types';

export interface TournamentPlayer {
  userId: string;
  displayName: string;
  rating: number;
  seed: number;
}

export interface TournamentMatch {
  id: string;
  round: number;
  matchNumber: number;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winner: TournamentPlayer | null;
  status: 'scheduled' | 'active' | 'finished';
  gameId: string | null;
}

export interface TournamentData {
  id: string;
  name: string;
  status: 'registering' | 'in-progress' | 'finished';
  participants: TournamentPlayer[];
  matches: TournamentMatch[];
  currentRound: number;
  totalRounds: number;
  winner: TournamentPlayer | null;
  createdAt: number;
}

export class TournamentDO {
  private ctx: DurableObjectState;
  private env: Bindings;
  private data: TournamentData | null = null;

  constructor(ctx: DurableObjectState, env: Bindings) {
    this.ctx = ctx;
    this.env = env;
  }

  private async ensureLoaded(id?: string, name?: string): Promise<TournamentData> {
    if (this.data) return this.data;

    const stored = await this.ctx.storage.get<TournamentData>('tournament_data');
    if (stored) {
      this.data = stored;
      return this.data;
    }

    this.data = {
      id: id || 'tournament_default',
      name: name || 'ET-Chess Championship',
      status: 'registering',
      participants: [],
      matches: [],
      currentRound: 0,
      totalRounds: 0,
      winner: null,
      createdAt: Date.now(),
    };

    await this.ctx.storage.put('tournament_data', this.data);
    return this.data;
  }

  private async saveData(): Promise<void> {
    if (this.data) {
      await this.ctx.storage.put('tournament_data', this.data);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // 1. WebSocket upgrade
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const data = await this.ensureLoaded();
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      const userId = url.searchParams.get('userId') || 'spectator';
      this.ctx.acceptWebSocket(server, [userId]);

      server.send(
        JSON.stringify({
          type: 'tournament-sync',
          tournament: data,
        }),
      );

      return new Response(null, {
        status: 101,
        webSocket: client,
      } as ResponseInit);
    }

    // 2. HTTP GET /state
    if (request.method === 'GET' && url.pathname.endsWith('/state')) {
      const data = await this.ensureLoaded();
      return new Response(JSON.stringify({ tournament: data }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. HTTP POST /init
    if (request.method === 'POST' && url.pathname.endsWith('/init')) {
      const body = (await request.json().catch(() => ({}))) as {
        id?: string;
        name?: string;
      };
      const data = await this.ensureLoaded(body.id, body.name);
      if (body.name) {
        data.name = body.name;
        await this.saveData();
      }
      return new Response(JSON.stringify({ tournament: data }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. HTTP POST /join
    if (request.method === 'POST' && url.pathname.endsWith('/join')) {
      const data = await this.ensureLoaded();
      if (data.status !== 'registering') {
        return new Response(JSON.stringify({ error: 'Tournament registration is closed' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const body = (await request.json().catch(() => ({}))) as {
        userId?: string;
        displayName?: string;
        rating?: number;
      };

      if (!body.userId) {
        return new Response(JSON.stringify({ error: 'Missing userId' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (data.participants.some((p) => p.userId === body.userId)) {
        return new Response(
          JSON.stringify({ error: 'User is already registered for this tournament' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const newPlayer: TournamentPlayer = {
        userId: body.userId,
        displayName: body.displayName || 'Player',
        rating: body.rating ?? 1200,
        seed: data.participants.length + 1,
      };

      data.participants.push(newPlayer);
      await this.saveData();

      // Persist participant in D1 if available
      if (this.env.DB) {
        try {
          const db = drizzle(this.env.DB, { schema });
          await db.insert(schema.tournamentParticipants).values({
            id: `tp_${data.id}_${newPlayer.userId}`,
            tournamentId: data.id,
            userId: newPlayer.userId,
            seed: newPlayer.seed,
          });
        } catch (err) {
          console.warn('Could not persist participant to D1:', err);
        }
      }

      this.broadcastSync(data);

      return new Response(
        JSON.stringify({ success: true, participant: newPlayer, tournament: data }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 5. HTTP POST /start
    if (request.method === 'POST' && url.pathname.endsWith('/start')) {
      const data = await this.ensureLoaded();
      if (data.status !== 'registering') {
        return new Response(
          JSON.stringify({ error: 'Tournament is already started or finished' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (data.participants.length < 2) {
        return new Response(
          JSON.stringify({ error: 'At least 2 participants required to start' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      // Generate single-elimination bracket
      this.generateInitialBracket(data);
      data.status = 'in-progress';
      await this.saveData();

      // Persist to D1
      if (this.env.DB) {
        try {
          const db = drizzle(this.env.DB, { schema });
          await db
            .update(schema.tournaments)
            .set({ status: 'in-progress' })
            .where(eq(schema.tournaments.id, data.id));

          for (const m of data.matches) {
            await db.insert(schema.tournamentMatches).values({
              id: m.id,
              tournamentId: data.id,
              round: m.round,
              player1UserId: m.player1?.userId ?? null,
              player2UserId: m.player2?.userId ?? null,
              gameId: m.gameId,
              winnerUserId: m.winner?.userId ?? null,
            });
          }
        } catch (err) {
          console.warn('Could not persist initial bracket to D1:', err);
        }
      }

      // Check if all round 1 matches are already completed (e.g. byes)
      this.checkRoundProgression(data);
      await this.saveData();

      this.broadcastSync(data);

      return new Response(JSON.stringify({ success: true, tournament: data }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. HTTP POST /match-result
    if (request.method === 'POST' && url.pathname.endsWith('/match-result')) {
      const data = await this.ensureLoaded();
      const body = (await request.json().catch(() => ({}))) as {
        matchId?: string;
        gameId?: string;
        winnerUserId?: string;
      };

      if (!body.winnerUserId || (!body.matchId && !body.gameId)) {
        return new Response(JSON.stringify({ error: 'Missing matchId/gameId or winnerUserId' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const match = data.matches.find(
        (m) => (body.matchId && m.id === body.matchId) || (body.gameId && m.gameId === body.gameId),
      );

      if (!match) {
        return new Response(JSON.stringify({ error: 'Match not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (match.status === 'finished') {
        return new Response(JSON.stringify({ success: true, match, tournament: data }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const winningPlayer =
        match.player1?.userId === body.winnerUserId
          ? match.player1
          : match.player2?.userId === body.winnerUserId
            ? match.player2
            : null;

      if (!winningPlayer) {
        return new Response(
          JSON.stringify({ error: 'Winner must be one of the match participants' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      match.winner = winningPlayer;
      match.status = 'finished';

      // Persist match result to D1
      if (this.env.DB) {
        try {
          const db = drizzle(this.env.DB, { schema });
          await db
            .update(schema.tournamentMatches)
            .set({ winnerUserId: winningPlayer.userId })
            .where(eq(schema.tournamentMatches.id, match.id));
        } catch (err) {
          console.warn('Could not update match result in D1:', err);
        }
      }

      this.checkRoundProgression(data);
      await this.saveData();

      this.broadcastSync(data);

      return new Response(JSON.stringify({ success: true, match, tournament: data }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Generates a single-elimination bracket with power-of-2 sizing and seeds with byes.
   */
  public generateInitialBracket(data: TournamentData): void {
    const pCount = data.participants.length;

    // Sort participants by rating descending to assign seeds
    const sorted = [...data.participants].sort((a, b) => b.rating - a.rating);
    sorted.forEach((p, idx) => {
      p.seed = idx + 1;
    });
    data.participants = sorted;

    // Find nearest power of 2 >= pCount
    let bracketSize = 2;
    while (bracketSize < pCount) {
      bracketSize *= 2;
    }

    const totalRounds = Math.log2(bracketSize);
    data.totalRounds = totalRounds;
    data.currentRound = 1;
    data.matches = [];

    const numFirstRoundMatches = bracketSize / 2;

    // Seed pairing: 1 vs bracketSize, 2 vs bracketSize - 1, etc.
    for (let i = 1; i <= numFirstRoundMatches; i++) {
      const seed1 = i;
      const seed2 = bracketSize + 1 - i;

      const player1 = data.participants.find((p) => p.seed === seed1) ?? null;
      const player2 = data.participants.find((p) => p.seed === seed2) ?? null;

      const matchId = `m_${data.id}_r1_${i}`;
      const isBye = !player2;

      const match: TournamentMatch = {
        id: matchId,
        round: 1,
        matchNumber: i,
        player1,
        player2,
        winner: isBye ? player1 : null,
        status: isBye ? 'finished' : 'scheduled',
        gameId: isBye ? null : `game_${data.id}_r1_m${i}`,
      };

      data.matches.push(match);
    }
  }

  /**
   * Evaluates if the current round has finished, and spawns the next round matches or crowns champion.
   */
  public checkRoundProgression(data: TournamentData): void {
    if (data.status !== 'in-progress') return;

    const currentMatches = data.matches.filter((m) => m.round === data.currentRound);
    const allFinished =
      currentMatches.length > 0 && currentMatches.every((m) => m.status === 'finished');

    if (!allFinished) return;

    // If final round finished:
    if (data.currentRound === data.totalRounds) {
      const finalMatch = currentMatches[0];
      data.status = 'finished';
      data.winner = finalMatch?.winner ?? null;

      if (this.env.DB) {
        try {
          const db = drizzle(this.env.DB, { schema });
          db.update(schema.tournaments)
            .set({ status: 'finished' })
            .where(eq(schema.tournaments.id, data.id))
            .catch(() => {});
        } catch {
          // Ignored
        }
      }
      return;
    }

    // Advance to next round
    const nextRound = data.currentRound + 1;
    const nextMatches: TournamentMatch[] = [];

    // Pair winners of adjacent matches: Match 1 & 2 -> Next Match 1
    for (let i = 0; i < currentMatches.length; i += 2) {
      const matchA = currentMatches[i];
      const matchB = currentMatches[i + 1];

      const p1 = matchA?.winner ?? null;
      const p2 = matchB?.winner ?? null;
      const matchNumber = Math.floor(i / 2) + 1;
      const matchId = `m_${data.id}_r${nextRound}_${matchNumber}`;

      const nextMatch: TournamentMatch = {
        id: matchId,
        round: nextRound,
        matchNumber,
        player1: p1,
        player2: p2,
        winner: null,
        status: 'scheduled',
        gameId: `game_${data.id}_r${nextRound}_m${matchNumber}`,
      };

      nextMatches.push(nextMatch);
    }

    data.matches.push(...nextMatches);
    data.currentRound = nextRound;

    // Persist new matches to D1
    if (this.env.DB) {
      try {
        const db = drizzle(this.env.DB, { schema });
        for (const nm of nextMatches) {
          db.insert(schema.tournamentMatches)
            .values({
              id: nm.id,
              tournamentId: data.id,
              round: nm.round,
              player1UserId: nm.player1?.userId ?? null,
              player2UserId: nm.player2?.userId ?? null,
              gameId: nm.gameId,
              winnerUserId: null,
            })
            .catch(() => {});
        }
      } catch {
        // Ignored
      }
    }
  }

  private broadcastSync(data: TournamentData): void {
    const sockets = this.ctx.getWebSockets();
    const payload = JSON.stringify({
      type: 'tournament-sync',
      tournament: data,
    });

    for (const ws of sockets) {
      try {
        ws.send(payload);
      } catch {
        // Ignore dead sockets
      }
    }
  }
}
