import type { GameResult, GameSessionMode } from '@et-chess/config';
import type { Move } from '@et-chess/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompletedGameRecord {
  id: string;
  mode: GameSessionMode;
  date: string; // ISO string
  timeControl: string;
  opponent: string;
  opponentRating?: number;
  playerColor: 'white' | 'black';
  result: GameResult;
  moveCount: number;
  sanMoves: string[];
  moveHistory: Move[];
}

export interface HistoryStoreState {
  games: CompletedGameRecord[];
  addGame: (game: Omit<CompletedGameRecord, 'id' | 'date'>) => void;
  clearHistory: () => void;
  getStats: () => {
    total: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  };
}

export const useHistoryStore = create<HistoryStoreState>()(
  persist(
    (set, get) => ({
      games: [],
      addGame: (game) => {
        const newRecord: CompletedGameRecord = {
          ...game,
          id: `game-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: new Date().toISOString(),
        };
        set((state) => ({
          games: [newRecord, ...state.games],
        }));
      },
      clearHistory: () => set({ games: [] }),
      getStats: () => {
        const games = get().games;
        const total = games.length;
        if (total === 0) {
          return { total: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
        }
        let wins = 0;
        let losses = 0;
        let draws = 0;

        for (const g of games) {
          if (g.result.outcome === 'draw') {
            draws++;
          } else if (g.result.outcome === g.playerColor) {
            wins++;
          } else {
            losses++;
          }
        }

        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
        return { total, wins, losses, draws, winRate };
      },
    }),
    {
      name: 'et-chess-game-history',
    },
  ),
);
