/**
 * ET Chess — Design Tokens (Single Source of Truth)
 * Framework-agnostic TypeScript design tokens consumed across Web, Mobile, and Admin.
 *
 * All brand colors are derived from the standard Ethiopian flag hues:
 * - Brand Green:  #078930
 * - Brand Yellow: #FCDD09
 * - Brand Red:    #DA121A
 *
 * Tonal values and contrasts are verified against WCAG 2.1 AA/AAA standards.
 */

export const brand = {
  green: {
    light: '#E6F4EA', // subtle tint for badge backgrounds and hovers
    DEFAULT: '#078930', // base Ethiopian flag green
    dark: '#055E23', // deep shade, 7.98:1 contrast on white (#FFFFFF)
  },
  yellow: {
    light: '#FFF6CC', // subtle butter tint, 16.0:1 contrast with dark text (#1A1A1A)
    DEFAULT: '#FCDD09', // base Ethiopian flag yellow: 13.81:1 on dark charcoal (#121212)
    dark: '#854D0E', // text-safe darkened gold, 6.85:1 contrast on white (#FFFFFF)
  },
  red: {
    light: '#FBE3E4', // subtle crimson tint for alerts and danger badges
    DEFAULT: '#DA121A', // base Ethiopian flag red
    dark: '#A30D13', // deep crimson shade, 8.00:1 contrast on white (#FFFFFF)
  },
} as const;

export const neutral = {
  white: '#FFFFFF',
  charcoal: {
    base: '#121212', // dark mode background (continuity with existing codebase)
    elevated: '#1E1E1E', // dark mode card/surface
    border: '#333333', // dark mode border
  },
  // Light-mode neutrals
  lightSurface: {
    elevated: '#F7F7F7', // card/surface color against a pure white background
    border: '#E5E5E5', // light mode border
  },
} as const;

// Board colors intentionally untouched — left intact per §0
export const board = {
  light: '#f0d9b5',
  dark: '#b58863',
  highlight: 'rgba(255, 255, 0, 0.4)',
  selected: 'rgba(20, 85, 30, 0.5)',
} as const;

export const lightTheme = {
  name: 'light' as const,
  isDark: false,
  background: neutral.white,
  surface: {
    base: neutral.white,
    card: neutral.lightSurface.elevated,
    accent: '#EFEFEF',
    border: neutral.lightSurface.border,
  },
  text: {
    primary: '#1A1A1A',
    secondary: '#4B5563',
    muted: '#6B7280',
    highlight: '#b58863',
  },
  status: {
    active: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
  },
  brand,
  board,
} as const;

export const darkTheme = {
  name: 'dark' as const,
  isDark: true,
  background: neutral.charcoal.base,
  surface: {
    base: neutral.charcoal.base,
    card: neutral.charcoal.elevated,
    accent: '#2a2a2a',
    border: neutral.charcoal.border,
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#D1D5DB',
    muted: '#9CA3AF',
    highlight: '#f0d9b5',
  },
  status: {
    active: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  brand,
  board,
} as const;

export type Theme = typeof lightTheme | typeof darkTheme;
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Generates the standardized CSS variable definitions for :root (light)
 * and [data-theme="dark"].
 */
export function generateThemeCss(): string {
  return `/* ET Chess Design System Theme Variables — Generated from design-tokens.ts */
:root {
  --color-surface-base: ${lightTheme.surface.base};
  --color-surface-card: ${lightTheme.surface.card};
  --color-surface-accent: ${lightTheme.surface.accent};
  --color-surface-border: ${lightTheme.surface.border};
  --color-text-primary: ${lightTheme.text.primary};
  --color-text-secondary: ${lightTheme.text.secondary};
  --color-text-muted: ${lightTheme.text.muted};
  --color-text-highlight: ${lightTheme.text.highlight};
  --color-brand-green-light: ${brand.green.light};
  --color-brand-green: ${brand.green.DEFAULT};
  --color-brand-green-dark: ${brand.green.dark};
  --color-brand-yellow-light: ${brand.yellow.light};
  --color-brand-yellow: ${brand.yellow.DEFAULT};
  --color-brand-yellow-dark: ${brand.yellow.dark};
  --color-brand-red-light: ${brand.red.light};
  --color-brand-red: ${brand.red.DEFAULT};
  --color-brand-red-dark: ${brand.red.dark};
  --color-status-active: ${lightTheme.status.active};
  --color-status-warning: ${lightTheme.status.warning};
  --color-status-danger: ${lightTheme.status.danger};
}

[data-theme="dark"] {
  --color-surface-base: ${darkTheme.surface.base};
  --color-surface-card: ${darkTheme.surface.card};
  --color-surface-accent: ${darkTheme.surface.accent};
  --color-surface-border: ${darkTheme.surface.border};
  --color-text-primary: ${darkTheme.text.primary};
  --color-text-secondary: ${darkTheme.text.secondary};
  --color-text-muted: ${darkTheme.text.muted};
  --color-text-highlight: ${darkTheme.text.highlight};
  --color-brand-green-light: ${brand.green.light};
  --color-brand-green: ${brand.green.DEFAULT};
  --color-brand-green-dark: ${brand.green.dark};
  --color-brand-yellow-light: ${brand.yellow.light};
  --color-brand-yellow: ${brand.yellow.DEFAULT};
  --color-brand-yellow-dark: ${brand.yellow.dark};
  --color-brand-red-light: ${brand.red.light};
  --color-brand-red: ${brand.red.DEFAULT};
  --color-brand-red-dark: ${brand.red.dark};
  --color-status-active: ${darkTheme.status.active};
  --color-status-warning: ${darkTheme.status.warning};
  --color-status-danger: ${darkTheme.status.danger};
}
`;
}
