import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANTI_FLASH_INLINE_SCRIPT,
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
} from './theme-manager';

describe('theme-manager for Web and Admin', () => {
  const originalLocalStorage = globalThis.localStorage;
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      key: vi.fn(() => null),
      length: 0,
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });

    // Provide document mockup
    if (typeof globalThis.document === 'undefined') {
      const mockDoc = {
        documentElement: {
          setAttribute: vi.fn(),
          getAttribute: vi.fn(),
        },
      };
      Object.defineProperty(globalThis, 'document', {
        value: mockDoc,
        writable: true,
        configurable: true,
      });
    }
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('retrieves default stored theme as system if nothing is stored', () => {
    expect(getStoredTheme()).toBe('system');
  });

  it('retrieves valid stored theme mode from localStorage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(getStoredTheme()).toBe('light');

    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(getStoredTheme()).toBe('dark');
  });

  it('falls back to system for invalid stored values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'invalid-value');
    expect(getStoredTheme()).toBe('system');
  });

  it('resolves explicit light and dark themes directly', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('resolves system theme based on matchMedia query', () => {
    const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(globalThis, 'window', {
      value: { matchMedia: mockMatchMedia },
      writable: true,
      configurable: true,
    });

    expect(getSystemTheme()).toBe('dark');
    expect(resolveTheme('system')).toBe('dark');
  });

  it('applies theme to document element and persists to localStorage', () => {
    const setAttributeSpy = vi.spyOn(document.documentElement, 'setAttribute');

    const result = applyTheme('dark');
    expect(result).toBe('dark');
    expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
    expect(localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
  });

  it('has a self-contained anti-flash script that mentions the storage key and data-theme', () => {
    expect(ANTI_FLASH_INLINE_SCRIPT).toContain(THEME_STORAGE_KEY);
    expect(ANTI_FLASH_INLINE_SCRIPT).toContain('data-theme');
    expect(ANTI_FLASH_INLINE_SCRIPT).toContain('prefers-color-scheme:dark');
  });
});
