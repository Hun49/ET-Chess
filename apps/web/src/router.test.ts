import { describe, expect, it } from 'vitest';
import { router, routeTree } from './router';
import { rootRoute } from './routes/__root';
import { gameRoute, parseGameSearchParams } from './routes/game';
import { indexRoute } from './routes/index';

describe('apps/web routing tree', () => {
  it('registers root, index (/), and game (/game) routes correctly', () => {
    expect(rootRoute).toBeDefined();
    expect(indexRoute).toBeDefined();
    expect(gameRoute).toBeDefined();
    expect(indexRoute.fullPath).toBe('/');
    expect(gameRoute.fullPath).toBe('/game');
    expect(gameRoute.path).toBe('game');
    expect(routeTree).toBeDefined();
    expect(router).toBeDefined();
  });

  describe('parseGameSearchParams', () => {
    it('validates mode=bot search parameter', () => {
      const result = parseGameSearchParams({ mode: 'bot' });
      expect(result).toEqual({ mode: 'bot' });
    });

    it('validates mode=local search parameter', () => {
      const result = parseGameSearchParams({ mode: 'local' });
      expect(result).toEqual({ mode: 'local' });
    });

    it('falls back to default mode=bot when search parameters are empty or invalid', () => {
      expect(parseGameSearchParams({})).toEqual({ mode: 'bot' });
      expect(parseGameSearchParams({ mode: 'invalid' })).toEqual({ mode: 'bot' });
      expect(parseGameSearchParams({ mode: 999 })).toEqual({ mode: 'bot' });
      expect(parseGameSearchParams({ mode: null })).toEqual({ mode: 'bot' });
      expect(parseGameSearchParams({ mode: undefined })).toEqual({ mode: 'bot' });
    });
  });
});
