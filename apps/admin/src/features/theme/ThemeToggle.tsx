import { Moon, Sun } from 'lucide-react';
import { useAdminTheme } from './useAdminTheme';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useAdminTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-accent transition-colors flex items-center justify-center border border-transparent hover:border-surface-border focus:outline-none focus-visible:ring-2 focus-visible:ring-board-dark"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-text-primary" />
      ) : (
        <Moon className="w-4 h-4 text-text-primary" />
      )}
    </button>
  );
}
