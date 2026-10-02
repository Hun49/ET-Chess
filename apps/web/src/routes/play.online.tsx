import { TIME_CONTROL_PRESETS, type TimeControlOption } from '@et-chess/config';
import { createRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle2, Clock, Globe, Loader2, Swords, X } from 'lucide-react';
import { useState } from 'react';
import { GameSessionView } from '../features/session/GameSessionView';
import { type MockOpponent, simulateMatchmaking } from '../mocks/gameSessionMocks';
import { rootRoute } from './__root';

export const playOnlineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/play/online',
  component: PlayOnlinePage,
});

type QueueState = 'idle' | 'searching' | 'matched' | 'in-game';

export function PlayOnlinePage() {
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlOption>(
    TIME_CONTROL_PRESETS[2] ??
      TIME_CONTROL_PRESETS[0] ?? { label: '3 min', minutes: 3, increment: 0, category: 'blitz' },
  );
  const [queueState, setQueueState] = useState<QueueState>('idle');
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [matchedOpponent, setMatchedOpponent] = useState<MockOpponent | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const startMatchmaking = async () => {
    setQueueState('searching');
    setSearchSeconds(0);

    const controller = new AbortController();
    setAbortController(controller);

    const timer = setInterval(() => {
      setSearchSeconds((s) => s + 1);
    }, 1000);

    try {
      const opp = await simulateMatchmaking({
        targetRating: 1500,
        delayMs: 1400,
        signal: controller.signal,
      });
      clearInterval(timer);
      setMatchedOpponent(opp);
      setQueueState('matched');

      // Brief transition to celebrate match before entering board
      setTimeout(() => {
        setQueueState('in-game');
      }, 900);
    } catch {
      clearInterval(timer);
      setQueueState('idle');
    }
  };

  const cancelMatchmaking = () => {
    if (abortController) {
      abortController.abort();
    }
    setQueueState('idle');
  };

  if (queueState === 'in-game' && matchedOpponent) {
    return (
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-green animate-pulse" />
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Online Match ({selectedTimeControl.label})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setQueueState('idle')}
            className="text-xs text-text-muted hover:text-text-primary px-2.5 py-1 rounded-lg border border-surface-border hover:bg-surface-accent transition"
          >
            Leave Match
          </button>
        </div>
        <GameSessionView
          mode="online"
          minutes={selectedTimeControl.minutes}
          increment={selectedTimeControl.increment}
          opponentName={matchedOpponent.displayName}
          opponentRating={matchedOpponent.rating}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
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
          <Globe className="w-3.5 h-3.5" />
          <span>Live Multiplayer</span>
        </div>
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Play Online</h1>
        <p className="text-sm text-text-muted max-w-md mx-auto mt-2">
          Select your preferred time control and jump into instant matchmaking against rated
          players.
        </p>
      </div>

      {queueState === 'idle' ? (
        <div className="flex flex-col gap-6">
          {/* Time control tabs by category */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Select Time Control
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TIME_CONTROL_PRESETS.map((tc) => {
                const isSelected = selectedTimeControl.id === tc.id;
                return (
                  <button
                    key={tc.id}
                    type="button"
                    data-testid={`time-control-${tc.id}`}
                    onClick={() => setSelectedTimeControl(tc)}
                    className={`p-4 rounded-xl text-left transition border flex flex-col justify-between h-28 cursor-pointer ${
                      isSelected
                        ? 'bg-surface-accent border-brand-green ring-2 ring-brand-green/30 shadow-md'
                        : 'bg-surface-card border-surface-border hover:border-text-muted/40 hover:bg-surface-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold font-mono text-text-primary">
                        {tc.label}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-surface-base border border-surface-border text-text-muted">
                        {tc.category}
                      </span>
                    </div>
                    <span className="text-xs text-text-muted">{tc.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Big Action button */}
          <div className="mt-4 flex flex-col items-center">
            <button
              type="button"
              data-testid="find-match-btn"
              onClick={startMatchmaking}
              className="w-full sm:w-80 py-4 px-6 rounded-2xl bg-brand-green hover:bg-brand-green/90 text-white font-bold text-lg shadow-lg hover:shadow-brand-green/20 transition flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99]"
            >
              <Swords className="w-5 h-5" />
              <span>Find Opponent ({selectedTimeControl.label})</span>
            </button>
            <p className="text-xs text-text-muted mt-3">
              Estimated wait time: ~2 seconds · Casual & Ranked
            </p>
          </div>
        </div>
      ) : queueState === 'searching' ? (
        /* Searching Queue Screen */
        <div
          data-testid="matchmaking-searching"
          className="bg-surface-card border border-surface-border rounded-2xl p-8 text-center flex flex-col items-center shadow-lg animate-fade-in"
        >
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-brand-green/10 border-2 border-brand-green/30 flex items-center justify-center text-brand-green">
              <Loader2 className="w-10 h-10 animate-spin text-brand-green" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-text-primary mb-1">Searching for Opponent...</h3>
          <p className="text-sm text-text-muted mb-4">
            Matching by rating ({selectedTimeControl.label} · Blitz)
          </p>

          <div className="inline-flex items-center gap-2 font-mono text-sm px-3 py-1.5 rounded-lg bg-surface-base border border-surface-border text-text-primary mb-8">
            <Clock className="w-4 h-4 text-text-muted" />
            <span>Time elapsed: 0:{searchSeconds < 10 ? `0${searchSeconds}` : searchSeconds}</span>
          </div>

          <button
            type="button"
            data-testid="cancel-matchmaking-btn"
            onClick={cancelMatchmaking}
            className="py-2.5 px-6 rounded-xl bg-surface-accent hover:bg-surface-border text-text-primary text-sm font-semibold transition border border-surface-border flex items-center gap-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Cancel Search</span>
          </button>
        </div>
      ) : (
        /* Match Found Screen */
        <div
          data-testid="match-found"
          className="bg-surface-card border border-brand-green/50 rounded-2xl p-8 text-center flex flex-col items-center shadow-2xl animate-fade-in ring-2 ring-brand-green/30"
        >
          <div className="w-16 h-16 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-text-primary mb-1">Opponent Found!</h3>
          <p className="text-sm text-text-muted mb-4">Connecting to board...</p>

          {matchedOpponent && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-base border border-surface-border mb-4">
              <div className="w-10 h-10 rounded-lg bg-board-dark text-white font-bold flex items-center justify-center">
                {matchedOpponent.displayName[0]}
              </div>
              <div className="text-left">
                <span className="text-sm font-bold text-text-primary block">
                  {matchedOpponent.displayName}
                </span>
                <span className="text-xs text-text-muted font-mono">
                  Rating {matchedOpponent.rating}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayOnlinePage;
