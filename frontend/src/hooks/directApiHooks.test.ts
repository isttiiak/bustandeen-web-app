import { beforeEach, describe, expect, it, vi } from 'vitest';

// Audit 2026-11-16 P4-4: the screens no longer call the API themselves; these
// hooks do. They must send exactly what the screens sent before, and fail at once
// when offline (networkMode 'always') so each screen's own error message shows.

const api = vi.hoisted(() => ({
  patch: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));
const auth = vi.hoisted(() => ({ isDemoMode: false }));

vi.mock('../lib/api.js', () => ({ default: api }));
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: { getState: () => auth } }));
// useMutation(options) -> options, so the options and the mutation function can be called directly.
vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => options,
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
  useQuery: () => ({}),
}));

import { useSetGender, useDeleteAccount } from './useUserProfile.js';
import { useSendFeedback } from './useFeedback.js';
import { useDangerAction } from './useDangerZone.js';
import { useResetKhatam } from './useQuran.js';

type Opts = {
  networkMode?: string;
  mutationFn: (v?: unknown) => Promise<unknown>;
};
const opts = (hook: () => unknown) => hook() as Opts;

beforeEach(() => {
  api.patch.mockReset();
  api.post.mockReset();
  api.delete.mockReset();
  auth.isDemoMode = false;
});

describe('useSetGender', () => {
  it('PATCHes only the gender and fails at once when offline', async () => {
    api.patch.mockResolvedValue({ data: { ok: true, user: { uid: 'u1', gender: 'female' } } });
    const o = opts(useSetGender);
    expect(o.networkMode).toBe('always');
    await expect(o.mutationFn('female')).resolves.toEqual({ uid: 'u1', gender: 'female' });
    expect(api.patch).toHaveBeenCalledWith('/api/user/me', { gender: 'female' });
  });

  it('is an error when the server answers without a user', async () => {
    api.patch.mockResolvedValue({ data: { ok: true } });
    await expect(opts(useSetGender).mutationFn('male')).rejects.toThrow();
  });

  it('accepts the demo mode reply, which has no user', async () => {
    auth.isDemoMode = true;
    api.patch.mockResolvedValue({ data: { ok: true } });
    await expect(opts(useSetGender).mutationFn('male')).resolves.toBeNull();
  });
});

describe('useDeleteAccount', () => {
  it('DELETEs the signed-in account, and a refusal reaches the caller untouched', async () => {
    const o = opts(useDeleteAccount);
    expect(o.networkMode).toBe('always');
    api.delete.mockResolvedValue({});
    await o.mutationFn();
    expect(api.delete).toHaveBeenCalledWith('/api/user/me');

    const refusal = { response: { data: { error: 'reauth_required' } } };
    api.delete.mockRejectedValue(refusal);
    await expect(o.mutationFn()).rejects.toBe(refusal);
  });
});

describe('useSendFeedback', () => {
  const payload = {
    name: 'A',
    email: 'a@b.c',
    message: 'long enough message',
    category: ['Bug'],
    kind: 'feedback',
    botcheck: '',
  };

  it('POSTs the form and fails at once when offline', async () => {
    api.post.mockResolvedValue({ data: { ok: true } });
    const o = opts(useSendFeedback);
    expect(o.networkMode).toBe('always');
    await o.mutationFn(payload);
    expect(api.post).toHaveBeenCalledWith('/api/feedback', payload);
  });

  it('treats ok: false as an error', async () => {
    api.post.mockResolvedValue({ data: { ok: false, error: 'Too many' } });
    await expect(opts(useSendFeedback).mutationFn(payload)).rejects.toThrow('Too many');
  });
});

describe('useDangerAction', () => {
  it('sends each method to its endpoint, with an empty body when none is given', async () => {
    const o = opts(useDangerAction);
    expect(o.networkMode).toBe('always');
    await o.mutationFn({ method: 'delete', endpoint: '/api/salat/all' });
    await o.mutationFn({ method: 'post', endpoint: '/api/quran/khatam/reset' });
    await o.mutationFn({ method: 'patch', endpoint: '/api/x', body: { a: 1 } });
    expect(api.delete).toHaveBeenCalledWith('/api/salat/all');
    expect(api.post).toHaveBeenCalledWith('/api/quran/khatam/reset', {});
    expect(api.patch).toHaveBeenCalledWith('/api/x', { a: 1 });
  });
});

describe('useResetKhatam', () => {
  it('POSTs the reset and fails at once when offline', async () => {
    api.post.mockResolvedValue({});
    const o = opts(useResetKhatam);
    expect(o.networkMode).toBe('always');
    await o.mutationFn();
    expect(api.post).toHaveBeenCalledWith('/api/quran/khatam/reset');
  });
});
