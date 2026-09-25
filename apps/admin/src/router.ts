import { createRouter } from '@tanstack/react-router';
import { rootRoute } from './routes/__root';
import { indexRoute } from './routes/index';
import { reportsRoute } from './routes/reports';
import { usersRoute } from './routes/users';

export const routeTree = rootRoute.addChildren([indexRoute, reportsRoute, usersRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
