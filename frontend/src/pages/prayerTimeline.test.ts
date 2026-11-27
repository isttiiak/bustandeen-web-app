import { describe, expect, it } from 'vitest';
import { buildTimeline } from './PrayerTimes.js';
import { calcPrayerTimes } from '../utils/prayerTimes.js';

// Audit P4-1: buildTimeline is the page's fiqh table (the forbidden windows, the
// Ishraq/Duha, Awwabin and Tahajjud windows, and the Isha and night arithmetic).
// This records its output BEFORE the page is split, for a spread of places and
// moments, and compares it after: the move must not change one instant or one
// word of it. (Dates are written as ISO instants.)

const PLACES: Record<string, { latitude: number; longitude: number; name: string }> = {
  dhaka: { latitude: 23.8103, longitude: 90.4125, name: 'Dhaka' },
  london: { latitude: 51.5074, longitude: -0.1278, name: 'London' },
  makkah: { latitude: 21.3891, longitude: 39.8579, name: 'Makkah' },
  sydney: { latitude: -33.8688, longitude: 151.2093, name: 'Sydney' },
  tromso: { latitude: 69.6492, longitude: 18.9553, name: 'Tromso' },
};

const MOMENTS: Record<string, string> = {
  'before-fajr': '2026-10-16T03:30:00+06:00',
  'after-islamic-midnight': '2026-10-16T00:40:00+06:00',
  'late-morning': '2026-10-15T10:00:00+06:00',
  afternoon: '2026-10-15T15:40:00+06:00',
  night: '2026-10-15T23:50:00+06:00',
  'midsummer-noon': '2026-06-21T12:00:00+00:00',
  'midwinter-dawn': '2026-12-21T05:30:00+00:00',
};

const t = (key: string, fallback: string) => `${key} :: ${fallback}`;

const plain = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value, (_k, v: unknown) => v)) as unknown;

describe('buildTimeline gives the same entries as before the split', () => {
  const cases = Object.entries(PLACES).flatMap(([place, loc]) =>
    Object.entries(MOMENTS).map(([moment, at]) => [place, moment, loc, at] as const)
  );

  it.each(cases)('%s, %s', async (place, moment, loc, at) => {
    const now = new Date(at);
    const times = calcPrayerTimes(loc.latitude, loc.longitude, now);
    const entries = buildTimeline(times, t, now, loc);
    await expect(JSON.stringify(plain(entries), null, 1) + '\n').toMatchFileSnapshot(
      `./prayerTimeline.baselines/${place}-${moment}.json`
    );
  });

  it('without a saved place it still builds from the times alone', async () => {
    const now = new Date('2026-10-16T03:30:00+06:00');
    const times = calcPrayerTimes(23.8103, 90.4125, now);
    await expect(
      JSON.stringify(plain(buildTimeline(times, t, now, null)), null, 1) + '\n'
    ).toMatchFileSnapshot('./prayerTimeline.baselines/no-place-before-fajr.json');
  });
});
