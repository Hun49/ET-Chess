import { describe, expect, it } from 'vitest';
import app from '../index';

describe('Admin Routes (/admin)', () => {
  it('GET /admin/rooms returns rooms array', async () => {
    const res = await app.request('/admin/rooms');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.rooms)).toBe(true);
  });

  it('GET /admin/tournaments returns tournaments array', async () => {
    const res = await app.request('/admin/tournaments');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.tournaments)).toBe(true);
  });

  it('GET /admin/stats returns summary statistics', async () => {
    const res = await app.request('/admin/stats');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body).toHaveProperty('totalRooms');
    expect(body).toHaveProperty('activeRooms');
    expect(body).toHaveProperty('totalTournaments');
  });
});
