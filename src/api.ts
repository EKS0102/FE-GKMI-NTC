import type { AuthProvider } from '@refinedev/core';
export type Identity = { user_id: number; username: string; role: 'admin' | 'staff' | 'viewer' };
type Tokens = { access_token: string; refresh_token: string };
const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const key = 'gkmi.session';
export function tokens(): Tokens | null { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; } }
export function clearSession() { sessionStorage.removeItem(key); }
let refreshing: Promise<void> | null = null;
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(base + path, { ...init, headers: { 'Content-Type': 'application/json', ...(tokens() ? { Authorization: `Bearer ${tokens()!.access_token}` } : {}), ...init.headers } });
  const raw = await response.text();
  let data; try { data = JSON.parse(raw); } catch { data = { message: raw }; }
  if (!response.ok) throw new ApiError(data?.message || 'Permintaan gagal. Coba lagi.', response.status);
  return data as T;
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = tokens()?.access_token;
  try { return await request<T>(path, init); } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || path.startsWith('/auth/refresh') || !tokens()?.refresh_token) throw error;
    if (tokens()?.access_token !== accessToken) return request<T>(path, init);
    if (!refreshing) refreshing = request<Tokens>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token: tokens()!.refresh_token }) }).then(t => { sessionStorage.setItem(key, JSON.stringify(t)); }).catch(e => { if(e instanceof ApiError && e.status === 401) { clearSession(); window.dispatchEvent(new Event('session-expired')); } throw e; }).finally(() => { refreshing = null; });
    await refreshing;
    return request<T>(path, init);
  }
}
export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    try { const t = await request<Tokens>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }); sessionStorage.setItem(key, JSON.stringify(t)); return { success: true, redirectTo: '/admin' }; }
    catch (e) { return { success: false, error: { name: 'Login gagal', message: e instanceof ApiError && e.status === 401 ? 'Username atau password tidak sesuai.' : 'Tidak dapat masuk. Periksa koneksi backend.' } }; }
  },
  logout: async () => { try { if (tokens()) await request('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: tokens()!.refresh_token }) }); } finally { clearSession(); } return { success: true, redirectTo: '/login' }; },
  check: async () => { if (!tokens()) return { authenticated: false, redirectTo: '/login' }; try { await api('/auth/me'); return { authenticated: true }; } catch (e) { if (e instanceof ApiError && e.status === 401) clearSession(); return { authenticated: false, redirectTo: '/login' }; } },
  getIdentity: () => api<Identity>('/auth/me'),
  getPermissions: async () => (await api<Identity>('/auth/me')).role,
  onError: async error => ({ error, ...(error.status === 401 ? { logout: true, redirectTo: '/login' } : {}) }),
};
