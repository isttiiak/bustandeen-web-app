import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { m as motion, AnimatePresence } from 'framer-motion';
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
import { ChevronDownIcon, TrashIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
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
  VOLUNTARY_BY_ID,
  DayCaution,
} from '../utils/fastingRules.js';
import { calcPrayerTimes, formatTime } from '../utils/prayerTimes.js';
import { isPostMaghrib, getHijriToday } from '../utils/islamicCalendar.js';
import { formatLocaleDate } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';
import MusafirBanner from '../components/MusafirBanner.js';
import { useMusafir } from '../utils/musafir.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import {
  offsetDate,
  friendlyDate,
  RefLink,
  STATUS_META,
  CATEGORY_LABEL,
  SPARKLES,
} from '../components/fasting/fastingParts.js';
import FastingGuestDialog from '../components/fasting/FastingGuestDialog.js';
import FastingMakruhModal from '../components/fasting/FastingMakruhModal.js';
import FastingSettingsSheet from '../components/fasting/FastingSettingsSheet.js';
import FastingTypeSheet from '../components/fasting/FastingTypeSheet.js';
import FastingLearn from '../components/fasting/FastingLearn.js';
import FastingProgressChips from '../components/fasting/FastingProgressChips.js';
import FastingWeekStrip from '../components/fasting/FastingWeekStrip.js';
import FastingMonthCalendar from '../components/fasting/FastingMonthCalendar.js';
import RamadanQadaWarning from '../components/fasting/RamadanQadaWarning.js';

// ─── component ────────────────────────────────────────────────────────────────

export default function FastingTracker() {
  const musafir = useMusafir();
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
          {musafir && <MusafirBanner state={musafir} today={getTrackingDay()} variant="fasting" />}
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
          <RamadanQadaWarning
            qadaRemaining={qadaRemaining}
            ramadanWindow={ramadanWindow}
            showRamadanQadaWarning={showRamadanQadaWarning}
          />

          {/* ── Month calendar (full control over any past day) ── */}
          <FastingMonthCalendar
            calMonth={calMonth}
            calendarOpen={calendarOpen}
            logsByDate={logsByDate}
            selectedDate={selectedDate}
            setCalMonth={setCalMonth}
            setCalendarOpen={setCalendarOpen}
            setSelectedDate={setSelectedDate}
            today={today}
            tomorrow={tomorrow}
          />

          {/* ── Week strip (min-w-0 so 8 days never push the page wider than the phone) ── */}
          <FastingWeekStrip
            logsByDate={logsByDate}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            today={today}
            tomorrow={tomorrow}
            weekDays={weekDays}
          />

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
          <FastingProgressChips
            kaffarahActive={kaffarahActive}
            qadaOwed={qadaOwed}
            qadaRemaining={qadaRemaining}
            setQadaInput={setQadaInput}
            setShowGuestDialog={setShowGuestDialog}
            setShowManage={setShowManage}
            summary={summary}
            user={user}
          />

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
          <FastingLearn learnOpen={learnOpen} setLearnOpen={setLearnOpen} />
        </div>
      </div>

      {/* ── Type sheet (what am I fasting as) ── */}
      <FastingTypeSheet
        category={category}
        effectiveKind={effectiveKind}
        kaffarahActive={kaffarahActive}
        qadaRemaining={qadaRemaining}
        ruling={ruling}
        setCategory={setCategory}
        setKind={setKind}
        setShowTypeSheet={setShowTypeSheet}
        setVowId={setVowId}
        showTypeSheet={showTypeSheet}
        summary={summary}
        vowId={vowId}
        vows={vows}
      />

      {/* ── Fasting settings — portaled to body so it floats above navbar ── */}
      <FastingSettingsSheet
        addVow={addVow}
        kaffarahActive={kaffarahActive}
        qadaDone={qadaDone}
        qadaInput={qadaInput}
        qadaOwed={qadaOwed}
        qadaRemaining={qadaRemaining}
        saveQadaOwed={saveQadaOwed}
        setConfirmVowDelete={setConfirmVowDelete}
        setQadaInput={setQadaInput}
        setShowManage={setShowManage}
        setVowDays={setVowDays}
        setVowTitle={setVowTitle}
        showManage={showManage}
        submitVow={submitVow}
        summary={summary}
        updateProfile={updateProfile}
        vowDays={vowDays}
        vowTitle={vowTitle}
        vows={vows}
      />

      {/* ── Makruh warning modal ── */}
      <FastingMakruhModal setWarnState={setWarnState} submitLog={submitLog} warnState={warnState} />

      {/* ── Guest sign-in dialog ── */}
      <FastingGuestDialog
        navigate={navigate}
        setShowGuestDialog={setShowGuestDialog}
        showGuestDialog={showGuestDialog}
      />
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
