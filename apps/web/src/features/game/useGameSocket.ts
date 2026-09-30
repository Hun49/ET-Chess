import {
  type DrawOfferedMessage,
  type ErrorMessage,
  type GameOverMessage,
  GameSocketClient,
  type ServerOpponentDisconnectedMessage,
} from '@et-chess/realtime-protocol';
import type { GameState } from '@et-chess/types';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseGameSocketOptions {
  url: string | null;
  onStateSync?: (state: GameState) => void;
  onGameOver?: (msg: GameOverMessage) => void;
  onError?: (err: ErrorMessage) => void;
  onOpponentDisconnected?: (msg: ServerOpponentDisconnectedMessage) => void;
  onOpponentReconnected?: () => void;
  onDrawOffered?: (msg: DrawOfferedMessage) => void;
}

export function useGameSocket(options: UseGameSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [gracePeriodSeconds, setGracePeriodSeconds] = useState<number | null>(null);
  const [drawOffered, setDrawOffered] = useState(false);
  const [gameOver, setGameOver] = useState<GameOverMessage | null>(null);

  const clientRef = useRef<GameSocketClient | null>(null);

  useEffect(() => {
    if (!options.url) {
      return;
    }

    const client = new GameSocketClient({
      url: options.url,
      onConnectionChange: (connected) => {
        setIsConnected(connected);
      },
      onStateSync: (state) => {
        setGameState(state);
        options.onStateSync?.(state);
      },
      onGameOver: (msg) => {
        setGameOver(msg);
        options.onGameOver?.(msg);
      },
      onError: (err) => {
        setLastError(err.message);
        options.onError?.(err);
      },
      onOpponentDisconnected: (msg) => {
        setOpponentDisconnected(true);
        setGracePeriodSeconds(Math.round(msg.gracePeriodMs / 1000));
        options.onOpponentDisconnected?.(msg);
      },
      onOpponentReconnected: () => {
        setOpponentDisconnected(false);
        setGracePeriodSeconds(null);
        options.onOpponentReconnected?.();
      },
      onDrawOffered: (msg) => {
        setDrawOffered(true);
        options.onDrawOffered?.(msg);
      },
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [
    options.url,
    options.onOpponentReconnected,
    options.onError,
    options.onStateSync,
    options.onOpponentDisconnected,
    options.onGameOver,
    options.onDrawOffered,
  ]);

  const sendMove = useCallback(
    (move: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }) => {
      return clientRef.current?.sendMove(move) ?? false;
    },
    [],
  );

  const resign = useCallback(() => {
    return clientRef.current?.resign() ?? false;
  }, []);

  const offerDraw = useCallback(() => {
    return clientRef.current?.offerDraw() ?? false;
  }, []);

  const respondDraw = useCallback((accept: boolean) => {
    setDrawOffered(false);
    return clientRef.current?.respondDraw(accept) ?? false;
  }, []);

  return {
    isConnected,
    gameState,
    gameOver,
    lastError,
    opponentDisconnected,
    gracePeriodSeconds,
    drawOffered,
    sendMove,
    resign,
    offerDraw,
    respondDraw,
  };
}
