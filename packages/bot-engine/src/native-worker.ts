import type { EngineBridge } from './bridge';

export interface NativeStockfishModule {
  sendCommand(command: string): void;
  addMessageListener(listener: (message: string) => void): () => void;
  terminate?: () => void;
}

/**
 * Adapter wrapping React Native Stockfish native thread/module.
 */
export class NativeWorkerBridge implements EngineBridge {
  private module: NativeStockfishModule;
  private listeners: Set<(message: string) => void> = new Set();
  private unsubscribeNative?: () => void;

  constructor(module: NativeStockfishModule) {
    this.module = module;
    this.unsubscribeNative = this.module.addMessageListener((msg: string) => {
      for (const listener of this.listeners) {
        listener(msg);
      }
    });
  }

  postMessage(command: string): void {
    this.module.sendCommand(command);
  }

  onMessage(listener: (message: string) => void): void {
    this.listeners.add(listener);
  }

  removeMessageListener(listener: (message: string) => void): void {
    this.listeners.delete(listener);
  }

  terminate(): void {
    this.listeners.clear();
    if (this.unsubscribeNative) {
      this.unsubscribeNative();
    }
    if (this.module.terminate) {
      this.module.terminate();
    }
  }
}
