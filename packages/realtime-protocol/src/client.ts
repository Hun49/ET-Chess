import type { GameState } from '@et-chess/types';
import {
  createClientMessage,
  type DrawOfferedMessage,
  type ErrorMessage,
  type GameOverMessage,
  type OpponentDisconnectedMessage,
  type OpponentReconnectedMessage,
  type ServerStateSyncMessage,
  safeParseServerMessage,
} from './index';

export interface GameSocketClientOptions {
  url: string;
  onStateSync?: (state: GameState, syncData?: ServerStateSyncMessage) => void;
  onGameOver?: (msg: GameOverMessage) => void;
  onError?: (err: ErrorMessage) => void;
  onOpponentDisconnected?: (msg: OpponentDisconnectedMessage) => void;
  onOpponentReconnected?: (msg: OpponentReconnectedMessage) => void;
  onDrawOffered?: (msg: DrawOfferedMessage) => void;
  onConnectionChange?: (connected: boolean) => void;
  maxReconnectAttempts?: number;
  WebSocketClass?: any;
}

export class GameSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: any = null;
  private isManuallyClosed = false;
  private options: GameSocketClientOptions;
  private WebSocketClass: any;

  constructor(options: GameSocketClientOptions) {
    this.options = options;
    this.WebSocketClass =
      options.WebSocketClass ||
      (typeof globalThis !== 'undefined' ? (globalThis as any).WebSocket : undefined);
  }

  public connect(): void {
    if (!this.WebSocketClass) {
      throw new Error('WebSocket implementation not found in environment');
    }

    this.isManuallyClosed = false;
    this.clearReconnectTimer();

    try {
      this.ws = new this.WebSocketClass(this.options.url);
    } catch (_err: any) {
      this.handleSocketFailure();
      return;
    }

    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.options.onConnectionChange?.(true);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      const parsed = safeParseServerMessage(event.data);
      if (!parsed.success) {
        return;
      }

      const msg = parsed.data;
      switch (msg.type) {
        case 'state-sync':
          this.options.onStateSync?.(msg.gameState, msg);
          break;
        case 'game-over':
          this.options.onGameOver?.(msg);
          break;
        case 'error':
          this.options.onError?.(msg);
          break;
        case 'opponent-disconnected':
          this.options.onOpponentDisconnected?.(msg);
          break;
        case 'opponent-reconnected':
          this.options.onOpponentReconnected?.(msg);
          break;
        case 'draw-offered':
          this.options.onDrawOffered?.(msg);
          break;
      }
    };

    this.ws.onerror = () => {
      // Handled via onclose
    };

    this.ws.onclose = () => {
      this.options.onConnectionChange?.(false);
      if (!this.isManuallyClosed) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    const maxAttempts = this.options.maxReconnectAttempts ?? 5;
    if (this.reconnectAttempt >= maxAttempts) {
      return;
    }

    const backoffMs = Math.min(1000 * 2 ** this.reconnectAttempt, 10000);
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      if (!this.isManuallyClosed) {
        this.connect();
      }
    }, backoffMs);
  }

  private handleSocketFailure(): void {
    this.options.onConnectionChange?.(false);
    this.scheduleReconnect();
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public sendMove(move: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }): boolean {
    return this.send(createClientMessage.move(move));
  }

  public resign(): boolean {
    return this.send(createClientMessage.resign());
  }

  public offerDraw(): boolean {
    return this.send(createClientMessage.drawOffer());
  }

  public respondDraw(accept: boolean): boolean {
    return this.send(createClientMessage.drawResponse(accept));
  }

  private send(payload: object): boolean {
    if (this.ws?.readyState !== 1 /* WebSocket.OPEN */) {
      return false;
    }
    this.ws.send(JSON.stringify(payload));
    return true;
  }

  public disconnect(): void {
    this.isManuallyClosed = true;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.options.onConnectionChange?.(false);
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === 1;
  }
}
