import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore.js';
import {
  useSalatLog,
  useUpdatePrayer,
  useUpdateNafl,
  useSalatAnalytics,
  useSalatDebt,
  useSetSalatDebt,
  type PrayerId,
  type NaflType,
} from '../../hooks/useSalatLog.js';
import {
  calcPrayerTimes,
  calcPrayerTimesForDay,
  getCurrentAndNextPrayer,
  getPrayerEndTime,
} from '../../utils/prayerTimes.js';
import { useCycleActive } from '../../hooks/useCycle.js';
import { useFastingHistory, useUpsertFastingLog } from '../../hooks/useFasting.js';
import { openAdhkar } from '../../utils/todayTimeline.js';
import { useZikrStore } from '../../store/useZikrStore.js';
import { getFridayHour } from '../../utils/fridayHour.js';
import {
  useMusafir,
  musafirAppliesOn,
  musafirAppliesTo,
  jamAllowed,
  jamPartner,
} from '../../utils/musafir.js';
import { isRamadanNow, todayStr } from './salatParts.js';

// Audit P4-1: the Salat tracker's state, queries and derived values, moved verbatim
// from pages/SalatTracker.tsx. The page calls this first, then useSalatNaflDebt,
// useSalatDhikrCredit and useSalatPrayerHandlers, in that order: React tells state
// apart by call order, so the hooks below keep the page's original sequence.
export function useSalatTrackerState() {
  const { t } = useTranslation();
  const cycleActive = useCycleActive();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  // ?date=YYYY-MM-DD lets the analytics heatmap navigate here directly.
  const dateFromUrl = searchParams.get('date');
  const [selectedDate, setSelectedDate] = useState(() => {
    if (dateFromUrl && /^\d{4}-\d{2}-\d{2}$/.test(dateFromUrl)) return dateFromUrl;
    return todayStr(); // Fajr-boundary tracking day
  });
  const [expandedPrayer, setExpandedPrayer] = useState<PrayerId | null>(null);
  const [showGuestDialog, setShowGuestDialog] = useState(false);

  const isToday = selectedDate === todayStr();

  // Musafir mode — applies to days on/after the journey began while it's on.
  const musafir = useMusafir();
  // Day level (banner) vs prayer level: on the day the journey began, only
  // the prayers after the one prayed at home are travel prayers.
  const travelDay = musafirAppliesOn(musafir, selectedDate);
  const travelPrayer = (p: PrayerId) => musafirAppliesTo(musafir, selectedDate, p);
  // Joining needs both prayers of the pair to be travel prayers.
  const canJoin = (p: PrayerId) => {
    const partner = jamPartner(p);
    return (
      !!musafir &&
      jamAllowed(musafir.school) &&
      !!partner &&
      travelPrayer(p) &&
      travelPrayer(partner)
    );
  };
  // A past civil day whose prayers were never logged reads as "missed" (derived
  // on read — no DB writes, consistent with the app's lazy-expiry approach).
  const isPastDay = selectedDate < todayStr();

  // Start date: the day tracking began (or was reset after deletion).
  // Prevents users from adding entries before this date after a data wipe.
  const salatStartDate = localStorage.getItem('bustandeen_salat_start_date') ?? null;
  const isAtStartDate = salatStartDate ? selectedDate <= salatStartDate : false;

  // Minute tick so the "current prayer" highlight and 🔒 future locks don't
  // go stale when the tab stays open across a prayer-time boundary.
  const [minuteNow, setMinuteNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setMinuteNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Prayer times for current-prayer detection.
  // Use selectedDate's noon (not minuteNow's civil date) to get the right
  // times when the tracking day ≠ civil date (i.e., before Fajr the tracking
  // day is still "yesterday", so we compute yesterday's prayer times).
  const todayPrayerTimes = useMemo(() => {
    const stored = localStorage.getItem('bustandeen_location');
    if (!stored) return null;
    try {
      const loc = JSON.parse(stored) as { latitude: number; longitude: number };
      const times = calcPrayerTimesForDay(loc.latitude, loc.longitude, selectedDate);
      const info = getCurrentAndNextPrayer(times, minuteNow);
      return {
        times: {
          fajr: times.fajr,
          dhuhr: times.dhuhr,
          asr: times.asr,
          maghrib: times.maghrib,
          isha: times.isha,
        } as Record<string, Date>,
        full: times,
        nextTime: info.nextTime,
        // During the sun-setting forbidden window (last ~17 min before
        // Maghrib), Asr is technically over but Maghrib hasn't begun — don't
        // highlight either as "current".
        current: info.inForbiddenGap ? undefined : (info.current as string),
      };
    } catch {
      return null;
    }
  }, [selectedDate, minuteNow]);

  // The adhkār window open right now (Fajr→sunrise on Fajr, Maghrib→ʿIshāʾ on
  // Maghrib), from today's times on the device, shown only on today's view.
  // Independent of selectedDate's noon, so in `maghrib` day-start mode
  // tonight's Maghrib (the new tracking day's first prayer) still gets it.
  const adhkarNow = useMemo(() => {
    if (!isToday) return null;
    try {
      const stored = localStorage.getItem('bustandeen_location');
      if (!stored) return null;
      const loc = JSON.parse(stored) as { latitude: number; longitude: number };
      return openAdhkar(calcPrayerTimes(loc.latitude, loc.longitude, minuteNow), minuteNow);
    } catch {
      return null;
    }
  }, [isToday, minuteNow]);

  // Month calendar state — full-month view for navigating to any past day
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => selectedDate.substring(0, 7));

  // A prayer's window has auto-closed (adhan-time-derived) for today while
  // still logged pending — flag it so nobody forgets to mark it, without
  // waiting until the day rolls over into "missed".
  const isOverdueToday = (prayerId: PrayerId): boolean => {
    if (!isToday || !todayPrayerTimes?.full) return false;
    const end = getPrayerEndTime(prayerId, todayPrayerTimes.full);
    return minuteNow > end;
  };

  const { data: log, isLoading } = useSalatLog(selectedDate);
  const updatePrayer = useUpdatePrayer();
  const updateNafl = useUpdateNafl();

  // Weekly summary strip + calendar data (90-day window always fetched).
  // Pass the Fajr-boundary tracking day so the 7-day strip matches the tracker.
  const { data: weekAnalytics } = useSalatAnalytics(7, todayStr());
  const weekDays = weekAnalytics?.last7Days ?? [];
  // Build a lookup from calendarData for the month calendar (90 days).
  const calendarDataMap = useMemo(() => {
    const m = new Map<string, number>();
    (weekAnalytics?.calendarData ?? []).forEach((d) => m.set(d.date, d.completed));
    return m;
  }, [weekAnalytics]);

  // Tarawih during Ramadan lives on the FastingLog row (category 'ramadan'),
  // the same record /ramadan writes — one source of truth, two places to tap.
  const ramadanActive = isRamadanNow();
  const { data: ramadanHistory } = useFastingHistory(3, ramadanActive);
  const upsertFasting = useUpsertFastingLog();
  const ramadanTodayLog = useMemo(
    () => (ramadanHistory ?? []).find((l) => l.date === todayStr() && l.category === 'ramadan'),
    [ramadanHistory]
  );
  const toggleTarawih = () => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    upsertFasting.mutate({
      date: todayStr(),
      category: 'ramadan',
      status: (ramadanTodayLog?.status as 'completed' | 'intended' | 'broken') ?? 'intended',
      tarawih: !ramadanTodayLog?.tarawih,
    });
  };

  // Friday specials — both derive from the same minute tick that drives the
  // prayer clock, so no extra timer and no notification permission.
  const isCivilFriday = new Date(selectedDate + 'T12:00:00').getDay() === 5;
  const isFridayToday = isCivilFriday && selectedDate === todayStr();
  const fridayHour = useMemo(
    () => getFridayHour(todayPrayerTimes?.times.asr, todayPrayerTimes?.times.maghrib, minuteNow),
    [todayPrayerTimes, minuteNow]
  );

  // Salat → Zikr wiring (see creditDhikr) + the settings drawer
  const addCounts = useZikrStore((s) => s.addCounts);
  const flushZikr = useZikrStore((s) => s.flush);
  const hydrateZikr = useZikrStore((s) => s.hydrate);
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);

  // Nafl state
  const [naflExpanded, setNaflExpanded] = useState(false);
  const [naflInfoExpanded, setNaflInfoExpanded] = useState<NaflType | null>(null);
  const [rakatOverrides, setRakatOverrides] = useState<Record<string, number>>({});

  // Kaza debt — fully automatic: a day that passes with a prayer still
  // pending is folded into these counters server-side (see ensureCaughtUp in
  // salatDebt.service.ts), no manual ❌ Miss tap required. One plain number
  // field per prayer stays as the correction path — for debt owed from
  // before tracking started, or to hand-correct after a reset — instead of
  // separate +/- steppers, so there's exactly one way to change a count.
  // "Reset" gives a demotivated user a clean slate without losing history.
  const { data: debt } = useSalatDebt();
  const setDebtExact = useSetSalatDebt();
  const [debtExpanded, setDebtExpanded] = useState(false);
  const [legendExpanded, setLegendExpanded] = useState(false);
  const [debtDrafts, setDebtDrafts] = useState<Partial<Record<PrayerId, string>>>({});

  return {
    t,
    cycleActive,
    user,
    selectedDate,
    setSelectedDate,
    expandedPrayer,
    setExpandedPrayer,
    showGuestDialog,
    setShowGuestDialog,
    isToday,
    musafir,
    travelDay,
    travelPrayer,
    canJoin,
    isPastDay,
    isAtStartDate,
    todayPrayerTimes,
    adhkarNow,
    calendarOpen,
    setCalendarOpen,
    calMonth,
    setCalMonth,
    isOverdueToday,
    log,
    isLoading,
    updatePrayer,
    updateNafl,
    weekDays,
    calendarDataMap,
    ramadanTodayLog,
    toggleTarawih,
    isCivilFriday,
    isFridayToday,
    fridayHour,
    addCounts,
    flushZikr,
    hydrateZikr,
    queryClient,
    showSettings,
    setShowSettings,
    naflExpanded,
    setNaflExpanded,
    naflInfoExpanded,
    setNaflInfoExpanded,
    rakatOverrides,
    setRakatOverrides,
    debt,
    setDebtExact,
    debtExpanded,
    setDebtExpanded,
    legendExpanded,
    setLegendExpanded,
    debtDrafts,
    setDebtDrafts,
  };
}

export type SalatTrackerState = ReturnType<typeof useSalatTrackerState>;
