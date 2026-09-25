import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEngineBridge, setEngineBridge, useGameStore } from '../../store/gameStore';
import { initStockfishWorker, useStockfishWorker } from './useStockfishWorker';

// Mock Worker implementation for browser simulation
class MockWorker {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor(url: string) {
    this.url = url;
  }
}

describe('Stockfish Web Worker service and useStockfishWorker hook', () => {
  const originalWindow = globalThis.window;
  const originalWorker = globalThis.Worker;

  beforeEach(() => {
    setEngineBridge(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setEngineBridge(null);
    // Restore globals
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as { window?: unknown }).window;
    }

    if (originalWorker !== undefined) {
      globalThis.Worker = originalWorker;
    } else {
      delete (globalThis as { Worker?: unknown }).Worker;
    }
  });

  describe('initStockfishWorker in non-browser / SSR environment', () => {
    it('returns null safely when window is undefined', () => {
      delete (globalThis as { window?: unknown }).window;
      delete (globalThis as { Worker?: unknown }).Worker;

      const service = initStockfishWorker('/stockfish.js');
      expect(service).toBeNull();
      expect(getEngineBridge()).toBeNull();
    });

    it('returns null safely when Worker is undefined in window', () => {
      globalThis.window = {} as unknown as Window & typeof globalThis;
      delete (globalThis as { Worker?: unknown }).Worker;

      const service = initStockfishWorker('/stockfish.js');
      expect(service).toBeNull();
      expect(getEngineBridge()).toBeNull();
    });
  });

  describe('initStockfishWorker in browser environment', () => {
    beforeEach(() => {
      globalThis.window = {} as unknown as Window & typeof globalThis;
      globalThis.Worker = MockWorker as unknown as typeof Worker;
    });

    it('creates a Worker instance at default /stockfish.js path and registers EngineBridge', () => {
      const service = initStockfishWorker();

      expect(service).not.toBeNull();
      expect(service?.worker).toBeInstanceOf(MockWorker);
      const mockWorker = service ? (service.worker as unknown as MockWorker) : null;
      expect(mockWorker?.url).toBe('/stockfish.js');

      const bridge = getEngineBridge();
      expect(bridge).not.toBeNull();
      expect(bridge).toBe(service?.bridge);
    });

    it('creates a Worker instance with custom workerUrl if provided', () => {
      const customUrl = '/custom-stockfish.js';
      const service = initStockfishWorker(customUrl);

      expect(service).not.toBeNull();
      const mockWorker = service ? (service.worker as unknown as MockWorker) : null;
      expect(mockWorker?.url).toBe(customUrl);
    });

    it('bridges messages between Worker and EngineBridge', () => {
      const service = initStockfishWorker();
      expect(service).not.toBeNull();
      const bridge = service?.bridge;
      const worker = service?.worker as unknown as MockWorker;

      // Post message to engine
      bridge?.postMessage('uci');
      expect(worker.postMessage).toHaveBeenCalledWith('uci');

      // Message received from engine
      const messageListener = vi.fn();
      bridge?.onMessage(messageListener);

      const fakeEvent = { data: 'uciok' } as MessageEvent;
      worker.onmessage?.(fakeEvent);

      expect(messageListener).toHaveBeenCalledWith('uciok');
    });

    it('terminates worker and clears engine bridge on service.terminate()', () => {
      const service = initStockfishWorker();
      expect(service).not.toBeNull();
      const worker = service?.worker as unknown as MockWorker;

      expect(getEngineBridge()).not.toBeNull();

      service?.terminate();

      expect(getEngineBridge()).toBeNull();
      expect(worker.terminate).toHaveBeenCalled();
    });

    it('handles multiple termination calls safely without error', () => {
      const service = initStockfishWorker();
      expect(() => {
        service?.terminate();
        service?.terminate();
      }).not.toThrow();
    });

    it('throws or bubbles if Worker instantiation throws', () => {
      globalThis.Worker = class FailingWorker {
        constructor() {
          throw new Error('SecurityError: Worker creation failed');
        }
      } as unknown as typeof Worker;

      expect(() => initStockfishWorker()).toThrow('Worker creation failed');
      expect(getEngineBridge()).toBeNull();
    });
  });

  describe('useStockfishWorker hook behavior', () => {
    it('initializes default state safely in SSR/node environment', () => {
      delete (globalThis as { window?: unknown }).window;
      delete (globalThis as { Worker?: unknown }).Worker;

      let hookResult: ReturnType<typeof useStockfishWorker> = {
        isInitialized: false,
        error: null,
      };
      function TestComponent() {
        hookResult = useStockfishWorker();
        return React.createElement('div', null, 'ssr-rendered');
      }

      const html = renderToString(React.createElement(TestComponent));
      expect(html).toContain('ssr-rendered');
      expect(hookResult?.isInitialized).toBe(false);
      expect(hookResult?.error).toBeNull();
    });
  });

  describe('gameStore bot move execution with registered WebWorkerBridge', () => {
    beforeEach(() => {
      globalThis.window = {} as unknown as Window & typeof globalThis;
      globalThis.Worker = MockWorker as unknown as typeof Worker;
    });

    it('coordinates requestBotMove through the active WebWorkerBridge', async () => {
      const service = initStockfishWorker();
      expect(service).not.toBeNull();
      const worker = service?.worker as unknown as MockWorker;

      // Make White move
      useGameStore.getState().makeMove({ from: 'e2', to: 'e4' });
      expect(useGameStore.getState().game.turn).toBe('black');

      // Mock worker responding to UCI commands
      worker.postMessage.mockImplementation((cmd: string) => {
        if (cmd === 'uci') {
          worker.onmessage?.({ data: 'uciok' } as MessageEvent);
        } else if (cmd === 'isready') {
          worker.onmessage?.({ data: 'readyok' } as MessageEvent);
        } else if (cmd.startsWith('go')) {
          worker.onmessage?.({ data: 'bestmove c7c5' } as MessageEvent);
        }
      });

      // Request bot move
      await useGameStore.getState().requestBotMove();

      const stateAfter = useGameStore.getState();
      expect(stateAfter.game.turn).toBe('white');
      expect(stateAfter.game.moveHistory).toHaveLength(2);
      expect(stateAfter.game.moveHistory[1]).toEqual({ from: 'c7', to: 'c5' });

      service?.terminate();
    });
  });
});
