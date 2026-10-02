import { createRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Flame, Globe, Shield, Trophy, User, Zap } from 'lucide-react';
import { useHistoryStore } from '../store/historyStore';
import { rootRoute } from './__root';

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});

export function ProfilePage() {
  const getStats = useHistoryStore((s) => s.getStats);
  const stats = getStats();

  const ratings = [
    { name: 'Bullet', rating: 1520, icon: Flame, color: 'text-amber-400 bg-amber-950/30' },
    { name: 'Blitz', rating: 1540, icon: Zap, color: 'text-emerald-400 bg-emerald-950/30' },
    { name: 'Rapid', rating: 1610, icon: Shield, color: 'text-blue-400 bg-blue-950/30' },
  ];

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
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

      {/* Profile Header */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-sm mb-6">
        <div className="w-20 h-20 rounded-2xl bg-brand-green/20 border border-brand-green/40 flex items-center justify-center text-brand-green shadow-inner">
          <User className="w-10 h-10" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-text-primary">Guest Player</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-green/20 text-brand-green border border-brand-green/30">
              Active
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">ET Chess Member since 2026</p>
          <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              <span>Ethiopia</span>
            </span>
            <span>·</span>
            <span>{stats.total} matches recorded</span>
          </div>
        </div>
      </div>

      {/* Ratings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {ratings.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.name}
              data-testid={`profile-rating-${r.name.toLowerCase()}`}
              className="bg-surface-card border border-surface-border rounded-2xl p-5 shadow-sm flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                  {r.name}
                </span>
                <span className="text-2xl font-black font-mono text-text-primary mt-1 block">
                  {r.rating}
                </span>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${r.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Stats */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-brand-green" />
          <span>Lifetime Performance</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface-base border border-surface-border text-center">
            <span className="text-xs text-text-muted block">Games</span>
            <span className="text-xl font-bold font-mono text-text-primary mt-1 block">
              {stats.total}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-surface-base border border-surface-border text-center">
            <span className="text-xs text-text-muted block">Wins</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
              {stats.wins}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-surface-base border border-surface-border text-center">
            <span className="text-xs text-text-muted block">Losses</span>
            <span className="text-xl font-bold font-mono text-red-400 mt-1 block">
              {stats.losses}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-surface-base border border-surface-border text-center">
            <span className="text-xs text-text-muted block">Win Rate</span>
            <span className="text-xl font-bold font-mono text-brand-green mt-1 block">
              {stats.winRate}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
