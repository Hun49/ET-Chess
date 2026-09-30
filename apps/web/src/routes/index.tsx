import { createRoute, Link } from '@tanstack/react-router';
import {
  Bot,
  ChevronRight,
  Cpu,
  Globe,
  Layers,
  ShieldCheck,
  Sparkles,
  Swords,
  Users,
  Zap,
} from 'lucide-react';
import { rootRoute } from './__root';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
});

function IndexPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-16">
      <div className="w-full max-w-5xl flex flex-col items-center">
        {/* Hero badge & title */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-card border border-surface-border text-xs font-medium text-board-light mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-board-dark" />
          <span>Minimalist Chess Experience</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white text-center">
          Select Your Battleground
        </h1>

        <p className="mt-3 text-sm sm:text-base text-gray-300 max-w-xl text-center leading-relaxed">
          Master every position. Challenge Stockfish running locally in your browser with zero
          latency, or play head-to-head with a companion over the board or online.
        </p>

        {/* Featured 2.0 Mode: Online Multiplayer */}
        <Link
          to="/online"
          className="group relative w-full max-w-4xl mt-10 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-surface-card via-surface-accent/80 to-surface-card p-6 sm:p-8 hover:border-emerald-500/60 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between shadow-2xl cursor-pointer"
        >
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-200 shadow-sm shrink-0">
              <Globe className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl sm:text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Online Multiplayer
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                  Version 2.0
                </span>
              </div>
              <p className="text-sm text-gray-300 max-w-xl leading-relaxed">
                Live friend challenge rooms, ranked matchmaking with rating expansion, and
                single-elimination tournament brackets. Powered by Cloudflare Durable Objects.
              </p>
            </div>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center gap-2 text-sm font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors shrink-0">
            <span>Enter Arena</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Game Mode Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mt-6">
          {/* Mode 1: Play vs Stockfish */}
          <Link
            to="/game"
            search={{ mode: 'bot' }}
            className="group relative rounded-2xl border border-surface-border bg-surface-card p-6 sm:p-8 hover:border-board-dark hover:bg-surface-accent/60 transition-all duration-200 flex flex-col justify-between shadow-xl cursor-pointer"
          >
            <div>
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-board-dark/20 border border-board-dark/40 flex items-center justify-center text-board-light group-hover:scale-110 group-hover:bg-board-dark/30 transition-all duration-200 shadow-sm">
                  <Bot className="w-7 h-7 text-board-light" />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-board-dark/25 border border-board-dark/40 text-board-light">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Stockfish WASM</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-board-light transition-colors">
                  Play vs Stockfish
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface-accent text-gray-300 border border-surface-border">
                  Depth 10
                </span>
              </div>

              <p className="mt-2.5 text-sm text-gray-300 leading-relaxed">
                Test your tactical vision against an in-browser Stockfish engine. Powered by
                real-time UCI analysis, zero backend latency, and configurable engine skill tiers.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="text-xs px-2.5 py-1 rounded-md bg-surface-base border border-surface-border text-gray-300 font-mono">
                  Skill Level 10
                </span>
                <span className="text-xs px-2.5 py-1 rounded-md bg-surface-base border border-surface-border text-gray-300 font-mono">
                  Depth 10
                </span>
                <span className="text-xs px-2.5 py-1 rounded-md bg-surface-base border border-surface-border text-gray-300 font-mono">
                  Client-Side WASM
                </span>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-surface-border flex items-center justify-between text-sm font-semibold text-white group-hover:text-board-light transition-colors">
              <span>Launch Engine Match</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-200 text-board-dark" />
            </div>
          </Link>

          {/* Mode 2: Pass and Play */}
          <Link
            to="/game"
            search={{ mode: 'local' }}
            className="group relative rounded-2xl border border-surface-border bg-surface-card p-6 sm:p-8 hover:border-gray-500 hover:bg-surface-accent/60 transition-all duration-200 flex flex-col justify-between shadow-xl cursor-pointer"
          >
            <div>
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-surface-accent border border-surface-border flex items-center justify-center text-gray-200 group-hover:scale-110 group-hover:bg-surface-border transition-all duration-200 shadow-sm">
                  <Users className="w-7 h-7 text-gray-200" />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface-accent border border-surface-border text-gray-300">
                  <Swords className="w-3.5 h-3.5 text-gray-400" />
                  <span>Local 2-Player</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-board-light transition-colors">
                  Pass and Play
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface-accent text-gray-300 border border-surface-border">
                  Over The Board
                </span>
              </div>

              <p className="mt-2.5 text-sm text-gray-300 leading-relaxed">
                Share one screen with a friend. Features strict FIDE move validation, turn
                alternation, check/checkmate detection, and quick board orientation flipping.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="text-xs px-2.5 py-1 rounded-md bg-surface-base border border-surface-border text-gray-300 font-mono">
                  1v1 Local
                </span>
                <span className="text-xs px-2.5 py-1 rounded-md bg-surface-base border border-surface-border text-gray-300 font-mono">
                  FIDE Rules
                </span>
                <span className="text-xs px-2.5 py-1 rounded-md bg-surface-base border border-surface-border text-gray-300 font-mono">
                  Flip Orientation
                </span>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-surface-border flex items-center justify-between text-sm font-semibold text-white group-hover:text-board-light transition-colors">
              <span>Start Local Match</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-200 text-gray-400" />
            </div>
          </Link>
        </div>

        {/* System Capability Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl mt-12 pt-8 border-t border-surface-border/60">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-card/60 border border-surface-border">
            <Zap className="w-5 h-5 text-board-light shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-white">Zero Server Lag</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                Local computation via WebAssembly in a dedicated background worker.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-card/60 border border-surface-border">
            <ShieldCheck className="w-5 h-5 text-board-light shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-white">Strict Move Validation</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                Standard chess rules, pins, en passant, and castling validated by chess-core.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-card/60 border border-surface-border">
            <Layers className="w-5 h-5 text-board-light shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-white">Monorepo Core</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                Shared state machines and UCI protocols identical across web and mobile.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
