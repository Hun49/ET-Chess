import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const authHeaders: Record<string, string> = {};
  try {
    const token = await SecureStore.getItemAsync('etchess_session_token');
    if (token) {
      authHeaders.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Continue without token
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}
