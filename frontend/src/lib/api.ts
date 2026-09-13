import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import toast from 'react-hot-toast';
import { auth } from '../firebase.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useAdminStore } from '../store/useAdminStore.js';
import { getDemoResponse } from '../utils/demoData.js';
import i18n from '../i18n.js';

/**
 * Backend origin. In production the API lives on the SAME Vercel deployment
 * (/api/* serverless function), so this is empty — same-origin requests, no
 * CORS, no separate cold host. VITE_BACKEND_URL still overrides it (local dev
 * or a split deployment); in dev it falls back to the local backend port.
 */
export const API_BASE: string =
  import.meta.env.VITE_BACKEND_URL ?? (import.meta.env.DEV ? 'http://localhost:5001' : '');

const api = axios.create({ baseURL: API_BASE });

/**
 * Returns a valid Firebase ID token, or null for guests.
 * auth.currentUser.getIdToken() serves a cached token and transparently
 * refreshes it when it is about to expire (Firebase tokens live 1 hour) —
 * this is what keeps long sessions from 401-ing.
 * The localStorage copy is only a fallback for the brief window before
 * Firebase has restored the session on a hard reload.
 */
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      localStorage.setItem('bustandeen_idToken', token);
      return token;
    } catch {
      /* fall through to cached copy */
    }
  }
  return localStorage.getItem('bustandeen_idToken');
}

// Demo mode: intercept all requests and return mock data
api.interceptors.request.use((config) => {
  if (useAuthStore.getState().isDemoMode) {
    const method = (config.method ?? 'get').toLowerCase();
    const url = config.url ?? '';
    const gender = useAuthStore.getState().user?.gender ?? 'male';
    const mock = getDemoResponse(url, method, gender);
    config.adapter = () =>
      Promise.resolve({
        data: mock,
        status: 200,
        statusText: 'OK',
        headers: {} as unknown as AxiosHeaders,
        config: config as InternalAxiosRequestConfig,
      });
  }
  return config;
});

// Attach a fresh Firebase token to every request
api.interceptors.request.use(async (config) => {
  if (useAuthStore.getState().isDemoMode) return config;
  const token = await getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Admin panel's second-factor session token — harmless on non-admin routes
// (the backend only ever checks this header under /api/admin/*).
api.interceptors.request.use((config) => {
  const adminToken = useAdminStore.getState().token;
  if (adminToken) config.headers['X-Admin-Token'] = adminToken;
  return config;
});

// Tell the backend which language the UI is currently showing — used by
// Naseeh (AI) replies so a Bengali-reading user doesn't get an English reply
// glued into an otherwise-translated page. Not personal data, no consent gate
// needed (it's the same language already visible in this browser's UI).
api.interceptors.request.use((config) => {
  config.headers['X-App-Language'] = i18n.language?.startsWith('bn') ? 'bn' : 'en';
  return config;
});

// Handle 401 globally — only redirect if the user HAD a session (it expired
// server-side or was revoked). Guest users (no Firebase session) simply get
// the rejected promise back without a redirect.
api.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      const hadSession = !!auth.currentUser || !!localStorage.getItem('bustandeen_idToken');
      localStorage.removeItem('bustandeen_idToken');
      if (hadSession && auth.currentUser === null) {
        window.location.href = '/login';
      }
    }
    // Admin session token missing/expired — drop it so AdminGate re-prompts
    // for the panel password instead of the request just failing silently.
    if (
      axios.isAxiosError(err) &&
      err.response?.status === 401 &&
      (err.response.data as { error?: string } | undefined)?.error === 'admin_session_required'
    ) {
      useAdminStore.getState().logout();
    }
    // Rate limited — tell the user instead of failing silently.
    // Fixed toast id so a burst of 429s shows a single message.
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      toast.error('Too many requests — please wait a moment and try again.', {
        id: 'rate-limit',
        duration: 4000,
      });
    }
    return Promise.reject(err);
  }
);

export default api;
