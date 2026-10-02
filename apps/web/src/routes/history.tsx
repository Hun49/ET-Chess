import { createRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Eye, History, Trash2, Trophy } from 'lucide-react';
import { useState } from 'react';
import { GameReviewModal } from '../features/session/GameReviewModal';
import { type CompletedGameRecord, useHistoryStore } from '../store/historyStore';
import { rootRoute } from './__root';

export const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  component: HistoryPage,
});

export function HistoryPage() {
  const games = useHistoryStore((s) => s.games);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const [selectedGameForReview, setSelectedGameForReview] = useState<CompletedGameRecord | null>(
    null,
  );

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors px-2.5 py-1.5 rounded-lg hover:bg-surface-accent border border-transparent hover:border-surface-border"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Link>

        {games.length > 0 && (
          <button
            type="button"
            data-testid="clear-history-btn"
            onClick={clearHistory}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-950/30 border border-transparent hover:border-red-900/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-accent border border-surface-border text-text-muted text-xs font-semibold mb-3">
          <History className="w-3.5 h-3.5" />
          <span>Archive</span>
        </div>
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Game History</h1>
        <p className="text-sm text-text-muted mt-1">
          Review your recent completed matches, study moves, and analyze past games.
        </p>
      </div>

      {games.length === 0 ? (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-12 text-center flex flex-col items-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-surface-accent text-text-muted flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 opacity-40" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-1">No Games Played Yet</h3>
          <p className="text-xs text-text-muted max-w-sm mb-6">
            Completed matches in Online, Bot, Friend, or Local modes will automatically be recorded
            here for move replay.
          </p>
          <Link
            to="/play/online"
            className="py-2.5 px-5 rounded-xl bg-brand-green hover:bg-brand-green/90 text-white text-xs font-semibold shadow-md transition"
          >
            Play Your First Game
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {games.map((g) => {
            const isDraw = g.result.outcome === 'draw';
            const isWin = g.result.outcome === g.playerColor;

            return (
              <div
                key={g.id}
                data-testid={`history-game-${g.id}`}
                className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-brand-green/40 transition"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase border ${
                      isDraw
                        ? 'bg-amber-950/40 text-amber-400 border-amber-500/30'
                        : isWin
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-950/40 text-red-400 border-red-500/30'
                    }`}
                  >
                    {isDraw ? '½-½' : isWin ? '1-0' : '0-1'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary">vs {g.opponent}</span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-base border border-surface-border text-text-muted">
                        {g.mode}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono">{g.timeControl}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{g.result.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs text-text-primary font-mono block">
                      {g.moveCount} moves
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {new Date(g.date).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    type="button"
                    data-testid={`review-game-btn-${g.id}`}
                    onClick={() => setSelectedGameForReview(g)}
                    className="py-2 px-3 rounded-lg bg-surface-accent hover:bg-surface-border text-text-primary text-xs font-semibold transition border border-surface-border flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-brand-green" />
                    <span>Review</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedGameForReview && (
        <GameReviewModal
          isOpen={Boolean(selectedGameForReview)}
          sanMoves={selectedGameForReview.sanMoves}
          moveHistory={selectedGameForReview.moveHistory}
          onClose={() => setSelectedGameForReview(null)}
        />
      )}
    </div>
  );
}

export default HistoryPage;
