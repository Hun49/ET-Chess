import { describe, expect, it } from 'vitest';
import { getContrastRatio, meetsWcagAA, meetsWcagAAA } from './contrast';
import { board, brand, darkTheme, generateThemeCss, lightTheme, neutral } from './design-tokens';

describe('Design Tokens — Single Source of Truth', () => {
  describe('Brand Colors and Tonal Scales', () => {
    it('has no #TBD placeholders and all values are valid hex codes', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;

      expect(brand.green.light).toMatch(hexRegex);
      expect(brand.green.DEFAULT).toMatch(hexRegex);
      expect(brand.green.dark).toMatch(hexRegex);

      expect(brand.yellow.light).toMatch(hexRegex);
      expect(brand.yellow.DEFAULT).toMatch(hexRegex);
      expect(brand.yellow.dark).toMatch(hexRegex);

      expect(brand.red.light).toMatch(hexRegex);
      expect(brand.red.DEFAULT).toMatch(hexRegex);
      expect(brand.red.dark).toMatch(hexRegex);

      // Explicitly assert none contain '#TBD'
      const allTokensJson = JSON.stringify(brand);
      expect(allTokensJson.includes('#TBD')).toBe(false);
      expect(allTokensJson.includes('TBD')).toBe(false);
    });

    it('matches base Ethiopian flag color references', () => {
      expect(brand.green.DEFAULT.toUpperCase()).toBe('#078930');
      expect(brand.yellow.DEFAULT.toUpperCase()).toBe('#FCDD09');
      expect(brand.red.DEFAULT.toUpperCase()).toBe('#DA121A');
    });

    it('verifies brand yellow contrast safety per §1 and §6', () => {
      // 1. Raw yellow FAILS contrast on white (WCAG AA requirement is 4.5:1)
      const rawYellowOnWhiteRatio = getContrastRatio(brand.yellow.DEFAULT, neutral.white);
      expect(rawYellowOnWhiteRatio).toBeLessThan(4.5);
      expect(meetsWcagAA(brand.yellow.DEFAULT, neutral.white)).toBe(false);

      // 2. Raw yellow also FAILS on white with light text on top
      const whiteOnRawYellowRatio = getContrastRatio(neutral.white, brand.yellow.DEFAULT);
      expect(whiteOnRawYellowRatio).toBeLessThan(4.5);

      // 3. Darkened yellow PASSES WCAG AA on white (>= 4.5:1) making it text-safe
      const darkYellowOnWhiteRatio = getContrastRatio(brand.yellow.dark, neutral.white);
      expect(darkYellowOnWhiteRatio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWcagAA(brand.yellow.dark, neutral.white)).toBe(true);

      const darkYellowOnCardRatio = getContrastRatio(
        brand.yellow.dark,
        neutral.lightSurface.elevated,
      );
      expect(darkYellowOnCardRatio).toBeGreaterThanOrEqual(4.5);

      // 4. Raw yellow has high contrast on dark charcoal background
      const rawYellowOnDarkRatio = getContrastRatio(brand.yellow.DEFAULT, neutral.charcoal.base);
      expect(rawYellowOnDarkRatio).toBeGreaterThanOrEqual(7.0); // WCAG AAA
    });

    it('verifies brand green contrast safety', () => {
      // Dark green shade passes WCAG AAA (>= 7:1) on white
      expect(getContrastRatio(brand.green.dark, neutral.white)).toBeGreaterThanOrEqual(7.0);
      expect(meetsWcagAAA(brand.green.dark, neutral.white)).toBe(true);
      expect(
        getContrastRatio(brand.green.dark, neutral.lightSurface.elevated),
      ).toBeGreaterThanOrEqual(7.0);

      // Light green tint passes WCAG AAA (>= 7:1) on dark background
      expect(getContrastRatio(brand.green.light, neutral.charcoal.base)).toBeGreaterThanOrEqual(
        7.0,
      );
    });

    it('verifies brand red contrast safety', () => {
      // Dark red shade passes WCAG AAA (>= 7:1) on white
      expect(getContrastRatio(brand.red.dark, neutral.white)).toBeGreaterThanOrEqual(7.0);

      // Light red tint passes WCAG AA (>= 4.5:1) on dark background
      expect(getContrastRatio(brand.red.light, neutral.charcoal.base)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Light Theme and Dark Theme Contrast (WCAG 2.1 AA)', () => {
    it('meets WCAG AA for all light-mode text on background and card surface', () => {
      const bg = lightTheme.background;
      const card = lightTheme.surface.card;

      // Primary text (target: >= 4.5:1)
      expect(getContrastRatio(lightTheme.text.primary, bg)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(lightTheme.text.primary, card)).toBeGreaterThanOrEqual(4.5);

      // Secondary text (target: >= 4.5:1)
      expect(getContrastRatio(lightTheme.text.secondary, bg)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(lightTheme.text.secondary, card)).toBeGreaterThanOrEqual(4.5);

      // Muted text (target: >= 4.5:1)
      expect(getContrastRatio(lightTheme.text.muted, bg)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(lightTheme.text.muted, card)).toBeGreaterThanOrEqual(4.5);
    });

    it('meets WCAG AA for all dark-mode text on background and card surface', () => {
      const bg = darkTheme.background;
      const card = darkTheme.surface.card;

      // Primary text (target: >= 4.5:1)
      expect(getContrastRatio(darkTheme.text.primary, bg)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(darkTheme.text.primary, card)).toBeGreaterThanOrEqual(4.5);

      // Secondary text (target: >= 4.5:1)
      expect(getContrastRatio(darkTheme.text.secondary, bg)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(darkTheme.text.secondary, card)).toBeGreaterThanOrEqual(4.5);

      // Muted text (target: >= 4.5:1)
      expect(getContrastRatio(darkTheme.text.muted, bg)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(darkTheme.text.muted, card)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Board Colors Preserved (Out of Scope §0)', () => {
    it('preserves exact existing board colors', () => {
      expect(board.light).toBe('#f0d9b5');
      expect(board.dark).toBe('#b58863');
      expect(board.highlight).toBe('rgba(255, 255, 0, 0.4)');
      expect(board.selected).toBe('rgba(20, 85, 30, 0.5)');
    });
  });

  describe('generateThemeCss', () => {
    it('generates :root and [data-theme="dark"] CSS definitions with all variables', () => {
      const css = generateThemeCss();
      expect(css).toContain(':root {');
      expect(css).toContain('[data-theme="dark"] {');

      const expectedVars = [
        '--color-surface-base',
        '--color-surface-card',
        '--color-surface-accent',
        '--color-surface-border',
        '--color-text-primary',
        '--color-text-secondary',
        '--color-text-muted',
        '--color-text-highlight',
        '--color-brand-green',
        '--color-brand-green-light',
        '--color-brand-green-dark',
        '--color-brand-yellow',
        '--color-brand-yellow-light',
        '--color-brand-yellow-dark',
        '--color-brand-red',
        '--color-brand-red-light',
        '--color-brand-red-dark',
        '--color-status-active',
        '--color-status-warning',
        '--color-status-danger',
      ];

      for (const v of expectedVars) {
        expect(css).toContain(v);
      }
    });
  });
});
