import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSocketClient } from './client';
import { createServerMessage } from './index';

class MockSocket {
  static instances: MockSocket[] = [];
  public url: string;
  public readyState = 0;
  public onopen: (() => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onclose: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockSocket.instances.push(this);
    // Simulate async connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.onopen?.();
    }, 5);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  }

  simulateServerMessage(msg: object) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
}

describe('GameSocketClient', () => {
  beforeEach(() => {
    MockSocket.instances = [];
    vi.useFakeTimers();
  });

  it('connects to target URL and reports connection change', async () => {
    let connected = false;
    const client = new GameSocketClient({
      url: 'ws://localhost:8787/rooms/123/websocket',
      WebSocketClass: MockSocket as any,
      onConnectionChange: (c) => {
        connected = c;
      },
    });

    client.connect();
    expect(MockSocket.instances).toHaveLength(1);
    expect(connected).toBe(false);

    await vi.advanceTimersByTimeAsync(10);
    expect(connected).toBe(true);
    expect(client.isConnected()).toBe(true);

    client.disconnect();
    expect(client.isConnected()).toBe(false);
  });

  it('receives state-sync message and triggers onStateSync callback', async () => {
    const onStateSync = vi.fn();
    const client = new GameSocketClient({
      url: 'ws://localhost:8787/rooms/123/websocket',
      WebSocketClass: MockSocket as any,
      onStateSync,
    });

    client.connect();
    await vi.advanceTimersByTimeAsync(10);

    const mockGameState = {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      turn: 'black' as const,
      status: 'ongoing' as const,
      moveHistory: [{ from: 'e2', to: 'e4' }],
    };

    MockSocket.instances[0]?.simulateServerMessage(createServerMessage.stateSync(mockGameState));

    expect(onStateSync).toHaveBeenCalledWith(mockGameState);
  });

  it('sends move, resignation, and draw offers correctly', async () => {
    const client = new GameSocketClient({
      url: 'ws://localhost:8787/rooms/123/websocket',
      WebSocketClass: MockSocket as any,
    });

    client.connect();
    await vi.advanceTimersByTimeAsync(10);

    const ws = MockSocket.instances[0]!;

    client.sendMove({ from: 'e2', to: 'e4' });
    expect(JSON.parse(ws.sentMessages[0]!)).toEqual({
      type: 'move',
      move: { from: 'e2', to: 'e4' },
    });

    client.offerDraw();
    expect(JSON.parse(ws.sentMessages[1]!)).toEqual({
      type: 'draw-offer',
    });

    client.respondDraw(true);
    expect(JSON.parse(ws.sentMessages[2]!)).toEqual({
      type: 'draw-response',
      accept: true,
    });

    client.resign();
    expect(JSON.parse(ws.sentMessages[3]!)).toEqual({
      type: 'resign',
    });
  });

  it('handles disconnect and reconnects with exponential backoff', async () => {
    const onConnectionChange = vi.fn();
    const client = new GameSocketClient({
      url: 'ws://localhost:8787/rooms/123/websocket',
      WebSocketClass: MockSocket as any,
      onConnectionChange,
    });

    client.connect();
    await vi.advanceTimersByTimeAsync(10);
    expect(MockSocket.instances).toHaveLength(1);

    // Simulate unexpected drop
    MockSocket.instances[0]?.close();
    expect(onConnectionChange).toHaveBeenLastCalledWith(false);

    // 1st backoff attempt is ~1000ms
    await vi.advanceTimersByTimeAsync(1050);
    expect(MockSocket.instances).toHaveLength(2);

    // Connected again
    await vi.advanceTimersByTimeAsync(10);
    expect(onConnectionChange).toHaveBeenLastCalledWith(true);

    client.disconnect();
  });
});
