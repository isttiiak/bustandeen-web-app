// The day a Rayhanah episode is marked finished (Istiak, 2026-11-29). A sister
// who marks it finished at 9 or 10 am was in her period when Fajr ended, so Fajr
// was not owed: it is excused, not missed, and the day reads five of five once
// she has prayed the rest. The rule is the simple one: a prayer is excused when
// its whole time had run out before the moment she marked the episode finished.
// (Schools differ on prayers whose time is still open at that moment, and on
// joining Ẓuhr with ʿAṣr or Maghrib with ʿIshāʾ; this does not model that. Only
// prayers that had fully ended are excused. The rest are owed as usual.)
import { calcPrayerTimesForDay, type PrayerTimesResult } from './prayerTimes.js';
import { addDaysYmd } from './placeClock.js';

export type FardId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

/** The fard prayers whose time had fully ended by `at`, given the day's times and the next Fajr. */
export function prayersEndedBefore(times: PrayerTimesResult, nextFajr: Date, at: Date): FardId[] {
  const ends: Record<FardId, Date> = {
    fajr: times.sunrise,
    dhuhr: times.asr,
    asr: times.sunset, // valid until sunset, even in the disliked last stretch
    maghrib: times.isha,
    isha: nextFajr,
  };
  return (Object.keys(ends) as FardId[]).filter((id) => ends[id].getTime() <= at.getTime());
}

/** One finished episode, as the cycle summary lists it. */
interface EndedLog {
  endDate: string | null;
  endedAt?: string | null;
}

/**
 * The prayers of `date` that were excused because the episode ended that day.
 * Empty when `date` is not an episode's end day, when the moment it was marked
 * finished was not kept (older episodes), or when there is no saved place to
 * work the prayer times out from.
 */
export function excusedOnEndDay(
  logs: EndedLog[] | undefined,
  date: string,
  place: { latitude: number; longitude: number } | null
): FardId[] {
  const log = logs?.find((l) => l.endDate === date && l.endedAt);
  if (!log?.endedAt || !place) return [];
  const at = new Date(log.endedAt);
  if (Number.isNaN(at.getTime())) return [];
  const times = calcPrayerTimesForDay(place.latitude, place.longitude, date);
  const nextFajr = calcPrayerTimesForDay(place.latitude, place.longitude, addDaysYmd(date, 1)).fajr;
  return prayersEndedBefore(times, nextFajr, at);
}
