import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
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
} from '@heroicons/react/24/outline';
import { DEFAULT_MEANINGS, GLOW_PALETTE } from '../components/zikr/zikrCounterData.js';
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
  const tasbihMode = useUiStore((s) => s.tasbihMode);
  const tasbihTarget = useUiStore((s) => s.tasbihTarget);
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

  const currentCount = counts?.[selected] ?? 0;
  const [colorIdx, setColorIdx] = useState(0);
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

  const color = GLOW_PALETTE[colorIdx % GLOW_PALETTE.length]!;

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
    setColorIdx((i) => (i + 1) % GLOW_PALETTE.length);
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
          t('zikr.tasbihSetComplete', '{{count}} done — set complete', { count: tasbihTarget }),
          { icon: '📿', duration: 2600 }
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
          <p className="font-semibold text-brand-deep text-sm">
            {t('zikr.resetConfirmTitle', { name: zikrDisplayName(selected, i18n.language) })}
            <br />
            <span className="text-white text-xs">{t('zikr.resetConfirmNote')}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                reset();
                toast.dismiss(toastObj.id);
                toast.success(t('zikr.counterReset'), { icon: '🔄', duration: 2000 });
              }}
              className="btn btn-sm bg-red-500 hover:bg-red-600 text-white border-0"
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
      icon: '🔢',
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
      toast.error(t('zikr.toast.coreLinked'), { icon: '🔒' });
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
    toast.success(t('zikr.toast.removed', { name }), { icon: '🗑️', duration: 2000 });
    setConfirmDelete(null);
  };

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('zikr.seoTitle', 'Zikr Counter — Digital Tasbih with Streaks & Goals')}
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
                { label: `📿 ${t('zikr.counter')}`, to: '/zikr', active: true },
                {
                  label: `📊 ${t('zikr.analytics')}`,
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
              className="shrink-0 p-2 rounded-xl border border-brand-emerald/20 bg-white/5 text-white/50 hover:text-brand-emerald hover:border-brand-emerald/40 transition-colors"
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
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-white/50 text-sm tracking-wide"
        >
          {t('zikr.motivational')}
        </motion.p>

        {/* ── Type selector: name | change dropdown | + ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-brand-emerald/15"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          {/* Selected name — glowing accent */}
          <span
            className="font-bold text-sm truncate min-w-0"
            style={{ color: color.glow, textShadow: `0 0 12px ${color.glow}60` }}
          >
            {zikrDisplayName(selected, i18n.language)}
          </span>

          {/* Change zikr type — icon-only caret button. The native <select>
              stays for accessibility/keyboard support; its own text is
              invisible (text-transparent) and a bigger caret is overlaid,
              so tapping anywhere on the circle opens the type list without
              a "Change" label taking up space next to the title. */}
          <div className="relative flex-shrink-0 w-8 h-8 ml-auto">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) selectType(e.target.value);
              }}
              className="absolute inset-0 w-full h-full rounded-full bg-white/10 hover:bg-white/20 border border-brand-emerald/20 text-transparent focus:outline-none cursor-pointer appearance-none transition-colors"
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
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-brand-emerald/20 text-white/70 hover:text-white flex items-center justify-center transition-all"
            title={t('zikr.addCustom', 'Add custom dhikr')}
            aria-label={t('zikr.addCustom', 'Add custom dhikr')}
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>

          {/* Play pronunciation */}
          {zikrAudioEnabled && audio.hasAudio && (
            <motion.button
              whileTap={{ scale: 0.82 }}
              onClick={() => (audio.isPlaying && !audio.isAutoPlay ? audio.stop() : audio.play())}
              className={`relative flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                audio.isPlaying && !audio.isAutoPlay
                  ? 'bg-brand-gold/40 border-brand-gold/70 text-brand-gold shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-brand-gold/15 hover:bg-brand-gold/25 border-brand-gold/40 text-brand-gold/80 hover:text-brand-gold'
              }`}
              title={t('zikr.playPronunciation', 'Play pronunciation')}
              aria-label={t('zikr.playPronunciation', 'Play pronunciation')}
            >
              {audio.isPlaying && !audio.isAutoPlay && (
                <span className="absolute inset-0 rounded-full bg-brand-gold/40 animate-ping" />
              )}
              <SpeakerWaveIcon className="relative w-4 h-4" />
            </motion.button>
          )}
        </motion.div>

        {/* ── Counter + meaning card ── */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.08 }}
          className="relative rounded-3xl border border-brand-emerald/20 bg-white/10 backdrop-blur-lg shadow-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          {/* Focus mode button */}
          <button
            onClick={() => setFullScreen(true)}
            className="absolute top-3 right-3 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/40 hover:text-white/80 transition-all z-10"
            title={t('zikr.focusMode', 'Focus mode (full screen)')}
            aria-label={t('zikr.enterFocusMode', 'Enter full-screen focus mode')}
          >
            <ArrowsPointingOutIcon className="w-4 h-4" />
          </button>

          {/* Number — a single cheap pop per tap (the old exit+enter pair ran
              TWO spring animations per count and janked low-end phones);
              reduce-motion users get an instant swap. */}
          <div className="pt-10 pb-4 text-center">
            <motion.div
              key={`${selected}:${tasbihRemaining ?? currentCount}`}
              initial={reduceMotion ? false : { scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: 'tween', duration: 0.12, ease: 'easeOut' }}
            >
              <div
                data-testid="zikr-count"
                className="text-8xl sm:text-9xl font-black text-white leading-none"
                style={{
                  textShadow: `0 0 40px ${color.glow}`,
                  transition: 'text-shadow 0.25s ease',
                }}
              >
                {formatLocaleNumber(tasbihRemaining ?? currentCount)}
              </div>
            </motion.div>
            {tasbihRemaining !== null ? (
              <p className="mt-1 text-[11px] text-white/40">
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
                className="mt-1 text-[11px] text-white/30 hover:text-brand-emerald underline underline-offset-2 transition-colors"
              >
                {t('zikr.setCountBtn', 'Set')}
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="mx-6 h-px bg-white/10" />

          {/* Meaning section */}
          <div className="px-6 py-5 text-center space-y-2.5 min-h-[130px] flex flex-col justify-center">
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
                        className="text-2xl sm:text-3xl font-bold text-white"
                        style={{
                          fontFamily: "'Amiri', 'Scheherazade New', serif",
                          textShadow: `0 0 16px ${color.glow}80`,
                        }}
                      >
                        {meaning.arabic}
                      </p>
                    )}
                    {meaning.transliteration && (
                      <p className="text-xs text-white/50 italic tracking-wide">
                        {meaning.transliteration}
                      </p>
                    )}
                    <p className="text-sm text-white/75 leading-relaxed">{meaning.meaning}</p>
                  </>
                ) : (
                  <p className="text-sm text-white/40 italic">
                    {t(
                      'zikr.customDhikrHint',
                      'Custom dhikr — remember Allah sincerely with every count.'
                    )}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Card bottom: progress bar + streak + goal% ── */}
          {(dailyGoal !== null || streakCount !== null) && (
            <div className="px-6 pb-5 pt-1">
              {dailyGoal !== null && !goalMet && (
                <>
                  <div className="flex justify-between text-xs text-white/40 mb-1.5">
                    <span>
                      {t('zikr.todayCount', 'Today')}: {formatLocaleNumber(effectiveTotal)}
                      {pendingTotal > 0 ? (
                        <span className="text-brand-gold/60">
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
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      animate={{ width: `${goalProgress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full ${color.bar}`}
                    />
                  </div>
                </>
              )}
              {goalMet && (
                <p className="text-sm text-brand-emerald font-bold text-center py-1">
                  {t('zikr.goalAchieved', 'Goal Achieved!')} 🏆
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
        </motion.div>

        {/* ── Action buttons ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-3 justify-center items-center"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onDecrement}
            disabled={currentCount === 0}
            aria-label={t('zikr.decreaseAriaLabel', 'Decrease count by one')}
            className="btn btn-circle bg-white/15 hover:bg-white/25 border-brand-emerald/20 text-white backdrop-blur-sm disabled:opacity-25"
          >
            <MinusIcon className="w-6 h-6" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04, backgroundColor: '#e6faf4' }}
            whileTap={{ scale: 0.96, backgroundColor: '#d1fae5' }}
            onClick={onIncrement}
            className="flex items-center justify-center gap-2 w-44 sm:w-56 h-14 rounded-2xl text-brand-deep font-bold text-lg cursor-pointer select-none outline-none border-0"
            style={{ backgroundColor: 'white', boxShadow: `0 8px 32px ${color.glow}50` }}
          >
            <PlusIcon className="w-6 h-6" />
            {t('zikr.countBtn', 'Count')}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onReset}
            disabled={currentCount === 0}
            aria-label={t('zikr.resetAriaLabel', 'Reset counter')}
            className="btn btn-circle bg-white/15 hover:bg-red-500/70 border-brand-emerald/20 text-white backdrop-blur-sm disabled:opacity-25 transition-colors"
          >
            <ArrowPathIcon className="w-6 h-6" />
          </motion.button>
        </motion.div>

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
        <p className="text-center text-white/30 text-xs">
          <Trans
            i18nKey="zikr.spaceToCountKbd"
            defaults="Press <1>Space</1> to count"
            components={{
              1: <kbd className="kbd kbd-xs bg-white/15 text-white border-brand-emerald/20" />,
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
