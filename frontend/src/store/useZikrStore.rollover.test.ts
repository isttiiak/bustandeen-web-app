import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Audit 2026-11-16 P1-4: zikr taps were lost without a word. A day rollover
// threw away the taps not yet sent, and a 400 from the server dropped a batch
// as if it had been delivered.

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
const { addDaysYmd, placeNoonTs } = await import('../utils/placeClock.js');

type Body = {
  today: string;
  increments: { zikrType: string; amount: number; ts: number; untimedAmount: number }[];
};
const fetchMock = vi.fn();
const sentBodies = () =>
  (fetchMock.mock.calls as [string, { body: string }][]).map((c) => JSON.parse(c[1].body) as Body);
const ok = () => Promise.resolve({ ok: true, status: 200 });
const offline = () => Promise.reject(new TypeError('Failed to fetch'));
const refused = (body: unknown) => () =>
  Promise.resolve({
    ok: false,
    status: 400,
    clone: () => ({ json: () => Promise.resolve(body) }),
  });

const today = () => getTrackingDay();
const yesterday = () => addDaysYmd(today(), -1);
const state = () => useZikrStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  toastError.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  useZikrStore.setState({
    counts: {},
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

describe('day rollover keeps the taps that were not sent yet', () => {
  it('sends them as the day that just closed, then starts the new day empty', async () => {
    fetchMock.mockImplementation(ok);
    useZikrStore.setState({
      pending: { SubhanAllah: 5 },
      untimed: { SubhanAllah: 2 },
      counts: { SubhanAllah: 5 },
      lastResetDate: yesterday(),
    });
    state().checkAndResetIfNewDay();
    await vi.advanceTimersByTimeAsync(0);

    expect(state().pending).toEqual({});
    expect(state().counts).toEqual({});
    expect(state().lastResetDate).toBe(today());
    expect(sentBodies()).toHaveLength(1);
    const body = sentBodies()[0]!;
    expect(body.today).toBe(yesterday());
    expect(body.increments).toHaveLength(1);
    expect(body.increments[0]).toMatchObject({
      zikrType: 'SubhanAllah',
      amount: 5,
      untimedAmount: 2,
      ts: placeNoonTs(yesterday()),
    });
    expect(state().inflight).toBeNull();
  });

  it('keeps the batch (and its day) when offline at the rollover', async () => {
    fetchMock.mockImplementation(offline);
    useZikrStore.setState({ pending: { SubhanAllah: 3 }, lastResetDate: yesterday() });
    state().checkAndResetIfNewDay();
    await vi.advanceTimersByTimeAsync(0);

    expect(state().pending).toEqual({});
    expect(state().inflight).not.toBeNull();
    expect(JSON.parse(state().inflight!.body).today).toBe(yesterday());
  });

  it('files counts from before yesterday under yesterday, the oldest day the server takes', async () => {
    fetchMock.mockImplementation(ok);
    useZikrStore.setState({ pending: { SubhanAllah: 9 }, lastResetDate: addDaysYmd(today(), -6) });
    state().checkAndResetIfNewDay();
    await vi.advanceTimersByTimeAsync(0);
    expect(sentBodies()[0]!.today).toBe(yesterday());
    expect(sentBodies()[0]!.increments[0]!.amount).toBe(9);
  });

  it('does not lose them when an earlier batch is still stuck: they carry into the new day', async () => {
    fetchMock.mockImplementation(offline);
    useZikrStore.setState({ pending: { SubhanAllah: 7 }, lastResetDate: today() });
    await state().flush(); // batch of 7 stays in flight
    const stuck = state().inflight!.body;
    useZikrStore.setState({ pending: { SubhanAllah: 4 }, lastResetDate: yesterday() });

    state().checkAndResetIfNewDay();
    expect(state().inflight!.body).toBe(stuck); // untouched, same op id
    expect(state().pending).toEqual({ SubhanAllah: 4 }); // not thrown away
    expect(state().counts).toEqual({});
  });

  it('with nothing pending it only resets the day', async () => {
    fetchMock.mockImplementation(ok);
    useZikrStore.setState({ counts: { SubhanAllah: 3 }, lastResetDate: yesterday() });
    state().checkAndResetIfNewDay();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state().counts).toEqual({});
  });
});

describe('a refused batch is never silent', () => {
  it('wrong device date: the taps go back to pending so fixing the clock loses nothing', async () => {
    fetchMock.mockImplementationOnce(refused({ ok: false, code: 'client_day_mismatch' }));
    useZikrStore.setState({
      pending: { SubhanAllah: 4 },
      untimed: { SubhanAllah: 1 },
      tapSpan: { SubhanAllah: { first: 1000, last: 2000 } },
    });
    await state().flush();

    expect(state().inflight).toBeNull();
    expect(state().pending).toEqual({ SubhanAllah: 4 });
    expect(state().untimed).toEqual({ SubhanAllah: 1 });
    expect(state().tapSpan.SubhanAllah).toEqual({ first: 1000, last: 2000 });
    expect(toastError).toHaveBeenCalledTimes(1);

    // No retry loop against a clock that is still wrong; the next tap tries again.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockImplementation(ok);
    await state().flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(state().pending).toEqual({});
  });

  it('wrong device date: taps made while the batch was in the air are added to, not replaced', async () => {
    let release!: () => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({
              ok: false,
              status: 400,
              clone: () => ({ json: () => Promise.resolve({ code: 'client_day_mismatch' }) }),
            });
        })
    );
    useZikrStore.setState({ pending: { SubhanAllah: 4 } });
    const p = state().flush();
    await vi.advanceTimersByTimeAsync(0);
    useZikrStore.setState({ pending: { SubhanAllah: 2, Alhamdulillah: 1 } }); // tapped meanwhile
    release();
    await p;
    expect(state().pending).toEqual({ SubhanAllah: 6, Alhamdulillah: 1 });
  });

  it('any other 400: the batch cannot be kept, so the person is told how many counts were lost', async () => {
    fetchMock.mockImplementationOnce(refused({ ok: false, error: 'Validation failed' }));
    useZikrStore.setState({ pending: { SubhanAllah: 4, Alhamdulillah: 3 } });
    await state().flush();

    expect(state().inflight).toBeNull();
    expect(state().pending).toEqual({});
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(String(toastError.mock.calls[0]![0])).toContain('7');
  });
});
