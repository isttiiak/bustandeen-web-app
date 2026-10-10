import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../test/memoryStorage.js';

// U4: zikr "Log counts". Which day a typed-in count lands on, in every
// day-start mode, and the guards around it. TZ is Asia/Dhaka (vitest.config).

// useZikrStore touches localStorage when imported; give it one first.
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

const { setDayStartModeLocal, getFajrTime, getMaghribTime } = await import('./trackingDay.js');
const {
  MAX_LOG_AMOUNT,
  buildZikrLogBody,
  logDayOptions,
  logTargetDay,
  parseLogAmount,
  todaysLoggedCounts,
} = await import('./zikrLog.js');
const { enqueueSyncOp, clearSyncOutbox } = await import('./syncOutbox.js');
const { unsyncedCounts } = await import('../store/useZikrStore.js');
const { useAuthStore } = await import('../store/useAuthStore.js');

const DHAKA = JSON.stringify({ latitude: 23.81, longitude: 90.41, name: 'Dhaka' });
const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min, 0, 0);
const plusMin = (t: Date, min: number) => new Date(t.getTime() + min * 60_000);
const DAY_MS = 24 * 3600_000;
/** The server's ts bound (backend zikr.schemas.ts TS_MAX_AGE_MS). */
const SERVER_MAX_AGE_MS = 4 * DAY_MS;

/** The day the SERVER buckets a ts in: the UTC date of ts shifted by the
 * client's offset (backend truncateToTimezone / ZikrDaily key). */
const serverDay = (ts: number, offsetMin: number) =>
  new Date(ts + offsetMin * 60_000).toISOString().slice(0, 10);

let store: MemoryStorage;
beforeEach(() => {
  store = new MemoryStorage();
  vi.stubGlobal('localStorage', store);
  store.setItem('bustandeen_location', DHAKA);
  useAuthStore.setState({ user: { uid: 'user-a', email: null, displayName: null } });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseLogAmount', () => {
  it.each<[string, number, string | null]>([
    ['', 0, null],
    ['  ', 0, null],
    ['33', 33, null],
    [' 100 ', 100, null],
    ['0', 0, null],
    [String(MAX_LOG_AMOUNT), MAX_LOG_AMOUNT, null],
    [String(MAX_LOG_AMOUNT + 1), 0, 'tooLarge'],
    ['12.5', 0, 'notWhole'],
    ['-5', 0, 'notWhole'],
    ['1e3', 0, 'notWhole'],
  ])('%j → %d (%s)', (raw, amount, error) => {
    expect(parseLogAmount(raw)).toEqual({ amount, error });
  });
});

describe('logDayOptions', () => {
  it('offers today and two days back when signed in', () => {
    expect(logDayOptions(false)).toEqual([0, 1, 2]);
  });
  it('offers only today in demo mode (there is no history to fill)', () => {
    expect(logDayOptions(true)).toEqual([0]);
  });
});

describe('target day in each day-start mode', () => {
  it('fajr mode, after midnight but before Fajr: "today" is the closing day', () => {
    setDayStartModeLocal('fajr');
    const now = at(2026, 10, 11, 2, 30);
    expect(logTargetDay(0, now)).toBe('2026-10-10');
    expect(logTargetDay(1, now)).toBe('2026-10-09');
    expect(logTargetDay(2, now)).toBe('2026-10-08');
  });

  it('fajr mode, after Fajr: the new day', () => {
    setDayStartModeLocal('fajr');
    const fajr = getFajrTime(at(2026, 10, 11, 12))!;
    expect(logTargetDay(0, plusMin(fajr, 1))).toBe('2026-10-11');
    expect(logTargetDay(0, plusMin(fajr, -1))).toBe('2026-10-10');
  });

  it('midnight mode: the civil date', () => {
    setDayStartModeLocal('midnight');
    expect(logTargetDay(0, at(2026, 10, 11, 0, 5))).toBe('2026-10-11');
    expect(logTargetDay(2, at(2026, 10, 11, 0, 5))).toBe('2026-10-09');
  });

  it('maghrib mode: before sunset is still yesterday, from sunset today', () => {
    setDayStartModeLocal('maghrib');
    const maghrib = getMaghribTime(at(2026, 10, 11, 12))!;
    expect(logTargetDay(0, plusMin(maghrib, -1))).toBe('2026-10-10');
    expect(logTargetDay(0, maghrib)).toBe('2026-10-11');
  });

  it('crosses month and year boundaries', () => {
    setDayStartModeLocal('midnight');
    expect(logTargetDay(2, at(2027, 1, 1, 9))).toBe('2026-12-30');
    expect(logTargetDay(1, at(2028, 3, 1, 9))).toBe('2028-02-29');
  });
});

describe('buildZikrLogBody', () => {
  it('anchors the count at the target day midday and marks it manual', () => {
    setDayStartModeLocal('fajr');
    const now = at(2026, 10, 11, 2, 30); // before Fajr: tracking day 10 Oct
    const body = buildZikrLogBody('SubhanAllah', 33, 1, now, now);
    expect(body.increments).toEqual([
      { zikrType: 'SubhanAllah', amount: 33, ts: at(2026, 10, 9, 12).getTime(), manual: true },
    ]);
    expect(body.today).toBe('2026-10-10');
    expect(body.timezoneOffset).toBe(360);
  });

  it.each(['fajr', 'midnight', 'maghrib'] as const)(
    '%s mode: the server buckets every choice on the day the form showed',
    (mode) => {
      setDayStartModeLocal(mode);
      for (const now of [at(2026, 10, 11, 1), at(2026, 10, 11, 10), at(2026, 10, 11, 23, 30)]) {
        for (const back of [0, 1, 2] as const) {
          const body = buildZikrLogBody('Alhamdulillah', 5, back, now, now);
          expect(serverDay(body.increments[0]!.ts, body.timezoneOffset)).toBe(
            logTargetDay(back, now)
          );
        }
      }
    }
  );

  it('two days back stays inside the server window even when the day lags (maghrib)', () => {
    setDayStartModeLocal('maghrib');
    const justBeforeMaghrib = plusMin(getMaghribTime(at(2026, 10, 11, 12))!, -1);
    const body = buildZikrLogBody('SubhanAllah', 1, 2, justBeforeMaghrib, justBeforeMaghrib);
    const age = justBeforeMaghrib.getTime() - body.increments[0]!.ts;
    expect(age).toBeGreaterThan(3 * DAY_MS);
    expect(age).toBeLessThan(SERVER_MAX_AGE_MS);
  });

  it('a form opened before Fajr and saved after it keeps the day it showed', () => {
    setDayStartModeLocal('fajr');
    const fajr = getFajrTime(at(2026, 10, 11, 12))!;
    const openedAt = plusMin(fajr, -5);
    const savedAt = plusMin(fajr, 5);
    const body = buildZikrLogBody('SubhanAllah', 100, 0, openedAt, savedAt);
    expect(serverDay(body.increments[0]!.ts, body.timezoneOffset)).toBe('2026-10-10');
    // The streak is judged against the real current day.
    expect(body.today).toBe('2026-10-11');
  });
});

describe('queued logs in the live "today" count', () => {
  const queue = (back: 0 | 1 | 2, amount: number, now: Date, owner = 'user-a') => {
    useAuthStore.setState({ user: { uid: owner, email: null, displayName: null } });
    enqueueSyncOp({
      tracker: 'zikr',
      method: 'post',
      url: '/api/zikr/increment/batch',
      body: buildZikrLogBody('SubhanAllah', amount, back, now, now) as unknown as Record<
        string,
        unknown
      >,
    });
    useAuthStore.setState({ user: { uid: 'user-a', email: null, displayName: null } });
  };

  it('todaysLoggedCounts keeps only entries for the current tracking day', () => {
    setDayStartModeLocal('midnight');
    const now = at(2026, 10, 11, 9);
    const today = buildZikrLogBody('SubhanAllah', 33, 0, now, now);
    const yesterday = buildZikrLogBody('SubhanAllah', 99, 1, now, now);
    expect(todaysLoggedCounts([today, yesterday, null, { increments: 'x' }], now)).toEqual({
      SubhanAllah: 33,
    });
  });

  it("unsyncedCounts adds today's queued logs, not backfills or other accounts'", () => {
    setDayStartModeLocal('midnight');
    clearSyncOutbox();
    const now = new Date();
    queue(0, 33, now);
    queue(1, 50, now); // a backfill: never part of today's count
    queue(0, 7, now, 'user-b'); // another account on this device
    expect(unsyncedCounts({ pending: { SubhanAllah: 2 }, inflight: null })).toEqual({
      SubhanAllah: 35,
    });
  });
});
