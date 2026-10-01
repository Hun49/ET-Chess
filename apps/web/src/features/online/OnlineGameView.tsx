import type { GameState, PlayerColor } from '@et-chess/types';
import { AlertTriangle, Clock, Flag, Handshake, Trophy, Users, Wifi, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, WS_BASE_URL } from '../../lib/api-client';
import { ChessboardView } from '../board/ChessboardView';
import { playMoveSound } from '../game/soundEffects';
import { useGameSocket } from '../game/useGameSocket';
import type { RoomData } from './FriendRoomWaiting';

export interface OnlineGameViewProps {
  room?: RoomData;
  gameId?: string;
  myColor?: PlayerColor;
  currentUserId: string;
  displayName: string;
  onExit: () => void;
}

export function OnlineGameView({
  room,
  gameId: directGameId,
  myColor: directColor,
  currentUserId,
  displayName,
  onExit,
}: OnlineGameViewProps) {
  const targetGameId = directGameId || room?.id || '';
  const myColor: PlayerColor = directColor
    ? directColor
    : room?.whiteUserId === currentUserId
      ? 'white'
      : room?.blackUserId === currentUserId
        ? 'black'
        : 'white';

  const opponentColor: PlayerColor = myColor === 'white' ? 'black' : 'white';

  const [ticket, setTicket] = useState<string | null>(null);

  useEffect(() => {
    if (!targetGameId) return;
    let active = true;
    apiFetch<{ ticket: string }>(`/rooms/${targetGameId}/ticket`, { method: 'POST' })
      .then((res) => {
        if (active) setTicket(res.ticket);
      })
      .catch((err) => {
        console.error('Failed to obtain game ticket:', err);
      });
    return () => {
      active = false;
    };
  }, [targetGameId]);

  const wsUrl = ticket
    ? `${WS_BASE_URL}/rooms/${targetGameId}/websocket?ticket=${encodeURIComponent(ticket)}`
    : null;

  const [localGameState, setLocalGameState] = useState<GameState | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  const handleStateSync = useCallback((state: GameState) => {
    setLocalGameState(state);
    playMoveSound();
  }, []);

  const {
    isConnected,
    gameState,
    whiteRemainingMs,
    blackRemainingMs,
    activeClockColor,
    gameOver,
    lastError,
    opponentDisconnected,
    gracePeriodSeconds,
    drawOffered,
    sendMove,
    resign,
    offerDraw,
    respondDraw,
  } = useGameSocket({
    url: wsUrl,
    onStateSync: handleStateSync,
  });

  const myRemainingMs = myColor === 'white' ? whiteRemainingMs : blackRemainingMs;
  const oppRemainingMs = myColor === 'white' ? blackRemainingMs : whiteRemainingMs;

  const formatClockTime = (ms: number | null | undefined): string => {
    if (ms === null || ms === undefined) return '--:--';
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Keep localGameState synchronized with latest socket state
  useEffect(() => {
    if (gameState) {
      setLocalGameState(gameState);
    }
  }, [gameState]);

  // Grace period countdown timer
  useEffect(() => {
    if (!opponentDisconnected || gracePeriodSeconds === null) {
      setCountdownSeconds(null);
      return;
    }

    setCountdownSeconds(gracePeriodSeconds);
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [opponentDisconnected, gracePeriodSeconds]);

  const activeGameState = localGameState || {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn: 'white' as const,
    status: 'ongoing' as const,
    moveHistory: [],
  };

  const isMyTurn = isConnected && activeGameState.turn === myColor;

  const handleMove = useCallback(
    (move: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }): boolean => {
      if (!isMyTurn) return false;
      return sendMove(move);
    },
    [isMyTurn, sendMove],
  );

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      {/* Top Match Status Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-surface-card border border-surface-border">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected
                ? 'bg-green-500 shadow-sm shadow-green-500/50'
                : 'bg-red-500 animate-pulse'
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white capitalize">{myColor}</span>
              <span className="text-xs text-gray-400">vs</span>
              <span className="text-sm font-semibold text-gray-300 capitalize">
                {opponentColor}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {room
                ? `Room #${room.code} · ${room.timeControlMinutes} min + ${room.timeControlIncrement}s`
                : 'Ranked Match · 10 min'}
            </div>
          </div>
        </div>

        {/* Turn Indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              isMyTurn
                ? 'bg-board-light text-slate-900 border-board-light shadow-sm'
                : 'bg-surface-accent text-gray-300 border-surface-border'
            }`}
          >
            {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span>{isConnected ? 'Live' : 'Connecting...'}</span>
          </div>
        </div>
      </div>

      {/* Disconnection Warning Banner */}
      {opponentDisconnected && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-950/40 border border-amber-600/60 text-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold">Opponent Disconnected</p>
              <p className="text-xs text-amber-300/80">
                Waiting for opponent to reconnect. Forfeit win awarded in{' '}
                <span className="font-mono font-bold text-white">{countdownSeconds ?? 60}s</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Draw Offer Notification */}
      {drawOffered && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-blue-950/40 border border-blue-600/60 text-blue-200">
          <div className="flex items-center gap-3">
            <Handshake className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <p className="text-sm font-bold">Draw Offered</p>
              <p className="text-xs text-blue-300/80">Your opponent has proposed a draw.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => respondDraw(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-colors"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => respondDraw(false)}
              className="px-3 py-1.5 rounded-lg bg-surface-accent border border-surface-border text-xs font-semibold text-gray-300 hover:bg-surface-border transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Error notification */}
      {lastError && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-700/60 text-red-200 text-xs">
          {lastError}
        </div>
      )}

      {/* Chessboard & Controls Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-3 flex justify-center">
          <div className="w-full max-w-[560px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-surface-border bg-surface-card p-2 sm:p-4">
            <ChessboardView
              boardOrientation={myColor}
              gameState={activeGameState}
              onMove={handleMove}
              disabled={!isMyTurn || !isConnected || !!gameOver}
            />
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex flex-col gap-4 p-5 rounded-2xl bg-surface-card border border-surface-border">
          {/* Authoritative Match Clocks */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-base border border-surface-border">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300 mb-1">
              <Clock className="w-3.5 h-3.5 text-board-light" />
              <span>Authoritative Clock</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`p-2 rounded-lg text-center border transition-colors ${
                  activeClockColor === opponentColor
                    ? 'bg-board-dark/40 border-board-light text-board-light'
                    : 'bg-surface-accent border-surface-border text-gray-400'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  Opponent ({opponentColor})
                </div>
                <div className="text-lg font-mono font-black mt-0.5">
                  {formatClockTime(oppRemainingMs)}
                </div>
              </div>

              <div
                className={`p-2 rounded-lg text-center border transition-colors ${
                  activeClockColor === myColor
                    ? 'bg-board-dark/40 border-board-light text-board-light'
                    : 'bg-surface-accent border-surface-border text-gray-400'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  You ({myColor})
                </div>
                <div className="text-lg font-mono font-black mt-0.5">
                  {formatClockTime(myRemainingMs)}
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-board-light" />
            <span>Match Actions</span>
          </h3>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={!isConnected || !!gameOver}
              onClick={() => offerDraw()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-surface-accent border border-surface-border hover:bg-surface-border text-xs font-semibold text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Handshake className="w-4 h-4 text-gray-400" />
              <span>Offer Draw</span>
            </button>

            <button
              type="button"
              disabled={!isConnected || !!gameOver}
              onClick={() => {
                if (window.confirm('Are you sure you want to resign?')) {
                  resign();
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-950/40 border border-red-800/40 hover:bg-red-900/60 text-xs font-semibold text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Flag className="w-4 h-4 text-red-400" />
              <span>Resign Match</span>
            </button>
          </div>

          <div className="border-t border-surface-border pt-4">
            <button
              type="button"
              onClick={onExit}
              className="w-full py-2.5 px-3 rounded-xl bg-surface-base border border-surface-border hover:bg-surface-accent text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Exit to Lobby
            </button>
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-surface-card border border-surface-border p-6 sm:p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-board-dark/20 border border-board-dark/40 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-board-light" />
            </div>

            <h2 className="text-2xl font-black text-white capitalize">
              {gameOver.result === 'draw'
                ? 'Game Drawn'
                : gameOver.result === myColor
                  ? 'Victory!'
                  : 'Defeat'}
            </h2>

            <p className="mt-2 text-sm text-gray-300 capitalize">{gameOver.reason}</p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={onExit}
                className="w-full py-3 px-4 rounded-xl bg-board-light text-slate-900 font-bold text-sm hover:bg-white transition-colors cursor-pointer shadow-lg"
              >
                Return to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
