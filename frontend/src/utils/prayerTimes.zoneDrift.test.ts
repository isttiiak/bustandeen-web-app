import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { calcPrayerTimes, calendarDateAtLocation } from './prayerTimes.js';
import { getTrackingDay } from './trackingDay.js';
import { getHijriToday, getTodaySpecialDays, isFriday, isPostMaghrib } from './islamicCalendar.js';
import { MemoryStorage } from '../test/memoryStorage.js';

// Sweden report, 2026-10-11: a user in Stockholm (CEST, UTC+2; the longitude
// gives a solar offset of +1 h) saw "Sun, Oct 11" with the Monday/Thursday
// fast card and the next day's Hijri date at 00:22. The day at the location
// was read from the longitude, so 00:00-01:00 counted as Saturday: Saturday's
// Maghrib had passed, so the Islamic day jumped to Monday, and Saturday's Fajr
// had passed, so the tracking day jumped to Sunday before Sunday's Fajr.
// This suite runs in the user's zone (the rest pin Asia/Dhaka).

const STOCKHOLM = JSON.stringify({ latitude: 59.33, longitude: 18.07, name: 'Stockholm' });
const MADRID = JSON.stringify({ latitude: 40.42, longitude: -3.7, name: 'Madrid' });

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
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('Stockholm, 00:22 on Sunday 11 Oct 2026 (CEST)', () => {
  beforeEach(() => {
    process.env.TZ = 'Europe/Stockholm';
    store.setItem('bustandeen_location', STOCKHOLM);
  });
  const now = () => new Date('2026-10-11T00:22:00+02:00');

  it('computes the prayer times of the device day (Sunday)', () => {
    expect(ymd(calendarDateAtLocation(18.07, now()))).toBe('2026-10-11');
    const t = calcPrayerTimes(59.33, 18.07, now());
    expect(ymd(t.fajr)).toBe('2026-10-11');
    expect(ymd(t.maghrib)).toBe('2026-10-11');
  });

  it('is still the night before Sunday Fajr: tracking day is Saturday', () => {
    expect(getTrackingDay(now())).toBe('2026-10-10');
  });

  it('is not "after Maghrib": Islamic day is Sunday, no Monday fast, not Friday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now());
    try {
      expect(isPostMaghrib(now())).toBe(false);
      // Umm al-Qura: Sunday 11 Oct 2026 = 30 Rabīʿ al-Ākhir 1448.
      expect(getHijriToday()).toMatchObject({ day: 30, month: 4, year: 1448 });
      expect(getTodaySpecialDays().map((d) => d.id)).not.toContain('fast_mon_thu');
      expect(isFriday()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('after Sunday Maghrib it is the night of Monday (fast card + next Hijri day)', () => {
    vi.useFakeTimers();
    const evening = new Date('2026-10-11T21:00:00+02:00');
    vi.setSystemTime(evening);
    try {
      expect(isPostMaghrib(evening)).toBe(true);
      expect(getHijriToday()).toMatchObject({ day: 1, month: 5, year: 1448 });
      expect(getTodaySpecialDays().map((d) => d.id)).toContain('fast_mon_thu');
      expect(getTrackingDay(evening)).toBe('2026-10-11');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Madrid, 01:30 on Sunday 11 Oct 2026 (CEST, 2 h ahead of solar time)', () => {
  it('keeps the device day and Saturday as the tracking day', () => {
    process.env.TZ = 'Europe/Madrid';
    store.setItem('bustandeen_location', MADRID);
    const now = new Date('2026-10-11T01:30:00+02:00');
    expect(ymd(calcPrayerTimes(40.42, -3.7, now).fajr)).toBe('2026-10-11');
    expect(getTrackingDay(now)).toBe('2026-10-10');
    expect(isPostMaghrib(now)).toBe(false);
  });
});

describe('a far-away saved location still uses its own day', () => {
  it('Dhaka device, Los Angeles location: 10:00 Sunday in Dhaka is Saturday in LA', () => {
    process.env.TZ = 'Asia/Dhaka';
    const now = new Date('2026-10-11T10:00:00+06:00');
    expect(ymd(calendarDateAtLocation(-118.24, now))).toBe('2026-10-10');
  });
});
