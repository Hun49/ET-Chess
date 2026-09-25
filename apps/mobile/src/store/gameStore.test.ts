import type { EngineBridge } from '@et-chess/bot-engine';
import { createGame } from '@et-chess/chess-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEngineBridge, setEngineBridge, useGameStore } from './gameStore';

describe('apps/mobile useGameStore with persistence', () => {
  beforeEach(async () => {
    setEngineBridge(null);
    await AsyncStorage.clear();
    useGameStore.setState({
      game: createGame(),
      botDifficulty: 'intermediate',
      isBotThinking: false,
      gameMode: 'bot',
      resignedColor: null,
    });
  });

  describe('initial state', () => {
    it('initializes with default starting game, white turn, intermediate difficulty, and not thinking', () => {
      const state = useGameStore.getState();

      expect(state.game).toBeDefined();
      expect(state.game.turn).toBe('white');
      expect(state.game.status).toBe('ongoing');
      expect(state.game.moveHistory).toHaveLength(0);
      expect(state.botDifficulty).toBe('intermediate');
      expect(state.isBotThinking).toBe(false);
      expect(state.gameMode).toBe('bot');
      expect(state.resignedColor).toBeNull();
    });
  });

  describe('makeMove', () => {
    it('applies a legal move, switches turn, and updates moveHistory', () => {
      const store = useGameStore.getState();
      const initialFen = store.game.fen;

      const success = store.makeMove({ from: 'e2', to: 'e4' });

      expect(success).toBe(true);
      const updated = useGameStore.getState();
      expect(updated.game.turn).toBe('black');
      expect(updated.game.moveHistory).toEqual([{ from: 'e2', to: 'e4' }]);
      expect(updated.game.fen).not.toBe(initialFen);
      expect(updated.game.status).toBe('ongoing');
    });

    it('returns false and does not corrupt state on an illegal move', () => {
      const store = useGameStore.getState();
      const initialFen = store.game.fen;
      const initialTurn = store.game.turn;

      const success = store.makeMove({ from: 'e2', to: 'e5' });

      expect(success).toBe(false);
      const updated = useGameStore.getState();
      expect(updated.game.fen).toBe(initialFen);
      expect(updated.game.turn).toBe(initialTurn);
      expect(updated.game.moveHistory).toHaveLength(0);
    });

    it('returns false and does not corrupt state when moving out of turn', () => {
      const store = useGameStore.getState();
      const initialFen = store.game.fen;

      const success = store.makeMove({ from: 'e7', to: 'e5' });

      expect(success).toBe(false);
      const updated = useGameStore.getState();
      expect(updated.game.fen).toBe(initialFen);
      expect(updated.game.turn).toBe('white');
      expect(updated.game.moveHistory).toHaveLength(0);
    });

    it('prevents moves once game is resigned or drawn', () => {
      const store = useGameStore.getState();
      store.resign('white');
      expect(useGameStore.getState().makeMove({ from: 'e2', to: 'e4' })).toBe(false);

      useGameStore.setState({ resignedColor: null });
      store.agreeDraw();
      expect(useGameStore.getState().makeMove({ from: 'e2', to: 'e4' })).toBe(false);
    });
  });

  describe('resetGame', () => {
    it('restores initial game state, resets isBotThinking and clears resignedColor', () => {
      const store = useGameStore.getState();
      store.makeMove({ from: 'e2', to: 'e4' });
      useGameStore.setState({ isBotThinking: true, resignedColor: 'white' });

      store.resetGame();

      const resetState = useGameStore.getState();
      expect(resetState.game.turn).toBe('white');
      expect(resetState.game.moveHistory).toHaveLength(0);
      expect(resetState.game.status).toBe('ongoing');
      expect(resetState.isBotThinking).toBe(false);
      expect(resetState.resignedColor).toBeNull();
    });
  });

  describe('setBotDifficulty', () => {
    it('updates the bot difficulty level across all tiers', () => {
      const store = useGameStore.getState();
      expect(store.botDifficulty).toBe('intermediate');

      store.setBotDifficulty('beginner');
      expect(useGameStore.getState().botDifficulty).toBe('beginner');

      store.setBotDifficulty('advanced');
      expect(useGameStore.getState().botDifficulty).toBe('advanced');

      store.setBotDifficulty('full-strength');
      expect(useGameStore.getState().botDifficulty).toBe('full-strength');
    });
  });

  describe('setGameMode', () => {
    it('updates the game mode between bot and local', () => {
      const store = useGameStore.getState();
      expect(store.gameMode).toBe('bot');

      store.setGameMode('local');
      expect(useGameStore.getState().gameMode).toBe('local');

      store.setGameMode('bot');
      expect(useGameStore.getState().gameMode).toBe('bot');
    });
  });

  describe('agreeDraw', () => {
    it('sets game status to draw and resets isBotThinking', () => {
      useGameStore.setState({ isBotThinking: true });
      const store = useGameStore.getState();

      store.agreeDraw();

      const updated = useGameStore.getState();
      expect(updated.game.status).toBe('draw');
      expect(updated.isBotThinking).toBe(false);
    });
  });

  describe('resign', () => {
    it('marks resigning color as white by default in bot mode and stops thinking', () => {
      useGameStore.setState({ isBotThinking: true, gameMode: 'bot' });
      const store = useGameStore.getState();

      store.resign();

      const updated = useGameStore.getState();
      expect(updated.resignedColor).toBe('white');
      expect(updated.isBotThinking).toBe(false);
    });

    it('marks current turn as resigning color in local mode or allows explicit color', () => {
      useGameStore.setState({ gameMode: 'local' });
      useGameStore.getState().makeMove({ from: 'e2', to: 'e4' }); // turn is black
      useGameStore.getState().resign();

      expect(useGameStore.getState().resignedColor).toBe('black');

      useGameStore.getState().resign('white');
      expect(useGameStore.getState().resignedColor).toBe('white');
    });
  });

  describe('setEngineBridge and requestBotMove', () => {
    it('manages active engine bridge reference', () => {
      const mockBridge: EngineBridge = {
        postMessage: vi.fn(),
        onMessage: vi.fn(),
        removeMessageListener: vi.fn(),
        terminate: vi.fn(),
      };

      setEngineBridge(mockBridge);
      expect(getEngineBridge()).toBe(mockBridge);

      setEngineBridge(null);
      expect(getEngineBridge()).toBeNull();
    });

    it('resolves gracefully when no engine bridge is active', async () => {
      const store = useGameStore.getState();
      expect(store.isBotThinking).toBe(false);

      await store.requestBotMove();

      expect(useGameStore.getState().isBotThinking).toBe(false);
      expect(useGameStore.getState().game.moveHistory).toHaveLength(0);
    });

    it('queries active engine bridge and applies best move', async () => {
      useGameStore.getState().makeMove({ from: 'e2', to: 'e4' });
      expect(useGameStore.getState().game.turn).toBe('black');

      const listeners = new Set<(msg: string) => void>();
      const mockBridge: EngineBridge = {
        postMessage: vi.fn((cmd: string) => {
          if (cmd === 'uci') {
            for (const l of listeners) l('uciok');
          } else if (cmd === 'isready') {
            for (const l of listeners) l('readyok');
          } else if (cmd.startsWith('go')) {
            for (const l of listeners) l('bestmove e7e5');
          }
        }),
        onMessage: vi.fn((listener: (msg: string) => void) => {
          listeners.add(listener);
        }),
        removeMessageListener: vi.fn((listener: (msg: string) => void) => {
          listeners.delete(listener);
        }),
        terminate: vi.fn(() => {
          listeners.clear();
        }),
      };

      setEngineBridge(mockBridge);

      await useGameStore.getState().requestBotMove();

      const stateAfterBotMove = useGameStore.getState();
      expect(stateAfterBotMove.isBotThinking).toBe(false);
      expect(stateAfterBotMove.game.turn).toBe('white');
      expect(stateAfterBotMove.game.moveHistory).toHaveLength(2);
      expect(stateAfterBotMove.game.moveHistory[1]).toEqual({ from: 'e7', to: 'e5' });
    });
  });

  describe('persistence configuration', () => {
    it('uses "et-chess-game-state" storage key and partialize excludes isBotThinking', () => {
      const persistOptions = useGameStore.persist.getOptions();

      expect(persistOptions.name).toBe('et-chess-game-state');
      expect(persistOptions.partialize).toBeDefined();

      const fullState = useGameStore.getState();
      const partialized = persistOptions.partialize?.({
        ...fullState,
        isBotThinking: true,
      }) as Record<string, unknown>;

      expect(partialized).toBeDefined();
      expect(partialized.isBotThinking).toBeUndefined();
      expect(partialized.game).toBeDefined();
      expect(partialized.botDifficulty).toBe('intermediate');
      expect(partialized.gameMode).toBe('bot');
    });

    it('persists game state changes to AsyncStorage', async () => {
      useGameStore.getState().makeMove({ from: 'e2', to: 'e4' });
      await new Promise((r) => setTimeout(r, 50));
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'et-chess-game-state',
        expect.stringContaining('"turn":"black"'),
      );
    });
  });
});
