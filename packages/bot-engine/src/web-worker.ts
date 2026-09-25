import type { EngineBridge } from './bridge';

/**
 * Adapter wrapping a browser Web Worker (e.g. stockfish.wasm worker).
 */
export class WebWorkerBridge implements EngineBridge {
  private worker: Worker;
  private listeners: Set<(message: string) => void> = new Set();

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = (event: MessageEvent) => {
      const data = typeof event.data === 'string' ? event.data : String(event.data);
      for (const listener of this.listeners) {
        listener(data);
      }
    };
  }

  postMessage(command: string): void {
    this.worker.postMessage(command);
  }

  onMessage(listener: (message: string) => void): void {
    this.listeners.add(listener);
  }

  removeMessageListener(listener: (message: string) => void): void {
    this.listeners.delete(listener);
  }

  terminate(): void {
    this.listeners.clear();
    this.worker.terminate();
  }
}
