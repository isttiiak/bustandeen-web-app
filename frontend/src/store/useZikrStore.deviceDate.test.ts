import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Audit 2026-11-16 P0-3: the zikr flush uses fetch, not the axios client, so the
// wrong-device-date 400 has its own path to the person.

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

vi.mock('../lib/api.js', () => ({
  API_BASE: '',
  getIdToken: () => Promise.resolve('test-token'),
}));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('react-hot-toast', () => ({ default: { error: toastError, success: vi.fn() } }));

const { useZikrStore } = await import('./useZikrStore.js');
const { getTrackingDay } = await import('../utils/trackingDay.js');

const fetchMock = vi.fn();
const refused = (body: unknown) => () =>
  Promise.resolve({
    ok: false,
    status: 400,
    clone: () => ({ json: () => Promise.resolve(body) }),
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  toastError.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  useZikrStore.setState({
    pending: { SubhanAllah: 4 },
    untimed: {},
    tapSpan: {},
    inflight: null,
    isFlushing: false,
    lastResetDate: getTrackingDay(),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('zikr flush: wrong device date', () => {
  it('tells the person when the server refuses the day', async () => {
    fetchMock.mockImplementationOnce(refused({ ok: false, code: 'client_day_mismatch' }));
    await useZikrStore.getState().flush();
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError.mock.calls[0]![1]).toMatchObject({ id: 'device-date' });
    // The taps are kept (P1-4): back in `pending`, ready for the right day.
    expect(useZikrStore.getState().inflight).toBeNull();
    expect(useZikrStore.getState().pending).toEqual({ SubhanAllah: 4 });
  });

  it('any other 400 gets its own message, not the device-date one', async () => {
    fetchMock.mockImplementationOnce(refused({ ok: false, error: 'Validation failed' }));
    await useZikrStore.getState().flush();
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError.mock.calls[0]![1]).toMatchObject({ id: 'zikr-batch-dropped' });
  });

  it('a 400 body that is not JSON is treated as any other refusal, and drops', async () => {
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        clone: () => ({ json: () => Promise.reject(new SyntaxError('bad json')) }),
      })
    );
    await useZikrStore.getState().flush();
    expect(toastError.mock.calls[0]![1]).toMatchObject({ id: 'zikr-batch-dropped' });
    expect(useZikrStore.getState().inflight).toBeNull();
    expect(useZikrStore.getState().pending).toEqual({});
  });
});
