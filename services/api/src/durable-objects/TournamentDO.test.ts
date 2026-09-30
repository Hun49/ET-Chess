import { beforeEach, describe, expect, it } from 'vitest';
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
});
