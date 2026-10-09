import { describe, expect, it } from 'vitest';
import type { PrayerTimesResult } from './prayerTimes.js';
import { adhkarWindow, buildTimeline, canMarkFromHome, currentPrayer } from './todayTimeline.js';

// Dhaka-like times on 2026-10-09 (TZ pinned to Asia/Dhaka for the run).
const at = (hhmm: string) => new Date(`2026-10-09T${hhmm}:00+06:00`);
const TIMES: PrayerTimesResult = {
  fajr: at('04:38'),
  sunrise: at('05:52'),
  dhuhr: at('11:46'),
  asr: at('15:57'),
  maghrib: at('17:38'),
  isha: at('18:52'),
  sunset: at('17:38'),
};

describe('currentPrayer', () => {
  it('is last night’s ʿIshāʾ before Fajr', () => {
    expect(currentPrayer(TIMES, at('03:00'))).toBe('isha');
  });
  it('follows the start times through the day', () => {
    expect(currentPrayer(TIMES, at('04:38'))).toBe('fajr');
    expect(currentPrayer(TIMES, at('09:00'))).toBe('fajr');
    expect(currentPrayer(TIMES, at('12:00'))).toBe('dhuhr');
    expect(currentPrayer(TIMES, at('16:30'))).toBe('asr');
    expect(currentPrayer(TIMES, at('18:00'))).toBe('maghrib');
    expect(currentPrayer(TIMES, at('22:00'))).toBe('isha');
  });
});

describe('adhkarWindow (Fajr→sunrise, ʿAṣr→Maghrib)', () => {
  it('opens morning adhkār from Fajr until sunrise only', () => {
    expect(adhkarWindow(TIMES, at('04:37'))).toBeNull();
    expect(adhkarWindow(TIMES, at('04:38'))).toBe('morning');
    expect(adhkarWindow(TIMES, at('05:51'))).toBe('morning');
    expect(adhkarWindow(TIMES, at('05:52'))).toBeNull();
  });
  it('opens evening adhkār from ʿAṣr until Maghrib only', () => {
    expect(adhkarWindow(TIMES, at('15:56'))).toBeNull();
    expect(adhkarWindow(TIMES, at('15:57'))).toBe('evening');
    expect(adhkarWindow(TIMES, at('17:37'))).toBe('evening');
    expect(adhkarWindow(TIMES, at('17:38'))).toBeNull();
  });
});

describe('buildTimeline', () => {
  it('lists the five prayers with statuses, the current one and the adhkār rows', () => {
    const rows = buildTimeline(TIMES, at('16:00'), {
      fajr: 'completed',
      dhuhr: 'kaza',
      asr: undefined,
      maghrib: 'weird',
    });
    expect(rows.map((r) => r.id)).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
    expect(rows.map((r) => r.status)).toEqual([
      'completed',
      'kaza',
      'pending',
      'pending',
      'pending',
    ]);
    expect(rows.filter((r) => r.current).map((r) => r.id)).toEqual(['asr']);
    expect(rows[0].adhkar).toEqual({ period: 'morning', open: false, until: TIMES.sunrise });
    expect(rows[2].adhkar).toEqual({ period: 'evening', open: true, until: TIMES.maghrib });
    expect(rows[1].adhkar).toBeUndefined();
  });
});

describe('canMarkFromHome', () => {
  const base = {
    status: 'pending' as const,
    times: TIMES,
    now: at('16:00'),
    dayStartMode: 'fajr' as const,
    excused: false,
    travelling: false,
  };
  it('allows a pending current prayer in fajr mode, even before Fajr', () => {
    expect(canMarkFromHome(base)).toBe(true);
    expect(canMarkFromHome({ ...base, now: at('02:00') })).toBe(true);
  });
  it('never re-marks Done/Kaza; a Miss can be corrected to Done', () => {
    expect(canMarkFromHome({ ...base, status: 'completed' })).toBe(false);
    expect(canMarkFromHome({ ...base, status: 'kaza' })).toBe(false);
    expect(canMarkFromHome({ ...base, status: 'missed' })).toBe(true);
  });
  it('defers to the Salat page in Rayhanah days and Musafir mode', () => {
    expect(canMarkFromHome({ ...base, excused: true })).toBe(false);
    expect(canMarkFromHome({ ...base, travelling: true })).toBe(false);
  });
  it('midnight mode: only from Fajr on (pre-Fajr ʿIshāʾ is yesterday’s)', () => {
    expect(canMarkFromHome({ ...base, dayStartMode: 'midnight', now: at('02:00') })).toBe(false);
    expect(canMarkFromHome({ ...base, dayStartMode: 'midnight' })).toBe(true);
  });
  it('maghrib mode: never from Home', () => {
    expect(canMarkFromHome({ ...base, dayStartMode: 'maghrib' })).toBe(false);
  });
});
