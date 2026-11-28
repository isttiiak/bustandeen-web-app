import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/useAuthStore.js';
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
  type EndMark,
  type StartMark,
} from '../../hooks/useCycle.js';
import { useFriendsList } from '../../hooks/useSocial.js';
import { useFastingSummary, useUpdateFastingProfile } from '../../hooks/useFasting.js';
import { getTrackingDay } from '../../utils/trackingDay.js';
import { addDaysYmd } from '../../utils/placeClock.js';
import { getRamadanWindow } from '../../utils/ramadan.js';
import { celebrateSmall } from '../../utils/celebrate.js';
import { OfflineQueuedError } from '../../utils/syncOutbox.js';
import { GHUSL_STEPS, formatDay, daysBetween, ramadanDaysIn } from './rayhanahShared.js';

/** The Rayhanah Cycle screen's state: the summary, the day notes, the dialogs and every handler. */
export function useRayhanahPage() {
  const { t } = useTranslation();
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
  // Before or after which prayer it started (the start dialog asks)
  const [startMark, setStartMark] = useState<StartMark | null>(null);
  // The end dialog: which day, and before or after which prayer it stopped
  const [endOpen, setEndOpen] = useState(false);
  const [endOn, setEndOn] = useState<'today' | 'yesterday'>('today');
  const [endMark, setEndMark] = useState<EndMark | null>(null);
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

  // A fresh question each time the start dialog opens
  useEffect(() => {
    if (startOpen) setStartMark(null);
  }, [startOpen]);

  const openEnd = () => {
    setEndOn('today');
    setEndMark(null);
    setEndOpen(true);
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
    const date = endOn === 'yesterday' ? addDaysYmd(today, -1) : today;
    const done = () => {
      setEndOpen(false);
      afterEnd();
    };
    endCycle.mutate(
      { date, ...(endMark ? { endMark } : {}) },
      {
        onSuccess: done,
        onError: (e) => {
          if (e instanceof OfflineQueuedError) done();
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
  // The expected start has passed and no period is logged: say so, instead of showing a
  // past date as "expected" with a fertile window that has also passed.
  const predictionPassed = daysUntilNext !== null && daysUntilNext < 0;

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

  return {
    user,
    isFemale,
    today,
    summary,
    isLoading,
    isError,
    refetch,
    active,
    predictionPassed,
    todayNote,
    viewDay,
    setViewDay,
    viewDayNote,
    garden,
    gardenDone,
    toggleGarden,
    lastEnded,
    setFlow,
    toggleSymptom,
    toggleMood,
    handleEndConfirmed,
    addQada,
    nextStartLabel,
    daysUntilNext,
    pmsAlert,
    qadaOwed,
    qadaCompleted,
    qadaRemaining,
    ramadanWindow,
    showRamadanQadaWarning,
    startCycle,
    endCycle,
    updateFastingProfile,
    partnerSync,
    setPregnancy,
    editCycle,
    partnerPickerOpen,
    setPartnerPickerOpen,
    friends,
    pregnancyFormOpen,
    setPregnancyFormOpen,
    dueDateInput,
    setDueDateInput,
    startOpen,
    setStartOpen,
    startDate,
    setStartDate,
    startType,
    setStartType,
    startMark,
    setStartMark,
    endOpen,
    setEndOpen,
    endOn,
    setEndOn,
    endMark,
    setEndMark,
    openEnd,
    ghuslOpen,
    setGhuslOpen,
    ghuslChecked,
    setGhuslChecked,
    qadaPrompt,
    setQadaPrompt,
    settingsOpen,
    setSettingsOpen,
  };
}

export type RayhanahPage = ReturnType<typeof useRayhanahPage>;
