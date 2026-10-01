import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ASR_MADHABS,
  CALC_METHODS,
  DEFAULT_TASBIH_MODE,
  TASBIH_MODES,
  acceptPrayerDefaultsSuggestion,
  dismissPrayerDefaultsSuggestion,
  getAsrMadhab,
  getAutoCountDhikr,
  getCalcMethod,
  getPrayerDefaultsSuggestion,
  getShowNaflGuide,
  getShowSunnahGuide,
  getTasbihMode,
  migratePrayerDefaultsOnce,
  setAutoCountDhikr,
  setDhikrCredited,
  setShowNaflGuide,
  setShowSunnahGuide,
  setTasbihMode,
  tasbihDeltas,
  tasbihModeMeta,
  wasDhikrCredited,
} from './salatPrefs.js';
import { TAHLIL_NAME } from './zikrLibrary.js';
import { MemoryStorage } from '../test/memoryStorage.js';

// Audit T2.1: the after-ṣalāh tasbīḥ, the dhikr-credit bookkeeping and the
// guidance toggles (the country-default rules are in salatPrefs.test.ts).
// The rule: both authentic tasbīḥ forms reach exactly one hundred (Ṣaḥīḥ
// Muslim 596 and 597), and un-marking a tag reverses exactly what it credited.

let store: MemoryStorage;
beforeEach(() => {
  store = new MemoryStorage();
  vi.stubGlobal('localStorage', store);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const blockedStorage = () =>
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  });

describe('after-ṣalāh tasbīḥ', () => {
  it.each(TASBIH_MODES.map((m) => [m.id, m] as const))('%s adds up to 100', (_id, mode) => {
    expect(mode.steps.reduce((n, s) => n + s.count, 0)).toBe(100);
    expect(mode.sourceUrl).toMatch(/^https:\/\/sunnah\.com\/muslim:59[67]$/);
  });

  it('the two forms differ only in how the hundred is completed', () => {
    expect(tasbihDeltas('takbir34')).toEqual({
      SubhanAllah: 33,
      Alhamdulillah: 33,
      'Allahu Akbar': 34,
    });
    expect(tasbihDeltas('tahlil')).toEqual({
      SubhanAllah: 33,
      Alhamdulillah: 33,
      'Allahu Akbar': 33,
      [TAHLIL_NAME]: 1,
    });
  });

  it('a reversal subtracts exactly what was added', () => {
    const add = tasbihDeltas('tahlil', 1);
    const sub = tasbihDeltas('tahlil', -1);
    for (const k of Object.keys(add)) expect(add[k]! + sub[k]!).toBe(0);
  });

  it('defaults to 33·33·34 and round-trips', () => {
    expect(getTasbihMode()).toBe(DEFAULT_TASBIH_MODE);
    setTasbihMode('tahlil');
    expect(getTasbihMode()).toBe('tahlil');
  });

  it("ignores the Zikr counter's unrelated '1'/'0' toggle value", () => {
    store.setItem('bustandeen_tasbih_breakdown', '1');
    expect(getTasbihMode()).toBe(DEFAULT_TASBIH_MODE);
  });

  it('tasbihModeMeta falls back to the first form for an unknown id', () => {
    expect(tasbihModeMeta('x' as 'tahlil').id).toBe(TASBIH_MODES[0]!.id);
  });
});

describe('boolean toggles', () => {
  it.each([
    ['auto-count dhikr', getAutoCountDhikr, setAutoCountDhikr, true],
    ['sunnah guide', getShowSunnahGuide, setShowSunnahGuide, true],
    ['nafl guide', getShowNaflGuide, setShowNaflGuide, false],
  ] as const)('%s: default %s, then round-trips', (_l, get, set, dflt) => {
    expect(get()).toBe(dflt);
    set(!dflt);
    expect(get()).toBe(!dflt);
    set(dflt);
    expect(get()).toBe(dflt);
  });

  it('every getter falls back to its default when storage is blocked', () => {
    blockedStorage();
    expect(getAutoCountDhikr()).toBe(true);
    expect(getShowSunnahGuide()).toBe(true);
    expect(getShowNaflGuide()).toBe(false);
    expect(getTasbihMode()).toBe(DEFAULT_TASBIH_MODE);
    expect(wasDhikrCredited('2026-03-12', 'fajr', 'tasbeeh')).toBe(false);
    expect(ASR_MADHABS.map((m) => m.id)).toContain(getAsrMadhab());
    expect(CALC_METHODS.map((m) => m.id)).toContain(getCalcMethod());
    expect(getPrayerDefaultsSuggestion()).toBeNull();
  });

  it('every setter is silent when storage is blocked', () => {
    blockedStorage();
    expect(() => {
      setAutoCountDhikr(false);
      setShowSunnahGuide(false);
      setShowNaflGuide(true);
      setTasbihMode('tahlil');
      setDhikrCredited('2026-03-12', 'fajr', 'tasbeeh', true);
      migratePrayerDefaultsOnce();
      dismissPrayerDefaultsSuggestion();
      acceptPrayerDefaultsSuggestion();
    }).not.toThrow();
  });
});

describe('dhikr-credit bookkeeping', () => {
  it('remembers each prayer and tag separately, for today only', () => {
    setDhikrCredited('2026-03-12', 'fajr', 'tasbeeh', true);
    setDhikrCredited('2026-03-12', 'fajr', 'ayatulKursi', true);
    expect(wasDhikrCredited('2026-03-12', 'fajr', 'tasbeeh')).toBe(true);
    expect(wasDhikrCredited('2026-03-12', 'dhuhr', 'tasbeeh')).toBe(false);
    expect(wasDhikrCredited('2026-03-13', 'fajr', 'tasbeeh')).toBe(false);

    setDhikrCredited('2026-03-12', 'fajr', 'tasbeeh', false);
    expect(wasDhikrCredited('2026-03-12', 'fajr', 'tasbeeh')).toBe(false);
    expect(wasDhikrCredited('2026-03-12', 'fajr', 'ayatulKursi')).toBe(true);
  });

  it("a new day starts clean and overwrites yesterday's record", () => {
    setDhikrCredited('2026-03-12', 'isha', 'tasbeeh', true);
    setDhikrCredited('2026-03-13', 'fajr', 'tasbeeh', true);
    expect(wasDhikrCredited('2026-03-12', 'isha', 'tasbeeh')).toBe(false);
    expect(wasDhikrCredited('2026-03-13', 'fajr', 'tasbeeh')).toBe(true);
  });

  it('a corrupt record reads as nothing credited', () => {
    store.setItem('bustandeen_salat_dhikr_credited', '{bad');
    expect(wasDhikrCredited('2026-03-12', 'fajr', 'tasbeeh')).toBe(false);
  });
});

describe('calculation method', () => {
  it('an unknown stored method falls back to the regional default', () => {
    store.setItem('bustandeen_calc_method', 'NotAMethod');
    expect(CALC_METHODS.map((m) => m.id)).toContain(getCalcMethod());
    expect(getCalcMethod()).not.toBe('NotAMethod');
  });
});
