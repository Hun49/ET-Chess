import { createRouter } from '@tanstack/react-router';
import { rootRoute } from './routes/__root';
import { gameRoute } from './routes/game';
import { indexRoute } from './routes/index';

export const routeTree = rootRoute.addChildren([indexRoute, gameRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
