import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  apiClient,
  fetchAdminRooms,
  fetchAdminStats,
  fetchAdminTournaments,
  fetchHealth,
  fetchReports,
  fetchUsers,
  type HonoClient,
  MOCK_ADMIN_ROOMS,
  MOCK_ADMIN_TOURNAMENTS,
  MOCK_REPORTS,
  MOCK_USERS,
} from './api/client';
import { router, routeTree } from './router';
import { rootRoute } from './routes/__root';
import { indexRoute } from './routes/index';
import { reportsRoute } from './routes/reports';
import { roomsRoute } from './routes/rooms';
import { tournamentsRoute } from './routes/tournaments';
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
    queryClient.setQueryData(['admin-rooms'], {
      rooms: MOCK_ADMIN_ROOMS,
      isMock: false,
    });
    queryClient.setQueryData(['admin-tournaments'], {
      tournaments: MOCK_ADMIN_TOURNAMENTS,
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

    describe('fetchAdminRooms', () => {
      it('returns parsed rooms and isMock false when client responds successfully', async () => {
        const mockRoomsPayload = {
          rooms: [
            {
              id: 'room_live_1',
              code: 'GAME99',
              hostUserId: 'usr_1',
              guestUserId: 'usr_2',
              timeControlMinutes: 10,
              timeControlIncrement: 0,
              hostColor: 'white',
              kind: 'friend',
              status: 'active',
              createdAt: '2026-03-30T10:00:00.000Z',
            },
          ],
        };

        const mockClient = {
          admin: {
            rooms: {
              $get: async () => ({
                ok: true,
                json: async () => mockRoomsPayload,
              }),
            },
          },
        } as unknown as HonoClient;

        const result = await fetchAdminRooms(mockClient);
        expect(result.isMock).toBe(false);
        expect(result.rooms).toHaveLength(1);
        expect(result.rooms[0]?.code).toBe('GAME99');
        expect(result.rooms[0]?.createdAt).toBeInstanceOf(Date);
      });

      it('gracefully falls back to MOCK_ADMIN_ROOMS when client call fails', async () => {
        const failingClient = {
          admin: {
            rooms: {
              $get: async () => {
                throw new Error('500 Error');
              },
            },
          },
        } as unknown as HonoClient;

        const result = await fetchAdminRooms(failingClient);
        expect(result.isMock).toBe(true);
        expect(result.rooms.length).toBeGreaterThanOrEqual(MOCK_ADMIN_ROOMS.length);
        expect(result.rooms[0]?.code).toBe(MOCK_ADMIN_ROOMS[0]?.code);
      });
    });

    describe('fetchAdminTournaments', () => {
      it('returns parsed tournaments and isMock false when client responds successfully', async () => {
        const mockTournamentsPayload = {
          tournaments: [
            {
              id: 't_live_1',
              name: 'Live Championship',
              status: 'in-progress',
              createdAt: '2026-03-30T12:00:00.000Z',
            },
          ],
        };

        const mockClient = {
          admin: {
            tournaments: {
              $get: async () => ({
                ok: true,
                json: async () => mockTournamentsPayload,
              }),
            },
          },
        } as unknown as HonoClient;

        const result = await fetchAdminTournaments(mockClient);
        expect(result.isMock).toBe(false);
        expect(result.tournaments).toHaveLength(1);
        expect(result.tournaments[0]?.name).toBe('Live Championship');
        expect(result.tournaments[0]?.createdAt).toBeInstanceOf(Date);
      });

      it('gracefully falls back to MOCK_ADMIN_TOURNAMENTS when client call fails', async () => {
        const failingClient = {
          admin: {
            tournaments: {
              $get: async () => {
                throw new Error('Network error');
              },
            },
          },
        } as unknown as HonoClient;

        const result = await fetchAdminTournaments(failingClient);
        expect(result.isMock).toBe(true);
        expect(result.tournaments.length).toBeGreaterThanOrEqual(MOCK_ADMIN_TOURNAMENTS.length);
      });
    });

    describe('fetchAdminStats', () => {
      it('returns stats payload when client responds successfully', async () => {
        const mockStats = {
          totalRooms: 12,
          activeRooms: 5,
          waitingRooms: 7,
          totalTournaments: 4,
          activeTournaments: 1,
        };

        const mockClient = {
          admin: {
            stats: {
              $get: async () => ({
                ok: true,
                json: async () => mockStats,
              }),
            },
          },
        } as unknown as HonoClient;

        const result = await fetchAdminStats(mockClient);
        expect(result.isMock).toBe(false);
        expect(result.totalRooms).toBe(12);
        expect(result.activeRooms).toBe(5);
      });

      it('gracefully falls back to mock stats when client fails', async () => {
        const failingClient = {
          admin: {
            stats: {
              $get: async () => {
                throw new Error('Failed');
              },
            },
          },
        } as unknown as HonoClient;

        const result = await fetchAdminStats(failingClient);
        expect(result.isMock).toBe(true);
        expect(result.totalRooms).toBe(2);
      });
    });
  });

  describe('Route Configurations and Router', () => {
    it('registers root, overview (/), rooms (/rooms), tournaments (/tournaments), reports (/reports), and users (/users) routes', () => {
      expect(rootRoute).toBeDefined();
      expect(indexRoute).toBeDefined();
      expect(roomsRoute).toBeDefined();
      expect(tournamentsRoute).toBeDefined();
      expect(reportsRoute).toBeDefined();
      expect(usersRoute).toBeDefined();

      expect(indexRoute.fullPath).toBe('/');
      expect(roomsRoute.fullPath).toBe('/rooms');
      expect(tournamentsRoute.fullPath).toBe('/tournaments');
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

      // Nav items including V2 items
      expect(html).toContain('Overview');
      expect(html).toContain('Rooms');
      expect(html).toContain('Tournaments');
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

    it('renders RoomsPage with table headers, mock rooms, and filters at /rooms', async () => {
      const html = await renderAppAtRoute('/rooms');

      // Title & search
      expect(html).toContain('Online Game Rooms');
      expect(html).toContain('Search room code...');

      // Columns
      expect(html).toContain('Code');
      expect(html).toContain('Kind');
      expect(html).toContain('Status');
      expect(html).toContain('Time Control');
      expect(html).toContain('Host / Guest');

      // Mock room data
      expect(html).toContain('CHESS1');
      expect(html).toContain('RAPID2');
      expect(html).toContain('usr_kaspar');
    });

    it('renders TournamentsPage with header, tournament cards, and metrics at /tournaments', async () => {
      const html = await renderAppAtRoute('/tournaments');

      // Title & subtitle
      expect(html).toContain('Tournaments Management');
      expect(html).toContain('single-elimination tournament cups');

      // Mock tournament data
      expect(html).toContain('ET Grand Prix 2026');
      expect(html).toContain('Spring Rapid Knockout');
      expect(html).toContain('in-progress');
      expect(html).toContain('registering');
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
