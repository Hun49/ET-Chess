import { createRoute, Link } from '@tanstack/react-router';
import { Bot, ChevronRight, Globe, History, Sparkles, Swords, Users } from 'lucide-react';
import { useHistoryStore } from '../store/historyStore';
import { rootRoute } from './__root';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
});

export function IndexPage() {
  const games = useHistoryStore((s) => s.games);
  const recentGame = games[0];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-14 max-w-6xl mx-auto w-full">
      {/* Hero Badge & Brand Header */}
      <div className="text-center max-w-2xl mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-card border border-surface-border text-xs font-semibold text-text-muted mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-brand-green" />
          <span>The Modern Ethiopian Chess Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-text-primary">
          Play Chess Anytime, Anywhere.
        </h1>

        <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
          Challenge ranked players online, play instant matches with friends, or train against the
          Stockfish engine locally with zero latency.
        </p>
      </div>

      {/* 4 Direct Modes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-4xl">
        {/* Card 1: Play Online */}
        <Link
          to="/play/online"
          data-testid="mode-card-online"
          className="group relative rounded-2xl border border-surface-border bg-surface-card p-6 sm:p-7 hover:border-brand-green/70 hover:shadow-brand-green/10 hover:shadow-xl transition-all duration-200 flex flex-col justify-between shadow-md cursor-pointer"
        >
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-brand-green/15 border border-brand-green/30 flex items-center justify-center text-brand-green group-hover:scale-105 transition-transform">
                <Globe className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-green/20 text-brand-green border border-brand-green/30">
                Ranked & Casual
              </span>
            </div>

            <h2 className="text-xl font-bold text-text-primary group-hover:text-brand-green transition-colors">
              Play Online
            </h2>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Instant matchmaking with rating expansion. Play Bullet, Blitz, and Rapid chess against
              rated opponents worldwide.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between text-xs font-semibold text-text-primary group-hover:text-brand-green transition-colors">
            <span>Find an Opponent</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Play a Friend */}
        <Link
          to="/play/friend"
          data-testid="mode-card-friend"
          className="group relative rounded-2xl border border-surface-border bg-surface-card p-6 sm:p-7 hover:border-brand-green/70 hover:shadow-brand-green/10 hover:shadow-xl transition-all duration-200 flex flex-col justify-between shadow-md cursor-pointer"
        >
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-accent border border-surface-border text-text-muted">
                Direct Link
              </span>
            </div>

            <h2 className="text-xl font-bold text-text-primary group-hover:text-brand-green transition-colors">
              Play a Friend
            </h2>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Generate a shareable challenge link or 6-character invite code and start playing with
              friends in seconds.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between text-xs font-semibold text-text-primary group-hover:text-brand-green transition-colors">
            <span>Create Invite Link</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3: Play Computer */}
        <Link
          to="/play/computer"
          data-testid="mode-card-computer"
          className="group relative rounded-2xl border border-surface-border bg-surface-card p-6 sm:p-7 hover:border-brand-green/70 hover:shadow-brand-green/10 hover:shadow-xl transition-all duration-200 flex flex-col justify-between shadow-md cursor-pointer"
        >
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-board-dark/20 border border-board-dark/30 flex items-center justify-center text-board-light group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6 text-board-light" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-board-dark/20 border border-board-dark/30 text-board-light font-mono">
                Stockfish 16
              </span>
            </div>

            <h2 className="text-xl font-bold text-text-primary group-hover:text-board-light transition-colors">
              Play Computer
            </h2>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Offline engine play with four skill levels from beginner to grandmaster strength.
              Powered by WebAssembly with zero server lag.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between text-xs font-semibold text-text-primary group-hover:text-board-light transition-colors">
            <span>Challenge Bot</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 4: Pass and Play */}
        <Link
          to="/play/local"
          data-testid="mode-card-local"
          className="group relative rounded-2xl border border-surface-border bg-surface-card p-6 sm:p-7 hover:border-brand-green/70 hover:shadow-brand-green/10 hover:shadow-xl transition-all duration-200 flex flex-col justify-between shadow-md cursor-pointer"
        >
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-surface-accent border border-surface-border flex items-center justify-center text-text-muted group-hover:scale-105 transition-transform">
                <Swords className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-accent border border-surface-border text-text-muted">
                1 Device
              </span>
            </div>

            <h2 className="text-xl font-bold text-text-primary group-hover:text-brand-green transition-colors">
              Pass & Play
            </h2>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Two players on one screen over the board. Strict FIDE move validation, board
              auto-flip, and optional chess timers.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between text-xs font-semibold text-text-primary group-hover:text-brand-green transition-colors">
            <span>Start Local Game</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Recent Game Card Preview (if exists) */}
      {recentGame && (
        <div className="w-full max-w-4xl mt-8 p-4 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-brand-green" />
            <div>
              <span className="text-xs font-bold text-text-primary block">
                Last Match vs {recentGame.opponent}
              </span>
              <span className="text-[11px] text-text-muted">
                {recentGame.result.reason} · {recentGame.moveCount} moves
              </span>
            </div>
          </div>
          <Link
            to="/history"
            className="py-1.5 px-3 rounded-lg bg-surface-accent hover:bg-surface-border text-text-primary text-xs font-semibold transition border border-surface-border"
          >
            Review in History
          </Link>
        </div>
      )}
    </div>
  );
}

export default IndexPage;
