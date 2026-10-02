import type { AllowedActions } from '@et-chess/config';
import { ArrowUpDown, Flag, Handshake, Undo2, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

export interface GameActionBarProps {
  allowedActions: AllowedActions;
  isGameOver: boolean;
  soundEnabled: boolean;
  onFlipBoard: () => void;
  onToggleSound: () => void;
  onResign: () => void;
  onDrawOffer: () => void;
  onTakeback?: () => void;
}

export function GameActionBar({
  allowedActions,
  isGameOver,
  soundEnabled,
  onFlipBoard,
  onToggleSound,
  onResign,
  onDrawOffer,
  onTakeback,
}: GameActionBarProps) {
  const [confirmingAction, setConfirmingAction] = useState<'resign' | 'draw' | null>(null);

  const handleResignClick = () => {
    if (isGameOver) return;
    setConfirmingAction('resign');
  };

  const handleDrawClick = () => {
    if (isGameOver) return;
    setConfirmingAction('draw');
  };

  const handleConfirm = () => {
    if (confirmingAction === 'resign') {
      onResign();
    } else if (confirmingAction === 'draw') {
      onDrawOffer();
    }
    setConfirmingAction(null);
  };

  const handleCancel = () => {
    setConfirmingAction(null);
  };

  return (
    <div
      data-testid="game-action-bar"
      className="bg-surface-card border border-surface-border rounded-xl p-3 sm:p-4 flex flex-col gap-2.5 shadow-sm relative"
    >
      {/* Confirmation Overlay */}
      {confirmingAction && (
        <div
          data-testid="action-confirm-dialog"
          className="absolute inset-0 bg-surface-card/95 backdrop-blur-sm rounded-xl p-4 flex flex-col items-center justify-center text-center z-20 border border-surface-border animate-fade-in"
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
              confirmingAction === 'resign'
                ? 'bg-red-950/40 text-brand-red border border-brand-red/30'
                : 'bg-amber-950/40 text-amber-400 border border-amber-500/30'
            }`}
          >
            {confirmingAction === 'resign' ? (
              <Flag className="w-5 h-5 text-red-500" />
            ) : (
              <Handshake className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <h4 className="text-sm font-bold text-text-primary mb-1">
            {confirmingAction === 'resign' ? 'Resign this match?' : 'Offer a draw?'}
          </h4>
          <p className="text-xs text-text-muted mb-3 max-w-[220px]">
            {confirmingAction === 'resign'
              ? 'Victory will be conceded to your opponent.'
              : 'End this match peacefully with shared points.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="action-confirm-yes-btn"
              onClick={handleConfirm}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition ${
                confirmingAction === 'resign'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {confirmingAction === 'resign' ? 'Yes, Resign' : 'Yes, Offer'}
            </button>
            <button
              type="button"
              data-testid="action-confirm-cancel-btn"
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-accent hover:bg-surface-border text-text-primary border border-surface-border transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pb-2 border-b border-surface-border text-xs text-text-muted">
        <span className="font-semibold uppercase tracking-wider">Controls</span>
        <button
          type="button"
          data-testid="sound-toggle-btn"
          onClick={onToggleSound}
          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-accent transition flex items-center gap-1"
          title={soundEnabled ? 'Mute audio' : 'Enable audio'}
          aria-label={soundEnabled ? 'Mute audio' : 'Enable audio'}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-brand-green" />
              <span className="text-[11px]">Sound On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-[11px]">Muted</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-testid="flip-board-btn"
          onClick={onFlipBoard}
          className="py-2 px-3 rounded-lg bg-surface-accent hover:bg-surface-border text-text-primary text-xs font-medium transition flex items-center justify-center gap-1.5 border border-surface-border"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
          <span>Flip Board</span>
        </button>

        {allowedActions.takeback && onTakeback && (
          <button
            type="button"
            data-testid="takeback-btn"
            disabled={isGameOver}
            onClick={onTakeback}
            className="py-2 px-3 rounded-lg bg-surface-accent hover:bg-surface-border disabled:opacity-50 text-text-primary text-xs font-medium transition flex items-center justify-center gap-1.5 border border-surface-border"
          >
            <Undo2 className="w-3.5 h-3.5 text-text-muted" />
            <span>Takeback</span>
          </button>
        )}

        {allowedActions.drawOffer && (
          <button
            type="button"
            data-testid="draw-offer-btn"
            disabled={isGameOver}
            onClick={handleDrawClick}
            className="py-2 px-3 rounded-lg bg-surface-accent hover:bg-surface-border disabled:opacity-50 text-text-primary text-xs font-medium transition flex items-center justify-center gap-1.5 border border-surface-border"
          >
            <Handshake className="w-3.5 h-3.5 text-amber-500" />
            <span>Draw</span>
          </button>
        )}

        {allowedActions.resign && (
          <button
            type="button"
            data-testid="resign-btn"
            disabled={isGameOver}
            onClick={handleResignClick}
            className="py-2 px-3 rounded-lg bg-red-950/20 hover:bg-red-950/50 disabled:opacity-50 text-red-400 hover:text-red-300 text-xs font-medium transition flex items-center justify-center gap-1.5 border border-red-900/40"
          >
            <Flag className="w-3.5 h-3.5 text-red-500" />
            <span>Resign</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default GameActionBar;
