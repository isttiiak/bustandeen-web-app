import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnalyticsView } from '../journey/JourneyTabs.js';
import {
  useAnalytics,
  usePauseStreak,
  useResumeStreak,
  useUpdateGoal,
  useZikrSessions,
  useZikrTimeOfDay,
} from '../../hooks/useAnalytics.js';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';
import { useZikrStore } from '../../store/useZikrStore.js';
import { getTrackingDay } from '../../utils/trackingDay.js';

export type ChartInfo = Record<string, { title: string; body: string }>;

/** The Zikr analytics screen's state, queries and handlers. */
export function useZikrAnalyticsPage() {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [view, setView] = useState<AnalyticsView>('stats');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today');
  const [showGoalModal, setShowGoalModal] = useState(false);
  useEscapeKey(() => setShowGoalModal(false), showGoalModal);
  const [newGoal, setNewGoal] = useState(100);
  const [newGraceDays, setNewGraceDays] = useState(1);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [sessionsDate, setSessionsDate] = useState(() => getTrackingDay());
  const [infoTopic, setInfoTopic] = useState<string | null>(null);

  const CHART_INFO: ChartInfo = {
    trend: {
      title: t('zikrAnalytics.info.trendTitle', 'Zikr Trend'),
      body: t(
        'zikrAnalytics.info.trendBody',
        "Your total zikr count day by day over the selected period. Hover (or tap) the chart to see a day's total. The height is relative to the highest day in the window, so a quiet day looks lower even if the count is still meaningful."
      ),
    },
    perTypeTrend: {
      title: t('zikrAnalytics.info.perTypeTrendTitle', 'Per-Type Trends'),
      body: t(
        'zikrAnalytics.info.perTypeTrendBody',
        "How each of your top 5 dhikr types has moved over the same period. Each line is one type. Only shows types you've counted in this window."
      ),
    },
    timeOfDay: {
      title: t('zikrAnalytics.info.timeOfDayTitle', 'Time of Day'),
      body: t(
        'zikrAnalytics.info.timeOfDayBody',
        'When during the day you do your dhikr, hour by hour, over the last 30 days. Hover (or tap) a bar to see that hour. Helps you see your natural rhythm.'
      ),
    },
    heatmap: {
      title: t('zikrAnalytics.info.heatmapTitle', 'Activity Heatmap'),
      body: t(
        'zikrAnalytics.info.heatmapBody',
        'Every day of the last year, coloured by how much zikr you did compared with your own active days: the stronger the green, the more you counted. An empty cell means no zikr that day. Hover a cell to see the date and count.'
      ),
    },
  };

  const { counts: localCounts } = useZikrStore();
  const { data: analyticsData, isLoading, isError, error, refetch } = useAnalytics(selectedPeriod);
  const { data: yearData } = useAnalytics(365);
  const { data: timeOfDayData } = useZikrTimeOfDay(30);
  const { data: sessionsData, isLoading: sessionsLoading } = useZikrSessions(sessionsDate);
  const updateGoal = useUpdateGoal();
  const pauseStreak = usePauseStreak();
  const resumeStreak = useResumeStreak();

  const periods = [
    { label: t('zikrAnalytics.period7d'), value: 7 },
    { label: t('zikrAnalytics.period30d'), value: 30 },
    { label: t('zikrAnalytics.period90d'), value: 90 },
    { label: t('zikrAnalytics.period1y'), value: 365 },
  ];

  const handlePauseStreak = () => pauseStreak.mutate();
  const handleResumeStreak = () => resumeStreak.mutate();
  const isUpdating = pauseStreak.isPending || resumeStreak.isPending || updateGoal.isPending;

  const handleUpdateGoal = () => {
    if (!newGoal || newGoal < 1) return;
    updateGoal.mutate(
      { dailyTarget: newGoal, graceDays: newGraceDays },
      { onSuccess: () => setShowGoalModal(false) }
    );
  };

  return {
    selectedPeriod,
    setSelectedPeriod,
    view,
    setView,
    showSettings,
    setShowSettings,
    activeTab,
    setActiveTab,
    showGoalModal,
    setShowGoalModal,
    newGoal,
    setNewGoal,
    newGraceDays,
    setNewGraceDays,
    showManualEntry,
    setShowManualEntry,
    sessionsDate,
    setSessionsDate,
    infoTopic,
    setInfoTopic,
    chartInfo: CHART_INFO,
    localCounts,
    analyticsData,
    isLoading,
    isError,
    error,
    refetch,
    yearData,
    timeOfDayData,
    sessionsData,
    sessionsLoading,
    updateGoal,
    periods,
    handlePauseStreak,
    handleResumeStreak,
    isUpdating,
    handleUpdateGoal,
  };
}
