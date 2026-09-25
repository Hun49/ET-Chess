import type { BotDifficulty } from '@et-chess/types';

export type GameMode = 'bot' | 'local';

export interface GameRouteParams {
  mode: GameMode;
}

export function parseMobileGameParams(params?: { mode?: unknown }): GameRouteParams {
  if (params?.mode === 'local') {
    return { mode: 'local' };
  }
  return { mode: 'bot' };
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
