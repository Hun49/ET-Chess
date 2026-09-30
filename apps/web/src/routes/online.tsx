import type { PlayerColor } from '@et-chess/types';
import { createRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FriendRoomWaiting, type RoomData } from '../features/online/FriendRoomWaiting';
import { OnlineGameView } from '../features/online/OnlineGameView';
import { OnlineLobby } from '../features/online/OnlineLobby';
import { apiFetch } from '../lib/api-client';
import { useSession } from '../lib/auth-client';
import { rootRoute } from './__root';

export interface OnlineSearchParams {
  roomId?: string;
  join?: string;
}

export function parseOnlineSearchParams(search: Record<string, unknown>): OnlineSearchParams {
  return {
    roomId: typeof search.roomId === 'string' ? search.roomId : undefined,
    join: typeof search.join === 'string' ? search.join : undefined,
  };
}

export const onlineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/online',
  validateSearch: parseOnlineSearchParams,
  component: OnlinePage,
});

function OnlinePage() {
  const { roomId, join } = onlineRoute.useSearch();
  const navigate = useNavigate();
  const { data: session } = useSession();

  const [activeRoom, setActiveRoom] = useState<RoomData | null>(null);
  const [activeMatch, setActiveMatch] = useState<{
    gameId: string;
    yourColor: PlayerColor;
  } | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch room details if roomId is provided
  useEffect(() => {
    if (!roomId) {
      setActiveRoom(null);
      return;
    }

    let isMounted = true;
    setIsLoadingRoom(true);
    setLoadError(null);

    apiFetch<{ room: RoomData }>(`/rooms/${roomId}`)
      .then((data) => {
        if (isMounted) {
          setActiveRoom(data.room);
          setIsLoadingRoom(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(err?.message || 'Could not load room');
          setIsLoadingRoom(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  const handleRoomSelected = (room: RoomData) => {
    setActiveRoom(room);
    setActiveMatch(null);
    navigate({
      to: '/online',
      search: { roomId: room.id },
    });
  };

  const handleExitToLobby = () => {
    setActiveRoom(null);
    setActiveMatch(null);
    navigate({
      to: '/online',
      search: {},
    });
  };

  const currentUserId = session?.user?.id || 'anonymous';
  const displayName = session?.user?.name || 'Player';

  return (
    <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
      {/* Back button when inside a room or match */}
      {(activeRoom || activeMatch) && (
        <div className="mb-4">
          <button
            type="button"
            onClick={handleExitToLobby}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-accent border border-transparent hover:border-surface-border cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Online Lobby</span>
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoadingRoom && (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-board-light animate-spin mb-3" />
          <p className="text-sm text-gray-400">Loading room state...</p>
        </div>
      )}

      {/* Error State */}
      {loadError && (
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border text-center max-w-md mx-auto my-12">
          <p className="text-sm font-semibold text-red-300 mb-4">{loadError}</p>
          <button
            type="button"
            onClick={handleExitToLobby}
            className="px-4 py-2 rounded-xl bg-surface-accent border border-surface-border text-xs font-bold text-white hover:bg-surface-border transition-colors cursor-pointer"
          >
            Return to Lobby
          </button>
        </div>
      )}

      {/* Active Room: Waiting Screen */}
      {!isLoadingRoom &&
        !loadError &&
        activeRoom &&
        (activeRoom.status === 'waiting' || activeRoom.status === 'ready') && (
          <FriendRoomWaiting
            initialRoom={activeRoom}
            currentUserId={currentUserId}
            onGameActive={(updated) => setActiveRoom(updated)}
            onLeave={handleExitToLobby}
          />
        )}

      {/* Active Room: Live Game Screen */}
      {!isLoadingRoom && !loadError && activeRoom && activeRoom.status === 'active' && (
        <OnlineGameView
          room={activeRoom}
          currentUserId={currentUserId}
          displayName={displayName}
          onExit={handleExitToLobby}
        />
      )}

      {/* Active Ranked Match: Live Game Screen */}
      {!isLoadingRoom && !loadError && !activeRoom && activeMatch && (
        <OnlineGameView
          gameId={activeMatch.gameId}
          myColor={activeMatch.yourColor}
          currentUserId={currentUserId}
          displayName={displayName}
          onExit={handleExitToLobby}
        />
      )}

      {/* Default: Online Lobby */}
      {!isLoadingRoom && !activeRoom && !activeMatch && (
        <OnlineLobby
          onRoomSelect={handleRoomSelected}
          onMatchFound={(match) =>
            setActiveMatch({ gameId: match.gameId, yourColor: match.yourColor })
          }
          onPlayTournamentMatch={(match, myColor) =>
            setActiveMatch({
              gameId: match.gameId || match.id,
              yourColor: myColor,
            })
          }
          initialJoinCode={join}
        />
      )}
    </div>
  );
}
