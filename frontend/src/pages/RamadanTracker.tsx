import { useEffect, useMemo, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground.js';
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
 *    (excused days show 🌸 and flow into qada automatically on cycle end)
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

const WORSHIP_TILES = [
  {
    id: 'salat',
    labelKey: 'ramadan.fardSalat',
    emoji: '🕌',
    to: '/salat',
    border: 'border-brand-emerald/20',
    bg: 'bg-brand-emerald/[0.07]',
    tone: 'text-brand-emerald',
  },
  {
    id: 'nafl',
    labelKey: 'ramadan.naflRakahs',
    emoji: '🌙',
    to: '/salat',
    border: 'border-brand-info/20',
    bg: 'bg-brand-info/[0.07]',
    tone: 'text-brand-info',
  },
  {
    id: 'quran',
    labelKey: 'ramadan.quranToday',
    emoji: '📖',
    to: '/quran',
    border: 'border-brand-info/20',
    bg: 'bg-brand-info/[0.07]',
    tone: 'text-brand-info',
  },
  {
    id: 'zikr',
    labelKey: 'ramadan.dhikrToday',
    emoji: '📿',
    to: '/zikr',
    border: 'border-brand-gold/20',
    bg: 'bg-brand-gold/[0.07]',
    tone: 'text-brand-gold',
  },
] as const;

type WorshipId = 'salat' | 'nafl' | 'quran' | 'zikr';

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

  // Rayhanah excused intervals (female users) — 🌸 days on the grid
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

  // ────────────────────────── COUNTDOWN MODE ──────────────────────────
  if (!window_.active) {
    const startStr = window_.days[0]?.date;
    return (
      <AnimatedBackground variant="dark">
        <h1 className="sr-only">{t('ramadan.title')}</h1>
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <TabNav
            items={[
              { label: t('ramadan.tabTracker'), to: '/ramadan', active: true },
              { label: t('ramadan.tabAnalytics'), to: '/ramadan/analytics' },
            ]}
          />
        </div>
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-8 border border-brand-gold/25 bg-gradient-to-br from-brand-gold/15 via-brand-gold/10 to-brand-info/10 text-center relative overflow-hidden"
          >
            <motion.div
              className="absolute -top-14 -right-14 w-48 h-48 rounded-full bg-brand-gold/10 blur-2xl"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative">
              <div className="text-6xl mb-3">🌙</div>
              <p className="text-brand-gold/80 text-xs font-bold uppercase tracking-widest">
                {t('ramadan.ramadanYear', {
                  year: window_.hijriYear != null ? formatLocaleNumber(window_.hijriYear) : '',
                })}
              </p>
              <h2 className="text-5xl font-black text-white mt-2">
                {formatLocaleNumber(window_.daysUntil)}
              </h2>
              <p className="text-white/50 text-sm font-semibold">
                {t('ramadan.daysAway', 'days away')}
              </p>
              {startStr && (
                <p className="text-white/30 text-xs mt-2">
                  {t('ramadan.expectedAround', { date: formatGregorian(startStr) })}
                </p>
              )}
              <p className="text-brand-gold/80 text-sm mt-4 leading-relaxed max-w-md mx-auto">
                {t('ramadan.gatesHadith')} —{' '}
                <a
                  className="underline"
                  href="https://sunnah.com/bukhari:1899"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Ṣaḥīḥ al-Bukhārī 1899', i18n.language)}
                </a>
              </p>
            </div>
          </motion.div>

          <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5 space-y-3">
            <h2 className="text-white font-black">{t('ramadan.prepareHeart')}</h2>
            <div className="space-y-2 text-sm">
              <Link
                to="/fasting"
                className="flex items-center gap-3 rounded-xl px-3 py-3 bg-white/5 hover:bg-white/5 transition-colors"
              >
                <span className="text-lg">🧾</span>
                <span className="flex-1 text-white/75">{t('ramadan.clearQada')}</span>
                <span className="text-brand-gold/70 text-xs">{t('ramadan.open')}</span>
              </Link>
              <Link
                to="/fasting"
                className="flex items-center gap-3 rounded-xl px-3 py-3 bg-white/5 hover:bg-white/5 transition-colors"
              >
                <span className="text-lg">🌗</span>
                <span className="flex-1 text-white/75">
                  {t('ramadan.warmUpShaban')} (
                  <a
                    className="underline"
                    href="https://sunnah.com/bukhari:1969"
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {translateReference('Bukhārī 1969', i18n.language)}
                  </a>
                  )
                </span>
                <span className="text-brand-gold/70 text-xs">{t('ramadan.open')}</span>
              </Link>
              <Link
                to="/quran"
                className="flex items-center gap-3 rounded-xl px-3 py-3 bg-white/5 hover:bg-white/5 transition-colors"
              >
                <span className="text-lg">📖</span>
                <span className="flex-1 text-white/75">{t('ramadan.buildQuranHabit')}</span>
                <span className="text-brand-gold/70 text-xs">{t('ramadan.open')}</span>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
            <h2 className="text-white font-black mb-2">{t('ramadan.whyThisMonth')}</h2>
            <ul className="space-y-2 text-xs text-white/50 leading-relaxed">
              <li>
                • {t('ramadan.fastingHadith')} —{' '}
                <a
                  className="underline"
                  href="https://sunnah.com/bukhari:38"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Bukhārī 38', i18n.language)}
                </a>
              </li>
              <li>
                • {t('ramadan.nightOfDecree')} —{' '}
                <a
                  className="underline"
                  href="https://quran.com/97/3"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Quran 97:3', i18n.language)}
                </a>
              </li>
              <li>
                • {t('ramadan.laylatAlQadrHadith')} —{' '}
                <a
                  className="underline"
                  href="https://sunnah.com/bukhari:1901"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Bukhārī 1901', i18n.language)}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  // ────────────────────────── LIVE MODE ──────────────────────────
  const dayNo = window_.todayNumber ?? 1;
  const inLastTen = dayNo >= 21;

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('ramadan.title', 'Ramadan Tracker')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-16 space-y-5">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 sm:p-8 border border-brand-gold/25 bg-gradient-to-br from-brand-gold/15 via-brand-gold/10 to-brand-info/10 relative overflow-hidden"
        >
          <div className="relative">
            <p className="text-brand-gold/80 text-xs font-bold uppercase tracking-widest">
              🌙 {t('ramadan.ramadanYear', 'Ramadan {{year}}', { year: window_.hijriYear })}{' '}
              {t('hijriMonths.ah', 'AH')}
            </p>
            {/* Day number, with the live countdown as a compact pill on the
                right — it is a glanceable number, not a headline, so it does
                not deserve a card of its own. */}
            <div className="flex items-center justify-between gap-3 mt-1">
              <h2 className="text-3xl font-black text-white">
                {t('ramadan.dayLabel', 'Day {{day}}', { day: dayNo })}{' '}
                <span className="text-white/30 text-lg">
                  {t('ramadan.ofDays', 'of {{total}}', { total: window_.days.length })}
                </span>
              </h2>
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
                  className={`shrink-0 flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border ${
                    fastClock.phase === 'suhoor'
                      ? 'border-brand-info/30 bg-brand-info/10'
                      : 'border-brand-gold/30 bg-brand-gold/10'
                  }`}
                >
                  <span className="text-sm leading-none">
                    {fastClock.phase === 'suhoor' ? '🌅' : '🌇'}
                  </span>
                  <span className="leading-tight">
                    <span
                      className={`block text-[9px] font-bold uppercase tracking-wider ${
                        fastClock.phase === 'suhoor' ? 'text-brand-info/70' : 'text-brand-gold/70'
                      }`}
                    >
                      {fastClock.phase === 'suhoor'
                        ? t('ramadan.suhoorIn', 'Suhoor in')
                        : t('ramadan.iftarIn', 'Iftar in')}
                    </span>
                    <span className="block text-white font-black text-sm tabular-nums">
                      {fastClock.label}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* progress */}
            <div className="mt-3 h-2.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-gold to-brand-gold"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((fastedCount / window_.days.length) * 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-white/40 text-xs mt-1.5">
              {t('ramadan.fastedTarawihSummary', '{{fasted}} fasted · {{tarawih}} tarawih nights', {
                fasted: fastedCount,
                tarawih: tarawihCount,
              })}
              {excusedCount > 0
                ? ` · ${t('ramadan.excusedAutoQada', '{{count}} 🌸 excused (auto-qaḍā)', { count: excusedCount })}`
                : ''}
            </p>

            {/* suhoor / iftar */}
            {prayerTimes ? (
              <div className="flex gap-3 mt-4">
                <div className="flex-1 rounded-2xl bg-white/5 border border-brand-emerald/10 p-3 text-center">
                  <p className="text-white/30 text-[10px] font-bold uppercase">
                    {t('ramadan.suhoorEndsFajr', 'Suhoor ends (Fajr)')}
                  </p>
                  <p className="text-white font-black text-lg">{formatTime(prayerTimes.fajr)}</p>
                  <p className="text-white/25 text-[10px]">
                    "Take suhoor — there is blessing in it" ·{' '}
                    <a
                      className="underline"
                      href="https://sunnah.com/bukhari:1923"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {translateReference('Bukhārī 1923', i18n.language)}
                    </a>
                  </p>
                </div>
                <div className="flex-1 rounded-2xl bg-white/5 border border-brand-emerald/10 p-3 text-center">
                  <p className="text-white/30 text-[10px] font-bold uppercase">
                    {t('ramadan.iftarMaghrib', 'Iftar (Maghrib)')}
                  </p>
                  <p className="text-white font-black text-lg">{formatTime(prayerTimes.maghrib)}</p>
                  <p className="text-white/25 text-[10px]">
                    "People remain upon good while they hasten iftar" ·{' '}
                    <a
                      className="underline"
                      href="https://sunnah.com/bukhari:1957"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {translateReference('Bukhārī 1957', i18n.language)}
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <button
                className="mt-4 text-xs text-brand-gold/70 underline"
                onClick={() => navigate('/prayer-times')}
              >
                {t('ramadan.setLocationPrompt', 'Set your location to see suhoor & iftar times →')}
              </button>
            )}

            {/* today's action */}
            {excusedToday ? (
              <div className="mt-4">
                <ExcusedCard feature="fasting" />
              </div>
            ) : todayLog?.status === 'completed' ? (
              <div className="mt-4 rounded-2xl bg-brand-emerald/15 border border-brand-emerald/30 p-4 text-center">
                <p className="text-brand-emerald font-black">
                  ✅{' '}
                  {t('ramadan.dayFasted', 'Day {{day}} fasted — taqabbal Allāh!', {
                    day: dayNo,
                  })}{' '}
                </p>
                {confirmUnlog ? (
                  <p className="text-xs mt-1">
                    <button
                      className="text-red-300 underline"
                      onClick={() => {
                        clearLog.mutate(today);
                        setConfirmUnlog(false);
                      }}
                    >
                      {t('ramadan.yesRemoveIt', 'Yes, remove it')}
                    </button>
                    <button className="text-white/40 ml-3" onClick={() => setConfirmUnlog(false)}>
                      {t('ramadan.keep', 'Keep')}
                    </button>
                  </p>
                ) : (
                  <button
                    className="text-white/25 text-[10px] underline mt-1"
                    onClick={() => setConfirmUnlog(true)}
                  >
                    {t('ramadan.loggedByMistake', 'logged by mistake?')}
                  </button>
                )}
              </div>
            ) : (
              // No "Intending" here: Ramadan is farḍ, so the intention is
              // assumed — offering it as a choice framed an obligation as
              // optional (Istiak). Voluntary fasts keep it in /fasting.
              <div className="mt-4">
                <button
                  className="w-full btn h-12 rounded-2xl border-0 text-white font-black bg-gradient-to-r from-brand-gold to-brand-gold hover:from-brand-gold hover:to-brand-gold"
                  disabled={upsert.isPending}
                  onClick={() => logToday('completed')}
                >
                  ✅ {t('ramadan.iFastedToday', 'I fasted today')}
                </button>
              </div>
            )}

            {/* Tarawih now lives in the salat card below, directly under Isha. */}
          </div>
        </motion.div>

        {/* ── Today's worship — every tracker in one strip ──────────────
            Ramadan is the month people most want to do everything, and the
            worst time to make them hunt through tabs for it. Live numbers from
            the trackers they already use; each tile is a direct link. */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
          <h2 className="text-white font-black mb-3">
            🕰️ {t('ramadan.todaysWorship', "Today's worship")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {WORSHIP_TILES.map((tile) => {
              const stat = worshipToday[tile.id];
              return (
                <button
                  key={tile.id}
                  onClick={() => navigate(tile.to)}
                  className={`group text-left rounded-2xl border p-3 transition-colors ${tile.border} ${tile.bg} hover:brightness-125`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                    {t(tile.labelKey)}
                  </p>
                  <p className={`font-black text-xl leading-tight mt-0.5 ${tile.tone}`}>
                    {stat.value}
                    {stat.suffix && (
                      <span className="text-white/25 text-sm font-bold">{stat.suffix}</span>
                    )}
                  </p>
                  <p className="text-white/30 text-[10px] mt-0.5 flex items-center gap-1">
                    <span>{tile.emoji}</span>
                    <span className="truncate">{stat.hint}</span>
                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </span>
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-white/25 text-[10px] mt-3 leading-relaxed">
            <Trans
              i18nKey="ramadan.naflFardNote"
              defaults="Nafl carries the reward of a farḍ in Ramadan, and a farḍ the reward of seventy (<1>Ibn Khuzaymah 1887</1> — ḍaʿīf chain, widely cited; the month's general virtue is established in <3>Bukhārī 1899</3>)."
            >
              Nafl carries the reward of a farḍ in Ramadan, and a farḍ the reward of seventy (
              <a
                className="underline hover:text-white/50"
                href="https://islamqa.info/en/answers/21364"
                target="_blank"
                rel="noreferrer"
              >
                {translateReference('Ibn Khuzaymah 1887', i18n.language)}
              </a>{' '}
              — ḍaʿīf chain, widely cited; the month's general virtue is established in{' '}
              <a
                className="underline hover:text-white/50"
                href="https://sunnah.com/bukhari:1899"
                target="_blank"
                rel="noreferrer"
              >
                {translateReference('Bukhārī 1899', i18n.language)}
              </a>
              ).
            </Trans>
          </p>
        </div>

        {/* Salat + nafl, inline — no trip to /salat and back */}
        <RamadanSalatCard
          date={today}
          excused={excusedToday}
          tarawih={todayLog?.tarawih ?? false}
          onToggleTarawih={toggleTarawih}
        />

        {/* Laylat al-Qadr focus */}
        {inLastTen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-5 border border-brand-info/30 bg-gradient-to-br from-brand-info/15 to-brand-info/10"
          >
            <h2 className="text-white font-black">
              ✨ {t('ramadan.lastTenNights', 'The last ten nights')}
            </h2>
            <p className="text-brand-info/70 text-xs mt-1 leading-relaxed">
              <Trans
                i18nKey="ramadan.laylatalQadrNote"
                defaults="Seek Laylat al-Qadr in the odd nights — it is better than a thousand months (<1>Quran 97:3</1>, <3>Bukhārī 2017</3>). Duʿā of the night: <5>Allāhumma innaka ʿafuwwun tuḥibbul-ʿafwa faʿfu ʿannī</5> (<7>Tirmidhī 3513</7>)."
              >
                Seek Laylat al-Qadr in the odd nights — it is better than a thousand months (
                <a
                  className="underline"
                  href="https://quran.com/97/3"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Quran 97:3', i18n.language)}
                </a>
                ,{' '}
                <a
                  className="underline"
                  href="https://sunnah.com/bukhari:2017"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Bukhārī 2017', i18n.language)}
                </a>
                ). Duʿā of the night:{' '}
                <span className="italic">Allāhumma innaka ʿafuwwun tuḥibbul-ʿafwa faʿfu ʿannī</span>{' '}
                (
                <a
                  className="underline"
                  href="https://sunnah.com/tirmidhi:3513"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Tirmidhī 3513', i18n.language)}
                </a>
                ).
              </Trans>
            </p>
            <div className="flex gap-1.5 mt-3">
              {[21, 23, 25, 27, 29].map((n) => (
                <span
                  key={n}
                  className={`flex-1 text-center py-2 rounded-xl text-sm font-black ${n === dayNo ? 'bg-brand-info/40 text-white ring-2 ring-brand-info/60' : n < dayNo ? 'bg-white/5 text-white/30' : 'bg-brand-info/15 text-brand-info'}`}
                >
                  {n}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* 30-day grid */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
          <h2 className="text-white font-black mb-3">📅 {t('ramadan.yourMonth', 'Your month')}</h2>

          {/* Split into the three ʿashra. A ten is 10 days, which never lines
              up with a 7-day week, so instead of a weekday-aligned grid each
              group is its own block and every cell carries its own day name.
              The groups are separated by a very low-opacity rule whose label
              only appears on hover. NOTE: the popular "mercy / forgiveness /
              freedom from the Fire" naming rests on a weak narration (Ibn
              Khuzaymah 1887, ḍaʿīf) — so the labels stay factual. */}
          {ASHRA.map((group) => {
            const groupDays = window_.days.filter(
              (d) => d.dayNumber >= group.from && d.dayNumber <= group.to
            );
            if (groupDays.length === 0) return null;
            return (
              <div
                key={group.from}
                className="group/ashra border-t border-white/[0.05] first:border-t-0 pt-3 first:pt-0 mt-3 first:mt-0"
              >
                {/* Always visible now — the ashra names are how the month is
                    navigated, not a hover easter egg. */}
                <div className="flex items-baseline gap-2 flex-wrap mb-2">
                  <span className="text-brand-gold/80 font-black text-sm">{group.label}</span>
                  <span className="text-white/30 text-[11px]">{group.sub}</span>
                  <span className="text-white/15 text-[10px] tabular-nums">
                    · days {group.from}–{Math.min(group.to, window_.days.length)}
                  </span>
                  {group.weak && (
                    <span
                      title={t(
                        'ramadan.ashraWeakTooltip',
                        "The mercy / forgiveness / freedom split comes from a narration in Ibn Khuzaymah (1887) with a weak chain. The names are widely used to organise the month; treat them as a framing, not as a graded promise. The last ten's virtue is separately authentic (Bukhārī 2017)."
                      )}
                      className="text-[9px] uppercase tracking-wide text-brand-gold/40 border border-brand-gold/20 rounded px-1 py-px"
                    >
                      ḍaʿīf
                    </span>
                  )}
                </div>
                {group.note && (
                  <p className="text-brand-info/50 text-[11px] -mt-1 mb-2">{group.note}</p>
                )}
                <div className="grid grid-cols-5 gap-2">
                  {groupDays.map((d) => {
                    const log = logsByDate.get(d.date);
                    const excused = isExcused(d.date);
                    const isPast = d.date < today;
                    const isToday = d.date === today;
                    const oddNight = d.isLastTen && d.isOdd;
                    let face = String(d.dayNumber);
                    let cls = 'bg-white/[0.04] text-white/40';
                    if (excused && d.date <= today) {
                      face = '🌸';
                      cls = 'bg-brand-pink/20 text-brand-pink';
                    } else if (log?.status === 'completed') {
                      face = '✓';
                      cls = 'bg-brand-emerald/30 text-brand-emerald';
                    } else if (log?.status === 'intended') {
                      face = '🌅';
                      cls = 'bg-brand-info/20 text-brand-info';
                    } else if (log?.status === 'broken') {
                      face = '💔';
                      cls = 'bg-red-500/20 text-red-200';
                    } else if (isPast) {
                      cls = 'bg-white/[0.03] text-white/20';
                    }
                    return (
                      <motion.div
                        key={d.date}
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        title={t(
                          'ramadan.dayCellTitle',
                          'Ramadan {{day}} — {{date}}{{oddNightNote}}',
                          {
                            day: d.dayNumber,
                            date: formatGregorian(d.date),
                            oddNightNote: oddNight
                              ? t('ramadan.oddNightSuffix', ' · odd night of the last ten ⭐')
                              : '',
                          }
                        )}
                        className={[
                          'relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5',
                          'cursor-default hover:z-10',
                          cls,
                          isToday ? 'ring-2 ring-brand-gold/80' : '',
                        ].join(' ')}
                      >
                        {/* Odd nights of the last ten pulse clearly — Laylat
                            al-Qadr is sought in them, so they must catch the
                            eye rather than whisper. */}
                        {oddNight && (
                          <motion.span
                            aria-hidden
                            className="absolute -inset-px rounded-xl border-2 pointer-events-none"
                            animate={{
                              borderColor: [
                                'rgba(192,132,252,0.35)',
                                'rgba(216,180,254,1)',
                                'rgba(192,132,252,0.35)',
                              ],
                              boxShadow: [
                                '0 0 2px rgba(168,85,247,0.25)',
                                '0 0 16px rgba(192,132,252,0.85)',
                                '0 0 2px rgba(168,85,247,0.25)',
                              ],
                            }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        )}
                        {oddNight && (
                          <span className="absolute top-1 left-1.5 text-[9px] leading-none text-brand-info/90">
                            ⭐
                          </span>
                        )}
                        {log?.tarawih && (
                          <span className="absolute top-1 right-1.5 text-[9px] leading-none">
                            🕌
                          </span>
                        )}

                        <span className="relative text-base sm:text-lg font-black leading-none">
                          {face}
                        </span>
                        {/* Gregorian anchor — nobody plans their week in hijri
                            alone, so each cell carries the civil date too. */}
                        <span className="relative text-[9px] leading-none text-white/40 font-semibold">
                          {weekdayShort(d.date)}
                        </span>
                        <span className="relative text-[9px] leading-none text-white/25 tabular-nums">
                          {gregorianShort(d.date)}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[10px] text-white/30">
            <span>✓ {t('ramadan.legendFasted', 'fasted')}</span>
            <span>💔 {t('ramadan.legendBroken', 'broken')}</span>
            <span>🌸 {t('ramadan.legendExcusedQada', 'excused → qaḍā')}</span>
            <span>🕌 {t('ramadan.legendTarawih', 'tarawih')}</span>
            <span className="text-brand-info/60">
              {t('ramadan.legendGlowing', 'glowing = odd night of last ten')}
            </span>
          </div>
          <p className="text-white/25 text-[10px] mt-2 leading-relaxed">
            <Trans
              i18nKey="ramadan.rayhanahAutoQadaNote"
              defaults="🌸 Rayhanah days are excused with zero guilt — when the cycle ends, those Ramadan days are offered to your qaḍā counter automatically (<1>Muslim 335</1>)."
            >
              🌸 Rayhanah days are excused with zero guilt — when the cycle ends, those Ramadan days
              are offered to your qaḍā counter automatically (
              <a
                className="underline"
                href="https://sunnah.com/muslim:335"
                target="_blank"
                rel="noreferrer"
              >
                {translateReference('Muslim 335', i18n.language)}
              </a>
              ).
            </Trans>
          </p>
        </div>

        {/* Every ḍaʿīf badge on this page is accounted for here — chain,
            defect, and who graded it (Istiak's rule). */}
        <DaifExplainer topics={['ramadan-ashra', 'nafl-fard-reward']} />
      </div>
    </AnimatedBackground>
  );
}
