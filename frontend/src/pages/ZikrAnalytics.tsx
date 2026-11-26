import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import AreaJourney from '../components/journey/AreaJourney.js';
import JourneyTabs from '../components/journey/JourneyTabs.js';
import IntentionLine from '../components/analytics/IntentionLine.js';
import AnimatedBackground from '../components/AnimatedBackground.js';
import TabNav from '../components/TabNav.js';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  PlusCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { BTN_PRIMARY, BTN_SECONDARY, TILE } from '../components/bustanStyles.js';
import ChartInfoModal from '../components/ChartInfoModal.js';
import StreakCard from '../components/analytics/StreakCard.js';
import GoalCard from '../components/analytics/GoalCard.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import { formatDayLabel, formatLocaleDate } from '../utils/localeDate.js';
import ZikrLogCountsModal from '../components/zikr/ZikrLogCountsModal.js';
import ZikrSettings from '../components/ZikrSettings.js';
import {
  ZikrBreakdownCard,
  ZikrHeatmapCard,
  ZikrPerTypeTrendCard,
  ZikrTimeOfDayCard,
  ZikrTrendSection,
} from '../components/zikr/ZikrAnalyticsCards.js';
import { ZikrGoalDialog } from '../components/zikr/ZikrGoalDialog.js';
import { ZikrRecordsCard } from '../components/zikr/ZikrRecordsCard.js';
import { ZikrSessionsCard } from '../components/zikr/ZikrSessionsCard.js';
import { useZikrAnalyticsPage } from '../components/zikr/useZikrAnalyticsPage.js';

export default function ZikrAnalytics() {
  const { t } = useTranslation();
  const {
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
    chartInfo,
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
  } = useZikrAnalyticsPage();

  if (isLoading) {
    return (
      <AnimatedBackground variant="dark">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-4">
            <span className="loading loading-spinner loading-lg text-brand-emerald" />
            <p className="text-sm text-brand-emerald font-semibold">
              {t('zikrAnalytics.loadingAnalytics')}
            </p>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  if (isError || !analyticsData) {
    const errMsg = (error as Error)?.message ?? t('zikrAnalytics.loadError');
    const isRateLimit = errMsg.includes('429') || errMsg.toLowerCase().includes('too many');
    return (
      <AnimatedBackground variant="dark">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-6 max-w-sm text-center">
            {isRateLimit ? (
              <ClockIcon className="w-12 h-12 text-brand-gold" aria-hidden="true" />
            ) : (
              <ExclamationTriangleIcon className="w-12 h-12 text-red-400" aria-hidden="true" />
            )}
            <div>
              <p className="text-lg font-bold text-white mb-1">
                {isRateLimit ? t('zikrAnalytics.tooManyRequests') : t('zikrAnalytics.couldNotLoad')}
              </p>
              <p className="text-sm text-white/70">
                {isRateLimit ? t('zikrAnalytics.rateLimitMsg') : errMsg}
              </p>
            </div>
            <button className={BTN_PRIMARY} onClick={() => void refetch()}>
              {t('zikrAnalytics.tryAgain')}
            </button>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  const { chartData, today, goal, streak, allTime } = analyticsData;
  // Blend in the local optimistic store so "Today" can't under-report a tap
  // that hasn't synced yet (offline, or a flush that just hasn't been
  // reflected by a refetch) — same Math.max(local, server) fallback
  // Home.tsx and ZikrCounter.tsx already use for their own "today" figures;
  // this page was the one place in the zikr UI without it.
  const serverTodayTypes = today?.perType ?? [];
  const todayTypeMap = new Map<string, number>();
  for (const { zikrType, total } of serverTodayTypes) todayTypeMap.set(zikrType, total);
  // A brand-new type tapped for the first time today (not yet synced) won't
  // be in serverTodayTypes at all — Map.set here still needs to add it, not
  // just raise an existing entry.
  for (const [zikrType, count] of Object.entries(localCounts ?? {})) {
    todayTypeMap.set(zikrType, Math.max(todayTypeMap.get(zikrType) ?? 0, count));
  }
  const todayTypes = [...todayTypeMap.entries()]
    .filter(([, total]) => total > 0)
    .map(([zikrType, total]) => ({ zikrType, total }));
  const todayTotal = Math.max(
    today?.total ?? 0,
    [...todayTypeMap.values()].reduce((a, b) => a + b, 0)
  );
  const allTimeTypes = analyticsData.perType ?? [];
  // After a fresh start (U7) the totals count from `since`; history charts
  // and the "new user" states still look at every phase.
  const since = allTime?.since ?? null;
  const lifetimeTotal = allTime?.lifetime?.totalCount ?? allTime?.totalCount ?? 0;
  const displayData = activeTab === 'today' ? todayTypes : allTimeTypes;
  const displayTotal = activeTab === 'today' ? todayTotal : (allTime?.totalCount ?? 0);

  // Last 7 days from chartData for the heatmap
  const last7Days = chartData?.slice(-7) ?? [];

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('zikrAnalytics.srTitle', 'Zikr Analytics')}</h1>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Tab navigation */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabNav
              items={[
                { label: t('zikr.counter'), to: '/zikr' },
                { label: t('zikr.analytics'), to: '/zikr/analytics', active: true },
              ]}
            />

            <div className="flex items-center gap-2">
              {/* Log missed counts button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowManualEntry(true)}
                className={BTN_SECONDARY}
              >
                <PlusCircleIcon className="w-4 h-4 text-brand-emerald" />
                {t('zikrAnalytics.logMissedCounts')}
              </motion.button>
              {/* Zikr settings here too (U7): the correction window and Fresh start live there */}
              <button
                onClick={() => setShowSettings(true)}
                className={`${BTN_SECONDARY} !px-3`}
                aria-label={t('zikrFix.openSettings')}
                data-testid="zikr-analytics-settings"
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <IntentionLine />
          <JourneyTabs view={view} onChange={setView} />
          {view === 'journey' ? (
            <AreaJourney area="zikr" />
          ) : (
            <>
              {/* Streak + Goal cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <StreakCard
                  streak={streak}
                  onPause={handlePauseStreak}
                  onResume={handleResumeStreak}
                  isLoading={isUpdating}
                  chartData={last7Days}
                  dailyGoal={goal?.dailyTarget}
                  todayTotal={todayTotal}
                  isNewUser={lifetimeTotal === 0}
                />
                <GoalCard
                  goal={goal}
                  today={today}
                  onEditGoal={() => {
                    setNewGoal(goal?.dailyTarget ?? 100);
                    setNewGraceDays(goal?.graceDays ?? 1);
                    setShowGoalModal(true);
                  }}
                />
              </div>

              {/* Overview Statistics */}
              {since && (
                <p
                  className="text-white/75 text-xs flex flex-wrap items-center gap-2 -mb-1"
                  data-testid="zikr-since"
                >
                  <span className="rounded-full bg-brand-emerald/15 text-brand-emerald font-bold px-2.5 py-0.5 text-[11px]">
                    {t('freshStart.sinceChip', { date: formatDayLabel(since) })}
                  </span>
                  {t('freshStart.allTimeZikr', {
                    total: formatLocaleNumber(lifetimeTotal),
                    best: formatLocaleNumber(allTime?.lifetime?.longestStreak ?? 0),
                  })}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: t('zikrAnalytics.allTimeStat'),
                    value:
                      allTime?.totalCount != null ? formatLocaleNumber(allTime.totalCount) : '0',
                    accent: 'text-brand-emerald',
                  },
                  {
                    label: t('common.today'),
                    value: formatLocaleNumber(todayTotal),
                    accent: 'text-brand-gold',
                  },
                  {
                    label: t('zikrAnalytics.bestDay'),
                    value:
                      allTime?.bestDay?.count != null
                        ? formatLocaleNumber(allTime.bestDay.count)
                        : '0',
                    accent: 'text-brand-info',
                    sub: allTime?.bestDay?.date
                      ? formatLocaleDate(new Date(allTime.bestDay.date), {
                          month: 'short',
                          day: 'numeric',
                        })
                      : undefined,
                  },
                  {
                    label: t('zikrAnalytics.typesUsed'),
                    value: allTimeTypes.filter((at) => at.total > 0).length,
                    accent: 'text-brand-warm',
                  },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={TILE}
                  >
                    <p className={`text-2xl font-black ${s.accent}`}>{s.value}</p>
                    <p className="text-white/70 text-[10px] font-bold uppercase mt-1">{s.label}</p>
                    {s.sub && <p className="text-white/70 text-[10px] mt-0.5">{s.sub}</p>}
                  </motion.div>
                ))}
              </div>

              <ZikrBreakdownCard
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                displayData={displayData}
                displayTotal={displayTotal}
              />

              {/* Trend chart */}
              <ZikrTrendSection
                chartInfo={chartInfo}
                setInfoTopic={setInfoTopic}
                periods={periods}
                selectedPeriod={selectedPeriod}
                setSelectedPeriod={setSelectedPeriod}
                lifetimeTotal={lifetimeTotal}
                chartData={chartData}
              />

              {/* ── Per-type trend lines ─────────────────────────────────────────── */}
              <ZikrPerTypeTrendCard
                chartData={chartData}
                chartInfo={chartInfo}
                setInfoTopic={setInfoTopic}
              />

              {/* ── Time of day ───────────────────────────────────────────────────── */}
              <ZikrTimeOfDayCard
                chartInfo={chartInfo}
                setInfoTopic={setInfoTopic}
                timeOfDayData={timeOfDayData}
              />

              {/* ── Contribution heatmap ─────────────────────────────────────────── */}
              <ZikrHeatmapCard
                yearData={yearData}
                lifetimeTotal={lifetimeTotal}
                chartInfo={chartInfo}
                setInfoTopic={setInfoTopic}
              />

              {/* ── Personal records ─────────────────────────────────────────────── */}
              <ZikrRecordsCard
                chartData={chartData}
                yearData={yearData}
                allTime={allTime}
                streak={streak}
              />

              {/* ── Session history ───────────────────────────────────────────────── */}
              <ZikrSessionsCard
                sessionsDate={sessionsDate}
                setSessionsDate={setSessionsDate}
                sessionsData={sessionsData}
                sessionsLoading={sessionsLoading}
              />
            </>
          )}
        </div>

        {/* Set Goal modal: portaled above the navbar, like the other dialogs */}
        <ZikrGoalDialog
          showGoalModal={showGoalModal}
          onClose={() => setShowGoalModal(false)}
          newGoal={newGoal}
          setNewGoal={setNewGoal}
          newGraceDays={newGraceDays}
          setNewGraceDays={setNewGraceDays}
          isUpdating={isUpdating}
          isSaving={updateGoal.isPending}
          onSave={handleUpdateGoal}
        />
      </div>

      {/* Manual entry modal */}
      <ZikrLogCountsModal
        open={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        todayPerType={todayTypes}
      />
      <ZikrSettings open={showSettings} onClose={() => setShowSettings(false)} />

      <ChartInfoModal
        title={infoTopic ? (chartInfo[infoTopic]?.title ?? null) : null}
        body={infoTopic ? chartInfo[infoTopic]?.body : undefined}
        onClose={() => setInfoTopic(null)}
      />
    </AnimatedBackground>
  );
}
