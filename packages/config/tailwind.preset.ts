import { board } from './src/design-tokens';

export const etChessTailwindPreset = {
  darkMode: ['selector', '[data-theme="dark"]'] as ['selector', string],
  theme: {
    extend: {
      colors: {
        board,
        surface: {
          base: 'var(--color-surface-base)',
          card: 'var(--color-surface-card)',
          accent: 'var(--color-surface-accent)',
          border: 'var(--color-surface-border)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          highlight: 'var(--color-text-highlight)',
        },
        brand: {
          green: {
            light: 'var(--color-brand-green-light)',
            DEFAULT: 'var(--color-brand-green)',
            dark: 'var(--color-brand-green-dark)',
          },
          yellow: {
            light: 'var(--color-brand-yellow-light)',
            DEFAULT: 'var(--color-brand-yellow)',
            dark: 'var(--color-brand-yellow-dark)',
          },
          red: {
            light: 'var(--color-brand-red-light)',
            DEFAULT: 'var(--color-brand-red)',
            dark: 'var(--color-brand-red-dark)',
          },
        },
        status: {
          active: 'var(--color-status-active)',
          warning: 'var(--color-status-warning)',
          danger: 'var(--color-status-danger)',
        },
      },
    },
  },
  plugins: [],
};

export default etChessTailwindPreset;
