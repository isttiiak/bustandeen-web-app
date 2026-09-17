import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import toast from 'react-hot-toast';
import { useZikrStore } from '../store/useZikrStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useUiStore } from '../store/useUiStore.js';
import { useZikrTypes, useDeleteZikrType } from '../hooks/useZikrTypes.js';
import { useSubmitZikrRequest } from '../hooks/useZikrRequests.js';
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
import { translateReference } from '../utils/localeReference.js';
import EditZikrModal from '../components/EditZikrModal.js';
import ArabicKeyboard from '../components/ArabicKeyboard.js';
import ReportReference from '../components/ReportReference.js';
import ZikrSettings from '../components/ZikrSettings.js';
import ZikrRequestApprovedNotice from '../components/ZikrRequestApprovedNotice.js';
import Seo from '../components/Seo.js';
import { useZikrAudio } from '../hooks/useZikrAudio.js';
import {
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  XMarkIcon,
  TrashIcon,
  PencilSquareIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  SpeakerWaveIcon,
  PlayIcon,
  StopIcon,
  PlayPauseIcon,
} from '@heroicons/react/24/outline';

// Meanings for all built-in dhikr — transliteration/meaning are i18n KEYS with
// their English fallback carried alongside, resolved with t(key, fallback) at
// render time. Library/custom items store raw text (no key), rendered as-is.
const DEFAULT_MEANINGS: Record<
  string,
  {
    arabic: string;
    translitKey: string;
    translitFallback: string;
    meaningKey: string;
    meaningFallback: string;
  }
> = {
  SubhanAllah: {
    arabic: 'سُبْحَانَ اللَّهِ',
    translitKey: 'zikr.translit.subhanallah',
    translitFallback: 'Subḥāna-llāh',
    meaningKey: 'zikr.meanings.subhanallah',
    meaningFallback: 'Glory be to Allah — praising His perfection above all imperfections',
  },
  Alhamdulillah: {
    arabic: 'الْحَمْدُ لِلَّهِ',
    translitKey: 'zikr.translit.alhamdulillah',
    translitFallback: 'Al-ḥamdu li-llāh',
    meaningKey: 'zikr.meanings.alhamdulillah',
    meaningFallback: 'All praise belongs to Allah — gratitude for every blessing, seen and unseen',
  },
  'Allahu Akbar': {
    arabic: 'اللَّهُ أَكْبَرُ',
    translitKey: 'zikr.translit.allahuAkbar',
    translitFallback: 'Allāhu Akbar',
    meaningKey: 'zikr.meanings.allahuAkbar',
    meaningFallback: 'Allah is the Greatest — His greatness transcends all of creation',
  },
  'La ilaha illallah': {
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ',
    translitKey: 'zikr.translit.laIlahaIllallah',
    translitFallback: 'Lā ilāha illā-llāh',
    meaningKey: 'zikr.meanings.laIlahaIllallah',
    meaningFallback: 'There is no god but Allah — the declaration of Tawhid, key to Jannah',
  },
  Astaghfirullah: {
    arabic: 'أَسْتَغْفِرُ اللَّهَ',
    translitKey: 'zikr.translit.astaghfirullah',
    translitFallback: 'Astaghfiru-llāh',
    meaningKey: 'zikr.meanings.astaghfirullah',
    meaningFallback:
      'I seek forgiveness from Allah — the Prophet ﷺ sought forgiveness 70–100 times a day',
  },
  'SubhanAllah wa bihamdihi': {
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    translitKey: 'zikr.translit.subhanallahWaBihamdihi',
    translitFallback: 'Subḥāna-llāhi wa bi-ḥamdih',
    meaningKey: 'zikr.meanings.subhanallahWaBihamdihi',
    meaningFallback:
      'Glory be to Allah and all praise is His — light on the tongue, heavy on the scales, beloved to the Most Merciful',
  },
  'La hawla wa la quwwata illa billah': {
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    translitKey: 'zikr.translit.laHawla',
    translitFallback: 'Lā ḥawla wa lā quwwata illā bi-llāh',
    meaningKey: 'zikr.meanings.laHawla',
    meaningFallback:
      'There is no power and no strength except with Allah — a treasure from the treasures of Jannah',
  },
  'SubhanAllah wal hamdulillah wa la ilaha illAllah wa Allahu akbar': {
    arabic: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ',
    translitKey: 'zikr.translit.fourBeloved',
    translitFallback: 'Subḥāna-llāhi wal-ḥamdu li-llāhi wa lā ilāha illā-llāhu wa-llāhu akbar',
    meaningKey: 'zikr.meanings.fourBeloved',
    meaningFallback:
      'The four most beloved words to Allah — whoever says them, sins fall as leaves fall from a dry tree',
  },
  'Ayatul Kursi': {
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
    translitKey: 'zikr.translit.ayatulKursi',
    translitFallback: 'Allāhu lā ilāha illā huwal-ḥayyul-qayyūm... (Quran 2:255)',
    meaningKey: 'zikr.meanings.ayatulKursi',
    meaningFallback:
      'The Verse of the Throne — the greatest verse in the Quran. Recite after every prayer; nothing prevents entry to Jannah except death',
  },
  'Durud Ibrahim': {
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ',
    translitKey: 'zikr.translit.durudIbrahim',
    translitFallback: 'Allāhumma ṣalli ʿalā Muḥammadin wa ʿalā āli Muḥammad...',
    meaningKey: 'zikr.meanings.durudIbrahim',
    meaningFallback:
      'Salutations upon the Prophet ﷺ and his family — Allah sends tenfold blessings upon the one who sends one salutation',
  },
};

// Hadith references for built-in dhikr (shown at bottom of counter)
const DHIKR_HADITHS: Record<
  string,
  { textKey: string; textFallback: string; source: string; url: string; grade?: string }
> = {
  SubhanAllah: {
    textKey: 'zikr.hadith.subhanallah',
    textFallback:
      '"Two words are light on the tongue, heavy on the scale, beloved to the Most Merciful: SubhanAllah wa bihamdihi, SubhanAllah al-Azim."',
    source: 'Ṣaḥīḥ al-Bukhārī 6682',
    url: 'https://sunnah.com/bukhari:6682',
    grade: 'Ṣaḥīḥ',
  },
  Alhamdulillah: {
    textKey: 'zikr.hadith.alhamdulillah',
    textFallback: '"Al-ḥamdu li-llāh fills the scale."',
    source: 'Ṣaḥīḥ Muslim 223',
    url: 'https://sunnah.com/muslim:223',
    grade: 'Ṣaḥīḥ',
  },
  'Allahu Akbar': {
    textKey: 'zikr.hadith.allahuAkbar',
    textFallback:
      '"The best dhikr is Lā ilāha illā-llāh, and the best supplication is Al-ḥamdu li-llāh."',
    source: 'Sunan al-Tirmidhī 3383',
    url: 'https://sunnah.com/tirmidhi:3383',
    grade: 'Ḥasan',
  },
  'La ilaha illallah': {
    textKey: 'zikr.hadith.laIlahaIllallah',
    textFallback:
      '"Renew your faith." They asked: "How?" He said: "Say: Lā ilāha illā-llāh frequently."',
    source: 'Musnad Aḥmad 8695',
    url: 'https://sunnah.com/ahmad:8695',
    grade: 'Ḥasan',
  },
  Astaghfirullah: {
    textKey: 'zikr.hadith.astaghfirullah',
    textFallback:
      '"I seek forgiveness from Allah and turn to Him in repentance more than seventy times a day."',
    source: 'Ṣaḥīḥ al-Bukhārī 6307',
    url: 'https://sunnah.com/bukhari:6307',
    grade: 'Ṣaḥīḥ',
  },
  'SubhanAllah wa bihamdihi': {
    textKey: 'zikr.hadith.subhanallahWaBihamdihi',
    textFallback:
      '"Whoever says \'SubhanAllahi wa bihamdihi\' 100 times, his sins will be forgiven even if they were as much as the foam of the sea."',
    source: 'Ṣaḥīḥ al-Bukhārī 6405',
    url: 'https://sunnah.com/bukhari:6405',
    grade: 'Ṣaḥīḥ',
  },
  'La hawla wa la quwwata illa billah': {
    textKey: 'zikr.hadith.laHawla',
    textFallback:
      '"Shall I not guide you to a treasure from the treasures of Paradise? Say: Lā ḥawla wa lā quwwata illā bi-llāh."',
    source: 'Ṣaḥīḥ al-Bukhārī 4205',
    url: 'https://sunnah.com/bukhari:4205',
    grade: 'Ṣaḥīḥ',
  },
  'SubhanAllah wal hamdulillah wa la ilaha illAllah wa Allahu akbar': {
    textKey: 'zikr.hadith.fourBeloved',
    textFallback:
      '"The most beloved words to Allah are four: SubhanAllah, Alhamdulillah, La ilaha illallah, Allahu Akbar — it does not matter which you begin with."',
    source: 'Ṣaḥīḥ Muslim 2137',
    url: 'https://sunnah.com/muslim:2137',
    grade: 'Ṣaḥīḥ',
  },
  'Ayatul Kursi': {
    textKey: 'zikr.hadith.ayatulKursi',
    textFallback:
      '"Whoever recites Āyat al-Kursī after every obligatory prayer, nothing prevents him from entering Jannah except death."',
    source: "al-Nasā'ī (al-Sunan al-Kubrā) — Ṣaḥīḥ by al-Albānī",
    url: 'https://sunnah.com/nasai:9928',
    grade: 'Ṣaḥīḥ',
  },
  'Durud Ibrahim': {
    textKey: 'zikr.hadith.durudIbrahim',
    textFallback:
      '"Whoever sends blessings upon me once, Allah will send blessings upon him tenfold, and erase ten sins, and raise him ten degrees."',
    source: "al-Nasā'ī 1297",
    url: 'https://sunnah.com/nasai:1297',
    grade: 'Ṣaḥīḥ',
  },
};

// Full texts for predefined dhikr that aren't in the curated library —
// shown in the expandable "Full text & reference" card, never truncated.
const FULL_PREDEFINED: Record<
  string,
  {
    arabic: string;
    meaningKey: string;
    meaningFallback: string;
    source?: string;
    sourceUrl?: string;
  }
> = {
  'Ayatul Kursi': {
    arabic:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    meaningKey: 'zikr.meanings.ayatulKursiFull',
    meaningFallback:
      'Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursī extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great. (Quran 2:255)',
    source: 'Quran 2:255',
    sourceUrl: 'https://quran.com/2/255',
  },
};

const GLOW_PALETTE = [
  {
    glow: 'rgba(122,158,110,0.9)',
    ring: 'rgba(122,158,110,0.3)',
    bar: 'bg-brand-emerald',
    solid: '#7a9e6e',
  },
  {
    glow: 'rgba(201,169,110,0.9)',
    ring: 'rgba(201,169,110,0.3)',
    bar: 'bg-brand-gold',
    solid: '#c9a96e',
  },
  {
    glow: 'rgba(90,158,142,0.9)',
    ring: 'rgba(90,158,142,0.3)',
    bar: 'bg-brand-info',
    solid: '#5a9e8e',
  },
  {
    glow: 'rgba(196,130,90,0.9)',
    ring: 'rgba(196,130,90,0.3)',
    bar: 'bg-brand-warm',
    solid: '#c4825a',
  },
  {
    glow: 'rgba(90,158,142,0.9)',
    ring: 'rgba(90,158,142,0.3)',
    bar: 'bg-brand-info',
    solid: '#5a9e8e',
  },
  {
    glow: 'rgba(196,130,90,0.9)',
    ring: 'rgba(196,130,90,0.3)',
    bar: 'bg-brand-info',
    solid: '#c4825a',
  },
];

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
  const setZikrAudioVolume = useUiStore((s) => s.setZikrAudioVolume);
  const audio = useZikrAudio(selected);
  const [showAutoPlay, setShowAutoPlay] = useState(false);
  const [autoPlayTarget, setAutoPlayTarget] = useState('50');
  const [hiddenTypes, setHiddenTypes] = useState<string[]>(getHiddenZikr);
  const { data: fetchedTypes } = useZikrTypes();
  const submitZikrRequest = useSubmitZikrRequest();
  const deleteZikrType = useDeleteZikrType();
  const { data: analyticsData } = useAnalytics(1);

  const currentCount = counts?.[selected] ?? 0;
  const [colorIdx, setColorIdx] = useState(0);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customArabic, setCustomArabic] = useState('');
  const [customMeaningText, setCustomMeaningText] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [customSourceUrl, setCustomSourceUrl] = useState('');
  const [customWantsAudio, setCustomWantsAudio] = useState(false);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editZikr, setEditZikr] = useState<string | null>(null);
  const [showSetCount, setShowSetCount] = useState(false);
  const [setCountValue, setSetCountValue] = useState('');
  const [showArabicKb, setShowArabicKb] = useState(false);
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
  const pendingTotal = Object.values(pending ?? {}).reduce((a, b) => a + b, 0);
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
    const merged = [...new Set([...PREDEFINED_TYPES, ...serverNames, ...types])].filter(
      (name) => !hidden.has(name) || isCoreZikr(name)
    );
    if (merged.length !== types.length || merged.some((name, i) => name !== types[i])) {
      setTypes(merged);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [fetchedTypes?.length, hiddenTypes]);

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

  // Submits for admin review rather than adding directly — see
  // zikrRequest.service.ts. Only the name is required; an Ansar fills in and
  // verifies the rest before it joins the shared library.
  const submitCustomZikr = () => {
    const name = customName.trim();
    if (!name) return;
    submitZikrRequest.mutate(
      {
        name,
        arabic: customArabic.trim() || undefined,
        meaning: customMeaningText.trim() || undefined,
        source: customSource.trim() || undefined,
        sourceUrl: customSourceUrl.trim() || undefined,
        wantsAudio: customWantsAudio,
      },
      {
        onSuccess: () => {
          setCustomName('');
          setCustomArabic('');
          setCustomMeaningText('');
          setCustomSource('');
          setCustomSourceUrl('');
          setCustomWantsAudio(false);
          setShowAddCustom(false);
          toast.success(t('zikr.toast.requestSubmitted', 'Submitted for review'), {
            icon: '🌱',
            duration: 3000,
          });
        },
        onError: () => toast.error(t('zikr.toast.addFailed'), { duration: 3000 }),
      }
    );
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
        <ZikrSettings open={showSettings} onClose={() => setShowSettings(false)} />

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
            className="font-bold text-sm truncate flex-shrink-0 max-w-[140px] sm:max-w-[180px]"
            style={{ color: color.glow, textShadow: `0 0 12px ${color.glow}60` }}
          >
            {zikrDisplayName(selected, i18n.language)}
          </span>

          {/* Separator */}
          <span className="text-white/25 select-none flex-shrink-0">|</span>

          {/* Change zikr type — icon-only caret button. The native <select>
              stays for accessibility/keyboard support; its own text is
              invisible (text-transparent) and a bigger caret is overlaid,
              so tapping anywhere on the circle opens the type list without
              a "Change" label taking up space next to the title. */}
          <div className="relative flex-shrink-0 w-9 h-9">
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

          {/* Manage my list (delete) */}
          <button
            onClick={() => setShowManage(true)}
            className="ml-auto flex-shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-brand-emerald/20 text-white/70 hover:text-white flex items-center justify-center transition-all"
            title={t('zikr.manageList')}
            aria-label={t('zikr.manageList')}
          >
            <PencilSquareIcon className="w-3.5 h-3.5" />
          </button>

          {/* Add custom */}
          <button
            onClick={() => setShowAddCustom(true)}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-brand-emerald/20 text-white/70 hover:text-white flex items-center justify-center transition-all"
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
        {zikrAudioEnabled && audio.hasAudio && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {!audio.isAutoPlay ? (
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setShowAutoPlay(!showAutoPlay)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                    showAutoPlay
                      ? 'bg-brand-gold/25 border-brand-gold/50 text-brand-gold'
                      : 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold/80 hover:text-brand-gold hover:bg-brand-gold/20'
                  }`}
                >
                  <PlayPauseIcon className="w-4 h-4" />
                  {t('zikr.autoPlay', 'Auto-play')}
                </motion.button>
                <p className="text-white/30 text-[11px] text-center max-w-[240px]">
                  {t(
                    'zikr.autoPlayHint',
                    'Plays the pronunciation and counts it for you, on repeat'
                  )}
                </p>
              </div>
            ) : (
              /* Active auto-play bar */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-brand-emerald/30 bg-brand-emerald/[0.08] backdrop-blur-md p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-2.5 h-2.5 rounded-full bg-brand-emerald"
                    />
                    <span className="text-brand-emerald font-bold text-sm">
                      {t('zikr.autoPlayActive', 'Auto-playing')}
                    </span>
                  </div>
                  <span className="text-white/50 text-sm font-mono tabular-nums">
                    {audio.loopCount}
                    {audio.targetCount !== null ? ` / ${audio.targetCount}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      audio.stopAutoPlay();
                      setShowAutoPlay(false);
                    }}
                    className="btn btn-sm bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-400 gap-1.5"
                  >
                    <StopIcon className="w-4 h-4" />
                    {t('zikr.stop', 'Stop')}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={zikrAudioVolume}
                    onChange={(e) => setZikrAudioVolume(parseFloat(e.target.value))}
                    className="range range-success range-xs flex-1"
                    aria-label={t('zikr.volume', 'Volume')}
                  />
                  <span className="text-white/30 text-xs w-8 text-right">
                    {Math.round(zikrAudioVolume * 100)}%
                  </span>
                </div>
              </motion.div>
            )}

            {/* Auto-play setup panel */}
            <AnimatePresence>
              {showAutoPlay && !audio.isAutoPlay && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-brand-emerald/20 bg-white/[0.05] backdrop-blur-md p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-white/50 text-xs shrink-0">
                        {t('zikr.targetCount', 'Target count')}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        placeholder="50"
                        value={autoPlayTarget}
                        onChange={(e) => setAutoPlayTarget(e.target.value)}
                        className="input input-bordered input-sm flex-1 bg-brand-deep border-brand-border text-white text-center"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/50 text-xs shrink-0">
                        {t('zikr.volume', 'Volume')}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={zikrAudioVolume}
                        onChange={(e) => setZikrAudioVolume(parseFloat(e.target.value))}
                        className="range range-success range-xs flex-1"
                        aria-label={t('zikr.volume', 'Volume')}
                      />
                      <span className="text-white/30 text-xs w-8 text-right">
                        {Math.round(zikrAudioVolume * 100)}%
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const target = parseInt(autoPlayTarget, 10);
                        audio.startAutoPlay(target > 0 ? target : 50);
                      }}
                      className="btn btn-sm w-full bg-brand-emerald/20 hover:bg-brand-emerald/30 border-brand-emerald/30 text-brand-emerald gap-2"
                    >
                      <PlayIcon className="w-4 h-4" />
                      {t('zikr.startAutoPlay', 'Start auto-play')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Keyboard hint */}
        <p className="text-center text-white/30 text-xs">
          <Trans i18nKey="zikr.spaceToCountKbd" defaults="Press <1>Space</1> to count">
            Press{' '}
            <kbd className="kbd kbd-xs bg-white/15 text-white border-brand-emerald/20">Space</kbd>{' '}
            to count
          </Trans>
        </p>

        {/* ── Expandable full text & reference for the selected dhikr ──
            Collapsed: a calm one-line header. Expanded: the COMPLETE Arabic,
            complete meaning, then the hadith evidence with grade + link. */}
        {(() => {
          const builtin = DHIKR_HADITHS[selected];
          const custom = customMeanings[selected];
          const predef = FULL_PREDEFINED[selected];
          // Full-text resolution: library → predefined extras → custom
          const full = libItem
            ? {
                arabic: libItem.arabic,
                transliteration: libItem.transliteration,
                meaning:
                  i18n.language === 'bn' && libItem.meaningBn ? libItem.meaningBn : libItem.meaning,
                virtue:
                  i18n.language === 'bn' && libItem.virtueBn ? libItem.virtueBn : libItem.virtue,
                source: libItem.source,
                sourceUrl: libItem.sourceUrl,
                grade: libItem.grade,
              }
            : predef
              ? {
                  arabic: predef.arabic,
                  transliteration: undefined,
                  meaning: t(predef.meaningKey, predef.meaningFallback),
                  virtue: undefined,
                  source: predef.source,
                  sourceUrl: predef.sourceUrl,
                  grade: undefined,
                }
              : custom
                ? {
                    arabic: custom.fullArabic ?? custom.arabic,
                    transliteration: custom.transliteration,
                    meaning: custom.fullMeaning ?? custom.meaning,
                    virtue: custom.virtue,
                    source: custom.source,
                    sourceUrl: custom.sourceUrl,
                    grade: custom.grade,
                  }
                : null;
          if (!full && !builtin) return null;
          return (
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.25 }}
              className="rounded-2xl border border-brand-emerald/10 bg-white/5 backdrop-blur-sm overflow-hidden"
            >
              <button
                onClick={() => setRefExpanded((v) => !v)}
                aria-expanded={refExpanded}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
              >
                <span className="text-white/40 text-[11px] uppercase tracking-widest font-bold">
                  📖 {t('zikr.fullTextRef', 'Full text & reference')}
                </span>
                <ChevronDownIcon
                  className={`w-4 h-4 text-white/30 transition-transform ${refExpanded ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {refExpanded && (
                  <motion.div
                    // NO height animation: measuring 'auto' before the Arabic
                    // web font loads clipped long texts (Durud Ibrahim showed
                    // half its lines). Fade only — content always full height.
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {full?.arabic && (
                        <p
                          dir="rtl"
                          lang="ar"
                          className="text-xl sm:text-2xl text-white/90 leading-[2.2] text-right"
                          style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
                        >
                          {full.arabic}
                        </p>
                      )}
                      {/* Pronunciation sits directly under the Arabic — the
                          order a learner reads in: script, then how to say it,
                          then what it means. */}
                      {full?.transliteration && (
                        <p className="text-sm text-brand-gold/70 italic leading-relaxed tracking-wide">
                          {full.transliteration}
                        </p>
                      )}
                      {full?.meaning && (
                        <p className="text-sm text-white/60 leading-relaxed">{full.meaning}</p>
                      )}
                      {full?.virtue && (
                        <p className="text-brand-gold/60 text-xs leading-relaxed">
                          ✨ {full.virtue}
                        </p>
                      )}
                      {builtin && (
                        <p className="text-white/50 text-xs italic leading-relaxed border-l-2 border-brand-emerald/25 pl-3">
                          {t(builtin.textKey, builtin.textFallback)}
                        </p>
                      )}
                      <ReportReference what={selected} className="pt-1" />
                      {(builtin || full?.source) && (
                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          {(builtin?.grade ?? full?.grade) && (
                            <span className="text-brand-emerald/60 text-[10px] font-semibold bg-brand-emerald/10 px-2 py-0.5 rounded-full">
                              {translateReference((builtin?.grade ?? full?.grade)!, i18n.language)}
                            </span>
                          )}
                          {builtin ? (
                            <a
                              href={builtin.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-gold/60 text-[10px] underline hover:text-brand-gold/90 transition-colors"
                            >
                              {translateReference(builtin.source, i18n.language)} ↗
                            </a>
                          ) : full?.sourceUrl ? (
                            <a
                              href={full.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-gold/60 text-[10px] underline hover:text-brand-gold/90 transition-colors"
                            >
                              {translateReference(full.source ?? '', i18n.language)} ↗
                            </a>
                          ) : full?.source ? (
                            <span className="text-white/40 text-xs">
                              {translateReference(full.source, i18n.language)}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })()}
      </div>

      {/* ── Full-screen focus mode overlay (portal → truly above Navbar) ── */}
      {createPortal(
        <AnimatePresence>
          {fullScreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 flex flex-col overflow-hidden"
              style={{ zIndex: 99999, background: '#0e0d0a' }}
            >
              {/* ── Calm ambiance (redesigned, Istiak's spec): ONE fixed emerald
                   tone — no per-tap rainbow cycling, no sparkle strobing.
                   Two slow breathing orbs, nothing else moves. ── */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: '75vw',
                    height: '75vw',
                    left: '0%',
                    top: '-15%',
                    background:
                      'radial-gradient(circle, rgba(122,158,110,0.10) 0%, transparent 70%)',
                    filter: 'blur(70px)',
                  }}
                  animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: '60vw',
                    height: '60vw',
                    right: '-10%',
                    bottom: '-10%',
                    background: 'radial-gradient(circle, rgba(90,122,80,0.08) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                  }}
                  animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
                />
              </div>

              {/* ── Top bar: close (top-right) ── */}
              <div className="relative z-10 flex items-center justify-between px-5 sm:px-8 pt-5 pb-2 flex-shrink-0">
                <button
                  onClick={() => {
                    const el = document.getElementById('fs-zikr-select');
                    if (el instanceof HTMLSelectElement) el.showPicker?.();
                    else el?.click();
                  }}
                  className="flex items-center gap-1.5 opacity-55 hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <span className="text-sm font-bold truncate max-w-[200px] sm:max-w-[300px] text-brand-emerald/90">
                    {zikrDisplayName(selected, i18n.language)}
                  </span>
                  <svg
                    className="w-3 h-3 text-white/25 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <select
                  id="fs-zikr-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) selectType(e.target.value);
                  }}
                  className="absolute left-0 top-0 w-1 h-1 opacity-0 pointer-events-none"
                >
                  <option value="" disabled>
                    {t('zikr.switchZikr', 'Switch zikr...')}
                  </option>
                  {types
                    .filter((typ) => typ !== selected)
                    .map((typ) => (
                      <option key={typ} value={typ} className="bg-[#0e0d0a] text-white">
                        {zikrDisplayName(typ, i18n.language)}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => setFullScreen(false)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-all"
                  title={t('zikr.exitFocus', 'Exit focus mode (Esc)')}
                  aria-label={t('zikr.exitFocusAriaLabel', 'Exit full-screen focus mode')}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* ── Center content — whole area is tappable to count, for
                   eyes-free tasbih; the Count button and auto-play controls
                   below stop propagation so they don't double-fire. ── */}
              <div
                onClick={onIncrement}
                className="relative z-10 flex-1 flex flex-col items-center justify-center gap-5 px-6 -mt-6 cursor-pointer"
              >
                {/* Arabic text — very faint, above number */}
                {meaning?.arabic && (
                  <motion.p
                    key={`fs-ar:${selected}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    dir="rtl"
                    className="text-white/20 text-center"
                    style={{
                      fontFamily: "'Amiri', 'Scheherazade New', serif",
                      fontSize: 'clamp(22px, 5vw, 40px)',
                    }}
                  >
                    {meaning.arabic}
                  </motion.p>
                )}

                {/* Huge counter number — one soft pop per tap, steady gentle glow */}
                <motion.span
                  key={`fs:${selected}:${tasbihRemaining ?? currentCount}`}
                  initial={reduceMotion ? false : { scale: 0.94 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'tween', duration: 0.14, ease: 'easeOut' }}
                  className="font-black text-white/95 tabular-nums leading-none block text-center"
                  style={{
                    fontSize: 'clamp(100px, 28vw, 260px)',
                    textShadow: '0 0 60px rgba(122,158,110,0.35)',
                  }}
                >
                  {formatLocaleNumber(tasbihRemaining ?? currentCount)}
                </motion.span>

                {tasbihRemaining !== null && (
                  <p className="text-white/25 text-xs sm:text-sm -mt-2">
                    {t('zikr.tasbihOfTarget', '{{done}} of {{target}} · lifetime {{lifetime}}', {
                      done: formatLocaleNumber(tasbihDoneInSegment),
                      target: formatLocaleNumber(tasbihTarget),
                      lifetime: formatLocaleNumber(currentCount),
                    })}
                  </p>
                )}

                {/* Transliteration — faint caption below number */}
                {meaning?.transliteration && (
                  <p className="text-white/20 text-xs sm:text-sm italic tracking-widest -mt-2">
                    {meaning.transliteration}
                  </p>
                )}

                {/* Meaning — visible in fullscreen */}
                {meaning?.meaning && (
                  <p className="text-white/30 text-xs sm:text-sm text-center max-w-md leading-relaxed -mt-2">
                    {meaning.meaning}
                  </p>
                )}

                {/* Count button — deep calm emerald, tall for easy tap */}
                <div className="relative" style={{ width: 'min(92vw, 520px)' }}>
                  {!reduceMotion && (
                    <motion.div
                      key={`ripple:${currentCount}`}
                      className="absolute inset-0 rounded-3xl pointer-events-none"
                      initial={{ scale: 1, opacity: 0.25 }}
                      animate={{ scale: 1.25, opacity: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      style={{ background: '#7a9e6e' }}
                    />
                  )}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    // No onClick here — the tap bubbles up to the whole-screen
                    // tap target on the center-content wrapper, which counts
                    // it exactly once. An explicit handler here would double-count.
                    className="relative flex items-center justify-center gap-3 font-black rounded-3xl w-full select-none outline-none border border-brand-emerald/25 text-white"
                    style={{
                      height: 'clamp(120px, 18vh, 180px)',
                      fontSize: 'clamp(24px, 4vw, 36px)',
                      background:
                        'linear-gradient(180deg, rgba(122,158,110,0.32) 0%, rgba(90,122,80,0.45) 100%)',
                      boxShadow: '0 12px 40px rgba(122,158,110,0.18)',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <PlusIcon className="w-10 h-10 sm:w-11 sm:h-11" />
                    {t('zikr.countBtn', 'Count')}
                  </motion.button>
                </div>

                {/* Auto-play in focus mode */}
                {zikrAudioEnabled && audio.hasAudio && (
                  <div className="flex items-center gap-3 mt-1">
                    {audio.isAutoPlay ? (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          audio.stopAutoPlay();
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold"
                      >
                        <StopIcon className="w-5 h-5" />
                        {t('zikr.stop', 'Stop')}
                        <span className="text-white/40 font-mono ml-1">
                          {audio.loopCount}
                          {audio.targetCount !== null ? ` / ${audio.targetCount}` : ''}
                        </span>
                      </motion.button>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          audio.startAutoPlay();
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-gold/15 border border-brand-gold/40 text-brand-gold/90 hover:text-brand-gold text-sm font-bold transition-all"
                      >
                        <PlayIcon className="w-5 h-5" />
                        {t('zikr.autoPlay', 'Auto-play')}
                      </motion.button>
                    )}
                  </div>
                )}

                {/* Streak + goal — hidden once goal is met to keep focus */}
                {!goalMet && (streakCount !== null || goalProgress !== null) && (
                  <div className="flex items-center gap-6 opacity-35">
                    {streakCount !== null && (
                      <span className="text-brand-gold text-xs font-bold">
                        🔥 {t('zikr.streakDay', '{{count}} day', { count: streakCount })}
                      </span>
                    )}
                    {goalProgress !== null && (
                      <span className="text-white/60 text-xs font-bold">🎯 {goalProgress}%</span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom: keyboard hint on desktop */}
              <div className="relative z-10 flex flex-col items-center gap-3 pb-6 flex-shrink-0">
                <p className="hidden sm:block text-white/20 text-[11px] tracking-wider">
                  {t('zikr.spaceCount', 'SPACE to count · ESC to exit')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Set starting count modal ── */}
      {createPortal(
        <AnimatePresence>
          {showSetCount && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowSetCount(false);
              }}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
                className="bg-brand-surface rounded-3xl p-6 w-full max-w-xs shadow-2xl border border-brand-border"
              >
                <h3 className="text-xl font-bold text-brand-emerald mb-1">
                  {t('zikr.setCountTitle', 'Set starting count')}
                </h3>
                <p className="text-white/40 text-xs mb-4">
                  {t(
                    'zikr.setCountDesc',
                    'Jump straight to a number — start from 33, 99, or wherever you left off.'
                  )}
                </p>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={setCountValue}
                  onChange={(e) => setSetCountValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitSetCount();
                  }}
                  placeholder={t('zikr.setCountPlaceholder', 'Enter a number')}
                  className="input input-bordered w-full bg-brand-deep border-brand-border text-white focus:border-brand-emerald text-lg text-center"
                  autoFocus
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={submitSetCount}
                    className="btn flex-1 bg-brand-emerald hover:bg-brand-emerald/80 border-0 text-white"
                  >
                    {t('zikr.setCountBtn', 'Set')}
                  </button>
                  <button onClick={() => setShowSetCount(false)} className="btn btn-ghost flex-1">
                    {t('common.cancel')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Add custom dhikr modal — portaled so the sticky navbar can never
             float over the form (page ancestors create stacking contexts) ── */}
      {createPortal(
        <AnimatePresence>
          {showAddCustom && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowAddCustom(false);
              }}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
                className="bg-brand-surface rounded-3xl p-6 w-full max-w-md shadow-2xl border border-brand-border max-h-[85vh] flex flex-col"
              >
                <h3 className="text-xl font-bold text-brand-emerald mb-1">
                  {t('zikr.addCustom', 'Suggest a Dhikr')}
                </h3>
                <p className="text-white/40 text-xs mb-2">
                  {t(
                    'zikr.addCustomNote',
                    'Only the name is required — an Ansar reviews every suggestion (with a scholar if needed) before it joins the shared library.'
                  )}
                </p>
                <p className="text-xs mb-4">
                  <button
                    className="text-brand-gold/80 underline"
                    onClick={() => {
                      setShowAddCustom(false);
                      navigate('/settings');
                    }}
                  >
                    📿 {t('zikr.checkLibrary', 'First check the zikr library in Settings')}
                  </button>
                  <span className="text-white/30">
                    {' '}
                    —{' '}
                    {t(
                      'zikr.checkLibraryNote',
                      'ṣalawāt, istighfār & more, already verified with references.'
                    )}
                  </span>
                </p>

                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {/* Name */}
                  <div>
                    <label className="text-xs text-white/60 uppercase tracking-wider mb-1 block">
                      {t('zikr.dhikrName', 'Dhikr Name')}{' '}
                      <span className="text-red-400">{t('zikr.required', '*')}</span>
                    </label>
                    <input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder={t('zikr.dhikrNamePlaceholder', 'e.g. Astaghfirullah')}
                      className="input input-bordered w-full bg-brand-deep border-brand-border text-white focus:border-brand-emerald text-sm"
                      autoFocus
                    />
                  </div>

                  {/* Arabic */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-white/60 uppercase tracking-wider block">
                        {t('zikr.arabicText', 'Arabic Text')}{' '}
                        <span className="text-white/30">({t('zikr.optional', 'optional')})</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowArabicKb((v) => !v)}
                        className="text-[11px] text-brand-emerald/70 hover:text-brand-emerald underline underline-offset-2"
                      >
                        {t('zikr.arabicKeyboard', 'Arabic keyboard')}
                      </button>
                    </div>
                    <input
                      value={customArabic}
                      onChange={(e) => setCustomArabic(e.target.value)}
                      placeholder="أَسْتَغْفِرُ اللَّهَ"
                      dir="rtl"
                      className="input input-bordered w-full bg-brand-deep border-brand-border text-white focus:border-brand-emerald text-base"
                      style={{ fontFamily: "'Amiri', serif" }}
                    />
                    {showArabicKb && (
                      <ArabicKeyboard
                        value={customArabic}
                        onChange={setCustomArabic}
                        onClose={() => setShowArabicKb(false)}
                      />
                    )}
                  </div>

                  {/* Meaning */}
                  <div>
                    <label className="text-xs text-white/60 uppercase tracking-wider mb-1 block">
                      {t('zikr.englishMeaning', 'English Meaning')}{' '}
                      <span className="text-white/30">({t('zikr.optional', 'optional')})</span>
                    </label>
                    <input
                      value={customMeaningText}
                      onChange={(e) => setCustomMeaningText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitCustomZikr();
                        if (e.key === 'Escape') setShowAddCustom(false);
                      }}
                      placeholder={t(
                        'zikr.meaningPlaceholder',
                        'e.g. I seek forgiveness from Allah'
                      )}
                      className="input input-bordered w-full bg-brand-deep border-brand-border text-white focus:border-brand-emerald text-sm"
                    />
                  </div>

                  {/* Hadith reference (optional) */}
                  <div className="border-t border-brand-border/60 pt-3 space-y-2">
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">
                      {t('zikr.hadithRef', 'Hadith Reference')}{' '}
                      <span className="normal-case text-white/20">
                        ({t('zikr.optional', 'optional')})
                      </span>
                    </p>
                    <input
                      value={customSource}
                      onChange={(e) => setCustomSource(e.target.value)}
                      placeholder="e.g. Ṣaḥīḥ al-Bukhārī 6307"
                      className="input input-sm input-bordered w-full bg-brand-deep border-brand-border text-white focus:border-brand-emerald text-xs"
                    />
                    <input
                      value={customSourceUrl}
                      onChange={(e) => setCustomSourceUrl(e.target.value)}
                      placeholder="https://sunnah.com/..."
                      className="input input-sm input-bordered w-full bg-brand-deep border-brand-border text-white focus:border-brand-emerald text-xs"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-white/50 text-xs">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={customWantsAudio}
                      onChange={(e) => setCustomWantsAudio(e.target.checked)}
                    />
                    {t('zikr.wantsAudio', "Want an audio recitation for this, if it's added?")}
                  </label>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAddCustom(false);
                      setCustomName('');
                      setCustomArabic('');
                      setCustomMeaningText('');
                      setCustomWantsAudio(false);
                    }}
                    className="btn flex-1 btn-ghost text-white/60 border-brand-border"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={submitCustomZikr}
                    disabled={!customName.trim() || submitZikrRequest.isPending}
                    className="btn flex-1 bg-brand-emerald hover:bg-brand-emerald-dim text-white border-0 font-bold"
                  >
                    {submitZikrRequest.isPending ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      t('zikr.addDhikr', 'Submit for review')
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Guest data-loss dialog ── */}
      <AnimatePresence>
        {showGuestDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22 }}
              className="bg-brand-surface rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-brand-border text-center"
            >
              <div className="text-5xl mb-4">📿</div>
              <h3 className="text-xl font-black text-white mb-2">
                {t('zikr.dontLoseCounts', "Don't lose your counts")}
              </h3>
              <p className="text-white/50 text-sm mb-6 leading-relaxed">
                {t(
                  'zikr.unsavedCounts',
                  'You have {{count}} unsaved zikr counts. Sign in to save your progress and track your streaks.',
                  { count: Object.values(pending ?? {}).reduce((a, b) => a + b, 0) }
                )}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  className="btn bg-brand-emerald hover:bg-brand-emerald-dim text-white border-0 w-full"
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', '/zikr');
                    navigate('/login');
                  }}
                >
                  {t('zikr.signInToSave', 'Sign In to Save')}
                </button>
                <button
                  className="btn btn-ghost text-white/50 hover:text-white w-full"
                  onClick={() => {
                    setShowGuestDialog(false);
                    navigate('/');
                  }}
                >
                  {t('zikr.leaveWithout', 'Leave without saving')}
                </button>
                <button
                  className="btn btn-ghost text-brand-emerald text-sm w-full"
                  onClick={() => setShowGuestDialog(false)}
                >
                  {t('zikr.keepCounting', 'Keep counting')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Manage my zikr list (remove) — portaled above the navbar ── */}
      {createPortal(
        <AnimatePresence>
          {showManage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowManage(false);
              }}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
                className="bg-brand-surface rounded-3xl p-6 w-full max-w-md shadow-2xl border border-brand-border max-h-[80vh] flex flex-col"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-bold text-brand-emerald">
                    {t('zikr.myZikrList', 'My zikr list')}
                  </h3>
                  <button
                    onClick={() => setShowManage(false)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-white/40 text-xs mb-4">
                  {t(
                    'zikr.manageNote',
                    'Custom zikr can be edited (✏️) — renaming keeps all your counts. Removing only takes it out of your dropdown; saved counts stay in analytics.'
                  )}
                </p>
                <div className="space-y-1.5 overflow-y-auto pr-1">
                  {types.length === 0 && (
                    <p className="text-white/40 text-sm text-center py-6">
                      {t('zikr.emptyList', 'Your list is empty. Add one with ＋.')}
                    </p>
                  )}
                  {types.map((typ) => {
                    const isCustom =
                      !PREDEFINED_TYPES.some((p) => p.toLowerCase() === typ.toLowerCase()) &&
                      !findLibraryZikr(typ);
                    const locked = isCoreZikr(typ);
                    return (
                      <div
                        key={typ}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-brand-border bg-brand-deep/50"
                      >
                        <span className="flex-1 min-w-0 truncate text-white/80 text-sm font-semibold">
                          {zikrDisplayName(typ, i18n.language)}
                        </span>
                        {isCustom && (
                          <button
                            onClick={() => {
                              setShowManage(false);
                              setEditZikr(typ);
                            }}
                            aria-label={t('zikr.editAriaLabel', 'Edit {{name}}', { name: typ })}
                            className="btn btn-xs btn-ghost text-brand-emerald/70 hover:text-brand-emerald hover:bg-brand-emerald/10 gap-1 shrink-0"
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" /> {t('zikr.editBtn', 'Edit')}
                          </button>
                        )}
                        {locked ? (
                          <span
                            title={t(
                              'zikr.lockedTitle',
                              'Your salat tracker adds counts to this dhikr, so it stays in your list.'
                            )}
                            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-brand-gold/70 bg-brand-gold/10 border border-brand-gold/20"
                          >
                            {t('zikr.alwaysOn', 'Always on')}
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(typ)}
                            aria-label={t('zikr.removeAriaLabel', 'Remove {{name}}', { name: typ })}
                            className="btn btn-xs btn-ghost text-red-400/60 hover:text-red-400 hover:bg-red-500/10 gap-1 shrink-0"
                          >
                            <TrashIcon className="w-3.5 h-3.5" /> {t('zikr.removeBtn', 'Remove')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    setShowManage(false);
                    setShowAddCustom(true);
                  }}
                  className="btn btn-sm mt-4 bg-brand-emerald/15 border border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald/25 gap-1.5"
                >
                  <PlusIcon className="w-4 h-4" /> {t('zikr.addNewZikr', 'Add a new zikr')}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

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
