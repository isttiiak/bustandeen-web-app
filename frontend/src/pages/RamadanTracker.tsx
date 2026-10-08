import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { m as motion } from 'framer-motion';
import {
  ArrowPathIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { BTN_PRIMARY, CARD, ITEM, REF_LINK, SECTION_TITLE } from '../components/bustanStyles.js';
import {
  CrescentIcon,
  FajrIcon,
  FlowerIcon,
  MaghribIcon,
  MosqueIcon,
  Star8Icon,
  TasbihIcon,
} from '../components/icons/IslamicIcons.js';
import ExcusedCard from '../components/ExcusedCard.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useFastingHistory, useUpsertFastingLog, useClearFastingLog } from '../hooks/useFasting.js';
import { useCycleSummary } from '../hooks/useCycle.js';
import { useSalatLog } from '../hooks/useSalatLog.js';
import RamadanSalatCard from '../components/RamadanSalatCard.js';
import DaifExplainer from '../components/DaifExplainer.js';
import TabNav from '../components/TabNav.js';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { useQuranSummary } from '../hooks/useQuran.js';
import { getRamadanWindow } from '../utils/ramadan.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { calcPrayerTimes, formatTime } from '../utils/prayerTimes.js';
import { celebrateFast } from '../utils/celebrate.js';
import { formatLocaleDate, formatLocaleNumber } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';

/**
 * Dedicated Ramadan tracker (v3.1) — the month gets its own home:
 *  · countdown + preparation before the month
 *  · 30-day grid, suhoor/iftar times, tarawih nights, Laylat al-Qadr focus
 *  · fully wired with FastingLog (category 'ramadan') and Rayhanah Cycle
 *    (excused days show the Rayhanah flower and flow into qada automatically
 *    on cycle end)
 *
 * Bustan Arch (T3.2): the day (or the countdown) is the screen's one arch;
 * everything else is a theme card with the elevation shadow. SVG marks only.
 */

/** The three ʿashra, named the way the ummah actually refers to them
 * (Istiak's call) — Raḥmah, Maghfirah, ʿItq min an-Nār.
 *
 * HONESTY NOTE, kept deliberately: this three-way split traces to a narration
 * in Ibn Khuzaymah (1887) whose chain is graded ḍaʿīf — Ibn Khuzaymah himself
 * flagged it. The NAMES are how people organise the month and are used here as
 * such, but the page never presents them as an established reward structure;
 * the badge in the UI carries the grade. The last ten's virtue, by contrast, is
 * firmly authentic (Bukhārī 2017), so only that one states a promise. */
const ASHRA_META = [
  {
    from: 1,
    to: 10,
    labelKey: 'ramadan.ashraRahmah',
    subKey: 'ramadan.ashraMercy',
    noteKey: '',
    weak: true,
  },
  {
    from: 11,
    to: 20,
    labelKey: 'ramadan.ashraMaghfirah',
    subKey: 'ramadan.ashraForgiveness',
    noteKey: '',
    weak: true,
  },
  {
    from: 21,
    to: 30,
    labelKey: 'ramadan.ashraItq',
    subKey: 'ramadan.ashraFreedom',
    noteKey: 'ramadan.ashraItqNote',
    weak: true,
  },
];

type Icon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
type WorshipId = 'salat' | 'nafl' | 'quran' | 'zikr';

const WORSHIP_TILES: { id: WorshipId; labelKey: string; Icon: Icon; to: string; tone: string }[] = [
  {
    id: 'salat',
    labelKey: 'ramadan.fardSalat',
    Icon: MosqueIcon,
    to: '/salat',
    tone: 'text-brand-emerald',
  },
  {
    id: 'nafl',
    labelKey: 'ramadan.naflRakahs',
    Icon: CrescentIcon,
    to: '/salat',
    tone: 'text-brand-info',
  },
  {
    id: 'quran',
    labelKey: 'ramadan.quranToday',
    Icon: BookOpenIcon,
    to: '/quran',
    tone: 'text-brand-info',
  },
  {
    id: 'zikr',
    labelKey: 'ramadan.dhikrToday',
    Icon: TasbihIcon,
    to: '/zikr',
    tone: 'text-brand-gold',
  },
];

/** The arch's day-state medallion and the inset panels use the same ring. */
const MEDALLION =
  'mx-auto w-16 h-16 rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/40 text-brand-gold';
const INSET = 'rounded-control bg-shade/20 border border-brand-border';

function weekdayShort(dateStr: string): string {
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), { weekday: 'short' });
}

/** Civil date shown inside each cell — "2 Feb" — so the month can be planned
 * against a normal calendar without converting hijri in your head. */
function gregorianShort(dateStr: string): string {
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), { day: 'numeric', month: 'short' });
}

function formatGregorian(dateStr: string): string {
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function RamadanTracker() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const today = getTrackingDay();
  const window_ = useMemo(() => getRamadanWindow(), []);

  const { data: history } = useFastingHistory(90, true);
  const { data: cycleSummary } = useCycleSummary();
  const upsert = useUpsertFastingLog();
  const clearLog = useClearFastingLog();
  const [confirmUnlog, setConfirmUnlog] = useState(false);

  const logsByDate = useMemo(() => {
    const m = new Map<string, { status: string; tarawih?: boolean }>();
    for (const l of history ?? []) {
      if (l.category === 'ramadan')
        m.set(l.date, { status: l.status, tarawih: (l as { tarawih?: boolean }).tarawih });
    }
    return m;
  }, [history]);

  // Rayhanah excused intervals (female users): flower days on the grid
  const isExcused = (day: string): boolean => {
    for (const l of cycleSummary?.logs ?? []) {
      const end = l.endDate ?? (cycleSummary?.active ? today : l.startDate);
      if (l.startDate <= day && day <= end) return true;
    }
    return false;
  };
  const excusedToday = isExcused(today);

  const ASHRA = ASHRA_META.map((a) => ({
    ...a,
    label: t(a.labelKey),
    sub: t(a.subKey),
    note: a.noteKey ? t(a.noteKey) : '',
  }));

  const todayLog = logsByDate.get(today);
  const fastedCount = window_.days.filter(
    (d) => logsByDate.get(d.date)?.status === 'completed'
  ).length;
  const tarawihCount = window_.days.filter((d) => logsByDate.get(d.date)?.tarawih).length;
  const excusedCount = window_.days.filter((d) => d.date <= today && isExcused(d.date)).length;

  // Suhoor/iftar from the saved location
  const prayerTimes = useMemo(() => {
    try {
      const raw = localStorage.getItem('bustandeen_location');
      if (!raw) return null;
      const loc = JSON.parse(raw) as { latitude: number; longitude: number };
      return calcPrayerTimes(loc.latitude, loc.longitude, new Date());
    } catch {
      return null;
    }
  }, []);

  // Tomorrow's Fajr, for the post-Maghrib rollover below. Recomputed rather
  // than reusing today's, because Fajr drifts a minute or two each day.
  const tomorrowFajr = useMemo(() => {
    try {
      const raw = localStorage.getItem('bustandeen_location');
      if (!raw) return null;
      const loc = JSON.parse(raw) as { latitude: number; longitude: number };
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return calcPrayerTimes(loc.latitude, loc.longitude, d).fajr;
    } catch {
      return null;
    }
  }, []);

  // Ticks once a second only while the page is open — the countdown is the
  // number a fasting person keeps glancing at, so it has to move.
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  /** Where we are in the fasting day: counting down to suhoor closing (before
   * Fajr) or to iftar (between Fajr and Maghrib). Null after Maghrib — the
   * fast is done, nothing left to count. */
  const fastClock = useMemo(() => {
    if (!prayerTimes) return null;
    const now = nowTs;
    const fajr = prayerTimes.fajr.getTime();
    const maghrib = prayerTimes.maghrib.getTime();

    const fmt = (ms: number) => {
      const s = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
        : `${m}:${String(sec).padStart(2, '0')}`;
    };

    if (now < fajr) {
      return { phase: 'suhoor' as const, label: fmt(fajr - now), progressPct: 0 };
    }
    if (now < maghrib) {
      const pct = Math.round(((now - fajr) / (maghrib - fajr)) * 100);
      return {
        phase: 'fasting' as const,
        label: fmt(maghrib - now),
        progressPct: Math.min(100, Math.max(0, pct)),
      };
    }
    // After Maghrib the fast is done, but the pill must NOT disappear for the
    // rest of the night — that is the stretch when people are planning suhoor.
    // Roll over to TOMORROW's Fajr (recomputed, since sunrise drifts daily).
    if (tomorrowFajr) {
      return { phase: 'suhoor' as const, label: fmt(tomorrowFajr.getTime() - now), progressPct: 0 };
    }
    return null;
  }, [prayerTimes, tomorrowFajr, nowTs]);

  // Live numbers for the worship strip, pulled from the trackers the user
  // already fills in — nothing new to log, just nothing to go hunting for.
  const { data: salatLog } = useSalatLog(today);
  const { data: zikrAnalytics } = useAnalytics(1);
  const { data: quranSummary } = useQuranSummary();

  const worshipToday = useMemo((): Record<
    WorshipId,
    { value: string; suffix?: string; hint: string }
  > => {
    const fardDone = (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).filter((p) => {
      const s = salatLog?.prayers?.[p]?.status;
      return s === 'completed' || s === 'kaza';
    }).length;

    const naflRakat = salatLog?.nafl?.completed ? (salatLog.nafl.rakat ?? 0) : 0;
    const naflKinds = salatLog?.nafl?.types?.length ?? 0;

    const ayat = quranSummary?.todayAyat ?? 0;
    const goalAyat = quranSummary?.profile?.dailyGoalAyat ?? 0;

    const zikrTotal = zikrAnalytics?.today?.total ?? 0;
    const zikrGoal = zikrAnalytics?.goal?.dailyTarget ?? 0;

    return {
      salat: {
        value: String(fardDone),
        suffix: '/5',
        hint: fardDone === 5 ? t('ramadan.allFive') : t('ramadan.tapToLog'),
      },
      nafl: {
        value: String(naflRakat),
        suffix: naflRakat ? ` ${t('ramadan.rakah')}` : '',
        hint: naflKinds
          ? t('ramadan.naflKinds', { count: naflKinds })
          : naflRakat
            ? t('ramadan.addWhichKind')
            : t('ramadan.noneLoggedYet'),
      },
      quran: {
        value: String(ayat),
        suffix: goalAyat ? `/${goalAyat}` : ` ${t('ramadan.ayat')}`,
        hint: goalAyat && ayat >= goalAyat ? t('ramadan.goalMet') : t('ramadan.keepReading'),
      },
      zikr: {
        value: String(zikrTotal),
        suffix: zikrGoal ? `/${zikrGoal}` : '',
        hint: zikrGoal && zikrTotal >= zikrGoal ? t('ramadan.goalMet') : t('ramadan.tapToCount'),
      },
    };
  }, [salatLog, zikrAnalytics, quranSummary, t]);

  const logToday = (status: 'completed' | 'intended') => {
    upsert.mutate(
      { date: today, category: 'ramadan', status, tarawih: todayLog?.tarawih ?? false },
      {
        onSuccess: () => {
          if (status === 'completed') celebrateFast();
        },
      }
    );
  };
  const toggleTarawih = () => {
    upsert.mutate({
      date: today,
      category: 'ramadan',
      status: (todayLog?.status as 'completed' | 'intended' | 'broken') ?? 'intended',
      tarawih: !todayLog?.tarawih,
    });
  };

  if (!user) return null;

  const tabs = (
    <TabNav
      items={[
        { label: t('ramadan.tabTracker'), to: '/ramadan', active: true },
        { label: t('ramadan.tabAnalytics'), to: '/ramadan/analytics' },
      ]}
    />
  );
  const yearLabel =
    window_.hijriYear != null ? formatLocaleNumber(window_.hijriYear, { useGrouping: false }) : '';

  // ────────────────────────── COUNTDOWN MODE ──────────────────────────
  if (!window_.active) {
    const startStr = window_.days[0]?.date;
    // A citation is drawn beside the row's link, not inside it: an <a> nested
    // in the row's <Link> is invalid HTML (React's validateDOMNesting warning).
    const prep: {
      to: string;
      Icon: Icon;
      label: ReactNode;
      cite?: { label: string; href: string };
    }[] = [
      { to: '/fasting', Icon: ArrowPathIcon, label: t('ramadan.clearQada') },
      {
        to: '/fasting',
        Icon: CrescentIcon,
        label: t('ramadan.warmUpShaban'),
        cite: {
          label: translateReference('Bukhārī 1969', i18n.language),
          href: 'https://sunnah.com/bukhari:1969',
        },
      },
      { to: '/quran', Icon: BookOpenIcon, label: t('ramadan.buildQuranHabit') },
    ];
    const virtues: { text: string; ref: string; href: string }[] = [
      {
        text: t('ramadan.fastingHadith'),
        ref: 'Bukhārī 1899',
        href: 'https://sunnah.com/bukhari:1899',
      },
      { text: t('ramadan.nightOfDecree'), ref: 'Quran 97:3', href: 'https://quran.com/97/3' },
      {
        text: t('ramadan.laylatAlQadrHadith'),
        ref: 'Bukhārī 1901',
        href: 'https://sunnah.com/bukhari:1901',
      },
    ];
    return (
      <AnimatedBackground variant="dark">
        <h1 className="sr-only">{t('ramadan.title')}</h1>
        <div className="max-w-2xl mx-auto px-4 pt-3">{tabs}</div>
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-5">
          {/* The screen's one arch: the countdown */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-10 pb-6 text-center space-y-2"
          >
            <span className={MEDALLION}>
              <CrescentIcon className="w-8 h-8" aria-hidden="true" />
            </span>
            <p className="text-brand-gold text-xs font-bold uppercase tracking-widest pt-1">
              {t('ramadan.ramadanYear', { year: yearLabel })} {t('hijriMonths.ah', 'AH')}
            </p>
            <h2 className="font-display text-5xl font-bold text-white tabular-nums">
              {formatLocaleNumber(window_.daysUntil)}
            </h2>
            <p className="text-white/80 text-sm font-semibold">
              {t('ramadan.daysAway', 'days away')}
            </p>
            {startStr && (
              <p className="text-white/70 text-xs">
                {t('ramadan.expectedAround', { date: formatGregorian(startStr) })}
              </p>
            )}
            <p className="text-white/85 text-sm pt-2 leading-relaxed max-w-md mx-auto">
              {t('ramadan.gatesHadith')}
              <br />
              <a
                className={REF_LINK}
                href="https://sunnah.com/bukhari:1899"
                target="_blank"
                rel="noreferrer"
              >
                {translateReference('Ṣaḥīḥ al-Bukhārī 1899', i18n.language)}
              </a>
            </p>
          </motion.section>

          <section className={`${CARD} p-5 space-y-3`}>
            <h2 className={SECTION_TITLE}>
              <FajrIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
              {t('ramadan.prepareHeart')}
            </h2>
            <div className="space-y-2 text-sm">
              {prep.map((p, i) => (
                <div key={i} className={`${ITEM} relative flex items-center gap-3`}>
                  <p.Icon className="w-5 h-5 shrink-0 text-brand-emerald" aria-hidden="true" />
                  <span className="flex-1 text-white/85 leading-snug">
                    {/* Stretched link: its ::after covers the whole row. */}
                    <Link to={p.to} className="after:absolute after:inset-0 after:content-['']">
                      {p.label}
                    </Link>
                    {p.cite && (
                      <>
                        {' '}
                        <a
                          className="relative z-10 text-brand-gold underline underline-offset-2"
                          href={p.cite.href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {p.cite.label}
                        </a>
                      </>
                    )}
                  </span>
                  <span
                    className="flex items-center gap-0.5 text-brand-gold text-xs font-bold shrink-0"
                    aria-hidden="true"
                  >
                    {t('ramadan.open')}
                    <ChevronRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className={`${CARD} p-5`}>
            <h2 className={`${SECTION_TITLE} mb-3`}>
              <Star8Icon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
              {t('ramadan.whyThisMonth')}
            </h2>
            <ul className="space-y-3">
              {virtues.map((v) => (
                <li key={v.href} className="flex gap-2.5 text-sm text-white/80 leading-relaxed">
                  <span
                    className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    {v.text}
                    <br />
                    <a className={REF_LINK} href={v.href} target="_blank" rel="noreferrer">
                      {translateReference(v.ref, i18n.language)}
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </AnimatedBackground>
    );
  }

  // ────────────────────────── LIVE MODE ──────────────────────────
  const dayNo = window_.todayNumber ?? 1;
  const inLastTen = dayNo >= 21;
  const fastedPct = Math.round((fastedCount / Math.max(1, window_.days.length)) * 100);
  const ClockGlyph = fastClock?.phase === 'suhoor' ? FajrIcon : MaghribIcon;

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('ramadan.title', 'Ramadan Tracker')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-3">{tabs}</div>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-5">
        {/* The screen's one arch: today */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-10 pb-5 sm:px-6 text-center space-y-4"
        >
          <div>
            <p className="text-brand-gold text-xs font-bold uppercase tracking-widest">
              {t('ramadan.ramadanYear', 'Ramadan {{year}}', { year: yearLabel })}{' '}
              {t('hijriMonths.ah', 'AH')}
            </p>
            <h2 className="font-display text-4xl font-bold text-white mt-1">
              {t('ramadan.dayLabel', 'Day {{day}}', { day: formatLocaleNumber(dayNo) })}{' '}
              <span className="text-white/70 text-lg font-semibold">
                {t('ramadan.ofDays', 'of {{total}}', {
                  total: formatLocaleNumber(window_.days.length),
                })}
              </span>
            </h2>
          </div>

          {/* Live countdown: the number a fasting person keeps glancing at. */}
          {fastClock && (
            <div
              title={
                fastClock.phase === 'suhoor'
                  ? t('ramadan.suhoorClosesAt', 'Suhoor closes at {{time}}', {
                      time: prayerTimes ? formatTime(prayerTimes.fajr) : '',
                    })
                  : t('ramadan.iftarAt', 'Iftar at {{time}}', {
                      time: prayerTimes ? formatTime(prayerTimes.maghrib) : '',
                    })
              }
              className={`mx-auto inline-flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-full border shadow-elev-1 bg-brand-deep ${
                fastClock.phase === 'suhoor' ? 'border-brand-info/50' : 'border-brand-gold/50'
              }`}
            >
              <ClockGlyph
                className={`w-5 h-5 ${fastClock.phase === 'suhoor' ? 'text-brand-info' : 'text-brand-gold'}`}
                aria-hidden="true"
              />
              <span className="text-left leading-tight">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-white/70">
                  {fastClock.phase === 'suhoor'
                    ? t('ramadan.suhoorIn', 'Suhoor in')
                    : t('ramadan.iftarIn', 'Iftar in')}
                </span>
                <span className="block text-white font-bold text-base tabular-nums">
                  {fastClock.label}
                </span>
              </span>
            </div>
          )}

          {/* Month progress */}
          <div className="text-left">
            <div
              className="h-2.5 rounded-full bg-shade/30 overflow-hidden"
              role="progressbar"
              aria-valuenow={fastedPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <motion.div
                className="h-full rounded-full bg-brand-gold"
                initial={{ width: 0 }}
                animate={{ width: `${fastedPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-white/75 text-xs mt-1.5">
              {t('ramadan.fastedTarawihSummary', '{{fasted}} fasted · {{tarawih}} tarawih nights', {
                fasted: formatLocaleNumber(fastedCount),
                tarawih: formatLocaleNumber(tarawihCount),
              })}
              {excusedCount > 0
                ? ` · ${t('ramadan.excusedAutoQada', '{{count}} excused (auto-qaḍā)', {
                    count: excusedCount,
                  })}`
                : ''}
            </p>
          </div>

          {/* Suhoor / iftar */}
          {prayerTimes ? (
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  {
                    key: 'suhoor',
                    Glyph: FajrIcon,
                    label: t('ramadan.suhoorEndsFajr', 'Suhoor ends (Fajr)'),
                    time: formatTime(prayerTimes.fajr),
                    quote: t('fastingRules.sunnahText.0'),
                    ref: 'Bukhārī 1923',
                    href: 'https://sunnah.com/bukhari:1923',
                  },
                  {
                    key: 'iftar',
                    Glyph: MaghribIcon,
                    label: t('ramadan.iftarMaghrib', 'Iftar (Maghrib)'),
                    time: formatTime(prayerTimes.maghrib),
                    quote: t('fastingRules.sunnahText.1'),
                    ref: 'Bukhārī 1957',
                    href: 'https://sunnah.com/bukhari:1957',
                  },
                ] as const
              ).map((s) => (
                <div key={s.key} className={`${INSET} p-3`}>
                  <p className="flex items-center justify-center gap-1.5 text-white/75 text-[10px] font-bold uppercase tracking-wide">
                    <s.Glyph className="w-3.5 h-3.5 text-brand-gold" aria-hidden="true" />
                    {s.label}
                  </p>
                  <p className="text-white font-bold text-xl tabular-nums mt-0.5">{s.time}</p>
                  <p className="text-white/70 text-[11px] leading-snug mt-1">
                    {s.quote}{' '}
                    <a
                      className="text-brand-gold underline underline-offset-2"
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {translateReference(s.ref, i18n.language)}
                    </a>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <button
              className="inline-flex items-center gap-1 text-sm text-brand-gold font-semibold underline underline-offset-2"
              onClick={() => navigate('/prayer-times')}
            >
              {t('ramadan.setLocationPrompt', 'Set your location to see suhoor & iftar times')}
              <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          )}

          {/* Today's action */}
          {excusedToday ? (
            <div className="text-left">
              <ExcusedCard feature="fasting" />
            </div>
          ) : todayLog?.status === 'completed' ? (
            <div className="space-y-2">
              <span className="mx-auto w-16 h-16 rounded-full grid place-items-center bg-data-good/10 border border-data-good/40 text-data-good">
                <CheckIcon className="w-8 h-8" aria-hidden="true" />
              </span>
              <p className="text-data-good font-bold">
                {t('ramadan.dayFasted', 'Day {{day}} fasted. Taqabbal Allāh!', {
                  day: formatLocaleNumber(dayNo),
                })}
              </p>
              {confirmUnlog ? (
                <p className="text-xs">
                  <button
                    className="text-red-400 font-semibold underline"
                    onClick={() => {
                      clearLog.mutate(today);
                      setConfirmUnlog(false);
                    }}
                  >
                    {t('ramadan.yesRemoveIt', 'Yes, remove it')}
                  </button>
                  <button
                    className="text-white/75 font-semibold ml-4"
                    onClick={() => setConfirmUnlog(false)}
                  >
                    {t('ramadan.keep', 'Keep')}
                  </button>
                </p>
              ) : (
                <button
                  className="text-white/65 text-[11px] underline"
                  onClick={() => setConfirmUnlog(true)}
                >
                  {t('ramadan.loggedByMistake', 'logged by mistake?')}
                </button>
              )}
            </div>
          ) : (
            // No "Intending" here: Ramadan is farḍ, so the intention is
            // assumed; offering it as a choice framed an obligation as
            // optional (Istiak). Voluntary fasts keep it in /fasting.
            <button
              className={`${BTN_PRIMARY} w-full h-12 text-base`}
              disabled={upsert.isPending}
              onClick={() => logToday('completed')}
            >
              <CheckIcon className="w-5 h-5" aria-hidden="true" />
              {t('ramadan.iFastedToday', 'I fasted today')}
            </button>
          )}
          {/* Tarawih lives in the salat card below, directly under Isha. */}
        </motion.section>

        {/* ── Today's worship: every tracker in one strip ──────────────
            Ramadan is the month people most want to do everything, and the
            worst time to make them hunt through tabs for it. Live numbers from
            the trackers they already use; each tile is a direct link. */}
        <section className={`${CARD} p-5`}>
          <h2 className={`${SECTION_TITLE} mb-3`}>
            <ClockIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
            {t('ramadan.todaysWorship', "Today's worship")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {WORSHIP_TILES.map((tile) => {
              const stat = worshipToday[tile.id];
              return (
                <button key={tile.id} onClick={() => navigate(tile.to)} className={ITEM}>
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
                    <tile.Icon className={`w-3.5 h-3.5 shrink-0 ${tile.tone}`} aria-hidden="true" />
                    <span className="truncate">{t(tile.labelKey)}</span>
                  </p>
                  <p className={`font-bold text-2xl leading-tight mt-1 tabular-nums ${tile.tone}`}>
                    {stat.value}
                    {stat.suffix && (
                      <span className="text-white/60 text-sm font-bold">{stat.suffix}</span>
                    )}
                  </p>
                  <p className="text-white/65 text-[11px] mt-0.5 flex items-center gap-1">
                    <span className="truncate">{stat.hint}</span>
                    <ChevronRightIcon className="w-3 h-3 ml-auto shrink-0" aria-hidden="true" />
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-white/65 text-[11px] mt-3 leading-relaxed">
            <Trans
              i18nKey="ramadan.naflFardNote"
              components={{
                1: (
                  <a
                    className="underline text-brand-gold"
                    href="https://islamqa.info/en/answers/21364"
                    target="_blank"
                    rel="noreferrer"
                  />
                ),
                3: (
                  <a
                    className="underline text-brand-gold"
                    href="https://sunnah.com/bukhari:1899"
                    target="_blank"
                    rel="noreferrer"
                  />
                ),
              }}
            />
          </p>
        </section>

        {/* Salat + nafl, inline: no trip to /salat and back */}
        <RamadanSalatCard
          date={today}
          excused={excusedToday}
          tarawih={todayLog?.tarawih ?? false}
          onToggleTarawih={toggleTarawih}
        />

        {/* Laylat al-Qadr focus */}
        {inLastTen && (
          <section className={`${CARD} border-brand-info/40 p-5`}>
            <h2 className={SECTION_TITLE}>
              <Star8Icon className="w-5 h-5 text-brand-info" aria-hidden="true" />
              {t('ramadan.lastTenNights', 'The last ten nights')}
            </h2>
            <p className="text-white/80 text-xs mt-1.5 leading-relaxed">
              <Trans
                i18nKey="ramadan.laylatalQadrNote"
                components={{
                  1: (
                    <a
                      className="underline text-brand-gold"
                      href="https://quran.com/97/3"
                      target="_blank"
                      rel="noreferrer"
                    />
                  ),
                  3: (
                    <a
                      className="underline text-brand-gold"
                      href="https://sunnah.com/bukhari:2017"
                      target="_blank"
                      rel="noreferrer"
                    />
                  ),
                  5: <span className="italic text-white" />,
                  7: (
                    <a
                      className="underline text-brand-gold"
                      href="https://sunnah.com/tirmidhi:3513"
                      target="_blank"
                      rel="noreferrer"
                    />
                  ),
                }}
              />
            </p>
            <div className="flex gap-1.5 mt-3">
              {[21, 23, 25, 27, 29].map((n) => (
                <span
                  key={n}
                  className={`flex-1 text-center py-2 rounded-control text-sm font-bold tabular-nums border ${
                    n === dayNo
                      ? 'bg-brand-info text-on-color border-brand-info shadow-elev-1'
                      : n < dayNo
                        ? 'bg-shade/20 text-white/55 border-brand-border'
                        : 'bg-brand-info/10 text-brand-info border-brand-info/40'
                  }`}
                >
                  {formatLocaleNumber(n)}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* 30-day grid */}
        <section className={`${CARD} p-5`}>
          <h2 className={`${SECTION_TITLE} mb-3`}>
            <CrescentIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
            {t('ramadan.yourMonth', 'Your month')}
          </h2>

          {/* Split into the three ʿashra. A ten is 10 days, which never lines
              up with a 7-day week, so instead of a weekday-aligned grid each
              group is its own block and every cell carries its own day name.
              NOTE: the popular "mercy / forgiveness / freedom from the Fire"
              naming rests on a weak narration (Ibn Khuzaymah 1887, ḍaʿīf), so
              each group carries the grade badge. */}
          {ASHRA.map((group) => {
            const groupDays = window_.days.filter(
              (d) => d.dayNumber >= group.from && d.dayNumber <= group.to
            );
            if (groupDays.length === 0) return null;
            return (
              <div
                key={group.from}
                className="border-t border-brand-border first:border-t-0 pt-3 first:pt-0 mt-3 first:mt-0"
              >
                <div className="flex items-baseline gap-2 flex-wrap mb-2">
                  <span className="text-brand-gold font-bold text-sm">{group.label}</span>
                  <span className="text-white/70 text-[11px]">{group.sub}</span>
                  <span className="text-white/55 text-[10px] tabular-nums">
                    ·{' '}
                    {t('ramadan.daysRange', 'days {{from}}-{{to}}', {
                      from: formatLocaleNumber(group.from),
                      to: formatLocaleNumber(Math.min(group.to, window_.days.length)),
                    })}
                  </span>
                  {group.weak && (
                    <span
                      title={t('ramadan.ashraWeakTooltip')}
                      className="text-[9px] uppercase tracking-wide text-brand-gold border border-brand-gold/40 rounded px-1 py-px"
                    >
                      {t('ramadan.daifBadge', 'ḍaʿīf')}
                    </span>
                  )}
                </div>
                {group.note && (
                  <p className="text-brand-info text-[11px] -mt-1 mb-2">{group.note}</p>
                )}
                <div className="grid grid-cols-5 gap-2">
                  {groupDays.map((d) => {
                    const log = logsByDate.get(d.date);
                    const excused = isExcused(d.date);
                    const isPast = d.date < today;
                    const isToday = d.date === today;
                    const oddNight = d.isLastTen && d.isOdd;
                    let Face: Icon | null = null;
                    let cls = 'bg-brand-surface/60 border-brand-border text-white/80';
                    if (excused && d.date <= today) {
                      Face = FlowerIcon;
                      cls = 'bg-brand-pink/15 border-brand-pink/40 text-brand-pink';
                    } else if (log?.status === 'completed') {
                      Face = CheckIcon;
                      cls = 'bg-data-good/15 border-data-good/50 text-data-good';
                    } else if (log?.status === 'intended') {
                      Face = FajrIcon;
                      cls = 'bg-brand-info/15 border-brand-info/40 text-brand-info';
                    } else if (log?.status === 'broken') {
                      Face = XMarkIcon;
                      cls = 'bg-red-400/10 border-red-400/40 text-red-400';
                    } else if (isPast) {
                      cls = 'bg-shade/20 border-brand-border text-white/55';
                    } else if (oddNight) {
                      cls = 'bg-brand-info/10 border-brand-info/50 text-white/90';
                    }
                    return (
                      <div
                        key={d.date}
                        title={t('ramadan.dayCellTitle', {
                          day: d.dayNumber,
                          date: formatGregorian(d.date),
                          oddNightNote: oddNight ? t('ramadan.oddNightSuffix') : '',
                        })}
                        className={[
                          'relative aspect-square rounded-control border flex flex-col items-center justify-center gap-0.5',
                          cls,
                          isToday
                            ? 'ring-2 ring-brand-gold ring-offset-1 ring-offset-brand-deep'
                            : '',
                        ].join(' ')}
                      >
                        {/* Odd nights of the last ten carry a star: Laylat
                            al-Qadr is sought in them. */}
                        {oddNight && (
                          <Star8Icon
                            className="absolute top-1 left-1 w-2.5 h-2.5 text-brand-info"
                            aria-hidden="true"
                          />
                        )}
                        {log?.tarawih && (
                          <MosqueIcon
                            className="absolute top-1 right-1 w-2.5 h-2.5 text-brand-info"
                            aria-hidden="true"
                          />
                        )}
                        {Face ? (
                          <Face className="w-5 h-5" aria-hidden="true" />
                        ) : (
                          <span className="text-base sm:text-lg font-bold leading-none tabular-nums">
                            {formatLocaleNumber(d.dayNumber)}
                          </span>
                        )}
                        {/* Gregorian anchor: nobody plans their week in hijri
                            alone, so each cell carries the civil date too. */}
                        <span className="text-[9px] leading-none opacity-90 font-semibold">
                          {weekdayShort(d.date)}
                        </span>
                        <span className="text-[9px] leading-none opacity-75 tabular-nums">
                          {gregorianShort(d.date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-[11px] text-white/75">
            {(
              [
                [CheckIcon, 'text-data-good', t('ramadan.legendFasted', 'fasted')],
                [XMarkIcon, 'text-red-400', t('ramadan.legendBroken', 'broken')],
                [FlowerIcon, 'text-brand-pink', t('ramadan.legendExcusedQada', 'excused → qaḍā')],
                [MosqueIcon, 'text-brand-info', t('ramadan.legendTarawih', 'tarawih')],
                [Star8Icon, 'text-brand-info', t('ramadan.legendGlowing')],
              ] as const
            ).map(([L, tone, label]) => (
              <span key={label} className="inline-flex items-center gap-1">
                <L className={`w-3.5 h-3.5 ${tone}`} aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
          <p className="text-white/65 text-[11px] mt-2 leading-relaxed">
            <Trans
              i18nKey="ramadan.rayhanahAutoQadaNote"
              components={{
                1: (
                  <a
                    className="underline text-brand-gold"
                    href="https://sunnah.com/muslim:335"
                    target="_blank"
                    rel="noreferrer"
                  />
                ),
              }}
            />
          </p>
        </section>

        {/* Every ḍaʿīf badge on this page is accounted for here: chain,
            defect, and who graded it (Istiak's rule). */}
        <DaifExplainer topics={['ramadan-ashra', 'nafl-fard-reward']} />
      </div>
    </AnimatedBackground>
  );
}
