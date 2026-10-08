import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import PrayerTimeSettings from '../components/PrayerTimeSettings.js';
import PrayerDefaultsSuggestion from '../components/PrayerDefaultsSuggestion.js';
import LocationPicker from '../components/LocationPicker.js';
import {
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  MapPinIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { BTN_SECONDARY, CARD } from '../components/bustanStyles.js';
import { CompassIcon, MosqueIcon, PrayerGlyph } from '../components/icons/IslamicIcons.js';
import {
  calcPrayerTimes,
  formatTime,
  getCurrentAndNextPrayer,
  getPrayerEndTime,
  PRAYER_META,
  PrayerTimesResult,
  PrayerKey,
} from '../utils/prayerTimes.js';
import { getHijriToday, formatHijriDate } from '../utils/islamicCalendar.js';
import { formatLocaleDate } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';
import {
  reverseGeocodeCity,
  looksLikeRawCoordinates,
  type StoredLocation,
} from '../utils/geocode.js';

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
interface ForbiddenTLEntry {
  kind: 'forbidden';
  label: string;
  note: string;
  hadith: string;
  hadithUrl: string;
  start: Date;
  end: Date;
}
interface NaflTLEntry {
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
type TLEntry = PrayerTLEntry | EventTLEntry | ForbiddenTLEntry | NaflTLEntry;

function entryTime(e: TLEntry): number {
  return e.kind === 'prayer' || e.kind === 'event' ? e.time.getTime() : e.start.getTime();
}

function buildTimeline(
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
    const yesterday = new Date(now.getTime() - 86_400_000);
    const yTimes = calcPrayerTimes(location.latitude, location.longitude, yesterday);
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
        '"There is no prayer after the morning prayer until the sun rises." · Sahih al-Bukhari 581; "At three times the Prophet ﷺ forbade us to pray: when the sun begins to rise ... when it is at its zenith ... and when it is about to set." · Sahih Muslim 831'
      ),
      hadithUrl: 'https://sunnah.com/bukhari:581',
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
        '"Whoever prays Fajr in congregation, then sits remembering Allah until the sun rises, then prays two rak\'ahs — he will have a reward like that of Hajj and \'Umrah, complete, complete, complete." · Tirmidhi 586; Duha: "The Prophet ﷺ used to pray Duha four rak\'ahs and would add more as Allah willed." · Sahih Muslim 717'
      ),
      hadithUrl: 'https://sunnah.com/tirmidhi:586',
      glyph: 'ishraq',
      start: new Date(times.sunrise.getTime() + 20 * MIN),
      end: new Date(times.dhuhr.getTime() - 10 * MIN),
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
        '"At three times the Prophet ﷺ forbade us to pray ... when it is at its zenith." · Sahih Muslim 831; Ibn \'Umar: "Do not pray when the sun is rising, nor when it is setting, nor when it is at its peak (zenith)." · Sahih al-Bukhari 585'
      ),
      hadithUrl: 'https://sunnah.com/muslim:831',
      start: new Date(times.dhuhr.getTime() - 10 * MIN),
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
        '"Whoever prays six rak\'ahs after Maghrib without speaking anything bad between them, those six rak\'ahs will be counted for him as equivalent to twelve years of worship." · Sunan Ibn Majah 1167; Abu Hurayrah (RA): "My close friend advised me to pray two rak\'ahs of Duha and not to sleep before praying Witr." · Sahih al-Bukhari 1981'
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

// ─── Live clock card ─────────────────────────────────────────────────────────
// Owns its own 1-second tick so the rest of the page (timeline, ~20 animated
// cards) doesn't re-render every second.

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return `${hh > 0 ? `${hh}h ` : ''}${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`;
}

function LiveClockCard({
  times,
  timeline,
  hasLocation,
  header,
}: {
  times: PrayerTimesResult | null;
  timeline: TLEntry[];
  hasLocation: boolean;
  /** Title and dates, drawn at the top of the arch. */
  header: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const info = times ? getCurrentAndNextPrayer(times, now) : null;
  const currentMeta = PRAYER_META.find((p) => p.id === info?.current);
  const nextMeta = PRAYER_META.find((p) => p.id === info?.next);
  // During the sun-setting forbidden window Asr is technically over but
  // Maghrib hasn't begun — show it as "After: Asr", not "Current: Asr".
  const isCurrentTrackable = !!currentMeta?.isTrackable && !info?.inForbiddenGap;

  // The current prayer's own end time. Before Fajr we are in last night's Isha
  // whose end is today's Fajr — not tonight's Islamic midnight.
  const currentEnd =
    times && info && isCurrentTrackable
      ? info.current === 'isha' && now < times.fajr
        ? times.fajr
        : getPrayerEndTime(info.current, times)
      : null;
  const endMs = currentEnd ? currentEnd.getTime() - now.getTime() : null;

  const activeForbidden =
    timeline.find(
      (e): e is ForbiddenTLEntry => e.kind === 'forbidden' && now >= e.start && now < e.end
    ) ?? null;
  const activeNafl =
    timeline.find((e): e is NaflTLEntry => e.kind === 'nafl' && now >= e.start && now < e.end) ??
    null;

  return (
    <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 sm:px-7 pt-10 pb-6 text-center">
      {header}
      <div className="font-display text-5xl sm:text-6xl font-bold text-white tabular-nums tracking-tight mt-4">
        {now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })}
      </div>

      {info && currentMeta && nextMeta && (
        <div className="mt-5 rounded-control border border-brand-border bg-brand-surface/60 p-3 space-y-3">
          {/* Row 1: current prayer and its countdown on one line */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <PrayerGlyph id={currentMeta.id} className="w-6 h-6 text-brand-gold" aria-hidden />
              <div className="text-left">
                <p className="text-white/65 text-xs uppercase tracking-widest leading-none mb-1">
                  {isCurrentTrackable
                    ? t('prayerTimes.current', 'Current')
                    : t('prayerTimes.after', 'After')}
                </p>
                <p className="text-white font-bold text-base leading-none">
                  {t(`prayerTimes.${currentMeta.id}`, currentMeta.name)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/65 text-xs uppercase tracking-widest leading-none mb-1">
                {endMs !== null && endMs > 0
                  ? t('prayerTimes.endsIn', 'Ends in')
                  : t('prayerTimes.nextIn', 'Next in')}
              </p>
              <p className="text-brand-gold font-bold text-lg tabular-nums leading-none">
                {formatCountdown(
                  endMs !== null && endMs > 0 ? endMs : info.nextTime.getTime() - now.getTime()
                )}
              </p>
            </div>
          </div>

          <div className="w-full h-px bg-brand-border" />

          {/* Row 2: next prayer */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <PrayerGlyph id={nextMeta.id} className="w-6 h-6 text-brand-emerald" aria-hidden />
              <div className="text-left">
                <p className="text-white/65 text-xs uppercase tracking-widest leading-none mb-1">
                  {t('prayerTimes.next', 'Next')}
                </p>
                <p className="text-brand-emerald font-bold text-base leading-none">
                  {t(`prayerTimes.${nextMeta.id}`, nextMeta.name)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs leading-none mb-1">
                {t('prayerTimes.startsAt', 'starts at')}
              </p>
              <p className="text-white/85 font-semibold text-sm tabular-nums">
                {formatTime(info.nextTime)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Forbidden or nafl indicator */}
      {activeForbidden && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-control bg-red-400/10 border border-red-400/40 text-left">
          <NoSymbolIcon className="w-5 h-5 shrink-0 text-red-400" aria-hidden />
          <div>
            <p className="text-red-400 font-bold text-xs">{activeForbidden.label}</p>
            <p className="text-white/70 text-xs">
              {t('prayerTimes.endsAt', 'Ends at')} {formatTime(activeForbidden.end)}
            </p>
          </div>
        </div>
      )}
      {activeNafl && !activeForbidden && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-control bg-brand-emerald/10 border border-brand-emerald/40 text-left">
          <PrayerGlyph
            id={activeNafl.glyph}
            className="w-5 h-5 shrink-0 text-brand-emerald"
            aria-hidden
          />
          <div>
            <p className="text-brand-emerald font-bold text-xs">
              {activeNafl.label} {t('prayerTimes.time', 'time')}
            </p>
            <p className="text-white/70 text-xs">
              {t('prayerTimes.until', 'Until')} {formatTime(activeNafl.end)}
            </p>
          </div>
        </div>
      )}

      {!hasLocation && (
        <p className="text-white/70 text-sm mt-4">
          {t('prayerTimes.setLocationHint', 'Set your location above to calculate prayer times')}
        </p>
      )}
    </section>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const SOURCE_REFS: {
  key: string;
  labelKey: string;
  labelFallback: string;
  refs: { cite: string; url: string }[];
}[] = [
  {
    key: 'forbidden',
    labelKey: 'prayerTimes.sourcesForbiddenLabel',
    labelFallback: 'Forbidden times',
    refs: [
      { cite: 'Ṣaḥīḥ al-Bukhārī 581, 585, 586', url: 'https://sunnah.com/bukhari:581' },
      { cite: 'Ṣaḥīḥ Muslim 831', url: 'https://sunnah.com/muslim:831' },
    ],
  },
  {
    key: 'ishraq',
    labelKey: 'prayerTimes.sourcesIshraqLabel',
    labelFallback: 'Ishraq/Duha',
    refs: [
      { cite: 'Tirmidhī 586', url: 'https://sunnah.com/tirmidhi:586' },
      { cite: 'Ṣaḥīḥ Muslim 717', url: 'https://sunnah.com/muslim:717' },
    ],
  },
  {
    key: 'awwabin',
    labelKey: 'prayerTimes.sourcesAwwabinLabel',
    labelFallback: 'Awwabin',
    refs: [{ cite: 'Ibn Mājah 1167', url: 'https://sunnah.com/ibnmajah:1167' }],
  },
  {
    key: 'tahajjud',
    labelKey: 'prayerTimes.sourcesTahajjudLabel',
    labelFallback: 'Tahajjud',
    refs: [
      { cite: 'Ṣaḥīḥ al-Bukhārī 1145', url: 'https://sunnah.com/bukhari:1145' },
      { cite: 'Ṣaḥīḥ Muslim 758, 1163', url: 'https://sunnah.com/muslim:758' },
    ],
  },
];

export default function PrayerTimes() {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(new Date());
  const [location, setLocation] = useState<StoredLocation | null>(() => {
    const s = localStorage.getItem('bustandeen_location');
    return s ? (JSON.parse(s) as StoredLocation) : null;
  });
  const [times, setTimes] = useState<PrayerTimesResult | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  // Bumped when the calc method / ʿAṣr school may have changed (settings
  // drawer closed, suggestion accepted) so the timetable recomputes at once.
  const [settingsRev, setSettingsRev] = useState(0);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  // 60-second tick for timeline active/past states — the live clock has its
  // own 1-second tick inside LiveClockCard so the whole page isn't re-rendered
  // (20+ animated cards) every second.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!location) return;
    setTimes(calcPrayerTimes(location.latitude, location.longitude, now));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [location, now.toDateString(), settingsRev]);

  const saveLocation = useCallback((loc: StoredLocation) => {
    setLocation(loc);
    localStorage.setItem('bustandeen_location', JSON.stringify(loc));
  }, []);

  // Self-heal: a location saved while reverse geocoding failed (network
  // blip, rate limit) is stuck showing raw coordinates forever, since
  // nothing else re-triggers the lookup. Quietly retry once per visit.
  useEffect(() => {
    if (!location || !looksLikeRawCoordinates(location.name)) return;
    let cancelled = false;
    void reverseGeocodeCity(location.latitude, location.longitude).then((city) => {
      if (city && !cancelled) saveLocation({ ...location, name: city });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the coordinates themselves change, not on every saveLocation identity
  }, [location?.latitude, location?.longitude]);

  const info = times ? getCurrentAndNextPrayer(times, now) : null;

  const timeline = useMemo(
    () => (times ? buildTimeline(times, t, now, location) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- now.toDateString() is the correct granularity; finer ticks would unnecessarily rebuild the ~20-entry list
    [times, t, now.toDateString(), now < (times?.fajr ?? new Date(0)), location]
  );

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('prayerTimes.seoTitle', 'Prayer Times: Accurate Salat Times for Your Location')}
        description={t(
          'prayerTimes.seoDescription',
          'On-device prayer time calculator for Fajr, Dhuhr, Asr, Maghrib and Isha, with multiple calculation methods, Hanafi/standard Asr settings and a live countdown.'
        )}
        path="/prayer-times"
      />
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-16 space-y-4">
        {/* Toolbar: Qibla, the saved place, settings */}
        <div className="flex items-center justify-between gap-3">
          <Link to="/qibla" className={`${BTN_SECONDARY} !px-3 !py-1.5 !text-xs shrink-0`}>
            <CompassIcon className="w-4 h-4 text-brand-gold" aria-hidden />
            {t('qibla.title', 'Qibla Compass')}
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            {location && (
              <div className="flex items-center gap-1.5 text-white/75 text-xs min-w-0">
                <MapPinIcon className="w-3.5 h-3.5 text-brand-emerald shrink-0" aria-hidden />
                <span className="truncate max-w-[100px] sm:max-w-[160px]">{location.name}</span>
              </div>
            )}
            <button
              onClick={() => setShowSettings(true)}
              aria-label={t('prayerTimeSettings.title', 'Prayer time settings')}
              title={t('prayerTimeSettings.title', 'Prayer time settings')}
              className={`${BTN_SECONDARY} !p-2 shrink-0`}
            >
              <Cog6ToothIcon className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </div>

        <PrayerTimeSettings
          open={showSettings}
          onClose={() => {
            setShowSettings(false);
            setSettingsRev((r) => r + 1);
          }}
          location={location}
          onLocationChange={saveLocation}
        />

        {location && <PrayerDefaultsSuggestion onChange={() => setSettingsRev((r) => r + 1)} />}

        {/* First-run prompt: no location saved yet. Once set, changing it
            lives in Prayer time settings (the cog above), not inline here. */}
        {!location && (
          <div className={`${CARD} p-4 space-y-3`}>
            <p className="text-white/85 text-sm font-semibold">
              {t('prayerTimes.setLocationPrompt', 'Set your location to see prayer times')}
            </p>
            <LocationPicker onLocationChange={saveLocation} />
          </div>
        )}

        {/* Arch hero: title, dates and the live clock (self-ticking, isolated
            from the timeline below) */}
        <LiveClockCard
          times={times}
          timeline={timeline}
          hasLocation={!!location}
          header={
            <>
              <div className="w-14 h-14 mx-auto rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/30">
                <MosqueIcon className="w-7 h-7 text-brand-gold" aria-hidden />
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mt-3">
                {t('prayerTimes.title', 'Prayer Times')}
              </h1>
              <p className="text-white/75 text-sm mt-1">
                {formatLocaleDate(now, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {(() => {
                const h = getHijriToday();
                return h ? (
                  <p className="text-brand-gold text-xs mt-0.5">{formatHijriDate(h)}</p>
                ) : null;
              })()}
            </>
          }
        />

        {/* Interleaved timeline */}
        {location && times ? (
          <>
            <div className="space-y-2">
              {timeline.map((entry, i) => {
                const key = `${entry.kind}-${i}`;
                const isExpanded = expandedEntry === key;
                const isPast =
                  now.getTime() >
                  (entry.kind === 'prayer' || entry.kind === 'event'
                    ? entry.time.getTime()
                    : entry.end.getTime());
                const isActiveNow =
                  entry.kind === 'forbidden' || entry.kind === 'nafl'
                    ? now >= entry.start && now < entry.end
                    : entry.kind === 'prayer' &&
                      info?.current === entry.id &&
                      !info?.inForbiddenGap;

                // Prayer entry
                if (entry.kind === 'prayer') {
                  const isNext = info?.next === entry.id;
                  return (
                    <div
                      key={key}
                      className={`rounded-card border p-4 flex items-center justify-between gap-3 transition-colors ${
                        isActiveNow
                          ? 'bg-brand-emerald/10 border-brand-emerald shadow-elev-2'
                          : isNext
                            ? 'bg-brand-deep border-brand-emerald/40 shadow-elev-2'
                            : isPast
                              ? 'bg-brand-deep/60 border-brand-border shadow-elev-1 opacity-70'
                              : 'bg-brand-deep border-brand-border shadow-elev-2'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-10 h-10 shrink-0 rounded-full grid place-items-center border ${
                            isActiveNow || isNext
                              ? 'bg-brand-emerald/10 border-brand-emerald/40 text-brand-emerald'
                              : 'bg-brand-gold/10 border-brand-gold/25 text-brand-gold'
                          }`}
                        >
                          <PrayerGlyph id={entry.id} className="w-5 h-5" aria-hidden />
                        </span>
                        <div>
                          <p
                            className={`font-bold text-base ${
                              isActiveNow || isNext ? 'text-brand-emerald' : 'text-white'
                            }`}
                          >
                            {entry.name}
                          </p>
                          {isActiveNow && (
                            <span className="inline-flex items-center gap-1 text-xs text-brand-emerald font-semibold uppercase tracking-wide">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                              {t('prayerTimes.currentBadge', 'Current')}
                            </span>
                          )}
                          {isNext && (
                            <span className="text-xs text-white/65 font-semibold uppercase tracking-wide">
                              {t('prayerTimes.next', 'Next')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white/60 text-xs leading-none mb-0.5">
                          {t('prayerTimes.startsAt', 'starts at')}
                        </p>
                        <p
                          className={`font-display text-xl font-bold tabular-nums ${
                            isActiveNow || isNext ? 'text-brand-emerald' : 'text-white/90'
                          }`}
                        >
                          {formatTime(entry.time)}
                        </p>
                        {entry.endTime && entry.isTrackable && (
                          <div className="mt-0.5 space-y-0.5">
                            <p className="text-white/60 text-xs leading-none">
                              → {formatTime(entry.endTime)}
                              {entry.finalEndTime && (
                                <span className="text-white/60 text-[10px]">
                                  {' '}
                                  ({t('prayerTimes.best', 'best')})
                                </span>
                              )}
                            </p>
                            {entry.finalEndTime && (
                              <p className="text-white/60 text-[10px] leading-none">
                                {t('prayerTimes.ishaWindowUntil', 'window → ')}
                                {formatTime(entry.finalEndTime)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Event entry (sunset)
                if (entry.kind === 'event') {
                  return (
                    <div
                      key={key}
                      className={`rounded-control border border-brand-border bg-shade/20 px-4 py-2.5 flex items-center justify-between gap-3 ${
                        isPast ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <PrayerGlyph
                          id={entry.glyph}
                          className="w-5 h-5 shrink-0 text-brand-gold"
                          aria-hidden
                        />
                        <div>
                          <p className="text-white/85 font-semibold text-sm">{entry.label}</p>
                          <p className="text-white/65 text-xs">{entry.note}</p>
                        </div>
                      </div>
                      <p className="text-white/80 text-base font-bold tabular-nums shrink-0">
                        {formatTime(entry.time)}
                      </p>
                    </div>
                  );
                }

                // Forbidden and nafl windows: a tappable row with the evidence
                const forbidden = entry.kind === 'forbidden';
                return (
                  <div
                    key={key}
                    className={`rounded-card border overflow-hidden shadow-elev-1 transition-colors ${
                      forbidden
                        ? isActiveNow
                          ? 'border-red-400 bg-red-400/10'
                          : 'border-red-400/40 bg-brand-deep'
                        : isActiveNow
                          ? 'border-brand-emerald bg-brand-emerald/10'
                          : 'border-brand-border bg-brand-deep'
                    } ${isPast ? 'opacity-70' : ''}`}
                  >
                    <button
                      className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
                      onClick={() => setExpandedEntry(isExpanded ? null : key)}
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {entry.kind === 'forbidden' ? (
                          <NoSymbolIcon className="w-5 h-5 shrink-0 text-red-400" aria-hidden />
                        ) : (
                          <PrayerGlyph
                            id={entry.glyph}
                            className="w-5 h-5 shrink-0 text-brand-emerald"
                            aria-hidden
                          />
                        )}
                        <div className="min-w-0">
                          <p
                            className={`font-bold text-sm ${forbidden ? 'text-red-400' : 'text-brand-emerald'}`}
                          >
                            {entry.label}
                            {isActiveNow && (
                              <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${forbidden ? 'bg-red-400' : 'bg-brand-emerald'}`}
                                />
                                {t('prayerTimes.nowBadge', 'now')}
                              </span>
                            )}
                          </p>
                          <p className="text-white/65 text-xs truncate">
                            {entry.kind === 'forbidden' ? entry.note : entry.arabicName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <p className="text-white/80 text-xs tabular-nums">
                            {formatTime(entry.start)}
                          </p>
                          <p className="text-white/60 text-xs">→ {formatTime(entry.end)}</p>
                        </div>
                        <ChevronDownIcon
                          className={`w-4 h-4 text-white/60 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          aria-hidden
                        />
                      </div>
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="border-t border-brand-border px-4 py-3 space-y-2"
                        >
                          <p className="text-white/85 text-sm leading-relaxed">{entry.note}</p>
                          <p className="text-white/70 text-xs italic leading-relaxed">
                            {entry.hadith}
                          </p>
                          <a
                            href={entry.hadithUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-gold underline underline-offset-2"
                          >
                            <BookOpenIcon className="w-3.5 h-3.5" aria-hidden />
                            {t('prayerTimes.viewOnSunnah', 'View on sunnah.com')}
                            <ArrowTopRightOnSquareIcon className="w-3 h-3" aria-hidden />
                          </a>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Sources, collapsed by default */}
            <div className={`${CARD} overflow-hidden`}>
              <button
                onClick={() => setSourcesExpanded((v) => !v)}
                aria-expanded={sourcesExpanded}
                className="w-full p-4 flex items-center justify-between gap-2 text-left"
              >
                <span className="text-white/75 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
                  <InformationCircleIcon className="w-4 h-4 text-brand-gold" aria-hidden />
                  {t('prayerTimes.sourcesTitle', 'Sources')}
                </span>
                <ChevronDownIcon
                  className={`w-4 h-4 text-white/60 shrink-0 transition-transform ${sourcesExpanded ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              <AnimatePresence>
                {sourcesExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-1.5 text-xs text-white/70 leading-relaxed">
                      <p>
                        <span className="text-white/90 font-semibold">
                          {t('prayerTimes.sourcesPrayerTimesLabel', 'Prayer times')}:
                        </span>{' '}
                        {t(
                          'prayerTimes.sourcesPrayerTimesDesc',
                          'Calculated on your device with the adhan library, using the calculation method and Asr setting you choose in Prayer time settings. No external API: all calculations use your coordinates only.'
                        )}
                      </p>
                      {SOURCE_REFS.map((entry) => (
                        <p key={entry.key}>
                          <span className="text-white/90 font-semibold">
                            {t(entry.labelKey, entry.labelFallback)}:
                          </span>{' '}
                          {entry.refs.map((ref, i) => (
                            <span key={ref.url}>
                              {i > 0 && ' · '}
                              {translateReference(ref.cite, i18n.language)} ·{' '}
                              <a
                                href={ref.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-gold underline underline-offset-2"
                              >
                                {ref.url.replace('https://', '')}
                              </a>
                            </span>
                          ))}
                        </p>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : null}
      </div>
    </AnimatedBackground>
  );
}
