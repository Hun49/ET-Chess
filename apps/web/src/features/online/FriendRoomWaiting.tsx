import { Check, Clock, Copy, Play, Shield, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

export interface RoomData {
  id: string;
  code: string;
  hostUserId: string;
  guestUserId: string | null;
  timeControlMinutes: number;
  timeControlIncrement: number;
  hostColor: 'white' | 'black' | 'random';
  status: 'waiting' | 'ready' | 'active' | 'finished';
  whiteUserId?: string;
  blackUserId?: string;
}

export interface FriendRoomWaitingProps {
  initialRoom: RoomData;
  currentUserId: string;
  onGameActive: (room: RoomData) => void;
  onLeave: () => void;
}

export function FriendRoomWaiting({
  initialRoom,
  currentUserId,
  onGameActive,
  onLeave,
}: FriendRoomWaitingProps) {
  const [room, setRoom] = useState<RoomData>(initialRoom);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHost = currentUserId === room.hostUserId;
  const isGuest = currentUserId === room.guestUserId;

  // Poll room status every 2 seconds until active
  useEffect(() => {
    let timer: any = null;

    const poll = async () => {
      try {
        const data = await apiFetch<{ room: RoomData }>(`/rooms/${room.id}`);
        setRoom(data.room);
        if (data.room.status === 'active') {
          onGameActive(data.room);
        }
      } catch (_err: any) {
        // Silently retry
      }
    };

    timer = setInterval(poll, 2000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [room.id, onGameActive]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const copyLink = async () => {
    try {
      const link = `${window.location.origin}/online?join=${room.code}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleStartGame = async () => {
    setIsStarting(true);
    setError(null);
    try {
      const data = await apiFetch<{ success: boolean; room: RoomData }>(`/rooms/${room.id}/start`, {
        method: 'POST',
      });
      if (data.room) {
        onGameActive(data.room);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to start game');
      setIsStarting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 sm:p-8 rounded-2xl bg-surface-card border border-surface-border shadow-2xl text-white">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-board-dark/20 border border-board-dark/40 text-xs font-semibold text-board-light mb-3">
          <Users className="w-3.5 h-3.5" />
          <span>Friend Challenge Room</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Challenge a Friend</h2>
        <p className="mt-1 text-sm text-gray-300">
          Share this room code with your opponent to begin the match.
        </p>
      </div>

      {/* 6-Char Code Display */}
      <div className="mt-6 p-6 rounded-xl bg-surface-base border border-surface-border flex flex-col items-center justify-center">
        <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">
          Room Code
        </span>
        <div className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-board-light my-2 select-all">
          {room.code}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-3 w-full">
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-accent border border-surface-border hover:bg-surface-border text-xs font-medium text-gray-200 transition-colors"
          >
            {copiedCode ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-accent border border-surface-border hover:bg-surface-border text-xs font-medium text-gray-200 transition-colors"
          >
            {copiedLink ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
          </button>
        </div>
      </div>

      {/* Room Details & Participants */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-accent/60 border border-surface-border text-sm">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">Time Control</span>
          </div>
          <span className="font-semibold text-white">
            {room.timeControlMinutes} min + {room.timeControlIncrement}s
          </span>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-accent/60 border border-surface-border text-sm">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">Host Color</span>
          </div>
          <span className="font-semibold text-white capitalize">{room.hostColor}</span>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-accent/60 border border-surface-border text-sm">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                room.status === 'ready' || room.guestUserId
                  ? 'bg-green-500'
                  : 'bg-yellow-500 animate-pulse'
              }`}
            />
            <span className="text-gray-300">Opponent Status</span>
          </div>
          <span
            className={`font-semibold ${room.guestUserId ? 'text-green-400' : 'text-yellow-400'}`}
          >
            {room.guestUserId
              ? isGuest
                ? 'You are joined!'
                : 'Friend joined & ready!'
              : 'Waiting for friend...'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-700/50 text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
        {isHost ? (
          <button
            type="button"
            disabled={!room.guestUserId || isStarting}
            onClick={handleStartGame}
            className={`w-full flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all shadow-lg ${
              room.guestUserId && !isStarting
                ? 'bg-board-light text-slate-900 hover:bg-white cursor-pointer'
                : 'bg-surface-accent text-gray-500 border border-surface-border cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isStarting ? 'Starting Match...' : 'Start Match'}</span>
          </button>
        ) : (
          <div className="w-full flex-1 text-center py-3 text-xs text-gray-400 italic">
            Waiting for host to launch the game...
          </div>
        )}

        <button
          type="button"
          onClick={onLeave}
          className="w-full sm:w-auto px-4 py-3 rounded-xl bg-surface-accent border border-surface-border hover:bg-surface-border text-xs font-semibold text-gray-300 transition-colors"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}
