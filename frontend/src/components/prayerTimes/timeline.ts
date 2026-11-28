import {
  calcPrayerTimesForDay,
  getIstiwaStart,
  getPrayerEndTime,
  type PrayerTimesResult,
  type PrayerKey,
} from '../../utils/prayerTimes.js';
import { addDaysYmd, placeYmd } from '../../utils/placeClock.js';
import { type StoredLocation } from '../../utils/geocode.js';

// ─── Timeline types ───────────────────────────────────────────────────────────

interface PrayerTLEntry {
  kind: 'prayer';
  id: string;
  name: string;
  time: Date;
  endTime?: Date;
  finalEndTime?: Date; // Isha only: absolute window close (Fajr) when showing dual end times
  isTrackable: boolean;
}
interface EventTLEntry {
  kind: 'event';
  label: string;
  /** PrayerGlyph id */
  glyph: string;
  time: Date;
  note: string;
}
export interface ForbiddenTLEntry {
  kind: 'forbidden';
  label: string;
  note: string;
  hadith: string;
  hadithUrl: string;
  start: Date;
  end: Date;
}
export interface NaflTLEntry {
  kind: 'nafl';
  label: string;
  arabicName: string;
  note: string;
  hadith: string;
  hadithUrl: string;
  /** PrayerGlyph id */
  glyph: string;
  start: Date;
  end: Date;
}
export type TLEntry = PrayerTLEntry | EventTLEntry | ForbiddenTLEntry | NaflTLEntry;

function entryTime(e: TLEntry): number {
  return e.kind === 'prayer' || e.kind === 'event' ? e.time.getTime() : e.start.getTime();
}

export function buildTimeline(
  times: PrayerTimesResult,
  t: (k: string, fallback: string) => string,
  now: Date,
  location: StoredLocation | null
): TLEntry[] {
  const MIN = 60_000;

  // Before today's Fajr we are still in last night's Isha/Tahajjud window.
  // Compute yesterday's prayer times so the Isha entry and Tahajjud window
  // reflect the night that has just passed, not tonight's future schedule.
  const isBeforeFajr = now < times.fajr;
  let ishaTime: Date;
  let nightEnd: Date; // Fajr that closes this night
  if (isBeforeFajr && location) {
    const yesterday = addDaysYmd(placeYmd(location.latitude, location.longitude, now), -1);
    const yTimes = calcPrayerTimesForDay(location.latitude, location.longitude, yesterday);
    ishaTime = yTimes.isha;
    nightEnd = times.fajr;
  } else {
    ishaTime = times.isha;
    nightEnd = new Date(times.fajr.getTime() + 24 * 60 * MIN);
  }

  const nightDuration = nightEnd.getTime() - ishaTime.getTime();
  const tahajjudStart = new Date(ishaTime.getTime() + (nightDuration * 2) / 3);
  // Islamic midnight — "best" Isha end. Final window closes at Fajr.
  const ishaIslamicMidnight = new Date((ishaTime.getTime() + nightEnd.getTime()) / 2);

  const entries: TLEntry[] = [
    // ── Fajr ──────────────────────────────────────────────────────────────
    {
      kind: 'prayer',
      id: 'fajr',
      name: t('prayerTimes.fajr', 'Fajr'),
      isTrackable: true,
      time: times.fajr,
      endTime: getPrayerEndTime('fajr' as PrayerKey, times),
    },

    // ── Forbidden: Around Sunrise ─────────────────────────────────────────
    {
      kind: 'forbidden',
      label: t('prayerTimes.forbiddenSunrise', 'Forbidden: Around Sunrise'),
      note: t(
        'prayerTimes.forbiddenSunriseNote',
        'Prayer is not allowed from sunrise until ~20 min after the sun has fully cleared the horizon.'
      ),
      hadith: t(
        'prayerTimes.forbiddenSunriseHadith',
        '"There is no prayer after the morning prayer until the sun rises." · Sahih al-Bukhari 586; "At three times the Prophet ﷺ forbade us to pray: when the sun begins to rise ... when it is at its zenith ... and when it is about to set." · Sahih Muslim 831'
      ),
      hadithUrl: 'https://sunnah.com/bukhari:586',
      start: times.sunrise,
      end: new Date(times.sunrise.getTime() + 20 * MIN),
    },

    // ── Nafl: Ishraq / Duha ──────────────────────────────────────────────
    {
      kind: 'nafl',
      label: t('prayerTimes.ishraqDuha', 'Salat al-Ishraq / Duha'),
      arabicName: 'صلاة الإشراق / صلاة الضحى',
      note: t(
        'prayerTimes.ishraqDuhaNote',
        "2–8 voluntary rak'ahs. Best time is when the sun has risen well (Ishraq = 20 min after sunrise). Duha can continue until just before the solar zenith. Immense reward equivalent to Hajj and 'Umrah."
      ),
      hadith: t(
        'prayerTimes.ishraqDuhaHadith',
        '"Whoever prays Fajr in congregation, then sits remembering Allah until the sun rises, then prays two rak\'ahs — he will have a reward like that of Hajj and \'Umrah, complete, complete, complete." · Tirmidhi 586 (ḥasan, al-Albānī); Duha: "The Prophet ﷺ used to pray Duha four rak\'ahs and would add more as Allah willed." · Sahih Muslim 719'
      ),
      hadithUrl: 'https://sunnah.com/tirmidhi:586',
      glyph: 'ishraq',
      start: new Date(times.sunrise.getTime() + 20 * MIN),
      end: getIstiwaStart(times),
    },

    // ── Forbidden: Istiwa (Solar Zenith) ──────────────────────────────────
    {
      kind: 'forbidden',
      label: t('prayerTimes.forbiddenZenith', "Forbidden: Istiwa' (Solar Zenith)"),
      note: t(
        'prayerTimes.forbiddenZenithNote',
        'The sun is directly overhead (~10 min before Dhuhr). Prayer is forbidden until Dhuhr time begins.'
      ),
      hadith: t(
        'prayerTimes.forbiddenZenithHadith',
        '"At three times the Prophet ﷺ forbade us to pray ... when it is at its zenith." · Sahih Muslim 831'
      ),
      hadithUrl: 'https://sunnah.com/muslim:831',
      start: getIstiwaStart(times),
      end: times.dhuhr,
    },

    // ── Dhuhr ─────────────────────────────────────────────────────────────
    {
      kind: 'prayer',
      id: 'dhuhr',
      name: t('prayerTimes.dhuhr', 'Dhuhr'),
      isTrackable: true,
      time: times.dhuhr,
      endTime: getPrayerEndTime('dhuhr' as PrayerKey, times),
    },

    // ── Asr ───────────────────────────────────────────────────────────────
    {
      kind: 'prayer',
      id: 'asr',
      name: t('prayerTimes.asr', 'Asr'),
      isTrackable: true,
      time: times.asr,
      endTime: getPrayerEndTime('asr' as PrayerKey, times),
    },

    // ── Forbidden: ~17 min before sunset ─────────────────────────────────
    // The "forbidden time at sunset" is the ~17 minutes when the sun visibly
    // descends and turns yellow — NOT the full period from Asr to sunset.
    // Between Asr and this window, nafl prayer is permitted.
    {
      kind: 'forbidden',
      label: t('prayerTimes.forbiddenSunset', 'Forbidden: At Sunset'),
      note: t(
        'prayerTimes.forbiddenSunsetNote',
        'Prayer is forbidden during the ~17 minutes the sun visibly sets (turns yellow and descends to the horizon). This is the "time of sunset" mentioned in the hadith. Nafl is allowed between Asr and this window. Obligatory (qada) make-up prayers are permitted. Maghrib begins shortly after sunset.'
      ),
      hadith: t(
        'prayerTimes.forbiddenSunsetHadith',
        '"At three times the Prophet ﷺ forbade us to pray: ... when it is about to set." · Sahih Muslim 831; Sahih al-Bukhari 586'
      ),
      hadithUrl: 'https://sunnah.com/muslim:831',
      start: new Date(times.sunset.getTime() - 17 * MIN),
      end: times.sunset,
    },

    // ── Sunset ────────────────────────────────────────────────────────────
    {
      kind: 'event',
      label: t('prayerTimes.sunsetEvent', 'Sunset: Forbidden Window Ends'),
      glyph: 'maghrib',
      time: times.sunset,
      note: t(
        'prayerTimes.sunsetEventNote',
        'Sun sets. The sunset forbidden window ends. Maghrib begins shortly after.'
      ),
    },

    // ── Maghrib ───────────────────────────────────────────────────────────
    {
      kind: 'prayer',
      id: 'maghrib',
      name: t('prayerTimes.maghrib', 'Maghrib'),
      isTrackable: true,
      time: times.maghrib,
      endTime: getPrayerEndTime('maghrib' as PrayerKey, times),
    },

    // ── Nafl: Awwabin ─────────────────────────────────────────────────────
    {
      kind: 'nafl',
      label: t('prayerTimes.awwabin', 'Salat al-Awwabin'),
      arabicName: 'صلاة الأوابين',
      note: t(
        'prayerTimes.awwabinNote',
        "2–6 voluntary rak'ahs between Maghrib and Isha. Recommended for those who often return (awwab) to Allah with remembrance and repentance."
      ),
      hadith: t(
        'prayerTimes.awwabinHadith',
        '"Whoever prays six rak\'ahs after Maghrib without speaking anything bad between them, those six rak\'ahs will be counted for him as equivalent to twelve years of worship." · Sunan Ibn Majah 1167 (very weak: ḍaʿīf jiddan, al-Albānī); Abu Hurayrah (RA): "My close friend advised me to pray two rak\'ahs of Duha and not to sleep before praying Witr." · Sahih al-Bukhari 1981'
      ),
      hadithUrl: 'https://sunnah.com/ibnmajah:1167',
      glyph: 'awwabin',
      start: times.maghrib,
      end: times.isha,
    },

    // ── Isha ──────────────────────────────────────────────────────────────
    {
      kind: 'prayer',
      id: 'isha',
      name: t('prayerTimes.isha', 'Isha'),
      isTrackable: true,
      time: ishaTime,
      endTime: ishaIslamicMidnight, // best: Islamic midnight
      finalEndTime: isBeforeFajr ? nightEnd : undefined, // final window: Fajr (shown when pre-dawn)
    },

    // ── Nafl: Tahajjud (last third of night) ─────────────────────────────
    {
      kind: 'nafl',
      label: t('prayerTimes.tahajjud', 'Tahajjud'),
      arabicName: 'صلاة التهجد',
      note: t(
        'prayerTimes.tahajjudNote',
        "Night prayer in the last third of the night. The most virtuous voluntary prayer after the obligatory ones. 2–12 rak'ahs; finish with Witr."
      ),
      hadith: t(
        'prayerTimes.tahajjudHadith',
        '"Our Lord, Blessed and Exalted, descends to the lowest heaven every night in the last third of it, saying: Who is calling upon Me so that I may answer him?" · Sahih al-Bukhari 1145, Sahih Muslim 758. "The best prayer after the obligatory prayers is the night prayer (Tahajjud)." · Sahih Muslim 1163'
      ),
      hadithUrl: 'https://sunnah.com/bukhari:1145',
      glyph: 'tahajjud',
      start: tahajjudStart,
      end: nightEnd,
    },
  ];

  return entries.sort((a, b) => entryTime(a) - entryTime(b));
}
