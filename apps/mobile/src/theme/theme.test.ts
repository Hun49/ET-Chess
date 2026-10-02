import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { darkTheme, lightTheme, type Theme, useTheme } from './index';
import { useThemeStore } from './themeStore';

// Mock react-native's useColorScheme
const mockUseColorScheme = vi.fn<() => 'light' | 'dark' | null | undefined>(() => 'dark');
vi.mock('react-native', () => ({
  useColorScheme: () => mockUseColorScheme(),
  StyleSheet: {
    create: <T>(styles: T): T => styles,
  },
}));

// Helper to run useTheme hook inside a valid React render context
function renderThemeHook(): Theme {
  let capturedTheme: Theme = darkTheme;
  const TestComponent = () => {
    capturedTheme = useTheme();
    return null;
  };
  renderToString(React.createElement(TestComponent));
  return capturedTheme;
}

describe('Mobile Theme System (apps/mobile)', () => {
  beforeEach(() => {
    useThemeStore.setState({ themeMode: 'system' });
    mockUseColorScheme.mockReturnValue('dark');
  });

  describe('useThemeStore', () => {
    it('initializes with system mode by default', () => {
      expect(useThemeStore.getState().themeMode).toBe('system');
    });

    it('updates theme mode when setThemeMode is called', () => {
      useThemeStore.getState().setThemeMode('light');
      expect(useThemeStore.getState().themeMode).toBe('light');

      useThemeStore.getState().setThemeMode('dark');
      expect(useThemeStore.getState().themeMode).toBe('dark');

      useThemeStore.getState().setThemeMode('system');
      expect(useThemeStore.getState().themeMode).toBe('system');
    });
  });

  describe('useTheme resolution', () => {
    it('returns lightTheme when themeMode is explicitly light', () => {
      useThemeStore.setState({ themeMode: 'light' });
      mockUseColorScheme.mockReturnValue('dark'); // system is dark, but mode is light

      const theme = renderThemeHook();
      expect(theme.name).toBe('light');
      expect(theme.isDark).toBe(false);
      expect(theme.background).toBe('#FFFFFF');
      expect(theme.surface.card).toBe('#F7F7F7');
    });

    it('returns darkTheme when themeMode is explicitly dark', () => {
      useThemeStore.setState({ themeMode: 'dark' });
      mockUseColorScheme.mockReturnValue('light'); // system is light, but mode is dark

      const theme = renderThemeHook();
      expect(theme.name).toBe('dark');
      expect(theme.isDark).toBe(true);
      expect(theme.background).toBe('#121212');
      expect(theme.surface.card).toBe('#1E1E1E');
    });

    it('resolves to lightTheme when themeMode is system and OS is light', () => {
      useThemeStore.setState({ themeMode: 'system' });
      mockUseColorScheme.mockReturnValue('light');

      const theme = renderThemeHook();
      expect(theme.name).toBe('light');
      expect(theme.isDark).toBe(false);
    });

    it('resolves to darkTheme when themeMode is system and OS is dark', () => {
      useThemeStore.setState({ themeMode: 'system' });
      mockUseColorScheme.mockReturnValue('dark');

      const theme = renderThemeHook();
      expect(theme.name).toBe('dark');
      expect(theme.isDark).toBe(true);
    });
  });

  describe('Theme Tokens Consistency', () => {
    it('provides identical shape across lightTheme and darkTheme', () => {
      expect(Object.keys(lightTheme).sort()).toEqual(Object.keys(darkTheme).sort());
      expect(Object.keys(lightTheme.surface).sort()).toEqual(Object.keys(darkTheme.surface).sort());
      expect(Object.keys(lightTheme.text).sort()).toEqual(Object.keys(darkTheme.text).sort());
      expect(Object.keys(lightTheme.status).sort()).toEqual(Object.keys(darkTheme.status).sort());
    });

    it('contains valid brand tokens with no #TBD placeholders', () => {
      expect(lightTheme.brand.green.DEFAULT).toBe('#078930');
      expect(lightTheme.brand.yellow.DEFAULT).toBe('#FCDD09');
      expect(lightTheme.brand.red.DEFAULT).toBe('#DA121A');

      const serialized = JSON.stringify(lightTheme.brand);
      expect(serialized.includes('#TBD')).toBe(false);
    });
  });
});
