import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../test/memoryStorage.js';

// Audit T2.3: the offline outbox for fasting, Quran and Rayhanah writes.

// Some modules touch localStorage when imported; give them one first.
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

const request = vi.fn();
vi.mock('../lib/api.js', () => ({ default: { request: (...a: unknown[]) => request(...a) } }));

const { useAuthStore } = await import('../store/useAuthStore.js');
const {
  OfflineQueuedError,
  clearSyncOutbox,
  enqueueSyncOp,
  peekSyncOutbox,
  replaySyncOutbox,
  sendOrQueue,
} = await import('./syncOutbox.js');

const cfg = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
const networkError = () => new AxiosError('Network Error', AxiosError.ERR_NETWORK, cfg);
const httpError = (status: number) =>
  new AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', cfg, undefined, {
    status,
    statusText: '',
    headers: {},
    config: cfg,
    data: {},
  });

const signIn = (uid: string | null) =>
  useAuthStore.setState({ user: uid ? { uid, email: null, displayName: null } : null });

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
  vi.stubGlobal('navigator', { onLine: true });
  request.mockReset();
  signIn('user-a');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const fastLog = (date: string, status: string) => ({
  tracker: 'fasting' as const,
  method: 'put' as const,
  url: '/api/fasting/log',
  body: { date, status },
  key: `fasting:log:${date}`,
  coalesce: 'replace' as const,
});

describe('enqueue and coalescing', () => {
  it('replace: the last full-state write for a key wins, in its original place', () => {
    enqueueSyncOp(fastLog('2026-03-01', 'intended'));
    enqueueSyncOp({
      tracker: 'quran',
      method: 'post',
      url: '/api/quran/read-ayat',
      body: { count: 3 },
    });
    enqueueSyncOp(fastLog('2026-03-01', 'completed'));
    const q = peekSyncOutbox();
    expect(q.map((o) => o.url)).toEqual(['/api/fasting/log', '/api/quran/read-ayat']);
    expect(q[0]!.body).toEqual({ date: '2026-03-01', status: 'completed' });
  });

  it('replace: a clear after a log for the same day replaces it', () => {
    enqueueSyncOp(fastLog('2026-03-01', 'completed'));
    enqueueSyncOp({
      tracker: 'fasting',
      method: 'delete',
      url: '/api/fasting/log?date=2026-03-01',
      key: 'fasting:log:2026-03-01',
      coalesce: 'replace',
    });
    expect(peekSyncOutbox()).toHaveLength(1);
    expect(peekSyncOutbox()[0]!.method).toBe('delete');
  });

  it('merge: partial updates for one day keep every field (flow, then mood)', () => {
    const day = (body: Record<string, unknown>) => ({
      tracker: 'cycle' as const,
      method: 'put' as const,
      url: '/api/cycle/day',
      body: { date: '2026-03-01', ...body },
      key: 'cycle:day:2026-03-01',
      coalesce: 'merge' as const,
    });
    enqueueSyncOp(day({ flow: 'light' }));
    enqueueSyncOp(day({ moods: ['calm'] }));
    enqueueSyncOp(day({ flow: 'medium' }));
    expect(peekSyncOutbox()).toHaveLength(1);
    expect(peekSyncOutbox()[0]!.body).toEqual({
      date: '2026-03-01',
      flow: 'medium',
      moods: ['calm'],
    });
  });

  it('ops without a key never coalesce (each āyāt read counts)', () => {
    const read = {
      tracker: 'quran' as const,
      method: 'post' as const,
      url: '/api/quran/read-ayat',
      body: { count: 2 },
    };
    enqueueSyncOp(read);
    enqueueSyncOp(read);
    const q = peekSyncOutbox();
    expect(q).toHaveLength(2);
    expect(q[0]!.id).not.toBe(q[1]!.id);
  });

  it('tags each op with the signed-in uid; different accounts never coalesce', () => {
    enqueueSyncOp(fastLog('2026-03-01', 'completed'));
    signIn('user-b');
    enqueueSyncOp(fastLog('2026-03-01', 'broken'));
    expect(peekSyncOutbox().map((o) => o.owner)).toEqual(['user-a', 'user-b']);
  });

  it('clearSyncOutbox empties it; corrupt storage reads as empty', () => {
    enqueueSyncOp(fastLog('2026-03-01', 'completed'));
    clearSyncOutbox();
    expect(peekSyncOutbox()).toEqual([]);
    localStorage.setItem('bustandeen_sync_outbox', '{bad');
    expect(peekSyncOutbox()).toEqual([]);
    localStorage.setItem('bustandeen_sync_outbox', '{"not":"an array"}');
    expect(peekSyncOutbox()).toEqual([]);
  });
});

describe('sendOrQueue', () => {
  it('online: sends with an op id header and returns the data', async () => {
    request.mockResolvedValue({ data: { ok: true, log: { status: 'completed' } } });
    const data = await sendOrQueue(fastLog('2026-03-01', 'completed'));
    expect(data).toEqual({ ok: true, log: { status: 'completed' } });
    const call = request.mock.calls[0]![0] as { headers: Record<string, string>; method: string };
    expect(call.method).toBe('put');
    expect(call.headers['X-Client-Op-Id']).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(peekSyncOutbox()).toEqual([]);
  });

  it('unreachable: queues the op and throws OfflineQueuedError', async () => {
    request.mockRejectedValue(networkError());
    await expect(sendOrQueue(fastLog('2026-03-01', 'completed'))).rejects.toBeInstanceOf(
      OfflineQueuedError
    );
    expect(peekSyncOutbox()).toHaveLength(1);
  });

  it('a real server error is passed through, not queued', async () => {
    request.mockRejectedValue(httpError(400));
    await expect(sendOrQueue(fastLog('2026-03-01', 'x'))).rejects.toBeInstanceOf(AxiosError);
    expect(peekSyncOutbox()).toEqual([]);
  });

  it('a write for a key that is already queued joins the queue instead of overtaking it', async () => {
    enqueueSyncOp(fastLog('2026-03-01', 'intended'));
    await expect(sendOrQueue(fastLog('2026-03-01', 'completed'))).rejects.toBeInstanceOf(
      OfflineQueuedError
    );
    expect(request).not.toHaveBeenCalled();
    expect(peekSyncOutbox()[0]!.body).toEqual({ date: '2026-03-01', status: 'completed' });
  });

  it('the queued op keeps the op id of the failed attempt (so a lost response dedupes)', async () => {
    request.mockRejectedValueOnce(networkError());
    await sendOrQueue({
      tracker: 'quran',
      method: 'post',
      url: '/api/quran/read-ayat',
      body: { count: 1 },
    }).catch(() => {});
    const sentId = (request.mock.calls[0]![0] as { headers: Record<string, string> }).headers[
      'X-Client-Op-Id'
    ];
    expect(peekSyncOutbox()[0]!.id).toBe(sentId);
  });
});

describe('replaySyncOutbox', () => {
  const qc = () => ({ invalidateQueries: vi.fn() });

  it('delivers in order, empties the queue, and refreshes each touched tracker', async () => {
    enqueueSyncOp(fastLog('2026-03-01', 'completed'));
    enqueueSyncOp({
      tracker: 'quran',
      method: 'post',
      url: '/api/quran/read-ayat',
      body: { count: 4 },
    });
    request.mockResolvedValue({ data: { ok: true } });
    const client = qc();
    expect(await replaySyncOutbox(client as never)).toBe(2);
    expect(request.mock.calls.map((c) => (c[0] as { url: string }).url)).toEqual([
      '/api/fasting/log',
      '/api/quran/read-ayat',
    ]);
    expect(peekSyncOutbox()).toEqual([]);
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['fasting'] });
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['quran'] });
  });

  it('replays each op with the id it was queued under', async () => {
    const op = enqueueSyncOp({
      tracker: 'cycle',
      method: 'post',
      url: '/api/cycle/start',
      body: {},
    });
    request.mockResolvedValue({ data: { ok: true } });
    await replaySyncOutbox();
    expect(
      (request.mock.calls[0]![0] as { headers: Record<string, string> }).headers['X-Client-Op-Id']
    ).toBe(op.id);
  });

  it('stops at the first op the network still cannot deliver, keeping it and the rest', async () => {
    enqueueSyncOp(fastLog('2026-03-01', 'completed'));
    enqueueSyncOp(fastLog('2026-03-02', 'completed'));
    enqueueSyncOp(fastLog('2026-03-03', 'completed'));
    request.mockResolvedValueOnce({ data: {} }).mockRejectedValueOnce(networkError());
    expect(await replaySyncOutbox()).toBe(1);
    expect(peekSyncOutbox().map((o) => (o.body as { date: string }).date)).toEqual([
      '2026-03-02',
      '2026-03-03',
    ]);
  });

  it.each([409, 500, 503])('holds the queue on %i (try again later)', async (status) => {
    vi.useFakeTimers();
    enqueueSyncOp(fastLog('2026-03-01', 'completed'));
    request.mockRejectedValueOnce(httpError(status));
    await replaySyncOutbox();
    expect(peekSyncOutbox()).toHaveLength(1);
  });

  it.each([400, 404, 422])(
    'drops an op the server rejects (%i) so it cannot block the rest',
    async (status) => {
      enqueueSyncOp(fastLog('2026-03-01', 'bad'));
      enqueueSyncOp(fastLog('2026-03-02', 'completed'));
      request.mockRejectedValueOnce(httpError(status)).mockResolvedValueOnce({ data: {} });
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      await replaySyncOutbox();
      expect(peekSyncOutbox()).toEqual([]);
      expect(request).toHaveBeenCalledTimes(2);
    }
  );

  it("drops another account's (or the demo's) ops instead of replaying them", async () => {
    signIn('demo-001');
    enqueueSyncOp(fastLog('2026-03-01', 'completed'));
    signIn('user-a');
    enqueueSyncOp(fastLog('2026-03-02', 'completed'));
    request.mockResolvedValue({ data: {} });
    await replaySyncOutbox();
    expect(request).toHaveBeenCalledTimes(1);
    expect((request.mock.calls[0]![0] as { data: { date: string } }).data.date).toBe('2026-03-02');
    expect(peekSyncOutbox()).toEqual([]);
  });

  it('keeps ops while nobody is signed in, and replays them for their owner later', async () => {
    enqueueSyncOp(fastLog('2026-03-01', 'completed'));
    signIn(null);
    request.mockResolvedValue({ data: {} });
    await replaySyncOutbox();
    expect(request).not.toHaveBeenCalled();
    expect(peekSyncOutbox()).toHaveLength(1);
    signIn('user-a');
    await replaySyncOutbox();
    expect(peekSyncOutbox()).toEqual([]);
  });

  it('ops queued before owner tags existed stay with whoever is signed in', async () => {
    localStorage.setItem(
      'bustandeen_sync_outbox',
      JSON.stringify([
        {
          id: 'legacy-op-0001',
          tracker: 'fasting',
          method: 'put',
          url: '/api/fasting/log',
          body: {},
          queuedAt: 1,
        },
      ])
    );
    request.mockResolvedValue({ data: {} });
    await replaySyncOutbox();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('a queued op is retried automatically a few seconds later when online', async () => {
    vi.useFakeTimers();
    request.mockRejectedValueOnce(networkError()).mockResolvedValue({ data: {} });
    await sendOrQueue(fastLog('2026-03-01', 'completed')).catch(() => {});
    expect(peekSyncOutbox()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(peekSyncOutbox()).toEqual([]);
  });
});
