import { ScrollText } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface MoveHistoryListProps {
  sanMoves: string[];
  activeMoveIndex?: number;
  onSelectMove?: (index: number) => void;
}

export function MoveHistoryList({ sanMoves, activeMoveIndex, onSelectMove }: MoveHistoryListProps) {
  const moveListEndRef = useRef<HTMLDivElement>(null);

  const movePairs: {
    moveNumber: number;
    white: string;
    black?: string;
    whiteIdx: number;
    blackIdx?: number;
  }[] = [];
  for (let i = 0; i < sanMoves.length; i += 2) {
    const white = sanMoves[i] ?? '';
    const black = sanMoves[i + 1];
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white,
      black,
      whiteIdx: i,
      blackIdx: black ? i + 1 : undefined,
    });
  }

  useEffect(() => {
    moveListEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div
      data-testid="move-history-list"
      className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col h-64 sm:h-72 shadow-sm"
    >
      <div className="flex items-center justify-between pb-3 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-board-light" />
          <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">
            Move History
          </span>
        </div>
        <span className="text-xs font-mono text-text-muted">
          {`${sanMoves.length} ${sanMoves.length === 1 ? 'move' : 'moves'}`}
        </span>
      </div>

      <div className="mt-3 flex-1 flex flex-col rounded-lg border border-surface-border bg-surface-base overflow-hidden">
        <div className="grid grid-cols-3 bg-surface-accent px-3 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider border-b border-surface-border">
          <span className="w-12">#</span>
          <span>White</span>
          <span>Black</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-surface-border/40">
          {movePairs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center">
              <p className="text-xs text-text-muted">No moves played yet.</p>
              <p className="text-[11px] text-text-muted/80 mt-1">
                Moves will appear here in algebraic notation.
              </p>
            </div>
          ) : (
            movePairs.map((pair) => (
              <div
                key={`move-pair-${pair.moveNumber}`}
                className="grid grid-cols-3 px-3 py-1.5 text-xs font-mono hover:bg-surface-accent/40 transition-colors"
              >
                <span className="text-text-muted w-12">{pair.moveNumber}.</span>
                <button
                  type="button"
                  onClick={() => onSelectMove?.(pair.whiteIdx)}
                  className={`text-left font-medium transition-colors rounded px-1 -mx-1 ${
                    activeMoveIndex === pair.whiteIdx
                      ? 'bg-brand-green/20 text-brand-green font-bold'
                      : 'text-text-primary hover:text-brand-green'
                  }`}
                >
                  {pair.white}
                </button>
                {pair.black && (
                  <button
                    type="button"
                    onClick={() => pair.blackIdx !== undefined && onSelectMove?.(pair.blackIdx)}
                    className={`text-left transition-colors rounded px-1 -mx-1 ${
                      activeMoveIndex === pair.blackIdx
                        ? 'bg-brand-green/20 text-brand-green font-bold'
                        : 'text-text-secondary hover:text-brand-green'
                    }`}
                  >
                    {pair.black}
                  </button>
                )}
              </div>
            ))
          )}
          <div ref={moveListEndRef} />
        </div>
      </div>
    </div>
  );
}

export default MoveHistoryList;
