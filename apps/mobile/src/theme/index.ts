export const themeColors = {
  board: {
    light: '#f0d9b5',
    dark: '#b58863',
    highlight: 'rgba(255, 255, 0, 0.4)',
    selected: 'rgba(20, 85, 30, 0.5)',
  },
  surface: {
    base: '#121212',
    card: '#1e1e1e',
    accent: '#2a2a2a',
    border: '#333333',
  },
  text: {
    primary: '#ffffff',
    secondary: '#d1d5db',
    muted: '#9ca3af',
    highlight: '#f0d9b5',
  },
  status: {
    active: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  round: 9999,
} as const;

export const typography = {
  titleLarge: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: themeColors.text.primary,
    letterSpacing: -0.5,
  },
  titleMedium: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: themeColors.text.primary,
  },
  titleSmall: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: themeColors.text.primary,
  },
  bodyRegular: {
    fontSize: 14,
    color: themeColors.text.secondary,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    color: themeColors.text.muted,
    lineHeight: 16,
  },
  badge: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
} as const;
