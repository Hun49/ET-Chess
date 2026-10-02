import type { BotDifficulty } from '@et-chess/types';
import { createRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Bot, Cpu, Swords } from 'lucide-react';
import { useState } from 'react';
import { GameSessionView } from '../features/session/GameSessionView';
import { rootRoute } from './__root';

export const playComputerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/play/computer',
  component: PlayComputerPage,
});

interface BotTier {
  id: BotDifficulty;
  title: string;
  ratingEst: number;
  badge: string;
  description: string;
  color: string;
}

const BOT_TIERS: BotTier[] = [
  {
    id: 'beginner',
    title: 'Beginner (Depth 5)',
    ratingEst: 900,
    badge: 'Skill 2',
    description: 'Casual play with occasional oversights. Perfect for learning and relaxed games.',
    color: 'border-emerald-500/40 text-emerald-400',
  },
  {
    id: 'intermediate',
    title: 'Intermediate (Depth 10)',
    ratingEst: 1500,
    badge: 'Skill 10',
    description: 'Club-level play with solid fundamentals and multi-move tactical calculations.',
    color: 'border-blue-500/40 text-blue-400',
  },
  {
    id: 'advanced',
    title: 'Advanced (1000ms)',
    ratingEst: 2000,
    badge: 'Skill 15',
    description: 'Master-level positional strength with 1-second deep search per position.',
    color: 'border-purple-500/40 text-purple-400',
  },
  {
    id: 'full-strength',
    title: 'Full Strength (3000ms)',
    ratingEst: 2600,
    badge: 'Skill 20',
    description: 'Grandmaster-level evaluation running at maximum local WebAssembly throughput.',
    color: 'border-red-500/40 text-red-400',
  },
];

export function PlayComputerPage() {
  const [selectedDifficulty, setSelectedDifficulty] = useState<BotDifficulty>('intermediate');
  const [inGame, setInGame] = useState(false);

  const selectedTier = BOT_TIERS.find((t) => t.id === selectedDifficulty) ?? BOT_TIERS[1]!;

  if (inGame) {
    return (
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-board-light" />
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              vs Stockfish · {selectedTier.title}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setInGame(false)}
            className="text-xs text-text-muted hover:text-text-primary px-2.5 py-1 rounded-lg border border-surface-border hover:bg-surface-accent transition"
          >
            Change Difficulty
          </button>
        </div>
        <GameSessionView
          mode="computer"
          botDifficulty={selectedDifficulty}
          opponentName={`Stockfish (${selectedTier.title})`}
          opponentRating={selectedTier.ratingEst}
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-board-dark/20 border border-board-dark/30 text-board-light text-xs font-semibold mb-3">
          <Cpu className="w-3.5 h-3.5" />
          <span>Offline Stockfish 16</span>
        </div>
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Play Computer</h1>
        <p className="text-sm text-text-muted max-w-md mx-auto mt-2">
          Challenge the world-class Stockfish engine running locally in your browser with zero
          latency.
        </p>
      </div>

      {/* Difficulty Tiers */}
      <div className="flex flex-col gap-3 mb-8">
        {BOT_TIERS.map((tier) => {
          const isSelected = selectedDifficulty === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              data-testid={`bot-tier-${tier.id}`}
              onClick={() => setSelectedDifficulty(tier.id)}
              className={`p-4 rounded-xl text-left transition border cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isSelected
                  ? 'bg-surface-accent border-brand-green ring-2 ring-brand-green/30 shadow-md'
                  : 'bg-surface-card border-surface-border hover:border-text-muted/40 hover:bg-surface-accent/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-base border border-surface-border flex items-center justify-center text-text-primary">
                  <Bot className="w-5 h-5 text-board-light" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-text-primary">{tier.title}</span>
                    <span className="text-xs font-mono text-text-muted">~{tier.ratingEst}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 max-w-md">{tier.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-base border border-surface-border text-text-muted">
                  {tier.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Start Button */}
      <div className="flex justify-center">
        <button
          type="button"
          data-testid="start-bot-match-btn"
          onClick={() => setInGame(true)}
          className="w-full sm:w-80 py-4 px-6 rounded-2xl bg-brand-green hover:bg-brand-green/90 text-white font-bold text-lg shadow-lg hover:shadow-brand-green/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <Swords className="w-5 h-5" />
          <span>Challenge {selectedTier.title.split(' ')[0]}</span>
        </button>
      </div>
    </div>
  );
}

export default PlayComputerPage;
