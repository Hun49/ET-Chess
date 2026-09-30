import { describe, expect, it } from 'vitest';
import { calculateElo } from './elo';

describe('calculateElo (Standard FIDE Elo Rating Calculator)', () => {
  it('calculates symmetrical deltas for equally rated players on a win', () => {
    // Two 1500 players, white wins
    const result = calculateElo(1500, 1500, 'white');

    expect(result.expectedWhite).toBeCloseTo(0.5, 4);
    expect(result.expectedBlack).toBeCloseTo(0.5, 4);
    expect(result.deltaWhite).toBe(16); // 32 * (1 - 0.5) = 16
    expect(result.deltaBlack).toBe(-16); // 32 * (0 - 0.5) = -16
    expect(result.newRatingWhite).toBe(1516);
    expect(result.newRatingBlack).toBe(1484);
  });

  it('calculates zero delta for equally rated players on a draw', () => {
    const result = calculateElo(1600, 1600, 'draw');

    expect(result.deltaWhite).toBe(0);
    expect(result.deltaBlack).toBe(0);
    expect(result.newRatingWhite).toBe(1600);
    expect(result.newRatingBlack).toBe(1600);
  });

  it('awards smaller delta when a heavy favorite wins as expected', () => {
    // 2000 vs 1200, favorite wins
    const result = calculateElo(2000, 1200, 'white');

    expect(result.expectedWhite).toBeGreaterThan(0.95);
    expect(result.deltaWhite).toBeLessThanOrEqual(3);
    expect(result.deltaBlack).toBeGreaterThanOrEqual(-3);
  });

  it('awards large delta when an underdog upsets a higher-rated opponent', () => {
    // Underdog (1200) beats 2000 rated player
    const result = calculateElo(1200, 2000, 'white');

    expect(result.expectedWhite).toBeLessThan(0.05);
    expect(result.deltaWhite).toBeGreaterThanOrEqual(29);
    expect(result.deltaBlack).toBeLessThanOrEqual(-29);
  });

  it('enforces minRating floor when losses would drop rating below threshold', () => {
    // Player with 105 rating loses to 100 player (delta would be -16 without floor)
    const result = calculateElo(105, 100, 'black', { minRating: 100 });

    expect(result.deltaWhite).toBe(-16);
    expect(result.newRatingWhite).toBe(100);
  });

  it('supports custom K-factor', () => {
    const resultK16 = calculateElo(1500, 1500, 'white', { kFactor: 16 });
    expect(resultK16.deltaWhite).toBe(8);
    expect(resultK16.deltaBlack).toBe(-8);

    const resultK40 = calculateElo(1500, 1500, 'white', { kFactor: 40 });
    expect(resultK40.deltaWhite).toBe(20);
    expect(resultK40.deltaBlack).toBe(-20);
  });
});
