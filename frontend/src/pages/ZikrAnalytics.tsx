import React, { useState, useMemo } from 'react';
import IntentionLine from '../components/analytics/IntentionLine.js';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground.js';
import TabNav from '../components/TabNav.js';
import DemoSignInGate from '../components/DemoSignInGate.js';
import { useAuthStore } from '../store/useAuthStore.js';
import {
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ListBulletIcon,
  PlusCircleIcon,
  PresentationChartLineIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  SECTION_TITLE,
  TILE,
} from '../components/bustanStyles.js';
import ChartInfoModal, { InfoButton } from '../components/ChartInfoModal.js';
import StreakCard from '../components/analytics/StreakCard.js';
import GoalCard from '../components/analytics/GoalCard.js';
import TrendChart from '../components/analytics/TrendChart.js';
import TimeOfDayChart from '../components/analytics/TimeOfDayChart.js';
import {
  useAnalytics,
  useUpdateGoal,
  usePauseStreak,
  useResumeStreak,
  useZikrTimeOfDay,
  useZikrSessions,
} from '../hooks/useAnalytics.js';
import { useZikrStore } from '../store/useZikrStore.js';
import { useUiStore } from '../store/useUiStore.js';
import { zikrDisplayName } from '../utils/zikrLibrary.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { formatLocaleDate, formatLocaleTime } from '../utils/localeDate.js';
import { useEscapeKey } from '../hooks/useEscapeKey.js';
import ZikrLogCountsModal from '../components/zikr/ZikrLogCountsModal.js';

// ─── Heatmap Calendar ─────────────────────────────────────────────────────────

// One colour per top-5 type line, from the theme's tokens (redefined on paper).
const TYPE_COLORS = [
  'rgb(var(--c-data-good))',
  'rgb(var(--c-data-mid))',
  'var(--brand-info)',
  'var(--brand-pink)',
  'rgb(var(--c-data-low))',
];

interface HeatmapDay {
  date: string;
  total: number;
  status?: string;
}

const HEAT_DAYS = 365;
// Ink at a low alpha shows an empty day in both themes (white on dark, dark
// ink on paper); levels use the data token, bright on paper.
const HEAT_EMPTY = 'rgb(var(--c-ink) / 0.07)';
const HEAT_LEVELS = [0.3, 0.5, 0.75, 1].map((a) => `rgb(var(--c-data-good) / ${a})`);

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function HeatmapCalendar({ data }: { data: HeatmapDay[] }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<{ date: string; total: number } | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const today = getTrackingDay();

  // Always the full last 365 tracking days (padded to whole Sun-Sat weeks),
  // whatever range the data starts at, so the grid never looks clipped.
  const { weeks, monthAt } = useMemo(() => {
    const byDate = new Map(data.map((d) => [d.date, d.total]));
    const end = new Date(today + 'T12:00:00');
    const start = new Date(end);
    start.setDate(start.getDate() - (HEAT_DAYS - 1));
    const cells: Array<{ date: string; total: number } | null> = [];
    for (let i = 0; i < start.getDay(); i++) cells.push(null);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = isoDay(d);
      cells.push({ date: key, total: byDate.get(key) ?? 0 });
    }
    const wk: Array<typeof cells> = [];
    for (let i = 0; i < cells.length; i += 7) wk.push(cells.slice(i, i + 7));
    // Label the week column in which a month begins (its 1st falls there).
    const labels = new Map<number, string>();
    wk.forEach((w, wi) => {
      const first = w.find((c) => c?.date.endsWith('-01'));
      if (first)
        labels.set(wi, formatLocaleDate(new Date(first.date + 'T12:00:00'), { month: 'short' }));
    });
    return { weeks: wk, monthAt: labels };
  }, [data, today]);

  // Levels from the user's own active days (quartiles), not from their best
  // day: one big day used to push every ordinary day into the faintest step.
  const cuts = useMemo(() => {
    const vals = data
      .map((d) => d.total)
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    if (!vals.length) return [1, 1, 1];
    const q = (p: number) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))] ?? 1;
    return [q(0.25), q(0.5), q(0.75)];
  }, [data]);

  const colorFor = (total: number) => {
    if (total <= 0) return HEAT_EMPTY;
    const level = cuts.filter((c) => total > c).length;
    return HEAT_LEVELS[Math.min(level, 3)];
  };

  // On a phone the grid scrolls: start at the recent end.
  React.useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollLeft = el.scrollWidth;
    });
    return () => cancelAnimationFrame(id);
  }, [weeks.length]);

  const grid = { gridTemplateColumns: `repeat(${weeks.length}, minmax(10px, 1fr))` };

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/60 h-4">
        {hovered && (
          <>
            {formatLocaleDate(new Date(hovered.date + 'T12:00:00'), {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              weekday: 'short',
            })}
            {' · '}
            <span className="text-white font-bold">{formatLocaleNumber(hovered.total)}</span>
          </>
        )}
      </p>
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div className="min-w-max sm:min-w-0">
          <div className="grid gap-[3px] mb-1 overflow-hidden" style={grid}>
            {weeks.map((_, wi) => (
              <span key={wi} className="text-[10px] leading-none text-white/60 whitespace-nowrap">
                {monthAt.get(wi) ?? ''}
              </span>
            ))}
          </div>
          <div className="grid grid-rows-7 grid-flow-col gap-[3px]" style={grid}>
            {weeks.flatMap((week, wi) =>
              Array.from({ length: 7 }, (_, di) => {
                const cell = week[di];
                if (!cell) return <div key={`${wi}-${di}`} className="aspect-square" />;
                return (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${formatLocaleNumber(cell.total)}`}
                    onMouseEnter={() => setHovered(cell)}
                    onMouseLeave={() => setHovered(null)}
                    className={`aspect-square rounded-[3px] cursor-default ${
                      cell.date === today
                        ? 'ring-1 ring-brand-gold ring-offset-1 ring-offset-brand-deep'
                        : ''
                    }`}
                    style={{ background: colorFor(cell.total) }}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-white/60 text-[10px]">{t('zikrAnalytics.heatmapLess', 'Less')}</span>
        {[HEAT_EMPTY, ...HEAT_LEVELS].map((bg) => (
          <div key={bg} className="rounded-[3px] w-[11px] h-[11px]" style={{ background: bg }} />
        ))}
        <span className="text-white/60 text-[10px]">{t('zikrAnalytics.heatmapMore', 'More')}</span>
      </div>
    </div>
  );
}

// ─── Per-type trend lines ─────────────────────────────────────────────────────

interface ChartDataPointWithBreakdown {
  date: string;
  total: number;
  breakdown?: Record<string, number>;
}

function PerTypeTrendChart({
  data,
  topTypes,
}: {
  data: ChartDataPointWithBreakdown[];
  topTypes: string[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const reduceMotion = useUiStore((s) => s.reduceMotion);

  const VBW = 720,
    VBH = 260;
  const pad2Top = 12,
    pad2Right = 16,
    pad2Bottom = 28,
    pad2Left = 34;

  const model = useMemo(() => {
    const PAD2 = { top: pad2Top, right: pad2Right, bottom: pad2Bottom, left: pad2Left };
    if (!data.length || !topTypes.length) return null;
    const innerW = VBW - PAD2.left - PAD2.right;
    const innerH = VBH - PAD2.top - PAD2.bottom;
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;

    const seriesData = topTypes.map((type) => data.map((d) => d.breakdown?.[type] ?? 0));
    const allVals = seriesData.flat();
    const yMax = Math.max(1, ...allVals);
    const niceCeil = (m: number) => {
      if (m <= 5) return 5;
      const mag = 10 ** Math.floor(Math.log10(m));
      for (const s of [1, 2, 2.5, 5, 10]) {
        const c = s * mag;
        if (c >= m) return c;
      }
      return 10 * mag;
    };
    const yTop = niceCeil(yMax);

    const pts = seriesData.map((series) =>
      series.map((v, i) => ({
        x: PAD2.left + i * step,
        y: PAD2.top + innerH - (v / yTop) * innerH,
      }))
    );

    const paths = pts.map((p) => {
      if (!p.length) return '';
      let d = `M ${p[0].x} ${p[0].y}`;
      for (let i = 0; i < p.length - 1; i++) {
        const p0 = p[i - 1] ?? p[i];
        const p1 = p[i];
        const p2 = p[i + 1];
        const p3 = p[i + 2] ?? p2;
        const c1x = p1.x + (p2.x - p0.x) / 6,
          c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6,
          c2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
      }
      return d;
    });

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      y: PAD2.top + innerH - f * innerH,
      value: Math.round(f * yTop),
    }));

    const labels = data.map((d, i) => ({
      label: formatLocaleDate(new Date(d.date + 'T12:00:00'), { month: 'short', day: 'numeric' }),
      x: PAD2.left + i * step,
    }));
    const labelEvery = Math.max(1, Math.ceil(data.length / 7));

    return { pts, paths, ticks, labels, labelEvery, step, innerH };
  }, [data, topTypes]);

  if (!model) return null;
  const { pts, paths, ticks, labels, labelEvery, step, innerH } = model;

  return (
    <svg
      viewBox={`0 0 ${VBW} ${VBH}`}
      preserveAspectRatio="none"
      className="w-full h-[220px] overflow-visible"
      onMouseLeave={() => setHover(null)}
    >
      {ticks.map((t) => (
        <g key={t.y}>
          <line
            x1={pad2Left}
            y1={t.y}
            x2={VBW - pad2Right}
            y2={t.y}
            stroke="var(--track)"
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={pad2Left - 6}
            y={t.y + 4}
            textAnchor="end"
            className="fill-white/70"
            style={{ fontSize: 10 }}
          >
            {formatLocaleNumber(t.value)}
          </text>
        </g>
      ))}

      {paths.map((path, si) => (
        <motion.path
          key={topTypes[si]}
          d={path}
          fill="none"
          stroke={TYPE_COLORS[si % TYPE_COLORS.length]}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduceMotion ? undefined : { pathLength: 0 }}
          animate={reduceMotion ? undefined : { pathLength: 1 }}
          transition={{ duration: 0.8, delay: si * 0.1, ease: 'easeOut' }}
        />
      ))}

      {hover != null && (
        <line
          x1={pts[0][hover].x}
          y1={pad2Top}
          x2={pts[0][hover].x}
          y2={pad2Top + innerH}
          stroke="rgb(var(--c-ink) / 0.25)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {hover != null &&
        pts.map((p, si) => (
          <circle
            key={si}
            cx={p[hover].x}
            cy={p[hover].y}
            r={3.5}
            fill={TYPE_COLORS[si % TYPE_COLORS.length]}
            stroke="var(--brand-deep)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}

      {labels.map(({ label, x }, i) =>
        i % labelEvery === 0 ? (
          <text
            key={i}
            x={x}
            y={VBH - 6}
            textAnchor="middle"
            className="fill-white/70"
            style={{ fontSize: 10 }}
          >
            {label}
          </text>
        ) : null
      )}

      {data.map((_, i) => (
        <rect
          key={i}
          x={(pts[0][i]?.x ?? 0) - (step || VBW) / 2}
          y={0}
          width={step || VBW}
          height={VBH}
          fill="transparent"
          onMouseEnter={() => setHover(i)}
        />
      ))}
    </svg>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCsv(data: ChartDataPointWithBreakdown[], allTypes: string[]) {
  const header = ['date', 'total', ...allTypes].join(',');
  const rows = data.map((d) => {
    const cols = [d.date, d.total, ...allTypes.map((t) => d.breakdown?.[t] ?? 0)];
    return cols.join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zikr-${data[0]?.date ?? 'export'}-to-${data[data.length - 1]?.date ?? 'export'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ZikrAnalytics() {
  const { t, i18n } = useTranslation();
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today');
  const [showGoalModal, setShowGoalModal] = useState(false);
  useEscapeKey(() => setShowGoalModal(false), showGoalModal);
  const [newGoal, setNewGoal] = useState(100);
  const [newGraceDays, setNewGraceDays] = useState(1);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [sessionsDate, setSessionsDate] = useState(() => getTrackingDay());
  const [infoTopic, setInfoTopic] = useState<string | null>(null);

  const CHART_INFO: Record<string, { title: string; body: string }> = {
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
  const displayData = activeTab === 'today' ? todayTypes : allTimeTypes;
  const displayTotal = activeTab === 'today' ? todayTotal : (allTime?.totalCount ?? 0);

  // Last 7 days from chartData for the heatmap
  const last7Days = chartData?.slice(-7) ?? [];

  if (isDemoMode) {
    return (
      <DemoSignInGate
        icon={<ChartBarIcon className="w-7 h-7" />}
        title={t('demoGate.analyticsTitle', 'Your personal analytics await')}
        desc={t(
          'demoGate.zikrDesc',
          'Your zikr heatmap, per-type trends, and personal records are saved to your account.'
        )}
        backTo="/zikr"
        backLabel={t('demoGate.backToZikr', 'Back to zikr counter')}
        tabs={
          <TabNav
            items={[
              { label: t('zikr.counter'), to: '/zikr' },
              { label: t('zikr.analytics'), to: '/zikr/analytics', active: true },
            ]}
          />
        }
      />
    );
  }

  return (
    <AnimatedBackground variant="dark">
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

            {/* Log missed counts button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowManualEntry(true)}
              className={BTN_SECONDARY}
            >
              <PlusCircleIcon className="w-4 h-4 text-brand-emerald" />
              {t('zikrAnalytics.logMissedCounts')}
            </motion.button>
          </div>
          <IntentionLine />

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
              isNewUser={allTime?.totalCount === 0}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: t('zikrAnalytics.allTimeStat'),
                value: allTime?.totalCount != null ? formatLocaleNumber(allTime.totalCount) : '0',
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
                  allTime?.bestDay?.count != null ? formatLocaleNumber(allTime.bestDay.count) : '0',
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

          {/* Breakdown by Type */}
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
                {t(
                  activeTab === 'today'
                    ? 'zikrAnalytics.noZikrToday'
                    : 'zikrAnalytics.noZikrAllTime'
                )}
              </p>
            )}
          </div>

          {/* Trend chart */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className={SECTION_TITLE}>
                <PresentationChartLineIcon className="w-5 h-5 text-brand-emerald" />
                {t('zikrAnalytics.trend')}
                <InfoButton onClick={() => setInfoTopic('trend')} label={CHART_INFO.trend!.title} />
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
            {allTime?.totalCount === 0 ? (
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

          {/* ── Per-type trend lines ─────────────────────────────────────────── */}
          {(() => {
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
                    label={CHART_INFO.perTypeTrend!.title}
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
          })()}

          {/* ── Time of day ───────────────────────────────────────────────────── */}
          <div className={`${CARD} p-4 sm:p-5 space-y-3`}>
            <h2 className={SECTION_TITLE}>
              <ClockIcon className="w-5 h-5 text-brand-gold" />
              {t('zikrAnalytics.timeOfDay.title', 'Time of day')}
              <span className="text-white/70 text-xs font-normal font-sans">
                {t('zikrAnalytics.timeOfDay.subtitle', 'last 30 days')}
              </span>
              <InfoButton
                onClick={() => setInfoTopic('timeOfDay')}
                label={CHART_INFO.timeOfDay!.title}
              />
            </h2>
            <TimeOfDayChart data={timeOfDayData} />
          </div>

          {/* ── Contribution heatmap ─────────────────────────────────────────── */}
          {yearData?.chartData && yearData.chartData.length > 0 && (
            <div className={`${CARD} p-4 sm:p-5 space-y-2`}>
              <h2 className={SECTION_TITLE}>
                <CalendarDaysIcon className="w-5 h-5 text-brand-emerald" />
                {t('zikrAnalytics.heatmap', 'Activity heatmap')}
                <span className="text-white/70 text-xs font-normal font-sans">
                  {t('zikrAnalytics.heatmapSub', 'last 365 days')}
                </span>
                <InfoButton
                  onClick={() => setInfoTopic('heatmap')}
                  label={CHART_INFO.heatmap!.title}
                />
              </h2>
              {allTime?.totalCount === 0 ? (
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

          {/* ── Personal records ─────────────────────────────────────────────── */}
          {(() => {
            const yearDays = yearData?.chartData ?? [];
            const activeDays = yearDays.filter((d) => d.total > 0);
            const avgActive = activeDays.length
              ? Math.round(activeDays.reduce((s, d) => s + d.total, 0) / activeDays.length)
              : 0;
            const dayOfWeekTotals: number[] = [0, 0, 0, 0, 0, 0, 0];
            for (const d of yearDays) {
              const dow = new Date(d.date + 'T12:00:00').getDay();
              dayOfWeekTotals[dow] = (dayOfWeekTotals[dow] ?? 0) + d.total;
            }
            const bestDow = dayOfWeekTotals.indexOf(Math.max(...dayOfWeekTotals));
            // 7 Jan 2024 was a Sunday: weekday names in the UI language.
            const dowName = (dow: number) =>
              formatLocaleDate(new Date(2024, 0, 7 + dow, 12), { weekday: 'long' });
            const records = [
              {
                label: t('zikrAnalytics.bestDayRecord', 'Best day'),
                value: allTime?.bestDay?.count ? formatLocaleNumber(allTime.bestDay.count) : '-',
                sub: allTime?.bestDay?.date
                  ? formatLocaleDate(new Date(allTime.bestDay.date), {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '',
                accent: 'text-brand-emerald',
              },
              {
                label: t('zikrAnalytics.longestStreak', 'Longest streak'),
                value: streak?.longestStreak
                  ? t('zikrAnalytics.streakDaysValue', '{{n}} d', {
                      n: formatLocaleNumber(streak.longestStreak),
                    })
                  : '-',
                sub: '',
                accent: 'text-brand-gold',
              },
              {
                label: t('zikrAnalytics.avgActiveDay', 'Avg on active days'),
                value: avgActive ? formatLocaleNumber(avgActive) : '-',
                sub: t('zikrAnalytics.activeDaysCount', '{{n}} active days', {
                  n: formatLocaleNumber(activeDays.length),
                }),
                accent: 'text-brand-info',
              },
              {
                label: t('zikrAnalytics.mostActiveDay', 'Most active day'),
                value: dayOfWeekTotals[bestDow] > 0 ? dowName(bestDow) : '-',
                sub: '',
                accent: 'text-brand-warm',
              },
            ];
            return (
              <div className={`${CARD} p-4 sm:p-5 space-y-3`}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className={SECTION_TITLE}>
                    <TrophyIcon className="w-5 h-5 text-brand-gold" />
                    {t('zikrAnalytics.personalRecords', 'Personal records')}
                  </h2>
                  <button
                    onClick={() =>
                      exportCsv(chartData, [
                        ...new Set(chartData.flatMap((d) => Object.keys(d.breakdown ?? {}))),
                      ])
                    }
                    className="flex items-center gap-1.5 text-white/70 hover:text-brand-emerald text-xs font-semibold transition-colors"
                    title={t('zikrAnalytics.exportCsv', 'Export CSV')}
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" />
                    CSV
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {records.map((r) => (
                    <div
                      key={r.label}
                      className="rounded-control bg-brand-surface/60 border border-brand-border shadow-elev-1 p-3 text-center"
                    >
                      <p className={`text-xl font-black ${r.accent}`}>{r.value}</p>
                      <p className="text-white/70 text-[10px] font-bold uppercase mt-1">
                        {r.label}
                      </p>
                      {r.sub && <p className="text-white/70 text-[10px] mt-0.5">{r.sub}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── Session history ───────────────────────────────────────────────── */}
          <div className={`${CARD} p-4 sm:p-5 space-y-3`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={SECTION_TITLE}>
                <ListBulletIcon className="w-5 h-5 text-brand-info" />
                {t('zikrAnalytics.sessions.title', 'Session history')}
              </h2>
              <input
                type="date"
                value={sessionsDate}
                max={getTrackingDay()}
                onChange={(e) => setSessionsDate(e.target.value)}
                className="input input-xs input-bordered rounded-control bg-brand-surface border-brand-border text-white/80 text-xs"
              />
            </div>
            {sessionsLoading ? (
              <p className="text-white/70 text-xs text-center py-4">
                {t('common.loading', 'Loading…')}
              </p>
            ) : sessionsData && sessionsData.length > 0 ? (
              <div className="space-y-2">
                {sessionsData.map((s, i) => {
                  // Manual entries carry an explicit flag. Older ones (logged
                  // before the flag existed) were anchored to the tracking
                  // day's midday, so still detect those by both start and end
                  // falling within 1 minute of noon.
                  const startMs = new Date(s.start).getTime();
                  const endMs = new Date(s.end).getTime();
                  const startHour = new Date(s.start).getHours();
                  const startMin = new Date(s.start).getMinutes();
                  const isManualEntry =
                    s.manual === true ||
                    (endMs - startMs < 60_000 && startHour === 12 && startMin === 0);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-control bg-brand-surface/50 border border-brand-border p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-white/80 text-sm font-semibold tabular-nums">
                          {isManualEntry ? (
                            <span className="text-white/70 text-xs font-medium italic">
                              {t('zikrAnalytics.sessions.manualLog', 'Manual log')}
                            </span>
                          ) : (
                            <>
                              {formatLocaleTime(new Date(s.start), {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                              {' – '}
                              {formatLocaleTime(new Date(s.end), {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(s.perType).map(([type, count]) => (
                            <span
                              key={type}
                              className="px-1.5 py-0.5 rounded-md bg-shade/10 border border-brand-border text-[10px] text-white/70"
                            >
                              {zikrDisplayName(type, i18n.language)} ×{formatLocaleNumber(count)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-brand-emerald font-black text-lg shrink-0">
                        {formatLocaleNumber(s.total)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-white/70 text-xs text-center py-4">
                {t('zikrAnalytics.sessions.empty', 'No sessions logged for this day')}
              </p>
            )}
            <p className="text-white/70 text-[10px] leading-relaxed">
              {t(
                'zikrAnalytics.sessions.note',
                "Sessions come from real taps on the counter. Counts you add with Log missed counts show as a manual log with no clock time, and the tasbih the salat tracker adds for you isn't listed here."
              )}
            </p>
          </div>
        </div>

        {/* Set Goal modal: portaled above the navbar, like the other dialogs */}
        {showGoalModal &&
          createPortal(
            <div
              role="presentation"
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowGoalModal(false);
              }}
            >
              <motion.div
                className="bg-brand-deep border border-brand-border shadow-elev-3 rounded-card w-full max-w-md p-6 max-h-[88vh] overflow-y-auto"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                role="dialog"
                aria-modal="true"
              >
                <h3 className="font-display font-bold text-xl mb-6 text-brand-emerald">
                  {t('zikrAnalytics.setDailyGoal')}
                </h3>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-white/70 font-semibold">
                      {t('zikrAnalytics.dailyTarget')}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newGoal}
                    onChange={(e) => setNewGoal(parseInt(e.target.value) || 0)}
                    className="input input-bordered rounded-control bg-brand-surface/50 border-brand-border text-white focus:border-brand-emerald"
                    placeholder={t('zikrAnalytics.enterGoal')}
                  />
                </div>
                <div className="form-control mt-4">
                  <label className="label">
                    <span className="label-text text-white/70 font-semibold">
                      {t('zikrAnalytics.graceDays')}
                    </span>
                  </label>
                  <select
                    value={newGraceDays}
                    onChange={(e) => setNewGraceDays(parseInt(e.target.value, 10))}
                    className="select select-bordered rounded-control bg-brand-surface/50 border-brand-border text-white focus:border-brand-emerald"
                  >
                    <option value={0}>{t('zikrAnalytics.grace0')}</option>
                    <option value={1}>{t('zikrAnalytics.grace1')}</option>
                    <option value={2}>{t('zikrAnalytics.grace2')}</option>
                    <option value={3}>{t('zikrAnalytics.grace3')}</option>
                  </select>
                  <label className="label">
                    <span className="label-text-alt text-white/70">
                      {t('zikrAnalytics.graceDaysNote')}
                    </span>
                  </label>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    className={`${BTN_SECONDARY} flex-1`}
                    onClick={() => setShowGoalModal(false)}
                    disabled={isUpdating}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    className={`${BTN_PRIMARY} flex-1`}
                    onClick={handleUpdateGoal}
                    disabled={isUpdating || !newGoal || newGoal < 1}
                  >
                    {updateGoal.isPending
                      ? t('zikrAnalytics.updating')
                      : t('zikrAnalytics.saveGoal')}
                  </button>
                </div>
              </motion.div>
            </div>,
            document.body
          )}
      </div>

      {/* Manual entry modal */}
      <ZikrLogCountsModal
        open={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        todayPerType={todayTypes}
      />

      <ChartInfoModal
        title={infoTopic ? (CHART_INFO[infoTopic]?.title ?? null) : null}
        body={infoTopic ? CHART_INFO[infoTopic]?.body : undefined}
        onClose={() => setInfoTopic(null)}
      />
    </AnimatedBackground>
  );
}
