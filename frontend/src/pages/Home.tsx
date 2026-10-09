import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import {
  MapPinIcon,
  ChevronRightIcon,
  BellIcon,
  BriefcaseIcon,
  BookOpenIcon,
  UserGroupIcon,
  CalculatorIcon,
  NoSymbolIcon,
  ClockIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import {
  CrescentIcon,
  DuaHandsIcon,
  FlowerIcon,
  LeafIcon,
  MosqueIcon,
  NamesMedallionIcon,
  OrnamentDivider,
  PrayerGlyph,
  Star8Icon,
  SunriseIcon,
  TasbihIcon,
} from '../components/icons/IslamicIcons.js';
import { useZikrStore } from '../store/useZikrStore.js';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { useSalatLog, useSalatAnalytics } from '../hooks/useSalatLog.js';
import { useFastingSummary } from '../hooks/useFasting.js';
import { useQuranSummary } from '../hooks/useQuran.js';
import { StreakBadge, GoalBadge } from '../components/StatusBadges.js';
import ComebackNudge from '../components/ComebackNudge.js';
import SadaqahVirtueCard from '../components/SadaqahVirtueCard.js';
import MusafirBanner from '../components/MusafirBanner.js';
import TodayHighlights from '../components/home/TodayHighlights.js';
import TodayTimeline from '../components/home/TodayTimeline.js';
import toast from 'react-hot-toast';
import {
  useMusafir,
  startMusafir,
  defaultSchool,
  suggestStartAfter,
  useTravelHint,
  dismissTravelHint,
} from '../utils/musafir.js';
import {
  calcPrayerTimes,
  formatTime,
  getMandatoryWidget,
  PRAYER_META,
  translateSalatName,
} from '../utils/prayerTimes.js';
import { formatLocaleDate, formatLocaleNumber } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';
import {
  formatHijriDate,
  getHijriToday,
  getTodaySpecialDays,
  isFriday,
} from '../utils/islamicCalendar.js';
import { getTodaySadaqahVirtueDay } from '../utils/sadaqahVirtueDays.js';
import { useCycleActive, useCycleSummary } from '../hooks/useCycle.js';
import { useUiStore } from '../store/useUiStore.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { getRamadanWindow } from '../utils/ramadan.js';
import { getFridayHour, FRIDAY_HOUR_REF } from '../utils/fridayHour.js';
import { HIGHLIGHT_CAP, orderHighlights, TODAY_SPECIAL_ID } from '../utils/homeSpecial.js';
import { useUpdateProfile, useUserProfile } from '../hooks/useUserProfile.js';
import {
  getFocusHabits,
  isOnboardedLocally,
  markOnboardedLocally,
  onboardingMode,
  orderByFocus,
} from '../utils/onboarding.js';

/** The prayer arch links to /prayer-times. With chips in its foot (the 'pills'
 * Home layout) it becomes a stretched link: an overlay link under the chips,
 * so each chip is its own link instead of a link nested in a link. */
function ArchShell({
  pills,
  label,
  children,
}: {
  pills: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (!pills)
    return (
      <Link to="/prayer-times" className="group block mb-4">
        {children}
      </Link>
    );
  return (
    <div className="group relative mb-4">
      {children}
      <Link to="/prayer-times" aria-label={label} className="absolute inset-0 rounded-arch" />
    </div>
  );
}

function localTodayForCycle(): string {
  return getTrackingDay();
}

interface ActivityItem {
  id: string;
  icon: (p: { className?: string }) => React.ReactNode;
  title: string;
  stats: { label: string; value: string | number };
  link: string;
  accent: string;
  border: string;
  tag?: string;
  streakCount?: number | null;
  goalCompleted?: boolean;
  /** 0-100 for the goal bar, when the activity has a daily goal. */
  progress?: number | null;
}

export default function Home() {
  const musafir = useMusafir();
  const rawTravelHint = useTravelHint(getTrackingDay(), !!musafir);
  const [hintDismissed, setHintDismissed] = useState(false);
  const travelHint = hintDismissed ? null : rawTravelHint;
  const { t, i18n } = useTranslation();
  const { counts = {}, hydrate } = useZikrStore();
  const location = useLocation();
  const navigate = useNavigate();

  // First-run setup (T3.3): new accounts go to the flow, older ones get a card.
  const { data: profile } = useUserProfile();
  const [setupDismissed, setSetupDismissed] = useState(isOnboardedLocally);
  const setupMode = onboardingMode(profile, setupDismissed);
  const updateProfile = useUpdateProfile();
  useEffect(() => {
    if (setupMode === 'flow') navigate('/welcome', { replace: true });
  }, [setupMode, navigate]);
  const dismissSetup = () => {
    markOnboardedLocally();
    setSetupDismissed(true);
    updateProfile.mutate({ onboarded: true });
  };
  const focusHabits = useMemo(
    () => getFocusHabits(),
    // Re-read when coming back from the setup screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- location.key is the trigger, not an input
    [location.key]
  );

  useEffect(() => {
    const doHydrate = () => hydrate?.();
    doHydrate();
    const onFocus = () => doHydrate();
    const onVisibility = () => {
      if (!document.hidden) doHydrate();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [location.pathname]);

  const { data: analyticsData } = useAnalytics(1);
  // Salat itself is civil-dated (see useSalatLog's own note), but the
  // dashboard card is titled "today" and must agree with what SalatTracker
  // shows for "today" — which follows the user's fajr-to-fajr tracking day.
  // Without this, the card silently rolled onto the new civil date right at
  // midnight, showing 0/5 for prayers already logged under the still-open
  // tracking day until the next Fajr.
  const { data: salatLog } = useSalatLog(getTrackingDay());
  const { data: fastingSummary } = useFastingSummary();
  const { data: quranSummary } = useQuranSummary();
  const { data: salatAnalytics } = useSalatAnalytics(90);

  const totalToday = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);
  const analyticsGoal = analyticsData?.goal?.dailyTarget ?? null;
  const streakCount = analyticsData?.streak?.currentStreak ?? null;
  // Show max(local, server) so the capsule never lags behind live taps
  const effectiveToday = Math.max(totalToday, analyticsData?.today?.total ?? 0);
  const goalCompleted = analyticsGoal !== null ? effectiveToday >= analyticsGoal : false;
  // Confirmed zero LIFETIME zikr count (not "zero today") — strict equality
  // against 0 means this stays false while analyticsData hasn't loaded yet,
  // so an existing user never sees a flash of the brand-new-user treatment.
  const isNewZikrUser = analyticsData?.allTime?.totalCount === 0;
  const zikrGoalPct =
    analyticsGoal && !isNewZikrUser
      ? Math.min(100, Math.round((effectiveToday / analyticsGoal) * 100))
      : null;
  // Bounded to the same 90-day window already fetched for the streak tag
  // below — an accepted approximation of "brand new," not true lifetime.
  const isNewSalatUser = salatAnalytics?.prayedTotal === 0;

  // Salat completed count for today
  const salatCompletedToday = useMemo(() => {
    if (!salatLog) return null;
    return PRAYER_META.filter((p) => p.isTrackable).filter((p) => {
      const s = salatLog.prayers[p.id as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha']?.status;
      return s === 'completed' || s === 'kaza';
    }).length;
  }, [salatLog]);

  // Prayer times widget state
  const [prayerNow, setPrayerNow] = useState(new Date());
  // Widget shows hours+minutes only — 60s granularity is sufficient.
  useEffect(() => {
    const t = setInterval(() => setPrayerNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const todaySpecialDays = useMemo(() => getTodaySpecialDays(), []);
  const sadaqahVirtueDay = useMemo(() => getTodaySadaqahVirtueDay(), []);

  const prayerWidgetData = useMemo(() => {
    const stored = localStorage.getItem('bustandeen_location');
    if (!stored) return null;
    try {
      const loc = JSON.parse(stored) as { latitude: number; longitude: number };
      const times = calcPrayerTimes(loc.latitude, loc.longitude, prayerNow);
      const widget = getMandatoryWidget(times, prayerNow);

      // "Ends in" countdown for the currently active state
      const endTarget =
        widget.forbiddenWindow?.end ?? widget.currentMandatoryEnd ?? widget.naflWindow?.end;
      let endHh = 0,
        endMm = 0;
      if (endTarget) {
        const sec = Math.max(0, Math.floor((endTarget.getTime() - prayerNow.getTime()) / 1000));
        endHh = Math.floor(sec / 3600);
        endMm = Math.floor((sec % 3600) / 60);
      }
      return { ...widget, times, endHh, endMm };
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [prayerNow.getMinutes()]); // recalc every minute is enough for widget

  const cycleActive = useCycleActive();
  const { data: cycleSummary } = useCycleSummary();
  const discreetMode = useUiStore((s) => s.discreetMode);
  // The whole ummah counts down to Ramadan — a small pill on the fasting card
  const ramadan = useMemo(() => getRamadanWindow(), []);
  // Friday specials — reuse the same minute tick that drives the prayer widget
  const isFridayToday = useMemo(() => isFriday(), []);
  const fridayHour = useMemo(
    () => getFridayHour(prayerWidgetData?.times.asr, prayerWidgetData?.times.maghrib, prayerNow),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
    [prayerNow.getMinutes()]
  );

  // Settings → Home: how much of today's special days shows up top. Chips in
  // the arch need the arch, so without a location they fall back to the strip.
  const homeSpecialLayout = useUiStore((s) => s.homeSpecialLayout);
  const homeAdhkar = useUiStore((s) => s.homeAdhkar);
  const homeLayout =
    homeSpecialLayout === 'pills' && !prayerWidgetData ? 'strip' : homeSpecialLayout;
  const highlights = useMemo(
    () =>
      orderHighlights(
        todaySpecialDays.map((d) => d.id),
        fridayHour
      ),
    [todaySpecialDays, fridayHour]
  );
  const archPills = homeLayout === 'pills' && highlights.length > 0;
  // Days already shown up top (strip rows or arch chips) are not repeated in
  // the detailed block; "N more" scrolls down to the rest.
  const shownUpTop = new Set(
    homeLayout === 'full'
      ? []
      : highlights.slice(0, HIGHLIGHT_CAP).flatMap((h) => (h.kind === 'day' ? [h.id] : []))
  );
  const blockDays = todaySpecialDays.filter((d) => !shownUpTop.has(d.id));
  const hasSpecialBlock =
    blockDays.length > 0 || !!sadaqahVirtueDay || fridayHour.active || isFridayToday;

  // Gentle heads-up when the predicted period is ≤3 days away (female only)
  const upcomingCycleDays = (() => {
    const ns = cycleSummary?.prediction?.nextStart;
    if (!ns || cycleActive) return null;
    const diff = Math.round(
      (new Date(ns + 'T12:00:00').getTime() -
        new Date(localTodayForCycle() + 'T12:00:00').getTime()) /
        86_400_000
    );
    return diff >= 0 && diff <= 3 ? diff : null;
  })();

  const activities: ActivityItem[] = [
    {
      id: 'zikr',
      icon: TasbihIcon,
      title: t('home.zikrTitle'),
      stats: { label: t('home.today'), value: formatLocaleNumber(effectiveToday) },
      link: '/zikr',
      accent: 'brand-emerald',
      border: 'border-brand-emerald/15',
      streakCount,
      goalCompleted,
      progress: zikrGoalPct,
    },
    {
      id: 'salat',
      icon: MosqueIcon,
      title: t('home.salatTitle'),
      stats: cycleActive
        ? { label: t('home.rayhanah'), value: t('home.excused') }
        : isNewSalatUser
          ? { label: t('home.today'), value: t('home.salatStart', 'Tap to begin') }
          : {
              label: t('home.today'),
              value:
                salatCompletedToday !== null
                  ? `${formatLocaleNumber(salatCompletedToday)}/${formatLocaleNumber(5)}`
                  : `-/${formatLocaleNumber(5)}`,
            },
      link: '/salat',
      progress:
        !cycleActive && salatCompletedToday !== null
          ? Math.round((salatCompletedToday / 5) * 100)
          : null,
      accent: 'brand-info',
      border: 'border-brand-info/15',
      tag: salatAnalytics?.currentStreak
        ? `${formatLocaleNumber(salatAnalytics.currentStreak)}${t('home.daySuffix', 'd')} · ${t('home.all5', 'all 5')}`
        : undefined,
    },
    {
      id: 'fasting',
      icon: CrescentIcon,
      title: t('home.fastingTitle'),
      stats: cycleActive
        ? { label: t('home.rayhanah'), value: t('home.excused') }
        : {
            label: t('home.thisMonth'),
            value: fastingSummary
              ? `${formatLocaleNumber(fastingSummary.stats.thisMonth)} ${t('home.fasts')}`
              : '-',
          },
      link: '/fasting',
      accent: 'brand-gold',
      border: 'border-brand-gold/15',
    },
    {
      id: 'quran',
      icon: BookOpenIcon,
      title: t('home.quranTitle'),
      stats: {
        label: t('home.today'),
        value: quranSummary
          ? `${formatLocaleNumber(quranSummary.todayAyat)}/${formatLocaleNumber(quranSummary.profile.dailyGoalAyat)} āyāt`
          : '-',
      },
      link: '/quran',
      accent: 'brand-info',
      border: 'border-brand-info/15',
      streakCount: quranSummary?.streak ?? null,
      progress:
        quranSummary && quranSummary.profile.dailyGoalAyat > 0
          ? Math.min(
              100,
              Math.round((quranSummary.todayAyat / quranSummary.profile.dailyGoalAyat) * 100)
            )
          : null,
    },
  ];

  const ends = (h: number, m: number) =>
    `${h > 0 ? `${formatLocaleNumber(h)}h ` : ''}${formatLocaleNumber(m)}m`;
  const prayerName = (id: string) =>
    translateSalatName(id, PRAYER_META.find((p) => p.id === id)?.name ?? '', t);

  // Today's date lives in the arch (it used to sit in the navbar).
  const hijriToday = (() => {
    const h = getHijriToday();
    return h ? formatHijriDate(h) : null;
  })();
  const todayDate = (
    <p className="text-[11px] text-white/60 font-medium">
      {formatLocaleDate(prayerNow, { weekday: 'short', month: 'short', day: 'numeric' })}
      {hijriToday && (
        <>
          <span aria-hidden> · </span>
          <span className="text-brand-gold/90">{hijriToday}</span>
        </>
      )}
    </p>
  );

  // The countdown belongs to what is on now, so it sits with it, above the
  // line that separates "now" from "next". ʿIshāʾ: the preferred time runs to
  // Islamic midnight (Sahih Muslim 612a), then it counts down to Fajr.
  const hasCountdown =
    !!prayerWidgetData && (prayerWidgetData.endHh > 0 || prayerWidgetData.endMm > 0);
  const countdown = prayerWidgetData && hasCountdown && (
    <p className="text-sm text-white/70 mt-1">
      {prayerWidgetData.ishaBest ? (
        <Trans
          i18nKey="home.bestTimeLeft"
          defaults="Best time: <1>{{left}}</1> left"
          values={{ left: ends(prayerWidgetData.endHh, prayerWidgetData.endMm) }}
          components={{ 1: <b className="tabular-nums text-brand-gold" /> }}
        />
      ) : (
        <>
          {t('home.endsIn')}{' '}
          <b
            className={`tabular-nums ${
              prayerWidgetData.forbiddenWindow ? 'text-red-400' : 'text-brand-gold'
            }`}
          >
            {ends(prayerWidgetData.endHh, prayerWidgetData.endMm)}
          </b>
        </>
      )}
    </p>
  );

  const library = [
    {
      Icon: DuaHandsIcon,
      to: '/library/duas',
      title: t('home.libraryDuaTitle'),
      subtitle: t('home.libraryDuaSubtitle'),
    },
    {
      Icon: SunriseIcon,
      to: '/library/adhkar',
      title: t('home.libraryAdhkarTitle'),
      subtitle: t('home.libraryAdhkarSubtitle'),
    },
    {
      Icon: NamesMedallionIcon,
      to: '/library/asma-ul-husna',
      title: t('home.libraryAsmaTitle'),
      subtitle: t('home.libraryAsmaSubtitle'),
    },
    {
      Icon: CalculatorIcon,
      to: '/library/zakat-calculator',
      title: t('home.libraryZakatTitle'),
      subtitle: t('home.libraryZakatSubtitle'),
    },
  ];

  // Bustan Arch (audit T3.2): one arch hero (the prayer window), flat cards
  // with two radii and theme elevations, SVG icons only, no glows.
  // The detailed special-day block (rows, sadaqah virtue, Friday hour, al-Kahf).
  // Under the arch for the 'full' Home layout, below the worship cards otherwise.
  const specialBlock = hasSpecialBlock ? (
    <div id={TODAY_SPECIAL_ID} className="scroll-mt-24">
      {blockDays.length > 0 && (
        <div className="mb-4 space-y-2">
          {blockDays.map((day) => (
            <Link key={day.id} to={`/special-day/${day.id}`} className="block">
              <div className="flex items-center gap-3 px-4 py-3 rounded-card border border-brand-border/70 bg-brand-deep shadow-elev-1 hover:border-brand-gold/40 hover:shadow-hover transition-[border-color,box-shadow]">
                <Star8Icon className="w-6 h-6 shrink-0 text-brand-gold" />
                <div className="min-w-0 flex-1">
                  <p className="text-white font-bold text-sm leading-tight">
                    {t(`specialDays.${day.id}.name`, day.name)}
                  </p>
                  <p className="text-white/60 text-xs leading-snug truncate mt-0.5">
                    {t(`specialDays.${day.id}.shortDesc`, day.shortDesc)}
                  </p>
                </div>
                <ChevronRightIcon className="w-4 h-4 shrink-0 text-white/40" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Days with extra sadaqah virtue (Friday, Ramadan, first 10 days of
          Dhul Hijjah, Arafah, Laylat al-Qadr): persistent, unlike the old
          30s-auto-dismissing Friday-only reminder this replaces. */}
      {sadaqahVirtueDay && <SadaqahVirtueCard day={sadaqahVirtueDay} />}

      {/* Friday: hour of response (Abū Dāwūd 1048, ṣaḥīḥ) */}
      {fridayHour.active && (
        <div
          className={`mb-4 rounded-card border p-4 shadow-elev-1 ${
            fridayHour.isFinalStretch
              ? 'border-brand-gold/60 bg-brand-gold/[0.12]'
              : 'border-brand-gold/25 bg-brand-gold/[0.06]'
          }`}
        >
          <div className="flex items-start gap-3">
            <DuaHandsIcon className="w-6 h-6 shrink-0 text-brand-gold" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="font-display text-brand-gold font-semibold text-base">
                  {fridayHour.isFinalStretch ? t('home.fridayHourNow') : t('home.fridayHourTitle')}
                </h2>
                <span className="text-brand-gold text-xs font-bold tabular-nums">
                  {fridayHour.countdown} {t('home.toMaghrib')}
                </span>
              </div>
              <p className="text-white/70 text-xs mt-1.5 leading-relaxed">
                {t(
                  'home.fridayHourQuote',
                  '"{{text}}" Keep asking until the sun sets: for yourself, your parents, and the ummah.',
                  {
                    text: i18n.language === 'bn' ? FRIDAY_HOUR_REF.textBn : FRIDAY_HOUR_REF.text,
                  }
                )}
              </p>
              <a
                href={FRIDAY_HOUR_REF.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-white/60 hover:text-brand-gold underline underline-offset-2 mt-2 inline-block"
              >
                {translateReference(FRIDAY_HOUR_REF.source, i18n.language)} ·{' '}
                {translateReference(FRIDAY_HOUR_REF.grade, i18n.language)} ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Friday: Surah al-Kahf, one tap into the reader */}
      {isFridayToday && (
        <button
          onClick={() => navigate('/quran/read/18?mode=single')}
          className="mb-4 w-full text-left rounded-card border border-brand-emerald/30 bg-brand-emerald/[0.07] shadow-elev-1 p-4 hover:border-brand-emerald/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <BookOpenIcon className="w-6 h-6 shrink-0 text-brand-emerald" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-brand-emerald font-semibold text-base">
                {t('home.fridayKahf')}
              </h2>
              <p className="text-white/70 text-xs mt-1 leading-relaxed">
                "{t('home.fridayKahfQuote', 'A light will shine for him between the two Fridays.')}"
              </p>
              <p className="text-white/60 text-[11px] mt-1">
                {translateReference('Ṣaḥīḥ at-Targhīb 736 · Ṣaḥīḥ', i18n.language)}
              </p>
            </div>
            <ChevronRightIcon className="w-5 h-5 shrink-0 text-brand-emerald" />
          </div>
        </button>
      )}
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-brand-void">
      <h1 className="sr-only">{t('home.srTitle', 'Bustandeen, Islamic Productivity')}</h1>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome back after a quiet stretch, the gentlest possible restart */}
        <div className="mb-5 empty:mb-0">
          <ComebackNudge />
        </div>

        {setupMode === 'card' && (
          <section
            className="mb-5 rounded-card border border-brand-emerald/30 bg-brand-deep shadow-elev-2 p-4"
            aria-labelledby="home-setup-title"
            data-testid="home-setup-card"
          >
            <div className="flex items-start gap-3">
              <LeafIcon className="w-6 h-6 shrink-0 text-brand-emerald mt-0.5" />
              <div className="min-w-0 flex-1">
                <h2
                  id="home-setup-title"
                  className="font-display text-white font-semibold text-base"
                >
                  {t('home.setupTitle', 'Make Bustandeen yours')}
                </h2>
                <p className="text-white/70 text-xs mt-1 leading-relaxed">
                  {t(
                    'home.setupDetail',
                    'Your prayer times, your madhab and the habits you want to grow first. About a minute.'
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Link
                    to="/welcome"
                    className="btn-solid inline-flex items-center justify-center rounded-control px-4 py-2 min-h-[44px] text-sm font-bold text-on-color bg-brand-emerald-dim hover:brightness-110 shadow-elev-1"
                  >
                    {t('home.setupStart', 'Set up')}
                  </Link>
                  <button
                    onClick={dismissSetup}
                    className="px-3 min-h-[44px] text-white/70 hover:text-white text-sm underline underline-offset-2"
                  >
                    {t('home.setupDismiss', 'No thanks')}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Pre-period heads-up: predicted start within 3 days */}
        {upcomingCycleDays !== null && (
          <Link to="/cycle" className="block mb-4">
            <div
              className={`flex items-center gap-3 rounded-card border px-4 py-3 shadow-elev-1 transition-colors ${
                discreetMode
                  ? 'border-brand-border bg-brand-deep hover:border-white/20'
                  : 'border-brand-pink/25 bg-brand-pink/10 hover:border-brand-pink/40'
              }`}
            >
              {discreetMode ? (
                <BellIcon className="w-6 h-6 shrink-0 text-white/60" />
              ) : (
                <FlowerIcon className="w-6 h-6 shrink-0 text-brand-pink" />
              )}
              <div className="min-w-0">
                <p
                  className={`font-bold text-sm ${discreetMode ? 'text-white/80' : 'text-brand-pink'}`}
                >
                  {discreetMode
                    ? t('home.discreetPrePeriod', 'Something to check')
                    : upcomingCycleDays === 0
                      ? t('home.periodMayBegin')
                      : upcomingCycleDays! > 1
                        ? t('home.periodMayBeginInPlural', { days: upcomingCycleDays })
                        : t('home.periodMayBeginIn', { days: upcomingCycleDays })}
                </p>
                <p className="text-white/50 text-xs mt-0.5">
                  {discreetMode
                    ? t('home.discreetOpenWellness', 'Open Wellness')
                    : t('home.openRayhanah')}
                </p>
              </div>
            </div>
          </Link>
        )}

        {/* Rayhanah days banner: female users with an active cycle */}
        {cycleActive && (
          <Link to="/cycle" className="block mb-4">
            <div
              className={`flex items-center gap-3 rounded-card border px-4 py-3.5 shadow-elev-1 transition-colors ${
                discreetMode
                  ? 'border-brand-border bg-brand-deep hover:border-white/20'
                  : 'border-brand-pink/25 bg-brand-pink/10 hover:border-brand-pink/40'
              }`}
            >
              {discreetMode ? (
                <LeafIcon className="w-6 h-6 shrink-0 text-brand-emerald" />
              ) : (
                <FlowerIcon className="w-6 h-6 shrink-0 text-brand-pink" />
              )}
              <div className="min-w-0">
                <p
                  className={`font-bold text-sm ${discreetMode ? 'text-white/80' : 'text-brand-pink'}`}
                >
                  {discreetMode
                    ? t('home.discreetActiveDay', 'Wellness mode, day {{day, number}}', {
                        day: cycleActive.dayCount,
                      })
                    : t('home.rayhanahDay', { day: cycleActive.dayCount })}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  {discreetMode
                    ? t('home.discreetActiveDetail', 'Some trackers are paused today.')
                    : t('home.rayhanahDetail')}
                </p>
              </div>
            </div>
          </Link>
        )}

        {/* Hero: the prayer window, under the screen's one arch */}
        {prayerWidgetData ? (
          <ArchShell pills={archPills} label={t('nav.prayerTimes')}>
            <div className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-8 pb-5 text-center group-hover:border-brand-emerald/40 transition-colors">
              <div className="mb-2">{todayDate}</div>
              {prayerWidgetData.forbiddenWindow ? (
                <>
                  <NoSymbolIcon className="w-7 h-7 mx-auto text-red-400" />
                  <p className="mt-2 text-[11px] uppercase tracking-widest font-bold text-red-400">
                    {t('home.forbiddenTime')}
                  </p>
                  <p className="font-display text-2xl font-semibold text-red-300 leading-tight mt-0.5">
                    {prayerWidgetData.forbiddenWindow.label.replace('Forbidden — ', '')}
                  </p>
                  <p className="text-white/60 text-sm mt-1">
                    {t('common.ends')} {formatTime(prayerWidgetData.forbiddenWindow.end)} ·{' '}
                    {t('home.noPrayer')}
                  </p>
                  {countdown}
                </>
              ) : prayerWidgetData.currentMandatory ? (
                <>
                  <PrayerGlyph
                    id={prayerWidgetData.currentMandatory}
                    className="w-7 h-7 mx-auto text-brand-gold"
                  />
                  <p className="mt-2 text-[11px] uppercase tracking-widest font-bold text-white/60">
                    {t('home.current')}
                  </p>
                  <p className="font-display text-3xl font-semibold text-white leading-tight mt-0.5">
                    {prayerName(prayerWidgetData.currentMandatory)}
                  </p>
                  <p className="text-white/60 text-sm mt-1">
                    {prayerWidgetData.ishaBest
                      ? t('home.bestUntil', 'Best until {{time}}', {
                          time: formatTime(prayerWidgetData.currentMandatoryEnd!),
                        })
                      : prayerWidgetData.ishaBest === false
                        ? t('home.endsAtFajr', 'Ends at Fajr, {{time}}', {
                            time: formatTime(prayerWidgetData.currentMandatoryEnd!),
                          })
                        : `${t('common.ends')} ${formatTime(prayerWidgetData.currentMandatoryEnd!)}`}
                  </p>
                  {countdown}
                  {/* Nafl alongside mandatory (Awabeen during Maghrib, Tahajjud during Isha) */}
                  {prayerWidgetData.naflWindow && (
                    <p className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full border border-brand-warm/30 text-brand-warm text-xs font-semibold">
                      <PrayerGlyph id={prayerWidgetData.naflWindow.id} className="w-3.5 h-3.5" />
                      {translateSalatName(
                        prayerWidgetData.naflWindow.id,
                        prayerWidgetData.naflWindow.name,
                        t
                      )}{' '}
                      {t('common.time')} · {t('common.until')}{' '}
                      {formatTime(prayerWidgetData.naflWindow.end)}
                    </p>
                  )}
                </>
              ) : prayerWidgetData.naflWindow ? (
                <>
                  <PrayerGlyph
                    id={prayerWidgetData.naflWindow.id}
                    className="w-7 h-7 mx-auto text-brand-info"
                  />
                  <p className="mt-2 text-[11px] uppercase tracking-widest font-bold text-brand-info">
                    {t('home.naflTime')}
                  </p>
                  <p className="font-display text-3xl font-semibold text-white leading-tight mt-0.5">
                    {translateSalatName(
                      prayerWidgetData.naflWindow.id,
                      prayerWidgetData.naflWindow.name,
                      t
                    )}
                  </p>
                  <p className="text-white/60 text-sm mt-1">
                    {formatTime(prayerWidgetData.naflWindow.start)} -{' '}
                    {formatTime(prayerWidgetData.naflWindow.end)}
                  </p>
                  {countdown}
                </>
              ) : (
                <>
                  <ClockIcon className="w-7 h-7 mx-auto text-white/60" />
                  <p className="mt-2 text-[11px] uppercase tracking-widest font-bold text-white/60">
                    {t('home.freeTime')}
                  </p>
                  <p className="font-display text-2xl font-semibold text-white leading-tight mt-0.5">
                    {t('home.nextPrayerComing')}
                  </p>
                </>
              )}

              {/* The line separates what is on now from the next prayer */}
              <div className="mt-4 pt-3 border-t border-brand-border/70 flex flex-col items-center gap-1 text-sm">
                <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5 text-white/60">
                  <PrayerGlyph
                    id={prayerWidgetData.nextMandatory}
                    className="w-4 h-4 text-brand-emerald"
                  />
                  {t('home.next')}{' '}
                  <b className="text-brand-emerald">{prayerName(prayerWidgetData.nextMandatory)}</b>{' '}
                  {formatTime(prayerWidgetData.nextMandatoryTime)}
                  <span className="text-white/50">
                    ({t('common.in')} {ends(prayerWidgetData.nextHh, prayerWidgetData.nextMm)})
                  </span>
                </span>
              </div>
              {salatLog && (
                <ul
                  className="flex justify-center gap-3 mt-3"
                  aria-label={t('home.timelineTitle', "Today's prayers")}
                >
                  {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((id) => {
                    const st = salatLog.prayers[id]?.status;
                    const done = st === 'completed' || st === 'kaza';
                    return (
                      <li key={id} className="flex flex-col items-center gap-1">
                        <span
                          className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center ${
                            done
                              ? 'bg-brand-emerald-dim border-brand-emerald-dim'
                              : id === prayerWidgetData.currentMandatory
                                ? 'border-brand-emerald ring-2 ring-brand-emerald/20'
                                : 'border-brand-border'
                          }`}
                        >
                          {done && <CheckIcon className="w-3.5 h-3.5 text-on-color" />}
                        </span>
                        <span className="text-[10px] font-bold text-white/70">
                          {prayerName(id)}
                          <span className="sr-only">
                            {' '}
                            {done ? t('home.timelineDone', 'Done') : ''}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {archPills && (
                <TodayHighlights
                  variant="pills"
                  highlights={highlights}
                  days={todaySpecialDays}
                  fridayCountdown={fridayHour.countdown}
                />
              )}
            </div>
          </ArchShell>
        ) : (
          /* No location stored: send to the prayer-times page, which
           * offers "use my location" and manual city search side by side.
           * Deliberately NOT a native geolocation prompt fired straight
           * from this button: the user should see and choose between both
           * options before any permission dialog appears. */
          <Link to="/prayer-times" className="block mb-4">
            <div className="mb-2 text-center">{todayDate}</div>
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-card border border-dashed border-brand-border bg-brand-deep hover:border-brand-emerald/40 hover:shadow-hover transition-[border-color,box-shadow]">
              <div className="flex items-center gap-3 min-w-0">
                <MapPinIcon className="w-6 h-6 text-brand-emerald shrink-0" />
                <div className="min-w-0">
                  <p className="text-white/80 font-semibold text-sm leading-none mb-1">
                    {t('home.enablePrayerTimes')}
                  </p>
                  <p className="text-white/50 text-xs">{t('home.enablePrayerTimesDetail')}</p>
                </div>
              </div>
              <span className="text-brand-emerald text-xs font-semibold shrink-0">
                {t('home.setLocation')}
              </span>
            </div>
          </Link>
        )}

        {/* Musafir mode: the journey at a glance */}
        {musafir ? (
          <div className="mb-4">
            <MusafirBanner state={musafir} today={getTrackingDay()} variant="home" />
          </div>
        ) : (
          travelHint && (
            // Off, but the device is already past the qaṣr distance from the
            // saved prayer-times location (only checked when location
            // permission was already granted, see useTravelHint).
            <div className="mb-4 flex items-center gap-3 rounded-card border border-brand-info/30 bg-brand-info/[0.08] px-4 py-3">
              <BriefcaseIcon className="w-6 h-6 shrink-0 text-brand-info" />
              <Link to="/musafir" className="min-w-0 flex-1">
                <span className="block text-white/85 font-bold text-sm leading-tight">
                  {t('home.musafirHintTitle', 'Travelling?')}
                </span>
                <span className="block text-white/60 text-xs mt-0.5 leading-snug">
                  {travelHint.from
                    ? t('home.musafirHintDesc', 'You are about {{km}} km from {{place}}.', {
                        km: formatLocaleNumber(travelHint.km),
                        place: travelHint.from,
                      })
                    : t(
                        'home.musafirHintDescNoName',
                        'You are about {{km}} km from your saved location.',
                        {
                          km: formatLocaleNumber(travelHint.km),
                        }
                      )}
                </span>
              </Link>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    const today = getTrackingDay();
                    startMusafir({
                      today,
                      startAfter: suggestStartAfter(today),
                      school: defaultSchool(),
                    });
                    toast.success(t('home.musafirStarted', 'Safe travels! Musafir mode is on.'), {
                      icon: <BriefcaseIcon className="w-5 h-5 text-brand-info" />,
                    });
                  }}
                  className="px-3 py-1.5 rounded-control text-xs font-bold bg-brand-info/20 border border-brand-info/60 text-brand-info hover:bg-brand-info/30"
                >
                  {t('home.musafirTurnOn', 'Turn on')}
                </motion.button>
                <button
                  onClick={() => {
                    dismissTravelHint(getTrackingDay());
                    setHintDismissed(true);
                  }}
                  className="text-white/50 text-[11px] underline hover:text-white/70"
                >
                  {t('home.musafirHintDismiss', 'Not now')}
                </button>
              </div>
            </div>
          )
        )}

        {prayerWidgetData && (
          <TodayTimeline
            times={prayerWidgetData.times}
            now={prayerNow}
            log={salatLog}
            excused={!!cycleActive}
            travelling={!!musafir}
            showAdhkar={homeAdhkar}
          />
        )}

        {homeLayout === 'strip' && (
          <TodayHighlights
            variant="strip"
            highlights={highlights}
            days={todaySpecialDays}
            fridayCountdown={fridayHour.countdown}
          />
        )}
        {homeLayout === 'full' && specialBlock}

        {/* Today's goals, in the order of the habits chosen at setup */}
        <h2 className="font-display text-base font-semibold text-white mb-2">
          {t('home.goalsTitle', "Today's goals")}
        </h2>
        <div className="grid gap-3 mb-2" data-testid="today-goals">
          {orderByFocus(activities, focusHabits).map((a) => {
            const isZikr = a.id === 'zikr';
            const Icon = a.icon;
            return (
              <Link key={a.id} to={a.link} className="block group">
                <div className="h-full rounded-card border border-brand-border/70 bg-brand-deep shadow-elev-1 p-3.5 sm:p-4 hover:border-brand-emerald/40 hover:shadow-hover transition-[border-color,box-shadow]">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5 shrink-0 text-brand-emerald" />
                    <h3 className="font-display text-sm sm:text-base font-semibold text-white flex-1 min-w-0 truncate">
                      {a.title}
                    </h3>
                    <ChevronRightIcon className="w-4 h-4 shrink-0 text-white/40 group-hover:text-white/70 transition-colors" />
                  </div>
                  <div className="flex items-baseline flex-wrap gap-x-2">
                    <span className="font-display text-xl sm:text-2xl font-semibold text-white tabular-nums">
                      {a.stats.value}
                    </span>
                    <span className="text-white/50 text-[11px] font-semibold uppercase tracking-wide">
                      {a.stats.label}
                    </span>
                  </div>
                  {a.progress != null && (
                    <div
                      className="h-1.5 rounded-full bg-brand-border overflow-hidden mt-2"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={a.progress}
                      aria-label={a.title}
                    >
                      <span
                        className="block h-full bg-brand-emerald rounded-full"
                        style={{ width: `${a.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Badges: streak, goal, Ramadan */}
                  {(isZikr || a.id === 'quran' || a.tag || a.id === 'fasting') && (
                    <div className="mt-2.5 pt-2 border-t border-brand-border/60 flex flex-wrap items-center gap-1.5">
                      {isZikr && (
                        <>
                          <StreakBadge
                            streak={a.streakCount ?? 0}
                            state={analyticsData?.streak?.state}
                            size="sm"
                          />
                          <GoalBadge pct={zikrGoalPct} met={goalCompleted} size="sm" />
                        </>
                      )}
                      {/* A streak is only meaningful against a goal the user
                          actually set: with none, "streak" would just be
                          "days read at all," which isn't what this badge
                          communicates elsewhere (zikr/salat always have an
                          implicit goal). */}
                      {a.id === 'quran' &&
                        quranSummary &&
                        quranSummary.profile.dailyGoalAyat > 0 && (
                          <StreakBadge
                            streak={quranSummary.streak}
                            state={quranSummary.streak > 0 ? 'active' : 'none'}
                            size="sm"
                          />
                        )}
                      {a.tag && (
                        <StreakBadge
                          streak={salatAnalytics?.currentStreak ?? 0}
                          state={salatAnalytics?.currentStreak ? 'active' : 'none'}
                          size="sm"
                        />
                      )}
                      {a.id === 'fasting' && (
                        <button
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-control text-[11px] font-bold text-brand-gold border border-brand-gold/40 bg-brand-gold/10 hover:bg-brand-gold/20 transition-colors"
                          title={
                            ramadan.active ? 'Open the Ramadan tracker' : 'Countdown to Ramadan'
                          }
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate('/ramadan');
                          }}
                        >
                          <CrescentIcon className="w-3.5 h-3.5" />
                          {ramadan.active
                            ? t('home.ramadanDay', {
                                day: formatLocaleNumber(ramadan.todayNumber ?? 0),
                              })
                            : t('home.ramadanIn', { days: formatLocaleNumber(ramadan.daysUntil) })}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Today's special days, Friday cards and sadaqah virtue: here unless
            the Home layout setting puts the full block under the arch */}
        {homeLayout !== 'full' && hasSpecialBlock && (
          <>
            <OrnamentDivider className="my-5" />
            {specialBlock}
          </>
        )}

        <OrnamentDivider className="my-5" />

        {/* Friends */}
        <Link to="/friends" className="block group mb-6">
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-card border border-brand-border/70 bg-brand-deep shadow-elev-1 hover:border-brand-gold/40 hover:shadow-hover transition-[border-color,box-shadow]">
            <UserGroupIcon className="w-6 h-6 shrink-0 text-brand-gold" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-white">{t('home.friendsTitle')}</h2>
              <p className="text-white/60 text-xs truncate">{t('home.friendsSubtitle')}</p>
            </div>
            <span className="shrink-0 text-brand-gold text-xs font-bold">{t('home.compete')}</span>
          </div>
        </Link>

        {/* Islamic library: one-stop utilities */}
        <div className="mb-8">
          <div className="mb-3">
            <h2 className="font-display text-base font-semibold text-white">
              {t('home.libraryTitle')}
            </h2>
            <p className="text-white/60 text-xs">{t('home.librarySubtitle')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {library.map(({ Icon, to, title, subtitle }) => (
              <Link key={to} to={to} className="block group">
                <div className="h-full rounded-card border border-brand-border/70 bg-brand-deep shadow-elev-1 p-4 hover:border-brand-emerald/40 hover:shadow-hover transition-[border-color,box-shadow]">
                  <Icon className="w-6 h-6 text-brand-emerald" />
                  <h3 className="text-sm font-bold text-white mt-2 truncate">{title}</h3>
                  <p className="text-white/60 text-xs mt-0.5 truncate">{subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-white/50 pb-4">{t('home.footer')}</div>
      </div>
    </div>
  );
}
