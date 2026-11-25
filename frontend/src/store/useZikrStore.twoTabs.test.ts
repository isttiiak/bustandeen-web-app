import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Audit 2026-11-16 P1-16b / P1-15: two tabs of the app share one browser
// profile. Unsent zikr taps used to live in the one shared record, so a tab
// opened while another still held a batch copied it and sent it again under a
// new op id (counted twice), and a stale tab could overwrite the other's batch.
// Each tab now owns its record and holds a Web Lock; a closed tab's record is
// adopted once. These tests run two copies of the store over one fake browser
// profile (shared localStorage, shared lock manager) and a fake server that
// applies each op id once, like the real route.

const world = vi.hoisted(() => {
  const store = new Map<string, string>();
  const held = new Set<string>();
  const waiting = new Map<string, (() => void)[]>();
  const locks = {
    request(name: string, cb: () => unknown): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const run = () => {
          held.add(name);
          Promise.resolve(cb()).then(resolve, reject);
        };
        if (!held.has(name)) run();
        else waiting.set(name, [...(waiting.get(name) ?? []), run]);
      });
    },
    // The adoption lock is released when its callback settles; tab locks never
    // settle and are dropped by `closeTab`.
    query: () => Promise.resolve({ held: [...held].map((name) => ({ name })) }),
  };
  const request = locks.request.bind(locks);
  locks.request = (name: string, cb: () => unknown) =>
    request(name, async () => {
      try {
        return await cb();
      } finally {
        if (name === 'bustandeen-zikr-adopt') {
          held.delete(name);
          const next = waiting.get(name)?.shift();
          next?.();
        }
      }
    });
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    },
  });
  Object.defineProperty(globalThis, 'navigator', { value: { locks }, configurable: true });
  return { store, held, waiting };
});

vi.mock('../lib/api.js', () => ({
  API_BASE: '',
  getIdToken: () => Promise.resolve('test-token'),
}));

const TAB_LOCK = 'bustandeen-zikr-tab-';
const UNSENT = 'bustandeen_zikr_unsent:';

type StoreModule = typeof import('./useZikrStore.js');
interface Tab {
  store: StoreModule;
  id: string;
}

// The fake server: each op id is applied once.
const applied = new Map<string, Record<string, number>>();
const requestLog: string[] = [];
let offline = false;

const fetchMock = vi.fn((_url: string, init: { headers: Record<string, string>; body: string }) => {
  if (offline) return Promise.reject(new TypeError('Failed to fetch'));
  const opId = init.headers['X-Client-Op-Id']!;
  requestLog.push(opId);
  if (!applied.has(opId)) {
    const sums: Record<string, number> = {};
    for (const inc of (
      JSON.parse(init.body) as { increments: { zikrType: string; amount: number }[] }
    ).increments) {
      sums[inc.zikrType] = (sums[inc.zikrType] ?? 0) + inc.amount;
    }
    applied.set(opId, sums);
  }
  return Promise.resolve({ ok: true, status: 200 });
});

/** What the server holds in total, summed over distinct op ids. */
function serverTotal(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const sums of applied.values()) {
    for (const [type, n] of Object.entries(sums)) out[type] = (out[type] ?? 0) + n;
  }
  return out;
}

const settle = () => vi.advanceTimersByTimeAsync(1_000);

/** A fresh copy of the store module: a new tab on the same profile. */
async function importFresh(): Promise<StoreModule> {
  vi.resetModules();
  return (await import('./useZikrStore.js')) as StoreModule;
}

async function openTab(): Promise<Tab> {
  const before = new Set(world.held);
  const store = await importFresh();
  await settle();
  const mine = [...world.held].filter((n) => n.startsWith(TAB_LOCK) && !before.has(n));
  expect(mine).toHaveLength(1);
  return { store, id: mine[0]!.slice(TAB_LOCK.length) };
}

/** The page ends: its last save goes out (pagehide), then its lock is released. */
function closeTab(tab: Tab): void {
  tab.store.flushZikrLocalPersistence();
  world.held.delete(TAB_LOCK + tab.id);
}

const today = async () => (await import('../utils/trackingDay.js')).getTrackingDay();

async function tapIn(tab: Tab, type: string, n: number): Promise<void> {
  tab.store.useZikrStore.setState((s) => ({
    pending: { ...s.pending, [type]: (s.pending[type] ?? 0) + n },
  }));
  await settle();
}

const unsentKeys = () => [...world.store.keys()].filter((k) => k.startsWith(UNSENT));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockClear();
  world.store.clear();
  world.held.clear();
  world.waiting.clear();
  applied.clear();
  requestLog.length = 0;
  offline = false;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('two tabs, one browser profile', () => {
  it('a tab opened while another holds an unsent batch does not send it again', async () => {
    const a = await openTab();
    offline = true;
    await tapIn(a, 'SubhanAllah', 33);
    await a.store.useZikrStore.getState().flush();
    expect(a.store.useZikrStore.getState().inflight).not.toBeNull();
    a.store.flushZikrLocalPersistence();

    // The second tab opens while the first still holds the batch (offline).
    const b = await openTab();
    expect(b.store.useZikrStore.getState().inflight).toBeNull();
    expect(b.store.useZikrStore.getState().pending).toEqual({});

    // Back online: both tabs try to send. Only the first tab's batch exists.
    offline = false;
    await b.store.useZikrStore.getState().flush();
    await a.store.useZikrStore.getState().flush();
    await settle();
    expect(serverTotal()).toEqual({ SubhanAllah: 33 });
  });

  it('taps still waiting to be sent are not copied by a tab opened meanwhile', async () => {
    const a = await openTab();
    await tapIn(a, 'SubhanAllah', 20); // loose taps, flush not yet due
    a.store.flushZikrLocalPersistence(); // what a reload or a new tab can see
    const b = await openTab();
    expect(b.store.useZikrStore.getState().pending).toEqual({});
    await a.store.useZikrStore.getState().flush();
    await b.store.useZikrStore.getState().flush();
    await settle();
    expect(serverTotal()).toEqual({ SubhanAllah: 20 });
  });

  it('keeps each tab’s unsent taps out of the shared record', async () => {
    const a = await openTab();
    offline = true;
    await tapIn(a, 'SubhanAllah', 5);
    await a.store.useZikrStore.getState().flush();
    a.store.flushZikrLocalPersistence();
    const shared = world.store.get('bustandeen_zikr_store') ?? '';
    expect(shared).not.toContain('opId');
    expect(shared).not.toContain('"pending"');
    expect(world.store.get(UNSENT + a.id)).toContain('"opId"');
  });

  it('a stale tab saving its state does not overwrite the other tab’s staged batch', async () => {
    const a = await openTab();
    const b = await openTab();
    offline = true;
    await tapIn(a, 'SubhanAllah', 10);
    await a.store.useZikrStore.getState().flush(); // staged and saved by A
    a.store.flushZikrLocalPersistence();
    // B saves its own (empty) state afterwards, as a tab does on any change.
    b.store.useZikrStore.setState({ selected: 'Alhamdulillah' });
    b.store.flushZikrLocalPersistence();
    expect(world.store.get(UNSENT + a.id)).toContain('"opId"');
  });

  it('a closed tab’s unsent taps are adopted once and counted once', async () => {
    const a = await openTab();
    offline = true;
    await tapIn(a, 'SubhanAllah', 33);
    await a.store.useZikrStore.getState().flush(); // staged, not delivered
    await tapIn(a, 'Alhamdulillah', 7); // loose taps after it
    closeTab(a); // killed with both a batch and loose taps

    offline = false;
    const b = await openTab();
    await settle();
    await b.store.useZikrStore.getState().flush();
    await settle();
    expect(serverTotal()).toEqual({ SubhanAllah: 33, Alhamdulillah: 7 });
    expect(unsentKeys()).not.toContain(UNSENT + a.id); // taken over, key gone

    // A third tab finds nothing left to adopt.
    const c = await openTab();
    await c.store.useZikrStore.getState().flush();
    await settle();
    expect(serverTotal()).toEqual({ SubhanAllah: 33, Alhamdulillah: 7 });
  });

  it('a batch delivered just before the tab died is recognised, not double counted', async () => {
    const a = await openTab();
    offline = true;
    await tapIn(a, 'SubhanAllah', 12);
    await a.store.useZikrStore.getState().flush();
    const opId = a.store.useZikrStore.getState().inflight!.opId;
    // The request had reached the server, but the answer never reached the page.
    applied.set(opId, { SubhanAllah: 12 });
    closeTab(a);

    offline = false;
    const b = await openTab();
    await settle();
    await b.store.useZikrStore.getState().flush();
    await settle();
    expect(requestLog).toContain(opId); // resent under the same op id
    expect(serverTotal()).toEqual({ SubhanAllah: 12 });
  });

  it('never adopts a record whose tab is still open', async () => {
    const a = await openTab();
    offline = true;
    await tapIn(a, 'SubhanAllah', 4);
    await a.store.useZikrStore.getState().flush();
    a.store.flushZikrLocalPersistence();
    const b = await openTab();
    await b.store.adoptUnsentRecords();
    await settle();
    expect(b.store.useZikrStore.getState().inflight).toBeNull();
    expect(world.store.has(UNSENT + a.id)).toBe(true);
  });

  it('a closed tab’s batch waits while this tab’s own batch is out, then goes', async () => {
    const a = await openTab();
    const b = await openTab();
    offline = true;
    await tapIn(a, 'SubhanAllah', 3);
    await a.store.useZikrStore.getState().flush();
    await tapIn(b, 'Alhamdulillah', 5);
    await b.store.useZikrStore.getState().flush();
    closeTab(a);

    await b.store.adoptUnsentRecords();
    // B keeps its own batch; A's stays in A's record for the next pass.
    expect(world.store.get(UNSENT + a.id)).toContain('"opId"');

    offline = false;
    await b.store.useZikrStore.getState().flush();
    await settle();
    await b.store.useZikrStore.getState().flush();
    await settle();
    expect(serverTotal()).toEqual({ SubhanAllah: 3, Alhamdulillah: 5 });
    expect(world.store.has(UNSENT + a.id)).toBe(false);
  });

  it('loose taps from a day that has closed are sent as that day, not today', async () => {
    const a = await openTab();
    offline = true;
    await tapIn(a, 'SubhanAllah', 9);
    a.store.useZikrStore.setState({ lastResetDate: '2000-01-01' }); // tapped "long ago"
    closeTab(a);

    // Still offline: the adopted batch stays in B and can be read.
    const b = await openTab();
    await settle();
    const batch = b.store.useZikrStore.getState().inflight;
    expect(batch).not.toBeNull();
    const day = (JSON.parse(batch!.body) as { today: string }).today;
    expect(day).not.toBe(await today());
    expect(day < (await today())).toBe(true);
  });

  it('an older version’s shared record is taken over by one tab only', async () => {
    const day = await today();
    world.store.set(
      'bustandeen_zikr_store',
      JSON.stringify({
        state: {
          selected: 'SubhanAllah',
          counts: {},
          lastResetDate: day,
          pending: { SubhanAllah: 2 },
          inflight: {
            opId: 'op-legacy-0001',
            body: JSON.stringify({
              today: day,
              timezoneOffset: 0,
              increments: [
                { zikrType: 'SubhanAllah', amount: 40, ts: 1, realTs: 1, untimedAmount: 0 },
              ],
            }),
          },
        },
        version: 0,
      })
    );
    // Both tabs start at the same moment, as after an update.
    const a = await importFresh();
    const b = await importFresh();
    await settle();
    for (const t of [a, b]) await t.useZikrStore.getState().flush();
    await settle();
    for (const t of [a, b]) await t.useZikrStore.getState().flush();
    await settle();

    // 40 (the old batch) + 2 (loose taps), each exactly once, and the old batch
    // went out from one tab only.
    expect(serverTotal()).toEqual({ SubhanAllah: 42 });
    expect(requestLog.filter((id) => id === 'op-legacy-0001')).toHaveLength(1);
    expect(world.store.get('bustandeen_zikr_store')).not.toContain('op-legacy-0001');
  });

  it('sign-out (resetAll) also drops a closed tab’s leftovers', async () => {
    const a = await openTab();
    offline = true;
    await tapIn(a, 'SubhanAllah', 6);
    await a.store.useZikrStore.getState().flush();
    closeTab(a);

    const b = await openTab();
    // Taken over by B on opening; sign out wipes it with the rest.
    b.store.useZikrStore.getState().resetAll();
    await settle();
    offline = false;
    await b.store.useZikrStore.getState().flush();
    await settle();
    expect(serverTotal()).toEqual({});
    expect(unsentKeys()).toEqual([]);
  });
});
