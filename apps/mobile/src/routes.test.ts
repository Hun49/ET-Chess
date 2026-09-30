import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { BotDifficulty } from '@et-chess/types';
import { describe, expect, it } from 'vitest';
import RootLayout from '../app/_layout';
import AuthScreen from '../app/auth';
import GameScreen from '../app/game';
import HomeScreen from '../app/index';
import OnlineScreen from '../app/online';
import SettingsScreen from '../app/settings';
import { DIFFICULTY_OPTIONS, parseMobileGameParams } from './navigation';
import { themeColors } from './theme';

describe('apps/mobile route definitions and navigation', () => {
  it('exports valid React components for all routes', () => {
    expect(typeof RootLayout).toBe('function');
    expect(typeof HomeScreen).toBe('function');
    expect(typeof GameScreen).toBe('function');
    expect(typeof SettingsScreen).toBe('function');
    expect(typeof AuthScreen).toBe('function');
    expect(typeof OnlineScreen).toBe('function');
  });

  describe('parseMobileGameParams', () => {
    it('parses valid bot mode', () => {
      const parsed = parseMobileGameParams({ mode: 'bot' });
      expect(parsed).toEqual({ mode: 'bot' });
    });

    it('parses valid local mode', () => {
      const parsed = parseMobileGameParams({ mode: 'local' });
      expect(parsed).toEqual({ mode: 'local' });
    });

    it('falls back to default bot mode for invalid or empty parameters', () => {
      expect(parseMobileGameParams()).toEqual({ mode: 'bot' });
      expect(parseMobileGameParams({})).toEqual({ mode: 'bot' });
      expect(parseMobileGameParams({ mode: undefined })).toEqual({ mode: 'bot' });
      expect(parseMobileGameParams({ mode: 'unknown-mode' })).toEqual({ mode: 'bot' });
      expect(parseMobileGameParams({ mode: 123 })).toEqual({ mode: 'bot' });
    });
  });

  describe('DIFFICULTY_OPTIONS contract', () => {
    it('covers all BotDifficulty tiers defined in @et-chess/types', () => {
      const expectedTiers: BotDifficulty[] = [
        'beginner',
        'intermediate',
        'advanced',
        'full-strength',
      ];
      const tierIds = DIFFICULTY_OPTIONS.map((opt) => opt.id);

      expect(tierIds).toEqual(expectedTiers);
    });

    it('provides valid metadata for every difficulty tier', () => {
      for (const tier of DIFFICULTY_OPTIONS) {
        expect(tier.title.length).toBeGreaterThan(0);
        expect(tier.subtitle.length).toBeGreaterThan(0);
        expect(tier.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('theme tokens consistency', () => {
    it('defines board colors matching project preset', () => {
      expect(themeColors.board.light).toBe('#f0d9b5');
      expect(themeColors.board.dark).toBe('#b58863');
      expect(themeColors.board.highlight).toBe('rgba(255, 255, 0, 0.4)');
      expect(themeColors.board.selected).toBe('rgba(20, 85, 30, 0.5)');
    });

    it('defines surface colors matching dark theme preset', () => {
      expect(themeColors.surface.base).toBe('#121212');
      expect(themeColors.surface.card).toBe('#1e1e1e');
      expect(themeColors.surface.accent).toBe('#2a2a2a');
      expect(themeColors.surface.border).toBe('#333333');
    });
  });

  describe('configuration files validation', () => {
    it('app.json contains required Expo Router and Android config', () => {
      const appJsonPath = path.resolve(__dirname, '../app.json');
      const appJson = JSON.parse(readFileSync(appJsonPath, 'utf-8'));

      expect(appJson.expo.name).toBe('ET Chess');
      expect(appJson.expo.slug).toBe('et-chess');
      expect(appJson.expo.android?.package).toBe('com.etchess.app');
      expect(appJson.expo.plugins).toContain('expo-router');
    });

    it('eas.json contains APK build profile for preview', () => {
      const easJsonPath = path.resolve(__dirname, '../eas.json');
      const easJson = JSON.parse(readFileSync(easJsonPath, 'utf-8'));

      expect(easJson.build?.preview?.android?.buildType).toBe('apk');
      expect(easJson.build?.production).toBeDefined();
    });
  });
});
