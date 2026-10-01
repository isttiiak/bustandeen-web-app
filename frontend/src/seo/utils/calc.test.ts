import { describe, expect, it } from 'vitest';
import { computePrayerTimes, formatTimeInZone } from './calc.js';

// Audit T1.9 / SEO-04: each city page uses its country's usual method and
// shows ʿAṣr for both schools. A fixed date keeps the snapshot stable; a
// change in any of these times is a change in what thousands of static pages
// tell people, so it must be deliberate (update the snapshot on purpose).

const DATE = new Date('2026-03-15T12:00:00Z');

const CITIES = [
  { name: 'Dhaka', cc: 'BD', lat: 23.8103, lng: 90.4125, tz: 'Asia/Dhaka' },
  { name: 'Karachi', cc: 'PK', lat: 24.8607, lng: 67.0011, tz: 'Asia/Karachi' },
  { name: 'London', cc: 'GB', lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
  { name: 'Riyadh', cc: 'SA', lat: 24.7136, lng: 46.6753, tz: 'Asia/Riyadh' },
  { name: 'New York', cc: 'US', lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
];

describe('computePrayerTimes (static city pages)', () => {
  it.each(CITIES)('$name: country method, both ʿAṣr times', ({ cc, lat, lng, tz }) => {
    const t = computePrayerTimes(lat, lng, DATE, cc);
    const fmt = (d: Date) => formatTimeInZone(d, tz, 'en-GB');
    expect({
      method: t.method,
      asrSchool: t.asrSchool,
      fajr: fmt(t.fajr),
      sunrise: fmt(t.sunrise),
      dhuhr: fmt(t.dhuhr),
      asrStandard: fmt(t.asrStandard),
      asrHanafi: fmt(t.asrHanafi),
      maghrib: fmt(t.maghrib),
      isha: fmt(t.isha),
    }).toMatchSnapshot();
  });

  it('uses the expected convention per country', () => {
    const conv = (cc: string) => {
      const t = computePrayerTimes(23.8, 90.4, DATE, cc);
      return `${t.method}/${t.asrSchool}`;
    };
    expect(conv('BD')).toBe('Karachi/hanafi');
    expect(conv('PK')).toBe('Karachi/hanafi');
    expect(conv('SA')).toBe('UmmAlQura/standard');
    expect(conv('US')).toBe('NorthAmerica/standard');
    expect(conv('GB')).toBe('MoonsightingCommittee/standard');
    // Unknown or missing country: the old worldwide default.
    expect(conv('ZZ')).toBe('MoonsightingCommittee/standard');
    expect(`${computePrayerTimes(23.8, 90.4, DATE).method}`).toBe('MoonsightingCommittee');
  });

  it('the Ḥanafī ʿAṣr is always later, and `asr` follows the country school', () => {
    for (const { cc, lat, lng } of CITIES) {
      const t = computePrayerTimes(lat, lng, DATE, cc);
      expect(t.asrHanafi.getTime()).toBeGreaterThan(t.asrStandard.getTime());
      expect(t.asr.getTime()).toBe(
        (t.asrSchool === 'hanafi' ? t.asrHanafi : t.asrStandard).getTime()
      );
      // Only ʿAṣr depends on the school; the rest of the day is shared.
      expect(t.dhuhr.getTime()).toBeLessThan(t.asrStandard.getTime());
      expect(t.asrHanafi.getTime()).toBeLessThan(t.maghrib.getTime());
    }
  });
});
