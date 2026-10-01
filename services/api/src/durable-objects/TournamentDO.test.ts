import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TournamentDO } from './TournamentDO';

class MockStorage {
  private map = new Map<string, any>();

  async get<T = any>(key: string): Promise<T | undefined> {
    return this.map.get(key);
  }

  async put(key: string, value: any): Promise<void> {
    this.map.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.map.delete(key);
  }
}

class MockDurableObjectState {
  storage = new MockStorage();
  sockets: any[] = [];

  acceptWebSocket(ws: any, _tags?: string[]) {
    this.sockets.push(ws);
  }

  getWebSockets() {
    return this.sockets;
  }
}

describe('TournamentDO (Single-Elimination Coordinator)', () => {
  let ctx: MockDurableObjectState;
  let tournamentDO: TournamentDO;

  beforeEach(() => {
    ctx = new MockDurableObjectState();
    tournamentDO = new TournamentDO(ctx as any, {} as any);
  });

  it('initializes tournament and allows player registration', async () => {
    // 1. Initialize
    const initRes = await tournamentDO.fetch(
      new Request('http://tournament/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'tourney_1', name: 'Spring Cup' }),
      }),
    );
    expect(initRes.status).toBe(200);

    // 2. Join players
    const joinRes1 = await tournamentDO.fetch(
      new Request('http://tournament/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'u1', displayName: 'Alice', rating: 1500 }),
      }),
    );
    expect(joinRes1.status).toBe(200);

    const joinRes2 = await tournamentDO.fetch(
      new Request('http://tournament/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'u2', displayName: 'Bob', rating: 1400 }),
      }),
    );
    expect(joinRes2.status).toBe(200);

    // Check state
    const stateRes = await tournamentDO.fetch(new Request('http://tournament/state'));
    const { tournament } = (await stateRes.json()) as any;
    expect(tournament.name).toBe('Spring Cup');
    expect(tournament.participants.length).toBe(2);
    expect(tournament.status).toBe('registering');
  });

  it('generates clean 4-player bracket with no byes and advances rounds', async () => {
    // Register 4 players
    const players = [
      { userId: 'u1', displayName: 'Player 1', rating: 1800 },
      { userId: 'u2', displayName: 'Player 2', rating: 1700 },
      { userId: 'u3', displayName: 'Player 3', rating: 1600 },
      { userId: 'u4', displayName: 'Player 4', rating: 1500 },
    ];

    for (const p of players) {
      await tournamentDO.fetch(
        new Request('http://tournament/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        }),
      );
    }

    // Start tournament
    const startRes = await tournamentDO.fetch(
      new Request('http://tournament/start', { method: 'POST' }),
    );
    expect(startRes.status).toBe(200);
    const { tournament: tStarted } = (await startRes.json()) as any;

    expect(tStarted.status).toBe('in-progress');
    expect(tStarted.totalRounds).toBe(2);
    expect(tStarted.currentRound).toBe(1);
    expect(tStarted.matches.length).toBe(2);

    // Round 1 matches: Match 1: Seed 1 vs Seed 4; Match 2: Seed 2 vs Seed 3
    const m1 = tStarted.matches[0];
    const m2 = tStarted.matches[1];
    expect(m1.player1.userId).toBe('u1');
    expect(m1.player2.userId).toBe('u4');
    expect(m2.player1.userId).toBe('u2');
    expect(m2.player2.userId).toBe('u3');

    // Win match 1 for Player 1
    await tournamentDO.fetch(
      new Request('http://tournament/match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: m1.id, winnerUserId: 'u1' }),
      }),
    );

    // Win match 2 for Player 2 -> triggers Round 2 Finals creation!
    const winM2Res = await tournamentDO.fetch(
      new Request('http://tournament/match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: m2.id, winnerUserId: 'u2' }),
      }),
    );
    const { tournament: tRound2 } = (await winM2Res.json()) as any;
    expect(tRound2.currentRound).toBe(2);
    expect(tRound2.matches.length).toBe(3); // 2 in round 1 + 1 in round 2

    const finalMatch = tRound2.matches[2];
    expect(finalMatch.round).toBe(2);
    expect(finalMatch.player1.userId).toBe('u1');
    expect(finalMatch.player2.userId).toBe('u2');

    // Conclude Final match with Player 1 winning
    const finalRes = await tournamentDO.fetch(
      new Request('http://tournament/match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: finalMatch.id, winnerUserId: 'u1' }),
      }),
    );
    const { tournament: tFinished } = (await finalRes.json()) as any;
    expect(tFinished.status).toBe('finished');
    expect(tFinished.winner.userId).toBe('u1');
  });

  it('handles 5 players with byes (8-bracket, 3 byes auto-advancing)', async () => {
    const players = [
      { userId: 'u1', displayName: 'P1', rating: 2000 },
      { userId: 'u2', displayName: 'P2', rating: 1900 },
      { userId: 'u3', displayName: 'P3', rating: 1800 },
      { userId: 'u4', displayName: 'P4', rating: 1700 },
      { userId: 'u5', displayName: 'P5', rating: 1600 },
    ];

    for (const p of players) {
      await tournamentDO.fetch(
        new Request('http://tournament/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        }),
      );
    }

    const startRes = await tournamentDO.fetch(
      new Request('http://tournament/start', { method: 'POST' }),
    );
    const { tournament } = (await startRes.json()) as any;

    expect(tournament.totalRounds).toBe(3); // 2^3 = 8
    expect(tournament.matches.length).toBe(4); // 4 first-round matches

    // Byes should be automatically finished
    const byeMatches = tournament.matches.filter((m: any) => m.player2 === null);
    expect(byeMatches.length).toBe(3); // 8 - 5 = 3 byes
    for (const bm of byeMatches) {
      expect(bm.status).toBe('finished');
      expect(bm.winner.userId).toBe(bm.player1.userId);
    }

    // Only 1 match in round 1 was a real game (P4 vs P5)
    const realMatch = tournament.matches.find((m: any) => m.player2 !== null);
    expect(realMatch.status).toBe('scheduled');
    expect(realMatch.player1.userId).toBe('u4');
    expect(realMatch.player2.userId).toBe('u5');

    // Conclude the real match
    const resM = await tournamentDO.fetch(
      new Request('http://tournament/match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: realMatch.id, winnerUserId: 'u4' }),
      }),
    );
    const { tournament: tSemis } = (await resM.json()) as any;

    // All round 1 matches complete -> Round 2 Semifinals spawned!
    expect(tSemis.currentRound).toBe(2);
    const semiMatches = tSemis.matches.filter((m: any) => m.round === 2);
    expect(semiMatches.length).toBe(2);
  });

  it('reconstructs tournament state across DO restart', async () => {
    // 1. Setup tournament in instance 1
    await tournamentDO.fetch(
      new Request('http://tournament/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'tourney_persist', name: 'Persistent Masters' }),
      }),
    );
    await tournamentDO.fetch(
      new Request('http://tournament/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'p_1', displayName: 'Player 1', rating: 1500 }),
      }),
    );

    // 2. Simulate DO eviction and restart by creating new DO with same ctx.storage
    const restartedDO = new TournamentDO(ctx as any, {} as any);
    const stateRes = await restartedDO.fetch(new Request('http://tournament/state'));
    const { tournament } = (await stateRes.json()) as any;

    expect(tournament.id).toBe('tourney_persist');
    expect(tournament.name).toBe('Persistent Masters');
    expect(tournament.participants).toHaveLength(1);
    expect(tournament.participants[0].userId).toBe('p_1');
  });

  it('ensures checkRoundProgression is idempotent and does not duplicate next round matches on repeated calls', async () => {
    // 4 players
    const players = [
      { userId: 'u1', displayName: 'Player 1', rating: 1800 },
      { userId: 'u2', displayName: 'Player 2', rating: 1700 },
      { userId: 'u3', displayName: 'Player 3', rating: 1600 },
      { userId: 'u4', displayName: 'Player 4', rating: 1500 },
    ];
    for (const p of players) {
      await tournamentDO.fetch(
        new Request('http://tournament/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        }),
      );
    }
    await tournamentDO.fetch(new Request('http://tournament/start', { method: 'POST' }));

    const state1 = (await (
      await tournamentDO.fetch(new Request('http://tournament/state'))
    ).json()) as any;
    const r1Matches = state1.tournament.matches.filter((m: any) => m.round === 1);

    // Complete match 1
    await tournamentDO.fetch(
      new Request('http://tournament/match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: r1Matches[0].id,
          winnerUserId: r1Matches[0].player1.userId,
        }),
      }),
    );

    // Complete match 2 -> advances to round 2
    await tournamentDO.fetch(
      new Request('http://tournament/match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: r1Matches[1].id,
          winnerUserId: r1Matches[1].player1.userId,
        }),
      }),
    );

    const state2 = (await (
      await tournamentDO.fetch(new Request('http://tournament/state'))
    ).json()) as any;
    expect(state2.tournament.currentRound).toBe(2);
    const r2MatchesCount = state2.tournament.matches.filter((m: any) => m.round === 2).length;
    expect(r2MatchesCount).toBe(1);

    // Explicitly call checkRoundProgression again to simulate re-execution
    await tournamentDO.checkRoundProgression(state2.tournament);

    // Assert round 2 matches were NOT duplicated
    const r2MatchesAfter = state2.tournament.matches.filter((m: any) => m.round === 2);
    expect(r2MatchesAfter).toHaveLength(1);
    expect(state2.tournament.currentRound).toBe(2);
  });

  it('provisions GameRoomDO upon tournament start and advances on draw tiebreak', async () => {
    const provisionedRooms: Record<string, any> = {};
    const mockGameRoomNamespace = {
      idFromName: vi.fn((name: string) => name),
      get: vi.fn((id: string) => ({
        fetch: vi.fn(async (req: Request) => {
          const body = await req.json();
          provisionedRooms[id] = body;
          return new Response(JSON.stringify({ ok: true, data: body }));
        }),
      })),
    };

    const customDO = new TournamentDO(
      ctx as any,
      {
        GAME_ROOM: mockGameRoomNamespace as any,
      } as any,
    );

    await customDO.fetch(
      new Request('http://tournament/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 't_prog', name: 'Cup' }),
      }),
    );

    // Register 4 players
    for (let i = 1; i <= 4; i++) {
      await customDO.fetch(
        new Request('http://tournament/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: `user_${i}`,
            displayName: `P${i}`,
            rating: 1200 + i * 50,
          }),
        }),
      );
    }

    // Start tournament
    const startRes = await customDO.fetch(
      new Request('http://tournament/start', { method: 'POST' }),
    );
    expect(startRes.status).toBe(200);

    // Verify GameRoomDO was provisioned for round 1 matches!
    expect(mockGameRoomNamespace.idFromName).toHaveBeenCalled();
    expect(mockGameRoomNamespace.get).toHaveBeenCalled();
    expect(Object.keys(provisionedRooms).length).toBe(2);

    // Report draw for match 1: higher seed should automatically advance
    const state1 = (await (
      await customDO.fetch(new Request('http://tournament/state'))
    ).json()) as any;
    const match1 = state1.tournament.matches[0];
    const match2 = state1.tournament.matches[1];

    const drawRes = await customDO.fetch(
      new Request('http://tournament/match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match1.id,
          gameId: match1.gameId,
          result: 'draw',
          winnerUserId: null,
        }),
      }),
    );
    expect(drawRes.status).toBe(200);

    const drawData = (await drawRes.json()) as any;
    expect(drawData.match.winner.userId).toBe(match1.player1.userId); // higher seed advances

    // Complete match 2 with standard win
    await customDO.fetch(
      new Request('http://tournament/match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match2.id,
          winnerUserId: match2.player1.userId,
        }),
      }),
    );

    // Verify round 2 was reached and final match was provisioned in GameRoomDO
    const finalState = (await (
      await customDO.fetch(new Request('http://tournament/state'))
    ).json()) as any;
    expect(finalState.tournament.currentRound).toBe(2);
    expect(Object.keys(provisionedRooms).length).toBe(3); // 2 round-1 matches + 1 round-2 match
  });

  describe('D3.18 — Negative Validation & Idempotency Tests', () => {
    it('rejects foreign matchId with 404', async () => {
      const res = await tournamentDO.fetch(
        new Request('http://tournament/match-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: 'unknown_match_id',
            winnerUserId: 'u1',
          }),
        }),
      );
      expect(res.status).toBe(404);
      const data = (await res.json()) as any;
      expect(data.error).toContain('Match not found');
    });

    it('rejects mismatched gameId for a known match with 400', async () => {
      // Initialize tournament and start with 2 players
      await tournamentDO.fetch(
        new Request('http://tournament/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 't_mismatch', name: 'Cup' }),
        }),
      );
      await tournamentDO.fetch(
        new Request('http://tournament/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'u1', displayName: 'P1', rating: 1200 }),
        }),
      );
      await tournamentDO.fetch(
        new Request('http://tournament/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'u2', displayName: 'P2', rating: 1300 }),
        }),
      );
      await tournamentDO.fetch(new Request('http://tournament/start', { method: 'POST' }));

      const state = (await (
        await tournamentDO.fetch(new Request('http://tournament/state'))
      ).json()) as any;
      const match = state.tournament.matches[0];

      // Submit result with correct matchId but mismatched foreign gameId
      const res = await tournamentDO.fetch(
        new Request('http://tournament/match-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: match.id,
            gameId: 'foreign_game_id_123',
            winnerUserId: 'u1',
          }),
        }),
      );
      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain('Mismatched gameId');
    });

    it('rejects winner who is not a participant in the match with 400', async () => {
      await tournamentDO.fetch(
        new Request('http://tournament/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 't_winner_val', name: 'Cup' }),
        }),
      );
      await tournamentDO.fetch(
        new Request('http://tournament/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'u1', displayName: 'P1', rating: 1200 }),
        }),
      );
      await tournamentDO.fetch(
        new Request('http://tournament/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'u2', displayName: 'P2', rating: 1300 }),
        }),
      );
      await tournamentDO.fetch(new Request('http://tournament/start', { method: 'POST' }));

      const state = (await (
        await tournamentDO.fetch(new Request('http://tournament/state'))
      ).json()) as any;
      const match = state.tournament.matches[0];

      const res = await tournamentDO.fetch(
        new Request('http://tournament/match-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: match.id,
            gameId: match.gameId,
            winnerUserId: 'third_party_spectator',
          }),
        }),
      );
      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain('Winner must be one of the match participants');
    });

    it('idempotently handles duplicate result submissions without altering winner', async () => {
      await tournamentDO.fetch(
        new Request('http://tournament/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 't_idempotent', name: 'Cup' }),
        }),
      );
      await tournamentDO.fetch(
        new Request('http://tournament/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'u1', displayName: 'P1', rating: 1200 }),
        }),
      );
      await tournamentDO.fetch(
        new Request('http://tournament/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'u2', displayName: 'P2', rating: 1300 }),
        }),
      );
      await tournamentDO.fetch(new Request('http://tournament/start', { method: 'POST' }));

      const state = (await (
        await tournamentDO.fetch(new Request('http://tournament/state'))
      ).json()) as any;
      const match = state.tournament.matches[0];

      // First submission: u1 wins
      const res1 = await tournamentDO.fetch(
        new Request('http://tournament/match-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: match.id,
            gameId: match.gameId,
            winnerUserId: 'u1',
          }),
        }),
      );
      expect(res1.status).toBe(200);

      // Second duplicate submission: attempts to claim u2 won
      const res2 = await tournamentDO.fetch(
        new Request('http://tournament/match-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: match.id,
            gameId: match.gameId,
            winnerUserId: 'u2',
          }),
        }),
      );
      expect(res2.status).toBe(200);
      const body2 = (await res2.json()) as any;
      // Winner must remain u1
      expect(body2.match.winner.userId).toBe('u1');
    });
  });
});
