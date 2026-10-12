import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadZoneLookup, placeClockOffsetMin, resetZoneLookupForTests } from './placeClock.js';
import { getUserTimezoneOffset } from './timezone.js';
import { MemoryStorage } from '../test/memoryStorage.js';

// The zikr and Quran "time of day" charts group real tap/session moments by
// hour on the server, using the offset the app sends. They now use the saved
// place's clock: a phone on London time with Dhaka saved saw its Dhaka
// mornings 5 h early. For everyone whose phone is in the place's zone (and
// without a saved place) the offset is exactly what was sent before.

const CITIES = [
  { zone: 'Asia/Dhaka', latitude: 23.81, longitude: 90.41 },
  { zone: 'Europe/London', latitude: 51.51, longitude: -0.13 },
  { zone: 'America/New_York', latitude: 40.71, longitude: -74.01 },
  { zone: 'Asia/Kolkata', latitude: 22.57, longitude: 88.36 },
  { zone: 'Pacific/Apia', latitude: -13.83, longitude: -171.76 },
];
// Both DST changes in Europe and the US, and ordinary days
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

describe('same zone: the offset sent is unchanged', () => {
  for (const withMap of [false, true]) {
    it(`phone in the saved place's zone (${withMap ? 'zone map loaded' : 'estimate'})`, async () => {
      if (withMap) await loadZoneLookup();
      for (const c of CITIES) {
        process.env.TZ = c.zone;
        save(c);
        for (const at of INSTANTS) {
          vi.useFakeTimers({ now: at, toFake: ['Date'] });
          expect(String(placeClockOffsetMin()), `${c.zone} ${at.toISOString()}`).toBe(
            String(getUserTimezoneOffset()) // as sent in the query string (-0 is "0")
          );
          vi.useRealTimers();
        }
      }
    });
  }

  it('no saved place: the phone offset', () => {
    for (const c of CITIES) {
      process.env.TZ = c.zone;
      for (const at of INSTANTS) {
        expect(placeClockOffsetMin(at)).toBe(-at.getTimezoneOffset());
      }
    }
  });
});

describe('far zone: the place clock', () => {
  it('London phone with Dhaka saved sends +360, not +60', async () => {
    await loadZoneLookup();
    process.env.TZ = 'Europe/London';
    save(CITIES[0]);
    expect(placeClockOffsetMin(new Date('2026-10-12T04:00:00Z'))).toBe(360);
  });

  it('Dhaka phone with London saved follows London DST', async () => {
    await loadZoneLookup();
    process.env.TZ = 'Asia/Dhaka';
    save(CITIES[1]);
    expect(placeClockOffsetMin(new Date('2026-06-21T12:00:00Z'))).toBe(60);
    expect(placeClockOffsetMin(new Date('2026-12-21T12:00:00Z'))).toBe(0);
  });
});
