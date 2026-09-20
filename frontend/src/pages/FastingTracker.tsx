import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import AnimatedBackground from '../components/AnimatedBackground.js';
import TabNav from '../components/TabNav.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { celebrateFast } from '../utils/celebrate.js';
import { useCycleActive } from '../hooks/useCycle.js';
import { getRamadanWindow } from '../utils/ramadan.js';
import ExcusedCard from '../components/ExcusedCard.js';
import FastingCompanion from '../components/ai/FastingCompanion.js';
import ConfirmDialog from '../components/ConfirmDialog.js';
import Seo from '../components/Seo.js';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  XMarkIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import {
  useFastingLog,
  useFastingSummary,
  useFastingHistory,
  useUpsertFastingLog,
  useClearFastingLog,
  useUpdateFastingProfile,
  useAddVow,
  useDeleteVow,
  localTodayStr,
  UpsertFastingVars,
} from '../hooks/useFasting.js';
import {
  getDayRuling,
  FastingCategory,
  FastingStatus,
  VoluntaryKind,
  VOLUNTARY_META,
  VOLUNTARY_BY_ID,
  OBLIGATORY_META,
  PROHIBITED_INFO,
  DISLIKED_INFO,
  FASTING_SUNNAH,
  DayCaution,
  FastingRef,
} from '../utils/fastingRules.js';
import { calcPrayerTimes, formatTime } from '../utils/prayerTimes.js';
import { isPostMaghrib, getHijriToday } from '../utils/islamicCalendar.js';
import { formatLocaleDate, formatLocaleNumber } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';

// ─── date helpers ─────────────────────────────────────────────────────────────

function offsetDate(base: string, delta: number): string {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function friendlyDate(
  dateStr: string,
  translate?: (key: string, fallback: string) => string
): string {
  const tr = translate ?? ((_k: string, fb: string) => fb);
  const today = localTodayStr();
  if (dateStr === today) return tr('common.today', 'Today');
  if (dateStr === offsetDate(today, -1)) return tr('common.yesterday', 'Yesterday');
  if (dateStr === offsetDate(today, 1)) return tr('common.tomorrow', 'Tomorrow');
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ─── tiny pieces ──────────────────────────────────────────────────────────────

function RefLink({ r }: { r: FastingRef }) {
  const { i18n } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {r.grade && (
        <span className="text-brand-emerald/60 text-[10px] font-semibold bg-brand-emerald/10 px-1.5 py-0.5 rounded-full">
          {translateReference(r.grade, i18n.language)}
        </span>
      )}
      <a
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-gold/60 text-[10px] underline hover:text-brand-gold/90 transition-colors"
      >
        {translateReference(r.source, i18n.language)} ↗
      </a>
    </span>
  );
}

/** Progress bar + countdown + finish estimate for the Manage sheet */
function ManageProgress({
  done,
  target,
  color,
  doneLabel,
  extra,
}: {
  done: number;
  target: number;
  color: string;
  doneLabel: string;
  extra?: string;
}) {
  const { t } = useTranslation();
  const pct = Math.min(100, Math.round((done / Math.max(1, target)) * 100));
  const remaining = Math.max(0, target - done);
  const finish = new Date();
  finish.setDate(finish.getDate() + remaining);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline text-[11px]">
        <span className="font-bold tabular-nums" style={{ color }}>
          {done}/{target} <span className="text-white/40 font-semibold">({pct}%)</span>
        </span>
        <span className={remaining === 0 ? 'text-brand-emerald font-bold' : 'text-white/50'}>
          {doneLabel}
        </span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}70` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-white/25">
        <span>{extra ?? ''}</span>
        {remaining > 0 && (
          <span>
            {t('fasting.estimateFinish', "1 fast/day → done {{date}}, in sha' Allah", {
              date: formatLocaleDate(finish, { month: 'short', day: 'numeric' }),
            })}
          </span>
        )}
      </div>
    </div>
  );
}

const STATUS_META: Record<FastingStatus, { label: string; emoji: string; color: string }> = {
  intended: { label: 'Intending to fast', emoji: '🌅', color: '#5a9e8e' },
  completed: { label: 'Fasted', emoji: '✨', color: '#7a9e6e' },
  broken: { label: 'Fast broken', emoji: '💔', color: '#f87171' },
};

const CATEGORY_LABEL: Record<FastingCategory, { label: string; emoji: string }> = {
  voluntary: { label: 'Voluntary', emoji: '💚' },
  qada: { label: 'Qaḍā', emoji: '🔄' },
  kaffarah: { label: 'Kaffārah', emoji: '⚖️' },
  nadhr: { label: 'Vow', emoji: '🤝' },
  ramadan: { label: 'Ramadan', emoji: '🌙' },
};

// Celebration sparkles around the hero emoji after logging a completed fast
const SPARKLES = [
  { x: -46, y: -30, d: 0.0 },
  { x: 42, y: -38, d: 0.08 },
  { x: -30, y: 26, d: 0.16 },
  { x: 52, y: 18, d: 0.24 },
  { x: 0, y: -52, d: 0.12 },
  { x: -56, y: -4, d: 0.2 },
];

// ─── component ────────────────────────────────────────────────────────────────

export default function FastingTracker() {
  const { t, i18n } = useTranslation();
  const cycleActive = useCycleActive();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const today = localTodayStr();
  const tomorrow = offsetDate(today, 1);
  // The viewed day stays on the civil "today" regardless of Maghrib — only
  // the Hijri label/ruling banner are Maghrib-aware (see getHijriToday()
  // below). Auto-jumping the whole page to tomorrow the moment Maghrib
  // passed made today's already-completed fast disappear from view; the
  // "I intend to fast tomorrow" action still lets a user opt into tomorrow
  // manually.
  const [selectedDate, setSelectedDate] = useState(today);
  const isFuture = selectedDate > today;

  const dateObj = useMemo(() => new Date(selectedDate + 'T12:00:00'), [selectedDate]);
  const isToday = selectedDate === today;
  const ruling = useMemo(
    () => getDayRuling(dateObj, isToday ? getHijriToday() : undefined),
    [dateObj, isToday]
  );

  const { data: log } = useFastingLog(selectedDate);
  const { data: summary } = useFastingSummary();
  const upsert = useUpsertFastingLog();
  const clearLog = useClearFastingLog();
  const updateProfile = useUpdateFastingProfile();
  const addVow = useAddVow();
  const deleteVow = useDeleteVow();
  const [confirmVowDelete, setConfirmVowDelete] = useState<{ id: string; title: string } | null>(
    null
  );

  // "Fasting as" — smart default: the day's best sunnah kind, or general nafl
  const defaultKind: VoluntaryKind = ruling.recommended[0]?.id ?? 'general';
  const [category, setCategory] = useState<FastingCategory>('voluntary');
  const [kind, setKind] = useState<VoluntaryKind | null>(null);
  const [vowId, setVowId] = useState('');
  const effectiveKind = kind ?? defaultKind;

  // Dialogs / sheets
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [warnState, setWarnState] = useState<{
    cautions: DayCaution[];
    vars: UpsertFastingVars;
  } | null>(null);
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);

  // Month calendar picker (full control over which day to mark)
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => today.substring(0, 7)); // YYYY-MM
  const { data: historyLogs } = useFastingHistory(365, calendarOpen);

  // Manage-sheet editors
  const [qadaInput, setQadaInput] = useState('');
  const [vowTitle, setVowTitle] = useState('');
  const [vowDays, setVowDays] = useState('');

  const vows = useMemo(() => summary?.profile.vows ?? [], [summary]);
  const kaffarahActive = summary?.profile.kaffarah.active ?? false;
  const qadaOwed = summary?.profile.qadaOwed ?? 0;
  const qadaDone = summary?.qadaCompleted ?? 0;
  const qadaRemaining = Math.max(0, qadaOwed - qadaDone);

  // Advance warning: surface the qada debt BEFORE Ramadan starts, not only
  // when the tracker happens to be opened during it — a proactive nudge, not
  // just passive data sitting in the qada card.
  const ramadanWindow = getRamadanWindow();
  const showRamadanQadaWarning =
    !ramadanWindow.active &&
    ramadanWindow.daysUntil > 0 &&
    ramadanWindow.daysUntil <= 30 &&
    qadaRemaining > 0;

  // Suhoor / iftar for the selected date (location optional)
  const dayTimes = useMemo(() => {
    try {
      const stored = localStorage.getItem('bustandeen_location');
      if (!stored) return null;
      const loc = JSON.parse(stored) as { latitude: number; longitude: number };
      const times = calcPrayerTimes(loc.latitude, loc.longitude, dateObj);
      return { fajr: times.fajr, maghrib: times.maghrib };
    } catch {
      return null;
    }
  }, [dateObj]);

  const logsByDate = useMemo(() => {
    const map: Record<string, { status: string; category: string }> = {};
    for (const l of summary?.recentLogs ?? [])
      map[l.date] = { status: l.status, category: l.category };
    for (const l of historyLogs ?? []) map[l.date] = { status: l.status, category: l.category };
    return map;
  }, [summary?.recentLogs, historyLogs]);

  // ── Auto-complete today's intention once iftar (maghrib) has passed ────────
  // Past days are converted server-side when the summary loads; today's needs
  // the local maghrib time, which only the client knows.
  const autoCompletedRef = useRef(false);
  useEffect(() => {
    if (autoCompletedRef.current) return;
    if (!log || log.status !== 'intended' || log.date !== today) return;
    if (!dayTimes || selectedDate !== today) return;
    if (new Date() <= dayTimes.maghrib) return;
    autoCompletedRef.current = true;
    upsert.mutate({
      date: log.date,
      category: log.category as FastingCategory,
      voluntaryKind: log.voluntaryKind,
      vowId: log.vowId,
      status: 'completed',
      hijri: log.hijri,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [log, dayTimes, selectedDate, today]);

  // ── Active obligation countdowns (hero capsules) ───────────────────────────
  const debtCapsules = useMemo(() => {
    const caps: Array<{
      id: string;
      label: string;
      emoji: string;
      color: string;
      done: number;
      target: number;
    }> = [];
    if (qadaOwed > 0) {
      caps.push({
        id: 'qada',
        label: t('fasting.qada', 'Qaḍā'),
        emoji: '🔄',
        color: '#c9a96e',
        done: qadaDone,
        target: qadaOwed,
      });
    }
    if (kaffarahActive) {
      caps.push({
        id: 'kaffarah',
        label: t('fasting.kaffarah', 'Kaffārah'),
        emoji: '⚖️',
        color: '#c4825a',
        done: summary?.kaffarah.currentRun ?? 0,
        target: summary?.profile.kaffarah.targetDays ?? 60,
      });
    }
    for (const v of vows) {
      if (v.completed < v.targetDays) {
        caps.push({
          id: `vow-${v.id}`,
          label: v.title,
          emoji: '🤝',
          color: '#5a9e8e',
          done: v.completed,
          target: v.targetDays,
        });
      }
    }
    return caps;
  }, [qadaOwed, qadaDone, kaffarahActive, summary, vows, t]);

  // Week strip: last 6 days + today + tomorrow
  const weekDays = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= -1; i--) days.push(offsetDate(today, -i));
    return days;
  }, [today]);

  // ── logging flow ────────────────────────────────────────────────────────────
  const submitLog = (vars: UpsertFastingVars) => {
    upsert.mutate(vars, {
      onSuccess: () => {
        if (vars.status === 'completed') {
          setCelebrate(true);
          celebrateFast();
          setTimeout(() => setCelebrate(false), 1600);
        }
      },
    });
    setWarnState(null);
  };

  const requestLog = (status: FastingStatus) => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    if (ruling.level !== 'normal') return;

    const vars: UpsertFastingVars = {
      date: selectedDate,
      category,
      status,
      hijri: ruling.hijriLabel ?? undefined,
      ...(category === 'voluntary' ? { voluntaryKind: effectiveKind } : {}),
      ...(category === 'nadhr' ? { vowId } : {}),
    };

    // Amber warnings only apply to voluntary fasts — obligatory fasts are
    // exempt ("except what is obligatory upon you" — Tirmidhī 744).
    if (category === 'voluntary' && ruling.cautions.length > 0) {
      const isSpecificVirtueDay = ruling.recommended.some((r) =>
        ['arafah', 'ashura', 'ayyam_bid'].includes(r.id)
      );
      const adjacentBefore = logsByDate[offsetDate(selectedDate, -1)];
      const adjacentAfter = logsByDate[offsetDate(selectedDate, 1)];
      const hasAdjacentFast =
        ['completed', 'intended'].includes(adjacentBefore?.status ?? '') ||
        ['completed', 'intended'].includes(adjacentAfter?.status ?? '');

      const applicable = ruling.cautions.filter((c) => {
        if (c.id === 'day_of_doubt') return true;
        return !isSpecificVirtueDay && !hasAdjacentFast;
      });

      if (applicable.length > 0) {
        setWarnState({ cautions: applicable, vars });
        return;
      }
    }

    submitLog(vars);
  };

  const handleClear = () => {
    if (!user) {
      setShowGuestDialog(true);
      return;
    }
    clearLog.mutate(selectedDate);
  };

  const saveQadaOwed = () => {
    const n = parseInt(qadaInput, 10);
    if (!Number.isFinite(n) || n < 0) return;
    updateProfile.mutate({ qadaOwed: n });
  };

  const submitVow = () => {
    const days = parseInt(vowDays, 10);
    if (!vowTitle.trim() || !Number.isFinite(days) || days < 1) return;
    addVow.mutate(
      { title: vowTitle.trim(), targetDays: days },
      {
        onSuccess: () => {
          setVowTitle('');
          setVowDays('');
        },
      }
    );
  };

  // Hero gradient by state
  const heroGradient =
    ruling.level === 'haram'
      ? 'from-red-500/25 via-red-900/20 to-brand-deep'
      : log?.status === 'completed'
        ? 'from-brand-emerald/30 via-brand-info/15 to-brand-deep'
        : log?.status === 'intended'
          ? 'from-brand-info/25 via-brand-info-dim/15 to-brand-deep'
          : log?.status === 'broken'
            ? 'from-red-400/15 via-brand-deep to-brand-deep'
            : ruling.level === 'ramadan'
              ? 'from-brand-gold/25 via-brand-gold-dim/15 to-brand-deep'
              : 'from-brand-info/20 via-brand-deep to-brand-deep';

  const currentTypeChip =
    category === 'voluntary'
      ? `${VOLUNTARY_BY_ID[effectiveKind]?.emoji ?? '💚'} ${VOLUNTARY_BY_ID[effectiveKind] ? t(`fastingRules.voluntary.${effectiveKind}`, VOLUNTARY_BY_ID[effectiveKind]!.label) : t('fasting.voluntary', 'Voluntary')}`
      : category === 'nadhr'
        ? `🤝 ${vows.find((v) => v.id === vowId)?.title ?? t('fasting.nadhr', 'Vow')}`
        : `${CATEGORY_LABEL[category].emoji} ${t(`fasting.${category}`, CATEGORY_LABEL[category].label)}`;

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('fasting.seoTitle', 'Fasting Tracker — Ramadan, Qada & Voluntary Sawm')}
        description={t(
          'fasting.seoDescription',
          'Log obligatory, qada (makeup) and voluntary fasts with a fiqh-aware calendar, streaks and progress stats. Track your Ramadan and Sunnah fasting in one place.'
        )}
        path="/fasting"
      />
      <h1 className="sr-only">{t('fasting.title', 'Fasting Tracker')}</h1>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-xl mx-auto space-y-4">
          {/* ── Tabs + calendar toggle ── */}
          <div className="flex items-center justify-between gap-2">
            <TabNav
              items={[
                { label: `🌙 ${t('fasting.tracker', 'Tracker')}`, to: '/fasting', active: true },
                { label: `📊 ${t('fasting.analytics', 'Analytics')}`, to: '/fasting/analytics' },
              ]}
            />
            <button
              onClick={() => setCalendarOpen((o) => !o)}
              aria-label={t('fasting.openCalendarAriaLabel', 'Open month calendar')}
              aria-expanded={calendarOpen}
              title={t('fasting.pickDay', 'Pick any day from the calendar')}
              className={`p-2 rounded-xl border transition-all ${
                calendarOpen
                  ? 'bg-brand-emerald/20 border-brand-emerald/50 text-brand-emerald'
                  : 'bg-white/[0.04] border-brand-emerald/10 text-white/40 hover:text-white'
              }`}
            >
              <CalendarDaysIcon className="w-4 h-4" />
            </button>
          </div>

          {/* ── Ramadan qada advance warning — surfaced proactively before the
               month starts, not only once it has ── */}
          {showRamadanQadaWarning && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-brand-gold/25 bg-brand-gold/[0.06] p-3.5 flex items-center gap-3"
            >
              <span className="text-2xl shrink-0">🌙</span>
              <p className="text-white/70 text-xs leading-relaxed">
                <Trans
                  i18nKey="fasting.ramadanQadaWarning"
                  values={{
                    days: ramadanWindow.daysUntil,
                    count: qadaRemaining,
                    fastsWord:
                      qadaRemaining === 1
                        ? t('fasting.qadaFastSingular', 'fast')
                        : t('fasting.qadaFastPlural', 'fasts'),
                  }}
                  defaults="Ramadan starts in <b>{{days}} days</b> — you still have <b>{{count}} qada {{fastsWord}}</b> to make up."
                  components={{ b: <span className="text-brand-gold font-bold" /> }}
                />
              </p>
            </motion.div>
          )}

          {/* ── Month calendar (full control over any past day) ── */}
          <AnimatePresence>
            {calendarOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => {
                        const [y, m] = calMonth.split('-').map(Number);
                        const d = new Date(y!, m! - 2, 1);
                        setCalMonth(
                          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                        );
                      }}
                      aria-label={t('fasting.previousMonth', 'Previous month')}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <p className="text-white font-bold text-sm">
                      {formatLocaleDate(new Date(calMonth + '-15T12:00:00'), {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <button
                      onClick={() => {
                        const [y, m] = calMonth.split('-').map(Number);
                        const d = new Date(y!, m!, 1);
                        setCalMonth(
                          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                        );
                      }}
                      disabled={calMonth >= today.substring(0, 7)}
                      aria-label={t('fasting.nextMonth', 'Next month')}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {t('fasting.weekdayInitials', 'SMTWTFS')
                      .split('')
                      .map((d, i) => (
                        <span key={i} className="text-white/25 text-[9px] font-bold uppercase">
                          {d}
                        </span>
                      ))}
                    {(() => {
                      const [y, m] = calMonth.split('-').map(Number);
                      const first = new Date(y!, m! - 1, 1);
                      const daysInMonth = new Date(y!, m!, 0).getDate();
                      const blanks = first.getDay();
                      const cells = [];
                      for (let i = 0; i < blanks; i++) cells.push(<span key={`b${i}`} />);
                      for (let d = 1; d <= daysInMonth; d++) {
                        const dateStr = `${calMonth}-${String(d).padStart(2, '0')}`;
                        const dayLog = logsByDate[dateStr];
                        const disabled = dateStr > tomorrow;
                        const isSel = dateStr === selectedDate;
                        const isTod = dateStr === today;
                        const dot =
                          dayLog?.status === 'completed'
                            ? '#7a9e6e'
                            : dayLog?.status === 'intended'
                              ? '#5a9e8e'
                              : dayLog?.status === 'broken'
                                ? '#f87171'
                                : 'transparent';
                        cells.push(
                          <button
                            key={dateStr}
                            disabled={disabled}
                            onClick={() => {
                              setSelectedDate(dateStr);
                              setCalendarOpen(false);
                            }}
                            aria-label={t('fasting.selectDate', 'Select {{date}}', {
                              date: dateStr,
                            })}
                            className={`relative h-8 rounded-lg text-xs font-semibold transition-all ${
                              isSel
                                ? 'bg-brand-emerald/25 text-brand-emerald border border-brand-emerald/50'
                                : isTod
                                  ? 'bg-white/10 text-white border border-brand-emerald/20'
                                  : disabled
                                    ? 'text-white/15 cursor-not-allowed'
                                    : 'text-white/60 hover:bg-white/10'
                            }`}
                          >
                            {d}
                            <span
                              className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                              style={{ background: dot }}
                            />
                          </button>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                  <p className="text-white/25 text-[10px] mt-2">
                    {t(
                      'fasting.calendarLegend',
                      'Tap any past day to view or log it — 🟢 fasted · 🔵 intended · 🔴 broken'
                    )}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Week strip (min-w-0 so 8 days never push the page wider than the phone) ── */}
          <div className="flex justify-between gap-1 [&>*]:min-w-0">
            {weekDays.map((d) => {
              const dayLog = logsByDate[d];
              const isSel = d === selectedDate;
              const isTod = d === today;
              const dot =
                dayLog?.status === 'completed'
                  ? '#7a9e6e'
                  : dayLog?.status === 'intended'
                    ? '#5a9e8e'
                    : dayLog?.status === 'broken'
                      ? '#f87171'
                      : 'rgba(255,255,255,0.12)';
              return (
                <motion.button
                  key={d}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedDate(d)}
                  aria-label={t('fasting.selectDay', 'Select {{day}}', { day: friendlyDate(d, t) })}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${
                    isSel
                      ? 'bg-white/10 border-brand-emerald/30'
                      : 'bg-white/[0.03] border-brand-emerald/5 hover:border-brand-emerald/20'
                  }`}
                >
                  <span
                    className={`text-[9px] uppercase font-bold ${isTod ? 'text-brand-emerald' : 'text-white/30'}`}
                  >
                    {d === tomorrow
                      ? '+1'
                      : formatLocaleDate(new Date(d + 'T12:00:00'), { weekday: 'narrow' })}
                  </span>
                  <span className={`text-xs font-bold ${isSel ? 'text-white' : 'text-white/50'}`}>
                    {parseInt(d.slice(8), 10)}
                  </span>
                  <motion.span
                    layout
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: dot, boxShadow: dayLog ? `0 0 6px ${dot}` : 'none' }}
                  />
                </motion.button>
              );
            })}
          </div>

          {/* Rayhanah days — fasting excused now, made up later */}
          {cycleActive && selectedDate >= cycleActive.startDate ? (
            <ExcusedCard feature="fasting" />
          ) : (
            <>
              {/* ── HERO card ── */}
              <motion.div
                layout
                className={`relative rounded-3xl border border-brand-emerald/15 bg-gradient-to-br ${heroGradient} overflow-hidden shadow-2xl`}
              >
                {/* soft animated orb */}
                <motion.div
                  className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
                  }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                />

                <div className="relative p-5 sm:p-6 text-center space-y-3">
                  {/* Date */}
                  <div>
                    <p className="text-white font-black text-xl leading-tight">
                      {friendlyDate(selectedDate, t)}
                    </p>
                    <p className="text-white/30 text-xs">
                      {formatLocaleDate(dateObj, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {ruling.hijriLabel && (
                        <span className="text-brand-gold/50"> · {ruling.hijriLabel}</span>
                      )}
                    </p>
                  </div>

                  {/* Active obligation countdowns — one capsule per activated type.
                  Tap to log the day against that obligation. */}
                  {debtCapsules.length > 0 && (
                    <div className="flex justify-center gap-1.5 flex-wrap">
                      {debtCapsules.map((c) => {
                        const remaining = Math.max(0, c.target - c.done);
                        return (
                          <motion.button
                            key={c.id}
                            whileTap={{ scale: 0.93 }}
                            onClick={() => {
                              if (!user) {
                                setShowGuestDialog(true);
                                return;
                              }
                              if (log) {
                                toast(
                                  t(
                                    'fasting.alreadyLogged',
                                    'This day is already logged — remove it (🗑) to change its type.'
                                  ),
                                  { id: 'fasting-capsule', icon: 'ℹ️' }
                                );
                                return;
                              }
                              if (c.id === 'qada') setCategory('qada');
                              else if (c.id === 'kaffarah') setCategory('kaffarah');
                              else {
                                setCategory('nadhr');
                                setVowId(c.id.replace('vow-', ''));
                              }
                              toast.success(
                                t(
                                  'fasting.typeSet',
                                  'Fast type set to {{label}} — now tap "I fasted"',
                                  { label: c.label }
                                ),
                                { id: 'fasting-capsule', duration: 2500 }
                              );
                            }}
                            title={`${c.label}: ${c.done}/${c.target} done — tap to log this day as ${c.label}`}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all ${
                              (c.id === 'qada' && category === 'qada') ||
                              (c.id === 'kaffarah' && category === 'kaffarah') ||
                              (c.id.startsWith('vow-') &&
                                category === 'nadhr' &&
                                vowId === c.id.replace('vow-', ''))
                                ? 'ring-1 ring-white/50'
                                : ''
                            }`}
                            style={{
                              background: `${c.color}1c`,
                              borderColor: `${c.color}55`,
                              color: c.color,
                            }}
                          >
                            <span aria-hidden>{c.emoji}</span>
                            <span className="max-w-[90px] truncate">{c.label}</span>
                            <span className="tabular-nums text-white/80">
                              {c.done}/{c.target}
                            </span>
                            <span className="text-white/40 font-semibold">
                              · {t('fasting.nLeft', '{{count}} left', { count: remaining })}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  {/* State display */}
                  {ruling.level === 'haram' && ruling.haram ? (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="space-y-2 py-2"
                    >
                      <motion.div
                        animate={{ rotate: [0, -6, 6, 0] }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-6xl"
                      >
                        🚫
                      </motion.div>
                      <p className="text-red-300 font-black text-lg leading-tight">
                        {ruling.haram.title}
                      </p>
                      <p className="text-red-200/60 text-xs leading-relaxed max-w-sm mx-auto">
                        {t(`fastingRules.prohibitedDetail.${ruling.haram.id}`, ruling.haram.detail)}
                      </p>
                      <div className="flex justify-center gap-2 flex-wrap">
                        {ruling.haram.refs.map((r) => (
                          <RefLink key={r.url} r={r} />
                        ))}
                      </div>
                      <p className="text-white/40 text-xs pt-1">
                        {t(
                          'fasting.enjoyBlessing',
                          'Enjoy the blessing — today is for eating and celebrating!'
                        )}{' '}
                        🎉
                      </p>
                    </motion.div>
                  ) : ruling.level === 'ramadan' ? (
                    <div className="space-y-3 py-2">
                      <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="text-6xl"
                      >
                        🌙
                      </motion.div>
                      <p className="text-brand-gold font-black text-lg">
                        {t('fasting.ramadanMubarak', 'Ramaḍān Mubārak!')}
                      </p>
                      <p className="text-white/50 text-xs leading-relaxed max-w-sm mx-auto">
                        {t(
                          'fasting.ramadanHomeDesc',
                          'This blessed month has its own home — the 30-day tracker with suhoor & iftar times, tarawih nights and Laylat al-Qadr.'
                        )}
                      </p>
                      <button
                        className="btn btn-sm rounded-xl border-0 text-white font-bold bg-gradient-to-r from-brand-gold to-brand-gold"
                        onClick={() => navigate('/ramadan')}
                      >
                        🌙 {t('fasting.openRamadanTracker', 'Open the Ramadan tracker')} →
                      </button>
                      <a
                        href="https://quran.com/2/185"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-brand-gold/60 text-[10px] underline"
                      >
                        {translateReference('Quran 2:185', i18n.language)} ↗
                      </a>
                    </div>
                  ) : log ? (
                    /* ── Logged state ── */
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={log.status}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.1, opacity: 0 }}
                        transition={{ type: 'spring', damping: 18 }}
                        className="space-y-3 py-1"
                      >
                        <div className="relative inline-block">
                          <motion.div
                            animate={log.status === 'completed' ? { scale: [1, 1.15, 1] } : {}}
                            transition={{ duration: 0.6 }}
                            className="text-6xl"
                          >
                            {STATUS_META[log.status].emoji}
                          </motion.div>
                          {/* celebration sparkles */}
                          <AnimatePresence>
                            {celebrate &&
                              SPARKLES.map((s, i) => (
                                <motion.span
                                  key={i}
                                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                                  animate={{ x: s.x, y: s.y, scale: 1.2, opacity: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 1.1, delay: s.d, ease: 'easeOut' }}
                                  className="absolute top-1/2 left-1/2 text-lg pointer-events-none"
                                >
                                  ✨
                                </motion.span>
                              ))}
                          </AnimatePresence>
                        </div>
                        <p
                          className="font-black text-lg"
                          style={{ color: STATUS_META[log.status].color }}
                        >
                          {t(`fasting.${log.status}`, STATUS_META[log.status].label)}
                          {log.status === 'completed' && (
                            <span className="text-white/50 font-semibold text-sm">
                              {' '}
                              — {t('fasting.mayAllahAccept', 'may Allah accept it!')} 🤲
                            </span>
                          )}
                        </p>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-brand-emerald/15 text-white/60 text-xs font-semibold">
                          {CATEGORY_LABEL[log.category as FastingCategory]?.emoji}{' '}
                          {log.category === 'voluntary' && log.voluntaryKind
                            ? VOLUNTARY_BY_ID[log.voluntaryKind]
                              ? t(
                                  `fastingRules.voluntary.${log.voluntaryKind}`,
                                  VOLUNTARY_BY_ID[log.voluntaryKind]!.label
                                )
                              : t('fasting.voluntary', 'Voluntary')
                            : log.category === 'nadhr'
                              ? (vows.find((v) => v.id === log.vowId)?.title ??
                                t('fasting.nadhr', 'Vow'))
                              : t(
                                  `fasting.${log.category}`,
                                  CATEGORY_LABEL[log.category as FastingCategory]?.label ?? ''
                                )}
                        </div>

                        <div className="flex justify-center gap-2 pt-1">
                          {!isFuture &&
                            log.status === 'intended' &&
                            (selectedDate !== today ||
                              !dayTimes ||
                              new Date() >= dayTimes.maghrib) && (
                              <motion.button
                                whileTap={{ scale: 0.94 }}
                                onClick={() =>
                                  submitLog({
                                    date: selectedDate,
                                    category: log.category as FastingCategory,
                                    voluntaryKind: log.voluntaryKind,
                                    vowId: log.vowId,
                                    status: 'completed',
                                    hijri: log.hijri,
                                  })
                                }
                                className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim text-white border-0 font-bold px-6"
                              >
                                ✅ {t('fasting.completedIt', 'I completed it!')}
                              </motion.button>
                            )}
                          {!isFuture && log.status !== 'broken' && (
                            <button
                              onClick={() =>
                                submitLog({
                                  date: selectedDate,
                                  category: log.category as FastingCategory,
                                  voluntaryKind: log.voluntaryKind,
                                  vowId: log.vowId,
                                  status: 'broken',
                                  hijri: log.hijri,
                                })
                              }
                              className="btn btn-sm btn-ghost text-white/40 hover:text-red-300 text-xs"
                            >
                              {t('fasting.brokeFast', 'I broke the fast')}
                            </button>
                          )}
                          <button
                            onClick={handleClear}
                            aria-label={t('fasting.removeLogAriaLabel', 'Remove this fast log')}
                            className="btn btn-sm btn-ghost text-white/30 hover:text-red-400 px-2"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    /* ── Not logged yet ── */
                    <div className="space-y-3 py-1">
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-6xl"
                      >
                        🌙
                      </motion.div>

                      {/* Fasting-as chip → opens type sheet */}
                      <button
                        onClick={() => setShowTypeSheet(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-brand-emerald/20 text-white/70 text-xs font-semibold transition-all"
                      >
                        {currentTypeChip}
                        <ChevronDownIcon className="w-3 h-3 text-white/40" />
                      </button>

                      <div className="flex flex-col items-center gap-2">
                        {!isFuture && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => requestLog('completed')}
                            disabled={upsert.isPending || (category === 'nadhr' && !vowId)}
                            className="w-full max-w-xs h-14 rounded-2xl bg-brand-emerald hover:bg-brand-emerald-dim text-white font-black text-lg border-0 shadow-[0_8px_30px_rgba(16,185,129,0.35)] transition-colors"
                          >
                            ✅{' '}
                            {t('fasting.iFasted', 'I fasted {{day}}', {
                              day: friendlyDate(selectedDate, t).toLowerCase(),
                            })}
                          </motion.button>
                        )}
                        {(selectedDate === today || isFuture) && (
                          <button
                            onClick={() => requestLog('intended')}
                            disabled={upsert.isPending || (category === 'nadhr' && !vowId)}
                            className="text-brand-info/80 hover:text-brand-info text-xs font-semibold underline underline-offset-4"
                          >
                            🌅{' '}
                            {isFuture
                              ? t('fasting.intendTomorrow', 'I intend to fast tomorrow')
                              : t('fasting.fastingToday', "I'm fasting today (mark intention)")}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Suhoor / iftar strip */}
                  {dayTimes && ruling.level !== 'haram' && (
                    <div className="flex items-center justify-center gap-4 pt-2 border-t border-brand-emerald/10 text-xs">
                      <span className="text-white/40">
                        🌌 {t('fasting.suhoorEnds', 'Suhur ends')}{' '}
                        <span className="text-white/80 font-bold tabular-nums">
                          {formatTime(dayTimes.fajr)}
                        </span>
                      </span>
                      <span className="text-white/40">
                        🌇 {t('fasting.iftar', 'Iftar')}{' '}
                        <span className="text-brand-gold font-bold tabular-nums">
                          {formatTime(dayTimes.maghrib)}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* ── AI fasting companion ── */}
              {log?.status === 'completed' && selectedDate === today && (
                <FastingCompanion
                  fastType={
                    log.category === 'voluntary'
                      ? (log.voluntaryKind ?? 'voluntary')
                      : (log.category ?? 'obligatory')
                  }
                  dayNumber={
                    log.category === 'ramadan' ? (summary?.stats?.thisMonth ?? 1) : undefined
                  }
                  isPostMaghrib={isPostMaghrib()}
                />
              )}

              {/* ── Recommended today chips ── */}
              {ruling.level === 'normal' && ruling.recommended.length > 0 && (
                <div className="space-y-1.5">
                  {ruling.recommended.map((r, i) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + i * 0.06 }}
                      className="rounded-2xl border px-4 py-2.5 flex items-center gap-3"
                      style={{ background: `${r.color}14`, borderColor: `${r.color}45` }}
                    >
                      <motion.span
                        className="text-2xl shrink-0"
                        animate={{ scale: [1, 1.04, 1] }}
                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                      >
                        {r.emoji}
                      </motion.span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm leading-tight" style={{ color: r.color }}>
                          {t(`fastingRules.voluntary.${r.id}`, r.label)}{' '}
                          <span className="text-white/40 font-normal text-[11px]">
                            — {t('fasting.sunnahFast', 'sunnah fast!')}
                          </span>
                        </p>
                        <p className="text-white/40 text-[11px] leading-snug">
                          {t(`fastingRules.voluntaryVirtue.${r.id}`, r.virtue)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <RefLink r={r.ref} />
                          {r.specialDayId && (
                            <Link
                              to={`/special-day/${r.specialDayId}`}
                              className="text-[10px] font-bold underline underline-offset-2 hover:opacity-80"
                              style={{ color: r.color }}
                            >
                              {t('fasting.learnMore', 'Learn more')} →
                            </Link>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Caution note (full warning shows at log time) */}
              {ruling.level === 'normal' && ruling.cautions.length > 0 && !log && (
                <p className="text-brand-gold/60 text-[11px] px-2 leading-relaxed">
                  ⚠️{' '}
                  {ruling.cautions
                    .map((c) => t(`fastingRules.disliked.${c.info.id}`, c.info.label))
                    .join(' · ')}{' '}
                  — {t('fasting.remindBeforeLogging', "we'll remind you before logging.")}
                </p>
              )}
            </>
          )}

          {/* ── Progress chips + manage ── */}
          <div className="flex items-stretch gap-2">
            <div className="flex-1 grid grid-cols-3 gap-2">
              {[
                {
                  label: t('fasting.thisMonth', 'This month'),
                  value: summary?.stats.thisMonth ?? 0,
                  color: '#7a9e6e',
                },
                ...(qadaOwed > 0
                  ? [
                      {
                        label: t('fasting.qadaLeft', 'Qada left'),
                        value: qadaRemaining,
                        color: '#c9a96e',
                      },
                    ]
                  : [
                      {
                        label: t('fasting.last30d', 'Last 30d'),
                        value: summary?.stats.last30 ?? 0,
                        color: '#5a9e8e',
                      },
                    ]),
                ...(kaffarahActive
                  ? [
                      {
                        label: t('fasting.kaffarahRun', 'Kaffarah run'),
                        value: summary?.kaffarah.currentRun ?? 0,
                        color: '#c4825a',
                      },
                    ]
                  : [
                      {
                        label: t('fasting.allTime', 'All time'),
                        value: summary?.stats.total ?? 0,
                        color: '#5a9e8e',
                      },
                    ]),
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-brand-emerald/10 bg-white/[0.04] px-2 py-2 text-center"
                >
                  <p
                    className="font-black text-lg tabular-nums leading-none"
                    style={{ color: s.color }}
                  >
                    {formatLocaleNumber(s.value)}
                  </p>
                  <p className="text-white/30 text-[9px] uppercase tracking-wide mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                if (!user) {
                  setShowGuestDialog(true);
                  return;
                }
                // Seed the editor once on open — not on every refetch, which
                // would wipe the input while the user is typing
                setQadaInput(String(qadaOwed));
                setShowManage(true);
              }}
              aria-label={t('fasting.manageAriaLabel', 'Manage make-up fasts and vows')}
              title={t('fasting.manageTitle', 'Make-up fasts, kaffarah & vows')}
              className="rounded-xl border border-brand-emerald/10 bg-white/[0.04] hover:bg-white/10 px-3 flex flex-col items-center justify-center gap-1 text-white/40 hover:text-white transition-all"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              <span className="text-[9px] font-bold uppercase">
                {t('fasting.manage', 'Manage')}
              </span>
            </button>
          </div>

          {/* Vow progress bars (only when vows exist) */}
          {vows.length > 0 && (
            <div className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] p-3 space-y-2">
              {vows.map((v) => (
                <div key={v.id}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-white/60 font-semibold truncate">🤝 {v.title}</span>
                    <span
                      className={
                        v.completed >= v.targetDays
                          ? 'text-brand-emerald font-bold'
                          : 'text-white/40'
                      }
                    >
                      {v.completed}/{v.targetDays}
                      {v.completed >= v.targetDays ? ' ✓' : ''}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      animate={{ width: `${Math.min(100, (v.completed / v.targetDays) * 100)}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full bg-brand-gold rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Kaffarah broken-chain warning */}
          {kaffarahActive &&
            summary?.kaffarah.runStale &&
            (summary?.kaffarah.completed ?? 0) > 0 && (
              <p className="text-red-400/80 text-[11px] px-2">
                ⚠️{' '}
                {t(
                  'fasting.kaffarahChainBroken',
                  'Kaffarah chain broken — the {{days}} days must be consecutive. An unexcused gap restarts the count (open Manage for details).',
                  { days: summary?.profile.kaffarah.targetDays ?? 60 }
                )}
              </p>
            )}

          {/* ── Learn (single collapsible) ── */}
          <div className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] overflow-hidden">
            <button
              onClick={() => setLearnOpen(!learnOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
              aria-expanded={learnOpen}
            >
              <p className="text-white/70 font-bold text-sm">
                📚 {t('fasting.newToFasting', 'New to fasting? Start here')}
              </p>
              <motion.span animate={{ rotate: learnOpen ? 180 : 0 }} className="text-white/30">
                <ChevronDownIcon className="w-4 h-4" />
              </motion.span>
            </button>
            <AnimatePresence>
              {learnOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-5 border-t border-brand-emerald/5 pt-4">
                    {/* The basics */}
                    <div className="space-y-1.5">
                      <p className="text-brand-emerald text-[10px] uppercase tracking-widest font-bold">
                        🌱 {t('fasting.theBasics', 'The basics')}
                      </p>
                      <p className="text-white/50 text-xs leading-relaxed">
                        {t(
                          'fasting.basicsDesc',
                          'A fast runs from dawn (Fajr) to sunset (Maghrib): no food, drink, or intimacy. Make the intention in your heart, eat suhur before dawn, and break your fast promptly at sunset — dates and water are the sunnah.'
                        )}
                      </p>
                      {FASTING_SUNNAH.map((r, i) => (
                        <div key={r.url} className="pl-2 border-l-2 border-brand-emerald/30">
                          <p className="text-white/40 text-[11px] italic">
                            {t(`fastingRules.sunnahText.${i}`, r.text)}
                          </p>
                          <RefLink r={r} />
                        </div>
                      ))}
                    </div>

                    {/* Best days */}
                    <div className="space-y-2">
                      <p className="text-brand-gold text-[10px] uppercase tracking-widest font-bold">
                        ⭐ {t('fasting.bestDays', 'The best days to fast')}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {VOLUNTARY_META.filter((m) => m.id !== 'general').map((m) => (
                          <div
                            key={m.id}
                            className="rounded-xl border px-2.5 py-2"
                            style={{ background: `${m.color}10`, borderColor: `${m.color}30` }}
                          >
                            <p
                              className="text-[11px] font-bold leading-tight"
                              style={{ color: m.color }}
                            >
                              {m.emoji} {t(`fastingRules.voluntary.${m.id}`, m.label)}
                            </p>
                            <p className="text-white/30 text-[10px] leading-snug mt-0.5">
                              {t(`fastingRules.voluntaryWhen.${m.id}`, m.when)}
                            </p>
                            <div className="mt-1">
                              <RefLink r={m.ref} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Never fast on */}
                    <div className="space-y-1.5">
                      <p className="text-red-400 text-[10px] uppercase tracking-widest font-bold">
                        🚫 {t('fasting.neverFastOn', 'Never fast on')}
                      </p>
                      {PROHIBITED_INFO.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-xl bg-red-500/10 border border-red-500/25 px-3 py-2"
                        >
                          <p className="text-red-300 text-[11px] font-bold">
                            {p.emoji} {t(`fastingRules.prohibited.${p.id}`, p.label)}
                          </p>
                          <p className="text-white/30 text-[10px] leading-snug">
                            {t(`fastingRules.prohibitedDetail.${p.id}`, p.detail)}
                          </p>
                          <div className="mt-0.5">
                            {p.refs.map((r) => (
                              <RefLink key={r.url} r={r} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Better to avoid */}
                    <div className="space-y-1.5">
                      <p className="text-brand-gold/80 text-[10px] uppercase tracking-widest font-bold">
                        ⚠️ {t('fasting.betterToAvoid', 'Better to avoid')}
                      </p>
                      {DISLIKED_INFO.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-xl bg-brand-gold/10 border border-brand-gold/20 px-3 py-2"
                        >
                          <p className="text-brand-gold/90 text-[11px] font-bold">
                            {p.emoji} {t(`fastingRules.disliked.${p.id}`, p.label)}
                          </p>
                          <p className="text-white/30 text-[10px] leading-snug">
                            {t(`fastingRules.dislikedDetail.${p.id}`, p.detail)}
                          </p>
                          <div className="mt-0.5">
                            {p.refs.map((r) => (
                              <RefLink key={r.url} r={r} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Owe fasts? */}
                    <div className="space-y-1.5">
                      <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold">
                        🔄 {t('fasting.missedRamadan', 'Missed Ramadan days?')}
                      </p>
                      <p className="text-white/40 text-[11px] leading-relaxed">
                        {/* components is an ARRAY prop — react-i18next numbers <0>/<1>/...
                            by that array's own order only, ignoring surrounding text/
                            whitespace nodes. The old children-based numbering (<1>/<3>/<5>/<7>)
                            was thrown off by the {' '} whitespace node splitting the first
                            text run, which shifted every index and rendered a garbled mix
                            of the Bengali translation and the English defaults. */}
                        <Trans
                          i18nKey="fasting.missedRamadanDesc"
                          defaults="Days missed for a valid reason are made up as <0>Qada</0> (Quran 2:184). Broke a fast deliberately? That may need <1>Kaffarah</1>. Made a vow to fast? That's <2>Nadhr</2>. Track all three from the <3>Manage</3> button above."
                          components={[
                            <b key="0" className="text-white/60" />,
                            <b key="1" className="text-white/60" />,
                            <b key="2" className="text-white/60" />,
                            <b key="3" className="text-white/60" />,
                          ]}
                        />
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Type sheet (what am I fasting as) ── */}
      <AnimatePresence>
        {showTypeSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowTypeSheet(false);
            }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 26 }}
              className="bg-brand-surface rounded-3xl p-5 w-full max-w-md shadow-2xl border border-brand-border max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-white">
                  {t('fasting.whatKindOfFast', 'What kind of fast?')}
                </h3>
                <button
                  onClick={() => setShowTypeSheet(false)}
                  aria-label={t('common.close')}
                  className="text-white/30 hover:text-white p-1"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                {/* Voluntary kinds — recommended first */}
                {[
                  ...ruling.recommended,
                  ...VOLUNTARY_META.filter((m) => !ruling.recommended.some((r) => r.id === m.id)),
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setCategory('voluntary');
                      setKind(m.id);
                      setShowTypeSheet(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border text-left transition-all ${
                      category === 'voluntary' && effectiveKind === m.id
                        ? 'border-brand-emerald/40 bg-white/10'
                        : 'border-brand-emerald/10 bg-white/[0.03] hover:bg-white/[0.07]'
                    }`}
                  >
                    <span className="text-xl shrink-0">{m.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold" style={{ color: m.color }}>
                        {t(`fastingRules.voluntary.${m.id}`, m.label)}
                        {ruling.recommended.some((r) => r.id === m.id) && (
                          <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-brand-emerald/20 text-brand-emerald">
                            {t('fasting.todayTag', 'today ✓')}
                          </span>
                        )}
                      </p>
                      <p className="text-white/30 text-[10px] leading-snug">
                        {t(`fastingRules.voluntaryWhen.${m.id}`, m.when)}
                      </p>
                    </div>
                  </button>
                ))}

                {/* Obligatory categories */}
                <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold pt-2">
                  {t('fasting.obligatoryMakeups', 'Obligatory make-ups')}
                </p>
                <button
                  onClick={() => {
                    setCategory('qada');
                    setShowTypeSheet(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border text-left ${category === 'qada' ? 'border-brand-emerald/40 bg-white/10' : 'border-brand-emerald/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}
                >
                  <span className="text-xl">🔄</span>
                  <div>
                    <p className="text-xs font-bold text-brand-gold">
                      {t('fasting.qadaMakeupDay', 'Qaḍā — make-up day')}
                      {qadaRemaining > 0 && (
                        <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-brand-gold/20">
                          {t('fasting.nLeft', '{{count}} left', { count: qadaRemaining })}
                        </span>
                      )}
                    </p>
                    <p className="text-white/30 text-[10px]">
                      {t('fasting.qadaMakeupDesc', 'Making up a missed Ramaḍān day')}
                    </p>
                  </div>
                </button>
                {kaffarahActive && (
                  <button
                    onClick={() => {
                      setCategory('kaffarah');
                      setShowTypeSheet(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border text-left ${category === 'kaffarah' ? 'border-brand-emerald/40 bg-white/10' : 'border-brand-emerald/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}
                  >
                    <span className="text-xl">⚖️</span>
                    <div>
                      <p className="text-xs font-bold text-brand-warm">
                        {t('fasting.kaffarahExpiationDay', 'Kaffārah — expiation day')}
                      </p>
                      <p className="text-white/30 text-[10px]">
                        {t('fasting.consecutiveRun', 'Consecutive run: {{run}}/{{target}}', {
                          run: summary?.kaffarah.currentRun ?? 0,
                          target: summary?.profile.kaffarah.targetDays ?? 60,
                        })}
                      </p>
                    </div>
                  </button>
                )}
                {vows.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setCategory('nadhr');
                      setVowId(v.id);
                      setShowTypeSheet(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border text-left ${category === 'nadhr' && vowId === v.id ? 'border-brand-emerald/40 bg-white/10' : 'border-brand-emerald/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}
                  >
                    <span className="text-xl">🤝</span>
                    <div>
                      <p className="text-xs font-bold text-brand-info">
                        {t('fasting.vowLabel', 'Vow: {{title}}', { title: v.title })}
                      </p>
                      <p className="text-white/30 text-[10px]">
                        {t('fasting.daysDone', '{{completed}}/{{target}} days done', {
                          completed: v.completed,
                          target: v.targetDays,
                        })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fasting settings — portaled to body so it floats above navbar ── */}
      {createPortal(
        <AnimatePresence>
          {showManage && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                onClick={() => setShowManage(false)}
              />
              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="fixed right-0 top-0 bottom-0 z-[65] w-full max-w-sm bg-brand-deep border-l border-brand-border overflow-y-auto"
                role="dialog"
                aria-label={t('fasting.settingsAriaLabel', 'Fasting settings')}
              >
                <div className="sticky top-0 bg-brand-deep/95 backdrop-blur px-5 py-4 flex items-center justify-between border-b border-brand-emerald/5 z-10">
                  <div>
                    <h3 className="text-lg font-black text-white">
                      ⚙️ {t('fasting.settingsTitle', 'Fasting settings')}
                    </h3>
                    <p className="text-white/30 text-[11px]">
                      {t(
                        'fasting.settingsSubtitle',
                        'Obligations & vows — a countdown capsule appears on the main card'
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowManage(false)}
                    aria-label={t('common.close')}
                    className="text-white/30 hover:text-white p-1"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {/* ── Qada ── */}
                  <div className="rounded-2xl border border-brand-gold/25 bg-brand-gold/5 p-4 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-brand-gold/15 grid place-items-center text-lg shrink-0">
                        🔄
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-brand-gold font-bold text-sm leading-tight">
                          {t('fasting.qadaMissedDays', 'Qaḍā — missed Ramaḍān days')}
                        </p>
                        <p className="text-white/30 text-[10px]">
                          {t('fasting.qadaMakeupNote', 'Quran 2:184 — make them up day by day')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 text-xs">{t('fasting.iOwe', 'I owe')}</span>
                      <input
                        type="number"
                        min="0"
                        value={qadaInput}
                        onChange={(e) => setQadaInput(e.target.value)}
                        aria-label={t('fasting.daysOwedAriaLabel', 'Days owed')}
                        className="input input-sm w-20 bg-brand-deep border-brand-border text-white text-center font-bold"
                      />
                      <span className="text-white/40 text-xs">{t('common.days')}</span>
                      <button
                        onClick={saveQadaOwed}
                        className="btn btn-xs bg-brand-emerald text-white border-0 ml-auto"
                      >
                        {t('common.save')}
                      </button>
                    </div>
                    {qadaOwed > 0 && (
                      <ManageProgress
                        done={qadaDone}
                        target={qadaOwed}
                        color="#c9a96e"
                        doneLabel={
                          qadaRemaining === 0
                            ? t('fasting.allMadeUp', "All made up — māshā'Allāh! 🎉")
                            : t('fasting.daysRemaining', '{{count}} days remaining', {
                                count: qadaRemaining,
                              })
                        }
                      />
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {OBLIGATORY_META[0]!.refs.map((r) => (
                        <RefLink key={r.url} r={r} />
                      ))}
                    </div>
                  </div>

                  {/* ── Kaffarah ── */}
                  <div className="rounded-2xl border border-brand-warm/25 bg-brand-warm/5 p-4 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-brand-warm/15 grid place-items-center text-lg shrink-0">
                        ⚖️
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-brand-warm font-bold text-sm leading-tight">
                          {t('fasting.kaffarahExpiation', 'Kaffārah — expiation')}
                        </p>
                        <p className="text-white/30 text-[10px]">
                          {t(
                            'fasting.kaffarahConsecutiveNote',
                            'Consecutive days required (Bukhārī 1936)'
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          updateProfile.mutate({
                            kaffarah: {
                              active: !kaffarahActive,
                              targetDays: summary?.profile.kaffarah.targetDays ?? 60,
                            },
                          })
                        }
                        className={`btn btn-xs border-0 shrink-0 ${kaffarahActive ? 'bg-white/10 text-white/50' : 'bg-brand-warm text-white'}`}
                      >
                        {kaffarahActive ? t('fasting.stop', 'Stop') : t('fasting.start', 'Start')}
                      </button>
                    </div>
                    {kaffarahActive ? (
                      <>
                        <select
                          value={summary?.profile.kaffarah.targetDays ?? 60}
                          onChange={(e) =>
                            updateProfile.mutate({
                              kaffarah: { active: true, targetDays: parseInt(e.target.value, 10) },
                            })
                          }
                          aria-label={t('fasting.kaffarahTargetAriaLabel', 'Kaffarah target')}
                          className="select select-xs w-full bg-brand-deep border-brand-border text-white"
                        >
                          <option value={60}>
                            {t('fasting.kaffarah60Days', '60 consecutive days (Ramaḍān violation)')}
                          </option>
                          <option value={3}>
                            {t('fasting.kaffarah3Days', '3 days (broken oath)')}
                          </option>
                        </select>
                        <ManageProgress
                          done={summary?.kaffarah.currentRun ?? 0}
                          target={summary?.profile.kaffarah.targetDays ?? 60}
                          color="#a855f7"
                          doneLabel={
                            (summary?.kaffarah.currentRun ?? 0) >=
                            (summary?.profile.kaffarah.targetDays ?? 60)
                              ? t('fasting.kaffarahComplete', "Complete — māshā'Allāh! 🎉")
                              : t('fasting.kaffarahDaysToGo', '{{count}} consecutive days to go', {
                                  count: Math.max(
                                    0,
                                    (summary?.profile.kaffarah.targetDays ?? 60) -
                                      (summary?.kaffarah.currentRun ?? 0)
                                  ),
                                })
                          }
                          extra={t(
                            'fasting.kaffarahExtra',
                            'current run: {{run}} · lifetime total: {{total}}',
                            {
                              run: summary?.kaffarah.currentRun ?? 0,
                              total: summary?.kaffarah.completed ?? 0,
                            }
                          )}
                        />
                        {summary?.kaffarah.runStale && (summary?.kaffarah.completed ?? 0) > 0 && (
                          <p className="text-red-400/90 text-[11px] rounded-lg bg-red-500/10 border border-red-500/25 px-2.5 py-1.5">
                            ⚠️{' '}
                            {t(
                              'fasting.chainBrokenWarning',
                              'Chain broken — an unexcused gap restarts the consecutive count. Log a fast today to start a new run. Consult a scholar about valid excuses.'
                            )}
                          </p>
                        )}
                        <p className="text-white/25 text-[10px] leading-relaxed">
                          {t(
                            'fasting.kaffarahAlternative',
                            'For a broken oath, feeding/clothing ten poor people comes first — fasting 3 days only if unable (Quran 5:89).'
                          )}
                        </p>
                      </>
                    ) : (
                      <p className="text-white/30 text-[11px]">
                        {t('fasting.onlyIfApplies', 'Only activate if this applies to you.')}
                      </p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {OBLIGATORY_META[1]!.refs.map((r) => (
                        <RefLink key={r.url} r={r} />
                      ))}
                    </div>
                  </div>

                  {/* ── Vows ── */}
                  <div className="rounded-2xl border border-brand-info/25 bg-brand-info/5 p-4 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-brand-info/15 grid place-items-center text-lg shrink-0">
                        🤝
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-brand-info font-bold text-sm leading-tight">
                          {t('fasting.nadhrVowedFasts', 'Nadhr — vowed fasts')}
                        </p>
                        <p className="text-white/30 text-[10px]">
                          {t(
                            'fasting.nadhrHadith',
                            '"Whoever vows to obey Allah, let him obey Him" (Bukhārī 6696)'
                          )}
                        </p>
                      </div>
                    </div>
                    {vows.length === 0 && (
                      <p className="text-white/30 text-[11px]">
                        {t(
                          'fasting.noVowsYet',
                          'No vows yet. Add one below and it gets its own countdown.'
                        )}
                      </p>
                    )}
                    {vows.map((v) => (
                      <div
                        key={v.id}
                        className="rounded-xl bg-white/[0.04] border border-brand-emerald/10 p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-white/70 text-xs font-bold flex-1 truncate">
                            {v.title}
                          </p>
                          <button
                            onClick={() => setConfirmVowDelete({ id: v.id, title: v.title })}
                            aria-label={t('fasting.deleteVowAriaLabel', 'Delete vow {{title}}', {
                              title: v.title,
                            })}
                            className="p-1 text-white/25 hover:text-red-400 shrink-0"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <ManageProgress
                          done={v.completed}
                          target={v.targetDays}
                          color="#5a9e8e"
                          doneLabel={
                            v.completed >= v.targetDays
                              ? t('fasting.vowFulfilled', 'Fulfilled ✓')
                              : t('fasting.daysRemaining', '{{count}} days remaining', {
                                  count: v.targetDays - v.completed,
                                })
                          }
                        />
                      </div>
                    ))}
                    <div className="flex gap-1.5 pt-1">
                      <input
                        value={vowTitle}
                        onChange={(e) => setVowTitle(e.target.value)}
                        placeholder={t('fasting.vowPlaceholder', 'e.g. 3 days for shifa')}
                        aria-label={t('fasting.vowDescriptionAriaLabel', 'Vow description')}
                        className="input input-xs flex-1 bg-brand-deep border-brand-border text-white placeholder-white/20"
                      />
                      <input
                        type="number"
                        min="1"
                        value={vowDays}
                        onChange={(e) => setVowDays(e.target.value)}
                        placeholder={t('common.days')}
                        aria-label={t('fasting.vowDaysAriaLabel', 'Vow days')}
                        className="input input-xs w-14 bg-brand-deep border-brand-border text-white placeholder-white/20 text-center"
                      />
                      <button
                        onClick={submitVow}
                        disabled={!vowTitle.trim() || !vowDays || addVow.isPending}
                        className="btn btn-xs bg-brand-info text-white border-0 disabled:opacity-30"
                      >
                        {t('common.add')}
                      </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {OBLIGATORY_META[2]!.refs.map((r) => (
                        <RefLink key={r.url} r={r} />
                      ))}
                    </div>
                  </div>

                  <Link
                    to="/settings"
                    onClick={() => setShowManage(false)}
                    className="block text-center text-white/25 hover:text-red-400 text-xs underline underline-offset-2 pt-4 pb-2 transition-colors"
                  >
                    {t('fasting.deleteFastingData', 'Delete fasting data →')}
                  </Link>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Makruh warning modal ── */}
      <AnimatePresence>
        {warnState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setWarnState(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22 }}
              className="bg-brand-surface rounded-3xl p-6 w-full max-w-md shadow-2xl border-2 border-brand-gold/50"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: [0, -8, 8, 0] }}
                    transition={{ duration: 0.5 }}
                    className="text-3xl"
                  >
                    ⚠️
                  </motion.span>
                  <h3 className="text-lg font-black text-brand-gold">
                    {t('fasting.oneMoment', 'One moment…')}
                  </h3>
                </div>
                <button
                  onClick={() => setWarnState(null)}
                  aria-label={t('fasting.closeWarningAriaLabel', 'Close warning')}
                  className="text-white/30 hover:text-white p-1"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 mb-5">
                {warnState.cautions.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl bg-brand-gold/10 border border-brand-gold/25 p-3 space-y-1"
                  >
                    <p className="text-brand-gold font-bold text-sm">
                      {c.info.emoji} {t(`fastingRules.disliked.${c.info.id}`, c.info.label)}
                    </p>
                    <p className="text-white/60 text-xs leading-relaxed">
                      {t(`fastingRules.dislikedDetail.${c.info.id}`, c.info.detail)}
                    </p>
                    {c.info.refs.map((r, i) => (
                      <div key={r.url} className="space-y-0.5 pt-1">
                        <p className="text-white/30 text-xs italic">
                          {t(`fastingRules.dislikedRefText.${c.info.id}.${i}`, r.text)}
                        </p>
                        <RefLink r={r} />
                      </div>
                    ))}
                  </div>
                ))}
                {warnState.cautions.some(
                  (c) => c.id === 'friday_alone' || c.id === 'saturday_alone'
                ) && (
                  <p className="text-white/40 text-xs">
                    💡{' '}
                    {t(
                      'fasting.easyFixTip',
                      "Easy fix: also fast the day before or after — then there's no dislike at all."
                    )}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setWarnState(null)}
                  className="btn flex-1 bg-brand-emerald hover:bg-brand-emerald-dim text-white border-0 font-bold"
                >
                  {t('fasting.illReconsider', "I'll reconsider")}
                </button>
                <button
                  onClick={() => submitLog(warnState.vars)}
                  className="btn flex-1 btn-ghost text-white/50 hover:text-white border border-brand-border"
                >
                  {t('fasting.logAnyway', 'Log anyway')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Guest sign-in dialog ── */}
      <AnimatePresence>
        {showGuestDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowGuestDialog(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22 }}
              className="bg-brand-surface rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-brand-border text-center"
            >
              <div className="text-5xl mb-4">🌙</div>
              <h3 className="text-xl font-black text-white mb-2">
                {t('fasting.signInToTrack', 'Sign in to track fasting')}
              </h3>
              <p className="text-white/50 text-sm mb-6 leading-relaxed">
                {t(
                  'fasting.signInDesc',
                  'Your fasting record — make-up days, vows, and sunnah fasts — is saved to your account so it syncs across devices.'
                )}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  className="btn bg-brand-emerald hover:bg-brand-emerald-dim text-white border-0 w-full"
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', '/fasting');
                    navigate('/login');
                  }}
                >
                  {t('common.signIn')}
                </button>
                <button
                  className="btn btn-ghost text-brand-emerald border border-brand-emerald/30 w-full"
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', '/fasting');
                    navigate('/signup');
                  }}
                >
                  {t('fasting.createFreeAccount', 'Create Free Account')}
                </button>
                <button
                  className="btn btn-ghost text-white/50 text-sm w-full"
                  onClick={() => setShowGuestDialog(false)}
                >
                  {t('fasting.justLooking', 'Just looking around')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Second confirmation for deletes (app-wide rule) */}
      <ConfirmDialog
        open={!!confirmVowDelete}
        title={t('fasting.deleteVowTitle', 'Delete this vow?')}
        message={
          confirmVowDelete
            ? t(
                'fasting.deleteVowMessage',
                '"{{title}}" and its countdown will be removed. Logged fasts stay in your history.',
                { title: confirmVowDelete.title }
              )
            : ''
        }
        onConfirm={() => {
          if (confirmVowDelete) deleteVow.mutate(confirmVowDelete.id);
          setConfirmVowDelete(null);
        }}
        onCancel={() => setConfirmVowDelete(null)}
      />
    </AnimatedBackground>
  );
}
