import { createBot } from '@et-chess/bot-engine';
import { applyMove, createGame } from '@et-chess/chess-core';
import type { Move } from '@et-chess/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { NativeModules } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEngineBridge, setEngineBridge, useGameStore } from '../../store/gameStore';
import {
  createSimulatorNativeModule,
  getNativeStockfishModule,
  initNativeBotBridge,
  type NativeStockfishModule,
  useNativeBotBridge,
} from './nativeBotBridge';

describe('apps/mobile/src/features/bot/nativeBotBridge', () => {
  beforeEach(async () => {
    setEngineBridge(null);
    await AsyncStorage.clear();
    vi.clearAllMocks();
    useGameStore.setState({
      game: createGame(),
      botDifficulty: 'intermediate',
      isBotThinking: false,
      gameMode: 'bot',
      resignedColor: null,
    });
    // Ensure clean NativeModules
    delete NativeModules.Stockfish;
    delete NativeModules.StockfishModule;
    delete NativeModules.RNStockfish;
  });

  afterEach(() => {
    setEngineBridge(null);
    delete NativeModules.Stockfish;
    delete NativeModules.StockfishModule;
    delete NativeModules.RNStockfish;
    vi.restoreAllMocks();
  });

  describe('Microtask 5.3.1: Bridge Initialization and Registration', () => {
    it('initializes and registers simulator bridge when no native module exists', () => {
      expect(getEngineBridge()).toBeNull();

      const cleanup = initNativeBotBridge();
      const activeBridge = getEngineBridge();

      expect(activeBridge).not.toBeNull();
      expect(typeof activeBridge?.postMessage).toBe('function');
      expect(typeof activeBridge?.onMessage).toBe('function');

      // Calling cleanup unregisters the engine bridge
      cleanup();
      expect(getEngineBridge()).toBeNull();
    });

    it('initializes and registers a custom NativeStockfishModule when provided', () => {
      const mockModule: NativeStockfishModule = {
        sendCommand: vi.fn(),
        addMessageListener: vi.fn(() => vi.fn()),
        terminate: vi.fn(),
      };

      const cleanup = initNativeBotBridge(mockModule);
      expect(getEngineBridge()).not.toBeNull();

      cleanup();
      expect(getEngineBridge()).toBeNull();
      expect(mockModule.terminate).toHaveBeenCalled();
    });

    it('binds to NativeModules.Stockfish when available in standalone APK binary', () => {
      const nativeSend = vi.fn();
      const nativeListenerRemove = vi.fn();
      const nativeAddListener = vi.fn((_listener: (msg: string) => void) => nativeListenerRemove);

      NativeModules.Stockfish = {
        sendCommand: nativeSend,
        addMessageListener: nativeAddListener,
        terminate: vi.fn(),
      };

      const detectedModule = getNativeStockfishModule();
      expect(detectedModule).not.toBeNull();

      const cleanup = initNativeBotBridge();
      const bridge = getEngineBridge();
      expect(bridge).not.toBeNull();

      bridge?.postMessage('uci');
      expect(nativeSend).toHaveBeenCalledWith('uci');

      cleanup();
      expect(getEngineBridge()).toBeNull();
    });

    it('adapts native module with send() method if sendCommand is absent', () => {
      const nativeSend = vi.fn();
      NativeModules.StockfishModule = {
        send: nativeSend,
        addListener: vi.fn(() => ({ remove: vi.fn() })),
      };

      const detectedModule = getNativeStockfishModule();
      expect(detectedModule).not.toBeNull();

      detectedModule?.sendCommand('isready');
      expect(nativeSend).toHaveBeenCalledWith('isready');
    });

    it('is safe to call cleanup multiple times', () => {
      const cleanup = initNativeBotBridge();
      expect(getEngineBridge()).not.toBeNull();

      expect(() => {
        cleanup();
        cleanup();
      }).not.toThrow();
      expect(getEngineBridge()).toBeNull();
    });
  });

  describe('Microtask 5.3.1: Message Routing and UCI Handshake', () => {
    it('simulator answers standard UCI initialization with uciok', async () => {
      const simulator = createSimulatorNativeModule({ responseDelayMs: 0 });
      const receivedMessages: string[] = [];

      const unsubscribe = simulator.addMessageListener((msg) => {
        receivedMessages.push(msg);
      });

      simulator.sendCommand('uci');

      await new Promise((r) => setTimeout(r, 20));

      expect(receivedMessages).toContain('uciok');
      expect(receivedMessages.some((m) => m.startsWith('id name'))).toBe(true);

      unsubscribe();
      simulator.terminate?.();
    });

    it('simulator answers isready command with readyok', async () => {
      const simulator = createSimulatorNativeModule({ responseDelayMs: 0 });
      const receivedMessages: string[] = [];

      simulator.addMessageListener((msg) => {
        receivedMessages.push(msg);
      });

      simulator.sendCommand('isready');

      await new Promise((r) => setTimeout(r, 20));

      expect(receivedMessages).toContain('readyok');
      simulator.terminate?.();
    });

    it('routes messages bidirectionally through NativeWorkerBridge', () => {
      let notifyNativeListener: ((msg: string) => void) | null = null;
      const mockModule: NativeStockfishModule = {
        sendCommand: vi.fn(),
        addMessageListener: (cb) => {
          notifyNativeListener = cb;
          return () => {
            notifyNativeListener = null;
          };
        },
      };

      const cleanup = initNativeBotBridge(mockModule);
      const bridge = getEngineBridge();

      const received: string[] = [];
      const listener = (msg: string) => {
        received.push(msg);
      };

      bridge?.onMessage(listener);
      bridge?.postMessage('uci');

      expect(mockModule.sendCommand).toHaveBeenCalledWith('uci');

      if (notifyNativeListener) {
        (notifyNativeListener as (msg: string) => void)('test-engine-message');
      }
      expect(received).toContain('test-engine-message');

      bridge?.removeMessageListener(listener);
      cleanup();
    });

    it('performs full UCI handshake when combined with createBot', async () => {
      const cleanup = initNativeBotBridge();
      const bridge = getEngineBridge();
      expect(bridge).not.toBeNull();

      if (!bridge) throw new Error('Bridge must be registered');

      const bot = createBot('intermediate', bridge);

      // Bot getBestMove triggers search after handshake is complete
      const startFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const bestMovePromise = bot.getBestMove(startFen);

      const move = await bestMovePromise;
      expect(move).toBeDefined();
      expect(typeof move.from).toBe('string');
      expect(typeof move.to).toBe('string');

      bot.dispose();
      cleanup();
    });
  });

  describe('Microtask 5.3.2: Bot Move Resolution and Cleanup', () => {
    it('simulator returns valid legal move for black in response to go command', async () => {
      const cleanup = initNativeBotBridge();
      const bridge = getEngineBridge();
      expect(bridge).not.toBeNull();

      if (!bridge) throw new Error('Bridge missing');

      const bot = createBot('beginner', bridge);
      const afterE4Fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

      const move = await bot.getBestMove(afterE4Fen);
      expect(move).toBeDefined();

      // Verify the move is 100% legal by applying it to the position
      const initialGame = createGame();
      const gameAfterE4 = applyMove(initialGame, { from: 'e2', to: 'e4' });
      expect(() => applyMove(gameAfterE4, move)).not.toThrow();

      bot.dispose();
      cleanup();
    });

    it('simulator handles stop command cleanly by cancelling active search', async () => {
      const simulator = createSimulatorNativeModule({ responseDelayMs: 50 });
      const messages: string[] = [];

      simulator.addMessageListener((msg) => {
        messages.push(msg);
      });

      simulator.sendCommand('position startpos');
      simulator.sendCommand('go depth 10');

      // Immediate stop before delay fires
      simulator.sendCommand('stop');

      await new Promise((r) => setTimeout(r, 80));

      // bestmove should not have been emitted because stop cancelled it
      expect(messages.filter((m) => m.startsWith('bestmove'))).toHaveLength(0);

      simulator.terminate?.();
    });

    it('cleans up timers and listeners when terminate is called', async () => {
      const simulator = createSimulatorNativeModule({ responseDelayMs: 50 });
      const messages: string[] = [];

      simulator.addMessageListener((msg) => {
        messages.push(msg);
      });

      simulator.sendCommand('uci');
      simulator.terminate?.();

      await new Promise((r) => setTimeout(r, 70));

      // No messages should fire after termination
      expect(messages).toHaveLength(0);
    });
  });

  describe('Microtask 5.3.2: Wire Bot Turns to Game Loop & Persistence', () => {
    it('triggers requestBotMove, applies black move to store, and persists to AsyncStorage', async () => {
      const cleanup = initNativeBotBridge();

      // White plays opening move: 1. e4
      const moved = useGameStore.getState().makeMove({ from: 'e2', to: 'e4' });
      expect(moved).toBe(true);

      const stateAfterWhite = useGameStore.getState();
      expect(stateAfterWhite.game.turn).toBe('black');
      expect(stateAfterWhite.game.moveHistory).toHaveLength(1);

      // Trigger bot move
      const botPromise = useGameStore.getState().requestBotMove();
      expect(useGameStore.getState().isBotThinking).toBe(true);

      await botPromise;

      const stateAfterBot = useGameStore.getState();
      expect(stateAfterBot.isBotThinking).toBe(false);
      expect(stateAfterBot.game.turn).toBe('white');
      expect(stateAfterBot.game.moveHistory).toHaveLength(2);

      const botMove = stateAfterBot.game.moveHistory[1] as Move;
      expect(botMove).toBeDefined();
      expect(botMove.from).toBeDefined();
      expect(botMove.to).toBeDefined();

      // Verify AsyncStorage persistence
      await new Promise((r) => setTimeout(r, 50));
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'et-chess-game-state',
        expect.stringContaining('"turn":"white"'),
      );

      // Check persisted data matches state
      const matchingCalls = vi
        .mocked(AsyncStorage.setItem)
        .mock.calls.filter((call) => call[0] === 'et-chess-game-state');
      const latestCall = matchingCalls[matchingCalls.length - 1];
      expect(latestCall).toBeDefined();

      const parsedPayload = JSON.parse(latestCall?.[1] as string);
      expect(parsedPayload.state.game.moveHistory).toHaveLength(2);
      expect(parsedPayload.state.game.moveHistory[0]).toEqual({ from: 'e2', to: 'e4' });
      expect(parsedPayload.state.game.moveHistory[1]).toEqual(botMove);
      expect(parsedPayload.state.gameMode).toBe('bot');

      cleanup();
    });

    it('consecutive bot turns in game flow maintain legal state and persistent history', async () => {
      const cleanup = initNativeBotBridge();

      // Turn 1: White e2-e4
      useGameStore.getState().makeMove({ from: 'e2', to: 'e4' });
      await useGameStore.getState().requestBotMove();

      expect(useGameStore.getState().game.moveHistory).toHaveLength(2);
      expect(useGameStore.getState().game.turn).toBe('white');

      // Turn 2: White g1-f3
      useGameStore.getState().makeMove({ from: 'g1', to: 'f3' });
      expect(useGameStore.getState().game.turn).toBe('black');
      await useGameStore.getState().requestBotMove();

      const state = useGameStore.getState();
      expect(state.game.moveHistory).toHaveLength(4);
      expect(state.game.turn).toBe('white');
      expect(state.game.status).toBe('ongoing');

      // AsyncStorage holds full 4-move history
      await new Promise((r) => setTimeout(r, 50));
      const persistedCall = vi.mocked(AsyncStorage.setItem).mock.calls[
        vi.mocked(AsyncStorage.setItem).mock.calls.length - 1
      ];
      const parsed = JSON.parse(persistedCall?.[1] as string);
      expect(parsed.state.game.moveHistory).toHaveLength(4);

      cleanup();
    });
  });

  describe('useNativeBotBridge React hook', () => {
    it('initializes default state safely in SSR / node environment', () => {
      function TestComponent() {
        useNativeBotBridge();
        return null;
      }
      expect(() => renderToString(React.createElement(TestComponent))).not.toThrow();
    });
  });
});
