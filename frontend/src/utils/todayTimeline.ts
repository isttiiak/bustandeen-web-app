// Home "Today" timeline (audit T3.4 / UX-03): the five prayers as the day's
// spine, with the morning and evening adhkār in their windows.
//
// Adhkār windows (Istiak, 2026-10-09): morning = Fajr until sunrise, evening =
// ʿAṣr until Maghrib, after "glorify the praise of your Lord before the rising
// of the sun and before its setting" (Quran 50:39, checked on quran.com).

import type { PrayerTimesResult } from './prayerTimes.js';
import type { DayStartMode } from './trackingDay.js';

export const TIMELINE_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type TimelinePrayer = (typeof TIMELINE_PRAYERS)[number];
export type TimelineStatus = 'completed' | 'kaza' | 'missed' | 'pending';
export type AdhkarPeriod = 'morning' | 'evening';

export const ADHKAR_REF = 'Quran 50:39';

export interface TimelineRow {
  id: TimelinePrayer;
  time: Date;
  status: TimelineStatus;
  current: boolean;
  /** The adhkār attached to this prayer's row, with whether its window is open now. */
  adhkar?: { period: AdhkarPeriod; open: boolean; until: Date };
}

/** The prayer whose time is running now: the last one started, or last
 * night's ʿIshāʾ before Fajr. */
export function currentPrayer(times: PrayerTimesResult, now: Date): TimelinePrayer {
  let cur: TimelinePrayer = 'isha';
  for (const id of TIMELINE_PRAYERS) if (now >= times[id]) cur = id;
  return cur;
}

/** Which adhkār window is open, if any. */
export function adhkarWindow(times: PrayerTimesResult, now: Date): AdhkarPeriod | null {
  if (now >= times.fajr && now < times.sunrise) return 'morning';
  if (now >= times.asr && now < times.maghrib) return 'evening';
  return null;
}

const normalise = (s: string | undefined): TimelineStatus =>
  s === 'completed' || s === 'kaza' || s === 'missed' ? s : 'pending';

export function buildTimeline(
  times: PrayerTimesResult,
  now: Date,
  statuses: Partial<Record<TimelinePrayer, string | undefined>>
): TimelineRow[] {
  const cur = currentPrayer(times, now);
  const open = adhkarWindow(times, now);
  return TIMELINE_PRAYERS.map((id) => {
    const row: TimelineRow = {
      id,
      time: times[id],
      status: normalise(statuses[id]),
      current: id === cur,
    };
    if (id === 'fajr')
      row.adhkar = { period: 'morning', open: open === 'morning', until: times.sunrise };
    if (id === 'asr')
      row.adhkar = { period: 'evening', open: open === 'evening', until: times.maghrib };
    return row;
  });
}

/**
 * Whether Home may offer "Mark Done" for the current prayer. Kept narrow on
 * purpose (Istiak: current prayer only); anything unusual goes to the Salat
 * page, which owns qaṣr, jamʿ, kaza and Miss:
 *  - not already Done/Kaza, and not in Rayhanah days or Musafir mode;
 *  - the prayer must belong to the tracking day being written: in `fajr` mode
 *    always; in `midnight` mode only from Fajr on (before Fajr the current
 *    ʿIshāʾ belongs to yesterday's log); in `maghrib` mode never (Maghrib and
 *    ʿIshāʾ there belong to the next tracking day).
 */
export function canMarkFromHome(opts: {
  status: TimelineStatus;
  times: PrayerTimesResult;
  now: Date;
  dayStartMode: DayStartMode;
  excused: boolean;
  travelling: boolean;
}): boolean {
  const { status, times, now, dayStartMode, excused, travelling } = opts;
  if (status === 'completed' || status === 'kaza') return false;
  if (excused || travelling) return false;
  if (dayStartMode === 'fajr') return true;
  if (dayStartMode === 'midnight') return now >= times.fajr;
  return false;
}
