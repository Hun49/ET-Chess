import {
  createDefaultGameSession,
  type GameSession,
  type GameSessionMode,
  type OpponentInfo,
} from '@et-chess/config';

export interface MockOpponent extends OpponentInfo {
  id: string;
  country: string;
  title?: string;
  rating: number;
}

export const MOCK_OPPONENTS: MockOpponent[] = [
  { id: 'usr-1', displayName: 'Abebe Bikila', rating: 1540, country: 'ET', title: 'CM' },
  { id: 'usr-2', displayName: 'Desta Wolde', rating: 1485, country: 'ET' },
  { id: 'usr-3', displayName: 'Selamawit T.', rating: 1620, country: 'ET', title: 'WFM' },
  { id: 'usr-4', displayName: 'Tewodros Kassahun', rating: 1390, country: 'ET' },
  { id: 'usr-5', displayName: 'Elena Rostova', rating: 1510, country: 'SE' },
  { id: 'usr-6', displayName: 'Marcus Vance', rating: 1460, country: 'US' },
  { id: 'usr-7', displayName: 'Kenji Sato', rating: 1580, country: 'JP' },
  { id: 'usr-8', displayName: 'Haile G.', rating: 1720, country: 'ET', title: 'FM' },
];

/**
 * Checks if mock mode is active (defaults to true in dev or when API is unreachable)
 */
export const USE_MOCK_DATA = true;

/**
 * Pick a realistic opponent near the player's rating
 */
export function getMockOpponent(targetRating = 1500): MockOpponent {
  const sorted = [...MOCK_OPPONENTS].sort(
    (a, b) => Math.abs(a.rating - targetRating) - Math.abs(b.rating - targetRating),
  );
  return (
    sorted[0] ?? {
      id: 'usr-default',
      displayName: 'Abebe B.',
      rating: 1480,
      country: 'ET',
    }
  );
}

/**
 * Simulates online matchmaking queue search with realistic progression states
 */
export async function simulateMatchmaking(options?: {
  targetRating?: number;
  delayMs?: number;
  signal?: AbortSignal;
}): Promise<MockOpponent> {
  const delay = options?.delayMs ?? 1200;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(getMockOpponent(options?.targetRating ?? 1500));
    }, delay);

    if (options?.signal) {
      options.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Matchmaking canceled', 'AbortError'));
      });
    }
  });
}

/**
 * Calculates Elo rating change
 */
export function calculateRatingDelta(
  playerRating: number,
  opponentRating: number,
  outcome: 'white' | 'black' | 'draw',
  playerColor: 'white' | 'black' = 'white',
  kFactor = 32,
): number {
  const expected = 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
  let score = 0.5;
  if (outcome === playerColor) {
    score = 1;
  } else if (outcome !== 'draw') {
    score = 0;
  }
  return Math.round(kFactor * (score - expected));
}

/**
 * Create a mock game session configured for immediate test/play
 */
export function createMockSession(
  mode: GameSessionMode,
  options?: {
    minutes?: number;
    increment?: number;
    targetRating?: number;
    opponentName?: string;
  },
): GameSession {
  const opponent: OpponentInfo =
    mode === 'online'
      ? getMockOpponent(options?.targetRating)
      : mode === 'friend'
        ? { displayName: options?.opponentName ?? 'Friend (Challenger)', rating: 1450 }
        : mode === 'computer'
          ? { displayName: 'Stockfish Level 3', rating: 1500 }
          : { displayName: 'Player 2', rating: undefined };

  return createDefaultGameSession({
    mode,
    minutes: options?.minutes ?? 10,
    increment: options?.increment ?? 0,
    opponent,
  });
}
