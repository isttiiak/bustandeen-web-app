import { describe, expect, it } from 'vitest';
import type { PrayerTimesResult } from './prayerTimes.js';
import {
  adhkarWindow,
  buildTimeline,
  canKazaFromHome,
  canMarkFromHome,
  currentPrayer,
  openAdhkar,
} from './todayTimeline.js';

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

describe('adhkarWindow (Fajr→sunrise, Maghrib→ʿIshāʾ)', () => {
  it('opens morning adhkār from Fajr until sunrise only', () => {
    expect(adhkarWindow(TIMES, at('04:37'))).toBeNull();
    expect(adhkarWindow(TIMES, at('04:38'))).toBe('morning');
    expect(adhkarWindow(TIMES, at('05:51'))).toBe('morning');
    expect(adhkarWindow(TIMES, at('05:52'))).toBeNull();
  });
  it('opens evening adhkār from Maghrib (not ʿAṣr) until ʿIshāʾ only', () => {
    expect(adhkarWindow(TIMES, at('16:30'))).toBeNull();
    expect(adhkarWindow(TIMES, at('17:37'))).toBeNull();
    expect(adhkarWindow(TIMES, at('17:38'))).toBe('evening');
    expect(adhkarWindow(TIMES, at('18:51'))).toBe('evening');
    expect(adhkarWindow(TIMES, at('18:52'))).toBeNull();
    expect(adhkarWindow(TIMES, at('23:00'))).toBeNull();
  });
});

describe('openAdhkar', () => {
  it('puts the morning card on Fajr and the evening card on Maghrib', () => {
    expect(openAdhkar(TIMES, at('05:00'))).toEqual({
      prayer: 'fajr',
      period: 'morning',
      until: TIMES.sunrise,
    });
    expect(openAdhkar(TIMES, at('18:00'))).toEqual({
      prayer: 'maghrib',
      period: 'evening',
      until: TIMES.isha,
    });
    expect(openAdhkar(TIMES, at('12:00'))).toBeNull();
  });
});

describe('buildTimeline', () => {
  it('lists the five prayers with statuses and the current one', () => {
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
    // ʿAṣr no longer opens the evening adhkār.
    expect(rows.some((r) => r.adhkar)).toBe(false);
  });
  it('attaches an adhkār card only while its window is open', () => {
    const morning = buildTimeline(TIMES, at('05:00'), {});
    expect(morning.filter((r) => r.adhkar).map((r) => r.id)).toEqual(['fajr']);
    expect(morning[0].adhkar).toEqual({ period: 'morning', until: TIMES.sunrise });
    const evening = buildTimeline(TIMES, at('18:00'), {});
    expect(evening.filter((r) => r.adhkar).map((r) => r.id)).toEqual(['maghrib']);
    expect(evening[3].adhkar).toEqual({ period: 'evening', until: TIMES.isha });
    expect(buildTimeline(TIMES, at('20:00'), {}).some((r) => r.adhkar)).toBe(false);
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

describe('canKazaFromHome', () => {
  const base = {
    prayer: 'dhuhr' as const,
    status: 'pending' as const,
    times: TIMES,
    now: at('16:00'),
    dayStartMode: 'fajr' as const,
    excused: false,
    travelling: false,
  };
  it('offers Kaza once the prayer’s own time is over, not before', () => {
    expect(canKazaFromHome({ ...base, now: at('15:56') })).toBe(false); // Ẓuhr still on
    expect(canKazaFromHome({ ...base, now: at('15:57') })).toBe(true); // ʿAṣr began
    expect(canKazaFromHome({ ...base, prayer: 'fajr', now: at('05:51') })).toBe(false);
    expect(canKazaFromHome({ ...base, prayer: 'fajr', now: at('05:52') })).toBe(true);
    expect(canKazaFromHome({ ...base, prayer: 'maghrib', now: at('18:51') })).toBe(false);
    expect(canKazaFromHome({ ...base, prayer: 'maghrib', now: at('18:52') })).toBe(true);
  });
  it('ʿAṣr: on time until sunset, the makrūh margin is not Kaza', () => {
    expect(canKazaFromHome({ ...base, prayer: 'asr', now: at('17:25') })).toBe(false);
    expect(canKazaFromHome({ ...base, prayer: 'asr', now: at('17:37') })).toBe(false);
    expect(canKazaFromHome({ ...base, prayer: 'asr', now: at('17:38') })).toBe(true);
  });
  it('never for ʿIshāʾ, at any hour', () => {
    for (const hhmm of ['22:00', '23:59', '02:00', '04:37']) {
      expect(canKazaFromHome({ ...base, prayer: 'isha', now: at(hhmm) })).toBe(false);
    }
  });
  it('only for pending or Miss (Miss → Kaza is allowed)', () => {
    expect(canKazaFromHome({ ...base, status: 'missed' })).toBe(true);
    expect(canKazaFromHome({ ...base, status: 'completed' })).toBe(false);
    expect(canKazaFromHome({ ...base, status: 'kaza' })).toBe(false);
  });
  it('not in Rayhanah days or Musafir mode', () => {
    expect(canKazaFromHome({ ...base, excused: true })).toBe(false);
    expect(canKazaFromHome({ ...base, travelling: true })).toBe(false);
  });
  it('fajr mode before Fajr: yesterday’s Fajr to Maghrib are over', () => {
    for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib'] as const) {
      expect(canKazaFromHome({ ...base, prayer, now: at('01:00') })).toBe(true);
    }
  });
  it('midnight mode: only from Fajr on; maghrib mode: never', () => {
    expect(canKazaFromHome({ ...base, dayStartMode: 'midnight', now: at('01:00') })).toBe(false);
    expect(canKazaFromHome({ ...base, dayStartMode: 'midnight' })).toBe(true);
    expect(canKazaFromHome({ ...base, dayStartMode: 'maghrib' })).toBe(false);
    expect(canKazaFromHome({ ...base, dayStartMode: 'maghrib', now: at('17:00') })).toBe(false);
  });
});
