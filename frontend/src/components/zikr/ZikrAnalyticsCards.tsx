import { useTranslation } from 'react-i18next';
import {
  CalendarDaysIcon,
  ChartBarIcon,
  ClockIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline';
import { m as motion } from 'framer-motion';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { InfoButton } from '../ChartInfoModal.js';
import TrendChart from '../analytics/TrendChart.js';
import TimeOfDayChart from '../analytics/TimeOfDayChart.js';
import { HeatmapCalendar } from '../analytics/HeatmapCalendar.js';
import { PerTypeTrendChart, TYPE_COLORS } from '../analytics/PerTypeTrendChart.js';
import type { useZikrTimeOfDay } from '../../hooks/useAnalytics.js';
import type { AnalyticsResponse } from '../../types/api.js';
import { zikrDisplayName } from '../../utils/zikrLibrary.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import type { ChartInfo } from './useZikrAnalyticsPage.js';

type SetInfoTopic = (topic: string | null) => void;

/** Breakdown by type: today, or all time. */
export function ZikrBreakdownCard({
  activeTab,
  setActiveTab,
  displayData,
  displayTotal,
}: {
  activeTab: 'today' | 'all';
  setActiveTab: (tab: 'today' | 'all') => void;
  displayData: Array<{ zikrType: string; total: number }>;
  displayTotal: number;
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className={`${CARD} p-4 sm:p-5`}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className={SECTION_TITLE}>
          <ChartBarIcon className="w-5 h-5 text-brand-emerald" />
          {t('zikrAnalytics.breakdownByType')}
        </h2>
        <div className="tabs tabs-boxed tabs-sm bg-brand-surface border border-brand-border">
          {(['today', 'all'] as const).map((tab) => (
            <button
              key={tab}
              className={`tab text-xs ${activeTab === tab ? 'tab-active bg-brand-emerald-dim text-on-color font-bold' : 'text-white/60'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'today' ? t('common.today') : t('zikrAnalytics.allTimeLabel')}
            </button>
          ))}
        </div>
      </div>

      {displayData?.length ? (
        <div className="space-y-2">
          {displayData.map((item, i) => {
            const pct = displayTotal > 0 ? (item.total / displayTotal) * 100 : 0;
            return (
              <motion.div
                key={item.zikrType}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/70 text-xs font-bold truncate max-w-[60%]">
                    {zikrDisplayName(item.zikrType, i18n.language)}
                  </span>
                  <span className="text-white font-black text-xs tabular-nums">
                    {formatLocaleNumber(item.total)}
                  </span>
                </div>
                <div className="w-full bg-track rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct > 0 ? Math.max(pct, 2) : 0}%` }}
                    transition={{ duration: 0.6, delay: i * 0.03 }}
                    className="h-full rounded-full bg-data-good"
                  />
                </div>
                <p className="text-white/70 text-[10px] mt-0.5">{pct.toFixed(1)}%</p>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <p className="text-white/70 text-sm text-center py-8">
          {t(activeTab === 'today' ? 'zikrAnalytics.noZikrToday' : 'zikrAnalytics.noZikrAllTime')}
        </p>
      )}
    </div>
  );
}

/** The trend chart with its period tabs. */
export function ZikrTrendSection({
  chartInfo,
  setInfoTopic,
  periods,
  selectedPeriod,
  setSelectedPeriod,
  lifetimeTotal,
  chartData,
}: {
  chartInfo: ChartInfo;
  setInfoTopic: SetInfoTopic;
  periods: Array<{ label: string; value: number }>;
  selectedPeriod: number;
  setSelectedPeriod: (days: number) => void;
  lifetimeTotal: number;
  chartData: AnalyticsResponse['chartData'];
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className={SECTION_TITLE}>
          <PresentationChartLineIcon className="w-5 h-5 text-brand-emerald" />
          {t('zikrAnalytics.trend')}
          <InfoButton onClick={() => setInfoTopic('trend')} label={chartInfo.trend!.title} />
        </h2>
        <div className="tabs tabs-boxed tabs-sm bg-brand-deep border border-brand-border">
          {periods.map((p) => (
            <button
              key={p.value}
              className={`tab text-xs ${selectedPeriod === p.value ? 'tab-active bg-brand-emerald-dim text-on-color font-bold' : 'text-white/60'}`}
              onClick={() => setSelectedPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {lifetimeTotal === 0 ? (
        <div className={`${CARD} p-6 text-center`}>
          <p className="text-white/70 text-sm">
            {t(
              'zikrAnalytics.newUserTrend',
              'Your trend will appear here once you start counting zikr.'
            )}
          </p>
        </div>
      ) : (
        <TrendChart data={chartData} period={selectedPeriod} />
      )}
    </div>
  );
}

/** Per-type trend lines for the five most used types. */
export function ZikrPerTypeTrendCard({
  chartData,
  chartInfo,
  setInfoTopic,
}: {
  chartData: AnalyticsResponse['chartData'];
  chartInfo: ChartInfo;
  setInfoTopic: SetInfoTopic;
}) {
  const { t, i18n } = useTranslation();
  const allTypes = [...new Set(chartData.flatMap((d) => Object.keys(d.breakdown ?? {})))];
  const topTypes = allTypes
    .map((type) => ({
      type,
      total: chartData.reduce((s, d) => s + (d.breakdown?.[type] ?? 0), 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((x) => x.type);
  if (!topTypes.length) return null;
  return (
    <div className={`${CARD} p-4 sm:p-5 space-y-3`}>
      <h2 className={SECTION_TITLE}>
        <PresentationChartLineIcon className="w-5 h-5 text-brand-info" />
        {t('zikrAnalytics.perTypeTrend', 'Per-type trends')}
        <InfoButton
          onClick={() => setInfoTopic('perTypeTrend')}
          label={chartInfo.perTypeTrend!.title}
        />
      </h2>
      <div className="flex flex-wrap gap-3 mb-1">
        {topTypes.map((type, si) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-full"
              style={{
                width: 8,
                height: 8,
                background: TYPE_COLORS[si % TYPE_COLORS.length],
              }}
            />
            <span className="text-white/70 text-[11px]">
              {zikrDisplayName(type, i18n.language)}
            </span>
          </div>
        ))}
      </div>
      <PerTypeTrendChart data={chartData} topTypes={topTypes} />
    </div>
  );
}

/** Time of day, last 30 days. */
export function ZikrTimeOfDayCard({
  chartInfo,
  setInfoTopic,
  timeOfDayData,
}: {
  chartInfo: ChartInfo;
  setInfoTopic: SetInfoTopic;
  timeOfDayData: ReturnType<typeof useZikrTimeOfDay>['data'];
}) {
  const { t } = useTranslation();
  return (
    <div className={`${CARD} p-4 sm:p-5 space-y-3`}>
      <h2 className={SECTION_TITLE}>
        <ClockIcon className="w-5 h-5 text-brand-gold" />
        {t('zikrAnalytics.timeOfDay.title', 'Time of day')}
        <span className="text-white/70 text-xs font-normal font-sans">
          {t('zikrAnalytics.timeOfDay.subtitle', 'last 30 days')}
        </span>
        <InfoButton onClick={() => setInfoTopic('timeOfDay')} label={chartInfo.timeOfDay!.title} />
      </h2>
      <TimeOfDayChart data={timeOfDayData} />
    </div>
  );
}

/** The contribution heatmap for the last year. */
export function ZikrHeatmapCard({
  yearData,
  lifetimeTotal,
  chartInfo,
  setInfoTopic,
}: {
  yearData: AnalyticsResponse | undefined;
  lifetimeTotal: number;
  chartInfo: ChartInfo;
  setInfoTopic: SetInfoTopic;
}) {
  const { t } = useTranslation();
  return (
    <>
      {yearData?.chartData && yearData.chartData.length > 0 && (
        <div className={`${CARD} p-4 sm:p-5 space-y-2`}>
          <h2 className={SECTION_TITLE}>
            <CalendarDaysIcon className="w-5 h-5 text-brand-emerald" />
            {t('zikrAnalytics.heatmap', 'Activity heatmap')}
            <span className="text-white/70 text-xs font-normal font-sans">
              {t('zikrAnalytics.heatmapSub', 'last 365 days')}
            </span>
            <InfoButton onClick={() => setInfoTopic('heatmap')} label={chartInfo.heatmap!.title} />
          </h2>
          {lifetimeTotal === 0 ? (
            <p className="text-white/70 text-sm text-center py-6">
              {t(
                'zikrAnalytics.newUserHeatmap',
                'Not enough activity yet. This fills in as you go.'
              )}
            </p>
          ) : (
            <HeatmapCalendar data={yearData.chartData} />
          )}
        </div>
      )}
    </>
  );
}
