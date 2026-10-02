import { useQuery } from '@tanstack/react-query';
import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import {
  Activity,
  ExternalLink,
  LayoutDashboard,
  RefreshCw,
  ShieldAlert,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { fetchHealth } from '../api/client';

import { ThemeToggle } from '../features/theme/ThemeToggle';

export const rootRoute = createRootRoute({
  component: RootLayout,
});

export function RootLayout() {
  const {
    data: health,
    isLoading: isHealthLoading,
    refetch: refetchHealth,
    isFetching: isHealthFetching,
  } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetchHealth(),
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col font-sans selection:bg-board-dark selection:text-white antialiased">
      {/* Top Navbar */}
      <header className="h-16 border-b border-surface-border bg-surface-card/90 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-board-dark rounded-lg"
          >
            <div className="w-9 h-9 rounded-xl bg-board-dark flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-105 transition-transform duration-200">
              ET
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white group-hover:text-board-light transition-colors">
                  ET Chess
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-surface-accent border border-surface-border text-gray-300">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-none">Control Center & Moderation</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* API Health Status Pill */}
          <button
            type="button"
            onClick={() => refetchHealth()}
            title={`API Status: ${health?.status ?? 'checking'}. Click to refresh.`}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-accent border border-surface-border text-xs transition-colors hover:border-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-board-dark"
          >
            {isHealthLoading ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-gray-300">Connecting...</span>
              </>
            ) : health?.status === 'ok' && !health.isMock ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                <span className="text-emerald-300 font-medium">API Online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-300 font-medium">Mock Mode (Offline)</span>
              </>
            )}
            <RefreshCw
              className={`w-3 h-3 text-gray-400 ${isHealthFetching ? 'animate-spin text-board-light' : ''}`}
            />
          </button>

          <span className="text-[11px] font-mono px-2 py-1 rounded bg-surface-accent/60 border border-surface-border text-gray-300 hidden sm:inline-block">
            v1.0
          </span>

          <ThemeToggle />

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-accent transition-colors border border-transparent hover:border-surface-border flex items-center gap-1.5 text-xs"
            title="Open Public Chess App"
          >
            <span className="hidden md:inline">Public App</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex-1 flex flex-row min-h-0">
        {/* Sidebar */}
        <aside className="w-64 bg-surface-card border-r border-surface-border flex flex-col justify-between p-4 shrink-0">
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                Navigation
              </p>
              <nav className="space-y-1">
                <Link
                  to="/"
                  activeOptions={{ exact: true }}
                  activeProps={{
                    className:
                      'bg-surface-accent text-white font-medium border-surface-border border-l-4 border-l-board-dark shadow-sm',
                  }}
                  inactiveProps={{
                    className:
                      'text-gray-400 hover:text-white hover:bg-surface-accent/50 border-transparent border-l-4 border-l-transparent',
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 border"
                >
                  <LayoutDashboard className="w-4 h-4 text-board-light" />
                  <span>Overview</span>
                </Link>

                <Link
                  to="/rooms"
                  activeProps={{
                    className:
                      'bg-surface-accent text-white font-medium border-surface-border border-l-4 border-l-board-dark shadow-sm',
                  }}
                  inactiveProps={{
                    className:
                      'text-gray-400 hover:text-white hover:bg-surface-accent/50 border-transparent border-l-4 border-l-transparent',
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 border"
                >
                  <Swords className="w-4 h-4 text-green-400" />
                  <span>Online Rooms</span>
                </Link>

                <Link
                  to="/tournaments"
                  activeProps={{
                    className:
                      'bg-surface-accent text-white font-medium border-surface-border border-l-4 border-l-board-dark shadow-sm',
                  }}
                  inactiveProps={{
                    className:
                      'text-gray-400 hover:text-white hover:bg-surface-accent/50 border-transparent border-l-4 border-l-transparent',
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 border"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Tournaments</span>
                </Link>

                <Link
                  to="/reports"
                  activeProps={{
                    className:
                      'bg-surface-accent text-white font-medium border-surface-border border-l-4 border-l-board-dark shadow-sm',
                  }}
                  inactiveProps={{
                    className:
                      'text-gray-400 hover:text-white hover:bg-surface-accent/50 border-transparent border-l-4 border-l-transparent',
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 border"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Reports</span>
                </Link>

                <Link
                  to="/users"
                  activeProps={{
                    className:
                      'bg-surface-accent text-white font-medium border-surface-border border-l-4 border-l-board-dark shadow-sm',
                  }}
                  inactiveProps={{
                    className:
                      'text-gray-400 hover:text-white hover:bg-surface-accent/50 border-transparent border-l-4 border-l-transparent',
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 border"
                >
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Users</span>
                </Link>
              </nav>
            </div>

            {/* Architecture / Integration Details */}
            <div className="p-3 rounded-lg bg-surface-base/80 border border-surface-border text-xs space-y-2">
              <div className="flex items-center justify-between text-gray-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-board-light" />
                  <span>Hono RPC</span>
                </span>
                <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-surface-accent border border-surface-border text-emerald-400">
                  hc&lt;AppType&gt;
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Type-safe API contract sharing schemas with Cloudflare Workers backend.
              </p>
            </div>
          </div>

          {/* Footer info */}
          <div className="pt-4 border-t border-surface-border/60 text-[11px] text-gray-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Stack</span>
              <span className="text-gray-300 font-mono">React 19 + TanStack</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cloudflare</span>
              <span className="text-gray-300 font-mono">Pages + Workers D1</span>
            </div>
          </div>
        </aside>

        {/* Content Outlet */}
        <main className="flex-1 flex flex-col min-w-0 bg-surface-base overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
