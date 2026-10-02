import { applyMove, createGame } from '@et-chess/chess-core';
import type { Move } from '@et-chess/types';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Cpu,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ChessboardView } from '../board/ChessboardView';

export interface GameReviewModalProps {
  isOpen: boolean;
  sanMoves: string[];
  moveHistory: Move[];
  onClose: () => void;
}

export function GameReviewModal({ isOpen, sanMoves, moveHistory, onClose }: GameReviewModalProps) {
  const [currentStep, setCurrentStep] = useState(moveHistory.length);

  // Replay positions calculation
  const positions = useMemo(() => {
    let runningGame = createGame();
    const list: { fen: string; san?: string }[] = [{ fen: runningGame.fen }];

    for (let i = 0; i < moveHistory.length; i++) {
      const move = moveHistory[i];
      if (!move) break;
      try {
        runningGame = applyMove(runningGame, move);
        list.push({ fen: runningGame.fen, san: sanMoves[i] });
      } catch {
        break;
      }
    }
    return list;
  }, [moveHistory, sanMoves]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(positions.length - 1);
    }
  }, [isOpen, positions.length]);

  // Keyboard navigation support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentStep((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentStep((prev) => Math.min(positions.length - 1, prev + 1));
      } else if (e.key === 'Home') {
        setCurrentStep(0);
      } else if (e.key === 'End') {
        setCurrentStep(positions.length - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, positions.length]);

  if (!isOpen) return null;

  const currentPosition = positions[currentStep] ?? positions[0];
  const lastMoveSan = currentStep > 0 ? sanMoves[currentStep - 1] : undefined;

  return (
    <div
      data-testid="game-review-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-surface-card border border-surface-border rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-green" />
            <h3 className="text-lg font-bold text-text-primary">Game Review & Move Analysis</h3>
          </div>
          <button
            type="button"
            data-testid="review-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-accent transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Board + Replay Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Board view */}
          <div className="md:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-[420px] aspect-square rounded-xl border border-surface-border overflow-hidden shadow-lg p-2 bg-surface-base">
              {currentPosition && (
                <ChessboardView
                  gameState={{
                    fen: currentPosition.fen,
                    turn: currentStep % 2 === 0 ? 'white' : 'black',
                    status: 'ongoing',
                    moveHistory: [],
                  }}
                  disabled={true}
                />
              )}
            </div>
          </div>

          {/* Controls & Evaluation Sidebar */}
          <div className="md:col-span-5 flex flex-col gap-4">
            {/* Engine Eval Placeholder */}
            <div className="bg-surface-base border border-surface-border rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-muted flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-brand-green" />
                  <span>Stockfish Evaluation</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-accent border border-surface-border text-amber-400">
                  Coming Soon
                </span>
              </div>
              <div className="w-full bg-surface-accent h-3 rounded-full overflow-hidden flex border border-surface-border mt-1">
                <div className="w-1/2 bg-board-light transition-all" />
                <div className="w-1/2 bg-board-dark transition-all" />
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Full depth-18 Stockfish game review and inaccuracy/blunder analysis is planned for
                an upcoming release.
              </p>
            </div>

            {/* Current Move Details */}
            <div className="bg-surface-base border border-surface-border rounded-xl p-4 flex flex-col gap-2">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Position Details
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Move step:</span>
                <span className="text-xs font-mono font-bold text-text-primary">
                  {currentStep} / {positions.length - 1}
                </span>
              </div>
              {lastMoveSan && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Last move:</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-green/20 text-brand-green border border-brand-green/30">
                    {lastMoveSan}
                  </span>
                </div>
              )}
            </div>

            {/* Stepping Navigation Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                data-testid="review-start-btn"
                disabled={currentStep === 0}
                onClick={() => setCurrentStep(0)}
                className="py-2.5 rounded-lg bg-surface-accent hover:bg-surface-border disabled:opacity-40 text-text-primary flex items-center justify-center transition border border-surface-border"
                title="First move (Home)"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                data-testid="review-prev-btn"
                disabled={currentStep === 0}
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                className="py-2.5 rounded-lg bg-surface-accent hover:bg-surface-border disabled:opacity-40 text-text-primary flex items-center justify-center transition border border-surface-border"
                title="Previous move (Left arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                data-testid="review-next-btn"
                disabled={currentStep >= positions.length - 1}
                onClick={() => setCurrentStep((prev) => Math.min(positions.length - 1, prev + 1))}
                className="py-2.5 rounded-lg bg-surface-accent hover:bg-surface-border disabled:opacity-40 text-text-primary flex items-center justify-center transition border border-surface-border"
                title="Next move (Right arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                data-testid="review-end-btn"
                disabled={currentStep >= positions.length - 1}
                onClick={() => setCurrentStep(positions.length - 1)}
                className="py-2.5 rounded-lg bg-surface-accent hover:bg-surface-border disabled:opacity-40 text-text-primary flex items-center justify-center transition border border-surface-border"
                title="Last move (End)"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameReviewModal;
