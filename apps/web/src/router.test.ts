import { describe, expect, it } from 'vitest';
import { router, routeTree } from './router';
import { rootRoute } from './routes/__root';
import { gameRoute, parseGameSearchParams } from './routes/game';
import { historyRoute } from './routes/history';
import { indexRoute } from './routes/index';
import { playComputerRoute } from './routes/play.computer';
import { playFriendRoute } from './routes/play.friend';
import { playLocalRoute } from './routes/play.local';
import { playOnlineRoute } from './routes/play.online';
import { profileRoute } from './routes/profile';

describe('apps/web routing tree', () => {
  it('registers all 4 play modes and app routes correctly', () => {
    expect(rootRoute).toBeDefined();
    expect(indexRoute).toBeDefined();
    expect(indexRoute.fullPath).toBe('/');

    expect(playOnlineRoute).toBeDefined();
    expect(playOnlineRoute.fullPath).toBe('/play/online');

    expect(playFriendRoute).toBeDefined();
    expect(playFriendRoute.fullPath).toBe('/play/friend');

    expect(playComputerRoute).toBeDefined();
    expect(playComputerRoute.fullPath).toBe('/play/computer');

    expect(playLocalRoute).toBeDefined();
    expect(playLocalRoute.fullPath).toBe('/play/local');

    expect(gameRoute).toBeDefined();
    expect(gameRoute.fullPath).toBe('/game');

    expect(historyRoute).toBeDefined();
    expect(historyRoute.fullPath).toBe('/history');

    expect(profileRoute).toBeDefined();
    expect(profileRoute.fullPath).toBe('/profile');

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
