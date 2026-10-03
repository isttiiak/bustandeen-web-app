import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { m as motion } from 'framer-motion';
import {
  ArrowDownTrayIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  PencilSquareIcon,
  PlusIcon,
  ScaleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import TabNav from '../components/TabNav.js';
import DemoSignInGate from '../components/DemoSignInGate.js';
import ConfirmDialog from '../components/ConfirmDialog.js';
import {
  useCycleSummary,
  useAddPastCycle,
  useDeleteCycleLog,
  useIsFemale,
  useBodyStats,
} from '../hooks/useCycle.js';
import { useFastingSummary } from '../hooks/useFasting.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useUiStore } from '../store/useUiStore.js';
import { computeBmi, cmToFtStr } from '../utils/bodyStats.js';
import CycleEditModal, { type CycleEditTarget } from '../components/CycleEditModal.js';
import RayhanahSettingsDrawer from '../components/RayhanahSettingsDrawer.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { formatLocaleDate, formatLocaleNumber } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';
import { OfflineQueuedError } from '../utils/syncOutbox.js';
import { CrescentIcon, FlowerIcon, LeafIcon } from '../components/icons/IslamicIcons.js';
import { BTN_PRIMARY, CARD, SECTION_TITLE, TILE } from '../components/bustanStyles.js';

// Rayhanah privacy rule: these numbers are computed on the device from the
// user's own cycle data; nothing here is sent to an AI or shown to friends.

/** A stat value when there is no data yet (no em dash in UI copy). */
const NO_VALUE = '-';
const TILE_NUM = 'font-display text-2xl font-bold';
const TILE_LABEL = 'text-white/70 text-[10px] font-bold uppercase mt-1';
const BAR_TRACK = 'flex-1 rounded-full bg-brand-surface overflow-hidden';
const NOTE = 'text-white/70 text-xs mt-0.5 leading-relaxed';
const FOOT = 'text-white/70 text-[11px] mt-3 leading-relaxed';

function shiftStr(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86_400_000
  );
}
function fmt(dateStr: string): string {
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), { month: 'short', day: 'numeric' });
}
function fmtFull(dateStr: string): string {
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const SYMPTOM_LABEL: Record<string, string> = {
  cramps: 'Cramps',
  headache: 'Headache',
  fatigue: 'Fatigue',
  nausea: 'Nausea',
  backache: 'Backache',
  bloating: 'Bloating',
  tenderness: 'Tenderness',
  insomnia: 'Insomnia',
};

export default function CycleAnalytics() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isFemale = useIsFemale();
  const today = getTrackingDay();

  const { data: summary, isLoading } = useCycleSummary();
  const { data: fastingSummary } = useFastingSummary();
  const { data: bodyStats } = useBodyStats();
  const hideBmi = useUiStore((s) => s.hideBmi);
  const addPast = useAddPastCycle();
  const deleteLog = useDeleteCycleLog();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [pastOpen, setPastOpen] = useState(false);
  const [pastStart, setPastStart] = useState('');
  const [pastEnd, setPastEnd] = useState('');
  const [pastType, setPastType] = useState<'hayd' | 'nifas'>('hayd');
  const [editTarget, setEditTarget] = useState<CycleEditTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);

  const stats = useMemo(() => {
    const hayd = (summary?.logs ?? [])
      .filter((l) => l.type === 'hayd')
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    const gaps: Array<{ from: string; days: number }> = [];
    for (let i = 1; i < hayd.length; i++) {
      const g = daysBetween(hayd[i - 1]!.startDate, hayd[i]!.startDate);
      if (g >= 15 && g <= 60) gaps.push({ from: hayd[i - 1]!.startDate, days: g });
    }
    const lengths = hayd
      .filter((l) => l.endDate)
      .map((l) => ({ from: l.startDate, days: daysBetween(l.startDate, l.endDate!) + 1 }))
      .filter((x) => x.days >= 1 && x.days <= 15);

    const gapVals = gaps.map((g) => g.days);
    const mean = gapVals.length ? gapVals.reduce((a, b) => a + b, 0) / gapVals.length : 28;
    const sd =
      gapVals.length > 1
        ? Math.sqrt(gapVals.reduce((a, b) => a + (b - mean) ** 2, 0) / (gapVals.length - 1))
        : 0;
    const lenVals = lengths.map((l) => l.days);
    const meanLen = lenVals.length ? lenVals.reduce((a, b) => a + b, 0) / lenVals.length : 7;

    const regularity =
      gapVals.length < 2
        ? { key: 'learning', label: 'Learning…', tone: 'text-white/70' }
        : sd <= 2
          ? { key: 'veryRegular', label: 'Very regular', tone: 'text-brand-emerald' }
          : sd <= 4
            ? { key: 'regular', label: 'Regular', tone: 'text-brand-emerald' }
            : sd <= 7
              ? { key: 'somewhatVariable', label: 'Somewhat variable', tone: 'text-brand-gold' }
              : { key: 'irregular', label: 'Irregular', tone: 'text-brand-pink' };

    // Next 3 predicted windows: lastStart + n·mean, each ± max(1, round(SD))
    const lastStart = hayd.length ? hayd[hayd.length - 1]!.startDate : null;
    const spread = Math.max(1, Math.round(sd));
    const windows = lastStart
      ? [1, 2, 3]
          .map((n) => {
            const center = shiftStr(lastStart, Math.round(n * mean));
            return { center, from: shiftStr(center, -spread), to: shiftStr(center, spread) };
          })
          .filter((w) => w.center >= today || daysBetween(w.center, today) < Math.round(mean))
      : [];

    // Fertile window + ovulation for each predicted window
    const fertileWindows = windows.map((w) => {
      const ovulation = shiftStr(w.center, -14);
      return {
        ovulation,
        from: shiftStr(ovulation, -2),
        to: shiftStr(ovulation, 2),
      };
    });

    // PMS prediction: look at symptom patterns to find typical pre-period onset
    const days = summary?.days ?? [];
    const symCount = new Map<string, number>();
    let flowLight = 0,
      flowMed = 0,
      flowHeavy = 0;
    const moodCount = new Map<string, number>();
    for (const d of days) {
      for (const sy of d.symptoms) symCount.set(sy, (symCount.get(sy) ?? 0) + 1);
      if (d.flow === 'light') flowLight++;
      if (d.flow === 'medium') flowMed++;
      if (d.flow === 'heavy') flowHeavy++;
      for (const mo of d.moods ?? []) moodCount.set(mo, (moodCount.get(mo) ?? 0) + 1);
    }
    const topSymptoms = [...symCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const flowTotal = flowLight + flowMed + flowHeavy;

    // PMS symptom pattern: which symptoms appear in the 7 days before each period?
    const pmsSymptomCounts = new Map<string, number>();
    let pmsPeriodsAnalyzed = 0;
    for (let i = 1; i < hayd.length; i++) {
      const periodStart = hayd[i]!.startDate;
      const preWindow = new Set<string>();
      for (let d = -7; d <= -1; d++) preWindow.add(shiftStr(periodStart, d));
      const preDays = days.filter((dd) => preWindow.has(dd.date));
      if (preDays.length > 0) {
        pmsPeriodsAnalyzed++;
        const seen = new Set<string>();
        for (const dd of preDays) {
          for (const sy of dd.symptoms) seen.add(sy);
          for (const mo of dd.moods ?? []) seen.add(`mood:${mo}`);
        }
        for (const s of seen) pmsSymptomCounts.set(s, (pmsSymptomCounts.get(s) ?? 0) + 1);
      }
    }
    const pmsPatterns = [...pmsSymptomCounts.entries()]
      .filter(([, n]) => n >= Math.max(1, Math.floor(pmsPeriodsAnalyzed * 0.4)))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, n]) => ({
        key,
        label: key.startsWith('mood:')
          ? `${key.replace('mood:', '')} mood`
          : (SYMPTOM_LABEL[key] ?? key),
        count: n,
        pct: pmsPeriodsAnalyzed > 0 ? Math.round((n / pmsPeriodsAnalyzed) * 100) : 0,
      }));

    // Extended insights: longest/shortest cycle + trend
    const longest = gapVals.length ? Math.max(...gapVals) : null;
    const shortest = gapVals.length ? Math.min(...gapVals) : null;
    // Trend: compare last 3 vs previous 3 cycle gaps
    let trend: 'shorter' | 'longer' | 'stable' | null = null;
    if (gapVals.length >= 6) {
      const recent = gapVals.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const older = gapVals.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
      const diff = recent - older;
      if (diff > 2) trend = 'longer';
      else if (diff < -2) trend = 'shorter';
      else trend = 'stable';
    }
    // Irregularity alert: last cycle significantly different from average
    let irregAlertDays: number | null = null;
    let irregAlertDirection: 'longer' | 'shorter' | null = null;
    if (gapVals.length >= 3) {
      const last = gapVals[gapVals.length - 1]!;
      if (Math.abs(last - mean) > 10) {
        irregAlertDays = Math.round(Math.abs(last - mean));
        irregAlertDirection = last > mean ? 'longer' : 'shorter';
      }
    }

    // Fasting makeup: total excused days across all completed cycles
    const totalExcusedDays = (summary?.logs ?? [])
      .filter((l) => l.endDate)
      .reduce((sum, l) => sum + daysBetween(l.startDate, l.endDate!) + 1, 0);

    return {
      gaps,
      lengths,
      mean,
      sd,
      meanLen,
      regularity,
      windows,
      fertileWindows,
      topSymptoms,
      flowLight,
      flowMed,
      flowHeavy,
      flowTotal,
      haydCount: hayd.length,
      pmsPatterns,
      pmsPeriodsAnalyzed,
      longest,
      shortest,
      trend,
      irregAlertDays,
      irregAlertDirection,
      totalExcusedDays,
    };
  }, [summary, today]);

  const isDemoMode = useAuthStore((s) => s.isDemoMode);

  if (isDemoMode) {
    return (
      <DemoSignInGate
        icon={<ChartBarIcon className="w-7 h-7" />}
        title={t('demoGate.analyticsTitle', 'Your personal analytics await')}
        desc={t(
          'demoGate.cycleDesc',
          'Cycle analytics (your patterns, predictions, and wellness insights) are available once you sign in.'
        )}
        backTo="/cycle"
        backLabel={t('demoGate.backToCycle', 'Back to cycle tracker')}
        tabs={
          <TabNav
            items={[
              { label: t('cycleAnalytics.tabCycle', 'Cycle'), to: '/cycle' },
              {
                label: t('cycleAnalytics.tabAnalytics', 'Analytics'),
                to: '/cycle/analytics',
                active: true,
              },
            ]}
          />
        }
      />
    );
  }

  if (!user || !isFemale) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4 text-center">
        <div>
          <span className="mx-auto mb-4 w-14 h-14 rounded-full grid place-items-center bg-brand-pink/10 border border-brand-pink/40 text-brand-pink">
            <FlowerIcon className="w-7 h-7" />
          </span>
          <p className="text-white/70 text-sm max-w-sm">
            {t(
              'cycleAnalytics.accessRestricted',
              'Rayhanah Analytics is a private space for our sisters. Set your gender to female in'
            )}{' '}
            <button className="text-brand-emerald underline" onClick={() => navigate('/profile')}>
              {t('cycleAnalytics.yourProfile', 'your profile')}
            </button>
            .
          </p>
        </div>
      </div>
    );
  }

  const maxGap = Math.max(1, ...stats.gaps.map((g) => g.days));
  const maxLen = Math.max(1, ...stats.lengths.map((l) => l.days));

  const exportCsv = () => {
    const logs = summary?.logs ?? [];
    const days = summary?.days ?? [];
    const lines = ['Type,Start Date,End Date,Duration (days),Flow,Symptoms,Moods'];
    for (const l of logs) {
      const dur = l.endDate ? daysBetween(l.startDate, l.endDate) + 1 : 'ongoing';
      const periodDays = days.filter(
        (d) => d.date >= l.startDate && d.date <= (l.endDate ?? today)
      );
      if (periodDays.length > 0) {
        for (const d of periodDays) {
          lines.push(
            [
              l.type,
              d.date,
              l.endDate ?? '',
              String(dur),
              d.flow ?? '',
              d.symptoms.join('; '),
              (d.moods ?? []).join('; '),
            ]
              .map((v) => `"${v}"`)
              .join(',')
          );
        }
      } else {
        lines.push(
          [l.type, l.startDate, l.endDate ?? '', String(dur), '', '', '']
            .map((v) => `"${v}"`)
            .join(',')
        );
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rayhanah-cycle-export-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('cycleAnalytics.srTitle', 'Rayhanah Analytics')}</h1>
      <div className="px-4 pt-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <TabNav
              items={[
                { label: t('cycleAnalytics.tabCycle', 'Cycle'), to: '/cycle' },
                {
                  label: t('cycleAnalytics.tabAnalytics', 'Analytics'),
                  to: '/cycle/analytics',
                  active: true,
                },
              ]}
            />
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label={t('rayhanah.settings', 'Settings')}
            title={t('rayhanah.settings', 'Settings')}
            className="shrink-0 p-2 rounded-control border border-brand-border bg-brand-deep shadow-elev-1 text-white/70 hover:text-brand-pink hover:border-brand-pink/40 transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-5">
        {isLoading ? (
          <div className={`${CARD} p-10 grid place-items-center`}>
            <span className="loading loading-spinner loading-lg text-brand-pink" />
          </div>
        ) : (
          <>
            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className={TILE}>
                <p className={`${TILE_NUM} text-brand-pink`}>
                  {formatLocaleNumber(stats.haydCount)}
                </p>
                <p className={TILE_LABEL}>{t('cycleAnalytics.cyclesTracked', 'cycles tracked')}</p>
              </div>
              <div className={TILE}>
                <p className={`${TILE_NUM} text-brand-pink`}>
                  {stats.gaps.length ? formatLocaleNumber(Math.round(stats.mean)) : NO_VALUE}
                </p>
                <p className={TILE_LABEL}>{t('cycleAnalytics.avgCycleDays', 'avg cycle days')}</p>
              </div>
              <div className={TILE}>
                <p className={`${TILE_NUM} text-brand-pink`}>
                  {stats.lengths.length ? formatLocaleNumber(Math.round(stats.meanLen)) : NO_VALUE}
                </p>
                <p className={TILE_LABEL}>{t('cycleAnalytics.avgPeriodDays', 'avg period days')}</p>
              </div>
              <div className={TILE}>
                <p className={`text-sm font-bold mt-1.5 ${stats.regularity.tone}`}>
                  {t(`cycleAnalytics.regularity.${stats.regularity.key}`, stats.regularity.label)}
                </p>
                <p className={`${TILE_LABEL} mt-1.5`}>
                  {t('cycleAnalytics.regularityLabel', 'regularity')}{' '}
                  {stats.gaps.length > 1 && (
                    <span className="normal-case">
                      (±{formatLocaleNumber(Math.round(stats.sd))}d)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* BMI card — shown when height + weight are saved */}
            {(() => {
              const cm = bodyStats?.heightCm ?? null;
              const kg = bodyStats?.weightKg ?? null;
              const bmi = cm && kg ? computeBmi(cm, kg) : null;
              if (!bmi || !cm || !kg || hideBmi) return null;
              const cat =
                bmi < 18.5
                  ? {
                      key: 'bmiUnder',
                      label: 'Underweight',
                      color: 'text-brand-info',
                      desc: 'Below the healthy weight range.',
                    }
                  : bmi < 25
                    ? {
                        key: 'bmiNormal',
                        label: 'Normal weight',
                        color: 'text-brand-emerald',
                        desc: 'Within the healthy weight range.',
                      }
                    : bmi < 30
                      ? {
                          key: 'bmiOver',
                          label: 'Overweight',
                          color: 'text-brand-gold',
                          desc: 'Above the healthy weight range.',
                        }
                      : {
                          key: 'bmiObese',
                          label: 'Well above range',
                          color: 'text-red-400',
                          desc: 'Significantly above the healthy weight range.',
                        };
              const pct = Math.min(100, Math.max(0, ((bmi - 10) / (45 - 10)) * 100));
              const ftStr = cmToFtStr(cm);

              return (
                <section className={`${CARD} p-5 space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                        <ScaleIcon className="w-4 h-4" />
                        {t('rayhanah.bmi', 'BMI')}
                      </p>
                      <p className={`font-display text-4xl font-bold ${cat.color}`}>{bmi}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${cat.color}`}>
                        {t(`rayhanah.${cat.key}`, cat.label)}
                      </p>
                      <p className={NOTE}>{t(`rayhanah.${cat.key}Desc`, cat.desc)}</p>
                    </div>
                  </div>

                  {/* BMI scale bar */}
                  <div className="space-y-1.5">
                    {/* Four zones on the 10-45 scale: solid tokens, no gradient */}
                    <div className="relative h-2.5">
                      <div className="absolute inset-0 flex rounded-full overflow-hidden">
                        <div className="bg-brand-info/60" style={{ width: '24.3%' }} />
                        <div className="bg-brand-emerald/70" style={{ width: '18.6%' }} />
                        <div className="bg-brand-gold/70" style={{ width: '14.3%' }} />
                        <div className="bg-red-400/60 flex-1" />
                      </div>
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-brand-deep shadow-elev-1"
                        style={{ left: `calc(${pct}% - 7px)` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-white/70 font-bold">
                      <span>10</span>
                      <span>18.5</span>
                      <span>25</span>
                      <span>30</span>
                      <span>45</span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="rounded-control border border-brand-border bg-brand-surface/50 p-3 text-center">
                      <p className="text-white font-bold text-sm">{cm} cm</p>
                      <p className="text-white/70 text-[10px] mt-0.5">{ftStr}</p>
                      <p className="text-white/70 text-[10px] font-bold uppercase mt-1">
                        {t('rayhanah.heightLabel', 'Height')}
                      </p>
                    </div>
                    <div className="rounded-control border border-brand-border bg-brand-surface/50 p-3 text-center">
                      <p className="text-white font-bold text-sm">{kg} kg</p>
                      <p className="text-white/70 text-[10px] mt-0.5">
                        {Math.round(kg * 2.20462 * 10) / 10} lbs
                      </p>
                      <p className="text-white/70 text-[10px] font-bold uppercase mt-1">
                        {t('rayhanah.weightLabel', 'Weight')}
                      </p>
                    </div>
                    <div className="rounded-control border border-brand-border bg-brand-surface/50 p-3 text-center">
                      <p className={`font-bold text-sm ${cat.color}`}>{bmi}</p>
                      <p className="text-white/70 text-[10px] mt-0.5">
                        {t('cycleAnalytics.bmiRange', '18.5–24.9 = Normal')}
                      </p>
                      <p className="text-white/70 text-[10px] font-bold uppercase mt-1">BMI</p>
                    </div>
                  </div>

                  <p className="text-white/70 text-[10px] leading-relaxed">
                    {t(
                      'rayhanah.bmiNote',
                      'BMI is a general guide, not a medical diagnosis. Your doctor knows your full picture.'
                    )}
                  </p>
                  {summary?.pregnancy?.active && (
                    <p className="text-brand-pink/60 text-[10px] leading-relaxed">
                      {t(
                        'rayhanah.bmiPregnancyNote',
                        'BMI is not a reliable measure during pregnancy. Your midwife or doctor will guide you on healthy weight gain.'
                      )}
                    </p>
                  )}
                </section>
              );
            })()}

            {/* Cycle insights — extended stats */}
            {stats.gaps.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={TILE}>
                  <p className={`${TILE_NUM} text-brand-info`}>
                    {stats.shortest != null ? formatLocaleNumber(stats.shortest) : NO_VALUE}
                  </p>
                  <p className={TILE_LABEL}>
                    {t('cycleAnalytics.shortestCycle', 'shortest cycle')}
                  </p>
                </div>
                <div className={TILE}>
                  <p className={`${TILE_NUM} text-brand-info`}>
                    {stats.longest != null ? formatLocaleNumber(stats.longest) : NO_VALUE}
                  </p>
                  <p className={TILE_LABEL}>{t('cycleAnalytics.longestCycle', 'longest cycle')}</p>
                </div>
                <div className={TILE}>
                  <p className={`${TILE_NUM} text-brand-info`}>
                    {stats.longest != null && stats.shortest != null
                      ? formatLocaleNumber(stats.longest - stats.shortest)
                      : NO_VALUE}
                  </p>
                  <p className={TILE_LABEL}>{t('cycleAnalytics.rangeDays', 'range (days)')}</p>
                </div>
                {stats.trend && (
                  <div className={TILE}>
                    <p
                      className={`text-sm font-bold mt-1.5 ${stats.trend === 'stable' ? 'text-brand-emerald' : stats.trend === 'shorter' ? 'text-brand-info' : 'text-brand-gold'}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {stats.trend === 'shorter' ? (
                          <ArrowTrendingDownIcon className="w-4 h-4" aria-hidden="true" />
                        ) : stats.trend === 'longer' ? (
                          <ArrowTrendingUpIcon className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <ArrowsRightLeftIcon className="w-4 h-4" aria-hidden="true" />
                        )}
                        {stats.trend === 'shorter'
                          ? t('cycleAnalytics.trendShorter', 'Getting shorter')
                          : stats.trend === 'longer'
                            ? t('cycleAnalytics.trendLonger', 'Getting longer')
                            : t('cycleAnalytics.trendStable', 'Stable')}
                      </span>
                    </p>
                    <p className={`${TILE_LABEL} mt-1.5`}>
                      {t('cycleAnalytics.trendLabel', 'trend')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Irregularity alert */}
            {stats.irregAlertDays != null && (
              <div
                className={`${CARD} border-brand-gold/40 p-4 text-brand-gold text-xs leading-relaxed flex gap-3`}
              >
                <ExclamationTriangleIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-bold">
                    {t('cycleAnalytics.irregAlertTitle', 'Cycle length change noticed')}
                  </p>
                  <p className="text-white/80 mt-1">
                    {stats.irregAlertDirection === 'longer'
                      ? t('cycleAnalytics.irregAlertLonger', {
                          defaultValue:
                            'Your last cycle was {{days, number}} days longer than average. Worth noting if this continues.',
                          days: stats.irregAlertDays,
                        })
                      : t('cycleAnalytics.irregAlertShorter', {
                          defaultValue:
                            'Your last cycle was {{days, number}} days shorter than average. Worth noting if this continues.',
                          days: stats.irregAlertDays,
                        })}
                  </p>
                </div>
              </div>
            )}

            {/* Predicted windows */}
            <section className={`${CARD} p-5`}>
              <h2 className={SECTION_TITLE}>
                <FlowerIcon className="w-5 h-5 text-brand-pink" />
                {t('cycleAnalytics.expectedWindows', 'Expected windows')}
              </h2>
              <p className={NOTE}>
                {t(
                  'cycleAnalytics.expectedWindowsDesc',
                  'Mean cycle ± variability: a window, not a promise. Your body sets the truth.'
                )}
              </p>
              {stats.windows.length === 0 ? (
                <p className="text-white/70 text-sm mt-3">
                  {t(
                    'cycleAnalytics.logOneCycle',
                    'Log at least one cycle and Rayhanah starts forecasting.'
                  )}
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {stats.windows.map((w, i) => (
                    <motion.div
                      key={w.center}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-3 rounded-control bg-brand-pink/10 border border-brand-pink/40 px-4 py-2.5"
                    >
                      <FlowerIcon className="w-5 h-5 shrink-0 text-brand-pink" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="text-brand-pink text-sm font-bold">
                          {fmt(w.from)} – {fmt(w.to)}
                        </p>
                        <p className="text-white/70 text-[10px]">
                          {t('cycleAnalytics.mostLikelyAround', 'most likely around {{date}}', {
                            date: fmtFull(w.center),
                          })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            {/* Fertile window & ovulation */}
            {stats.fertileWindows.length > 0 && (
              <section className={`${CARD} p-5`}>
                <h2 className={SECTION_TITLE}>
                  <LeafIcon className="w-5 h-5 text-brand-info" />
                  {t('cycleAnalytics.fertileWindowTitle', 'Fertile window')}
                </h2>
                <p className={NOTE}>
                  {t(
                    'cycleAnalytics.fertileWindowDesc',
                    'Estimated ovulation ~14 days before the next period. The fertile window spans ~5 days around it.'
                  )}
                </p>
                <div className="mt-3 space-y-2">
                  {stats.fertileWindows.map((fw, i) => (
                    <motion.div
                      key={fw.ovulation}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-3 rounded-control bg-brand-info/10 border border-brand-info/40 px-4 py-2.5"
                    >
                      <LeafIcon className="w-5 h-5 shrink-0 text-brand-info" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="text-brand-info text-sm font-bold">
                          {fmt(fw.from)} – {fmt(fw.to)}
                        </p>
                        <p className="text-white/70 text-[10px]">
                          {t(
                            'cycleAnalytics.ovulationEstimatedAround',
                            'ovulation estimated around {{date}}',
                            { date: fmtFull(fw.ovulation) }
                          )}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <p className={FOOT}>
                  {t(
                    'cycleAnalytics.fertileWindowDisclaimer',
                    'These are estimates based on your cycle history, not medical advice. The actual ovulation day can vary. For precise tracking, consult a healthcare professional.'
                  )}
                </p>
              </section>
            )}

            {/* PMS pattern */}
            {stats.pmsPatterns.length > 0 && (
              <section className={`${CARD} p-5`}>
                <h2 className={SECTION_TITLE}>
                  <HeartIcon className="w-5 h-5 text-brand-gold" />
                  {t('cycleAnalytics.prePeriodPatternTitle', 'Your pre-period pattern')}
                </h2>
                <p className={NOTE}>
                  {t(
                    'cycleAnalytics.prePeriodPatternDesc',
                    'Symptoms and moods that tend to appear in the week before your period (based on {{count, number}} cycle(s)).',
                    { count: stats.pmsPeriodsAnalyzed }
                  )}
                </p>
                <div className="mt-3 space-y-1.5">
                  {stats.pmsPatterns.map((p) => (
                    <div key={p.key} className="flex items-center gap-2 text-xs">
                      <span className="text-white/80 w-28 truncate">
                        {p.key.startsWith('mood:')
                          ? t(`cycleAnalytics.moodLabel.${p.key.replace('mood:', '')}`, p.label)
                          : t(`cycleAnalytics.symptom.${p.key}`, p.label)}
                      </span>
                      <div className={`${BAR_TRACK} h-3`}>
                        <div
                          className="h-full rounded-full bg-brand-gold/70"
                          style={{ width: `${p.pct}%` }}
                        />
                      </div>
                      <span className="text-brand-gold font-bold w-10 text-right tabular-nums">
                        {formatLocaleNumber(p.pct)}%
                      </span>
                    </div>
                  ))}
                </div>
                <p className={FOOT}>
                  {stats.pmsPeriodsAnalyzed < 3
                    ? t(
                        'cycleAnalytics.logMoreCycles',
                        'Log more cycles with daily symptoms and moods to sharpen this pattern.'
                      )
                    : t(
                        'cycleAnalytics.patternsStrengthen',
                        'These patterns strengthen with every cycle you track.'
                      )}
                </p>
              </section>
            )}

            {/* Cycle & period length history */}
            {stats.gaps.length > 0 && (
              <section className={`${CARD} p-5`}>
                <h2 className={`${SECTION_TITLE} mb-3`}>
                  <ChartBarIcon className="w-5 h-5 text-brand-pink" />
                  {t('cycleAnalytics.cycleLengthHistoryTitle', 'Cycle length history')}
                </h2>
                <div className="space-y-1.5">
                  {stats.gaps.slice(-8).map((g) => (
                    <div key={g.from} className="flex items-center gap-2 text-xs">
                      <span className="text-white/70 w-14">{fmt(g.from)}</span>
                      <div className={`${BAR_TRACK} h-4`}>
                        <div
                          className="h-full rounded-full bg-brand-pink/70"
                          style={{ width: `${(g.days / maxGap) * 100}%` }}
                        />
                      </div>
                      <span className="text-brand-pink font-bold w-8 text-right tabular-nums">
                        {formatLocaleNumber(g.days)}d
                      </span>
                    </div>
                  ))}
                </div>
                {stats.lengths.length > 0 && (
                  <>
                    <h3 className="text-white/80 font-bold text-xs uppercase tracking-wide mt-4 mb-2">
                      {t('cycleAnalytics.periodLengthTitle', 'Period length')}
                    </h3>
                    <div className="space-y-1.5">
                      {stats.lengths.slice(-8).map((l) => (
                        <div key={l.from} className="flex items-center gap-2 text-xs">
                          <span className="text-white/70 w-14">{fmt(l.from)}</span>
                          <div className={`${BAR_TRACK} h-4`}>
                            <div
                              className="h-full rounded-full bg-brand-warm/70"
                              style={{ width: `${(l.days / maxLen) * 100}%` }}
                            />
                          </div>
                          <span className="text-brand-warm font-bold w-8 text-right tabular-nums">
                            {formatLocaleNumber(l.days)}d
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {/* Wellness insights */}
            {(stats.topSymptoms.length > 0 || stats.flowTotal > 0) && (
              <section className={`${CARD} p-5 space-y-4`}>
                <h2 className={SECTION_TITLE}>
                  <HeartIcon className="w-5 h-5 text-brand-pink" />
                  {t('cycleAnalytics.bodyPatternsTitle', "Your body's patterns")}{' '}
                  <span className="text-white/70 text-[11px] font-normal font-body">
                    {t('cycleAnalytics.last60Days', '(last 60 days)')}
                  </span>
                </h2>
                {stats.topSymptoms.length > 0 && (
                  <div className="space-y-1.5">
                    {stats.topSymptoms.map(([sy, n]) => (
                      <div key={sy} className="flex items-center gap-2 text-xs">
                        <span className="text-white/80 w-28">
                          {t(`cycleAnalytics.symptom.${sy}`, SYMPTOM_LABEL[sy] ?? sy)}
                        </span>
                        <div className={`${BAR_TRACK} h-3`}>
                          <div
                            className="h-full rounded-full bg-brand-pink/70"
                            style={{ width: `${Math.min(100, n * 12)}%` }}
                          />
                        </div>
                        <span className="text-white/70 w-14 text-right whitespace-nowrap">
                          {t('cycleAnalytics.nDays', '{{count, number}} day(s)', { count: n })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {stats.flowTotal > 0 && (
                  <div>
                    <p className="text-white/70 text-[11px] font-bold uppercase tracking-wide mb-1.5">
                      {t('cycleAnalytics.flowMix', 'Flow mix')}
                    </p>
                    <div className="flex h-3 rounded-full overflow-hidden">
                      {stats.flowLight > 0 && (
                        <div
                          className="bg-brand-pink/60"
                          style={{ width: `${(stats.flowLight / stats.flowTotal) * 100}%` }}
                        />
                      )}
                      {stats.flowMed > 0 && (
                        <div
                          className="bg-brand-pink/70"
                          style={{ width: `${(stats.flowMed / stats.flowTotal) * 100}%` }}
                        />
                      )}
                      {stats.flowHeavy > 0 && (
                        <div
                          className="bg-brand-pink-dim/80"
                          style={{ width: `${(stats.flowHeavy / stats.flowTotal) * 100}%` }}
                        />
                      )}
                    </div>
                    <p className="text-white/70 text-[10px] mt-1">
                      {t(
                        'cycleAnalytics.flowMixSummary',
                        '{{light, number}} light · {{medium, number}} medium · {{heavy, number}} heavy',
                        { light: stats.flowLight, medium: stats.flowMed, heavy: stats.flowHeavy }
                      )}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Fasting makeup summary */}
            {stats.totalExcusedDays > 0 && (
              <section className={`${CARD} p-5`}>
                <h2 className={SECTION_TITLE}>
                  <CrescentIcon className="w-5 h-5 text-brand-gold" />
                  {t('cycleAnalytics.fastingMakeupTitle', 'Fasting makeup')}
                </h2>
                <p className={NOTE}>
                  {t(
                    'cycleAnalytics.fastingMakeupDesc',
                    'Ramadan fasts missed during cycles are made up later'
                  )}{' '}
                  (
                  <a
                    className="underline"
                    href="https://sunnah.com/muslim:335"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {translateReference('Muslim 335', i18n.language)}
                  </a>
                  ).
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-control border border-brand-border bg-brand-surface/50 p-3 text-center">
                    <p className="font-display text-2xl font-bold text-brand-gold">
                      {formatLocaleNumber(fastingSummary?.profile?.qadaOwed ?? 0)}
                    </p>
                    <p className={TILE_LABEL}>{t('cycleAnalytics.owed', 'owed')}</p>
                  </div>
                  <div className="rounded-control border border-brand-border bg-brand-surface/50 p-3 text-center">
                    <p className="font-display text-2xl font-bold text-brand-emerald">
                      {formatLocaleNumber(fastingSummary?.qadaCompleted ?? 0)}
                    </p>
                    <p className={TILE_LABEL}>{t('cycleAnalytics.madeUp', 'made up')}</p>
                  </div>
                  <div className="rounded-control border border-brand-border bg-brand-surface/50 p-3 text-center">
                    <p className="font-display text-2xl font-bold text-white">
                      {formatLocaleNumber(
                        Math.max(
                          0,
                          (fastingSummary?.profile?.qadaOwed ?? 0) -
                            (fastingSummary?.qadaCompleted ?? 0)
                        )
                      )}
                    </p>
                    <p className={TILE_LABEL}>{t('cycleAnalytics.remaining', 'remaining')}</p>
                  </div>
                </div>
                <button
                  className="mt-3 w-full inline-flex items-center justify-center gap-0.5 text-brand-gold text-xs font-bold hover:underline"
                  onClick={() => navigate('/fasting')}
                >
                  {t('cycleAnalytics.openFastingTracker', 'Open fasting tracker')}
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              </section>
            )}

            {/* History + past-period backfill + export */}
            <section className={`${CARD} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className={SECTION_TITLE}>
                  <CalendarDaysIcon className="w-5 h-5 text-brand-pink" />
                  {t('cycleAnalytics.fullHistoryTitle', 'Full history')}
                </h2>
                <div className="flex items-center gap-2">
                  {(summary?.logs ?? []).length > 0 && (
                    <button
                      className="inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-bold border border-brand-border bg-brand-surface/50 text-white/85 hover:border-brand-info/50 transition-colors"
                      onClick={exportCsv}
                    >
                      <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                      {t('cycleAnalytics.exportCsv', 'Export CSV')}
                    </button>
                  )}
                  <button
                    className="inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-bold border border-brand-pink/50 bg-brand-pink/10 text-brand-pink hover:bg-brand-pink/20 transition-colors"
                    onClick={() => {
                      setPastStart('');
                      setPastEnd('');
                      setPastType('hayd');
                      setPastOpen(true);
                    }}
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    {t('cycleAnalytics.logPastPeriod', 'Log a past period')}
                  </button>
                </div>
              </div>
              {(summary?.logs ?? []).length === 0 ? (
                <p className="text-white/70 text-xs">
                  {t(
                    'cycleAnalytics.nothingYetHistory',
                    'Nothing yet. Add your last few periods and predictions wake up immediately.'
                  )}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {(summary?.logs ?? []).map((l) => (
                    <div
                      key={l._id}
                      className="flex items-center gap-3 rounded-control border border-brand-border bg-brand-surface/50 px-3 py-2 text-xs"
                    >
                      {l.type === 'nifas' ? (
                        <HeartIcon
                          className="w-4 h-4 shrink-0 text-brand-warm"
                          aria-hidden="true"
                        />
                      ) : (
                        <FlowerIcon
                          className="w-4 h-4 shrink-0 text-brand-pink"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-white/85 flex-1">
                        {fmtFull(l.startDate)} –{' '}
                        {l.endDate ? fmtFull(l.endDate) : t('cycleAnalytics.ongoing', 'ongoing')}
                        {l.endDate && (
                          <span className="text-white/70">
                            {' '}
                            · {formatLocaleNumber(daysBetween(l.startDate, l.endDate) + 1)}d
                          </span>
                        )}
                      </span>
                      <button
                        aria-label={t('rayhanah.editEntry', 'Edit entry')}
                        className="p-1 text-white/70 hover:text-brand-pink"
                        onClick={() =>
                          setEditTarget({
                            _id: l._id,
                            startDate: l.startDate,
                            endDate: l.endDate,
                          })
                        }
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        aria-label={t('cycleAnalytics.deleteEntry', 'Delete entry')}
                        className="p-1 text-white/70 hover:text-red-300"
                        onClick={() =>
                          setPendingDelete({
                            id: l._id,
                            label: `${fmtFull(l.startDate)} – ${l.endDate ? fmtFull(l.endDate) : t('cycleAnalytics.ongoing', 'ongoing')}`,
                          })
                        }
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className={FOOT}>
                {t(
                  'cycleAnalytics.historyDisclaimer',
                  'Estimates only. They help you prepare; they never define you. If bleeding patterns worry you, speak to a doctor; for the fiqh of unusual bleeding see the istiḥāḍa note on the Cycle page.'
                )}
              </p>
            </section>
          </>
        )}
      </div>

      {/* Past period modal */}
      {pastOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
            onClick={() => setPastOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-card bg-brand-deep border border-brand-pink/40 shadow-elev-3 p-6 space-y-4"
              role="dialog"
              aria-label={t('cycleAnalytics.logPastPeriodTitle', 'Log a past period')}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-white font-bold text-xl flex items-center gap-2">
                <CalendarDaysIcon className="w-6 h-6 text-brand-pink" />
                {t('cycleAnalytics.logPastPeriodTitle', 'Log a past period')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/75 text-xs font-bold" htmlFor="past-start">
                    {t('cycleAnalytics.started', 'Started')}
                  </label>
                  <input
                    id="past-start"
                    type="date"
                    value={pastStart}
                    max={today}
                    onChange={(e) => setPastStart(e.target.value)}
                    className="input input-bordered input-sm w-full mt-1 rounded-control bg-brand-surface/50 border-brand-border text-white"
                  />
                </div>
                <div>
                  <label className="text-white/75 text-xs font-bold" htmlFor="past-end">
                    {t('cycleAnalytics.ended', 'Ended')}
                  </label>
                  <input
                    id="past-end"
                    type="date"
                    value={pastEnd}
                    max={today}
                    onChange={(e) => setPastEnd(e.target.value)}
                    className="input input-bordered input-sm w-full mt-1 rounded-control bg-brand-surface/50 border-brand-border text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {(['hayd', 'nifas'] as const).map((item) => (
                  <button
                    key={item}
                    aria-pressed={pastType === item}
                    className={`flex-1 rounded-control border px-3 py-2 text-xs font-bold transition-colors ${pastType === item ? 'bg-brand-pink/15 border-brand-pink/60 text-brand-pink' : 'bg-brand-surface/50 border-brand-border text-white/75 hover:text-white'}`}
                    onClick={() => setPastType(item)}
                  >
                    {item === 'hayd'
                      ? t('cycleAnalytics.periodHayd', 'Period')
                      : t('cycleAnalytics.postNatal', 'Nifās')}
                  </button>
                ))}
              </div>
              <button
                className={`${BTN_PRIMARY} w-full`}
                disabled={!pastStart || !pastEnd || addPast.isPending}
                onClick={() =>
                  addPast.mutate(
                    { startDate: pastStart, endDate: pastEnd, type: pastType },
                    {
                      onSuccess: () => setPastOpen(false),
                      onError: (e) => {
                        if (e instanceof OfflineQueuedError) setPastOpen(false);
                      },
                    }
                  )
                }
              >
                {addPast.isPending ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  t('cycleAnalytics.addToMyHistory', 'Add to my history')
                )}
              </button>
              <p className="text-white/70 text-[10px] text-center">
                {t(
                  'cycleAnalytics.addPastPeriodsNote',
                  'Add your last 3–6 periods and the predictions become genuinely yours.'
                )}
              </p>
            </div>
          </div>,
          document.body
        )}

      <CycleEditModal target={editTarget} today={today} onClose={() => setEditTarget(null)} />
      <RayhanahSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <ConfirmDialog
        open={!!pendingDelete}
        title={t('cycleAnalytics.removeCycleTitle', 'Remove this cycle?')}
        message={
          pendingDelete
            ? t(
                'cycleAnalytics.removeCycleMessage',
                '{{label}} will be removed from your history and predictions.',
                { label: pendingDelete.label }
              )
            : ''
        }
        onConfirm={() => {
          if (pendingDelete) deleteLog.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </AnimatedBackground>
  );
}
