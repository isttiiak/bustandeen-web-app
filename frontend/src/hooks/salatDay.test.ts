import { describe, expect, it } from 'vitest';
import hook from './useSalatLog.ts?raw';
import trackerPage from '../pages/SalatTracker.tsx?raw';
// The tracker's state and handlers moved into these hooks (audit P4-1, PR 16).
import trackerState from '../components/salat/useSalatTrackerState.ts?raw';
import trackerNaflDebt from '../components/salat/useSalatNaflDebt.ts?raw';
import trackerCredit from '../components/salat/useSalatDhikrCredit.tsx?raw';
import trackerHandlers from '../components/salat/useSalatPrayerHandlers.tsx?raw';
import timeline from '../components/home/TodayTimeline.tsx?raw';
import ramadanCard from '../components/RamadanSalatCard.tsx?raw';

// Audit 2026-11-16 P1-16 (a): salat is dated by the tracking day (Fajr, midnight
// or Maghrib, the person's choice), never the civil date, so Isha at 1 AM
// belongs to the day before. The rules themselves are tested in
// utils/trackingDay.test.ts; this keeps a civil-date fallback from creeping back
// into the salat hook or the screens that write prayers.

const tracker = [trackerPage, trackerState, trackerNaflDebt, trackerCredit, trackerHandlers].join(
  '\n'
);
const surfaces = { hook, tracker, timeline, ramadanCard };

describe('salat is dated by the tracking day', () => {
  it.each(Object.entries(surfaces))('%s uses no civil "today"', (_name, src) => {
    expect(src).not.toMatch(/placeToday|localTodayStr/);
  });

  it('every prayer and nafl write must name its day', () => {
    expect(hook).toMatch(/interface UpdatePrayerVars \{[^}]*\n {2}date: string;/);
    expect(hook).toMatch(/interface UpdateNaflVars \{[^}]*\n {2}date: string;/);
  });

  it('the log is read for a day the caller names', () => {
    expect(hook).toMatch(/export function useSalatLog\(date: string\)/);
  });

  it('the tracker and the Home timeline take "today" from getTrackingDay', () => {
    expect(timeline).toContain('getTrackingDay(');
    expect(tracker).toMatch(/return todayStr\(\)|useState\(\(\) =>[\s\S]{0,200}todayStr\(\)/);
  });
});
