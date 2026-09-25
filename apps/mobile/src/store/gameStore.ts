import { createBot, type EngineBridge } from '@et-chess/bot-engine';
import { applyMove, createGame } from '@et-chess/chess-core';
import type { BotDifficulty, GameState, Move, PlayerColor } from '@et-chess/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface GameStoreState {
  game: GameState;
  botDifficulty: BotDifficulty;
  isBotThinking: boolean;
  gameMode: 'bot' | 'local';
  resignedColor: PlayerColor | null;
  makeMove: (move: Move) => boolean;
  requestBotMove: () => Promise<void>;
  resetGame: () => void;
  setBotDifficulty: (difficulty: BotDifficulty) => void;
  setGameMode: (mode: 'bot' | 'local') => void;
  agreeDraw: () => void;
  resign: (color?: PlayerColor) => void;
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

export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get, api) => {
      Object.defineProperty(api, 'getInitialState', {
        configurable: true,
        enumerable: true,
        get: () => () => get(),
        set: () => {},
      });
      return {
        game: createGame(),
        botDifficulty: 'intermediate',
        isBotThinking: false,
        gameMode: 'bot',
        resignedColor: null,

        makeMove: (move: Move): boolean => {
          const state = get();
          if (state.resignedColor !== null || state.game.status === 'draw') {
            return false;
          }
          try {
            const nextGame = applyMove(state.game, move);
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
            resignedColor: null,
          });
        },

        setBotDifficulty: (difficulty: BotDifficulty): void => {
          set({ botDifficulty: difficulty });
        },

        setGameMode: (mode: 'bot' | 'local'): void => {
          set({ gameMode: mode });
        },

        agreeDraw: (): void => {
          if (currentBotHandle) {
            try {
              currentBotHandle.bot.stop();
            } catch {
              // Ignore stop errors on draw agreement
            }
          }
          set((state) => ({
            isBotThinking: false,
            game: {
              ...state.game,
              status: 'draw',
            },
          }));
        },

        resign: (color?: PlayerColor): void => {
          if (currentBotHandle) {
            try {
              currentBotHandle.bot.stop();
            } catch {
              // Ignore stop errors on resign
            }
          }
          set((state) => ({
            isBotThinking: false,
            resignedColor: color ?? (state.gameMode === 'bot' ? 'white' : state.game.turn),
          }));
        },
      };
    },
    {
      name: 'et-chess-game-state',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        game: state.game,
        botDifficulty: state.botDifficulty,
        gameMode: state.gameMode,
        resignedColor: state.resignedColor,
      }),
    },
  ),
);

useGameStore.getInitialState = () => useGameStore.getState();

export default useGameStore;
