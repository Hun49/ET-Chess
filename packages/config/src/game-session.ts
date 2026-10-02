export type PlayerColor = 'white' | 'black';
export type GameStatus = 'ongoing' | 'check' | 'checkmate' | 'stalemate' | 'draw';

export interface Move {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface GameState {
  fen: string;
  turn: PlayerColor;
  status: GameStatus;
  moveHistory: Move[];
}

export type GameSessionMode = 'online' | 'friend' | 'computer' | 'local';
export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'offline';

export interface ClockState {
  white: number; // in milliseconds
  black: number; // in milliseconds
  activeColor: PlayerColor | null;
}

export interface OpponentInfo {
  displayName: string;
  rating?: number;
  avatarUrl?: string;
}

export interface AllowedActions {
  resign: boolean;
  drawOffer: boolean;
  takeback: boolean;
  timeGift: boolean;
}

export interface GameResult {
  outcome: 'white' | 'black' | 'draw';
  reason: string; // e.g. "Checkmate", "Resignation", "Time out", "Draw agreed", "Stalemate"
  ratingChange?: number; // e.g. +12, -10, or undefined for unrated
}

/**
 * Shared Client Game-Session Model per §6
 * All four play modes (Online, Friend, Computer, Local) funnel into this contract.
 */
export interface GameSession {
  game: GameState;
  mode: GameSessionMode;
  connection: ConnectionStatus;
  clock: ClockState;
  opponent: OpponentInfo | null;
  allowedActions: AllowedActions;
  result: GameResult | null;
  timeControl: {
    minutes: number;
    increment: number;
    name: string; // e.g. "10 min", "3 | 2 Blitz"
    category: 'bullet' | 'blitz' | 'rapid';
  };
}

export interface TimeControlOption {
  id: string;
  category: 'bullet' | 'blitz' | 'rapid';
  minutes: number;
  increment: number;
  label: string; // e.g. "3 min" or "3 | 2"
  description: string; // e.g. "Fast & tactical"
}

export const TIME_CONTROL_PRESETS: TimeControlOption[] = [
  // Bullet
  {
    id: 'bullet_1_0',
    category: 'bullet',
    minutes: 1,
    increment: 0,
    label: '1 min',
    description: 'Fast bullet',
  },
  {
    id: 'bullet_2_0',
    category: 'bullet',
    minutes: 2,
    increment: 0,
    label: '2 min',
    description: 'Bullet standard',
  },
  // Blitz
  {
    id: 'blitz_3_0',
    category: 'blitz',
    minutes: 3,
    increment: 0,
    label: '3 min',
    description: 'Standard blitz',
  },
  {
    id: 'blitz_3_2',
    category: 'blitz',
    minutes: 3,
    increment: 2,
    label: '3 | 2',
    description: 'Blitz with increment',
  },
  {
    id: 'blitz_5_0',
    category: 'blitz',
    minutes: 5,
    increment: 0,
    label: '5 min',
    description: 'Deep blitz',
  },
  {
    id: 'blitz_5_3',
    category: 'blitz',
    minutes: 5,
    increment: 3,
    label: '5 | 3',
    description: 'Classical blitz',
  },
  // Rapid
  {
    id: 'rapid_10_0',
    category: 'rapid',
    minutes: 10,
    increment: 0,
    label: '10 min',
    description: 'Standard rapid',
  },
  {
    id: 'rapid_10_5',
    category: 'rapid',
    minutes: 10,
    increment: 5,
    label: '10 | 5',
    description: 'Rapid with increment',
  },
  {
    id: 'rapid_15_10',
    category: 'rapid',
    minutes: 15,
    increment: 10,
    label: '15 | 10',
    description: 'Long rapid',
  },
];

export function getCategoryForTimeControl(minutes: number): 'bullet' | 'blitz' | 'rapid' {
  if (minutes < 3) return 'bullet';
  if (minutes < 10) return 'blitz';
  return 'rapid';
}

export function formatClockTime(ms: number): string {
  if (ms <= 0) return '0:00';

  if (ms < 10000) {
    const seconds = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `0:0${seconds}.${tenths}`;
  }

  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const padSec = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}:${padSec}`;
}

export function createDefaultGameSession(params: {
  mode: GameSessionMode;
  minutes?: number;
  increment?: number;
  opponent?: OpponentInfo | null;
  fen?: string;
  allowedActions?: Partial<AllowedActions>;
}): GameSession {
  const minutes = params.minutes ?? 10;
  const increment = params.increment ?? 0;
  const category = getCategoryForTimeControl(minutes);
  const timeMs = minutes * 60 * 1000;

  return {
    game: {
      fen: params.fen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      turn: 'white',
      status: 'ongoing',
      moveHistory: [],
    },
    mode: params.mode,
    connection: params.mode === 'online' ? 'connected' : 'offline',
    clock: {
      white: timeMs,
      black: timeMs,
      activeColor: 'white',
    },
    opponent:
      params.opponent ??
      (params.mode === 'computer' ? { displayName: 'Stockfish 16', rating: 1500 } : null),
    allowedActions: {
      resign: true,
      drawOffer: params.mode !== 'computer' && params.mode !== 'local',
      takeback: params.mode === 'local' || params.mode === 'computer',
      timeGift: params.mode === 'friend',
      ...params.allowedActions,
    },
    result: null,
    timeControl: {
      minutes,
      increment,
      name: increment > 0 ? `${minutes} | ${increment}` : `${minutes} min`,
      category,
    },
  };
}
