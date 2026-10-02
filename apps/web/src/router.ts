import { createRouter } from '@tanstack/react-router';
import { rootRoute } from './routes/__root';
import { gameRoute } from './routes/game';
import { historyRoute } from './routes/history';
import { indexRoute } from './routes/index';
import { playComputerRoute } from './routes/play.computer';
import { playFriendRoute } from './routes/play.friend';
import { playLocalRoute } from './routes/play.local';
import { playOnlineRoute } from './routes/play.online';
import { profileRoute } from './routes/profile';

export const routeTree = rootRoute.addChildren([
  indexRoute,
  playOnlineRoute,
  playFriendRoute,
  playComputerRoute,
  playLocalRoute,
  gameRoute,
  historyRoute,
  profileRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
