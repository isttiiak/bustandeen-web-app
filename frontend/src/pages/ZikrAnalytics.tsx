import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import AnimatedBackground from '../components/AnimatedBackground.js';
import TabNav from '../components/TabNav.js';
import DemoSignInGate from '../components/DemoSignInGate.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { ChartBarIcon, PlusCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
import { useZikrTypes, useAddZikrType } from '../hooks/useZikrTypes.js';
import { useZikrStore } from '../store/useZikrStore.js';
import { useUiStore } from '../store/useUiStore.js';
import { zikrDisplayName } from '../utils/zikrLibrary.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import api from '../lib/api.js';
import { getUserTimezoneOffset } from '../utils/timezone.js';
import { getTrackingDay, getTrackingDayMiddayTs } from '../utils/trackingDay.js';
import { formatLocaleDate, formatLocaleTime } from '../utils/localeDate.js';

// ─── Manual Entry Modal ───────────────────────────────────────────────────────

interface ManualEntryModalProps {
  onClose: () => void;
  todayPerType: Array<{ zikrType: string; total: number }>;
  localCounts: Record<string, number>;
}

function ManualEntryModal({ onClose, todayPerType, localCounts }: ManualEntryModalProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { types, addConfirmedCounts, setTypes, setCustomMeaning } = useZikrStore();
  const { data: fetchedTypes } = useZikrTypes();
  const addZikrType = useAddZikrType();

  // Merge store types + server types deduplicated
  const allTypes = [...new Set([...types, ...(fetchedTypes ?? []).map((ft) => ft.name)])];

  const [selectedType, setSelectedType] = useState(allTypes[0] ?? 'SubhanAllah');
  const [amount, setAmount] = useState('');
  // 0 = today, 1 = yesterday, 2 = two days ago — matches the streak grace
  // window, so backfilling can repair a broken chain.
  const [daysBack, setDaysBack] = useState<0 | 1 | 2>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const dayLabel = (n: number): string => {
    if (n === 0) return t('common.today');
    if (n === 1) return t('zikrAnalytics.yesterday');
    const d = new Date();
    d.setDate(d.getDate() - n);
    return formatLocaleDate(d, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Add-new-type sub-form
  const [showAddNew, setShowAddNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newArabic, setNewArabic] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  // Existing count for the selected type today
  const serverCount = todayPerType.find((tp) => tp.zikrType === selectedType)?.total ?? 0;
  const localCount = localCounts[selectedType] ?? 0;
  const existingCount = Math.max(serverCount, localCount);

  const parsedAmount = Math.max(0, parseInt(amount) || 0);
  const newTotal = existingCount + parsedAmount;

  const handleSubmit = async () => {
    if (parsedAmount <= 0) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      // Every day (incl. today) is anchored at the TRACKING day's midday so
      // the count lands in the right Fajr-boundary bucket for any timezone.
      const d = new Date(getTrackingDayMiddayTs());
      d.setDate(d.getDate() - daysBack);
      const ts = d.getTime();
      await api.post('/api/zikr/increment/batch', {
        increments: [{ zikrType: selectedType, amount: parsedAmount, ts }],
        timezoneOffset: getUserTimezoneOffset(),
        today: getTrackingDay(),
      });
      // Local live counter only reflects TODAY — don't inflate it with backfills
      if (daysBack === 0) addConfirmedCounts(selectedType, parsedAmount);
      // Close IMMEDIATELY — the modal used to await the full analytics
      // refetch here, which made saving feel slow on mobile networks. The
      // refetch happens in the background; the charts catch up on their own.
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success(
        `${t('zikrAnalytics.backfillToast', { amount: formatLocaleNumber(parsedAmount), type: zikrDisplayName(selectedType, i18n.language), day: dayLabel(daysBack).toLowerCase() })} 📿`,
        { id: 'zikr-backfill' }
      );
      onClose();
    } catch {
      setSubmitError(t('zikrAnalytics.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNewType = () => {
    const name = newName.trim();
    const meaning = newMeaning.trim();
    if (!name || !meaning) return;
    addZikrType.mutate(name, {
      onSuccess: () => {
        setCustomMeaning(name, {
          arabic: newArabic.trim() || undefined,
          meaning,
          source: newSource.trim() || undefined,
          sourceUrl: newSourceUrl.trim() || undefined,
        });
        setTypes([...types, name]);
        setSelectedType(name);
        setShowAddNew(false);
        setNewName('');
        setNewArabic('');
        setNewMeaning('');
        setNewSource('');
        setNewSourceUrl('');
        setSubmitError('');
      },
      onError: () => setSubmitError(t('zikrAnalytics.addTypeError')),
    });
  };

  // Portaled to <body>: rendering inside the page's transformed/animated
  // ancestors created a stacking context that let the sticky navbar float
  // OVER the form. max-h + scroll keep it usable with the keyboard open.
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-brand-surface rounded-3xl w-full max-w-md shadow-2xl border border-brand-border overflow-hidden max-h-[88vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-brand-border/60">
          <div>
            <h3 className="text-lg font-black text-brand-emerald">
              {t('zikrAnalytics.logMissedCounts')}
            </h3>
            <p className="text-white/30 text-xs mt-0.5">{t('zikrAnalytics.logMissedSubtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-1 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!showAddNew ? (
            <>
              {/* Which day — today or up to 2 days back (streak grace window) */}
              <div className="space-y-1.5">
                <label className="text-xs text-white/50 uppercase tracking-wider font-bold">
                  {t('zikrAnalytics.whichDay')}
                </label>
                <div className="flex gap-1.5">
                  {([0, 1, 2] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setDaysBack(n);
                        setSubmitError('');
                      }}
                      className={`flex-1 px-2 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        daysBack === n
                          ? 'bg-brand-emerald/20 border-brand-emerald/60 text-brand-emerald'
                          : 'bg-brand-deep border-brand-border text-white/40 hover:text-white/70'
                      }`}
                    >
                      {dayLabel(n)}
                    </button>
                  ))}
                </div>
                {daysBack > 0 && (
                  <p className="text-brand-info/70 text-[11px]">
                    🧊 {t('zikrAnalytics.backfillNote')}
                  </p>
                )}
              </div>

              {/* Type selector */}
              <div className="space-y-1.5">
                <label className="text-xs text-white/50 uppercase tracking-wider font-bold">
                  {t('zikrAnalytics.zikrType')}
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setAmount('');
                    setSubmitError('');
                  }}
                  className="select select-bordered w-full bg-brand-deep border-brand-border text-white focus:border-brand-emerald text-sm"
                >
                  {allTypes.map((tn) => (
                    <option key={tn} value={tn} className="bg-brand-deep">
                      {zikrDisplayName(tn, i18n.language)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setShowAddNew(true);
                    setSubmitError('');
                  }}
                  className="flex items-center gap-1.5 text-brand-emerald/70 hover:text-brand-emerald text-xs font-semibold transition-colors"
                >
                  <PlusCircleIcon className="w-3.5 h-3.5" />
                  {t('zikrAnalytics.addNewDhikrType')}
                </button>
              </div>

              {/* Amount FIRST (Istiak: type → save, fastest path), context after */}
              <div className="space-y-1.5">
                <label className="text-xs text-white/50 uppercase tracking-wider font-bold">
                  {t('zikrAnalytics.countsToAdd')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setSubmitError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSubmit();
                  }}
                  placeholder={t('zikrAnalytics.egAmount')}
                  className="input input-bordered w-full bg-brand-deep border-brand-border text-white focus:border-brand-emerald text-lg font-bold"
                  autoFocus
                />
              </div>

              {/* Today's existing count (only meaningful for today) */}
              {daysBack === 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-brand-emerald/10">
                  <span className="text-white/50 text-sm">
                    {t('zikrAnalytics.todaysCountSoFar')}
                  </span>
                  <span className="text-white font-black text-lg tabular-nums">
                    {formatLocaleNumber(existingCount)}
                  </span>
                </div>
              )}

              {/* Total preview */}
              {parsedAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-brand-emerald/10 border border-brand-emerald/30"
                >
                  {daysBack === 0 ? (
                    <>
                      <span className="text-brand-emerald/80 text-sm font-semibold">
                        {formatLocaleNumber(existingCount)} + {formatLocaleNumber(parsedAmount)}
                      </span>
                      <span className="text-brand-emerald font-black text-xl tabular-nums">
                        = {formatLocaleNumber(newTotal)}
                      </span>
                    </>
                  ) : (
                    <span className="text-brand-emerald font-bold text-sm">
                      {t('zikrAnalytics.backfillPreview', {
                        amount: formatLocaleNumber(parsedAmount),
                        day: dayLabel(daysBack),
                      })}
                    </span>
                  )}
                </motion.div>
              )}

              {submitError && <p className="text-red-400 text-xs">{submitError}</p>}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="btn flex-1 btn-ghost text-white/60 border-brand-border"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => void handleSubmit()}
                  disabled={parsedAmount <= 0 || submitting}
                  className="btn flex-1 bg-brand-emerald hover:bg-brand-emerald-dim text-white border-0 font-bold disabled:opacity-40"
                >
                  {submitting ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    t('zikrAnalytics.saveCounts')
                  )}
                </button>
              </div>
            </>
          ) : (
            // ── Add new dhikr sub-form ─────────────────────────────────────────
            <>
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => {
                    setShowAddNew(false);
                    setSubmitError('');
                  }}
                  className="text-white/40 hover:text-white text-xs transition-colors flex items-center gap-1"
                >
                  ← {t('common.back')}
                </button>
                <span className="text-white/25 text-xs">{t('zikrAnalytics.newDhikrType')}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">
                    {t('zikrAnalytics.nameLabel')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t('zikrAnalytics.egName')}
                    className="input input-bordered w-full bg-brand-deep border-brand-border text-white focus:border-brand-emerald text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">
                    {t('zikrAnalytics.arabicLabel')}{' '}
                    <span className="text-white/25">({t('common.optional')})</span>
                  </label>
                  <input
                    value={newArabic}
                    onChange={(e) => setNewArabic(e.target.value)}
                    placeholder="حَسْبُنَا اللَّهُ"
                    dir="rtl"
                    className="input input-bordered w-full bg-brand-deep border-brand-border text-white focus:border-brand-emerald text-base"
                    style={{ fontFamily: "'Amiri', serif" }}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">
                    {t('zikrAnalytics.englishMeaning')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={newMeaning}
                    onChange={(e) => setNewMeaning(e.target.value)}
                    placeholder={t('zikrAnalytics.egMeaning')}
                    className="input input-bordered w-full bg-brand-deep border-brand-border text-white focus:border-brand-emerald text-sm"
                  />
                </div>
                <div className="border-t border-brand-border/60 pt-3 space-y-2">
                  <p className="text-white/25 text-[10px] uppercase tracking-wider">
                    {t('zikrAnalytics.sourceLabel')}{' '}
                    <span className="normal-case text-white/20">({t('common.optional')})</span>
                  </p>
                  <input
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder={t('zikrAnalytics.egSource')}
                    className="input input-sm input-bordered w-full bg-brand-deep border-brand-border text-white focus:border-brand-emerald text-xs"
                  />
                  <input
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    placeholder="https://quran.com/3/173"
                    className="input input-sm input-bordered w-full bg-brand-deep border-brand-border text-white focus:border-brand-emerald text-xs"
                  />
                </div>
              </div>

              {submitError && <p className="text-red-400 text-xs">{submitError}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    setShowAddNew(false);
                    setSubmitError('');
                  }}
                  className="btn flex-1 btn-ghost text-white/60 border-brand-border"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleAddNewType}
                  disabled={!newName.trim() || !newMeaning.trim() || addZikrType.isPending}
                  className="btn flex-1 bg-brand-emerald hover:bg-brand-emerald-dim text-white border-0 font-bold disabled:opacity-40"
                >
                  {addZikrType.isPending ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    t('zikr.addDhikr')
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ─── Heatmap Calendar ─────────────────────────────────────────────────────────

const TYPE_COLORS = [
  'var(--brand-emerald, #7a9e6e)',
  '#60a5fa',
  '#f59e0b',
  '#f472b6',
  '#a78bfa',
  '#34d399',
  '#fb923c',
];

interface HeatmapDay {
  date: string;
  total: number;
  status?: string;
}

function HeatmapCalendar({ data }: { data: HeatmapDay[] }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<HeatmapDay | null>(null);

  const cells = useMemo(() => {
    if (!data.length) return [];
    const byDate = new Map(data.map((d) => [d.date, d]));
    // Fill from first data date to today
    const start = new Date(data[0].date + 'T12:00:00');
    const end = new Date(data[data.length - 1].date + 'T12:00:00');
    // Pad to start of a Sunday
    const startDow = start.getDay();
    const padded: Array<{ date: string; total: number; empty: boolean }> = [];
    for (let i = 0; i < startDow; i++) {
      padded.push({ date: '', total: 0, empty: true });
    }
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const cell = byDate.get(key);
      padded.push({ date: key, total: cell?.total ?? 0, empty: false });
    }
    return padded;
  }, [data]);

  const maxVal = useMemo(() => Math.max(1, ...cells.map((c) => c.total)), [cells]);

  const intensityColor = (total: number) => {
    if (total === 0) return 'rgba(255,255,255,0.05)';
    const t = Math.min(1, total / maxVal);
    if (t < 0.25) return 'rgba(122,158,110,0.25)';
    if (t < 0.5) return 'rgba(122,158,110,0.5)';
    if (t < 0.75) return 'rgba(122,158,110,0.75)';
    return 'rgba(122,158,110,1)';
  };

  const weeks: Array<typeof cells> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="space-y-2">
      {hovered && hovered.date !== '' && (
        <p className="text-xs text-white/50 h-4">
          {formatLocaleDate(new Date(hovered.date + 'T12:00:00'), {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            weekday: 'short',
          })}
          {' · '}
          <span className="text-white font-bold">{formatLocaleNumber(hovered.total)}</span>
        </p>
      )}
      {!hovered && <div className="h-4" />}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px]" style={{ width: 'max-content' }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell, di) => (
                <div
                  key={`${wi}-${di}`}
                  title={cell.date ? `${cell.date}: ${formatLocaleNumber(cell.total)}` : ''}
                  onMouseEnter={() => !cell.empty && setHovered(cell)}
                  onMouseLeave={() => setHovered(null)}
                  className="rounded-[2px] cursor-default"
                  style={{
                    width: 11,
                    height: 11,
                    background: cell.empty ? 'transparent' : intensityColor(cell.total),
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-white/25 text-[10px]">{t('zikrAnalytics.heatmapLess', 'Less')}</span>
        {[0, 0.25, 0.5, 0.75, 1].map((lvl) => (
          <div
            key={lvl}
            className="rounded-[2px]"
            style={{
              width: 10,
              height: 10,
              background: lvl === 0 ? 'rgba(255,255,255,0.05)' : `rgba(122,158,110,${lvl})`,
            }}
          />
        ))}
        <span className="text-white/25 text-[10px]">{t('zikrAnalytics.heatmapMore', 'More')}</span>
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
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={pad2Left - 6}
            y={t.y + 4}
            textAnchor="end"
            className="fill-white/30"
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
          stroke="rgba(255,255,255,0.2)"
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
            stroke="#0e0d0a"
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
            className="fill-white/30"
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
  const [newGoal, setNewGoal] = useState(100);
  const [newGraceDays, setNewGraceDays] = useState(1);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [sessionsDate, setSessionsDate] = useState(() => getTrackingDay());

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
            <div className="text-5xl">{isRateLimit ? '⏳' : '⚠️'}</div>
            <div>
              <p className="text-lg font-bold text-white mb-1">
                {isRateLimit ? t('zikrAnalytics.tooManyRequests') : t('zikrAnalytics.couldNotLoad')}
              </p>
              <p className="text-sm text-white/50">
                {isRateLimit ? t('zikrAnalytics.rateLimitMsg') : errMsg}
              </p>
            </div>
            <button
              className="btn bg-brand-emerald hover:bg-brand-emerald-dim text-white border-none"
              onClick={() => void refetch()}
            >
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
        emoji="📊"
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
              { label: `📿 ${t('zikr.counter')}`, to: '/zikr' },
              { label: `📊 ${t('zikr.analytics')}`, to: '/zikr/analytics', active: true },
            ]}
          />
        }
      />
    );
  }

  return (
    <AnimatedBackground variant="dark">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Tab navigation */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabNav
              items={[
                { label: `📿 ${t('zikr.counter')}`, to: '/zikr' },
                { label: `📊 ${t('zikr.analytics')}`, to: '/zikr/analytics', active: true },
              ]}
            />

            {/* Log missed counts button */}
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowManualEntry(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-emerald/15 hover:bg-brand-emerald/25 border border-brand-emerald/40 hover:border-brand-emerald/70 text-brand-emerald text-sm font-bold transition-all"
            >
              <PlusCircleIcon className="w-4 h-4" />
              {t('zikrAnalytics.logMissedCounts')}
            </motion.button>
          </div>

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
                className="rounded-2xl bg-brand-deep/80 border border-brand-border p-4 text-center"
              >
                <p className={`text-2xl font-black ${s.accent}`}>{s.value}</p>
                <p className="text-white/30 text-[10px] font-bold uppercase mt-1">{s.label}</p>
                {s.sub && <p className="text-white/20 text-[10px] mt-0.5">{s.sub}</p>}
              </motion.div>
            ))}
          </div>

          {/* Breakdown by Type */}
          <div className="rounded-2xl bg-brand-deep/80 border border-brand-border p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-white font-black text-sm flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 text-brand-emerald" />{' '}
                {t('zikrAnalytics.breakdownByType')}
              </h2>
              <div className="tabs tabs-boxed tabs-sm bg-brand-surface border border-brand-border">
                {(['today', 'all'] as const).map((tab) => (
                  <button
                    key={tab}
                    className={`tab text-xs ${activeTab === tab ? 'tab-active bg-brand-emerald text-white font-bold' : 'text-white/60'}`}
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
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct > 0 ? Math.max(pct, 2) : 0}%` }}
                          transition={{ duration: 0.6, delay: i * 0.03 }}
                          className="h-full rounded-full bg-gradient-to-r from-brand-emerald/80 to-brand-info/80"
                        />
                      </div>
                      <p className="text-white/20 text-[10px] mt-0.5">{pct.toFixed(1)}%</p>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p className="text-white/30 text-sm text-center py-8">
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
              <h2 className="text-white font-black text-sm flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 text-brand-emerald" /> {t('zikrAnalytics.trend')}
              </h2>
              <div className="tabs tabs-boxed tabs-sm bg-brand-deep border border-brand-border">
                {periods.map((p) => (
                  <button
                    key={p.value}
                    className={`tab text-xs ${selectedPeriod === p.value ? 'tab-active bg-brand-emerald text-white font-bold' : 'text-white/60'}`}
                    onClick={() => setSelectedPeriod(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {allTime?.totalCount === 0 ? (
              <div className="rounded-2xl bg-brand-deep/60 border border-brand-border/60 p-6 text-center">
                <p className="text-white/40 text-sm">
                  {t(
                    'zikrAnalytics.newUserTrend',
                    'Your trend will appear here once you start counting zikr. 🌱'
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
              <div className="rounded-2xl bg-brand-deep/80 border border-brand-border p-4 sm:p-5 space-y-3">
                <h2 className="text-white font-black text-sm flex items-center gap-2">
                  <ChartBarIcon className="w-4 h-4 text-brand-info" />
                  {t('zikrAnalytics.perTypeTrend', 'Per-type trends')}
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
                      <span className="text-white/60 text-[11px]">
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
          <div className="rounded-2xl bg-brand-deep/80 border border-brand-border p-4 sm:p-5 space-y-3">
            <h2 className="text-white font-black text-sm flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4 text-brand-gold" />
              {t('zikrAnalytics.timeOfDay.title', 'Time of day')}
              <span className="text-white/25 text-[10px] font-normal">
                {t('zikrAnalytics.timeOfDay.subtitle', 'last 30 days')}
              </span>
            </h2>
            <TimeOfDayChart data={timeOfDayData} />
          </div>

          {/* ── Contribution heatmap ─────────────────────────────────────────── */}
          {yearData?.chartData && yearData.chartData.length > 0 && (
            <div className="rounded-2xl bg-brand-deep/80 border border-brand-border p-4 sm:p-5 space-y-2">
              <h2 className="text-white font-black text-sm flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 text-brand-emerald" />
                {t('zikrAnalytics.heatmap', 'Activity heatmap')}
                <span className="text-white/25 text-[10px] font-normal">
                  {t('zikrAnalytics.heatmapSub', 'last 365 days')}
                </span>
              </h2>
              {allTime?.totalCount === 0 ? (
                <p className="text-white/40 text-sm text-center py-6">
                  {t(
                    'zikrAnalytics.newUserHeatmap',
                    'Not enough activity yet — this fills in as you go. 🌱'
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
            const dowNames = [
              'Sunday',
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
            ];
            const records = [
              {
                label: t('zikrAnalytics.bestDayRecord', 'Best day'),
                value: allTime?.bestDay?.count ? formatLocaleNumber(allTime.bestDay.count) : '—',
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
                  ? `${formatLocaleNumber(streak.longestStreak)} d`
                  : '—',
                sub: '',
                accent: 'text-brand-gold',
              },
              {
                label: t('zikrAnalytics.avgActiveDay', 'Avg on active days'),
                value: avgActive ? formatLocaleNumber(avgActive) : '—',
                sub: `${activeDays.length} active days`,
                accent: 'text-brand-info',
              },
              {
                label: t('zikrAnalytics.mostActiveDay', 'Most active day'),
                value: dayOfWeekTotals[bestDow] > 0 ? dowNames[bestDow] : '—',
                sub: '',
                accent: 'text-brand-warm',
              },
            ];
            return (
              <div className="rounded-2xl bg-brand-deep/80 border border-brand-border p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-white font-black text-sm flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4 text-brand-gold" />
                    {t('zikrAnalytics.personalRecords', 'Personal records')}
                  </h2>
                  <button
                    onClick={() =>
                      exportCsv(chartData, [
                        ...new Set(chartData.flatMap((d) => Object.keys(d.breakdown ?? {}))),
                      ])
                    }
                    className="flex items-center gap-1.5 text-white/40 hover:text-brand-emerald text-xs font-semibold transition-colors"
                    title={t('zikrAnalytics.exportCsv', 'Export CSV')}
                  >
                    ↓ CSV
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {records.map((r) => (
                    <div
                      key={r.label}
                      className="rounded-xl bg-white/5 border border-brand-border p-3 text-center"
                    >
                      <p className={`text-xl font-black ${r.accent}`}>{r.value}</p>
                      <p className="text-white/30 text-[10px] font-bold uppercase mt-1">
                        {r.label}
                      </p>
                      {r.sub && <p className="text-white/20 text-[10px] mt-0.5">{r.sub}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── Session history ───────────────────────────────────────────────── */}
          <div className="rounded-2xl bg-brand-deep/80 border border-brand-border p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-white font-black text-sm flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 text-brand-info" />
                {t('zikrAnalytics.sessions.title', 'Session history')}
              </h2>
              <input
                type="date"
                value={sessionsDate}
                max={getTrackingDay()}
                onChange={(e) => setSessionsDate(e.target.value)}
                className="input input-xs input-bordered bg-brand-surface border-brand-border text-white/80 text-xs"
              />
            </div>
            {sessionsLoading ? (
              <p className="text-white/30 text-xs text-center py-4">
                {t('common.loading', 'Loading…')}
              </p>
            ) : sessionsData && sessionsData.length > 0 ? (
              <div className="space-y-2">
                {sessionsData.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-brand-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-white/80 text-sm font-semibold tabular-nums">
                        {formatLocaleTime(new Date(s.start), {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {' – '}
                        {formatLocaleTime(new Date(s.end), { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(s.perType).map(([type, count]) => (
                          <span
                            key={type}
                            className="px-1.5 py-0.5 rounded-md bg-black/30 border border-brand-border text-[10px] text-white/50"
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
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-xs text-center py-4">
                {t('zikrAnalytics.sessions.empty', 'No sessions logged for this day')}
              </p>
            )}
          </div>
        </div>

        {/* Set Goal modal */}
        {showGoalModal && (
          <div className="modal modal-open">
            <motion.div
              className="modal-box bg-brand-surface border border-brand-border shadow-2xl rounded-2xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <h3 className="font-black text-2xl mb-6 text-brand-emerald">
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
                  className="input input-bordered bg-brand-deep border-brand-border text-white focus:border-brand-emerald"
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
                  className="select select-bordered bg-brand-deep border-brand-border text-white focus:border-brand-emerald"
                >
                  <option value={0}>{t('zikrAnalytics.grace0')}</option>
                  <option value={1}>{t('zikrAnalytics.grace1')}</option>
                  <option value={2}>{t('zikrAnalytics.grace2')}</option>
                  <option value={3}>{t('zikrAnalytics.grace3')}</option>
                </select>
                <label className="label">
                  <span className="label-text-alt text-white/30">
                    {t('zikrAnalytics.graceDaysNote')}
                  </span>
                </label>
              </div>
              <div className="modal-action">
                <button
                  className="btn bg-brand-deep border-brand-border text-white/60"
                  onClick={() => setShowGoalModal(false)}
                  disabled={isUpdating}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className="btn bg-brand-emerald hover:bg-brand-emerald-dim text-white border-none font-bold"
                  onClick={handleUpdateGoal}
                  disabled={isUpdating || !newGoal || newGoal < 1}
                >
                  {updateGoal.isPending ? t('zikrAnalytics.updating') : t('zikrAnalytics.saveGoal')}
                </button>
              </div>
            </motion.div>
            <div
              className="modal-backdrop bg-black/60 backdrop-blur-sm"
              onClick={() => setShowGoalModal(false)}
            />
          </div>
        )}
      </div>

      {/* Manual entry modal */}
      <AnimatePresence>
        {showManualEntry && (
          <ManualEntryModal
            onClose={() => setShowManualEntry(false)}
            todayPerType={todayTypes}
            localCounts={localCounts}
          />
        )}
      </AnimatePresence>
    </AnimatedBackground>
  );
}
