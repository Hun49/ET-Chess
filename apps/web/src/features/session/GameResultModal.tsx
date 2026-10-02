import type { GameResult } from '@et-chess/config';
import { Award, Eye, Handshake, RotateCcw, Trophy, X } from 'lucide-react';

export interface GameResultModalProps {
  isOpen: boolean;
  result: GameResult;
  playerColor?: 'white' | 'black';
  onRematch: () => void;
  onReview: () => void;
  onClose?: () => void;
}

export function GameResultModal({
  isOpen,
  result,
  playerColor = 'white',
  onRematch,
  onReview,
  onClose,
}: GameResultModalProps) {
  if (!isOpen) return null;

  const isDraw = result.outcome === 'draw';
  const isWinner = result.outcome === playerColor;

  const headerTitle = isDraw ? 'Game Drawn' : isWinner ? 'Victory!' : 'Defeat';

  return (
    <div
      data-testid="game-result-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-center flex flex-col items-center">
        {onClose && (
          <button
            type="button"
            data-testid="result-close-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-accent transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Icon Badge */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${
            isDraw
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : isWinner
                ? 'bg-brand-green/20 text-brand-green border border-brand-green/40 shadow-brand-green/20'
                : 'bg-red-950/40 text-brand-red border border-brand-red/30'
          }`}
        >
          {isDraw ? (
            <Handshake className="w-8 h-8" />
          ) : isWinner ? (
            <Trophy className="w-8 h-8" />
          ) : (
            <Award className="w-8 h-8 opacity-75" />
          )}
        </div>

        {/* Outcome Heading */}
        <h2 className="text-2xl font-bold text-text-primary mb-1 tracking-tight">{headerTitle}</h2>

        {/* Subtitle / Reason */}
        <p className="text-sm text-text-muted mb-4">{result.reason}</p>

        {/* Rating Adjustment or Unrated Pill */}
        <div className="mb-6">
          {result.ratingChange !== undefined ? (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                result.ratingChange > 0
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                  : result.ratingChange < 0
                    ? 'bg-red-950/40 text-red-400 border-red-500/40'
                    : 'bg-surface-accent text-text-muted border-surface-border'
              }`}
            >
              <span>Rating:</span>
              <span>
                {result.ratingChange > 0 ? `+${result.ratingChange}` : result.ratingChange}
              </span>
            </div>
          ) : (
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-text-muted bg-surface-accent border border-surface-border">
              Casual (Unrated)
            </span>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            type="button"
            data-testid="result-rematch-btn"
            onClick={onRematch}
            className="w-full py-2.5 px-4 rounded-xl bg-brand-green hover:bg-brand-green/90 text-white font-semibold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rematch / Play Again</span>
          </button>

          <button
            type="button"
            data-testid="result-review-btn"
            onClick={onReview}
            className="w-full py-2.5 px-4 rounded-xl bg-surface-accent hover:bg-surface-border text-text-primary font-medium text-sm transition flex items-center justify-center gap-2 border border-surface-border cursor-pointer active:scale-[0.99]"
          >
            <Eye className="w-4 h-4 text-text-muted" />
            <span>Review Game</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameResultModal;
