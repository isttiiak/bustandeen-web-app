import { describe, it, expect } from 'vitest';

// /api/salat/analytics runs the missed-prayer sweep up to `today`. The page
// once sent the civil date, so opening it between midnight and Fajr swept the
// still-open tracking day (Isha not yet marked) into "missed" + kaza units.
const src = Object.values(
  import.meta.glob<string>('./SalatAnalytics.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  })
)[0];

describe('SalatAnalytics "today"', () => {
  it('comes from the Fajr tracking day, never a civil date', () => {
    expect(src).toContain('getTrackingDay()');
    expect(src).not.toMatch(/getDate\(\)\)\.padStart/);
    expect(src).not.toMatch(/new Date\(\)\.getMonth\(\) \+ 1 \}/);
  });

  it('never sends a date after the tracking day', () => {
    expect(src).toContain('lastDay > today ? today : lastDay');
  });
});
