import { createBot, type EngineBridge } from '@et-chess/bot-engine';
import { applyMove, createGame } from '@et-chess/chess-core';
import type { BotDifficulty, GameState, Move } from '@et-chess/types';
import { create } from 'zustand';

export interface GameStoreState {
  game: GameState;
  botDifficulty: BotDifficulty;
  isBotThinking: boolean;
  gameMode: 'bot' | 'local';
  makeMove: (move: Move) => boolean;
  requestBotMove: () => Promise<void>;
  resetGame: () => void;
  setBotDifficulty: (difficulty: BotDifficulty) => void;
  setGameMode: (mode: 'bot' | 'local') => void;
}

let activeBridge: EngineBridge | null = null;
let currentBotHandle: { bot: ReturnType<typeof createBot>; difficulty: BotDifficulty } | null =
  null;

export function setEngineBridge(bridge: EngineBridge | null): void {
  if (currentBotHandle) {
    currentBotHandle.bot.dispose();
    currentBotHandle = null;
  }
  activeBridge = bridge;
}

export function getEngineBridge(): EngineBridge | null {
  return activeBridge;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  game: createGame(),
  botDifficulty: 'intermediate',
  isBotThinking: false,
  gameMode: 'bot',

  makeMove: (move: Move): boolean => {
    try {
      const nextGame = applyMove(get().game, move);
      set({ game: nextGame });
      return true;
    } catch {
      return false;
    }
  },

  requestBotMove: async (): Promise<void> => {
    set({ isBotThinking: true });
    try {
      if (activeBridge) {
        const { game, botDifficulty, makeMove } = get();
        if (!currentBotHandle || currentBotHandle.difficulty !== botDifficulty) {
          if (currentBotHandle) {
            currentBotHandle.bot.dispose();
          }
          currentBotHandle = {
            bot: createBot(botDifficulty, activeBridge),
            difficulty: botDifficulty,
          };
        }
        const bestMove = await currentBotHandle.bot.getBestMove(game.fen);
        makeMove(bestMove);
      }
    } catch {
      // Gracefully resolve if engine bridge errors or search is stopped
    } finally {
      set({ isBotThinking: false });
    }
  },

  resetGame: (): void => {
    if (currentBotHandle) {
      try {
        currentBotHandle.bot.stop();
      } catch {
        // Ignore stop errors on reset
      }
    }
    set({
      game: createGame(),
      isBotThinking: false,
    });
  },

  setBotDifficulty: (difficulty: BotDifficulty): void => {
    set({ botDifficulty: difficulty });
  },

  setGameMode: (mode: 'bot' | 'local'): void => {
    set({ gameMode: mode });
  },
}));

export default useGameStore;
