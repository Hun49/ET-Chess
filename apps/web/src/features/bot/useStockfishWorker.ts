import { WebWorkerBridge } from '@et-chess/bot-engine';
import { useEffect, useState } from 'react';
import { setEngineBridge } from '../../store/gameStore';

export interface UseStockfishWorkerOptions {
  workerUrl?: string;
  autoInitialize?: boolean;
}

export interface StockfishWorkerService {
  worker: Worker;
  bridge: WebWorkerBridge;
  terminate: () => void;
}

export interface UseStockfishWorkerResult {
  isInitialized: boolean;
  error: Error | null;
}

/**
 * Initializes the Stockfish WebWorker bridge safely.
 * Checks for browser and WebWorker environment before constructing.
 * Returns null if not in a supported browser environment.
 */
export function initStockfishWorker(
  workerUrl: string = '/stockfish.js',
): StockfishWorkerService | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }

  const worker = new Worker(workerUrl);
  const bridge = new WebWorkerBridge(worker);
  setEngineBridge(bridge);

  return {
    worker,
    bridge,
    terminate: () => {
      setEngineBridge(null);
      try {
        bridge.terminate();
      } catch {
        // Safe disposal if already terminated
      }
    },
  };
}

/**
 * React hook that manages the lifecycle of the Stockfish WebWorker engine bridge.
 * Automatically registers the bridge on mount and cleans up on unmount.
 */
export function useStockfishWorker(
  options: UseStockfishWorkerOptions = {},
): UseStockfishWorkerResult {
  const { workerUrl = '/stockfish.js', autoInitialize = true } = options;
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!autoInitialize) {
      return;
    }

    try {
      const service = initStockfishWorker(workerUrl);
      if (service) {
        setIsInitialized(true);
        setError(null);

        return () => {
          service.terminate();
          setIsInitialized(false);
        };
      }
    } catch (err) {
      const caughtError = err instanceof Error ? err : new Error(String(err));
      setError(caughtError);
      setIsInitialized(false);
    }
  }, [workerUrl, autoInitialize]);

  return { isInitialized, error };
}

export default useStockfishWorker;
