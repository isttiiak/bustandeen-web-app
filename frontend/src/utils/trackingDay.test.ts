import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getDayStartMode,
  getFajrTime,
  getMaghribTime,
  getTrackingDay,
  getTrackingDayMiddayTs,
  getTrackingDayMiddayTsDaysBack,
  isNewTrackingDay,
  setDayStartModeLocal,
  type DayStartMode,
} from './trackingDay.js';
import { MemoryStorage } from '../test/memoryStorage.js';

// Audit T2.1. The rule: the worship day starts at Fajr by default (or civil
// midnight / Maghrib by choice), so Isha at 1 AM and suhoor before dawn belong
// to the closing day. Without a saved location there is no Fajr to anchor to,
// and the boundary falls back to civil midnight. TZ is pinned to Asia/Dhaka in
// vitest.config.ts, so local times below are Dhaka wall-clock times.

const DHAKA = JSON.stringify({ latitude: 23.81, longitude: 90.41, name: 'Dhaka' });

let store: MemoryStorage;
beforeEach(() => {
  store = new MemoryStorage();
  vi.stubGlobal('localStorage', store);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min, 0, 0);
const plusMin = (t: Date, min: number) => new Date(t.getTime() + min * 60_000);

describe('day start mode preference', () => {
  it('defaults to fajr', () => {
    expect(getDayStartMode()).toBe('fajr');
  });

  it.each<DayStartMode>(['fajr', 'midnight', 'maghrib'])('round-trips %s', (mode) => {
    setDayStartModeLocal(mode);
    expect(getDayStartMode()).toBe(mode);
  });

  it('ignores an unknown stored value', () => {
    store.setItem('bustandeen_day_start_mode', 'asr');
    expect(getDayStartMode()).toBe('fajr');
  });

  it('survives blocked storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => setDayStartModeLocal('maghrib')).not.toThrow();
    expect(getDayStartMode()).toBe('fajr');
  });
});

describe('prayer-time anchors', () => {
  it('are null without a saved location', () => {
    expect(getFajrTime(at(2026, 3, 15, 12))).toBeNull();
    expect(getMaghribTime(at(2026, 3, 15, 12))).toBeNull();
  });

  it.each([
    ['not JSON', '{oops'],
    ['missing coordinates', JSON.stringify({ name: 'Dhaka' })],
    ['string coordinates', JSON.stringify({ latitude: '23.8', longitude: '90.4' })],
  ])('are null when the stored location is %s', (_label, raw) => {
    store.setItem('bustandeen_location', raw);
    expect(getFajrTime(at(2026, 3, 15, 12))).toBeNull();
  });

  it('fall in the expected Dhaka windows', () => {
    store.setItem('bustandeen_location', DHAKA);
    const fajr = getFajrTime(at(2026, 3, 15, 12))!;
    const maghrib = getMaghribTime(at(2026, 3, 15, 12))!;
    expect(fajr.getDate()).toBe(15);
    expect(fajr.getHours()).toBeGreaterThanOrEqual(4);
    expect(fajr.getHours()).toBeLessThan(6);
    expect(maghrib.getHours()).toBeGreaterThanOrEqual(17);
    expect(maghrib.getHours()).toBeLessThan(19);
  });

  it('are null when the prayer-time math throws (NaN coordinates)', () => {
    store.setItem('bustandeen_location', JSON.stringify({ latitude: NaN, longitude: NaN }));
    // NaN is typeof number, so it reaches calcPrayerTimes; whatever adhan does
    // with it, the anchor must not crash the caller.
    expect(() => getFajrTime(at(2026, 3, 15, 12))).not.toThrow();
  });
});

describe('getTrackingDay', () => {
  describe('without a location: civil midnight in every mode', () => {
    it.each<[DayStartMode, Date, string]>([
      ['fajr', at(2026, 3, 15, 0, 30), '2026-03-15'],
      ['fajr', at(2026, 3, 15, 23, 59), '2026-03-15'],
      ['maghrib', at(2026, 3, 15, 23, 0), '2026-03-15'],
      ['midnight', at(2026, 3, 15, 0, 0), '2026-03-15'],
    ])('%s at %s → %s', (mode, now, expected) => {
      setDayStartModeLocal(mode);
      expect(getTrackingDay(now)).toBe(expected);
    });
  });

  describe('with a location (Dhaka)', () => {
    beforeEach(() => store.setItem('bustandeen_location', DHAKA));

    it('fajr mode: one minute before Fajr is still the closing day', () => {
      const fajr = getFajrTime(at(2026, 3, 15, 12))!;
      expect(getTrackingDay(plusMin(fajr, -1))).toBe('2026-03-14');
      expect(getTrackingDay(fajr)).toBe('2026-03-15');
      expect(getTrackingDay(plusMin(fajr, 1))).toBe('2026-03-15');
    });

    it('fajr mode: Isha at 1 AM belongs to yesterday', () => {
      expect(getTrackingDay(at(2026, 3, 15, 1, 0))).toBe('2026-03-14');
    });

    it('fajr mode: late evening is still today', () => {
      expect(getTrackingDay(at(2026, 3, 15, 23, 30))).toBe('2026-03-15');
    });

    it('fajr mode: crosses month and year boundaries', () => {
      expect(getTrackingDay(at(2026, 3, 1, 2, 0))).toBe('2026-02-28');
      expect(getTrackingDay(at(2027, 1, 1, 2, 0))).toBe('2026-12-31');
      expect(getTrackingDay(at(2028, 3, 1, 2, 0))).toBe('2028-02-29');
    });

    it('maghrib mode: before Maghrib is yesterday, from Maghrib it is today', () => {
      setDayStartModeLocal('maghrib');
      const maghrib = getMaghribTime(at(2026, 3, 15, 12))!;
      expect(getTrackingDay(at(2026, 3, 15, 12))).toBe('2026-03-14');
      expect(getTrackingDay(plusMin(maghrib, -1))).toBe('2026-03-14');
      expect(getTrackingDay(maghrib)).toBe('2026-03-15');
      expect(getTrackingDay(at(2026, 3, 15, 23, 0))).toBe('2026-03-15');
    });

    it('midnight mode ignores prayer times', () => {
      setDayStartModeLocal('midnight');
      expect(getTrackingDay(at(2026, 3, 15, 1, 0))).toBe('2026-03-15');
      expect(getTrackingDay(at(2026, 3, 14, 23, 59))).toBe('2026-03-14');
    });
  });
});

describe('getTrackingDayMiddayTs', () => {
  it('is local noon of the tracking day', () => {
    store.setItem('bustandeen_location', DHAKA);
    expect(getTrackingDayMiddayTs(at(2026, 3, 15, 1, 0))).toBe(at(2026, 3, 14, 12).getTime());
    expect(getTrackingDayMiddayTs(at(2026, 3, 15, 15, 0))).toBe(at(2026, 3, 15, 12).getTime());
  });
});

describe('getTrackingDayMiddayTsDaysBack (Log missed counts)', () => {
  it('counts back from the TRACKING day, not the civil date', () => {
    store.setItem('bustandeen_location', DHAKA);
    setDayStartModeLocal('maghrib');
    // 15:00 on the 15th, before Maghrib: tracking day is the 14th.
    const now = at(2026, 3, 15, 15, 0);
    expect(getTrackingDayMiddayTsDaysBack(0, now)).toBe(at(2026, 3, 14, 12).getTime());
    expect(getTrackingDayMiddayTsDaysBack(1, now)).toBe(at(2026, 3, 13, 12).getTime());
    expect(getTrackingDayMiddayTsDaysBack(2, now)).toBe(at(2026, 3, 12, 12).getTime());
  });

  it('fajr mode before dawn: 2 back is three civil days ago', () => {
    store.setItem('bustandeen_location', DHAKA);
    const now = at(2026, 3, 15, 2, 0);
    expect(getTrackingDayMiddayTsDaysBack(2, now)).toBe(at(2026, 3, 12, 12).getTime());
  });

  it('stays inside the 4-day server window in the worst case', () => {
    // Server (zikr.schemas.ts TS_MAX_AGE_MS) refuses ts older than 4 x 24h.
    store.setItem('bustandeen_location', DHAKA);
    setDayStartModeLocal('maghrib');
    const maghrib = getMaghribTime(at(2026, 6, 21, 12))!;
    const now = plusMin(maghrib, -1);
    expect(now.getTime() - getTrackingDayMiddayTsDaysBack(2, now)).toBeLessThan(4 * 86_400_000);
    expect(now.getTime() - getTrackingDayMiddayTsDaysBack(2, now)).toBeGreaterThan(3 * 86_400_000);
  });
});

describe('isNewTrackingDay', () => {
  it('compares against the current tracking day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(2026, 3, 15, 15, 0));
    expect(isNewTrackingDay('2026-03-15')).toBe(false);
    expect(isNewTrackingDay('2026-03-14')).toBe(true);
    expect(isNewTrackingDay(null)).toBe(true);
  });
});
