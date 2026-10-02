import { TIME_CONTROL_PRESETS, type TimeControlOption } from '@et-chess/config';
import { createRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Check, Copy, Loader2, Share2, Users } from 'lucide-react';
import { useState } from 'react';
import { GameSessionView } from '../features/session/GameSessionView';
import { rootRoute } from './__root';

export const playFriendRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/play/friend',
  component: PlayFriendPage,
});

type FriendFlowState = 'config' | 'waiting' | 'in-game';

export function PlayFriendPage() {
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlOption>(
    TIME_CONTROL_PRESETS[6] ??
      TIME_CONTROL_PRESETS[0] ?? { label: '10 min', minutes: 10, increment: 0, category: 'rapid' },
  );
  const [preferredColor, setPreferredColor] = useState<'white' | 'black' | 'random'>('random');
  const [flowState, setFlowState] = useState<FriendFlowState>('config');
  const [roomCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [copied, setCopied] = useState(false);

  const challengeUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/play/friend?join=${roomCode}`
      : `https://et-chess.com/play/friend?join=${roomCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(challengeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleStartWaiting = () => {
    setFlowState('waiting');
  };

  const handleStartMatch = () => {
    setFlowState('in-game');
  };

  if (flowState === 'in-game') {
    return (
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-green" />
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Friend Match · Room {roomCode} ({selectedTimeControl.label})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFlowState('config')}
            className="text-xs text-text-muted hover:text-text-primary px-2.5 py-1 rounded-lg border border-surface-border hover:bg-surface-accent transition"
          >
            End Challenge
          </button>
        </div>
        <GameSessionView
          mode="friend"
          minutes={selectedTimeControl.minutes}
          increment={selectedTimeControl.increment}
          opponentName="Friend (Challenger)"
          opponentRating={1480}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8">
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
          <span>Direct Challenge</span>
        </div>
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Play a Friend</h1>
        <p className="text-sm text-text-muted max-w-md mx-auto mt-2">
          Create an instant invite link and play a custom match against anyone with zero setup.
        </p>
      </div>

      {flowState === 'config' ? (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-md">
          {/* Time control */}
          <div>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Select Time Control
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {TIME_CONTROL_PRESETS.slice(0, 8).map((tc) => (
                <button
                  key={tc.id}
                  type="button"
                  data-testid={`friend-tc-${tc.id}`}
                  onClick={() => setSelectedTimeControl(tc)}
                  className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                    selectedTimeControl.id === tc.id
                      ? 'bg-surface-accent border-brand-green text-text-primary font-bold ring-1 ring-brand-green/30'
                      : 'bg-surface-base border-surface-border text-text-muted hover:text-text-primary hover:bg-surface-accent/50'
                  }`}
                >
                  <span className="text-sm font-bold block">{tc.label}</span>
                  <span className="text-[10px] text-text-muted uppercase">{tc.category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Choice */}
          <div>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Your Color
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {(['white', 'random', 'black'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  data-testid={`color-choice-${c}`}
                  onClick={() => setPreferredColor(c)}
                  className={`p-3 rounded-xl border text-center transition capitalize cursor-pointer flex flex-col items-center gap-1.5 ${
                    preferredColor === c
                      ? 'bg-surface-accent border-brand-green text-text-primary font-bold ring-1 ring-brand-green/30'
                      : 'bg-surface-base border-surface-border text-text-muted hover:text-text-primary hover:bg-surface-accent/50'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full border ${
                      c === 'white'
                        ? 'bg-white border-neutral-300'
                        : c === 'black'
                          ? 'bg-neutral-900 border-neutral-700'
                          : 'bg-gradient-to-r from-white to-neutral-900 border-neutral-400'
                    }`}
                  />
                  <span className="text-xs font-medium">{c}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <button
            type="button"
            data-testid="create-friend-challenge-btn"
            onClick={handleStartWaiting}
            className="w-full py-3.5 px-6 rounded-xl bg-brand-green hover:bg-brand-green/90 text-white font-bold text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] mt-2"
          >
            <Share2 className="w-5 h-5" />
            <span>Generate Invite Link</span>
          </button>
        </div>
      ) : (
        /* Waiting for Friend */
        <div
          data-testid="waiting-friend-card"
          className="bg-surface-card border border-surface-border rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center shadow-lg animate-fade-in"
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>

          <h3 className="text-xl font-bold text-text-primary mb-1">Waiting for Friend...</h3>
          <p className="text-xs text-text-muted mb-6">
            Share this invite link with your friend to start playing immediately.
          </p>

          {/* Link Copy Box */}
          <div className="w-full max-w-md flex items-center gap-2 p-2 rounded-xl bg-surface-base border border-surface-border mb-6">
            <input
              type="text"
              readOnly
              value={challengeUrl}
              className="flex-1 bg-transparent px-2 text-xs font-mono text-text-primary focus:outline-none select-all"
            />
            <button
              type="button"
              data-testid="copy-link-btn"
              onClick={handleCopyLink}
              className="py-2 px-3 rounded-lg bg-surface-accent hover:bg-surface-border text-text-primary text-xs font-semibold transition border border-surface-border flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-brand-green" />
                  <span className="text-brand-green">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
            <button
              type="button"
              data-testid="simulate-friend-join-btn"
              onClick={handleStartMatch}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-brand-green hover:bg-brand-green/90 text-white text-sm font-semibold transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Users className="w-4 h-4" />
              <span>Start Match (Friend Joined)</span>
            </button>
            <button
              type="button"
              onClick={() => setFlowState('config')}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-surface-accent hover:bg-surface-border text-text-muted hover:text-text-primary text-sm font-medium transition border border-surface-border"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayFriendPage;
