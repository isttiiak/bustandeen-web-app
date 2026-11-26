import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useZikrStore } from '../../store/useZikrStore.js';
import { useAnalytics } from '../../hooks/useAnalytics.js';
import { useSalatLog, useSalatAnalytics } from '../../hooks/useSalatLog.js';
import { useFastingSummary } from '../../hooks/useFasting.js';
import { useQuranSummary } from '../../hooks/useQuran.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { getHomeGoals, goalRows, goalsCardShown, homeSections } from '../../utils/homeSections.js';
import { useMusafir, useTravelHint } from '../../utils/musafir.js';
import { calcPrayerTimes, getMandatoryWidget, PRAYER_META } from '../../utils/prayerTimes.js';
import { getTodaySpecialDays, isFriday } from '../../utils/islamicCalendar.js';
import { getTodaySadaqahVirtueDay } from '../../utils/sadaqahVirtueDays.js';
import { useCycleActive, useCycleSummary } from '../../hooks/useCycle.js';
import { useUiStore } from '../../store/useUiStore.js';
import { getTrackingDay } from '../../utils/trackingDay.js';
import { getRamadanWindow } from '../../utils/ramadan.js';
import { getFridayHour } from '../../utils/fridayHour.js';
import { HIGHLIGHT_CAP, orderHighlights } from '../../utils/homeSpecial.js';
import { useUpdateProfile, useUserProfile } from '../../hooks/useUserProfile.js';
import {
  isOnboardedLocally,
  markOnboardedLocally,
  onboardingMode,
} from '../../utils/onboarding.js';

function localTodayForCycle(): string {
  return getTrackingDay();
}

/** Home's queries, its minute clock and everything derived from them. */
export function useHomeData() {
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const musafir = useMusafir();
  const rawTravelHint = useTravelHint(getTrackingDay(), !!musafir);
  const [hintDismissed, setHintDismissed] = useState(false);
  const travelHint = hintDismissed ? null : rawTravelHint;
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
  // The per-habit sections (T3.4 E) in the habit order; Salat = the timeline.
  const sections = useMemo(
    () => homeSections(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- location.key is the trigger, not an input
    [location.key]
  );
  // Today's goals card (U5): on/off, its own row order, rows, badges.
  const goals = useMemo(
    () => {
      const g = getHomeGoals();
      return { shown: goalsCardShown(g), rows: goalRows(g), badges: g.badges };
    },
    // Re-read when coming back from Settings or the setup screen.
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
  }, [location.pathname, hydrate]);

  const { data: analyticsData } = useAnalytics(1);
  // Salat is dated by the tracking day (see useSalatLog), and the dashboard
  // card must agree with what SalatTracker shows for "today". A civil date
  // here would roll the card onto the next day right at midnight, showing 0/5
  // for prayers already logged under the still-open tracking day.
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
  // Lifetime, not "since the fresh start": a reset must not look like a new user.
  const isNewZikrUser =
    (analyticsData?.allTime?.lifetime?.totalCount ?? analyticsData?.allTime?.totalCount) === 0;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalculate once a minute: the minute of prayerNow stands in for prayerNow itself, which is a new Date on every tick
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalculate once a minute with the widget: the minute of prayerNow stands in for prayerNow, and the asr and maghrib times only change with the widget data
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

  return {
    isDemoMode,
    musafir,
    travelHint,
    setHintDismissed,
    setupMode,
    dismissSetup,
    sections,
    goals,
    salatLog,
    fastingSummary,
    quranSummary,
    salatAnalytics,
    analyticsData,
    analyticsGoal,
    effectiveToday,
    streakCount,
    goalCompleted,
    zikrGoalPct,
    isNewSalatUser,
    salatCompletedToday,
    prayerNow,
    todaySpecialDays,
    sadaqahVirtueDay,
    prayerWidgetData,
    cycleActive,
    discreetMode,
    ramadan,
    isFridayToday,
    fridayHour,
    homeAdhkar,
    homeLayout,
    highlights,
    archPills,
    blockDays,
    hasSpecialBlock,
    upcomingCycleDays,
  };
}

export type HomeState = ReturnType<typeof useHomeData>;
