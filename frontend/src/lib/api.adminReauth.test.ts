import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

vi.hoisted(() => {
  const m = new Map<string, string>();
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, String(v)),
      removeItem: (k: string) => void m.delete(k),
      clear: () => m.clear(),
    },
  });
});

const { default: api } = await import('./api.js');
const { useAdminReauthStore } = await import('../store/useAdminReauthStore.js');
const { useAdminStore } = await import('../store/useAdminStore.js');

/** Answers each request in turn with the given status and body. */
function answer(...replies: { status: number; data: unknown }[]) {
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    const reply = replies.shift() ?? { status: 200, data: { ok: true } };
    const response = {
      data: reply.data,
      status: reply.status,
      statusText: '',
      headers: new AxiosHeaders(),
      config,
    };
    if (reply.status >= 400) {
      throw new AxiosError('fail', 'ERR_BAD_REQUEST', config, null, response);
    }
    return response;
  });
  api.defaults.adapter = adapter;
  return adapter;
}

const reauthRequired = { status: 401, data: { ok: false, error: 'admin_reauth_required' } };

describe('admin re-auth in the API client (U8.4)', () => {
  beforeEach(() => {
    useAdminReauthStore.setState({ open: false, resolve: null });
  });

  it('asks for the password once, then repeats the request', async () => {
    const adapter = answer(reauthRequired, { status: 200, data: { ok: true, done: 1 } });
    const pending = api.delete('/api/admin/users/u1');
    await vi.waitFor(() => expect(useAdminReauthStore.getState().open).toBe(true));
    useAdminReauthStore.getState().settle(true);
    await expect(pending).resolves.toMatchObject({ data: { done: 1 } });
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('a cancelled prompt fails the action without repeating it', async () => {
    const adapter = answer(reauthRequired);
    const pending = api.delete('/api/admin/users/u1');
    await vi.waitFor(() => expect(useAdminReauthStore.getState().open).toBe(true));
    useAdminReauthStore.getState().settle(false);
    await expect(pending).rejects.toBeInstanceOf(AxiosError);
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('never prompts twice for the same request', async () => {
    const adapter = answer(reauthRequired, reauthRequired);
    const pending = api.delete('/api/admin/users/u1');
    await vi.waitFor(() => expect(useAdminReauthStore.getState().open).toBe(true));
    useAdminReauthStore.getState().settle(true);
    await expect(pending).rejects.toBeInstanceOf(AxiosError);
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(useAdminReauthStore.getState().open).toBe(false);
  });

  it('an expired admin session signs the panel out', async () => {
    useAdminStore.getState().setSession('a@test.dev', 'servant', null);
    answer({ status: 401, data: { ok: false, error: 'admin_session_expired' } });
    await expect(api.get('/api/admin/users')).rejects.toBeInstanceOf(AxiosError);
    expect(useAdminStore.getState().status).toBe('signedOut');
  });
});

describe('admin second factor in the API client (T1.4)', () => {
  it('a 403 mfa_required drops the stored proof and asks for a code again', async () => {
    useAdminStore.getState().setSession('a@test.dev', 'servant', null);
    localStorage.setItem('bustandeen_admin_mfa', 'stale.proof');
    answer({ status: 403, data: { ok: false, error: 'mfa_required', mfa: 'verify' } });
    await expect(api.get('/api/admin/users')).rejects.toBeInstanceOf(AxiosError);
    expect(useAdminStore.getState()).toMatchObject({ status: 'mfa', mfaStep: 'verify' });
    expect(localStorage.getItem('bustandeen_admin_mfa')).toBeNull();
  });

  it('a reset authenticator sends the admin to set one up', async () => {
    useAdminStore.getState().setSession('a@test.dev', 'ansar', 'general');
    answer({ status: 403, data: { ok: false, error: 'mfa_required', mfa: 'enroll' } });
    await expect(api.get('/api/admin/feedback')).rejects.toBeInstanceOf(AxiosError);
    expect(useAdminStore.getState().mfaStep).toBe('enroll');
  });

  it('any other 403 (wrong role) leaves the session alone', async () => {
    useAdminStore.getState().setSession('a@test.dev', 'ansar', 'general');
    answer({ status: 403, data: { ok: false, error: 'Servant only' } });
    await expect(api.get('/api/admin/users')).rejects.toBeInstanceOf(AxiosError);
    expect(useAdminStore.getState().status).toBe('ready');
  });
});

describe('useAdminReauthStore', () => {
  it('two requests waiting on one prompt both get its outcome', async () => {
    useAdminReauthStore.setState({ open: false, resolve: null });
    const a = useAdminReauthStore.getState().request();
    const b = useAdminReauthStore.getState().request();
    useAdminReauthStore.getState().settle(true);
    await expect(Promise.all([a, b])).resolves.toEqual([true, true]);
  });
});
