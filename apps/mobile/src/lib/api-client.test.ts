import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api-client';
import * as authModule from './auth-client';

describe('Mobile Auth Transport & API Client (Task 9)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('attaches Better Auth cookie to outgoing API requests when authenticated', async () => {
    vi.spyOn(authModule, 'getCookie').mockResolvedValue(
      'better-auth.session_token=test_session_cookie_123',
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    globalThis.fetch = mockFetch;

    await apiFetch('/rooms');

    expect(authModule.getCookie).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/rooms'),
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          cookie: 'better-auth.session_token=test_session_cookie_123',
        }),
      }),
    );
  });

  it('sends request without cookie header when unauthenticated/logged out', async () => {
    vi.spyOn(authModule, 'getCookie').mockResolvedValue('');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    globalThis.fetch = mockFetch;

    await apiFetch('/health');

    expect(authModule.getCookie).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0]?.[1] as RequestInit;
    expect((callArgs?.headers as any)?.cookie).toBeUndefined();
  });

  it('throws descriptive error on 401 Unauthorized or failure response', async () => {
    vi.spyOn(authModule, 'getCookie').mockResolvedValue('better-auth.session_token=expired_token');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized: Authentication required' }),
    });
    globalThis.fetch = mockFetch;

    await expect(apiFetch('/admin/stats')).rejects.toThrow('Unauthorized: Authentication required');
  });
});
