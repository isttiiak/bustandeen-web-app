import { describe, expect, it } from 'vitest';
import { excusedOnEndDay, prayersEndedBefore } from './cycleEndDay.js';
import type { PrayerTimesResult } from './prayerTimes.js';

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 29, h, m));
const times = {
  fajr: at(0, 0),
  sehri: at(0, 0),
  sunrise: at(1, 0),
  dhuhr: at(6, 0),
  asr: at(9, 30),
  maghrib: at(11, 45),
  isha: at(13, 0),
  sunset: at(11, 40),
} as PrayerTimesResult;
const nextFajr = new Date(at(0, 0).getTime() + 86_400_000);

describe('prayers excused on the day an episode is marked finished', () => {
  it('marked finished mid-morning: only Fajr had run out', () => {
    expect(prayersEndedBefore(times, nextFajr, at(3, 30))).toEqual(['fajr']);
  });

  it('marked finished before sunrise: Fajr is still owed, nothing is excused', () => {
    expect(prayersEndedBefore(times, nextFajr, at(0, 40))).toEqual([]);
  });

  it('marked finished in the afternoon: Fajr and Dhuhr', () => {
    expect(prayersEndedBefore(times, nextFajr, at(10, 0))).toEqual(['fajr', 'dhuhr']);
  });

  it('a prayer whose time ends at that very moment counts as ended', () => {
    expect(prayersEndedBefore(times, nextFajr, at(1, 0))).toEqual(['fajr']);
  });

  it('Isha stays owed all night and ends at the next Fajr', () => {
    expect(prayersEndedBefore(times, nextFajr, at(23, 0))).toEqual([
      'fajr',
      'dhuhr',
      'asr',
      'maghrib',
    ]);
    expect(prayersEndedBefore(times, nextFajr, new Date(nextFajr.getTime() + 60_000))).toHaveLength(
      5
    );
  });

  it('needs the moment it was marked finished and a saved place, and only on the end day', () => {
    const place = { latitude: 23.8103, longitude: 90.4125 };
    const logs = [{ endDate: '2026-11-29', endedAt: '2026-11-29T04:00:00.000Z' }];
    expect(excusedOnEndDay(logs, '2026-11-29', place)).toContain('fajr');
    expect(excusedOnEndDay(logs, '2026-11-28', place)).toEqual([]);
    expect(excusedOnEndDay(logs, '2026-11-29', null)).toEqual([]);
    expect(
      excusedOnEndDay([{ endDate: '2026-11-29', endedAt: null }], '2026-11-29', place)
    ).toEqual([]);
    expect(excusedOnEndDay(undefined, '2026-11-29', place)).toEqual([]);
  });
});
