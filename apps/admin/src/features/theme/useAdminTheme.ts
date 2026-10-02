import {
  applyTheme,
  getStoredTheme,
  type ResolvedTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from '@et-chess/config';
import { useEffect, useState } from 'react';

export function useAdminTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(getStoredTheme()));

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    const active = applyTheme(newMode);
    setResolved(active);
  };

  const toggleTheme = () => {
    const next = resolved === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  useEffect(() => {
    const active = applyTheme(mode);
    setResolved(active);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      if (getStoredTheme() === 'system') {
        const next = applyTheme('system');
        setResolved(next);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const nextMode = (e.newValue as ThemeMode) || 'system';
        setMode(nextMode);
        const nextResolved = applyTheme(nextMode);
        setResolved(nextResolved);
      }
    };

    media.addEventListener('change', handleMediaChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      media.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [mode]);

  return {
    mode,
    resolved,
    isDark: resolved === 'dark',
    setTheme,
    toggleTheme,
  };
}
