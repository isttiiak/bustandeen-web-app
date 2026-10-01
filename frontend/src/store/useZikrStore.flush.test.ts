import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Audit T2.3: a zikr batch keeps one op id across retries (the server dedupes
// it), leaves `pending` the moment it is sent, and survives a day rollover.

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

const { useZikrStore, unsyncedCounts } = await import('./useZikrStore.js');
const { getTrackingDay } = await import('../utils/trackingDay.js');

type FetchCall = [string, { headers: Record<string, string>; body: string }];
const fetchMock = vi.fn();
const calls = () => fetchMock.mock.calls as FetchCall[];
const ok = () => Promise.resolve({ ok: true, status: 200 });
const status = (code: number) => Promise.resolve({ ok: false, status: code });
const offline = () => Promise.reject(new TypeError('Failed to fetch'));

const today = () => getTrackingDay();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  useZikrStore.setState({
    pending: {},
    untimed: {},
    tapSpan: {},
    inflight: null,
    isFlushing: false,
    lastResetDate: today(),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const tap = (type: string, n: number) =>
  useZikrStore.setState((s) => ({ pending: { ...s.pending, [type]: (s.pending[type] ?? 0) + n } }));
const flush = () => useZikrStore.getState().flush();
const sentAmounts = (i: number) =>
  Object.fromEntries(
    (
      JSON.parse(calls()[i]![1].body) as { increments: { zikrType: string; amount: number }[] }
    ).increments.map((x) => [x.zikrType, x.amount])
  );

describe('zikr batch flush', () => {
  it('sends the pending taps with an op id and clears them on success', async () => {
    tap('SubhanAllah', 33);
    fetchMock.mockImplementation(ok);
    await flush();
    expect(calls()).toHaveLength(1);
    expect(calls()[0]![1].headers['X-Client-Op-Id']).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(sentAmounts(0)).toEqual({ SubhanAllah: 33 });
    expect(useZikrStore.getState().inflight).toBeNull();
    expect(useZikrStore.getState().pending).toEqual({});
  });

  it('offline: the batch is kept, and the retry repeats it exactly (same op id and body)', async () => {
    tap('SubhanAllah', 10);
    fetchMock.mockImplementationOnce(offline);
    await flush();
    const kept = useZikrStore.getState().inflight;
    expect(kept).not.toBeNull();
    // Moved out of pending, still counted as unsynced.
    expect(useZikrStore.getState().pending).toEqual({});
    expect(unsyncedCounts(useZikrStore.getState())).toEqual({ SubhanAllah: 10 });

    fetchMock.mockImplementation(ok);
    await flush();
    expect(calls()[1]![1].headers['X-Client-Op-Id']).toBe(kept!.opId);
    expect(calls()[1]![1].body).toBe(calls()[0]![1].body);
    expect(useZikrStore.getState().inflight).toBeNull();
  });

  it('taps made while a batch is stuck go out afterwards as a separate batch', async () => {
    tap('SubhanAllah', 10);
    fetchMock.mockImplementationOnce(offline);
    await flush();
    tap('SubhanAllah', 5);
    tap('Alhamdulillah', 3);
    expect(unsyncedCounts(useZikrStore.getState())).toEqual({ SubhanAllah: 15, Alhamdulillah: 3 });

    fetchMock.mockImplementation(ok);
    await flush();
    await vi.waitFor(() => expect(calls()).toHaveLength(3));
    expect(sentAmounts(1)).toEqual({ SubhanAllah: 10 });
    expect(sentAmounts(2)).toEqual({ SubhanAllah: 5, Alhamdulillah: 3 });
    expect(calls()[2]![1].headers['X-Client-Op-Id']).not.toBe(
      calls()[1]![1].headers['X-Client-Op-Id']
    );
    expect(useZikrStore.getState().pending).toEqual({});
    expect(useZikrStore.getState().inflight).toBeNull();
  });

  it('a day rollover clears pending taps but never the batch already sent', async () => {
    tap('SubhanAllah', 7);
    fetchMock.mockImplementationOnce(offline);
    await flush();
    const body = useZikrStore.getState().inflight!.body;
    useZikrStore.setState({ lastResetDate: '2000-01-01' });
    useZikrStore.getState().checkAndResetIfNewDay();
    expect(useZikrStore.getState().inflight?.body).toBe(body);
    expect(JSON.parse(body).today).toBe(today());

    fetchMock.mockImplementation(ok);
    await flush();
    expect(calls()[1]![1].body).toBe(body);
    // No phantom decrement: nothing else is sent.
    expect(calls()).toHaveLength(2);
  });

  it.each([401, 409, 429, 500])('keeps the batch on %i', async (code) => {
    tap('SubhanAllah', 4);
    fetchMock.mockImplementationOnce(() => status(code));
    await flush();
    expect(useZikrStore.getState().inflight).not.toBeNull();
  });

  it('drops a batch the server rejects outright (400) so later counts are not blocked', async () => {
    tap('SubhanAllah', 4);
    fetchMock.mockImplementationOnce(() => status(400));
    await flush();
    expect(useZikrStore.getState().inflight).toBeNull();
  });

  it('a failed flush retries by itself after 20 seconds', async () => {
    tap('SubhanAllah', 2);
    fetchMock.mockImplementationOnce(offline).mockImplementation(ok);
    await flush();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(calls()).toHaveLength(2);
    expect(useZikrStore.getState().inflight).toBeNull();
  });

  it('sign-out (resetAll) discards an unsent batch', async () => {
    tap('SubhanAllah', 2);
    fetchMock.mockImplementationOnce(offline);
    await flush();
    useZikrStore.getState().resetAll();
    expect(useZikrStore.getState().inflight).toBeNull();
  });

  it('decrements travel in the batch too (negative amounts)', async () => {
    tap('SubhanAllah', -3);
    fetchMock.mockImplementation(ok);
    await flush();
    expect(sentAmounts(0)).toEqual({ SubhanAllah: -3 });
  });

  it('unsyncedCounts ignores a batch from another day and an unreadable one', () => {
    const state = (body: string) => ({
      pending: { SubhanAllah: 1 },
      inflight: { opId: 'op-x-000001', body },
    });
    expect(
      unsyncedCounts(
        state(
          JSON.stringify({
            today: '2000-01-01',
            increments: [{ zikrType: 'SubhanAllah', amount: 9 }],
          })
        )
      )
    ).toEqual({ SubhanAllah: 1 });
    expect(unsyncedCounts(state('{bad'))).toEqual({ SubhanAllah: 1 });
  });
});
