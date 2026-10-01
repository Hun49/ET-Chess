import type { Report, User } from '@et-chess/types';
import { hc } from 'hono/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStore } from './data/store';
import app, { type AppType } from './index';

describe('ET-Chess API (@et-chess/api)', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('GET /health', () => {
    it('returns status ok with 200 status code', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);

      const data = (await res.json()) as { status: string };
      expect(data).toEqual({ status: 'ok' });
    });
  });

  const adminHeaders = {
    'x-test-user-id': 'admin_tester',
    'x-test-user-role': 'admin',
  };

  const userHeaders = {
    'x-test-user-id': 'usr_carlsen_2',
  };

  describe('GET /reports', () => {
    it('returns array of reports with 200 status code for admin', async () => {
      const res = await app.request('/reports', {
        headers: adminHeaders,
      });
      expect(res.status).toBe(200);

      const data = (await res.json()) as Report[];
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      const first = data[0];
      expect(first).toBeDefined();
      expect(first?.id).toBeDefined();
      expect(first?.reporterId).toBeDefined();
      expect(first?.reason).toBeDefined();
      expect(first?.createdAt).toBeDefined();
    });
  });

  describe('POST /reports', () => {
    it('creates report and returns 201 with valid body when authenticated', async () => {
      const newReportPayload = {
        reporterId: 'usr_carlsen_2',
        reason: 'Repeated intentional disconnections',
      };

      const res = await app.request('/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...userHeaders,
        },
        body: JSON.stringify(newReportPayload),
      });

      expect([200, 201]).toContain(res.status);
      const data = (await res.json()) as Report;
      expect(data.reporterId).toBe(newReportPayload.reporterId);
      expect(data.reason).toBe(newReportPayload.reason);
      expect(typeof data.id).toBe('string');
      expect(data.createdAt).toBeDefined();

      // Verify subsequent GET returns the new report
      const listRes = await app.request('/reports', {
        headers: adminHeaders,
      });
      const listData = (await listRes.json()) as Report[];
      const createdInList = listData.find((r) => r.id === data.id);
      expect(createdInList).toBeDefined();
      expect(createdInList?.reason).toBe(newReportPayload.reason);
    });

    it('returns 400 when reason is missing or empty', async () => {
      const invalidPayload = {
        reason: '   ',
      };

      const res = await app.request('/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...userHeaders,
        },
        body: JSON.stringify(invalidPayload),
      });

      expect(res.status).toBe(400);
    });

    it('returns 400 when body is malformed JSON', async () => {
      const res = await app.request('/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...userHeaders,
        },
        body: '{ malformed json',
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /users', () => {
    it('returns array of users with 200 status code', async () => {
      const res = await app.request('/users');
      expect(res.status).toBe(200);

      const data = (await res.json()) as User[];
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      const first = data[0];
      expect(first).toBeDefined();
      expect(first?.id).toBeDefined();
      expect(first?.displayName).toBeDefined();
      expect(first?.createdAt).toBeDefined();
    });
  });

  describe('Hono RPC Client type compatibility', () => {
    it('can be queried via hc client', async () => {
      const client = hc<AppType>('http://localhost', {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => app.request(input, init),
      });

      const healthRes = await client.health.$get();
      expect(healthRes.status).toBe(200);
      const healthData = await healthRes.json();
      expect(healthData).toEqual({ status: 'ok' });

      const usersRes = await client.users.$get();
      expect(usersRes.status).toBe(200);
      const usersData = await usersRes.json();
      expect(Array.isArray(usersData)).toBe(true);

      const postRes = await client.reports.$post(
        {
          json: {
            reason: 'Engine score correlation 99%',
          },
        },
        {
          headers: {
            'x-test-user-id': 'usr_kasparov_1',
          },
        },
      );
      expect([200, 201]).toContain(postRes.status);
    });
  });

  describe('Error handling', () => {
    it('returns 404 for unknown route', async () => {
      const res = await app.request('/unknown-route');
      expect(res.status).toBe(404);
      const data = (await res.json()) as { error: string };
      expect(data).toEqual({ error: 'Not Found' });
    });
  });
});
