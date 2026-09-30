import type { PlayerColor } from '@et-chess/types';
import { ArrowLeft, Crown, Play, Trophy, Users } from 'lucide-react';

export interface TournamentPlayer {
  userId: string;
  displayName: string;
  rating: number;
  seed: number;
}

export interface TournamentMatch {
  id: string;
  round: number;
  matchNumber: number;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winner: TournamentPlayer | null;
  status: 'scheduled' | 'active' | 'finished';
  gameId: string | null;
}

export interface TournamentData {
  id: string;
  name: string;
  status: 'registering' | 'in-progress' | 'finished';
  participants: TournamentPlayer[];
  matches: TournamentMatch[];
  currentRound: number;
  totalRounds: number;
  winner: TournamentPlayer | null;
  createdAt: number;
}

export interface TournamentBracketViewProps {
  tournament: TournamentData;
  currentUserId: string;
  onStartTournament?: () => void;
  onPlayMatch?: (match: TournamentMatch, myColor: PlayerColor) => void;
  onBack?: () => void;
}

export function TournamentBracketView({
  tournament,
  currentUserId,
  onStartTournament,
  onPlayMatch,
  onBack,
}: TournamentBracketViewProps) {
  // Group matches by round
  const rounds: { [round: number]: TournamentMatch[] } = {};
  for (const m of tournament.matches) {
    if (!rounds[m.round]) {
      rounds[m.round] = [];
    }
    rounds[m.round]?.push(m);
  }

  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);

  const getRoundTitle = (round: number, total: number) => {
    if (round === total) return 'Finals';
    if (round === total - 1) return 'Semifinals';
    if (round === total - 2) return 'Quarterfinals';
    return `Round ${round}`;
  };

  const isHost =
    tournament.participants.length > 0 && tournament.participants[0]?.userId === currentUserId;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-surface-card border border-surface-border shadow-lg">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-surface-accent border border-surface-border text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  tournament.status === 'registering'
                    ? 'bg-amber-950/60 border border-amber-600/60 text-amber-300'
                    : tournament.status === 'in-progress'
                      ? 'bg-green-950/60 border border-green-600/60 text-green-300'
                      : 'bg-board-dark/30 border border-board-light/40 text-board-light'
                }`}
              >
                {tournament.status}
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {tournament.participants.length} Participants
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">{tournament.name}</h2>
          </div>
        </div>

        {/* Action button if tournament registering */}
        {tournament.status === 'registering' && (
          <div className="flex items-center gap-3">
            {isHost && (
              <button
                type="button"
                disabled={tournament.participants.length < 2}
                onClick={onStartTournament}
                className="py-2.5 px-5 rounded-xl bg-board-light hover:bg-white text-slate-900 font-extrabold text-sm transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-900" />
                <span>Start Tournament</span>
              </button>
            )}
          </div>
        )}

        {/* Winner Banner if finished */}
        {tournament.status === 'finished' && tournament.winner && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200">
            <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs text-amber-300/80 uppercase font-bold tracking-wider">
                Champion
              </p>
              <p className="text-sm font-extrabold text-white">{tournament.winner.displayName}</p>
            </div>
          </div>
        )}
      </div>

      {/* Registration State List */}
      {tournament.status === 'registering' && (
        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-board-light" />
            <span>Registered Players ({tournament.participants.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tournament.participants.map((player) => (
              <div
                key={player.userId}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-base border border-surface-border"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-surface-accent flex items-center justify-center text-xs font-mono font-bold text-gray-400">
                    #{player.seed}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {player.displayName}
                    {player.userId === currentUserId && (
                      <span className="ml-1.5 text-xs text-board-light font-normal">(You)</span>
                    )}
                  </span>
                </div>
                <span className="text-xs font-mono text-gray-400">{player.rating} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bracket Tree View */}
      {tournament.status !== 'registering' && (
        <div className="w-full overflow-x-auto pb-4">
          <div className="min-w-[700px] flex gap-8 items-start py-2">
            {roundNumbers.map((rNum) => {
              const matchesInRound = rounds[rNum] ?? [];
              const title = getRoundTitle(rNum, tournament.totalRounds);

              return (
                <div key={rNum} className="flex-1 flex flex-col gap-4">
                  {/* Round Header */}
                  <div className="text-center pb-2 border-b border-surface-border">
                    <h4 className="text-sm font-extrabold text-board-light uppercase tracking-wider">
                      {title}
                    </h4>
                  </div>

                  {/* Matches Column */}
                  <div className="flex flex-col justify-around gap-6 h-full">
                    {matchesInRound.map((m) => {
                      const isUserInMatch =
                        m.player1?.userId === currentUserId || m.player2?.userId === currentUserId;
                      const isMyMatchPlayable =
                        isUserInMatch && m.status !== 'finished' && m.player1 && m.player2;

                      const myColor: PlayerColor =
                        m.player1?.userId === currentUserId ? 'white' : 'black';

                      return (
                        <div
                          key={m.id}
                          className={`rounded-2xl border transition-all ${
                            isUserInMatch
                              ? 'bg-surface-accent/70 border-board-light/60 shadow-lg'
                              : 'bg-surface-card border-surface-border'
                          } p-4 flex flex-col gap-2`}
                        >
                          {/* Match Header */}
                          <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono mb-1">
                            <span>Match #{m.matchNumber}</span>
                            <span
                              className={`font-semibold ${
                                m.status === 'finished'
                                  ? 'text-gray-500'
                                  : m.status === 'active'
                                    ? 'text-green-400'
                                    : 'text-amber-400'
                              }`}
                            >
                              {m.status}
                            </span>
                          </div>

                          {/* Player 1 */}
                          <div
                            className={`flex items-center justify-between p-2 rounded-xl text-xs ${
                              m.winner?.userId === m.player1?.userId
                                ? 'bg-board-dark/25 font-bold text-board-light'
                                : 'text-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {m.winner?.userId === m.player1?.userId && (
                                <Crown className="w-3.5 h-3.5 text-amber-400" />
                              )}
                              <span>{m.player1 ? m.player1.displayName : 'TBD'}</span>
                            </div>
                            <span className="font-mono text-gray-400">
                              {m.player1 ? `${m.player1.rating}` : '-'}
                            </span>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-surface-border my-0.5" />

                          {/* Player 2 or Bye */}
                          <div
                            className={`flex items-center justify-between p-2 rounded-xl text-xs ${
                              m.winner?.userId === m.player2?.userId
                                ? 'bg-board-dark/25 font-bold text-board-light'
                                : 'text-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {m.winner?.userId === m.player2?.userId && (
                                <Crown className="w-3.5 h-3.5 text-amber-400" />
                              )}
                              <span>
                                {m.player2
                                  ? m.player2.displayName
                                  : m.round === 1 && !m.player2
                                    ? 'BYE (Advances)'
                                    : 'TBD'}
                              </span>
                            </div>
                            <span className="font-mono text-gray-400">
                              {m.player2 ? `${m.player2.rating}` : '-'}
                            </span>
                          </div>

                          {/* Play Match Button */}
                          {isMyMatchPlayable && onPlayMatch && (
                            <button
                              type="button"
                              onClick={() => onPlayMatch(m, myColor)}
                              className="mt-2 w-full py-2 px-3 rounded-xl bg-board-light hover:bg-white text-slate-900 font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow"
                            >
                              <Play className="w-3.5 h-3.5 fill-slate-900" />
                              <span>Play Your Match</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
