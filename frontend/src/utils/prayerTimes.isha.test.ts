import { describe, expect, it } from 'vitest';
import { getIshaPhase, getMandatoryWidget, type PrayerTimesResult } from './prayerTimes.js';

// ʿIshāʾ's preferred time ends at the middle of the night (Sahih Muslim
// 612a/612d); after that the arch counts down to Fajr without "best".
// Fixed times (Dhaka-like day, UTC+6 pinned by the test env).
const at = (hhmm: string, day = '2026-10-09') => new Date(`${day}T${hhmm}:00+06:00`);
const TIMES: PrayerTimesResult = {
  fajr: at('04:30'),
  sunrise: at('05:45'),
  dhuhr: at('11:45'),
  asr: at('15:10'),
  sunset: at('17:35'),
  maghrib: at('17:35'),
  isha: at('18:50'),
};
// Night 18:50 → 04:30 (next day) = 9h40m; middle = 23:40.

describe('getIshaPhase', () => {
  it('is the best time from ʿIshāʾ until Islamic midnight', () => {
    expect(getIshaPhase(TIMES, at('19:00'))).toEqual({ best: true, end: at('23:40') });
    expect(getIshaPhase(TIMES, at('23:39'))).toEqual({ best: true, end: at('23:40') });
  });

  it('counts down to the next Fajr after Islamic midnight', () => {
    expect(getIshaPhase(TIMES, at('23:40'))).toEqual({
      best: false,
      end: at('04:30', '2026-10-10'),
    });
  });

  it('after civil midnight uses last night (yesterday ʿIshāʾ to today Fajr)', () => {
    // Yesterday ʿIshāʾ ≈ 18:50 on 10-08, so the middle is 23:40 on 10-08.
    expect(getIshaPhase(TIMES, at('01:00'))).toEqual({ best: false, end: at('04:30') });
  });

  it('keeps "best" past civil midnight when Islamic midnight is later', () => {
    const late: PrayerTimesResult = { ...TIMES, isha: at('21:00'), fajr: at('03:30') };
    // Night 21:00 → 03:30 = 6h30m; middle = 00:15.
    expect(getIshaPhase(late, at('00:05'))).toEqual({ best: true, end: at('00:15') });
    expect(getIshaPhase(late, at('00:20'))).toEqual({ best: false, end: at('03:30') });
  });
});

describe('getMandatoryWidget ʿIshāʾ end', () => {
  it('reports the phase and a future end on both sides of Islamic midnight', () => {
    const before = getMandatoryWidget(TIMES, at('20:00'));
    expect(before.currentMandatory).toBe('isha');
    expect(before.ishaBest).toBe(true);
    expect(before.currentMandatoryEnd).toEqual(at('23:40'));

    // Used to report the past midpoint here (countdown hidden).
    const after = getMandatoryWidget(TIMES, at('23:50'));
    expect(after.ishaBest).toBe(false);
    expect(after.currentMandatoryEnd).toEqual(at('04:30', '2026-10-10'));
  });

  it('is null for other prayers', () => {
    expect(getMandatoryWidget(TIMES, at('12:00')).ishaBest).toBeNull();
  });
});
