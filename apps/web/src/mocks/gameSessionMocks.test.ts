import { describe, expect, it } from 'vitest';
import {
  calculateRatingDelta,
  createMockSession,
  getMockOpponent,
  MOCK_OPPONENTS,
  simulateMatchmaking,
} from './gameSessionMocks';

describe('Game Session Mocks & Rating Boundary (Web)', () => {
  it('provides a pool of mock opponents', () => {
    expect(MOCK_OPPONENTS.length).toBeGreaterThan(0);
    for (const opp of MOCK_OPPONENTS) {
      expect(opp.displayName).toBeDefined();
      expect(opp.rating).toBeGreaterThan(1000);
      expect(opp.country).toBeDefined();
    }
  });

  it('selects opponent closest to target rating', () => {
    const opp1700 = getMockOpponent(1700);
    expect(opp1700.displayName).toBe('Haile G.');

    const opp1400 = getMockOpponent(1400);
    expect(opp1400.displayName).toBe('Tewodros Kassahun');
  });

  it('simulates matchmaking resolution after delay', async () => {
    const opp = await simulateMatchmaking({ delayMs: 10, targetRating: 1500 });
    expect(opp.displayName).toBeDefined();
    expect(opp.rating).toBeDefined();
  });

  it('calculates expected Elo deltas for win, loss, draw', () => {
    const winDelta = calculateRatingDelta(1500, 1500, 'white', 'white');
    expect(winDelta).toBe(16); // +16 for win against equal rating

    const lossDelta = calculateRatingDelta(1500, 1500, 'black', 'white');
    expect(lossDelta).toBe(-16); // -16 for loss

    const drawDelta = calculateRatingDelta(1500, 1500, 'draw', 'white');
    expect(drawDelta).toBe(0); // 0 for draw against equal rating
  });

  it('creates default game session for each of the 4 modes', () => {
    const online = createMockSession('online', { minutes: 5 });
    expect(online.mode).toBe('online');
    expect(online.opponent).not.toBeNull();
    expect(online.timeControl.minutes).toBe(5);

    const friend = createMockSession('friend', { minutes: 3, increment: 2 });
    expect(friend.mode).toBe('friend');
    expect(friend.allowedActions.timeGift).toBe(true);

    const computer = createMockSession('computer');
    expect(computer.mode).toBe('computer');
    expect(computer.opponent?.displayName).toContain('Stockfish');

    const local = createMockSession('local');
    expect(local.mode).toBe('local');
    expect(local.allowedActions.takeback).toBe(true);
  });
});
