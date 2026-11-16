import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../test/memoryStorage.js';

// Audit T2.3: a queued salat change replays only for the account (or the
// demo) that made it; existing queues from before the owner tag still replay.

vi.hoisted(() => {
  const m = new Map<string, string>();
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, String(v)),
      removeItem: (k: string) => void m.delete(k),
    },
  });
});

const patch = vi.fn();
vi.mock('../lib/api.js', () => ({ default: { patch: (...a: unknown[]) => patch(...a) } }));
const toastError = vi.hoisted(() => vi.fn());
const toastDismiss = vi.hoisted(() => vi.fn());
vi.mock('react-hot-toast', () => ({
  default: Object.assign(() => {}, {
    success: () => {},
    error: toastError,
    dismiss: toastDismiss,
  }),
}));

const { useAuthStore } = await import('../store/useAuthStore.js');
const { enqueueSalatOp, peekSalatOutbox } = await import('./salatOutbox.js');
const { replaySalatOutbox } = await import('../hooks/useSalatLog.js');

const signIn = (uid: string | null) =>
  useAuthStore.setState({ user: uid ? { uid, email: null, displayName: null } : null });
const fajr = (status: 'completed' | 'missed') =>
  ({ kind: 'prayer', vars: { prayer: 'fajr', status, date: '2026-03-01' } }) as const;
const qc = { invalidateQueries: vi.fn() };

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  toastError.mockClear();
  toastDismiss.mockClear();
  vi.stubGlobal('localStorage', new MemoryStorage());
  patch.mockReset().mockResolvedValue({ data: { ok: true } });
  signIn('user-a');
});

describe('salat outbox ownership', () => {
  it('tags ops with the uid; the same prayer from two accounts is two ops', () => {
    enqueueSalatOp(fajr('completed'));
    enqueueSalatOp(fajr('missed')); // same account: replaces
    signIn('demo-001');
    enqueueSalatOp(fajr('completed'));
    expect(peekSalatOutbox().map((o) => [o.owner, (o.vars as { status?: string }).status])).toEqual(
      [
        ['user-a', 'missed'],
        ['demo-001', 'completed'],
      ]
    );
  });

  it("replays only the signed-in account's ops and drops the rest", async () => {
    signIn('demo-001');
    enqueueSalatOp(fajr('missed'));
    signIn('user-a');
    enqueueSalatOp({
      kind: 'prayer',
      vars: { prayer: 'isha', status: 'completed', date: '2026-03-01' },
    });
    await replaySalatOutbox(qc as never);
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch.mock.calls[0]![1]).toMatchObject({ prayer: 'isha' });
    expect(peekSalatOutbox()).toEqual([]);
  });

  it('waits while nobody is signed in', async () => {
    enqueueSalatOp(fajr('completed'));
    signIn(null);
    await replaySalatOutbox(qc as never);
    expect(patch).not.toHaveBeenCalled();
    expect(peekSalatOutbox()).toHaveLength(1);
  });

  it('ops queued before the owner tag existed still replay', async () => {
    localStorage.setItem(
      'bustandeen_salat_outbox',
      JSON.stringify([
        {
          id: '1-a',
          kind: 'prayer',
          vars: { prayer: 'fajr', status: 'completed' },
          queuedAt: Date.now(),
        },
      ])
    );
    await replaySalatOutbox(qc as never);
    expect(patch).toHaveBeenCalledTimes(1);
  });
});

// Audit 2026-11-16 P1-5: any non-network error used to drop the queued tap.
describe('salat outbox: retry rules', () => {
  const cfg = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  const httpError = (status: number) =>
    new AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', cfg, undefined, {
      status,
      statusText: '',
      headers: {},
      config: cfg,
      data: {},
    });
  const isha = {
    kind: 'prayer',
    vars: { prayer: 'isha', status: 'completed', date: '2026-03-01' },
  } as const;

  it.each([401, 403, 408, 425, 429, 500, 503])(
    'keeps the tap and the ones behind it on %i',
    async (status) => {
      enqueueSalatOp(fajr('completed'));
      enqueueSalatOp(isha);
      patch.mockRejectedValueOnce(httpError(status));
      await replaySalatOutbox(qc as never);
      expect(patch).toHaveBeenCalledTimes(1);
      expect(peekSalatOutbox().map((o) => (o.vars as { prayer: string }).prayer)).toEqual([
        'fajr',
        'isha',
      ]);
    }
  );

  it('retries by itself with a growing delay and delivers when the server recovers', async () => {
    vi.useFakeTimers();
    enqueueSalatOp(fajr('completed'));
    patch.mockRejectedValueOnce(httpError(503)).mockRejectedValueOnce(httpError(503));
    await replaySalatOutbox(qc as never);
    expect(patch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(patch).toHaveBeenCalledTimes(2);
    expect(peekSalatOutbox()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(59_000);
    expect(patch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(patch).toHaveBeenCalledTimes(3);
    expect(peekSalatOutbox()).toEqual([]);
  });

  it('says so when it stays stuck, and clears the message when it drains', async () => {
    vi.useFakeTimers();
    enqueueSalatOp(fajr('completed'));
    patch.mockRejectedValue(httpError(500));
    await replaySalatOutbox(qc as never);
    expect(toastError).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError.mock.calls[0]![1]).toMatchObject({ id: 'outbox-stuck' });
    patch.mockReset().mockResolvedValue({ data: {} });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(peekSalatOutbox()).toEqual([]);
    expect(toastDismiss).toHaveBeenCalledWith('outbox-stuck');
  });

  it('a request the server refuses for good (400) is dropped, the rest go on, and the person is told', async () => {
    enqueueSalatOp(fajr('completed'));
    enqueueSalatOp(isha);
    patch.mockRejectedValueOnce(httpError(400)).mockResolvedValueOnce({ data: {} });
    await replaySalatOutbox(qc as never);
    expect(peekSalatOutbox()).toEqual([]);
    expect(patch).toHaveBeenCalledTimes(2);
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError.mock.calls[0]![1]).toMatchObject({ id: 'salat-outbox-dropped' });
  });

  it('a tap that has waited longer than 14 days is dropped and the person is told', async () => {
    vi.useFakeTimers();
    enqueueSalatOp(fajr('completed'));
    vi.setSystemTime(Date.now() + 15 * 24 * 3600_000);
    await replaySalatOutbox(qc as never);
    expect(patch).not.toHaveBeenCalled();
    expect(peekSalatOutbox()).toEqual([]);
    expect(toastError.mock.calls[0]![1]).toMatchObject({ id: 'salat-outbox-dropped' });
  });
});
