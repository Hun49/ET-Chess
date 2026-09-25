import type { EngineBridge } from '@et-chess/bot-engine';
import { createGame } from '@et-chess/chess-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setEngineBridge, useGameStore } from './gameStore';

describe('useGameStore', () => {
  beforeEach(() => {
    setEngineBridge(null);
    useGameStore.setState({
      game: createGame(),
      botDifficulty: 'intermediate',
      isBotThinking: false,
      gameMode: 'bot',
    });
  });

  describe('initial state', () => {
    it('initializes with a new game, white turn, intermediate difficulty, and not thinking', () => {
      const state = useGameStore.getState();

      expect(state.game).toBeDefined();
      expect(state.game.turn).toBe('white');
      expect(state.game.status).toBe('ongoing');
      expect(state.game.moveHistory).toHaveLength(0);
      expect(state.botDifficulty).toBe('intermediate');
      expect(state.isBotThinking).toBe(false);
      expect(state.gameMode).toBe('bot');
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

      // Moving pawn illegally 3 squares ahead
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

      // Attempting to move black piece on white turn
      const success = store.makeMove({ from: 'e7', to: 'e5' });

      expect(success).toBe(false);
      const updated = useGameStore.getState();
      expect(updated.game.fen).toBe(initialFen);
      expect(updated.game.turn).toBe('white');
      expect(updated.game.moveHistory).toHaveLength(0);
    });
  });

  describe('resetGame', () => {
    it('restores initial game state and resets isBotThinking', () => {
      const store = useGameStore.getState();
      store.makeMove({ from: 'e2', to: 'e4' });
      useGameStore.setState({ isBotThinking: true });

      expect(useGameStore.getState().game.moveHistory).toHaveLength(1);
      expect(useGameStore.getState().isBotThinking).toBe(true);

      useGameStore.getState().resetGame();

      const resetState = useGameStore.getState();
      expect(resetState.game.turn).toBe('white');
      expect(resetState.game.moveHistory).toHaveLength(0);
      expect(resetState.game.status).toBe('ongoing');
      expect(resetState.isBotThinking).toBe(false);
    });
  });

  describe('setBotDifficulty', () => {
    it('updates the bot difficulty level', () => {
      const store = useGameStore.getState();
      expect(store.botDifficulty).toBe('intermediate');

      store.setBotDifficulty('advanced');
      expect(useGameStore.getState().botDifficulty).toBe('advanced');

      store.setBotDifficulty('full-strength');
      expect(useGameStore.getState().botDifficulty).toBe('full-strength');

      store.setBotDifficulty('beginner');
      expect(useGameStore.getState().botDifficulty).toBe('beginner');
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

  describe('requestBotMove', () => {
    it('resolves gracefully when no engine bridge is active', async () => {
      const store = useGameStore.getState();
      expect(store.isBotThinking).toBe(false);

      await store.requestBotMove();

      expect(useGameStore.getState().isBotThinking).toBe(false);
      expect(useGameStore.getState().game.moveHistory).toHaveLength(0);
    });

    it('queries active engine bridge and applies best move', async () => {
      // First, white plays 1. e2-e4
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
            // Simulate Stockfish outputting bestmove e7e5
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
});
