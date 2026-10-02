import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { BotDifficulty } from '@et-chess/types';
import { describe, expect, it } from 'vitest';
import RootLayout from '../app/_layout';
import AuthScreen from '../app/auth';
import GameScreen from '../app/game';
import HistoryScreen from '../app/history';
import HomeScreen from '../app/index';
import PlayComputerScreen from '../app/play-computer';
import PlayFriendScreen from '../app/play-friend';
import PlayLocalScreen from '../app/play-local';
import PlayOnlineScreen from '../app/play-online';
import ProfileScreen from '../app/profile';
import ReviewScreen from '../app/review';
import SettingsScreen from '../app/settings';
import { DIFFICULTY_OPTIONS, parseMobileGameParams } from './navigation';
import { darkTheme, lightTheme } from './theme';

describe('apps/mobile route definitions and navigation', () => {
  it('exports valid React components for all 4 play modes and app routes', () => {
    expect(typeof RootLayout).toBe('function');
    expect(typeof HomeScreen).toBe('function');
    expect(typeof PlayOnlineScreen).toBe('function');
    expect(typeof PlayFriendScreen).toBe('function');
    expect(typeof PlayComputerScreen).toBe('function');
    expect(typeof PlayLocalScreen).toBe('function');
    expect(typeof GameScreen).toBe('function');
    expect(typeof HistoryScreen).toBe('function');
    expect(typeof ReviewScreen).toBe('function');
    expect(typeof ProfileScreen).toBe('function');
    expect(typeof SettingsScreen).toBe('function');
    expect(typeof AuthScreen).toBe('function');
  });

  describe('parseMobileGameParams', () => {
    it('parses valid bot mode', () => {
      const parsed = parseMobileGameParams({ mode: 'bot' });
      expect(parsed.mode).toBe('bot');
    });

    it('parses valid local mode', () => {
      const parsed = parseMobileGameParams({ mode: 'local' });
      expect(parsed.mode).toBe('local');
    });

    it('parses valid online and friend modes', () => {
      const onlineParsed = parseMobileGameParams({ mode: 'online', minutes: '5', increment: '3' });
      expect(onlineParsed.mode).toBe('online');
      expect(onlineParsed.minutes).toBe(5);
      expect(onlineParsed.increment).toBe(3);

      const friendParsed = parseMobileGameParams({ mode: 'friend' });
      expect(friendParsed.mode).toBe('friend');
    });

    it('falls back to default bot mode for invalid or empty parameters', () => {
      expect(parseMobileGameParams().mode).toBe('bot');
      expect(parseMobileGameParams({}).mode).toBe('bot');
      expect(parseMobileGameParams({ mode: undefined }).mode).toBe('bot');
      expect(parseMobileGameParams({ mode: 'unknown-mode' }).mode).toBe('bot');
      expect(parseMobileGameParams({ mode: 123 }).mode).toBe('bot');
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
      expect(darkTheme.board.light).toBe('#f0d9b5');
      expect(darkTheme.board.dark).toBe('#b58863');
      expect(darkTheme.board.highlight).toBe('rgba(255, 255, 0, 0.4)');
      expect(darkTheme.board.selected).toBe('rgba(20, 85, 30, 0.5)');

      expect(lightTheme.board.light).toBe('#f0d9b5');
      expect(lightTheme.board.dark).toBe('#b58863');
    });

    it('defines surface colors matching dark and light theme presets', () => {
      expect(darkTheme.surface.base).toBe('#121212');
      expect(darkTheme.surface.card).toBe('#1E1E1E');
      expect(darkTheme.surface.accent).toBe('#2a2a2a');
      expect(darkTheme.surface.border).toBe('#333333');

      expect(lightTheme.surface.base).toBe('#FFFFFF');
      expect(lightTheme.surface.card).toBe('#F7F7F7');
      expect(lightTheme.surface.border).toBe('#E5E5E5');
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
