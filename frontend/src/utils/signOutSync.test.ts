import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../test/memoryStorage.js';

// Audit 2026-11-16 P1-6: signing out threw away zikr taps, prayer updates and
// other changes still waiting to be sent, with only a generic "unsynced counts
// will be lost". Now the dialog says what is waiting and syncs it first.

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

const replaySalat = vi.fn();
const replaySync = vi.fn();
vi.mock('../lib/api.js', () => ({
  API_BASE: '',
  getIdToken: () => Promise.resolve('test-token'),
  default: {},
}));
vi.mock('../hooks/useSalatLog.js', () => ({
  replaySalatOutbox: (...a: unknown[]) => replaySalat(...a),
}));
vi.mock('./syncOutbox.js', async (orig) => ({
  ...(await orig<typeof import('./syncOutbox.js')>()),
  replaySyncOutbox: (...a: unknown[]) => replaySync(...a),
}));

const { useAuthStore } = await import('../store/useAuthStore.js');
const { useZikrStore } = await import('../store/useZikrStore.js');
const { enqueueSalatOp } = await import('./salatOutbox.js');
const { enqueueSyncOp } = await import('./syncOutbox.js');
const { summariseUnsynced, syncBeforeSignOut } = await import('./signOutSync.js');

const fetchMock = vi.fn();
const signIn = (uid: string | null) =>
  useAuthStore.setState({ user: uid ? { uid, email: null, displayName: null } : null });
const qc = { invalidateQueries: vi.fn() } as never;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('localStorage', new MemoryStorage());
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  replaySalat.mockReset().mockResolvedValue(undefined);
  replaySync.mockReset().mockResolvedValue(0);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  signIn('user-a');
  useZikrStore.setState({
    pending: {},
    untimed: {},
    tapSpan: {},
    inflight: null,
    isFlushing: false,
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const fajr = {
  kind: 'prayer',
  vars: { prayer: 'fajr', status: 'completed', date: '2026-03-01' },
} as const;
const fastLog = {
  tracker: 'fasting' as const,
  method: 'put' as const,
  url: '/api/fasting/log',
  body: { date: '2026-03-01', status: 'completed' },
  key: 'fasting:log:2026-03-01',
  coalesce: 'replace' as const,
};

describe('summariseUnsynced', () => {
  it('is empty when nothing waits', () => {
    expect(summariseUnsynced()).toEqual({ zikrCounts: 0, changes: 0, total: 0 });
  });

  it('counts waiting zikr taps (pending and an unsent batch), prayer updates and other changes', () => {
    useZikrStore.setState({
      pending: { SubhanAllah: 30, Alhamdulillah: -2 },
      inflight: {
        opId: 'x',
        body: JSON.stringify({
          today: '2000-01-01',
          increments: [{ zikrType: 'SubhanAllah', amount: 12 }],
        }),
      },
    });
    enqueueSalatOp(fajr);
    enqueueSyncOp(fastLog);
    const s = summariseUnsynced();
    expect(s.zikrCounts).toBe(44); // 30 + 2 + 12, whatever day the batch is for
    expect(s.changes).toBe(2);
    expect(s.total).toBe(46);
  });

  it("ignores another account's queued writes", () => {
    signIn('someone-else');
    enqueueSalatOp(fajr);
    signIn('user-a');
    expect(summariseUnsynced().changes).toBe(0);
  });
});

describe('syncBeforeSignOut', () => {
  it('sends the waiting zikr taps and replays both outboxes, then reports nothing left', async () => {
    useZikrStore.setState({ pending: { SubhanAllah: 5 } });
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const done = syncBeforeSignOut(qc);
    await vi.advanceTimersByTimeAsync(1_000);
    const left = await done;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(replaySalat).toHaveBeenCalledTimes(1);
    expect(replaySync).toHaveBeenCalledTimes(1);
    expect(left.total).toBe(0);
    expect(useZikrStore.getState().pending).toEqual({});
  });

  it('offline: gives up after one try and says what is still waiting, without looping', async () => {
    useZikrStore.setState({ pending: { SubhanAllah: 5 } });
    enqueueSalatOp(fajr);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const done = syncBeforeSignOut(qc);
    await vi.advanceTimersByTimeAsync(2_000);
    const left = await done;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(left.zikrCounts).toBe(5);
    expect(left.changes).toBe(1);
    expect(left.total).toBe(6);
  });

  it('does not wait for ever when a request hangs', async () => {
    useZikrStore.setState({ pending: { SubhanAllah: 5 } });
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const done = syncBeforeSignOut(qc, { timeoutMs: 3_000 });
    await vi.advanceTimersByTimeAsync(3_500);
    const left = await done;
    expect(left.zikrCounts).toBeGreaterThan(0);
  });
});
