/**
 * ET Chess Theme Manager for Web & Admin
 * Handles theme resolution, system preference detection, localStorage persistence,
 * and anti-flash inline scripts.
 */

import type { ThemeMode } from './design-tokens';

export type { ThemeMode };
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'et-chess-theme';

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark'; // Fallback to dark
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme(): ThemeMode {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    }
  } catch {
    // LocalStorage might fail in restrictive contexts (e.g. sandboxed iframes)
  }
  return 'system';
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}

export function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode);
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-theme', resolved);
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
  } catch {
    // Ignore write errors (e.g. quota or security restriction)
  }
  return resolved;
}

/**
 * Returns the minified, zero-dependency inline script to place inside index.html's <head>.
 * This runs synchronously before the DOM or external scripts load, completely eliminating
 * any flash of wrong theme (FOUC).
 */
export const ANTI_FLASH_INLINE_SCRIPT = `(function(){try{var m=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=m==='system'?(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):m;document.documentElement.setAttribute('data-theme',d);}catch(e){}})();`;
