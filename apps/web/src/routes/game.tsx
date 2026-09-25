import { createRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowUpDown,
  Bot,
  CircleDot,
  Flag,
  RotateCcw,
  ScrollText,
  Swords,
  Users,
} from 'lucide-react';
import { rootRoute } from './__root';

export interface GameSearchParams {
  mode?: 'bot' | 'local';
}

export function parseGameSearchParams(search: Record<string, unknown>): GameSearchParams {
  const mode = search.mode;
  if (mode === 'bot' || mode === 'local') {
    return { mode };
  }
  return { mode: 'bot' };
}

export const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game',
  validateSearch: parseGameSearchParams,
  component: GamePage,
});

function GamePage() {
  const { mode = 'bot' } = gameRoute.useSearch();
  const isBotMode = mode === 'bot';

  return (
    <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-surface-accent border border-transparent hover:border-surface-border"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Mode Select</span>
          </Link>
          <div className="h-4 w-px bg-surface-border" />
          <div className="flex items-center gap-2">
            {isBotMode ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-board-dark/25 border border-board-dark/40 text-board-light">
                <Bot className="w-3.5 h-3.5" />
                <span>Stockfish Match</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-accent border border-surface-border text-gray-300">
                <Users className="w-3.5 h-3.5" />
                <span>Pass & Play</span>
              </span>
            )}
            <span className="text-xs text-gray-400 hidden md:inline">
              {isBotMode ? 'Skill Level 10 · Depth 10' : 'Local 2-Player (Over the Board)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/game"
            search={{ mode: isBotMode ? 'local' : 'bot' }}
            className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-accent transition-colors flex items-center gap-1.5"
          >
            {isBotMode ? (
              <>
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span>Switch to Pass & Play</span>
              </>
            ) : (
              <>
                <Bot className="w-3.5 h-3.5 text-board-light" />
                <span>Switch to Stockfish</span>
              </>
            )}
          </Link>
        </div>
      </div>

      {/* Main Game Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-6 flex-1">
        {/* Left Column: Chess Board Area */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center gap-3">
          {/* Top Player Status Badge (Black) */}
          <div className="w-full max-w-[560px] bg-surface-card border border-surface-border rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-base border border-surface-border flex items-center justify-center text-gray-200">
                {isBotMode ? (
                  <Bot className="w-5 h-5 text-board-light" />
                ) : (
                  <Users className="w-5 h-5 text-gray-300" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {isBotMode ? 'Stockfish 16' : 'Player 2 (Black)'}
                  </span>
                  {isBotMode && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-board-dark/20 text-board-light border border-board-dark/30">
                      WASM
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {isBotMode ? 'Engine Depth 10 · Level 10' : 'Awaiting turn'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="px-2.5 py-1 rounded bg-surface-base border border-surface-border font-mono text-xs text-gray-400">
                --:--
              </div>
              <span
                role="status"
                aria-label="Player inactive"
                className="w-2.5 h-2.5 rounded-full bg-gray-600"
                title="Waiting"
              />
            </div>
          </div>

          {/* Board Mount Container (Slot for react-chessboard) */}
          <div className="w-full max-w-[560px] aspect-square rounded-2xl border-2 border-surface-border bg-surface-card shadow-2xl relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-6 group">
            {/* Visual 8x8 Board Skeleton Placeholder */}
            <div className="w-full h-full rounded-xl overflow-hidden grid grid-cols-8 grid-rows-8 border border-surface-border/50 relative">
              {Array.from({ length: 64 }).map((_, i) => {
                const row = Math.floor(i / 8);
                const col = i % 8;
                const isDark = (row + col) % 2 === 1;
                return (
                  <div
                    key={`square-${row}-${col}`}
                    className={`flex items-center justify-center transition-colors ${
                      isDark ? 'bg-board-dark/25' : 'bg-surface-accent/30'
                    }`}
                  />
                );
              })}

              {/* Center Mount HUD Banner */}
              <div className="absolute inset-0 bg-surface-base/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-board-dark/25 border border-board-dark/40 flex items-center justify-center text-board-light mb-3 shadow-md">
                  <Swords className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                  Chessboard Mount Point
                </h3>
                <p className="text-xs text-gray-300 max-w-xs mb-3 leading-relaxed">
                  Prepared for{' '}
                  <code className="text-board-light bg-surface-accent px-1.5 py-0.5 rounded font-mono text-[11px]">
                    react-chessboard
                  </code>{' '}
                  and{' '}
                  <code className="text-board-light bg-surface-accent px-1.5 py-0.5 rounded font-mono text-[11px]">
                    @et-chess/chess-core
                  </code>
                  .
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-gray-400 px-2.5 py-1 rounded bg-surface-card border border-surface-border">
                    Standard 8x8 Grid
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-800/40 flex items-center gap-1.5">
                    <CircleDot className="w-3 h-3 text-emerald-400" />
                    White to Move
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Player Status Badge (White) */}
          <div className="w-full max-w-[560px] bg-surface-card border border-surface-border rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-board-dark/20 border border-board-dark/40 flex items-center justify-center text-board-light font-bold text-base shadow-inner">
                ♔
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {isBotMode ? 'Player (White)' : 'Player 1 (White)'}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-surface-accent text-emerald-400 border border-surface-border">
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-400">Ready to move</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="px-2.5 py-1 rounded bg-surface-base border border-surface-border font-mono text-xs text-gray-100 font-medium">
                --:--
              </div>
              <span
                role="status"
                aria-label="Player active"
                className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"
                title="Active turn"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Game Controls, Move History & Info Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4 w-full">
          {/* Status & Position Card */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Game Status
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-surface-accent text-gray-200 border border-surface-border">
                Ongoing
              </span>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Turn</span>
                <span className="font-semibold text-white">White to Move</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Rules Engine</span>
                <span className="text-gray-300 font-mono text-[11px]">chess-core v1.0</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Opponent</span>
                <span className="text-gray-300 font-medium">
                  {isBotMode ? 'Stockfish (Skill 10)' : 'Local Human'}
                </span>
              </div>
            </div>

            <div className="mt-3.5 p-2.5 rounded-lg bg-surface-base border border-surface-border">
              <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-1">
                FEN Notation
              </div>
              <p className="text-[11px] font-mono text-gray-300 truncate selection:bg-board-dark selection:text-white">
                rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
              </p>
            </div>
          </div>

          {/* Move History Panel */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col h-72 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-board-light" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white">
                  Move History
                </span>
              </div>
              <span className="text-xs font-mono text-gray-400">0 moves</span>
            </div>

            <div className="mt-3 flex-1 flex flex-col rounded-lg border border-surface-border bg-surface-base overflow-hidden">
              <div className="grid grid-cols-3 bg-surface-accent px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-surface-border">
                <span>Move</span>
                <span>White</span>
                <span>Black</span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <p className="text-xs text-gray-400">No moves played yet.</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Moves will appear here in algebraic notation.
                </p>
              </div>
            </div>
          </div>

          {/* Game Controls */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col gap-2.5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Match Controls
            </h3>

            <button
              type="button"
              className="w-full py-2.5 px-3 rounded-lg bg-surface-accent hover:bg-surface-border active:scale-[0.99] text-white text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2 border border-surface-border cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-gray-300" />
              <span>Reset / New Game</span>
            </button>

            <button
              type="button"
              className="w-full py-2.5 px-3 rounded-lg bg-surface-accent hover:bg-surface-border active:scale-[0.99] text-white text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2 border border-surface-border cursor-pointer"
            >
              <ArrowUpDown className="w-4 h-4 text-gray-300" />
              <span>Flip Board Orientation</span>
            </button>

            <button
              type="button"
              className="w-full py-2.5 px-3 rounded-lg bg-red-950/20 hover:bg-red-950/50 active:scale-[0.99] text-red-300 hover:text-red-200 text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2 border border-red-900/40 cursor-pointer"
            >
              <Flag className="w-4 h-4 text-red-400" />
              <span>Resign Match</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
