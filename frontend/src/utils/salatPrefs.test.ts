import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acceptPrayerDefaultsSuggestion,
  dismissPrayerDefaultsSuggestion,
  getAsrMadhab,
  getCalcMethod,
  getPrayerDefaultsSuggestion,
  countryAt,
  migratePrayerDefaultsOnce,
  regionCountry,
  regionPrayerDefaults,
  setAsrMadhab,
  setCalcMethod,
} from './salatPrefs.js';
import { countryFromTimeZone, prayerDefaultsForCountry } from './countryDefaults.js';
import { loadZoneLookup, resetZoneLookupForTests } from './placeClock.js';

// Audit T1.9 / FIQH-01. The rule this protects: country defaults apply to
// people who never chose, and nobody's existing timetable moves on its own.

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

const LOCATION = JSON.stringify({ latitude: 23.81, longitude: 90.41, name: 'Dhaka' });

function deviceIn(timeZone: string) {
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    timeZone,
  } as Intl.ResolvedDateTimeFormatOptions);
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('country defaults table', () => {
  it('maps time zones to countries', () => {
    expect(countryFromTimeZone('Asia/Dhaka')).toBe('BD');
    expect(countryFromTimeZone('Asia/Calcutta')).toBe('IN');
    expect(countryFromTimeZone('America/Sao_Paulo')).toBeNull();
    expect(countryFromTimeZone(undefined)).toBeNull();
  });

  it('is case-insensitive and falls back for unknown countries', () => {
    expect(prayerDefaultsForCountry('bd')).toEqual({ method: 'Karachi', asr: 'hanafi' });
    expect(prayerDefaultsForCountry('XX')).toEqual({
      method: 'MoonsightingCommittee',
      asr: 'standard',
    });
  });
});

describe('a new user (no saved location, no choice)', () => {
  it('in Bangladesh gets Karachi + Ḥanafī, with nothing written and no suggestion', () => {
    deviceIn('Asia/Dhaka');
    migratePrayerDefaultsOnce();
    expect(getCalcMethod()).toBe('Karachi');
    expect(getAsrMadhab()).toBe('hanafi');
    expect(localStorage.getItem('bustandeen_calc_method')).toBeNull();
    expect(getPrayerDefaultsSuggestion()).toBeNull();
  });

  it('somewhere not in the table keeps the worldwide default', () => {
    deviceIn('America/Sao_Paulo');
    expect(regionPrayerDefaults()).toEqual({ method: 'MoonsightingCommittee', asr: 'standard' });
    expect(getCalcMethod()).toBe('MoonsightingCommittee');
  });
});

describe('an existing user who never chose (saved location only)', () => {
  beforeEach(() => {
    deviceIn('Asia/Dhaka');
    localStorage.setItem('bustandeen_location', LOCATION);
  });

  it('keeps exactly the timetable they had, and gets a one-time offer', () => {
    migratePrayerDefaultsOnce();
    expect(getCalcMethod()).toBe('MoonsightingCommittee');
    expect(getAsrMadhab()).toBe('standard');
    expect(getPrayerDefaultsSuggestion()).toEqual({
      countryCode: 'BD',
      suggested: { method: 'Karachi', asr: 'hanafi' },
      current: { method: 'MoonsightingCommittee', asr: 'standard' },
    });
  });

  it('accepting switches to the local convention and hides the offer', () => {
    migratePrayerDefaultsOnce();
    acceptPrayerDefaultsSuggestion();
    expect(getCalcMethod()).toBe('Karachi');
    expect(getAsrMadhab()).toBe('hanafi');
    expect(getPrayerDefaultsSuggestion()).toBeNull();
  });

  it('"Keep mine" hides the offer and changes nothing', () => {
    migratePrayerDefaultsOnce();
    dismissPrayerDefaultsSuggestion();
    expect(getPrayerDefaultsSuggestion()).toBeNull();
    expect(getCalcMethod()).toBe('MoonsightingCommittee');
  });

  it('runs only once', () => {
    migratePrayerDefaultsOnce();
    dismissPrayerDefaultsSuggestion();
    setCalcMethod('MuslimWorldLeague');
    migratePrayerDefaultsOnce();
    expect(getCalcMethod()).toBe('MuslimWorldLeague');
    expect(getPrayerDefaultsSuggestion()).toBeNull();
  });
});

describe('an existing user who chose both settings', () => {
  it('is never touched and never nudged', () => {
    deviceIn('Asia/Dhaka');
    localStorage.setItem('bustandeen_location', LOCATION);
    setCalcMethod('MuslimWorldLeague');
    setAsrMadhab('standard');
    migratePrayerDefaultsOnce();
    expect(getCalcMethod()).toBe('MuslimWorldLeague');
    expect(getAsrMadhab()).toBe('standard');
    expect(getPrayerDefaultsSuggestion()).toBeNull();
  });
});

// A saved place whose zone maps to no country (2026-10-17, found by R12's
// Ramadan sheet). Before: Garissa, Kenya (Africa/Nairobi) on a Dhaka phone
// got Bangladesh's Karachi + Ḥanafī, while bustandeen.com showed the
// worldwide fallback for the same place. Now the place decides, like the
// calibration (countryAt) already did; the phone is only the hint while no
// place is saved or its zone is not known yet.
describe('the saved place decides the country, not the phone', () => {
  const save = (latitude: number, longitude: number, name: string) =>
    localStorage.setItem('bustandeen_location', JSON.stringify({ latitude, longitude, name }));
  const GARISSA = [-0.45, 39.65] as const;

  beforeEach(async () => {
    await loadZoneLookup();
  });
  afterAll(() => {
    resetZoneLookupForTests();
  });

  it('a zone outside the table gets the worldwide fallback, as on the static pages', () => {
    deviceIn('Asia/Dhaka');
    save(...GARISSA, 'Garissa');
    expect(regionCountry()).toBeNull();
    expect(regionPrayerDefaults()).toEqual(prayerDefaultsForCountry('KE'));
    expect(regionPrayerDefaults()).toEqual({ method: 'MoonsightingCommittee', asr: 'standard' });
    expect(getCalcMethod()).toBe('MoonsightingCommittee');
    expect(getAsrMadhab()).toBe('standard');
  });

  it('an existing user there gets no "your country usually uses" offer', () => {
    deviceIn('Asia/Dhaka');
    save(...GARISSA, 'Garissa');
    migratePrayerDefaultsOnce();
    expect(getPrayerDefaultsSuggestion()).toBeNull();
  });

  it('a place in the table still gets its own country (Dhaka phone, London saved)', () => {
    deviceIn('Asia/Dhaka');
    save(51.51, -0.13, 'London');
    expect(regionCountry()).toBe('GB');
    expect(regionPrayerDefaults()).toEqual({ method: 'MoonsightingCommittee', asr: 'standard' });
  });

  it('no saved place: the phone is the hint, as before', () => {
    deviceIn('Asia/Dhaka');
    expect(regionCountry()).toBe('BD');
    expect(regionPrayerDefaults()).toEqual({ method: 'Karachi', asr: 'hanafi' });
  });

  it('the phone is the hint while the place zone is unknown (zone map not loaded)', () => {
    resetZoneLookupForTests();
    deviceIn('Asia/Dhaka');
    save(...GARISSA, 'Garissa');
    expect(regionCountry()).toBe('BD');
  });

  // Countries already in the table whose other zones were missing, so their
  // places also fell through to the phone.
  it.each([
    ['Indianapolis', 39.77, -86.16, 'US'],
    ['Louisville', 38.25, -85.76, 'US'],
    ['Boise', 43.62, -116.2, 'US'],
    ['Juneau', 58.3, -134.42, 'US'],
    ['Moncton', 46.09, -64.78, 'CA'],
    ['Whitehorse', 60.72, -135.06, 'CA'],
    ['Las Palmas', 28.12, -15.43, 'ES'],
    ['Ceuta', 35.89, -5.32, 'ES'],
    ['Aktobe', 50.28, 57.17, 'KZ'],
    ['Atyrau', 47.1, 51.92, 'KZ'],
    ['Oral', 51.23, 51.37, 'KZ'],
    ['Kyzylorda', 44.85, 65.51, 'KZ'],
  ] as const)('%s maps to %s', (_name, lat, lng, country) => {
    deviceIn('Asia/Dhaka');
    expect(countryAt(lat, lng)).toBe(country);
  });
});
