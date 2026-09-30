import type { PlayerColor } from '@et-chess/types';
import { Shield, XCircle, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { apiFetch, WS_BASE_URL } from '../../lib/api-client';

export interface MatchFoundPayload {
  gameId: string;
  yourColor: PlayerColor;
  opponent: {
    userId: string;
    displayName: string;
    rating: number;
  };
}

export interface MatchmakingQueueProps {
  currentUserId: string;
  displayName: string;
  rating?: number;
  onMatchFound: (match: MatchFoundPayload) => void;
  onCancel: () => void;
}

export function MatchmakingQueue({
  currentUserId,
  displayName,
  rating = 1200,
  onMatchFound,
  onCancel,
}: MatchmakingQueueProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [_isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);

  // Expanding window calculation: base 200, +50 every 15s
  const currentWindow = 200 + Math.floor(elapsedSeconds / 15) * 50;
  const minRating = Math.max(100, rating - currentWindow);
  const maxRating = rating + currentWindow;

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    isMountedRef.current = true;
    setElapsedSeconds(0);
    setIsSearching(true);
    setErrorMessage(null);

    const wsUrl = `${WS_BASE_URL}/matchmaking/queue?userId=${encodeURIComponent(
      currentUserId,
    )}&displayName=${encodeURIComponent(displayName)}&rating=${rating}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initialize matchmaking connection');
      setIsSearching(false);
      return;
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'match-found') {
          if (isMountedRef.current) {
            onMatchFound({
              gameId: msg.gameId,
              yourColor: msg.yourColor,
              opponent: msg.opponent,
            });
          }
        } else if (msg.type === 'error') {
          if (isMountedRef.current) {
            setErrorMessage(msg.message || 'Matchmaking error');
          }
        }
      } catch {
        // Ignored
      }
    };

    ws.onerror = () => {
      if (isMountedRef.current) {
        setErrorMessage('Matchmaking socket connection error');
      }
    };

    // Increment timer every second
    const timer = setInterval(() => {
      if (isMountedRef.current) {
        setElapsedSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      // Leave queue on server
      apiFetch('/matchmaking/leave', {
        method: 'POST',
        body: JSON.stringify({ userId: currentUserId }),
      }).catch(() => {});
    };
  }, [currentUserId, displayName, rating, onMatchFound]);

  const handleCancel = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    apiFetch('/matchmaking/leave', {
      method: 'POST',
      body: JSON.stringify({ userId: currentUserId }),
    }).catch(() => {});
    onCancel();
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-3xl bg-surface-card border border-surface-border text-center shadow-2xl flex flex-col items-center">
      {/* Animated Radar Pulse */}
      <div className="relative w-28 h-28 flex items-center justify-center my-4">
        <div className="absolute inset-0 rounded-full bg-board-light/10 animate-ping opacity-75" />
        <div className="absolute inset-2 rounded-full bg-board-light/20 animate-pulse" />
        <div className="relative w-16 h-16 rounded-2xl bg-surface-base border border-board-light/40 flex items-center justify-center text-board-light shadow-xl">
          <Zap className="w-8 h-8 animate-pulse text-board-light" />
        </div>
      </div>

      <h2 className="text-2xl font-black text-white tracking-tight">Finding Opponent...</h2>
      <p className="mt-1 text-xs text-gray-400">Searching the ranked pool for a balanced match</p>

      {/* Stats Counter Card */}
      <div className="w-full mt-6 grid grid-cols-2 gap-3">
        <div className="p-3 rounded-2xl bg-surface-base border border-surface-border flex flex-col items-center">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Elapsed Time
          </span>
          <span className="mt-1 text-2xl font-mono font-extrabold text-white">
            {formatTime(elapsedSeconds)}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-surface-base border border-surface-border flex flex-col items-center">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Rating Range
          </span>
          <span className="mt-1 text-sm font-mono font-extrabold text-board-light">
            {minRating} - {maxRating}
          </span>
          <span className="text-[10px] text-gray-500 font-mono">±{currentWindow} pts</span>
        </div>
      </div>

      {/* User info banner */}
      <div className="w-full mt-4 flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface-base/60 border border-surface-border text-xs">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-board-light" />
          <span className="font-semibold text-gray-300">{displayName}</span>
        </div>
        <span className="font-mono font-bold text-gray-400">Rating: {rating}</span>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-200 text-xs w-full">
          {errorMessage}
        </div>
      )}

      {/* Cancel Search Button */}
      <button
        type="button"
        onClick={handleCancel}
        className="mt-8 w-full py-3 px-4 rounded-xl bg-surface-accent hover:bg-surface-border border border-surface-border text-gray-300 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
      >
        <XCircle className="w-4 h-4" />
        <span>Cancel Search</span>
      </button>
    </div>
  );
}
