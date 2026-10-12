import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadZoneLookup, resetZoneLookupForTests } from './placeClock.js';
import {
  getTrackingDay,
  getTrackingDayMiddayTs,
  getTrackingDayMiddayTsDaysBack,
} from './trackingDay.js';
import { getUserTimezoneOffset } from './timezone.js';
import { correctDayOptions, logTargetDay } from './zikrLog.js';
import { MemoryStorage } from '../test/memoryStorage.js';

// Option B step 5 (v5.160.0): the app sends the saved place's offset
// everywhere and anchors zikr at noon on the place's clock. The server
// matches days by date, so this moves no stored data. For anyone whose phone
// is in the saved place's zone (or with no saved place) every value sent must
// be exactly what was sent before; the reference formulas are the old code.

const CITIES = [
  { zone: 'Asia/Dhaka', latitude: 23.81, longitude: 90.41 },
  { zone: 'Europe/London', latitude: 51.51, longitude: -0.13 },
  { zone: 'America/New_York', latitude: 40.71, longitude: -74.01 },
  { zone: 'Asia/Kolkata', latitude: 22.57, longitude: 88.36 },
  { zone: 'Pacific/Apia', latitude: -13.83, longitude: -171.76 },
];
const INSTANTS = [
  '2026-01-15T12:00:00Z',
  '2026-03-08T07:30:00Z',
  '2026-03-29T00:30:00Z',
  '2026-03-29T01:30:00Z',
  '2026-06-21T23:00:00Z',
  '2026-10-12T04:00:00Z',
  '2026-10-25T00:30:00Z',
  '2026-10-25T01:30:00Z',
  '2026-11-01T06:30:00Z',
].map((s) => new Date(s));

// The code before this change, verbatim in effect
const oldOffset = (at: Date) => -at.getTimezoneOffset();
const oldMidday = (now: Date) => {
  const [y, m, d] = getTrackingDay(now).split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0).getTime();
};
const oldDaysBack = (n: number, now: Date) => {
  const d = new Date(oldMidday(now));
  d.setDate(d.getDate() - n);
  return d.getTime();
};
const ymdOf = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

let prevTz: string | undefined;
beforeAll(() => {
  prevTz = process.env.TZ;
});
afterAll(() => {
  process.env.TZ = prevTz;
});
let store: MemoryStorage;
beforeEach(() => {
  store = new MemoryStorage();
  vi.stubGlobal('localStorage', store);
  resetZoneLookupForTests();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetZoneLookupForTests();
});
const save = (c: { latitude: number; longitude: number }) =>
  store.setItem('bustandeen_location', JSON.stringify({ ...c, name: 'x' }));

describe('same zone or no saved place: everything sent is unchanged', () => {
  for (const withPlace of [true, false]) {
    it(withPlace ? 'phone in the saved place zone' : 'no saved place', async () => {
      await loadZoneLookup();
      for (const c of CITIES) {
        process.env.TZ = c.zone;
        store.clear();
        if (withPlace) save(c);
        for (const at of INSTANTS) {
          const label = `${c.zone} ${at.toISOString()}`;
          vi.useFakeTimers({ now: at, toFake: ['Date'] });
          expect(String(getUserTimezoneOffset()), label).toBe(String(oldOffset(at)));
          vi.useRealTimers();
          expect(getTrackingDayMiddayTs(at), label).toBe(oldMidday(at));
          for (const n of [0, 1, 2, 7, 30]) {
            expect(getTrackingDayMiddayTsDaysBack(n, at), `${label} -${n}`).toBe(
              oldDaysBack(n, at)
            );
          }
          expect(logTargetDay(1, at), label).toBe(ymdOf(oldDaysBack(1, at)));
          expect(correctDayOptions(3, at), label).toEqual(
            [1, 2, 3].map((n) => ymdOf(oldDaysBack(n, at)))
          );
        }
      }
    });
  }
});

describe('far zone: the place clock', () => {
  it('London phone with Dhaka saved: +360 and noon in Dhaka', async () => {
    await loadZoneLookup();
    process.env.TZ = 'Europe/London';
    save(CITIES[0]!);
    const at = new Date('2026-10-12T04:00:00Z'); // 10:00 in Dhaka
    vi.useFakeTimers({ now: at, toFake: ['Date'] });
    expect(getUserTimezoneOffset()).toBe(360);
    vi.useRealTimers();
    expect(getTrackingDay(at)).toBe('2026-10-12');
    expect(new Date(getTrackingDayMiddayTs(at)).toISOString()).toBe('2026-10-12T06:00:00.000Z');
    expect(logTargetDay(1, at)).toBe('2026-10-11');
  });

  it('Samoa phone with London saved: the London day, not the phone date', async () => {
    await loadZoneLookup();
    process.env.TZ = 'Pacific/Apia';
    save(CITIES[1]!);
    const at = new Date('2026-10-12T10:00:00Z'); // 11:00 in London, Tue 13 Oct in Apia
    expect(getTrackingDay(at)).toBe('2026-10-12');
    expect(new Date(getTrackingDayMiddayTs(at)).toISOString()).toBe('2026-10-12T11:00:00.000Z');
    expect(correctDayOptions(2, at)).toEqual(['2026-10-11', '2026-10-10']);
  });
});
