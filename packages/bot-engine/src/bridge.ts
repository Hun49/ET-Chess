export interface EngineBridge {
  postMessage(command: string): void;
  onMessage(listener: (message: string) => void): void;
  removeMessageListener(listener: (message: string) => void): void;
  terminate(): void;
}
