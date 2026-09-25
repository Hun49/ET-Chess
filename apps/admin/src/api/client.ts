import type { AppType } from '@et-chess/api';
import type { Report, User } from '@et-chess/types';
import { hc } from 'hono/client';

export type HonoClient = ReturnType<typeof hc<AppType>>;

export const apiClient: HonoClient = hc<AppType>('/');

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'offline';
  isMock: boolean;
  checkedAt: string;
}

export interface ReportsResult {
  reports: Report[];
  isMock: boolean;
}

export interface UsersResult {
  users: User[];
  isMock: boolean;
}

export const MOCK_USERS: User[] = [
  {
    id: 'usr_kasparov_1',
    displayName: 'Garry Kasparov',
    createdAt: new Date('2025-01-01T10:00:00.000Z'),
  },
  {
    id: 'usr_carlsen_2',
    displayName: 'Magnus Carlsen',
    createdAt: new Date('2025-01-02T14:30:00.000Z'),
  },
  {
    id: 'usr_nakamura_3',
    displayName: 'Hikaru Nakamura',
    createdAt: new Date('2025-01-03T18:15:00.000Z'),
  },
  {
    id: 'usr_judit_4',
    displayName: 'Judit Polgár',
    createdAt: new Date('2025-01-10T09:00:00.000Z'),
  },
  {
    id: 'usr_anand_5',
    displayName: 'Viswanathan Anand',
    createdAt: new Date('2025-01-15T11:45:00.000Z'),
  },
  {
    id: 'usr_caruana_6',
    displayName: 'Fabiano Caruana',
    createdAt: new Date('2025-01-20T16:20:00.000Z'),
  },
];

export const MOCK_REPORTS: Report[] = [
  {
    id: 'rep_init_1',
    reporterId: 'usr_carlsen_2',
    reason: 'Suspected engine assistance on move 24 (99.8% precision in complex endgame)',
    createdAt: new Date('2025-02-01T12:00:00.000Z'),
  },
  {
    id: 'rep_init_2',
    reporterId: 'usr_nakamura_3',
    reason: 'Clock stalling and intentional abandonment in lost position',
    createdAt: new Date('2025-02-15T15:30:00.000Z'),
  },
  {
    id: 'rep_init_3',
    reporterId: 'usr_judit_4',
    reason: 'Repeated unwanted draw offers in high-time-pressure scramble',
    createdAt: new Date('2025-02-28T19:45:00.000Z'),
  },
  {
    id: 'rep_init_4',
    reporterId: 'usr_kasparov_1',
    reason: 'Multiple rapid disconnections causing server timeout',
    createdAt: new Date('2025-03-05T08:10:00.000Z'),
  },
];

export async function fetchHealth(client: HonoClient = apiClient): Promise<HealthStatus> {
  const timestamp = new Date().toISOString();
  try {
    const res = await client.health.$get();
    if (res.ok) {
      const data = (await res.json()) as { status: 'ok' };
      return {
        status: data.status,
        isMock: false,
        checkedAt: timestamp,
      };
    }
  } catch {
    // API is offline or unreachable; fall back gracefully
  }
  return {
    status: 'offline',
    isMock: true,
    checkedAt: timestamp,
  };
}

export async function fetchReports(client: HonoClient = apiClient): Promise<ReportsResult> {
  try {
    const res = await client.reports.$get();
    if (res.ok) {
      const data = (await res.json()) as Array<{
        id: string;
        reporterId: string;
        reason: string;
        createdAt: string | Date;
      }>;
      const reports: Report[] = data.map((item) => ({
        id: item.id,
        reporterId: item.reporterId,
        reason: item.reason,
        createdAt: new Date(item.createdAt),
      }));
      return { reports, isMock: false };
    }
  } catch {
    // Fall back to mock reports
  }
  return { reports: [...MOCK_REPORTS], isMock: true };
}

export async function fetchUsers(client: HonoClient = apiClient): Promise<UsersResult> {
  try {
    const res = await client.users.$get();
    if (res.ok) {
      const data = (await res.json()) as Array<{
        id: string;
        displayName: string;
        createdAt: string | Date;
      }>;
      const users: User[] = data.map((item) => ({
        id: item.id,
        displayName: item.displayName,
        createdAt: new Date(item.createdAt),
      }));
      return { users, isMock: false };
    }
  } catch {
    // Fall back to mock users
  }
  return { users: [...MOCK_USERS], isMock: true };
}
