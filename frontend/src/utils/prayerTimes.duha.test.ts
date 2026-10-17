import { describe, expect, it } from 'vitest';
import {
  getCurrentNaflWindow,
  getForbiddenWindows,
  getIstiwaStart,
  type PrayerTimesResult,
} from './prayerTimes.js';

// Duha ends where the Istiwa' (zenith) forbidden window starts (Sahih Muslim
// 831; Sahih al-Bukhari 585). Home and Prayer Times both read getIstiwaStart,
// so they show the same end. Dhaka, 12 Oct 2026 (the day the two screens
// disagreed: Home 11:32, Prayer Times 11:37).
const at = (hhmm: string) => new Date(`2026-10-12T${hhmm}:00+06:00`);
const TIMES: PrayerTimesResult = {
  fajr: at('04:39'),
  sehri: at('04:39'),
  sunrise: at('05:55'),
  dhuhr: at('11:47'),
  asr: at('15:08'),
  sunset: at('17:38'),
  maghrib: at('17:38'),
  isha: at('18:52'),
};

describe('Duha end = start of Istiwa', () => {
  it('Istiwa starts 10 minutes before Dhuhr', () => {
    expect(getIstiwaStart(TIMES)).toEqual(at('11:37'));
  });

  it('the zenith forbidden window starts at getIstiwaStart and ends at Dhuhr', () => {
    const zenith = getForbiddenWindows(TIMES)[1]!;
    expect(zenith.start).toEqual(getIstiwaStart(TIMES));
    expect(zenith.end).toEqual(TIMES.dhuhr);
  });

  it("Home's Duha window runs from sunrise +45 min to 11:37", () => {
    const w = getCurrentNaflWindow(TIMES, at('09:00'));
    expect(w).toMatchObject({ id: 'duha', start: at('06:40'), end: at('11:37') });
  });

  it('Duha is still open at 11:33 (was cut at 11:32) and closed at 11:37', () => {
    expect(getCurrentNaflWindow(TIMES, at('11:33'))?.id).toBe('duha');
    expect(getCurrentNaflWindow(TIMES, at('11:37'))).toBeNull();
  });

  it('Ishraq is unchanged: sunrise +20 to +45 min', () => {
    expect(getCurrentNaflWindow(TIMES, at('06:20'))).toMatchObject({
      id: 'ishraq',
      start: at('06:15'),
      end: at('06:40'),
    });
  });
});
