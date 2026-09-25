import { type NativeStockfishModule, NativeWorkerBridge } from '@et-chess/bot-engine';
import { findBestMove } from '@et-chess/chess-core';
import { useEffect } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { setEngineBridge } from '../../store/gameStore';

export type { NativeStockfishModule };

export interface SimulatorOptions {
  responseDelayMs?: number;
}

/**
 * Inspects React Native NativeModules and creates a NativeStockfishModule adapter
 * if a native Stockfish engine module is available in the current binary.
 * Returns null if running in Expo Go, simulator, or non-native environment.
 */
export function getNativeStockfishModule(): NativeStockfishModule | null {
  const nativeModule =
    NativeModules?.Stockfish ??
    NativeModules?.StockfishModule ??
    NativeModules?.RNStockfish ??
    null;

  if (!nativeModule) {
    return null;
  }

  if (
    typeof nativeModule.sendCommand === 'function' &&
    typeof nativeModule.addMessageListener === 'function'
  ) {
    return nativeModule as NativeStockfishModule;
  }

  const sendCommand = (cmd: string) => {
    if (typeof nativeModule.sendCommand === 'function') {
      nativeModule.sendCommand(cmd);
    } else if (typeof nativeModule.send === 'function') {
      nativeModule.send(cmd);
    } else if (typeof nativeModule.postMessage === 'function') {
      nativeModule.postMessage(cmd);
    }
  };

  const addMessageListener = (listener: (msg: string) => void): (() => void) => {
    if (typeof nativeModule.addMessageListener === 'function') {
      return nativeModule.addMessageListener(listener);
    }
    try {
      const emitter = new NativeEventEmitter(nativeModule);
      const handleEvent = (event?: unknown) => {
        if (typeof event === 'string') {
          listener(event);
        } else if (event && typeof event === 'object' && 'message' in event) {
          listener(String((event as { message: unknown }).message));
        }
      };
      // Cast listener to any to satisfy React Native's NativeEventEmitter overload variations
      const sub1 = emitter.addListener('message', handleEvent as never);
      const sub2 = emitter.addListener('onMessage', handleEvent as never);
      return () => {
        sub1?.remove?.();
        sub2?.remove?.();
      };
    } catch {
      return () => {};
    }
  };

  return {
    sendCommand,
    addMessageListener,
    terminate: () => {
      if (typeof nativeModule.terminate === 'function') {
        nativeModule.terminate();
      }
    },
  };
}

const DEFAULT_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Intelligent simulator fallback for dev/testing environments where the native
 * Stockfish binary is not built or available. Answers UCI handshake and computes
 * legal, tactical moves using chess-core heuristics.
 */
export function createSimulatorNativeModule(options: SimulatorOptions = {}): NativeStockfishModule {
  const { responseDelayMs = 0 } = options;
  const listeners = new Set<(msg: string) => void>();
  let currentFen = DEFAULT_START_FEN;
  let isTerminated = false;
  const activeTimers = new Set<NodeJS.Timeout>();

  const emit = (msg: string) => {
    if (isTerminated) return;
    for (const listener of listeners) {
      listener(msg);
    }
  };

  const schedule = (fn: () => void, delay = responseDelayMs) => {
    if (isTerminated) return;
    const timer = setTimeout(() => {
      activeTimers.delete(timer);
      if (!isTerminated) {
        fn();
      }
    }, delay);
    activeTimers.add(timer);
  };

  const clearTimers = () => {
    for (const timer of activeTimers) {
      clearTimeout(timer);
    }
    activeTimers.clear();
  };

  return {
    sendCommand: (command: string) => {
      if (isTerminated) return;
      const trimmed = command.trim();

      if (trimmed === 'uci') {
        schedule(() => {
          emit('id name Stockfish Simulator (Fallback)');
          emit('id author ET Chess');
          emit('option name Skill Level type spin default 20 min 0 max 20');
          emit('uciok');
        });
      } else if (trimmed === 'isready') {
        schedule(() => {
          emit('readyok');
        });
      } else if (trimmed.startsWith('position fen ')) {
        currentFen = trimmed.slice('position fen '.length).trim();
      } else if (trimmed === 'position startpos') {
        currentFen = DEFAULT_START_FEN;
      } else if (trimmed.startsWith('go')) {
        schedule(() => {
          const move = findBestMove(currentFen);
          if (move) {
            const uciMove = `${move.from}${move.to}${move.promotion ?? ''}`;
            emit(`info depth 1 score cp 20 time 10 nodes 100 nps 10000 pv ${uciMove}`);
            emit(`bestmove ${uciMove}`);
          } else {
            emit('bestmove (none)');
          }
        });
      } else if (trimmed === 'stop') {
        clearTimers();
      } else if (trimmed === 'quit') {
        clearTimers();
      }
    },

    addMessageListener: (listener: (msg: string) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    terminate: () => {
      isTerminated = true;
      clearTimers();
      listeners.clear();
    },
  };
}

/**
 * Initializes and registers the native bot bridge with useGameStore.
 * Detects native module if present, or falls back to intelligent simulator.
 * Returns a cleanup function that disposes the bridge and unregisters it.
 */
export function initNativeBotBridge(
  customModule?: NativeStockfishModule | null,
  options?: SimulatorOptions,
): () => void {
  const stockfishModule =
    customModule ?? getNativeStockfishModule() ?? createSimulatorNativeModule(options);

  const bridge = new NativeWorkerBridge(stockfishModule);
  setEngineBridge(bridge);

  return () => {
    try {
      bridge.terminate();
    } catch {
      // Safe cleanup
    }
    setEngineBridge(null);
  };
}

/**
 * React hook to bind the native bot engine bridge during component lifecycle.
 * Registers bridge on mount and cleans up on unmount.
 */
export function useNativeBotBridge(options?: SimulatorOptions): void {
  useEffect(() => {
    const cleanup = initNativeBotBridge(null, options);
    return () => {
      cleanup();
    };
  }, [options]);
}

export default initNativeBotBridge;
