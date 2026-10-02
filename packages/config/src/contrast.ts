/**
 * WCAG 2.1 Color Contrast Utilities
 * Implements relative luminance and contrast ratio calculations per W3C specification:
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function parseHexColor(hex: string): RgbColor {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean.charAt(0) + clean.charAt(0), 16);
    const g = parseInt(clean.charAt(1) + clean.charAt(1), 16);
    const b = parseInt(clean.charAt(2) + clean.charAt(2), 16);
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return { r, g, b };
  }
  throw new Error(`Invalid hex color: "${hex}"`);
}

function sRgbToLinear(c: number): number {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : ((norm + 0.055) / 1.055) ** 2.4;
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = parseHexColor(hex);
  const rLin = sRgbToLinear(r);
  const gLin = sRgbToLinear(g);
  const bLin = sRgbToLinear(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

export function getContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const l1 = getRelativeLuminance(foregroundHex);
  const l2 = getRelativeLuminance(backgroundHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWcagAA(
  foregroundHex: string,
  backgroundHex: string,
  isLargeText = false,
): boolean {
  const ratio = getContrastRatio(foregroundHex, backgroundHex);
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

export function meetsWcagAAA(
  foregroundHex: string,
  backgroundHex: string,
  isLargeText = false,
): boolean {
  const ratio = getContrastRatio(foregroundHex, backgroundHex);
  return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}
