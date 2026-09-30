export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8787';

export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}
