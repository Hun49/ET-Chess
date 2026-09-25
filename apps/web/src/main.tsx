import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { Swords, Users } from 'lucide-react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-surface-base text-gray-100 flex flex-col font-sans">
      <Outlet />
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <main className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-board-dark flex items-center justify-center text-white font-bold text-lg">
            ET
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">ET Chess</h1>
            <p className="text-xs text-gray-400">Minimalist Chess vs Stockfish</p>
          </div>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed mb-6">
          Welcome to ET Chess. A modern, high-performance chess client built with React, Vite, and
          TanStack Router.
        </p>
        <div className="space-y-3">
          <button
            type="button"
            className="w-full py-3 px-4 rounded-lg bg-board-dark hover:bg-board-dark/90 active:scale-[0.99] text-white font-semibold text-sm transition duration-150 cursor-pointer flex items-center justify-center gap-2"
          >
            <Swords className="w-4 h-4" />
            <span>Play vs Computer</span>
          </button>
          <button
            type="button"
            className="w-full py-3 px-4 rounded-lg bg-surface-accent hover:bg-surface-accent/80 active:scale-[0.99] text-gray-300 hover:text-white font-medium text-sm transition duration-150 cursor-pointer border border-surface-border flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            <span>Pass & Play</span>
          </button>
        </div>
      </div>
    </main>
  ),
});

const routeTree = rootRoute.addChildren([indexRoute]);

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}
