import { describe, expect, it } from 'vitest';
import app from '../index';

describe('Admin Routes (/admin)', () => {
  const adminHeaders = {
    'x-test-user-id': 'admin_usr_1',
    'x-test-user-role': 'admin',
  };

  const userHeaders = {
    'x-test-user-id': 'regular_usr_1',
    'x-test-user-role': 'user',
  };

  it('rejects unauthenticated requests with 401', async () => {
    const res = await app.request('/admin/stats');
    expect(res.status).toBe(401);
  });

  it('rejects non-admin requests with 403', async () => {
    const res = await app.request('/admin/stats', {
      headers: userHeaders,
    });
    expect(res.status).toBe(403);
  });

  it('GET /admin/rooms returns rooms array for admin', async () => {
    const res = await app.request('/admin/rooms', {
      headers: adminHeaders,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.rooms)).toBe(true);
  });

  it('GET /admin/tournaments returns tournaments array for admin', async () => {
    const res = await app.request('/admin/tournaments', {
      headers: adminHeaders,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.tournaments)).toBe(true);
  });

  it('GET /admin/stats returns summary statistics for admin', async () => {
    const res = await app.request('/admin/stats', {
      headers: adminHeaders,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body).toHaveProperty('totalRooms');
    expect(body).toHaveProperty('activeRooms');
    expect(body).toHaveProperty('totalTournaments');
  });
});
