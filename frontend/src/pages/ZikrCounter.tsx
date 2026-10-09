import React, { useCallback, useEffect, useRef, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router';
import { parseTarget } from '../utils/zikrQuick.js';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import toast from 'react-hot-toast';
import { unsyncedCounts, useZikrStore } from '../store/useZikrStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useUiStore } from '../store/useUiStore.js';
import { useZikrTypes, useDeleteZikrType } from '../hooks/useZikrTypes.js';
import { useAnalytics } from '../hooks/useAnalytics.js';
import AnimatedBackground from '../components/AnimatedBackground.js';
import ConfirmDialog from '../components/ConfirmDialog.js';
import TabNav from '../components/TabNav.js';
import { StreakBadge, GoalBadge } from '../components/StatusBadges.js';
import { celebrateGoal } from '../utils/celebrate.js';
import { getHiddenZikr, hideZikr } from '../utils/hiddenZikr.js';
import { playZikrClick } from '../utils/zikrClickSound.js';
import {
  PREDEFINED_TYPES,
  findLibraryZikr,
  isCoreZikr,
  zikrDisplayName,
} from '../utils/zikrLibrary.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import EditZikrModal from '../components/EditZikrModal.js';
import ZikrSettings from '../components/ZikrSettings.js';
import ZikrRequestApprovedNotice from '../components/ZikrRequestApprovedNotice.js';
import Seo from '../components/Seo.js';
import { useZikrAudio } from '../hooks/useZikrAudio.js';
import {
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  SpeakerWaveIcon,
  CheckIcon,
  LockClosedIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { LeafIcon, TasbihIcon } from '../components/icons/IslamicIcons.js';
import { DEFAULT_MEANINGS } from '../components/zikr/zikrCounterData.js';
import ZikrManageListSheet from '../components/zikr/ZikrManageListSheet.js';
import ZikrGuestDialog from '../components/zikr/ZikrGuestDialog.js';
import ZikrAddCustomModal from '../components/zikr/ZikrAddCustomModal.js';
import ZikrSetCountModal from '../components/zikr/ZikrSetCountModal.js';
import ZikrFocusOverlay from '../components/zikr/ZikrFocusOverlay.js';
import ZikrAutoPlayControls from '../components/zikr/ZikrAutoPlayControls.js';
import ZikrReferencePanel from '../components/zikr/ZikrReferencePanel.js';

export default function ZikrCounter() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const {
    types,
    selected,
    counts,
    pending,
    inflight,
    isFlushing,
    customMeanings,
    selectType,
    increment,
    decrement,
    reset,
    scheduleFlush,
    setTypes,
    removeType,
    addCounts,
  } = useZikrStore();
  const reduceMotion = useUiStore((s) => s.reduceMotion);
  const vibrationEnabled = useUiStore((s) => s.vibrationEnabled);
  const zikrSoundEnabled = useUiStore((s) => s.zikrSoundEnabled);
  // A Home quick chip opens /zikr?type=…&target=N: that dhikr with N as a
  // session-only tasbih target (the saved tasbih settings are left alone).
  const [searchParams] = useSearchParams();
  const linkType = searchParams.get('type');
  const linkTarget = parseTarget(searchParams.get('target'));
  const tasbihMode = useUiStore((s) => s.tasbihMode) || linkTarget !== null;
  const tasbihTarget = useUiStore((s) => linkTarget ?? s.tasbihTarget);
  const zikrAudioEnabled = useUiStore((s) => s.zikrAudioEnabled);
  const zikrAudioVolume = useUiStore((s) => s.zikrAudioVolume);
  const zikrPlayOnTap = useUiStore((s) => s.zikrPlayOnTap);
  const setZikrAudioVolume = useUiStore((s) => s.setZikrAudioVolume);
  const audio = useZikrAudio(selected);
  const { hasAudio: selectedHasAudio, playOnTap: playAudioOnTap } = audio;
  const [showAutoPlay, setShowAutoPlay] = useState(false);
  const [autoPlayTarget, setAutoPlayTarget] = useState('50');
  const [hiddenTypes, setHiddenTypes] = useState<string[]>(getHiddenZikr);
  const { data: fetchedTypes } = useZikrTypes();
  const deleteZikrType = useDeleteZikrType();
  const { data: analyticsData } = useAnalytics(1);

  useEffect(() => {
    if (linkType && types.includes(linkType)) selectType(linkType);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link; types arrive after merge
  }, [linkType, types.includes(linkType ?? '')]);

  const currentCount = counts?.[selected] ?? 0;
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editZikr, setEditZikr] = useState<string | null>(null);
  const [showSetCount, setShowSetCount] = useState(false);
  const [setCountValue, setSetCountValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [refExpanded, setRefExpanded] = useState(false);

  // Collapse the full-text card when switching dhikr
  useEffect(() => {
    setRefExpanded(false);
  }, [selected]);

  // Real-time goal progress:
  // confirmedTotal = what the server last told us (stale until RQ refetch).
  // localTodayTotal = what Zustand has locally (increments immediately on tap).
  // pendingTotal = what hasn't been synced yet.
  // We show max(local, confirmed) so the counter never appears to go backwards.
  const confirmedTotal = analyticsData?.today?.total ?? 0;
  const localTodayTotal = Object.values(counts ?? {}).reduce((a, b) => a + b, 0);
  const pendingTotal = Object.values(unsyncedCounts({ pending: pending ?? {}, inflight })).reduce(
    (a, b) => a + b,
    0
  );
  const effectiveTotal = Math.max(localTodayTotal, confirmedTotal + pendingTotal);

  const dailyGoal = analyticsData?.goal?.dailyTarget ?? null;
  const streakCount = analyticsData?.streak?.currentStreak ?? null;
  const goalProgress = dailyGoal
    ? Math.min(100, Math.round((effectiveTotal / dailyGoal) * 100))
    : null;
  const goalMet = dailyGoal !== null ? effectiveTotal >= dailyGoal : false;

  // After a flush completes, invalidate the analytics cache so the server total catches up
  const wasFlushingRef = useRef(false);
  useEffect(() => {
    if (wasFlushingRef.current && !isFlushing) {
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }
    wasFlushingRef.current = isFlushing;
  }, [isFlushing, queryClient]);

  // Confetti the moment the daily goal is crossed (false → true transition)
  const wasGoalMetRef = useRef(goalMet);
  useEffect(() => {
    if (!wasGoalMetRef.current && goalMet && dailyGoal !== null) celebrateGoal();
    wasGoalMetRef.current = goalMet;
  }, [goalMet, dailyGoal]);

  // Guest: warn before tab close if they have unsaved counts
  useEffect(() => {
    if (user) return; // only for guests
    const totalPending = Object.values(pending ?? {}).reduce((a, b) => a + b, 0);
    if (totalPending === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [user, pending]);

  // Escape key closes full-screen mode
  useEffect(() => {
    if (!fullScreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') setFullScreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fullScreen]);

  // Browsers handle Escape specially for the Fullscreen API — they exit
  // native fullscreen directly at the browser-chrome level and don't
  // reliably deliver it to the page as a keydown, so the handler above can
  // miss it. Without this, our overlay state stays stuck "open" (native
  // fullscreen already gone, custom overlay still covering the screen)
  // until the user manually taps its own close button. `fullscreenchange`
  // fires for every exit path, so it's the reliable source of truth.
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setFullScreen(false);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Lower navbar z-index while in full-screen so the portal overlay covers it
  // + request browser fullscreen API for truly immersive mode
  useEffect(() => {
    const navbar = document.querySelector<HTMLElement>('nav');
    if (fullScreen) {
      if (navbar) navbar.style.zIndex = '0';
      document.body.style.overflow = 'hidden';
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      if (navbar) navbar.style.zIndex = '';
      document.body.style.overflow = '';
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }
    return () => {
      if (navbar) navbar.style.zIndex = '';
      document.body.style.overflow = '';
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [fullScreen]);

  // Resolve the COMPACT card display: built-in → library (short form) → custom
  const libItem = findLibraryZikr(selected);
  const defaultMeaning = DEFAULT_MEANINGS[selected];
  const meaning = defaultMeaning
    ? {
        arabic: defaultMeaning.arabic,
        transliteration: t(defaultMeaning.translitKey, defaultMeaning.translitFallback),
        meaning: t(defaultMeaning.meaningKey, defaultMeaning.meaningFallback),
      }
    : libItem
      ? {
          arabic: libItem.shortArabic ?? libItem.arabic,
          transliteration: libItem.transliteration ?? '',
          meaning:
            i18n.language === 'bn' && libItem.meaningBn
              ? libItem.meaningBn
              : (libItem.shortMeaning ?? libItem.meaning),
        }
      : customMeanings[selected]
        ? {
            arabic: customMeanings[selected].arabic ?? '',
            transliteration: customMeanings[selected].transliteration ?? '',
            meaning: customMeanings[selected].meaning,
          }
        : null;

  // Merge predefined + server types into local store
  useEffect(() => {
    const serverNames = (fetchedTypes ?? []).map((item) => item.name).filter(Boolean);
    // Deleted names (hiddenTypes) must never re-appear even though they live in
    // the predefined/server lists — EXCEPT the core dhikr, which the salat
    // tracker writes into. Anyone who hid one before it became core gets it
    // back here, otherwise their tasbīḥ taps would post to a missing counter.
    const hidden = new Set(hiddenTypes);
    // Once the server list has loaded it is authoritative for non-built-in
    // names: a custom type removed on another device must drop out of this
    // device's persisted list too, instead of being re-added by the union.
    const serverLower = fetchedTypes ? new Set(serverNames.map((n) => n.toLowerCase())) : null;
    const builtInLower = new Set(PREDEFINED_TYPES.map((n) => n.toLowerCase()));
    const localKept = serverLower
      ? types.filter((n) => builtInLower.has(n.toLowerCase()) || serverLower.has(n.toLowerCase()))
      : types;
    const merged = [...new Set([...PREDEFINED_TYPES, ...serverNames, ...localKept])].filter(
      (name) => !hidden.has(name) || isCoreZikr(name)
    );
    if (merged.length !== types.length || merged.some((name, i) => name !== types[i])) {
      setTypes(merged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [fetchedTypes?.map((item) => item.name).join('|'), hiddenTypes]);

  // Tasbih mode: a SESSION-scoped countdown, independent of the dhikr's
  // lifetime total. `segmentStart` is the lifetime count at the moment the
  // current segment began — "done so far" is always currentCount minus this,
  // so it survives re-renders without its own running counter. Reset
  // whenever tasbih mode turns on, the dhikr changes, or the target changes.
  const [segmentStart, setSegmentStart] = useState<number | null>(null);
  useEffect(() => {
    if (tasbihMode) setSegmentStart(currentCount);
    else setSegmentStart(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately NOT reacting to currentCount (would reset the segment on every tap); only these three should start a fresh segment
  }, [tasbihMode, selected, tasbihTarget]);

  const tasbihDoneInSegment = segmentStart === null ? 0 : currentCount - segmentStart;
  const tasbihRemaining =
    segmentStart === null ? null : Math.max(0, tasbihTarget - tasbihDoneInSegment);

  const onIncrement = useCallback(() => {
    increment();
    scheduleFlush();
    if (zikrSoundEnabled) playZikrClick();
    // Opt-in "play on every tap": plays this dhikr's clip, never cutting off
    // one that is still playing (see useZikrAudio.playOnTap).
    if (zikrAudioEnabled && zikrPlayOnTap && selectedHasAudio) playAudioOnTap();

    if (tasbihMode && segmentStart !== null) {
      const doneAfter = currentCount + 1 - segmentStart;
      if (doneAfter >= tasbihTarget) {
        // Segment complete — the one moment tasbih mode needs feedback loud
        // enough to notice without looking (this REPLACES the plain-tap
        // pulse below for this tap, not on top of it).
        if (vibrationEnabled && 'vibrate' in navigator) {
          navigator.vibrate([60, 80, 60, 80, 250]);
        }
        celebrateGoal();
        toast.success(
          t('zikr.tasbihSetComplete', '{{count}} done, set complete', { count: tasbihTarget }),
          {
            icon: <TasbihIcon className="w-4 h-4 shrink-0 text-brand-emerald" />,
            duration: 2600,
          }
        );
        setSegmentStart(currentCount + 1);
      } else if (vibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } else if (vibrationEnabled && 'vibrate' in navigator) {
      // Haptic pulse on supported mobile browsers — a plain short pulse on
      // every tap, and a distinct, longer pattern at each 33/66/99 lifetime
      // milestone so an eyes-free user can feel their overall progress.
      // Skipped in tasbih mode above — the segment-complete pulse takes over
      // as the meaningful milestone there instead.
      const newCount = currentCount + 1;
      if (newCount % 99 === 0) navigator.vibrate([20, 50, 20, 50, 20, 50, 30]);
      else if (newCount % 66 === 0) navigator.vibrate([15, 40, 15, 40, 15]);
      else if (newCount % 33 === 0) navigator.vibrate([15, 40, 15]);
      else navigator.vibrate(10);
    }
  }, [
    increment,
    scheduleFlush,
    zikrSoundEnabled,
    zikrAudioEnabled,
    zikrPlayOnTap,
    selectedHasAudio,
    playAudioOnTap,
    vibrationEnabled,
    tasbihMode,
    segmentStart,
    tasbihTarget,
    currentCount,
    t,
  ]);

  // Decrements must flush too — they queue a negative pending delta so the
  // minus button reaches the database, not just the local count.
  const onDecrement = useCallback(() => {
    if (currentCount > 0) {
      decrement();
      scheduleFlush();
    }
  }, [currentCount, decrement, scheduleFlush]);

  // Keyboard: Space = increment
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        onIncrement();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onIncrement]);

  const onReset = () => {
    if (currentCount === 0) return;
    toast(
      (toastObj) => (
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-ink-fixed text-sm">
            {t('zikr.resetConfirmTitle', { name: zikrDisplayName(selected, i18n.language) })}
            <br />
            <span className="text-white text-xs">{t('zikr.resetConfirmNote')}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                reset();
                toast.dismiss(toastObj.id);
                toast.success(t('zikr.counterReset'), {
                  icon: <ArrowPathIcon className="w-4 h-4 shrink-0 text-brand-emerald" />,
                  duration: 2000,
                });
              }}
              className="btn btn-sm bg-red-500 hover:bg-red-600 text-on-color border-0"
            >
              {t('zikr.resetBtn')}
            </button>
            <button onClick={() => toast.dismiss(toastObj.id)} className="btn btn-sm btn-ghost">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ),
      {
        duration: 5000,
        position: 'top-center',
        style: { background: 'white', padding: '16px', borderRadius: '12px' },
      }
    );
  };

  const submitSetCount = () => {
    const target = Number(setCountValue);
    if (!Number.isFinite(target) || target < 0 || !Number.isInteger(target)) return;
    const delta = target - currentCount;
    if (delta !== 0) {
      addCounts({ [selected]: delta });
      scheduleFlush();
    }
    toast.success(t('zikr.toast.countSet', { count: formatLocaleNumber(target) }), {
      icon: <CheckIcon className="w-4 h-4 shrink-0 text-brand-emerald" />,
      duration: 2000,
    });
    setShowSetCount(false);
    setSetCountValue('');
  };

  // Remove a zikr from MY list. Locally it's hidden immediately; if it was a
  // server-stored (custom / library-added) type we also delete it on the API.
  const handleDeleteType = (name: string) => {
    // Core dhikr are structural — the salat tracker writes counts into them.
    // The UI hides their Remove button; this closes every other path.
    if (isCoreZikr(name)) {
      toast.error(t('zikr.toast.coreLinked'), {
        icon: <LockClosedIcon className="w-4 h-4 shrink-0" />,
      });
      setConfirmDelete(null);
      return;
    }
    const isServerType = (fetchedTypes ?? []).some(
      (item) => item.name?.toLowerCase() === name.toLowerCase()
    );
    setHiddenTypes(hideZikr(name)); // durable (survives predefined re-merge)
    removeType(name);
    if (isServerType) {
      deleteZikrType.mutate(name, {
        onError: () => toast.error(t('zikr.toast.syncFailed'), { duration: 2500 }),
      });
    }
    toast.success(t('zikr.toast.removed', { name }), {
      icon: <TrashIcon className="w-4 h-4 shrink-0" />,
      duration: 2000,
    });
    setConfirmDelete(null);
  };

  // Bustan Arch controls (audit T3.2): theme radii and borders, no glows.
  const chipFrame =
    'rounded-control border border-brand-border bg-brand-deep shadow-elev-1 hover:border-brand-emerald/40 transition-colors';
  const chip = `${chipFrame} text-white/70 hover:text-white`;
  const roundBtn =
    'w-12 h-12 rounded-control border border-brand-border bg-brand-deep text-white/80 shadow-elev-1 hover:shadow-hover flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-[color,border-color,box-shadow]';

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('zikr.seoTitle', 'Zikr Counter: Digital Tasbih with Streaks & Goals')}
        description={t(
          'zikr.seoDescription',
          'Free online tasbih counter for SubhanAllah, Alhamdulillah, Allahu Akbar and custom zikr. Set daily goals, build streaks, and track your dhikr with authentic references.'
        )}
        path="/zikr"
      />
      <h1 className="sr-only">{t('zikr.pageTitle')}</h1>

      <div className="max-w-2xl mx-auto px-4 pb-10 pt-4 space-y-5">
        {/* Tab navigation + settings */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <TabNav
              items={[
                { label: t('zikr.counter'), to: '/zikr', active: true },
                {
                  label: t('zikr.analytics'),
                  to: '/zikr/analytics',
                  ...(!user && Object.values(pending ?? {}).reduce((a, b) => a + b, 0) > 0
                    ? { onClick: () => setShowGuestDialog(true) }
                    : {}),
                },
              ]}
            />
          </div>
          {user && (
            <button
              onClick={() => setShowSettings(true)}
              aria-label={t('zikr.a11y.settings')}
              title={t('zikr.a11y.settings')}
              className="shrink-0 p-2 rounded-control border border-brand-border bg-brand-deep text-white/60 hover:text-brand-emerald hover:border-brand-emerald/40 transition-colors"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        <ZikrSettings
          open={showSettings}
          onClose={() => setShowSettings(false)}
          onManageList={() => {
            setShowSettings(false);
            setShowManage(true);
          }}
        />

        <ZikrRequestApprovedNotice />

        {/* Motivational subtitle */}
        <p className="text-center text-white/60 text-sm tracking-wide">{t('zikr.motivational')}</p>

        {/* ── Type selector: name | change | + | pronunciation | focus ── */}
        <div className="flex items-center gap-2 rounded-card border border-brand-border bg-brand-deep shadow-elev-1 px-4 py-2.5">
          <TasbihIcon className="w-4 h-4 shrink-0 text-brand-emerald" aria-hidden="true" />
          <span className="font-semibold text-sm text-brand-emerald truncate min-w-0">
            {zikrDisplayName(selected, i18n.language)}
          </span>

          {/* Change zikr type: icon-only caret button. The native <select>
              stays for accessibility/keyboard support; its own text is
              invisible (text-transparent) and a caret is overlaid, so tapping
              anywhere on the chip opens the type list. */}
          <div className="relative flex-shrink-0 w-9 h-9 ml-auto">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) selectType(e.target.value);
              }}
              className={`${chipFrame} absolute inset-0 w-full h-full text-transparent focus:outline-none cursor-pointer appearance-none`}
              style={{ backgroundImage: 'none' }}
              title={t('zikr.change')}
              aria-label={t('zikr.change')}
            >
              <option value="" disabled className="bg-brand-deep text-white/40">
                {t('zikr.change')}
              </option>
              {types
                .filter((typ) => typ !== selected)
                .map((typ) => (
                  <option key={typ} value={typ} className="bg-brand-deep text-white">
                    {zikrDisplayName(typ, i18n.language)}
                  </option>
                ))}
            </select>
            <ChevronDownIcon className="w-5 h-5 text-white/70 absolute inset-0 m-auto pointer-events-none" />
          </div>

          {/* Add custom */}
          <button
            onClick={() => setShowAddCustom(true)}
            className={`${chip} flex-shrink-0 w-9 h-9 flex items-center justify-center`}
            title={t('zikr.addCustom', 'Add custom dhikr')}
            aria-label={t('zikr.addCustom', 'Add custom dhikr')}
          >
            <PlusIcon className="w-4 h-4" />
          </button>

          {/* Play pronunciation */}
          {zikrAudioEnabled && audio.hasAudio && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => (audio.isPlaying && !audio.isAutoPlay ? audio.stop() : audio.play())}
              aria-pressed={audio.isPlaying && !audio.isAutoPlay}
              className={`flex-shrink-0 w-9 h-9 rounded-control border flex items-center justify-center transition-colors ${
                audio.isPlaying && !audio.isAutoPlay
                  ? 'bg-brand-gold/20 border-brand-gold/60 text-brand-gold'
                  : 'bg-brand-gold/10 hover:bg-brand-gold/20 border-brand-gold/30 text-brand-gold/80 hover:text-brand-gold'
              }`}
              title={t('zikr.playPronunciation', 'Play pronunciation')}
              aria-label={t('zikr.playPronunciation', 'Play pronunciation')}
            >
              <SpeakerWaveIcon className="w-4 h-4" />
            </motion.button>
          )}

          {/* Focus mode: lives here, not on the arch, whose curved top
              corners clipped it on wide screens. */}
          <button
            onClick={() => setFullScreen(true)}
            className={`${chip} flex-shrink-0 w-9 h-9 flex items-center justify-center`}
            title={t('zikr.focusMode', 'Focus mode (full screen)')}
            aria-label={t('zikr.enterFocusMode', 'Enter full-screen focus mode')}
          >
            <ArrowsPointingOutIcon className="w-4 h-4" />
          </button>
        </div>

        {/* ── The screen's one arch: count, the dhikr, today's goal ── */}
        <section
          aria-label={zikrDisplayName(selected, i18n.language)}
          className="relative rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero overflow-hidden"
        >
          {/* Number: a single cheap pop per tap (the old exit+enter pair ran
              TWO spring animations per count and janked low-end phones);
              reduce-motion users get an instant swap. */}
          <div className="pt-12 pb-4 text-center">
            <motion.div
              key={`${selected}:${tasbihRemaining ?? currentCount}`}
              initial={reduceMotion ? false : { scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: 'tween', duration: 0.12, ease: 'easeOut' }}
            >
              <div
                data-testid="zikr-count"
                className="font-display text-8xl sm:text-9xl font-bold text-white leading-none tabular-nums"
              >
                {formatLocaleNumber(tasbihRemaining ?? currentCount)}
              </div>
            </motion.div>
            {tasbihRemaining !== null ? (
              <p className="mt-2 text-xs text-white/60">
                {t('zikr.tasbihOfTarget', '{{done}} of {{target}} · lifetime {{lifetime}}', {
                  done: formatLocaleNumber(tasbihDoneInSegment),
                  target: formatLocaleNumber(tasbihTarget),
                  lifetime: formatLocaleNumber(currentCount),
                })}
              </p>
            ) : (
              <button
                onClick={() => {
                  setSetCountValue(String(currentCount));
                  setShowSetCount(true);
                }}
                className="mt-2 text-xs text-white/50 hover:text-brand-emerald underline underline-offset-2 transition-colors"
              >
                {t('zikr.setCountBtn', 'Set')}
              </button>
            )}
          </div>

          {/* Meaning section */}
          <div className="mx-5 border-t border-brand-border/70 px-1 py-5 text-center min-h-[130px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={selected}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                {meaning ? (
                  <>
                    {meaning.arabic && (
                      <p
                        dir="rtl"
                        lang="ar"
                        className="text-2xl sm:text-3xl font-bold text-white"
                        style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
                      >
                        {meaning.arabic}
                      </p>
                    )}
                    {meaning.transliteration && (
                      <p className="text-xs text-brand-gold italic tracking-wide">
                        {meaning.transliteration}
                      </p>
                    )}
                    <p className="text-sm text-white/75 leading-relaxed">{meaning.meaning}</p>
                  </>
                ) : (
                  <p className="text-sm text-white/60 italic">
                    {t(
                      'zikr.customDhikrHint',
                      'Custom dhikr: remember Allah sincerely with every count.'
                    )}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Arch foot: today's goal + streak ── */}
          {(dailyGoal !== null || streakCount !== null) && (
            <div className="mx-5 border-t border-brand-border/70 px-1 pb-5 pt-4">
              {dailyGoal !== null && !goalMet && (
                <>
                  <div className="flex justify-between text-xs text-white/60 mb-1.5">
                    <span>
                      {t('zikr.todayCount', 'Today')}: {formatLocaleNumber(effectiveTotal)}
                      {pendingTotal > 0 ? (
                        <span className="text-brand-gold">
                          {' '}
                          (+{formatLocaleNumber(pendingTotal)} {t('zikr.syncing', 'syncing')})
                        </span>
                      ) : (
                        ''
                      )}
                    </span>
                    <span>
                      {t('zikr.goalLabel', 'Goal')}: {formatLocaleNumber(dailyGoal)}
                    </span>
                  </div>
                  <div
                    className="w-full bg-shade/20 rounded-full h-1.5 overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={goalProgress ?? 0}
                    aria-label={t('zikr.goalLabel', 'Goal')}
                  >
                    <motion.div
                      animate={{ width: `${goalProgress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full bg-brand-emerald"
                    />
                  </div>
                </>
              )}
              {goalMet && (
                <p className="flex items-center justify-center gap-1.5 text-sm text-brand-emerald font-semibold py-1">
                  <LeafIcon className="w-4 h-4 fill-current" aria-hidden="true" />
                  {t('zikr.goalAchieved', 'Goal Achieved!')}
                </p>
              )}
              <div className="flex items-center justify-between mt-2.5">
                {streakCount !== null ? (
                  <StreakBadge streak={streakCount} state={analyticsData?.streak?.state} />
                ) : (
                  <span />
                )}
                <GoalBadge pct={goalProgress} met={goalMet} />
              </div>
            </div>
          )}
        </section>

        {/* ── Action buttons ── */}
        <div className="flex gap-3 justify-center items-center">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onDecrement}
            disabled={currentCount === 0}
            aria-label={t('zikr.decreaseAriaLabel', 'Decrease count by one')}
            className={`${roundBtn} hover:text-white hover:border-brand-emerald/40`}
          >
            <MinusIcon className="w-6 h-6" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onIncrement}
            className="flex items-center justify-center gap-2 w-44 sm:w-56 h-14 rounded-control bg-brand-emerald-dim text-on-color font-bold text-lg cursor-pointer select-none outline-none border-0 shadow-elev-2 hover:shadow-hover hover:brightness-105 transition-[box-shadow,filter]"
          >
            <PlusIcon className="w-6 h-6" />
            {t('zikr.countBtn', 'Count')}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onReset}
            disabled={currentCount === 0}
            aria-label={t('zikr.resetAriaLabel', 'Reset counter')}
            className={`${roundBtn} hover:text-red-300 hover:border-red-400/50`}
          >
            <ArrowPathIcon className="w-6 h-6" />
          </motion.button>
        </div>

        {/* ── Auto-play controls ── */}
        <ZikrAutoPlayControls
          audio={audio}
          autoPlayTarget={autoPlayTarget}
          setAutoPlayTarget={setAutoPlayTarget}
          setShowAutoPlay={setShowAutoPlay}
          setZikrAudioVolume={setZikrAudioVolume}
          showAutoPlay={showAutoPlay}
          zikrAudioEnabled={zikrAudioEnabled}
          zikrAudioVolume={zikrAudioVolume}
        />

        {/* Keyboard hint */}
        <p className="text-center text-white/50 text-xs">
          <Trans
            i18nKey="zikr.spaceToCountKbd"
            defaults="Press <1>Space</1> to count"
            components={{
              1: <kbd className="kbd kbd-xs bg-brand-deep text-white border-brand-border" />,
            }}
          />
        </p>

        {/* ── Expandable full text & reference for the selected dhikr ──
            Collapsed: a calm one-line header. Expanded: the COMPLETE Arabic,
            complete meaning, then the hadith evidence with grade + link. */}
        <ZikrReferencePanel
          customMeanings={customMeanings}
          libItem={libItem}
          refExpanded={refExpanded}
          selected={selected}
          setRefExpanded={setRefExpanded}
        />
      </div>

      {/* ── Full-screen focus mode overlay (portal → truly above Navbar) ── */}
      <ZikrFocusOverlay
        audio={audio}
        currentCount={currentCount}
        fullScreen={fullScreen}
        goalMet={goalMet}
        goalProgress={goalProgress}
        meaning={meaning}
        onIncrement={onIncrement}
        reduceMotion={reduceMotion}
        selectType={selectType}
        selected={selected}
        setFullScreen={setFullScreen}
        streakCount={streakCount}
        tasbihDoneInSegment={tasbihDoneInSegment}
        tasbihRemaining={tasbihRemaining}
        tasbihTarget={tasbihTarget}
        types={types}
        zikrAudioEnabled={zikrAudioEnabled}
      />

      {/* ── Set starting count modal ── */}
      <ZikrSetCountModal
        setCountValue={setCountValue}
        setSetCountValue={setSetCountValue}
        setShowSetCount={setShowSetCount}
        showSetCount={showSetCount}
        submitSetCount={submitSetCount}
      />

      {/* ── Add custom dhikr modal — portaled so the sticky navbar can never
               float over the form (page ancestors create stacking contexts) ── */}
      <ZikrAddCustomModal
        navigate={navigate}
        setShowAddCustom={setShowAddCustom}
        showAddCustom={showAddCustom}
      />

      {/* ── Guest data-loss dialog ── */}
      <ZikrGuestDialog
        navigate={navigate}
        pending={pending}
        setShowGuestDialog={setShowGuestDialog}
        showGuestDialog={showGuestDialog}
      />

      {/* ── Manage my zikr list (remove) — portaled above the navbar ── */}
      <ZikrManageListSheet
        setConfirmDelete={setConfirmDelete}
        setEditZikr={setEditZikr}
        setShowAddCustom={setShowAddCustom}
        setShowManage={setShowManage}
        showManage={showManage}
        types={types}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title={t('zikr.removeConfirmTitle', 'Remove "{{name}}"?', { name: confirmDelete ?? '' })}
        message={t(
          'zikr.removeConfirmMsg',
          'This takes it out of your counter list. You can always add it back later. Your saved counts are not affected.'
        )}
        confirmLabel={t('zikr.yesRemove', 'Yes, remove')}
        onConfirm={() => confirmDelete && handleDeleteType(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      <EditZikrModal name={editZikr} onClose={() => setEditZikr(null)} />
    </AnimatedBackground>
  );
}
