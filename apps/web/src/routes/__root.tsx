import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { GitBranch, History, LayoutGrid, Swords, User } from 'lucide-react';
import { AuthButton } from '../features/auth/AuthButton';
import { ThemeToggle } from '../features/theme/ThemeToggle';

export const rootRoute = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col font-sans selection:bg-board-dark selection:text-white">
      <header className="border-b border-surface-border bg-surface-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-board-dark rounded-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-board-dark flex items-center justify-center text-white font-bold text-base shadow-md group-hover:scale-105 transition-transform duration-200">
              ET
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-text-primary group-hover:text-board-light transition-colors">
                  ET Chess
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-surface-accent border border-surface-border text-emerald-400">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-text-muted leading-none">Engine-Ready Local Chess</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/"
              activeProps={{
                className: 'bg-surface-accent text-text-primary font-medium border-surface-border',
              }}
              inactiveProps={{
                className:
                  'text-text-muted hover:text-text-primary hover:bg-surface-accent/50 border-transparent',
              }}
              activeOptions={{ exact: true }}
              className="px-3 py-1.5 rounded-lg text-sm transition-all duration-150 border flex items-center gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Home</span>
            </Link>

            <Link
              to="/play/online"
              activeProps={{
                className: 'bg-surface-accent text-text-primary font-medium border-surface-border',
              }}
              inactiveProps={{
                className:
                  'text-text-muted hover:text-text-primary hover:bg-surface-accent/50 border-transparent',
              }}
              className="px-3 py-1.5 rounded-lg text-sm transition-all duration-150 border flex items-center gap-2"
            >
              <Swords className="w-4 h-4 text-brand-green" />
              <span>Play</span>
            </Link>

            <Link
              to="/history"
              activeProps={{
                className: 'bg-surface-accent text-text-primary font-medium border-surface-border',
              }}
              inactiveProps={{
                className:
                  'text-text-muted hover:text-text-primary hover:bg-surface-accent/50 border-transparent',
              }}
              className="px-3 py-1.5 rounded-lg text-sm transition-all duration-150 border flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </Link>

            <Link
              to="/profile"
              activeProps={{
                className: 'bg-surface-accent text-text-primary font-medium border-surface-border',
              }}
              inactiveProps={{
                className:
                  'text-text-muted hover:text-text-primary hover:bg-surface-accent/50 border-transparent',
              }}
              className="px-3 py-1.5 rounded-lg text-sm transition-all duration-150 border flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Link>

            <div className="w-px h-5 bg-surface-border mx-1 sm:mx-2 hidden sm:block" />

            <ThemeToggle />

            <AuthButton />

            <a
              href="https://github.com/hunwork/ET-Chess"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-accent transition-colors flex items-center gap-1.5 text-xs font-medium border border-transparent hover:border-surface-border"
            >
              <GitBranch className="w-4 h-4" />
              <span className="hidden md:inline">GitHub</span>
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <footer className="border-t border-surface-border bg-surface-card/40 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Stockfish WASM Ready</span>
          </div>
          <p>© 2026 ET Chess. Single-player and local over-the-board chess.</p>
        </div>
      </footer>
    </div>
  );
}
