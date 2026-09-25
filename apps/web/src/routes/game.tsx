import { createRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Bot, Users } from 'lucide-react';
import { GameView } from '../features/game/GameView';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border mb-6">
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

      {/* Main Game View */}
      <GameView initialMode={mode} />
    </div>
  );
}

export default GamePage;
