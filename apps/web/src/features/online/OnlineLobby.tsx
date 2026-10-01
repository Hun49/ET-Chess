import { type PlayerColor, SUPPORTED_TIME_CONTROLS } from '@et-chess/types';
import {
  Clock,
  LogIn,
  PlusCircle,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { useSession } from '../../lib/auth-client';
import { AuthModal } from '../auth/AuthModal';
import type { RoomData } from './FriendRoomWaiting';
import { type MatchFoundPayload, MatchmakingQueue } from './MatchmakingQueue';
import {
  TournamentBracketView,
  type TournamentData,
  type TournamentMatch,
} from './TournamentBracketView';

export interface OnlineLobbyProps {
  onRoomSelect: (room: RoomData) => void;
  onMatchFound?: (match: MatchFoundPayload) => void;
  onPlayTournamentMatch?: (match: TournamentMatch, myColor: PlayerColor) => void;
  initialJoinCode?: string;
}

export function OnlineLobby({
  onRoomSelect,
  onMatchFound,
  onPlayTournamentMatch,
  initialJoinCode,
}: OnlineLobbyProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'friend' | 'quick' | 'tournaments'>('friend');
  const [isQueueing, setIsQueueing] = useState(false);

  // Tournament state
  const [tournamentList, setTournamentList] = useState<
    { id: string; name: string; status: string; createdAt: string }[]
  >([]);
  const [activeTournament, setActiveTournament] = useState<TournamentData | null>(null);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [isCreatingTourney, setIsCreatingTourney] = useState(false);
  const [isLoadingTourneys, setIsLoadingTourneys] = useState(false);

  // Friend challenge state
  const [timeControlMinutes, setTimeControlMinutes] = useState(10);
  const [timeControlIncrement, setTimeControlIncrement] = useState(0);
  const [hostColor, setHostColor] = useState<'white' | 'black' | 'random'>('random');
  const [joinCode, setJoinCode] = useState(initialJoinCode || '');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleCreateRoom = async () => {
    if (!session?.user) {
      setShowAuthModal(true);
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    try {
      const data = await apiFetch<{ room: RoomData }>('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          timeControlMinutes,
          timeControlIncrement,
          hostColor,
        }),
      });
      onRoomSelect(data.room);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create room');
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      setShowAuthModal(true);
      return;
    }

    const trimmed = joinCode.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setErrorMessage('Room code must be exactly 6 characters');
      return;
    }

    setIsJoining(true);
    setErrorMessage(null);
    try {
      const data = await apiFetch<{ room: RoomData }>(`/rooms/${trimmed}/join`, {
        method: 'POST',
      });
      onRoomSelect(data.room);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to join room');
      setIsJoining(false);
    }
  };

  const loadTournaments = useCallback(async () => {
    setIsLoadingTourneys(true);
    try {
      const data = await apiFetch<{ tournaments: any[] }>('/tournaments');
      setTournamentList(data.tournaments);
    } catch {
      // Ignored
    } finally {
      setIsLoadingTourneys(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'tournaments') {
      loadTournaments();
    }
  }, [activeTab, loadTournaments]);

  // Poll active tournament state if viewing one
  useEffect(() => {
    if (!activeTournament || activeTournament.status === 'finished') return;

    const interval = setInterval(async () => {
      try {
        const data = await apiFetch<{ tournament: TournamentData }>(
          `/tournaments/${activeTournament.id}`,
        );
        if (data.tournament) {
          setActiveTournament(data.tournament);
        }
      } catch {
        // Silently retry
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeTournament]);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      setShowAuthModal(true);
      return;
    }

    if (!newTournamentName.trim()) return;

    setIsCreatingTourney(true);
    setErrorMessage(null);
    try {
      const data = await apiFetch<{ tournament: TournamentData }>('/tournaments', {
        method: 'POST',
        body: JSON.stringify({ name: newTournamentName.trim() }),
      });
      setActiveTournament(data.tournament);
      setNewTournamentName('');
      loadTournaments();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create tournament');
    } finally {
      setIsCreatingTourney(false);
    }
  };

  const handleSelectTournament = async (id: string) => {
    try {
      const data = await apiFetch<{ tournament: TournamentData }>(`/tournaments/${id}`);
      setActiveTournament(data.tournament);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load tournament');
    }
  };

  const handleJoinTournament = async (id: string) => {
    if (!session?.user) {
      setShowAuthModal(true);
      return;
    }

    try {
      const data = await apiFetch<{ tournament: TournamentData }>(`/tournaments/${id}/join`, {
        method: 'POST',
      });
      setActiveTournament(data.tournament);
      loadTournaments();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to join tournament');
    }
  };

  const handleStartTournament = async (id: string) => {
    try {
      const data = await apiFetch<{ tournament: TournamentData }>(`/tournaments/${id}/start`, {
        method: 'POST',
      });
      setActiveTournament(data.tournament);
      loadTournaments();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to start tournament');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header Banner */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-board-dark/20 border border-board-dark/40 text-xs font-semibold text-board-light mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multiplayer Arena 2.0</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Online Battleground
        </h1>
        <p className="mt-2 text-sm text-gray-300 max-w-lg mx-auto">
          Challenge friends via shareable invite codes, compete in ranked matchmaking, or join
          single-elimination tournament brackets.
        </p>
      </div>

      {/* Auth Banner if not signed in */}
      {!session?.user && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-surface-card border border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-board-dark/25 border border-board-dark/40 flex items-center justify-center text-board-light">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Sign In Required for Multiplayer</p>
              <p className="text-xs text-gray-400">
                Create an account or sign in to track your Elo rating and host live matches.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-board-light text-slate-900 font-bold text-xs hover:bg-white transition-colors cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-surface-border">
        <button
          type="button"
          onClick={() => setActiveTab('friend')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'friend'
              ? 'border-board-light text-board-light'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Friend Challenge</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quick')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'quick'
              ? 'border-board-light text-board-light'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Random Matchmaking</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tournaments')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'tournaments'
              ? 'border-board-light text-board-light'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Tournaments</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-700/60 text-red-200 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Tab 1: Friend Challenge */}
      {activeTab === 'friend' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Room Box */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-board-dark/25 border border-board-dark/40 flex items-center justify-center text-board-light">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create Challenge</h3>
                  <p className="text-xs text-gray-400">Generate a unique 6-character room code</p>
                </div>
              </div>

              {/* Time Control Presets */}
              <div className="mt-4">
                <div className="block text-xs font-semibold text-gray-300 mb-2">Time Control</div>
                <div className="grid grid-cols-3 gap-2">
                  {SUPPORTED_TIME_CONTROLS.map((preset) => {
                    const isSelected =
                      timeControlMinutes === preset.minutes &&
                      timeControlIncrement === preset.incrementSeconds;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setTimeControlMinutes(preset.minutes);
                          setTimeControlIncrement(preset.incrementSeconds);
                        }}
                        className={`py-2 px-2.5 rounded-xl text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-board-dark/30 border-board-light text-board-light font-bold'
                            : 'bg-surface-accent border-surface-border text-gray-300 hover:bg-surface-border'
                        }`}
                      >
                        {preset.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Preference */}
              <div className="mt-5">
                <div className="block text-xs font-semibold text-gray-300 mb-2">
                  Your Color Preference
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['white', 'random', 'black'] as const).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setHostColor(color)}
                      className={`py-2 px-2.5 rounded-xl text-xs capitalize font-medium border transition-colors ${
                        hostColor === color
                          ? 'bg-board-dark/30 border-board-light text-board-light font-bold'
                          : 'bg-surface-accent border-surface-border text-gray-300 hover:bg-surface-border'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isCreating}
              onClick={handleCreateRoom}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-board-light text-slate-900 font-bold text-sm hover:bg-white transition-colors cursor-pointer shadow-lg disabled:opacity-50"
            >
              {isCreating ? 'Creating Room...' : 'Create Room & Invite'}
            </button>
          </div>

          {/* Join Room Box */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-surface-accent border border-surface-border flex items-center justify-center text-gray-300">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Join Challenge</h3>
                  <p className="text-xs text-gray-400">Enter a 6-character invite code</p>
                </div>
              </div>

              <form onSubmit={handleJoinRoom} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="join-room-code-input"
                    className="block text-xs font-semibold text-gray-300 mb-2"
                  >
                    Room Code
                  </label>
                  <input
                    id="join-room-code-input"
                    type="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCXYZ"
                    className="w-full text-center tracking-widest text-2xl font-mono font-bold uppercase py-3 px-4 rounded-xl bg-surface-base border border-surface-border text-white focus:outline-none focus:border-board-light"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isJoining || joinCode.trim().length !== 6}
                  className="w-full py-3 px-4 rounded-xl bg-surface-accent border border-surface-border text-white font-bold text-sm hover:bg-surface-border transition-colors cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? 'Joining Room...' : 'Join Match'}
                </button>
              </form>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-surface-base border border-surface-border text-xs text-gray-400">
              <span className="font-semibold text-gray-300 block mb-1">How it works:</span>
              Once you enter a friend's room code, you will automatically be paired and enter the
              waiting room. The host will launch the match when both of you are ready.
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Quick Matchmaking */}
      {activeTab === 'quick' &&
        (isQueueing ? (
          <MatchmakingQueue
            currentUserId={session?.user?.id || 'guest'}
            displayName={session?.user?.name || 'Player'}
            onMatchFound={(match) => {
              setIsQueueing(false);
              onMatchFound?.(match);
            }}
            onCancel={() => setIsQueueing(false)}
          />
        ) : (
          <div className="p-8 rounded-3xl bg-surface-card border border-surface-border text-center max-w-xl mx-auto shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-board-dark/20 border border-board-dark/40 flex items-center justify-center text-board-light mx-auto mb-4">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white">Ranked Matchmaking</h3>
            <p className="mt-2 text-sm text-gray-300 max-w-md mx-auto">
              Find a rated opponent instantly. The system dynamically pairs players within ±200
              rating points, expanding by 50 points every 15 seconds.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-base border border-surface-border">
                <Clock className="w-3.5 h-3.5 text-board-light" />
                <span>10+0 Rapid</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-base border border-surface-border">
                <Shield className="w-3.5 h-3.5 text-board-light" />
                <span>Rated Match (K=32)</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!session?.user) {
                  setShowAuthModal(true);
                  return;
                }
                setIsQueueing(true);
              }}
              className="mt-8 w-full max-w-sm mx-auto py-3.5 px-6 rounded-xl bg-board-light hover:bg-white text-slate-900 font-extrabold text-sm transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-slate-900" />
              <span>Find Match</span>
            </button>
          </div>
        ))}

      {/* Tab 3: Tournaments */}
      {activeTab === 'tournaments' &&
        (activeTournament ? (
          <TournamentBracketView
            tournament={activeTournament}
            currentUserId={session?.user?.id || 'anon'}
            onStartTournament={() => handleStartTournament(activeTournament.id)}
            onPlayMatch={(match, myColor) => onPlayTournamentMatch?.(match, myColor)}
            onBack={() => {
              setActiveTournament(null);
              loadTournaments();
            }}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {/* Create Tournament Form */}
            <div className="p-6 rounded-2xl bg-surface-card border border-surface-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-board-dark/20 border border-board-dark/40 flex items-center justify-center text-board-light">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Create Single-Elimination Tournament
                  </h3>
                  <p className="text-xs text-gray-400">
                    Host a bracket with automatic seeding, power-of-2 byes, and round progression.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateTournament} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  placeholder="e.g. Masters Spring Open 2026"
                  maxLength={50}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-surface-base border border-surface-border text-white text-sm focus:outline-none focus:border-board-light"
                />
                <button
                  type="submit"
                  disabled={isCreatingTourney || !newTournamentName.trim()}
                  className="py-2.5 px-6 rounded-xl bg-board-light hover:bg-white text-slate-900 font-bold text-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow"
                >
                  <Trophy className="w-4 h-4 fill-slate-900" />
                  <span>{isCreatingTourney ? 'Creating...' : 'Create Tournament'}</span>
                </button>
              </form>
            </div>

            {/* Tournaments List */}
            <div className="p-6 rounded-2xl bg-surface-card border border-surface-border">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-board-light" />
                <span>Open & Recent Tournaments</span>
              </h3>

              {isLoadingTourneys && (
                <p className="text-xs text-gray-400 py-4 text-center">Loading tournaments...</p>
              )}

              {!isLoadingTourneys && tournamentList.length === 0 && (
                <div className="py-8 text-center text-gray-400 text-xs">
                  No tournaments found. Create one above to get started!
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournamentList.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl bg-surface-base border border-surface-border flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            t.status === 'registering'
                              ? 'bg-amber-950/60 border border-amber-600/60 text-amber-300'
                              : t.status === 'in-progress'
                                ? 'bg-green-950/60 border border-green-600/60 text-green-300'
                                : 'bg-board-dark/30 border border-board-light/40 text-board-light'
                          }`}
                        >
                          {t.status}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white mt-1">{t.name}</h4>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-surface-border/50">
                      <button
                        type="button"
                        onClick={() => handleSelectTournament(t.id)}
                        className="flex-1 py-2 px-3 rounded-lg bg-surface-accent border border-surface-border text-xs font-semibold text-white hover:bg-surface-border transition-colors cursor-pointer"
                      >
                        View Bracket
                      </button>
                      {t.status === 'registering' && (
                        <button
                          type="button"
                          onClick={() => handleJoinTournament(t.id)}
                          className="py-2 px-4 rounded-lg bg-board-light hover:bg-white text-slate-900 text-xs font-bold transition-colors cursor-pointer shadow"
                        >
                          Join
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}
