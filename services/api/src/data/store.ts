import type { Report, User } from '@et-chess/types';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_kasparov_1',
    displayName: 'Garry Kasparov',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  },
  {
    id: 'usr_carlsen_2',
    displayName: 'Magnus Carlsen',
    createdAt: new Date('2025-01-02T00:00:00.000Z'),
  },
  {
    id: 'usr_nakamura_3',
    displayName: 'Hikaru Nakamura',
    createdAt: new Date('2025-01-03T00:00:00.000Z'),
  },
];

export const INITIAL_REPORTS: Report[] = [
  {
    id: 'rep_init_1',
    reporterId: 'usr_carlsen_2',
    reason: 'Suspected engine assistance on move 24',
    createdAt: new Date('2025-02-01T12:00:00.000Z'),
  },
  {
    id: 'rep_init_2',
    reporterId: 'usr_nakamura_3',
    reason: 'Clock stalling and abandonment',
    createdAt: new Date('2025-02-15T15:30:00.000Z'),
  },
];

let inMemoryUsers: User[] = [...INITIAL_USERS];
let inMemoryReports: Report[] = [...INITIAL_REPORTS];

export function resetStore(): void {
  inMemoryUsers = [...INITIAL_USERS];
  inMemoryReports = [...INITIAL_REPORTS];
}

export async function getUsers(d1?: D1Database): Promise<User[]> {
  if (d1) {
    try {
      const db = drizzle(d1, { schema });
      const rows = await db.select().from(schema.users);
      if (rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          displayName: r.displayName,
          createdAt: r.createdAt,
        }));
      }
    } catch {
      // D1 query failed or not migrated, fallback to in-memory seed data
    }
  }
  return [...inMemoryUsers];
}

export async function getReports(d1?: D1Database): Promise<Report[]> {
  if (d1) {
    try {
      const db = drizzle(d1, { schema });
      const rows = await db.select().from(schema.reports);
      if (rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          reporterId: r.reporterId,
          reason: r.reason,
          createdAt: r.createdAt,
        }));
      }
    } catch {
      // D1 query failed or not migrated, fallback to in-memory seed data
    }
  }
  return [...inMemoryReports];
}

export async function createReport(
  input: { reporterId: string; reason: string },
  d1?: D1Database,
): Promise<Report> {
  const newReport: Report = {
    id: crypto.randomUUID(),
    reporterId: input.reporterId,
    reason: input.reason,
    createdAt: new Date(),
  };

  if (d1) {
    try {
      const db = drizzle(d1, { schema });
      await db.insert(schema.reports).values({
        id: newReport.id,
        reporterId: newReport.reporterId,
        reason: newReport.reason,
        createdAt: newReport.createdAt,
      });
    } catch {
      // D1 insert failed or not migrated, fallback to in-memory store
    }
  }

  inMemoryReports.push(newReport);
  return newReport;
}
