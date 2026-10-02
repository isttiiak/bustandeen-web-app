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
import {
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HandRaisedIcon,
  InformationCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { CrescentIcon, FajrIcon, MaghribIcon } from '../components/icons/IslamicIcons.js';
import { BTN_PRIMARY, CARD } from '../components/bustanStyles.js';
import {
  CATEGORY_ICON,
  CautionIcon,
  ProhibitedIcon,
  STATUS_ICON,
  STATUS_TONE,
  VOLUNTARY_ICON,
  fastIcon,
} from '../components/fasting/fastingIcons.js';
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
      Icon: typeof CATEGORY_ICON.qada;
      tone: string;
      done: number;
      target: number;
    }> = [];
    if (qadaOwed > 0) {
      caps.push({
        id: 'qada',
        label: t('fasting.qada', 'Qaḍā'),
        Icon: CATEGORY_ICON.qada,
        tone: 'text-brand-gold border-brand-gold/40 bg-brand-gold/10',
        done: qadaDone,
        target: qadaOwed,
      });
    }
    if (kaffarahActive) {
      caps.push({
        id: 'kaffarah',
        label: t('fasting.kaffarah', 'Kaffārah'),
        Icon: CATEGORY_ICON.kaffarah,
        tone: 'text-brand-warm border-brand-warm/40 bg-brand-warm/10',
        done: summary?.kaffarah.currentRun ?? 0,
        target: summary?.profile.kaffarah.targetDays ?? 60,
      });
    }
    for (const v of vows) {
      if (v.completed < v.targetDays) {
        caps.push({
          id: `vow-${v.id}`,
          label: v.title,
          Icon: CATEGORY_ICON.nadhr,
          tone: 'text-brand-info border-brand-info/40 bg-brand-info/10',
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

  // The arch keeps one surface in every state; the state shows in the medallion.
  const archBorder = ruling.level === 'haram' ? 'border-red-400/40' : 'border-brand-border';

  const TypeIcon =
    category === 'voluntary' ? VOLUNTARY_ICON[effectiveKind] : CATEGORY_ICON[category];
  const currentTypeLabel =
    category === 'voluntary'
      ? VOLUNTARY_BY_ID[effectiveKind]
        ? t(`fastingRules.voluntary.${effectiveKind}`, VOLUNTARY_BY_ID[effectiveKind]!.label)
        : t('fasting.voluntary', 'Voluntary')
      : category === 'nadhr'
        ? (vows.find((v) => v.id === vowId)?.title ?? t('fasting.nadhr', 'Vow'))
        : t(`fasting.${category}`, CATEGORY_LABEL[category].label);

  const loggedLabel = (l: NonNullable<typeof log>): string =>
    l.category === 'voluntary' && l.voluntaryKind
      ? VOLUNTARY_BY_ID[l.voluntaryKind]
        ? t(`fastingRules.voluntary.${l.voluntaryKind}`, VOLUNTARY_BY_ID[l.voluntaryKind]!.label)
        : t('fasting.voluntary', 'Voluntary')
      : l.category === 'nadhr'
        ? (vows.find((v) => v.id === l.vowId)?.title ?? t('fasting.nadhr', 'Vow'))
        : t(`fasting.${l.category}`, CATEGORY_LABEL[l.category as FastingCategory]?.label ?? '');

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('fasting.seoTitle', 'Fasting Tracker: Ramadan, Qada & Voluntary Sawm')}
        description={t(
          'fasting.seoDescription',
          'Log obligatory, qada (makeup) and voluntary fasts with a fiqh-aware calendar, streaks and progress stats. Track your Ramadan and Sunnah fasting in one place.'
        )}
        path="/fasting"
      />
      <h1 className="sr-only">{t('fasting.title', 'Fasting Tracker')}</h1>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-xl mx-auto space-y-5">
          {musafir && <MusafirBanner state={musafir} today={getTrackingDay()} variant="fasting" />}
          {/* ── Tabs + calendar toggle ── */}
          <div className="flex items-center justify-between gap-2">
            <TabNav
              items={[
                { label: t('fasting.tracker', 'Tracker'), to: '/fasting', active: true },
                { label: t('fasting.analytics', 'Analytics'), to: '/fasting/analytics' },
              ]}
            />
            <button
              onClick={() => setCalendarOpen((o) => !o)}
              aria-label={t('fasting.openCalendarAriaLabel', 'Open month calendar')}
              aria-expanded={calendarOpen}
              title={t('fasting.pickDay', 'Pick any day from the calendar')}
              className={`p-2.5 rounded-control border shadow-elev-1 transition-colors ${
                calendarOpen
                  ? 'bg-brand-deep border-brand-emerald/50 text-brand-emerald'
                  : 'bg-brand-deep border-brand-border text-white/70 hover:text-white hover:border-brand-emerald/40'
              }`}
            >
              <CalendarDaysIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* ── Ramadan qada advance warning: surfaced proactively before the
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

          {/* Rayhanah days: fasting excused now, made up later */}
          {cycleActive && selectedDate >= cycleActive.startDate ? (
            <ExcusedCard feature="fasting" />
          ) : (
            <>
              {/* ── The screen's one arch: the selected day ── */}
              <motion.section
                layout
                className={`rounded-arch border ${archBorder} bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-9 pb-5 sm:px-6 text-center space-y-4`}
              >
                {/* Date */}
                <div>
                  <h2 className="font-display text-white font-bold text-2xl leading-tight">
                    {friendlyDate(selectedDate, t)}
                  </h2>
                  <p className="text-white/70 text-xs mt-1">
                    {formatLocaleDate(dateObj, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {ruling.hijriLabel && (
                      <span className="text-brand-gold"> · {ruling.hijriLabel}</span>
                    )}
                  </p>
                </div>

                {/* Active obligation countdowns: one capsule per activated type.
                    Tap to log the day against that obligation. */}
                {debtCapsules.length > 0 && (
                  <div className="flex justify-center gap-1.5 flex-wrap">
                    {debtCapsules.map((c) => {
                      const remaining = Math.max(0, c.target - c.done);
                      const selected =
                        (c.id === 'qada' && category === 'qada') ||
                        (c.id === 'kaffarah' && category === 'kaffarah') ||
                        (c.id.startsWith('vow-') &&
                          category === 'nadhr' &&
                          vowId === c.id.replace('vow-', ''));
                      return (
                        <motion.button
                          key={c.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (!user) {
                              setShowGuestDialog(true);
                              return;
                            }
                            if (log) {
                              toast(
                                t(
                                  'fasting.alreadyLogged',
                                  'This day is already logged. Remove it with the bin button to change its type.'
                                ),
                                {
                                  id: 'fasting-capsule',
                                  icon: (
                                    <InformationCircleIcon className="w-5 h-5 text-brand-info" />
                                  ),
                                }
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
                                'Fast type set to {{label}}. Now tap "I fasted"',
                                { label: c.label }
                              ),
                              { id: 'fasting-capsule', duration: 2500 }
                            );
                          }}
                          aria-pressed={selected}
                          title={`${c.label}: ${c.done}/${c.target}`}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-shadow ${c.tone} ${
                            selected ? 'ring-2 ring-current ring-offset-0' : ''
                          }`}
                        >
                          <c.Icon className="w-3.5 h-3.5" aria-hidden="true" />
                          <span className="max-w-[90px] truncate">{c.label}</span>
                          <span className="tabular-nums text-white">
                            {c.done}/{c.target}
                          </span>
                          <span className="text-white/70 font-semibold">
                            · {t('fasting.nLeft', '{{count}} left', { count: remaining })}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* State display */}
                {ruling.level === 'haram' && ruling.haram ? (
                  <div className="space-y-2 py-1">
                    <span className="mx-auto w-16 h-16 rounded-full grid place-items-center bg-red-400/10 border border-red-400/40 text-red-400">
                      <ProhibitedIcon className="w-8 h-8" aria-hidden="true" />
                    </span>
                    <p className="text-red-400 font-bold text-lg leading-tight">
                      {ruling.haram.title}
                    </p>
                    <p className="text-white/80 text-sm leading-relaxed max-w-sm mx-auto">
                      {t(`fastingRules.prohibitedDetail.${ruling.haram.id}`, ruling.haram.detail)}
                    </p>
                    <div className="flex justify-center gap-2 flex-wrap">
                      {ruling.haram.refs.map((r) => (
                        <RefLink key={r.url} r={r} />
                      ))}
                    </div>
                    <p className="text-white/70 text-sm pt-1">
                      {t(
                        'fasting.enjoyBlessing',
                        'Enjoy the blessing: today is for eating and celebrating.'
                      )}
                    </p>
                  </div>
                ) : ruling.level === 'ramadan' ? (
                  <div className="space-y-3 py-1">
                    <span className="mx-auto w-16 h-16 rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/40 text-brand-gold">
                      <CrescentIcon className="w-8 h-8" />
                    </span>
                    <p className="font-display text-brand-gold font-bold text-xl">
                      {t('fasting.ramadanMubarak', 'Ramaḍān Mubārak!')}
                    </p>
                    <p className="text-white/80 text-sm leading-relaxed max-w-sm mx-auto">
                      {t(
                        'fasting.ramadanHomeDesc',
                        'This blessed month has its own home: the 30-day tracker with suhoor & iftar times, tarawih nights and Laylat al-Qadr.'
                      )}
                    </p>
                    <button className={BTN_PRIMARY} onClick={() => navigate('/ramadan')}>
                      <CrescentIcon className="w-4 h-4" />
                      {t('fasting.openRamadanTracker', 'Open the Ramadan tracker')}
                    </button>
                    <a
                      href="https://quran.com/2/185"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 text-brand-gold text-[11px] underline underline-offset-2"
                    >
                      {translateReference('Quran 2:185', i18n.language)}
                      <ArrowTopRightOnSquareIcon className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </div>
                ) : log ? (
                  /* ── Logged state ── */
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={log.status}
                      initial={{ scale: 0.92, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', damping: 20 }}
                      className="space-y-3"
                    >
                      {(() => {
                        const StatusIcon = STATUS_ICON[log.status];
                        const tone = STATUS_TONE[log.status];
                        return (
                          <motion.span
                            animate={celebrate ? { scale: [1, 1.12, 1] } : {}}
                            transition={{ duration: 0.6 }}
                            className={`mx-auto w-16 h-16 rounded-full grid place-items-center border border-current bg-brand-deep shadow-elev-1 ${tone.text}`}
                          >
                            <StatusIcon className="w-9 h-9" aria-hidden="true" />
                          </motion.span>
                        );
                      })()}
                      <div>
                        <p
                          className={`font-display font-bold text-xl ${STATUS_TONE[log.status].text}`}
                        >
                          {t(`fasting.${log.status}`, STATUS_META[log.status].label)}
                        </p>
                        {log.status === 'completed' && (
                          <p className="text-white/80 text-sm mt-0.5">
                            {t('fasting.mayAllahAccept', 'May Allah accept it.')}
                          </p>
                        )}
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-deep border border-brand-border text-white/80 text-xs font-semibold">
                        {(() => {
                          const Icon = fastIcon(log.category as FastingCategory, log.voluntaryKind);
                          return (
                            <Icon className="w-3.5 h-3.5 text-brand-emerald" aria-hidden="true" />
                          );
                        })()}
                        {loggedLabel(log)}
                      </div>

                      <div className="flex justify-center items-center gap-2 pt-1 flex-wrap">
                        {!isFuture &&
                          log.status === 'intended' &&
                          (selectedDate !== today ||
                            !dayTimes ||
                            new Date() >= dayTimes.maghrib) && (
                            <button
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
                              className={BTN_PRIMARY}
                            >
                              <CheckIcon className="w-4 h-4" aria-hidden="true" />
                              {t('fasting.completedIt', 'I completed it!')}
                            </button>
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
                            className="px-3 py-2 rounded-control text-white/70 hover:text-red-400 text-xs font-semibold transition-colors"
                          >
                            {t('fasting.brokeFast', 'I broke the fast')}
                          </button>
                        )}
                        <button
                          onClick={handleClear}
                          aria-label={t('fasting.removeLogAriaLabel', 'Remove this fast log')}
                          className="p-2 rounded-control text-white/60 hover:text-red-400 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  /* ── Not logged yet ── */
                  <div className="space-y-4">
                    <span className="mx-auto w-16 h-16 rounded-full grid place-items-center border border-brand-border bg-brand-deep text-brand-gold shadow-elev-1">
                      <CrescentIcon className="w-8 h-8" />
                    </span>

                    {/* Fasting-as chip: opens the type sheet */}
                    <button
                      onClick={() => setShowTypeSheet(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-deep border border-brand-border hover:border-brand-emerald/40 text-white/80 text-xs font-semibold shadow-elev-1 transition-colors"
                    >
                      <TypeIcon className="w-3.5 h-3.5 text-brand-emerald" aria-hidden="true" />
                      {currentTypeLabel}
                      <ChevronDownIcon className="w-3 h-3 text-white/60" aria-hidden="true" />
                    </button>

                    <div className="flex flex-col items-center gap-3">
                      {!isFuture && (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => requestLog('completed')}
                          disabled={upsert.isPending || (category === 'nadhr' && !vowId)}
                          className={`${BTN_PRIMARY} w-full max-w-xs h-14 text-base shadow-elev-2`}
                        >
                          <CheckIcon className="w-5 h-5" aria-hidden="true" />
                          {t('fasting.iFasted', 'I fasted {{day}}', {
                            day: friendlyDate(selectedDate, t).toLowerCase(),
                          })}
                        </motion.button>
                      )}
                      {(selectedDate === today || isFuture) && (
                        <button
                          onClick={() => requestLog('intended')}
                          disabled={upsert.isPending || (category === 'nadhr' && !vowId)}
                          className="inline-flex items-center gap-1.5 text-brand-info text-sm font-semibold underline underline-offset-4 hover:opacity-80"
                        >
                          <FajrIcon className="w-4 h-4" />
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
                  <div className="flex items-center justify-center gap-5 pt-3 border-t border-brand-border text-xs">
                    <span className="inline-flex items-center gap-1.5 text-white/70">
                      <FajrIcon className="w-4 h-4 text-brand-info" />
                      {t('fasting.suhoorEnds', 'Suhur ends')}
                      <span className="text-white font-bold tabular-nums">
                        {formatTime(dayTimes.fajr)}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-white/70">
                      <MaghribIcon className="w-4 h-4 text-brand-gold" />
                      {t('fasting.iftar', 'Iftar')}
                      <span className="text-brand-gold font-bold tabular-nums">
                        {formatTime(dayTimes.maghrib)}
                      </span>
                    </span>
                  </div>
                )}
              </motion.section>

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

              {/* ── Recommended today ── */}
              {ruling.level === 'normal' && ruling.recommended.length > 0 && (
                <div className="space-y-2">
                  {ruling.recommended.map((r, i) => {
                    const Icon = VOLUNTARY_ICON[r.id];
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 + i * 0.06 }}
                        className={`${CARD} px-4 py-3 flex items-start gap-3`}
                      >
                        <span className="w-10 h-10 shrink-0 rounded-control grid place-items-center bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald">
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-white leading-tight flex items-center gap-2 flex-wrap">
                            {t(`fastingRules.voluntary.${r.id}`, r.label)}
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-emerald/10 text-brand-emerald">
                              {t('fasting.sunnahFast', 'Sunnah fast')}
                            </span>
                          </p>
                          <p className="text-white/80 text-xs leading-snug mt-1">
                            {t(`fastingRules.voluntaryVirtue.${r.id}`, r.virtue)}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <RefLink r={r.ref} />
                            {r.specialDayId && (
                              <Link
                                to={`/special-day/${r.specialDayId}`}
                                className="inline-flex items-center gap-0.5 text-brand-emerald text-[11px] font-bold underline underline-offset-2 hover:opacity-80"
                              >
                                {t('fasting.learnMore', 'Learn more')}
                                <ChevronRightIcon className="w-3 h-3" aria-hidden="true" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Caution note (full warning shows at log time) */}
              {ruling.level === 'normal' && ruling.cautions.length > 0 && !log && (
                <p className="flex items-start gap-2 text-brand-gold text-xs px-2 leading-relaxed">
                  <CautionIcon className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
                  <span>
                    {ruling.cautions
                      .map((c) => t(`fastingRules.disliked.${c.info.id}`, c.info.label))
                      .join(' · ')}
                    . {t('fasting.remindBeforeLogging', "We'll remind you before logging.")}
                  </span>
                </p>
              )}
            </>
          )}

          {/* ── Progress tiles + manage ── */}
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
            <div className={`${CARD} p-4 space-y-3`}>
              {vows.map((v) => {
                const done = v.completed >= v.targetDays;
                return (
                  <div key={v.id}>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-white/80 font-semibold truncate inline-flex items-center gap-1.5">
                        <HandRaisedIcon
                          className="w-3.5 h-3.5 text-brand-info"
                          aria-hidden="true"
                        />
                        {v.title}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 tabular-nums ${done ? 'text-brand-emerald font-bold' : 'text-white/70'}`}
                      >
                        {v.completed}/{v.targetDays}
                        {done && <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                      </span>
                    </div>
                    <div className="w-full bg-track rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        animate={{ width: `${Math.min(100, (v.completed / v.targetDays) * 100)}%` }}
                        transition={{ duration: 0.6 }}
                        className="h-full bg-brand-gold rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Kaffarah broken-chain warning */}
          {kaffarahActive &&
            summary?.kaffarah.runStale &&
            (summary?.kaffarah.completed ?? 0) > 0 && (
              <p className="flex items-start gap-2 text-red-400 text-xs px-2 leading-relaxed">
                <CautionIcon className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
                <span>
                  {t(
                    'fasting.kaffarahChainBroken',
                    'Kaffarah chain broken: the {{days}} days must be consecutive. An unexcused gap restarts the count (open Manage for details).',
                    { days: summary?.profile.kaffarah.targetDays ?? 60 }
                  )}
                </span>
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

      {/* ── Fasting settings: portaled to body so it floats above navbar ── */}
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
