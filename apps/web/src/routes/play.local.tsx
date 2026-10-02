import { TIME_CONTROL_PRESETS, type TimeControlOption } from '@et-chess/config';
import { createRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Play, Users } from 'lucide-react';
import { useState } from 'react';
import { GameSessionView } from '../features/session/GameSessionView';
import { rootRoute } from './__root';

export const playLocalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/play/local',
  component: PlayLocalPage,
});

export function PlayLocalPage() {
  const [player1Name, setPlayer1Name] = useState('Player 1 (White)');
  const [player2Name, setPlayer2Name] = useState('Player 2 (Black)');
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlOption | null>(null);
  const [inGame, setInGame] = useState(false);

  if (inGame) {
    return (
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-green" />
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Local Pass & Play · {player1Name} vs {player2Name}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setInGame(false)}
            className="text-xs text-text-muted hover:text-text-primary px-2.5 py-1 rounded-lg border border-surface-border hover:bg-surface-accent transition"
          >
            End Game
          </button>
        </div>
        <GameSessionView
          mode="local"
          minutes={selectedTimeControl ? selectedTimeControl.minutes : 0}
          increment={selectedTimeControl ? selectedTimeControl.increment : 0}
          opponentName={player2Name}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors px-2.5 py-1.5 rounded-lg hover:bg-surface-accent border border-transparent hover:border-surface-border"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/10 border border-brand-green/30 text-brand-green text-xs font-semibold mb-3">
          <Users className="w-3.5 h-3.5" />
          <span>Over The Board</span>
        </div>
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Pass & Play</h1>
        <p className="text-sm text-text-muted max-w-md mx-auto mt-2">
          Play head-to-head on the same screen with automatic board flipping, legality enforcement,
          and custom clocks.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-md">
        {/* Player names */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="player-1-input"
              className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2"
            >
              White Player
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-base border border-surface-border">
              <div className="w-4 h-4 rounded-full bg-white border border-neutral-300" />
              <input
                id="player-1-input"
                type="text"
                data-testid="player1-name-input"
                value={player1Name}
                onChange={(e) => setPlayer1Name(e.target.value)}
                className="flex-1 bg-transparent text-sm font-medium text-text-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="player-2-input"
              className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2"
            >
              Black Player
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-base border border-surface-border">
              <div className="w-4 h-4 rounded-full bg-neutral-900 border border-neutral-700" />
              <input
                id="player-2-input"
                type="text"
                data-testid="player2-name-input"
                value={player2Name}
                onChange={(e) => setPlayer2Name(e.target.value)}
                className="flex-1 bg-transparent text-sm font-medium text-text-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Optional Time Control */}
        <div>
          <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Clock Option
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              data-testid="local-clock-none"
              onClick={() => setSelectedTimeControl(null)}
              className={`py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                selectedTimeControl === null
                  ? 'bg-surface-accent border-brand-green text-text-primary font-bold ring-1 ring-brand-green/30'
                  : 'bg-surface-base border-surface-border text-text-muted hover:text-text-primary'
              }`}
            >
              Untimed
            </button>
            {TIME_CONTROL_PRESETS.slice(2, 5).map((tc) => (
              <button
                key={tc.id}
                type="button"
                data-testid={`local-clock-${tc.id}`}
                onClick={() => setSelectedTimeControl(tc)}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  selectedTimeControl?.id === tc.id
                    ? 'bg-surface-accent border-brand-green text-text-primary font-bold ring-1 ring-brand-green/30'
                    : 'bg-surface-base border-surface-border text-text-muted hover:text-text-primary'
                }`}
              >
                {tc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          type="button"
          data-testid="start-local-match-btn"
          onClick={() => setInGame(true)}
          className="w-full py-3.5 px-6 rounded-xl bg-brand-green hover:bg-brand-green/90 text-white font-bold text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] mt-2"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Start Local Game</span>
        </button>
      </div>
    </div>
  );
}

export default PlayLocalPage;
