export type MatchGameResult = 'white' | 'black' | 'draw';

export interface EloOptions {
  kFactor?: number;
  minRating?: number;
}

export interface EloDeltaResult {
  deltaWhite: number;
  deltaBlack: number;
  newRatingWhite: number;
  newRatingBlack: number;
  expectedWhite: number;
  expectedBlack: number;
}

/**
 * Calculates standard FIDE Elo rating adjustments for a completed match.
 *
 * @param ratingWhite Current rating of the white player
 * @param ratingBlack Current rating of the black player
 * @param result Match outcome: 'white' (white win), 'black' (black win), or 'draw'
 * @param options Optional K-factor (defaults to 32) and minRating (defaults to 100)
 */
export function calculateElo(
  ratingWhite: number,
  ratingBlack: number,
  result: MatchGameResult,
  options: EloOptions = {},
): EloDeltaResult {
  const k = options.kFactor ?? 32;
  const minRating = options.minRating ?? 100;

  // Expected scores: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
  const expectedWhite = 1 / (1 + 10 ** ((ratingBlack - ratingWhite) / 400));
  const expectedBlack = 1 / (1 + 10 ** ((ratingWhite - ratingBlack) / 400));

  let scoreWhite: number;
  let scoreBlack: number;

  if (result === 'white') {
    scoreWhite = 1;
    scoreBlack = 0;
  } else if (result === 'black') {
    scoreWhite = 0;
    scoreBlack = 1;
  } else {
    scoreWhite = 0.5;
    scoreBlack = 0.5;
  }

  const deltaWhite = Math.round(k * (scoreWhite - expectedWhite));
  const deltaBlack = Math.round(k * (scoreBlack - expectedBlack));

  const newRatingWhite = Math.max(minRating, ratingWhite + deltaWhite);
  const newRatingBlack = Math.max(minRating, ratingBlack + deltaBlack);

  return {
    deltaWhite,
    deltaBlack,
    newRatingWhite,
    newRatingBlack,
    expectedWhite,
    expectedBlack,
  };
}
