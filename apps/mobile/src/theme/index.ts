import {
  board,
  brand,
  darkTheme,
  lightTheme,
  neutral,
  type Theme,
  type ThemeMode,
} from '@et-chess/config';
import { useColorScheme } from 'react-native';
import { useThemeStore } from './themeStore';

export { useThemeStore } from './themeStore';
export type { Theme, ThemeMode };
export { board, brand, darkTheme, lightTheme, neutral };

/**
 * Dynamic theme hook for React Native.
 * Resolves current theme based on user preference ('light' | 'dark' | 'system')
 * and the operating system's color scheme.
 */
export function useTheme(): Theme {
  const systemColorScheme = useColorScheme();
  const themeMode = useThemeStore((state) => state.themeMode);

  if (themeMode === 'light') {
    return lightTheme;
  }
  if (themeMode === 'dark') {
    return darkTheme;
  }
  return systemColorScheme === 'light' ? lightTheme : darkTheme;
}

// Backward-compatibility alias pointing to dark theme
export const themeColors = darkTheme;

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
    letterSpacing: -0.5,
  },
  titleMedium: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  titleSmall: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  bodyRegular: {
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
  },
  badge: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
} as const;
