import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  apiClient,
  fetchHealth,
  fetchReports,
  fetchUsers,
  type HonoClient,
  MOCK_REPORTS,
  MOCK_USERS,
} from './api/client';
import { router, routeTree } from './router';
import { rootRoute } from './routes/__root';
import { indexRoute } from './routes/index';
import { reportsRoute } from './routes/reports';
import { usersRoute } from './routes/users';

function createTestQueryClient(prefill = true) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  if (prefill) {
    queryClient.setQueryData(['health'], {
      status: 'ok',
      isMock: false,
      checkedAt: '2026-09-26T00:00:00.000Z',
    });
    queryClient.setQueryData(['reports'], {
      reports: MOCK_REPORTS,
      isMock: false,
    });
    queryClient.setQueryData(['users'], {
      users: MOCK_USERS,
      isMock: false,
    });
  }

  return queryClient;
}

async function renderAppAtRoute(path: string, prefill = true) {
  const queryClient = createTestQueryClient(prefill);
  const history = createMemoryHistory({ initialEntries: [path] });
  const testRouter = createRouter({
    routeTree,
    history,
  });
  await testRouter.load();

  return renderToString(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(RouterProvider, { router: testRouter }),
    ),
  );
}

describe('Admin Dashboard (apps/admin)', () => {
  describe('RPC Client Instantiation and Helper Functions', () => {
    it('initializes apiClient using hc client with expected route endpoints', () => {
      expect(apiClient).toBeDefined();
      expect(typeof apiClient.health.$get).toBe('function');
      expect(typeof apiClient.reports.$get).toBe('function');
      expect(typeof apiClient.reports.$post).toBe('function');
      expect(typeof apiClient.users.$get).toBe('function');
    });

    describe('fetchHealth', () => {
      it('returns status ok and isMock false when client responds successfully', async () => {
        const mockClient = {
          health: {
            $get: async () => ({
              ok: true,
              json: async () => ({ status: 'ok' as const }),
            }),
          },
        } as unknown as HonoClient;

        const result = await fetchHealth(mockClient);
        expect(result.status).toBe('ok');
        expect(result.isMock).toBe(false);
        expect(typeof result.checkedAt).toBe('string');
      });

      it('gracefully falls back to offline and isMock true when client call fails', async () => {
        const failingClient = {
          health: {
            $get: async () => {
              throw new Error('Connection refused');
            },
          },
        } as unknown as HonoClient;

        const result = await fetchHealth(failingClient);
        expect(result.status).toBe('offline');
        expect(result.isMock).toBe(true);
      });

      it('falls back gracefully when called with default apiClient in test environment', async () => {
        const result = await fetchHealth();
        expect(result).toBeDefined();
        expect(['ok', 'offline', 'degraded']).toContain(result.status);
      });
    });

    describe('fetchReports', () => {
      it('returns parsed reports and isMock false when client responds successfully', async () => {
        const mockReportsPayload = [
          {
            id: 'rep_test_1',
            reporterId: 'usr_reporter_1',
            reason: 'Test unfair play',
            createdAt: '2025-05-01T10:00:00.000Z',
          },
        ];

        const mockClient = {
          reports: {
            $get: async () => ({
              ok: true,
              json: async () => mockReportsPayload,
            }),
          },
        } as unknown as HonoClient;

        const result = await fetchReports(mockClient);
        expect(result.isMock).toBe(false);
        expect(result.reports).toHaveLength(1);
        expect(result.reports[0]?.id).toBe('rep_test_1');
        expect(result.reports[0]?.createdAt).toBeInstanceOf(Date);
        expect(result.reports[0]?.createdAt.toISOString()).toBe('2025-05-01T10:00:00.000Z');
      });

      it('gracefully falls back to MOCK_REPORTS when client call fails', async () => {
        const failingClient = {
          reports: {
            $get: async () => {
              throw new Error('500 Internal Error');
            },
          },
        } as unknown as HonoClient;

        const result = await fetchReports(failingClient);
        expect(result.isMock).toBe(true);
        expect(result.reports.length).toBeGreaterThanOrEqual(MOCK_REPORTS.length);
        expect(result.reports[0]?.id).toBe(MOCK_REPORTS[0]?.id);
      });

      it('falls back gracefully when called with default apiClient in test environment', async () => {
        const result = await fetchReports();
        expect(result.reports.length).toBeGreaterThan(0);
        expect(result.reports[0]?.createdAt).toBeInstanceOf(Date);
      });
    });

    describe('fetchUsers', () => {
      it('returns parsed users and isMock false when client responds successfully', async () => {
        const mockUsersPayload = [
          {
            id: 'usr_test_1',
            displayName: 'Bobby Fischer',
            createdAt: '2025-04-10T12:00:00.000Z',
          },
        ];

        const mockClient = {
          users: {
            $get: async () => ({
              ok: true,
              json: async () => mockUsersPayload,
            }),
          },
        } as unknown as HonoClient;

        const result = await fetchUsers(mockClient);
        expect(result.isMock).toBe(false);
        expect(result.users).toHaveLength(1);
        expect(result.users[0]?.displayName).toBe('Bobby Fischer');
        expect(result.users[0]?.createdAt).toBeInstanceOf(Date);
      });

      it('gracefully falls back to MOCK_USERS when client call fails', async () => {
        const failingClient = {
          users: {
            $get: async () => {
              throw new Error('Network timeout');
            },
          },
        } as unknown as HonoClient;

        const result = await fetchUsers(failingClient);
        expect(result.isMock).toBe(true);
        expect(result.users.length).toBeGreaterThanOrEqual(MOCK_USERS.length);
        expect(result.users[0]?.id).toBe(MOCK_USERS[0]?.id);
      });

      it('falls back gracefully when called with default apiClient in test environment', async () => {
        const result = await fetchUsers();
        expect(result.users.length).toBeGreaterThan(0);
        expect(result.users[0]?.createdAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Route Configurations and Router', () => {
    it('registers root, overview (/), reports (/reports), and users (/users) routes', () => {
      expect(rootRoute).toBeDefined();
      expect(indexRoute).toBeDefined();
      expect(reportsRoute).toBeDefined();
      expect(usersRoute).toBeDefined();

      expect(indexRoute.fullPath).toBe('/');
      expect(reportsRoute.fullPath).toBe('/reports');
      expect(usersRoute.fullPath).toBe('/users');

      expect(routeTree).toBeDefined();
      expect(router).toBeDefined();
      expect(router.options.routeTree).toBe(routeTree);
      expect(router.options.defaultPreload).toBe('intent');
    });
  });

  describe('Page Component Rendering', () => {
    it('renders RootLayout with branding, navigation items, and API pill at root', async () => {
      const html = await renderAppAtRoute('/');

      // Branding
      expect(html).toContain('ET Chess');
      expect(html).toContain('Admin');
      expect(html).toContain('Control Center &amp; Moderation');

      // Nav items
      expect(html).toContain('Overview');
      expect(html).toContain('Reports');
      expect(html).toContain('Users');

      // System tech notes
      expect(html).toContain('Hono RPC');
      expect(html).toContain('hc&lt;AppType&gt;');
    });

    it('renders OverviewPage with 4 metric cards and API specifications at /', async () => {
      const html = await renderAppAtRoute('/');

      // Title
      expect(html).toContain('Admin Overview');

      // Metric Cards
      expect(html).toContain('Total Users');
      expect(html).toContain('Active Reports');
      expect(html).toContain('Server Health');
      expect(html).toContain('Release Version');

      // Version details
      expect(html).toContain('v1.0.0');
      expect(html).toContain('Cloudflare Pages + D1');

      // API Endpoints list
      expect(html).toContain('GET /health');
      expect(html).toContain('GET /users');
      expect(html).toContain('GET /reports');
      expect(html).toContain('POST /reports');
    });

    it('renders ReportsPage with table headers, mock reports, and search input at /reports', async () => {
      const html = await renderAppAtRoute('/reports');

      // Page Title & Header
      expect(html).toContain('Infraction Reports');
      expect(html).toContain('Search by Report ID, Reporter ID, or Reason...');

      // Table Column Headers
      expect(html).toContain('Report ID');
      expect(html).toContain('Reporter ID');
      expect(html).toContain('Reason / Summary');
      expect(html).toContain('Created At');

      // Mock reports content
      expect(html).toContain('rep_init_1');
      expect(html).toContain('usr_carlsen_2');
      expect(html).toContain('Suspected engine assistance');
    });

    it('renders UsersPage with table headers and mock user directory at /users', async () => {
      const html = await renderAppAtRoute('/users');

      // Page Title & Header
      expect(html).toContain('User Management');
      expect(html).toContain('Search by User ID or Display Name...');

      // Table Column Headers
      expect(html).toContain('User ID');
      expect(html).toContain('Display Name');
      expect(html).toContain('Member Since');

      // Mock users content
      expect(html).toContain('usr_kasparov_1');
      expect(html).toContain('Garry Kasparov');
      expect(html).toContain('usr_carlsen_2');
      expect(html).toContain('Magnus Carlsen');
      expect(html).toContain('usr_nakamura_3');
      expect(html).toContain('Hikaru Nakamura');
    });
  });
});
