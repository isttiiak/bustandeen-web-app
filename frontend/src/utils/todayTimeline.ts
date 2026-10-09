// Home "Today" timeline (audit T3.4 / UX-03): the five prayers as the day's
// spine, with the morning and evening adhkār in their windows.
//
// Adhkār windows (Istiak, 2026-10-09, revised the same day): the card shows
// only while its window is open.
//  - Morning = Fajr until sunrise, on the Fajr card: "glorify the praise of
//    your Lord before the rising of the sun" (Quran 50:39, checked on quran.com).
//  - Evening = Maghrib until ʿIshāʾ, on the Maghrib card: "when evening came"
//    the Prophet said "amsaynā…" and asked for the good of "this night"
//    (Ṣaḥīḥ Muslim 2723a, sunnah.com 48/100, Ibn Masʿūd); the night begins at
//    Maghrib. Scholars give later ends too; Istiak chose ʿIshāʾ.

import type { PrayerTimesResult } from './prayerTimes.js';
import type { DayStartMode } from './trackingDay.js';

export const TIMELINE_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type TimelinePrayer = (typeof TIMELINE_PRAYERS)[number];
export type TimelineStatus = 'completed' | 'kaza' | 'missed' | 'pending';
export type AdhkarPeriod = 'morning' | 'evening';

export const ADHKAR_REFS: Record<AdhkarPeriod, string> = {
  morning: 'Quran 50:39',
  evening: 'Ṣaḥīḥ Muslim 2723',
};

export interface TimelineRow {
  id: TimelinePrayer;
  time: Date;
  status: TimelineStatus;
  current: boolean;
  /** The adhkār card on this prayer's row, present only while its window is open. */
  adhkar?: { period: AdhkarPeriod; until: Date };
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
  if (now >= times.maghrib && now < times.isha) return 'evening';
  return null;
}

/** The open adhkār window with the prayer card it belongs to and its end. */
export function openAdhkar(
  times: PrayerTimesResult,
  now: Date
): { prayer: TimelinePrayer; period: AdhkarPeriod; until: Date } | null {
  const period = adhkarWindow(times, now);
  if (period === 'morning') return { prayer: 'fajr', period, until: times.sunrise };
  if (period === 'evening') return { prayer: 'maghrib', period, until: times.isha };
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
  const open = openAdhkar(times, now);
  return TIMELINE_PRAYERS.map((id) => {
    const row: TimelineRow = {
      id,
      time: times[id],
      status: normalise(statuses[id]),
      current: id === cur,
    };
    if (open?.prayer === id) row.adhkar = { period: open.period, until: open.until };
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

/**
 * When a prayer's own time is over (after this it can only be prayed as
 * qaḍāʾ). Fajr ends at sunrise, Ẓuhr when ʿAṣr begins (the saved madhab's
 * ʿAṣr), ʿAṣr at sunset (praying it in the disliked last minutes is still on
 * time, so the app's 17-minute makrūh margin does not count here), Maghrib
 * when ʿIshāʾ begins. ʿIshāʾ is not listed: it is the last prayer of the
 * Fajr-to-Fajr day and is settled by the day boundary instead.
 */
const KAZA_AFTER: Record<Exclude<TimelinePrayer, 'isha'>, keyof PrayerTimesResult> = {
  fajr: 'sunrise',
  dhuhr: 'asr',
  asr: 'sunset',
  maghrib: 'isha',
};

/**
 * Whether Home offers the one-tap "Kaza" for a prayer: its time is over on
 * the tracking day being shown and it is still pending or Miss. Never for
 * ʿIshāʾ (an unmarked ʿIshāʾ becomes Miss at the day boundary and goes into
 * kaza debt, as before). Same tracking-day rules as canMarkFromHome: not in
 * Rayhanah days or Musafir mode (qaṣr and jamʿ stay on the Salat page), not
 * in `maghrib` mode, and in `midnight` mode only from Fajr on.
 *
 * `times` are today's civil times. In `fajr` mode before today's Fajr, the
 * tracking day is yesterday, whose Fajr to Maghrib are all over.
 */
export function canKazaFromHome(opts: {
  prayer: TimelinePrayer;
  status: TimelineStatus;
  times: PrayerTimesResult;
  now: Date;
  dayStartMode: DayStartMode;
  excused: boolean;
  travelling: boolean;
}): boolean {
  const { prayer, status, times, now } = opts;
  if (prayer === 'isha') return false;
  if (status !== 'pending' && status !== 'missed') return false;
  if (!canMarkFromHome(opts)) return false;
  if (opts.dayStartMode === 'fajr' && now < times.fajr) return true;
  return now >= times[KAZA_AFTER[prayer]];
}
