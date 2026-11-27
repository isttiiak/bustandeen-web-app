import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  LockClosedIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import RayhanahSettingsDrawer from '../components/RayhanahSettingsDrawer.js';
import { useAuthStore } from '../store/useAuthStore.js';
import {
  useCycleSummary,
  useStartCycle,
  useEndCycle,
  useIsFemale,
  useUpsertCycleDay,
  useEditCycleLog,
  usePartnerSync,
  useSetPregnancy,
  type CycleFlow,
  type CycleMood,
} from '../hooks/useCycle.js';
import { useFriendsList } from '../hooks/useSocial.js';
import CycleCalendar from '../components/CycleCalendar.js';
import TabNav from '../components/TabNav.js';
import { useFastingSummary, useUpdateFastingProfile } from '../hooks/useFasting.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { getRamadanWindow } from '../utils/ramadan.js';
import { celebrateSmall } from '../utils/celebrate.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import MoodComfort from '../components/MoodComfort.js';
import CycleGuidance from '../components/CycleGuidance.js';
import { OfflineQueuedError } from '../utils/syncOutbox.js';
import { CrescentIcon, DropIcon, FlowerIcon, LeafIcon } from '../components/icons/IslamicIcons.js';
import { FlowDrops } from '../components/cycle/cycleIcons.js';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, SECTION_TITLE } from '../components/bustanStyles.js';
import Switch from '../components/Switch.js';
import {
  PHRASES,
  phraseOfDayIdx,
  GHUSL_STEPS,
  FLOW_OPTIONS,
  SYMPTOM_OPTIONS,
  MOOD_OPTIONS,
  CHIP,
  CHIP_IDLE,
  CHIP_PINK,
  CHIP_INFO,
  BTN_PINK,
  NOTE,
  LABEL,
  DIALOG,
  BACKDROP,
  formatDay,
  shiftStr,
  daysBetween,
  ramadanDaysIn,
} from '../components/cycle/rayhanahShared.js';
import { Ref, Medallion } from '../components/cycle/RayhanahBits.js';
import RayhanahGarden from '../components/cycle/RayhanahGarden.js';
import RayhanahAdhkar from '../components/cycle/RayhanahAdhkar.js';
import RayhanahFastingMakeup from '../components/cycle/RayhanahFastingMakeup.js';
import RayhanahFiqhCompanion from '../components/cycle/RayhanahFiqhCompanion.js';

// Rayhanah privacy rule: no cycle data (days, flow, symptoms, moods, dates)
// is ever sent to an AI or shown to friends. Everything on this screen is
// fixed text chosen on the device; the only network calls are the user's own
// cycle/fasting endpoints and the opt-in partner status.

export default function RayhanahCycle() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isFemale = useIsFemale();
  const today = getTrackingDay();

  const { data: summary, isLoading, isError, refetch } = useCycleSummary();
  const { data: fastingSummary } = useFastingSummary();
  const startCycle = useStartCycle();
  const endCycle = useEndCycle();
  const updateFastingProfile = useUpdateFastingProfile();
  const upsertDay = useUpsertCycleDay();
  const partnerSync = usePartnerSync();
  const setPregnancy = useSetPregnancy();

  const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);
  const { data: friends } = useFriendsList(partnerPickerOpen || !!summary?.partnerSync?.enabled);

  const [pregnancyFormOpen, setPregnancyFormOpen] = useState(false);
  const [dueDateInput, setDueDateInput] = useState('');

  const [startOpen, setStartOpen] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [startType, setStartType] = useState<'hayd' | 'nifas'>('hayd');
  const [ghuslOpen, setGhuslOpen] = useState(false);
  const [ghuslChecked, setGhuslChecked] = useState<boolean[]>(GHUSL_STEPS.map(() => false));
  const [qadaPrompt, setQadaPrompt] = useState<{ days: number } | null>(null);
  // Day navigation for "How are you today?": allows editing past days within the active period
  const [viewDay, setViewDay] = useState(today);
  // Settings drawer (body stats + preferences), shared with Analytics
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Edit an episode (dates) or reopen the most recent one ("I'm not done yet")
  const editCycle = useEditCycleLog();

  const active = summary?.active ?? null;
  const todayNote = summary?.days?.find((d) => d.date === today) ?? null;
  const viewDayNote = summary?.days?.find((d) => d.date === viewDay) ?? null;
  // Reset viewDay to today whenever active period changes (e.g. period ends)
  useEffect(() => {
    if (!active) setViewDay(today);
  }, [active, today]);

  // Garden of Light checklist: server-synced (see useUpsertCycleDay), so
  // progress survives a device switch or cache clear instead of living only
  // in localStorage. One-time migration: any pre-existing local checklist
  // data (from before this was server-synced) is moved up on first load,
  // then every orphaned `bustandeen_rayhanah_garden_*` key is cleared; those
  // used to accumulate one new key per day forever with no cleanup.
  const gardenIds = useMemo(() => todayNote?.garden ?? [], [todayNote]);
  const garden = useMemo(() => Object.fromEntries(gardenIds.map((id) => [id, true])), [gardenIds]);
  useEffect(() => {
    const legacyKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith('bustandeen_rayhanah_garden_')
    );
    if (!legacyKeys.length) return;
    const todayKey = `bustandeen_rayhanah_garden_${today}`;
    if (legacyKeys.includes(todayKey) && !todayNote?.garden?.length) {
      try {
        const local = JSON.parse(localStorage.getItem(todayKey) ?? '{}') as Record<string, boolean>;
        const ids = Object.keys(local).filter((id) => local[id]);
        if (ids.length) upsertDay.mutate({ date: today, garden: ids });
      } catch {
        /* corrupt legacy entry: nothing to migrate */
      }
    }
    for (const k of legacyKeys) localStorage.removeItem(k);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time migration + cleanup pass; todayNote/upsertDay change identity often and re-running this after the first pass would be a no-op anyway
  }, []);

  const toggleGarden = (id: string) => {
    const already = gardenIds.includes(id);
    const next = already ? gardenIds.filter((g) => g !== id) : [...gardenIds, id];
    upsertDay.mutate({ date: today, garden: next });
    if (!already) celebrateSmall();
  };
  const gardenDone = gardenIds.length;

  // "I'm not done yet": the most recent completed episode, offered for reopen
  // when it ended within the last 3 days and nothing is active. Daily notes
  // belong to their dates, so reopening loses NOTHING.
  const lastEnded = useMemo(() => {
    if (active) return null;
    const done = (summary?.logs ?? []).filter((l) => l.endDate);
    if (!done.length) return null;
    const latest = [...done].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0]!;
    const diffDays = Math.round(
      (new Date(today + 'T12:00:00').getTime() - new Date(latest.endDate + 'T12:00:00').getTime()) /
        86_400_000
    );
    return diffDays >= 0 && diffDays <= 3 ? latest : null;
  }, [summary, active, today]);

  const setFlow = (flow: CycleFlow) =>
    upsertDay.mutate({ date: viewDay, flow: viewDayNote?.flow === flow ? null : flow });
  const toggleSymptom = (id: string) => {
    const cur = viewDayNote?.symptoms ?? [];
    upsertDay.mutate({
      date: viewDay,
      symptoms: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  };
  // Moods are multi-select: a day can hold several feelings (Istiak).
  const toggleMood = (mood: CycleMood) => {
    const cur = viewDayNote?.moods ?? [];
    upsertDay.mutate({
      date: viewDay,
      moods: cur.includes(mood) ? cur.filter((m) => m !== mood) : [...cur, mood],
    });
  };

  const handleEndConfirmed = () => {
    const startedOn = active?.startDate;
    // The ghusl guidance and the qaḍāʾ prompt follow the END of the period, so
    // they show for an end saved offline too (it syncs later, audit T2.3).
    const afterEnd = () => {
      setGhuslOpen(true);
      setGhuslChecked(GHUSL_STEPS.map(() => false));
      if (startedOn) {
        const n = ramadanDaysIn(startedOn, today);
        if (n > 0) setQadaPrompt({ days: n });
      }
    };
    endCycle.mutate(
      { date: today },
      {
        onSuccess: afterEnd,
        onError: (e) => {
          if (e instanceof OfflineQueuedError) afterEnd();
        },
      }
    );
  };

  const addQada = () => {
    if (!qadaPrompt) return;
    const current = fastingSummary?.profile?.qadaOwed ?? 0;
    updateFastingProfile.mutate(
      { qadaOwed: current + qadaPrompt.days },
      {
        onSuccess: () => {
          toast.success(
            t(
              'rayhanah.qadaAddedToast',
              '{{count, number}} qaḍā day(s) added. The tracker will guide you.',
              { count: qadaPrompt.days }
            )
          );
          setQadaPrompt(null);
        },
      }
    );
  };

  const nextStartLabel = useMemo(() => {
    const ns = summary?.prediction?.nextStart;
    return ns ? formatDay(ns) : null;
  }, [summary]);

  // PMS heads-up: days until predicted next period
  const daysUntilNext = useMemo(() => {
    const ns = summary?.prediction?.nextStart;
    if (!ns || active) return null;
    return daysBetween(today, ns);
  }, [summary, active, today]);
  const pmsAlert = daysUntilNext !== null && daysUntilNext >= 0 && daysUntilNext <= 7;

  // Fasting makeup summary
  const qadaOwed = fastingSummary?.profile?.qadaOwed ?? 0;
  const qadaCompleted = fastingSummary?.qadaCompleted ?? 0;
  const qadaRemaining = Math.max(0, qadaOwed - qadaCompleted);
  const ramadanWindow = getRamadanWindow();
  const showRamadanQadaWarning =
    !ramadanWindow.active &&
    ramadanWindow.daysUntil > 0 &&
    ramadanWindow.daysUntil <= 30 &&
    qadaRemaining > 0;

  if (!user) return null;
  if (!isFemale) {
    // Gentle gate: the page is reachable only from the female-only menu entry
    return (
      <div className="min-h-[60vh] grid place-items-center px-4 text-center">
        <div>
          <span className="mx-auto mb-4 w-14 h-14 rounded-full grid place-items-center bg-brand-pink/10 border border-brand-pink/40 text-brand-pink">
            <FlowerIcon className="w-7 h-7" />
          </span>
          <p className="text-white/70 text-sm max-w-sm">
            {t(
              'rayhanah.genderGate',
              'Rayhanah Cycle is a private space for our sisters. Set your gender to female in'
            )}{' '}
            <button className="text-brand-emerald underline" onClick={() => navigate('/profile')}>
              {t('rayhanah.genderGateLink', 'your profile')}
            </button>{' '}
            {t('rayhanah.genderGateSuffix', 'to open it.')}
          </p>
        </div>
      </div>
    );
  }

  const ARCH =
    'rounded-arch border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-10 pb-6 sm:px-8 text-center';

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('rayhanah.title', 'Rayhanah Cycle')}</h1>
      <div className="px-4 pt-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <TabNav
              items={[
                { label: t('rayhanah.tabCycle', 'Cycle'), to: '/cycle', active: true },
                { label: t('rayhanah.tabAnalytics', 'Analytics'), to: '/cycle/analytics' },
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
      <div className="relative max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-5">
        {/* ── The screen's one arch ─────────────────────────────────────────── */}
        {isLoading ? (
          <div className={`${CARD} p-10 grid place-items-center`}>
            <span className="loading loading-spinner loading-lg text-brand-pink" />
          </div>
        ) : isError ? (
          <div className={`${CARD} p-8 text-center space-y-3`}>
            <p className="text-white/70 text-sm">
              {t('rayhanah.loadError', "Couldn't load your cycle data.")}
            </p>
            <button className={BTN_PINK} onClick={() => void refetch()}>
              {t('rayhanah.tryAgain', 'Try again')}
            </button>
          </div>
        ) : active ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${ARCH} border-brand-pink/40 space-y-4`}
          >
            <Medallion tone="pink">
              <FlowerIcon className="w-8 h-8" />
            </Medallion>
            <div>
              <p className="text-brand-pink text-xs font-bold uppercase tracking-widest">
                {active.type === 'nifas'
                  ? t('rayhanah.nifasHeader', 'Nifās: post-natal rest')
                  : t('rayhanah.haydHeader', 'Rayhanah days')}
              </p>
              <h2 className="font-display text-4xl font-bold text-white mt-2 leading-tight">
                {t('rayhanah.dayCount', 'Day {{count, number}}', { count: active.dayCount })}
              </h2>
              <p className="text-white/70 text-sm mt-1">
                {t('rayhanah.sinceDate', 'since {{date}}', { date: formatDay(active.startDate) })}
              </p>
            </div>
            <p className="text-brand-pink text-sm leading-relaxed max-w-md mx-auto">
              {t(`rayhanah.phrase${phraseOfDayIdx()}`, PHRASES[phraseOfDayIdx()]!)}
            </p>

            {active.beyondMax && (
              <div className="rounded-control bg-brand-gold/10 border border-brand-gold/40 p-4 text-left text-xs leading-relaxed text-white/80 flex gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-brand-gold" />
                <p>
                  <span className="font-bold text-brand-gold">
                    {t(
                      'rayhanah.beyondMaxWarning',
                      'Day {{dayCount, number}} has passed the {{maxDays, number}}-day maximum ({{madhab}} view{{nifas}}).',
                      {
                        dayCount: active.dayCount,
                        maxDays: active.maxDays,
                        madhab: summary?.madhab === 'hanafi' ? 'Ḥanafī' : 'majority',
                        nifas: active.type === 'nifas' ? ', nifās' : '',
                      }
                    )}
                  </span>{' '}
                  {t('rayhanah.istihadaNote', 'Bleeding beyond the maximum is usually')}{' '}
                  <span className="font-bold">{t('rayhanah.istihadaLabel', 'istiḥāḍa')}</span>:{' '}
                  {t('rayhanah.istihadaResume', 'prayer resumes with fresh wuḍū for each prayer')} (
                  <Ref href="https://sunnah.com/bukhari:306" label="Bukhārī 306" />
                  ). {t('rayhanah.scholarAdvice', 'Please confirm with a scholar you trust.')}
                </p>
              </div>
            )}

            <div className="text-left">
              <CycleGuidance dayCount={active.dayCount} />
            </div>

            <div>
              <button
                className={`${BTN_PRIMARY} w-full h-12 text-base`}
                onClick={handleEndConfirmed}
                disabled={endCycle.isPending}
              >
                {endCycle.isPending ? (
                  <span className="loading loading-spinner" />
                ) : (
                  t('rayhanah.endPeriod', 'My period has ended')
                )}
              </button>
              <p className="text-white/70 text-[11px] mt-2">
                {t(
                  'rayhanah.endPeriodHelp',
                  'Tap when the bleeding has fully stopped. The ghusl guide opens next.'
                )}
              </p>
            </div>
          </motion.section>
        ) : summary?.pregnancy?.active ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${ARCH} border-brand-emerald/40 space-y-3`}
          >
            <Medallion tone="emerald">
              <HeartIcon className="w-8 h-8" />
            </Medallion>
            <p className="text-brand-emerald text-xs font-bold uppercase tracking-widest">
              {t('rayhanah.pregnancyHeader', 'Expecting')}
            </p>
            <h2 className="font-display text-3xl font-bold text-white leading-tight">
              {summary.pregnancy.weeksAlong != null
                ? t('rayhanah.pregnancyWeek', 'Week {{week, number}}', {
                    week: summary.pregnancy.weeksAlong,
                  })
                : t('rayhanah.pregnancyHeader', 'Expecting')}
            </h2>
            <p className="text-white/75 text-sm leading-relaxed max-w-md mx-auto">
              {t(
                'rayhanah.pregnancyMessage',
                "May Allah grant you ease and a safe delivery. Cycle predictions are paused while you're expecting. Salat and fasting are unaffected by pregnancy alone."
              )}
            </p>
            {summary.pregnancy.dueDate && (
              <p className="text-white/70 text-xs">
                {t('rayhanah.pregnancyDueDate', 'Expected due date: {{date}}', {
                  date: formatDay(summary.pregnancy.dueDate),
                })}
              </p>
            )}
          </motion.section>
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${ARCH} border-brand-border space-y-4`}
          >
            <Medallion tone="emerald">
              <LeafIcon className="w-8 h-8" />
            </Medallion>
            <div>
              <p className="text-brand-emerald text-xs font-bold uppercase tracking-widest">
                {t('rayhanah.daysOfPurity', 'Days of purity')}
              </p>
              <h2 className="font-display text-2xl font-bold text-white mt-2 leading-tight">
                {t('rayhanah.greeting', 'Assalamu alaikum, {{name}}', {
                  name: user.displayName?.split(' ')[0] ?? t('rayhanah.sister', 'sister'),
                })}
              </h2>
            </div>
            <p className="text-white/75 text-sm leading-relaxed max-w-md mx-auto">
              {nextStartLabel ? (
                <>
                  {t(
                    'rayhanah.nextPeriodPrediction',
                    'Based on your history, your next period is expected around'
                  )}{' '}
                  <span className="text-brand-pink font-bold">{nextStartLabel}</span>{' '}
                  {t('rayhanah.avgCycleNote', '(avg cycle {{days, number}} days).', {
                    days: summary?.prediction.avgCycleDays ?? 0,
                  })}
                </>
              ) : (
                t(
                  'rayhanah.firstCycleNote',
                  'Log your first cycle and Rayhanah will learn your rhythm to predict the next one.'
                )
              )}
            </p>
            {pmsAlert && (
              <div className="rounded-control bg-brand-gold/10 border border-brand-gold/40 p-3 text-left text-xs leading-relaxed">
                <p className="font-bold text-brand-gold flex items-center gap-1.5">
                  <FlowerIcon className="w-4 h-4 shrink-0" />
                  {daysUntilNext === 0
                    ? t('rayhanah.pmsToday', 'Your period may start today')
                    : daysUntilNext === 1
                      ? t('rayhanah.pmsTomorrow', 'Your period may start tomorrow')
                      : t(
                          'rayhanah.pmsCountdown',
                          '~{{days, number}} days until your expected period',
                          { days: daysUntilNext }
                        )}
                </p>
                <p className="text-white/75 mt-1">
                  {t(
                    'rayhanah.pmsSymptomNote',
                    'You may notice PMS symptoms. Be gentle with yourself; extra dhikr and rest are your friends.'
                  )}
                </p>
              </div>
            )}
            {summary?.prediction?.nextStart &&
              (summary?.prediction?.basedOnCycles ?? 0) > 0 &&
              !pmsAlert && (
                <div className="rounded-control bg-brand-info/10 border border-brand-info/40 p-3 text-left text-xs leading-relaxed">
                  <p className="font-bold text-brand-info flex items-center gap-1.5">
                    <LeafIcon className="w-4 h-4 shrink-0" />
                    {t('rayhanah.fertileWindowEstimate', 'Fertile window estimate')}
                  </p>
                  <p className="text-white/75 mt-1">
                    ~{formatDay(shiftStr(summary.prediction.nextStart, -16))} –{' '}
                    {formatDay(shiftStr(summary.prediction.nextStart, -12))}
                    <span className="text-white/70">
                      {' '}
                      ·{' '}
                      {t('rayhanah.ovulationApprox', 'ovulation ~{{date}}', {
                        date: formatDay(shiftStr(summary.prediction.nextStart, -14)),
                      })}
                    </span>
                  </p>
                </div>
              )}
            <button
              className={`${BTN_PINK} w-full h-12 text-base`}
              onClick={() => {
                setStartDate(today);
                setStartType('hayd');
                setStartOpen(true);
              }}
            >
              <FlowerIcon className="w-5 h-5" />
              {t('rayhanah.myPeriodStarted', 'My period started')}
            </button>
          </motion.section>
        )}

        {/* ── Garden of Light (only during excused days) ────────────────────── */}
        {active && (
          <RayhanahGarden garden={garden} gardenDone={gardenDone} toggleGarden={toggleGarden} />
        )}

        {/* ── How are you today? (private wellness note) ────────────────────── */}
        {active && (
          <section className={`${CARD} p-5 space-y-4`}>
            <div className="flex items-start justify-between gap-2">
              <h2 className={SECTION_TITLE}>
                <HeartIcon className="w-5 h-5 text-brand-pink" />
                {viewDay === today
                  ? t('rayhanah.howAreYouToday', 'How are you today?')
                  : t('rayhanah.editingDay', '{{date}}', { date: formatDay(viewDay) })}
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] text-white/70 mt-1">
                <LockClosedIcon className="w-3 h-3" />
                {t('rayhanah.privateNote', 'private, only you can see this')}
              </span>
            </div>

            {/* Day navigation, only during an active period */}
            <div className="flex items-center gap-2 rounded-control border border-brand-border bg-brand-surface/50 p-1">
              <button
                aria-label={t('rayhanah.dayNavBack', 'Previous day')}
                disabled={viewDay <= active.startDate}
                onClick={() => setViewDay((d) => shiftStr(d, -1))}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-brand-deep disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="flex-1 text-center text-xs text-white/80 font-bold">
                {viewDay === today ? t('common.today', 'Today') : formatDay(viewDay)}
              </span>
              <button
                aria-label={t('rayhanah.dayNavForward', 'Next day')}
                disabled={viewDay >= today}
                onClick={() => setViewDay((d) => shiftStr(d, 1))}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-brand-deep disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
              {viewDay !== today && (
                <button
                  onClick={() => setViewDay(today)}
                  className="text-[11px] text-brand-pink font-bold px-2 py-1 rounded-lg hover:bg-brand-pink/10 transition-colors"
                >
                  {t('rayhanah.backToToday', 'Back to today')}
                </button>
              )}
            </div>

            {viewDay !== today && (
              <p className="text-white/70 text-[11px] leading-relaxed">
                {t('rayhanah.editingDayNote', 'Editing {{date}}: changes are saved immediately.', {
                  date: formatDay(viewDay),
                })}
              </p>
            )}

            <div>
              <p className={LABEL}>
                {t('rayhanah.flowLabel', 'Flow')}{' '}
                <span className="normal-case font-normal text-white/60">
                  · {t('rayhanah.pickOne', 'pick one')}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {FLOW_OPTIONS.map((f) => {
                  const on = viewDayNote?.flow === f.id;
                  return (
                    <button
                      key={f.id}
                      aria-pressed={on}
                      className={`${CHIP} ${on ? CHIP_PINK : CHIP_IDLE}`}
                      onClick={() => setFlow(f.id)}
                    >
                      <FlowDrops level={f.drops} className="text-brand-pink" />
                      {t(`rayhanah.flow.${f.id}`, f.label)}
                      {on && <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className={LABEL}>
                {t('rayhanah.bodyLabel', 'Body')}{' '}
                <span className="normal-case font-normal text-white/60">
                  · {t('rayhanah.pickAnyThatFit', 'pick any that fit')}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SYMPTOM_OPTIONS.map((sy) => {
                  const on = !!viewDayNote?.symptoms?.includes(sy.id);
                  return (
                    <button
                      key={sy.id}
                      aria-pressed={on}
                      className={`${CHIP} ${on ? CHIP_PINK : CHIP_IDLE}`}
                      onClick={() => toggleSymptom(sy.id)}
                    >
                      {on && <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                      {t(`rayhanah.symptom.${sy.id}`, sy.label)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className={LABEL}>
                {t('rayhanah.heartLabel', 'Heart')}{' '}
                <span className="normal-case font-normal text-white/60">
                  · {t('rayhanah.pickAnyThatFit', 'pick any that fit')}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MOOD_OPTIONS.map((mo) => {
                  const on = !!viewDayNote?.moods?.includes(mo.id);
                  return (
                    <button
                      key={mo.id}
                      aria-pressed={on}
                      className={`${CHIP} ${on ? CHIP_INFO : CHIP_IDLE}`}
                      onClick={() => toggleMood(mo.id)}
                    >
                      {on && <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                      {t(`rayhanah.mood.${mo.id}`, mo.label)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* A gentle fixed line for the feelings she named (today only). On-device only: no cycle data goes to any AI. */}
            {viewDay === today && <MoodComfort moods={todayNote?.moods ?? []} />}

            {(viewDayNote?.symptoms?.length ?? 0) > 0 && (
              <p className="text-brand-pink text-xs leading-relaxed border-t border-brand-border pt-3">
                {t(
                  'rayhanah.easeHadith',
                  'May Allah give you ease. No fatigue or pain touches a Muslim except that Allah wipes away sins with it'
                )}{' '}
                (<Ref href="https://sunnah.com/bukhari:5641" label="Bukhārī 5641" />
                ).
              </p>
            )}
          </section>
        )}

        {/* ── Du'a & adhkar for excused days ────────────────────────────── */}
        {active && <RayhanahAdhkar />}

        {/* ── Fasting makeup summary ─────────────────────────────────────────
            Gated on qadaRemaining (not qadaOwed, which is the lifetime total)
            so the card disappears once every owed fast is made up, instead of
            leaving a stale "0 remaining" reminder around forever. */}
        {qadaRemaining > 0 && (
          <RayhanahFastingMakeup
            qadaOwed={qadaOwed}
            qadaCompleted={qadaCompleted}
            qadaRemaining={qadaRemaining}
            showRamadanQadaWarning={showRamadanQadaWarning}
            ramadanWindow={ramadanWindow}
          />
        )}

        {/* ── "I'm not done yet": ABOVE the calendar so it's the first thing
               she sees after ending too early (Istiak's spec) ── */}
        {lastEnded && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${CARD} border-brand-pink/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-brand-pink text-sm font-bold">
                {t('rayhanah.endedTooEarly', 'Ended too early?')}
              </p>
              <p className="text-white/75 text-xs mt-0.5 leading-relaxed">
                {t(
                  'rayhanah.endedTooEarlyDesc',
                  'If the flow returned after you marked {{date}} as the end, you can reopen that cycle. All your daily notes stay exactly where they are.',
                  { date: formatDay(lastEnded.endDate!) }
                )}
              </p>
            </div>
            <button
              className={`${BTN_PINK} shrink-0`}
              disabled={editCycle.isPending}
              onClick={() =>
                editCycle.mutate(
                  { logId: lastEnded._id, endDate: null },
                  {
                    onSuccess: () =>
                      toast.success(
                        t('rayhanah.cycleReopenedToast', 'Cycle reopened. Take your time.'),
                        { id: 'cycle-reopen' }
                      ),
                  }
                )
              }
            >
              {t('rayhanah.notDoneYet', "I'm not done yet")}
            </button>
          </motion.section>
        )}

        {/* ── Cycle calendar + stats ────────────────────────────────────────── */}
        {summary && <CycleCalendar summary={summary} today={today} />}

        {/* ── Sharing + pregnancy + privacy ──────────────────────────────────── */}
        <section className={`${CARD} p-5 space-y-4`}>
          {/* ── Partner sync: opt-in, revocable, status-only ── */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-bold text-sm flex items-center gap-1.5">
                  <UserGroupIcon className="w-4 h-4 text-brand-pink" />
                  {t('rayhanah.partnerSyncTitle', 'Share cycle status')}
                </p>
                <p className="text-white/70 text-xs leading-relaxed mt-0.5">
                  {t(
                    'rayhanah.partnerSyncDesc',
                    'One friend sees only "on her cycle" or "not", never dates, symptoms, or notes. Turn off anytime.'
                  )}
                </p>
              </div>
              <Switch
                aria-label={t('rayhanah.partnerSyncTitle', 'Share cycle status')}
                tone="pink"
                size="sm"
                checked={summary?.partnerSync?.enabled ?? false}
                disabled={partnerSync.isPending}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPartnerPickerOpen(true);
                  } else {
                    partnerSync.mutate({ enabled: false });
                    setPartnerPickerOpen(false);
                  }
                }}
              />
            </div>

            {summary?.partnerSync?.enabled && summary.partnerSync?.partnerUid && (
              <p className="text-brand-emerald text-xs mt-2">
                {t('rayhanah.sharingWith', 'Currently sharing with {{name}}', {
                  name:
                    friends?.find((f) => f.uid === summary.partnerSync?.partnerUid)?.displayName ??
                    t('rayhanah.aFriend', 'a friend'),
                })}
              </p>
            )}

            {partnerPickerOpen && !summary?.partnerSync?.enabled && (
              <div className="mt-2 space-y-1.5">
                {!friends?.length ? (
                  <p className="text-white/70 text-xs">
                    {t(
                      'rayhanah.partnerSyncNoFriends',
                      'Connect with a friend on the Friends page first, then come back here.'
                    )}
                  </p>
                ) : (
                  friends.map((f) => (
                    <button
                      key={f.uid}
                      className="w-full flex items-center gap-2 rounded-control border border-brand-border bg-brand-surface/50 hover:border-brand-pink/40 px-3 py-2 text-xs text-white/85 text-left transition-colors"
                      onClick={() => {
                        partnerSync.mutate({ enabled: true, partnerUid: f.uid });
                        setPartnerPickerOpen(false);
                      }}
                    >
                      <UserCircleIcon className="w-4 h-4 shrink-0 text-white/70" />
                      <span className="truncate">{f.displayName}</span>
                    </button>
                  ))
                )}
                <button
                  className="text-white/70 text-xs hover:text-white"
                  onClick={() => setPartnerPickerOpen(false)}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            )}
          </div>

          {/* ── Pregnancy: pauses hayd predictions only; salat/fasting unaffected ── */}
          <div className="pt-4 border-t border-brand-border">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-bold text-sm flex items-center gap-1.5">
                  <HeartIcon className="w-4 h-4 text-brand-emerald" />
                  {t('rayhanah.pregnancyToggleTitle', "I'm currently pregnant")}
                </p>
                <p className="text-white/70 text-xs leading-relaxed mt-0.5">
                  {t(
                    'rayhanah.pregnancyToggleDesc',
                    'Pauses period predictions and shows a week count instead. Does not change your salat or fasting tracking.'
                  )}
                </p>
              </div>
              <Switch
                aria-label={t('rayhanah.pregnancyToggleTitle', "I'm currently pregnant")}
                size="sm"
                checked={summary?.pregnancy?.active ?? false}
                disabled={setPregnancy.isPending}
                onChange={(e) => {
                  if (e.target.checked) {
                    setDueDateInput(summary?.pregnancy.dueDate ?? '');
                    setPregnancyFormOpen(true);
                  } else {
                    setPregnancy.mutate({ active: false });
                    setPregnancyFormOpen(false);
                  }
                }}
              />
            </div>

            {pregnancyFormOpen && !summary?.pregnancy?.active && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="date"
                  aria-label={t('rayhanah.pregnancyDueDateLabel', 'Expected due date')}
                  className="input input-sm rounded-control bg-brand-surface/50 border-brand-border text-white flex-1"
                  value={dueDateInput}
                  onChange={(e) => setDueDateInput(e.target.value)}
                />
                <button
                  className={`${BTN_PRIMARY} py-1.5`}
                  disabled={!dueDateInput || setPregnancy.isPending}
                  onClick={() => {
                    setPregnancy.mutate({ active: true, dueDate: dueDateInput });
                    setPregnancyFormOpen(false);
                  }}
                >
                  {t('rayhanah.pregnancySave', 'Save')}
                </button>
                <button
                  className="text-white/70 text-xs hover:text-white"
                  onClick={() => setPregnancyFormOpen(false)}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            )}
            {!pregnancyFormOpen && summary?.pregnancy?.active && summary.pregnancy.dueDate && (
              <p className="text-brand-emerald text-xs mt-2">
                {t('rayhanah.pregnancyDueDate', 'Expected due date: {{date}}', {
                  date: formatDay(summary.pregnancy.dueDate),
                })}
              </p>
            )}
          </div>

          <p className="text-white/70 text-[11px] leading-relaxed border-t border-brand-border pt-4 flex gap-2">
            <LockClosedIcon className="w-4 h-4 shrink-0 text-brand-emerald" />
            <span>
              {t(
                'rayhanah.privacyNote',
                'Your cycle data is visible only to you. It is never shown to friends, unless you choose to share a simple yes or no with one friend. In your friends’ circle your Noor simply flows from the dhikr, Quran and ṣalawāt you do, like any other day.'
              )}
            </span>
          </p>
        </section>

        {/* ── What changes / what stays (education) ─────────────────────────── */}
        <RayhanahFiqhCompanion />
      </div>

      <RayhanahSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Dialogs are portaled: AnimatedBackground wraps pages in `relative z-10`,
          which kept them under the sticky navbar. */}
      {createPortal(
        <>
          {/* ── Start modal ──────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {startOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={BACKDROP}
                onClick={() => setStartOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 10 }}
                  className={`${DIALOG} border-brand-pink/40`}
                  role="dialog"
                  aria-label={t('rayhanah.logTheStart', 'Log the start')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="font-display text-white font-bold text-xl flex items-center gap-2">
                    <FlowerIcon className="w-6 h-6 text-brand-pink" />
                    {t('rayhanah.logTheStart', 'Log the start')}
                  </h3>
                  <div>
                    <label className="text-white/75 text-xs font-bold" htmlFor="cycle-start-date">
                      {t('rayhanah.startDate', 'Start date')}
                    </label>
                    <input
                      id="cycle-start-date"
                      type="date"
                      value={startDate}
                      max={today}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input input-bordered w-full mt-1 rounded-control bg-brand-surface/50 border-brand-border text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    {(['hayd', 'nifas'] as const).map((item) => (
                      <button
                        key={item}
                        aria-pressed={startType === item}
                        className={`flex-1 justify-center ${CHIP} rounded-control py-2 ${startType === item ? CHIP_PINK : CHIP_IDLE}`}
                        onClick={() => setStartType(item)}
                      >
                        {item === 'hayd'
                          ? t('rayhanah.periodHayd', 'Period (hayd)')
                          : t('rayhanah.postNatal', 'Post-natal (nifās)')}
                      </button>
                    ))}
                  </div>
                  <button
                    className={`${BTN_PRIMARY} w-full`}
                    disabled={startCycle.isPending}
                    onClick={() =>
                      startCycle.mutate(
                        { date: startDate, type: startType },
                        {
                          onSuccess: () => setStartOpen(false),
                          // Saved on the device; it syncs when back online.
                          onError: (e) => {
                            if (e instanceof OfflineQueuedError) setStartOpen(false);
                          },
                        }
                      )
                    }
                  >
                    {startCycle.isPending ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      t('rayhanah.beginRayhanahDays', 'Begin Rayhanah days')
                    )}
                  </button>
                  <p className="text-white/70 text-[11px] text-center leading-relaxed">
                    {t(
                      'rayhanah.startModalFooter',
                      'Salat and fasting pause automatically. Your Noor continues from dhikr, Quran and ṣalawāt.'
                    )}
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Ghusl modal ─────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {ghuslOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={BACKDROP}
              >
                <motion.div
                  initial={{ scale: 0.95, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 10 }}
                  className={`${DIALOG} border-brand-emerald/40 max-h-[85vh] overflow-y-auto`}
                  role="dialog"
                  aria-label={t('rayhanah.welcomeBackToSalat', 'Welcome back to salat')}
                >
                  <h3 className="font-display text-white font-bold text-xl flex items-center gap-2">
                    <DropIcon className="w-6 h-6 text-brand-emerald" />
                    {t('rayhanah.welcomeBackToSalat', 'Welcome back to salat')}
                  </h3>
                  <p className={NOTE}>
                    {t('rayhanah.performGhuslIntro', 'Perform ghusl the way the Prophet ﷺ did')} (
                    <Ref href="https://sunnah.com/bukhari:248" label="Bukhārī 248" />
                    ):
                  </p>
                  <div className="space-y-1.5">
                    {GHUSL_STEPS.map((step, i) => (
                      <button
                        key={step}
                        aria-pressed={!!ghuslChecked[i]}
                        className="w-full flex items-start gap-3 rounded-control border border-brand-border bg-brand-surface/50 px-3 py-2.5 text-left"
                        onClick={() => setGhuslChecked((c) => c.map((v, j) => (j === i ? !v : v)))}
                      >
                        <span
                          className={`w-6 h-6 rounded-full grid place-items-center border text-[11px] font-bold flex-shrink-0 ${ghuslChecked[i] ? 'bg-brand-emerald-dim border-brand-emerald-dim text-on-color' : 'border-brand-border text-white/70'}`}
                        >
                          {ghuslChecked[i] ? (
                            <CheckIcon className="w-3.5 h-3.5" />
                          ) : (
                            formatLocaleNumber(i + 1)
                          )}
                        </span>
                        <span
                          className={`text-xs leading-relaxed ${ghuslChecked[i] ? 'text-white/60 line-through' : 'text-white/85'}`}
                        >
                          {t(`rayhanah.ghuslStep${i}`, step)}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-brand-emerald text-xs leading-relaxed">
                    {t(
                      'rayhanah.prayCurrentTime',
                      "Then pray the ṣalāt of the time you're now in. There are no past prayers to make up"
                    )}{' '}
                    (<Ref href="https://sunnah.com/muslim:335" label="Muslim 335" />
                    ). {t('rayhanah.welcomeBackShort', 'Welcome back')}
                  </p>
                  <button
                    className={`${BTN_PRIMARY} w-full`}
                    onClick={() => {
                      setGhuslOpen(false);
                      celebrateSmall();
                    }}
                  >
                    {t('rayhanah.alhamdulillah', 'Alhamdulillah')}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Ramadan qada prompt ─────────────────────────────────────────────── */}
          <AnimatePresence>
            {qadaPrompt && !ghuslOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={BACKDROP}
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className={`${DIALOG} border-brand-gold/40`}
                  role="dialog"
                  aria-label={t('rayhanah.ramadanDaysToMakeUp', 'Ramadan days to make up')}
                >
                  <h3 className="font-display text-white font-bold text-xl flex items-center gap-2">
                    <CrescentIcon className="w-6 h-6 text-brand-gold" />
                    {t('rayhanah.ramadanDaysToMakeUp', 'Ramadan days to make up')}
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {t(
                      'rayhanah.qadaPromptCount',
                      '{{count, number}} day(s) of this cycle fell in Ramadan.',
                      { count: qadaPrompt.days }
                    )}{' '}
                    {t('rayhanah.missedFastsMadeUp', 'Missed Ramadan fasts are made up after')} (
                    <Ref href="https://sunnah.com/muslim:335" label="Muslim 335" />
                    ).{' '}
                    {qadaPrompt.days > 1
                      ? t('rayhanah.addThemToQada', 'Add them to your qaḍā counter?')
                      : t('rayhanah.addItToQada', 'Add it to your qaḍā counter?')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className={`${BTN_SECONDARY} flex-1`}
                      onClick={() => setQadaPrompt(null)}
                    >
                      {t('rayhanah.notNow', 'Not now')}
                    </button>
                    <button
                      className={`${BTN_PRIMARY} flex-1`}
                      disabled={updateFastingProfile.isPending}
                      onClick={addQada}
                    >
                      <CheckIcon className="w-4 h-4" />
                      {t('rayhanah.addToQada', 'Add to qaḍā')}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </AnimatedBackground>
  );
}
