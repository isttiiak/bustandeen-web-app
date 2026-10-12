import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { autoHijriCountry } from './hijriCountry.js';
import { loadZoneLookup, resetZoneLookupForTests } from './placeClock.js';
import { MemoryStorage } from '../test/memoryStorage.js';

// Automatic Hijri date (T4.1): the country whose moon-sighting records apply.
// Profile country first (unchanged), then the SAVED PLACE's country, then the
// phone's zone. Before this a guest on London time with Dhaka saved got GB, so
// the Bangladesh committee's record was ignored (2026-10-12).

const DHAKA = { latitude: 23.81, longitude: 90.41, name: 'Dhaka' };
const LONDON = { latitude: 51.51, longitude: -0.13, name: 'London' };

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
  vi.unstubAllGlobals();
  resetZoneLookupForTests();
});
const save = (loc: object) => store.setItem('bustandeen_location', JSON.stringify(loc));

describe('autoHijriCountry', () => {
  it('a far-zone guest gets the saved place country (London phone, Dhaka saved = BD)', async () => {
    await loadZoneLookup();
    process.env.TZ = 'Europe/London';
    save(DHAKA);
    expect(autoHijriCountry(undefined)).toBe('BD');
  });

  it('the profile country still comes first (unchanged)', async () => {
    await loadZoneLookup();
    process.env.TZ = 'Asia/Dhaka';
    save(LONDON);
    expect(autoHijriCountry('Bangladesh')).toBe('BD');
  });

  it('same-zone users are unchanged: Dhaka phone with Dhaka saved = BD', async () => {
    await loadZoneLookup();
    process.env.TZ = 'Asia/Dhaka';
    save(DHAKA);
    expect(autoHijriCountry(null)).toBe('BD');
  });

  it('no saved place: the phone zone, as before', () => {
    process.env.TZ = 'Asia/Dhaka';
    expect(autoHijriCountry(undefined)).toBe('BD');
    process.env.TZ = 'Europe/London';
    expect(autoHijriCountry(undefined)).toBe('GB');
  });

  it('a Dhaka phone with London saved follows London (GB), not the phone', async () => {
    await loadZoneLookup();
    process.env.TZ = 'Asia/Dhaka';
    save(LONDON);
    expect(autoHijriCountry(undefined)).toBe('GB');
  });
});
