import type { BotDifficulty } from '@et-chess/types';

export type GameMode = 'online' | 'friend' | 'computer' | 'local' | 'bot';

export interface GameRouteParams {
  mode: GameMode;
  minutes?: number;
  increment?: number;
  opponent?: string;
  rating?: number;
}

export function parseMobileGameParams(params?: {
  mode?: unknown;
  minutes?: unknown;
  increment?: unknown;
  opponent?: unknown;
  rating?: unknown;
}): GameRouteParams {
  let mode: GameMode = 'bot';
  if (
    params?.mode === 'local' ||
    params?.mode === 'online' ||
    params?.mode === 'friend' ||
    params?.mode === 'computer' ||
    params?.mode === 'bot'
  ) {
    mode = params.mode;
  }
  const minutes = typeof params?.minutes === 'string' ? parseInt(params.minutes, 10) : undefined;
  const increment =
    typeof params?.increment === 'string' ? parseInt(params.increment, 10) : undefined;
  const opponent = typeof params?.opponent === 'string' ? params.opponent : undefined;
  const rating = typeof params?.rating === 'string' ? parseInt(params.rating, 10) : undefined;

  return { mode, minutes, increment, opponent, rating };
}

export interface DifficultyOption {
  id: BotDifficulty;
  title: string;
  subtitle: string;
  description: string;
}

export const DIFFICULTY_OPTIONS: readonly DifficultyOption[] = [
  {
    id: 'beginner',
    title: 'Beginner',
    subtitle: 'Depth 5 • Skill 1-2',
    description: 'Casual play with occasional tactical mistakes, perfect for learning.',
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    subtitle: 'Depth 10 • Skill 8-10',
    description: 'Solid positional play with disciplined tactical defenses.',
  },
  {
    id: 'advanced',
    title: 'Advanced',
    subtitle: '1000ms movetime • Skill 15',
    description: 'Calculated tactical precision and opening knowledge.',
  },
  {
    id: 'full-strength',
    title: 'Full Strength',
    subtitle: '3000ms movetime • Skill 20',
    description: 'Uncapped Stockfish engine strength. Relentless tactical punishment.',
  },
] as const;
