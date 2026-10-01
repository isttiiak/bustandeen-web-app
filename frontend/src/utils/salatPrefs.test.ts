import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acceptPrayerDefaultsSuggestion,
  dismissPrayerDefaultsSuggestion,
  getAsrMadhab,
  getCalcMethod,
  getPrayerDefaultsSuggestion,
  migratePrayerDefaultsOnce,
  regionPrayerDefaults,
  setAsrMadhab,
  setCalcMethod,
} from './salatPrefs.js';
import { countryFromTimeZone, prayerDefaultsForCountry } from './countryDefaults.js';

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
