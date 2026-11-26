import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStatsResets } from '../../hooks/useStatsResets.js';
import {
  useSalatAnalytics,
  useSalatCorrelation,
  useSalatDebt,
  useSalatDebtHistory,
  useSalatDebtInsights,
  useSalatJourney,
} from '../../hooks/useSalatLog.js';
import { getTrackingDay } from '../../utils/trackingDay.js';

export type ChartInfo = Record<string, { title: string; body: string }>;
export type SetInfoTopic = (topic: string | null) => void;

// 3650 = "All time": the backend clamps the window to when tracking began (or
// the last reset), so an oversized window is safe and just means "everything".
export const ALL_TIME_DAYS = 3650;
export const PERIOD_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '1y', value: 365 },
  { label: 'All', value: ALL_TIME_DAYS },
];

export interface MonthSel {
  year: number;
  month: number;
} // 1-based month

/** The Salat analytics screen's state, its queries and the "how to read this" texts. */
export function useSalatAnalyticsPage() {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);
  // Defaults to the CURRENT calendar month, not a 30-day rolling window — a
  // fixed lookback can make someone who only recently started tracking (or
  // who had a rough patch just outside the window) look worse than they are,
  // which cuts against the whole point of a motivating dashboard. null means
  // "use the day-count period selector instead"; that's now only reached by
  // explicitly clicking 30d/90d/1y.
  const [selectedMonth, setSelectedMonth] = useState<MonthSel | null>(() => {
    // Month of the tracking day (before Fajr on the 1st it is still last month).
    const day = getTrackingDay();
    return { year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) };
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  // The Fajr-boundary tracking day, NOT the civil date: this is the `today`
  // the analytics endpoint sweeps up to (ensureCaughtUp). A civil date sent
  // between midnight and Fajr swept the still-open day's unmarked prayers
  // (Isha) into "missed" + kaza, and drew an empty "today" cell for it.
  const trackingToday = getTrackingDay();

  // When a calendar month is selected, derive days + todayOverride so the
  // analytics endpoint returns exactly that month's data.
  const { analyticsDays, analyticsToday } = useMemo(() => {
    if (!selectedMonth) return { analyticsDays: days, analyticsToday: undefined };
    const { year, month } = selectedMonth;
    const daysInMonth = new Date(year, month, 0).getDate();
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const today = trackingToday;
    const isCurrentMonth = today.startsWith(`${year}-${String(month).padStart(2, '0')}`);
    return {
      analyticsDays: isCurrentMonth
        ? parseInt(today.slice(8), 10) // days elapsed so far this month
        : daysInMonth,
      // Never later than the tracking day: `today` is where the server's
      // missed-prayer sweep stops, so a future date would sweep open days.
      analyticsToday: isCurrentMonth || lastDay > today ? today : lastDay,
    };
  }, [selectedMonth, days, trackingToday]);

  const [activeView, setActiveView] = useState<'stats' | 'journey'>('stats');
  const [infoTopic, setInfoTopic] = useState<string | null>(null);

  // "How to read this" content for the ⓘ button on each trend/chart below —
  // requested directly: users looking at raw percentages/bars with no
  // explanation of what they mean or how the window is bucketed.
  const CHART_INFO: ChartInfo = {
    byWeekday: {
      title: t('salatAnalytics.info.byWeekdayTitle', 'By Day of Week'),
      body: t(
        'salatAnalytics.info.byWeekdayBody',
        'Your completion rate for each day of the week, added up across the whole period you\'re viewing. It is not a timeline. It answers "which day am I weakest on", for example Friday afternoons or Monday Fajr. A day with no bar yet just has no data in this window.'
      ),
    },
    prayerTiming: {
      title: t('salatAnalytics.info.prayerTimingTitle', 'Prayer Timing'),
      body: t(
        'salatAnalytics.info.prayerTimingBody',
        "Of the prayers you've marked done, how far into that prayer's time window you tended to pray it: early, mid or late. Only counts prayers where your location was set at the time (the window is calculated from prayer times, which need a location)."
      ),
    },
    kazaDebtChart: {
      title: t('salatAnalytics.info.kazaDebtChartTitle', 'Kaza Debt Chart'),
      body: t(
        'salatAnalytics.info.kazaDebtChartBody',
        'How many missed prayers you added to your kaza debt (red) vs paid back by completing a make-up prayer (green), grouped by day for a short window, or into up to 12 equal bars (weekly, wider for a year or all time) that together cover the whole period. The rightmost bar always ends on the last day of the period, and hovering any bar shows its exact date range.'
      ),
    },
    correlation: {
      title: t('salatAnalytics.info.correlationTitle', 'Isha & Fajr Connection'),
      body: t(
        'salatAnalytics.info.correlationBody',
        'Compares how often you catch Fajr on time the morning after praying Isha before 11pm or after 11pm. It is a personal pattern from your own last 90 days, not a religious ruling. It only appears once there is enough data in both groups (at least 5 days each), because a 2-day sample would be noise, not a pattern.'
      ),
    },
    mosqueTrend: {
      title: t('salatAnalytics.info.mosqueTrendTitle', 'Mosque Attendance Trend'),
      body: t(
        'salatAnalytics.info.mosqueTrendBody',
        'What share of your prayers were prayed at the mosque (in jama’ah), tracked day by day for a short window, or in up to 12 equal steps (weekly, wider for a year or all time) that together cover the whole period. The rightmost point ends on the last day of the period, and its label shows the exact date range it covers.'
      ),
    },
    prayerCalendar: {
      title: t('salatAnalytics.info.prayerCalendarTitle', 'Prayer Calendar'),
      body: t(
        'salatAnalytics.info.prayerCalendarBody',
        "Every day in the window, coloured by how many of your 5 daily prayers were completed that day, from red (0) to full green (all 5). Today has a green ring. A faint cell means no data at all for that day (nothing logged, or it hasn't happened yet), which is different from a red cell (logged, but nothing done)."
      ),
    },
    journey: {
      title: t('salatAnalytics.info.journeyTitle', 'Journey'),
      body: t(
        'salatAnalytics.info.journeyBody',
        "Your tracking history split into phases. A new phase starts each time you start Salat fresh (Settings, Fresh start). Each phase shows how many days it covered and your completion rate across them. The current phase updates live and already includes today's progress so far. Under the phases, the reset tracker lists your Salat fresh starts and your Kaza debt resets, with dates."
      ),
    },
    kazaInsights: {
      title: t('salatAnalytics.info.kazaInsightsTitle', 'Kaza Insights'),
      body: t(
        'salatAnalytics.info.kazaInsightsBody',
        "A closer look at your make-up prayers: which missed prayers you've been carrying longest, how quickly you usually pay them back, and which prayer tends to wait longest. Only counts prayers the tracker knows an exact missed date for."
      ),
    },
  };

  const { data, isLoading, isError } = useSalatAnalytics(analyticsDays, analyticsToday);
  const { data: resets } = useStatsResets();
  const { data: debt } = useSalatDebt();
  const { data: debtHistory } = useSalatDebtHistory(analyticsDays, analyticsToday);
  const { data: kazaInsights } = useSalatDebtInsights();
  const { data: journeyPhases, isLoading: journeyLoading } = useSalatJourney(trackingToday);
  const { data: correlation } = useSalatCorrelation();

  return {
    days,
    setDays,
    selectedMonth,
    setSelectedMonth,
    showMonthPicker,
    setShowMonthPicker,
    pickerYear,
    setPickerYear,
    trackingToday,
    activeView,
    setActiveView,
    infoTopic,
    setInfoTopic,
    chartInfo: CHART_INFO,
    data,
    isLoading,
    isError,
    resets,
    debt,
    debtHistory,
    kazaInsights,
    journeyPhases,
    journeyLoading,
    correlation,
  };
}
