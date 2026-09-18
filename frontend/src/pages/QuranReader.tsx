import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  BookmarkIcon as BookmarkOutline,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  BookOpenIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid, PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import { useAuthStore } from '../store/useAuthStore.js';
import {
  useQuranSummary,
  useReadAyat,
  useToggleBookmark,
  useSetResume,
} from '../hooks/useQuran.js';
import { useTafsir } from '../hooks/useQuran.js';
import { useQuranReadingSession } from '../hooks/useQuranReadingSession.js';
import { TAFSIRS, getPreferredTafsir, setPreferredTafsir } from '../utils/tafsir.js';
import { QURANIC_DUAS } from '../utils/quranMeta.js';
import { getArabicFont, getFontPx, translitEnabled } from '../utils/quranPrefs.js';
import {
  loadSurahList,
  loadSurahText,
  ayahAudioUrl,
  juzOf,
  locateGlobalAyah,
  selectedTranslations,
  surahDisplayName,
  surahMeaningDisplay,
  TRANSLATIONS,
  type SurahMeta,
  type AyahText,
} from '../utils/quranData.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';
import { celebrateGoal, celebrateKhatm, celebrateSmall } from '../utils/celebrate.js';
import ShareAyahModal from '../components/ShareAyahModal.js';

/**
 * The ayah-by-ayah reading room (Istiak's design):
 * one big calm card — Arabic ayah + English meaning — prev/next at the bottom,
 * surah/juz/today-count chips around it, a top-right play button that recites
 * ONLY this ayah (words highlight as it plays; hover highlights without audio),
 * fullscreen for distraction-free reading. Keyboard: ← → navigate · F
 * fullscreen · Esc exit.
 *
 * Modes:
 *  - free    browse a full surah; finishing auto-advances to the NEXT surah.
 *  - khatam  serial journey; advances the khatam bookmark + wraps a khatm.
 *  - single  a "beloved surah"; finishing REDIRECTS to /quran (no next surah).
 *  - bundle  a bounded āyah selection or duʿā; does NOT count toward the goal
 *            (Istiak's spec) and redirects to /quran when finished.
 *
 * Reading counts toward the daily āyah goal in free/khatam/single only.
 * Finishing a surah (reaching its last āyah) credits ONE completion toward
 * the "top surahs" list.
 */

// Typography now comes from quranPrefs: user-chosen Arabic font (easy-to-read
// default) + free-range px sliders for every text kind (Istiak's spec).

// ── Resume tracking: where the reader left off, per surah ─────────────────────
// localStorage is the fast cache; the SERVER copy (QuranProfile.readerPos) is
// the source of truth so the same account resumes at the same āyah on every
// device (Istiak: web said āyah 12, phone said 3 — critical bug).
const RESUME_KEY = 'bustandeen_reader_pos';
function readResumeMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(RESUME_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}
function getResume(surah: number): number {
  return readResumeMap()[String(surah)] ?? 0;
}
function saveResume(surah: number, ayah: number): void {
  const m = readResumeMap();
  m[String(surah)] = ayah;
  localStorage.setItem(RESUME_KEY, JSON.stringify(m));
}
function formatReadingTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
function clearResume(surah: number): void {
  const m = readResumeMap();
  delete m[String(surah)];
  localStorage.setItem(RESUME_KEY, JSON.stringify(m));
}

type ReaderMode = 'free' | 'khatam' | 'bundle' | 'single';

export default function QuranReader() {
  const { surah: surahParam } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const { t, i18n } = useTranslation();

  const surahNo = Math.min(114, Math.max(1, Number(surahParam) || 1));
  const mode = (params.get('mode') ?? 'free') as ReaderMode;
  // When opened from "Duas from the Quran": carries the story/evidence panel
  const dua = useMemo(() => {
    const id = params.get('dua');
    return id ? (QURANIC_DUAS.find((d) => d.id === id) ?? null) : null;
  }, [params]);
  const [contextOpen, setContextOpen] = useState(false);
  const hasStart = params.get('start') != null;
  const startAyah = Number(params.get('start')) || 1;
  const endAyah = Number(params.get('end')) || null; // bundle bound

  const { data: summary } = useQuranSummary();
  const readAyat = useReadAyat();
  const toggleBookmark = useToggleBookmark();
  const setResumeServer = useSetResume();
  const resumeSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumePromptDoneRef = useRef(false);
  const [tafsirOpen, setTafsirOpen] = useState(false);
  const readingSession = useQuranReadingSession({
    extendedIdle: tafsirOpen,
    enabled: !!user && !isDemoMode,
  });
  const [tafsirEdition, setTafsirEdition] = useState<number>(getPreferredTafsir);
  const [splitTafsir, setSplitTafsir] = useState(false); // fullscreen 2-pane reading
  // Draggable split (Istiak: a short āyah can pair with a LONG tafsir — the
  // reader decides how much room each side gets). Left-pane %, persisted.
  const [splitPct, setSplitPct] = useState<number>(() => {
    const v = Number(localStorage.getItem('bustandeen_split_pct'));
    return Number.isFinite(v) && v >= 25 && v <= 75 ? v : 50;
  });
  const draggingRef = useRef(false);

  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [ayat, setAyat] = useState<AyahText[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0); // index within `ayat`
  const [fullscreen, setFullscreen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [wordIdx, setWordIdx] = useState(-1);
  const [resumeAyah, setResumeAyah] = useState<number | null>(null); // continue-or-restart prompt
  const [shareOpen, setShareOpen] = useState(false);
  const [volume, setVolume] = useState<number>(() => {
    const raw = localStorage.getItem('bustandeen_quran_volume');
    const v = Number(raw);
    return raw !== null && Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.4; // 40% default
  });
  // Typography prefs — read once per mount (the settings drawer writes them)
  const arabicFont = useMemo(() => getArabicFont(), []);
  const baseFs = useMemo(
    () => ({
      arabic: getFontPx('arabic'),
      translation: getFontPx('translation'),
      translit: getFontPx('translit'),
      tafsir: getFontPx('tafsir'),
    }),
    []
  );
  const showTranslit = useMemo(() => translitEnabled(), []);
  // In-app ZOOM (Istiak's spec): big screens have room to spare — scale every
  // reader text together, without touching the browser zoom. Persisted.
  const [zoom, setZoom] = useState<number>(() => {
    const v = Number(localStorage.getItem('bustandeen_reader_zoom'));
    return Number.isFinite(v) && v >= 0.8 && v <= 1.8 ? v : 1;
  });
  const changeZoom = useCallback((delta: number) => {
    setZoom((z) => {
      const n = delta === 0 ? 1 : Math.min(1.8, Math.max(0.8, Math.round((z + delta) * 10) / 10));
      localStorage.setItem('bustandeen_reader_zoom', String(n));
      return n;
    });
  }, []);
  const fs = useMemo(
    () => ({
      arabic: Math.round(baseFs.arabic * zoom),
      translation: Math.round(baseFs.translation * zoom),
      translit: Math.round(baseFs.translit * zoom),
      tafsir: Math.round(baseFs.tafsir * zoom),
    }),
    [baseFs, zoom]
  );
  const editions = useMemo(() => selectedTranslations(), []);
  const editionLabel = (id: string) => TRANSLATIONS.find((tf) => tf.id === id)?.label ?? id;

  // free/single reads track a resume position; khatam uses the server bookmark,
  // bundles are bounded — neither uses local resume.
  const usesResume = mode === 'free' || mode === 'single';
  const countsGoal = mode !== 'bundle';

  const cardRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ayat advanced past but not yet flushed to the server
  const pendingRef = useRef(0);
  const seenRef = useRef(new Set<number>());
  const suppressSaveRef = useRef(false);

  const surahMeta = useMemo(
    () => surahs.find((s) => s.number === surahNo) ?? null,
    [surahs, surahNo]
  );

  const { registerSurah, registerAyahRead } = readingSession;
  useEffect(() => {
    registerSurah(surahNo);
  }, [registerSurah, surahNo]);

  const current = ayat[idx] ?? null;
  const lastIdx = endAyah ? Math.min(ayat.length - 1, endAyah - 1) : ayat.length - 1;
  const firstIdx = mode === 'bundle' ? startAyah - 1 : 0;

  // ── data ──
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setResumeAyah(null);
    resumePromptDoneRef.current = false;
    suppressSaveRef.current = false;
    seenRef.current = new Set();
    Promise.all([loadSurahList(), loadSurahText(surahNo, undefined, showTranslit)])
      .then(([list, text]) => {
        if (!alive) return;
        setSurahs(list);
        setAyat(text);
        const initialIdx = Math.min(text.length - 1, Math.max(0, startAyah - 1));
        setIdx(initialIdx);
        setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setLoading(false);
          toast.error(
            t('quranReader.loadError', 'Could not load the surah — check your connection.'),
            { id: 'quran-load' }
          );
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [surahNo]);

  // Offer "continue where you left off?" once text (and, when signed in, the
  // server summary) is available. Server position wins over the local cache.
  useEffect(() => {
    if (loading || !usesResume || hasStart || resumePromptDoneRef.current) return;
    if (user && !summary) return; // wait for the authoritative copy
    resumePromptDoneRef.current = true;
    const serverPos = Number(summary?.profile.readerPos?.[String(surahNo)] ?? 0);
    const saved = serverPos > 0 ? serverPos : getResume(surahNo);
    if (saved > 1 && saved <= ayat.length) {
      saveResume(surahNo, saved); // refresh the local cache from the server
      setResumeAyah(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intentionally narrowed; the omitted values are stable or would retrigger this effect unnecessarily
  }, [loading, summary, surahNo, usesResume, hasStart, user]);

  // Push the resume position to the server, debounced — cheap and idempotent.
  const syncResume = useCallback(
    (ayah: number) => {
      if (!user) return;
      if (resumeSyncTimerRef.current) clearTimeout(resumeSyncTimerRef.current);
      resumeSyncTimerRef.current = setTimeout(() => {
        setResumeServer.mutate({ surah: surahNo, ayah });
      }, 1500);
    },
    [user, surahNo]
  );

  // ── logging: count each NEW ayah the reader moves past, flush in batches ──
  const flush = useCallback(
    (completedSurah = false) => {
      const n = pendingRef.current;
      if ((n <= 0 && !completedSurah) || !user || !countsGoal) return;
      pendingRef.current = 0;
      readAyat.mutate(
        { count: n, surah: surahNo, advanceKhatm: mode === 'khatam', completedSurah },
        {
          onSuccess: (r) => {
            if (r.khatmCompleted) celebrateKhatm();
          },
        }
      );
    },
    [user, surahNo, mode, countsGoal]
  );

  useEffect(() => () => flush(), [flush]); // flush on unmount / surah change

  const markRead = useCallback(
    (ayahIdx: number) => {
      if (!countsGoal) return; // bundles/duas don't count toward the goal
      const a = ayat[ayahIdx];
      if (!a || seenRef.current.has(a.number)) return;
      seenRef.current.add(a.number);
      pendingRef.current += 1;
      registerAyahRead(1);
      const before = (summary?.todayAyat ?? 0) + pendingRef.current - 1;
      const goal = summary?.profile.dailyGoalAyat ?? 1;
      if (before < goal && before + 1 >= goal) celebrateGoal();
      if (pendingRef.current >= 5) flush();
    },
    [ayat, flush, summary, countsGoal, registerAyahRead]
  );

  // ── audio: play ONLY the current ayah, highlight words while it runs ──
  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (wordTimerRef.current) clearInterval(wordTimerRef.current);
    setPlaying(false);
    setWordIdx(-1);
  }, []);

  const playAyah = useCallback(() => {
    if (!current) return;
    if (playing) {
      stopAudio();
      return;
    }
    const a = new Audio(ayahAudioUrl(current.number));
    a.volume = volume;
    audioRef.current = a;
    const words = current.arabic.split(' ').length;
    a.addEventListener('loadedmetadata', () => {
      // Even word pacing across the recitation — simple, calm, good enough
      const per = (a.duration * 1000) / Math.max(1, words);
      let w = 0;
      setWordIdx(0);
      wordTimerRef.current = setInterval(() => {
        w += 1;
        if (w >= words) {
          if (wordTimerRef.current) clearInterval(wordTimerRef.current);
          return;
        }
        setWordIdx(w);
      }, per);
    });
    a.addEventListener('ended', () => {
      stopAudio();
    }); // ONE ayah, then stop
    a.addEventListener('error', () => {
      stopAudio();
      toast.error(t('quranReader.audioError', 'Audio unavailable — try again.'), {
        id: 'ayah-audio',
      });
    });
    void a
      .play()
      .then(() => setPlaying(true))
      .catch(() =>
        toast.error(t('quranReader.audioTapAgain', 'Tap again to allow audio.'), {
          id: 'ayah-audio',
        })
      );
  }, [current, playing, stopAudio, volume]);

  const changeVolume = useCallback((v: number) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
    localStorage.setItem('bustandeen_quran_volume', String(v));
  }, []);

  // ── navigation ──
  const goToIdx = useCallback(
    (next: number) => {
      stopAudio();
      setIdx(next);
      if (usesResume && !suppressSaveRef.current) {
        const a = ayat[next];
        if (a) {
          saveResume(surahNo, a.numberInSurah);
          syncResume(a.numberInSurah);
        }
      }
    },
    [stopAudio, usesResume, ayat, surahNo, syncResume]
  );

  const finishAndRedirect = useCallback(
    (msg: string) => {
      suppressSaveRef.current = true;
      clearResume(surahNo);
      syncResume(0); // clear on the server too
      celebrateSmall();
      toast.success(msg, { id: 'reader-done', duration: 2200 });
      // Finishing a duʿā returns to the DUA SECTION of the Quran home, not the
      // top of the page (Istiak: landing mid-page felt wrong).
      setTimeout(() => navigate(dua ? '/quran#duas' : '/quran'), 850);
    },
    [surahNo, navigate, syncResume, dua]
  );

  const goNext = useCallback(() => {
    stopAudio();
    if (idx < lastIdx) {
      markRead(idx); // moving past the current ayah = it was read
      goToIdx(idx + 1);
      return;
    }
    // At the last ayah of this view.
    if (mode === 'bundle') {
      finishAndRedirect(
        t('quranReader.bundleComplete', 'Complete — may it protect and bless you 🤲')
      );
      return;
    }
    // free / khatam / single reached the surah's end
    markRead(idx);
    flush(true); // credits the surah completion
    clearResume(surahNo);
    syncResume(0);
    if (mode === 'single') {
      finishAndRedirect(
        t('quranReader.singleComplete', '{{name}} complete 🌿', {
          name: surahMeta
            ? surahDisplayName(surahMeta, i18n.language)
            : t('quranReader.surah', 'Surah'),
        })
      );
      return;
    }
    if (surahNo < 114) {
      suppressSaveRef.current = true;
      celebrateSmall();
      toast.success(
        t('quranReader.surahDone', '{{name}} completed — onward! 🌿', {
          name: surahMeta
            ? surahDisplayName(surahMeta, i18n.language)
            : t('quranReader.surah', 'Surah'),
        }),
        { id: 'surah-done', duration: 2200 }
      );
      // REPLACE so Back returns to where you came from — not the finished surah
      // — and so you can't step back into the previous surah.
      navigate(`/quran/read/${surahNo + 1}?mode=${mode}`, { replace: true });
    } else {
      finishAndRedirect(t('quranReader.khatmComplete', 'Khatm complete — Allahu akbar! 🕋'));
      celebrateKhatm();
    }
  }, [
    idx,
    lastIdx,
    markRead,
    stopAudio,
    flush,
    mode,
    surahNo,
    surahMeta,
    navigate,
    goToIdx,
    finishAndRedirect,
    syncResume,
  ]);

  const goPrev = useCallback(() => {
    if (idx > firstIdx) goToIdx(idx - 1);
  }, [idx, firstIdx, goToIdx]);

  // ── Tafsir (authentic, from quran.com — NO AI anywhere in the Quran rooms) ──
  const ayahNo = current?.numberInSurah ?? 0;
  const tafsir = useTafsir(
    surahNo,
    ayahNo,
    tafsirEdition,
    (tafsirOpen || splitTafsir) && ayahNo > 0
  );
  const tafsirIsBn = TAFSIRS.find((tf) => tf.id === tafsirEdition)?.language === 'bn';
  // Calm long-form reading: warm ink (never pure white), generous line-height,
  // and a Bengali-friendly font stack when a বাংলা edition is selected.
  const tafsirTextStyle = {
    color: '#d6d0bf',
    fontSize: fs.tafsir,
    lineHeight: tafsirIsBn ? 2.15 : 1.95,
    ...(tafsirIsBn
      ? {
          fontFamily:
            "'Noto Sans Bengali', 'Hind Siliguri', 'Bangla Sangam MN', 'Vrinda', sans-serif",
        }
      : {}),
  } as const;
  const changeTafsirEdition = (id: number) => {
    setTafsirEdition(id);
    setPreferredTafsir(id);
  };

  // ── fullscreen + keyboard ──
  // Native requestFullscreen where available; iOS Safari has none, so the
  // `fullscreen` state ALWAYS drives a CSS fixed-inset fallback (the old
  // `.then()` on an undefined return value silently broke mobile).
  const toggleFullscreen = useCallback(() => {
    const el = cardRef.current;
    if (fullscreen) {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
      return;
    }
    try {
      const p = el?.requestFullscreen?.();
      if (p) p.catch(() => {});
    } catch {
      /* no native fullscreen — CSS fallback still applies */
    }
    setFullscreen(true);
  }, [fullscreen]);

  useEffect(() => {
    const onFsChange = () => {
      // Only native EXITS matter here (Esc / swipe) — entry is handled above.
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Split is a fullscreen-only mode; lock page scroll + drop the navbar under
  // the CSS-fallback overlay while fullscreen.
  useEffect(() => {
    if (!fullscreen) setSplitTafsir(false);
    const navbar = document.querySelector<HTMLElement>('nav');
    if (fullscreen) {
      if (navbar) navbar.style.zIndex = '0';
      document.body.style.overflow = 'hidden';
      // the page BEHIND the overlay could still spawn a horizontal scrollbar —
      // clamp the root element too (Istiak: h-scrollbar at the bottom persisted)
      document.documentElement.style.overflow = 'hidden';
    } else {
      if (navbar) navbar.style.zIndex = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      if (navbar) navbar.style.zIndex = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [fullscreen]);

  // Drag-to-resize the fullscreen split (desktop pointer or touch).
  const onDragStart = useCallback((e: ReactPointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const pct = Math.min(75, Math.max(25, (ev.clientX / window.innerWidth) * 100));
      setSplitPct(pct);
    };
    const onUp = () => {
      draggingRef.current = false;
      setSplitPct((v) => {
        localStorage.setItem('bustandeen_split_pct', String(Math.round(v)));
        return v;
      });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
      // Esc exits fullscreen natively
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, toggleFullscreen]);

  useEffect(() => stopAudio, [idx, stopAudio]); // stop when the ayah changes

  const isBookmarked = !!summary?.bookmarks?.some(
    (b) => b.surah === surahNo && b.ayah === (current?.numberInSurah ?? 0)
  );
  const todayCount = (summary?.todayAyat ?? 0) + pendingRef.current;
  const khatamPos =
    mode === 'khatam' && summary && surahs.length
      ? locateGlobalAyah(summary.profile.currentAyah, surahs)
      : null;

  const words = useMemo(() => (current ? current.arabic.split(' ') : []), [current]);

  return (
    <div className="min-h-screen bg-brand-void pb-16">
      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {/* top bar */}
        <div className="flex items-center justify-between text-xs">
          <button
            className="text-white/40 hover:text-white"
            onClick={() => {
              // Go back to wherever the reader was opened from; fall back to
              // the section home when the reader was the entry point.
              if (window.history.length > 1) navigate(-1);
              else navigate(mode === 'khatam' ? '/quran/khatam' : '/quran');
            }}
          >
            {t('quranReader.back', '← Back')}
          </button>
          <div className="flex items-center gap-2 text-white/40">
            {mode === 'khatam' && (
              <span className="px-2 py-0.5 rounded-full bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/30 font-bold">
                {t('quranReader.khatamJourney', 'Khatam journey')}
              </span>
            )}
            {(mode === 'bundle' || mode === 'single') && (
              <span className="px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold border border-brand-gold/30 font-bold">
                {t('quranReader.specialSelection', 'Special selection')}
              </span>
            )}
            <span className="hidden sm:inline">
              {t('quranReader.keyboardHint', '⌨️ ← → · F fullscreen')}
            </span>
          </div>
        </div>

        {/* info chips */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-brand-emerald/10 text-white/70 font-bold">
            {formatLocaleNumber(surahNo)}.{' '}
            {surahMeta ? surahDisplayName(surahMeta, i18n.language) : '…'}{' '}
            <span className="text-white/30">
              · {surahMeta ? formatLocaleNumber(surahMeta.numberOfAyahs) : '–'}{' '}
              {t('quranReader.ayahWord', 'āyāt')}
            </span>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-brand-emerald/10 text-white/50">
            {t('quranReader.juz', 'Juz')}{' '}
            {current ? formatLocaleNumber(juzOf(surahNo, current.numberInSurah)) : '–'}
          </span>
          {countsGoal ? (
            <span className="px-2.5 py-1 rounded-full bg-brand-emerald/10 border border-brand-emerald/25 text-brand-emerald font-bold">
              📖 {t('quranReader.todayCount', '{{count}} āyāt today', { count: todayCount })}
              {summary
                ? ` / ${t('quranReader.goalCount', '{{count}} goal', { count: summary.profile.dailyGoalAyat })}`
                : ''}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-white/5 border border-brand-emerald/10 text-white/40">
              🤲 {t('quranReader.reflectionNote', 'Reflection — not counted toward the goal')}
            </span>
          )}
          {khatamPos && (
            <span className="px-2.5 py-1 rounded-full bg-white/5 border border-brand-emerald/10 text-white/40">
              {t('quranReader.khatamAt', 'Khatam at {{surah}}:{{ayah}}', {
                surah: khatamPos.surah,
                ayah: khatamPos.ayah,
              })}
            </span>
          )}
          {!!user && !isDemoMode && (
            <span
              title={
                readingSession.isPaused
                  ? t('quranReader.timerPaused', "Paused — timer resumes when you're back")
                  : t('quranReader.timerActive', 'Active reading time this visit')
              }
              className={`px-2.5 py-1 rounded-full border font-bold tabular-nums transition-colors ${
                readingSession.isPaused
                  ? 'bg-white/5 border-brand-emerald/10 text-white/30'
                  : 'bg-white/5 border-brand-emerald/10 text-white/50'
              }`}
            >
              {readingSession.isPaused ? '⏸' : '⏱'} {formatReadingTime(readingSession.activeSec)}
            </span>
          )}
        </div>

        {/* ── THE CARD ──
            Fullscreen uses the `fullscreen` STATE (CSS fixed-inset) so it works
            on iOS too; native Fullscreen API is a progressive bonus. On mobile
            the split becomes a vertical stack — āyah first, tafsir below. */}
        <div
          ref={cardRef}
          className={`relative rounded-3xl border border-brand-emerald/10 bg-gradient-to-br from-[#0d1b17] via-[#0a1412] to-[#0d1420] ${fullscreen ? 'fixed inset-0 z-[9999] rounded-none flex flex-col md:flex-row overflow-y-auto overflow-x-hidden md:overflow-hidden' : 'overflow-hidden p-4 sm:p-10'}`}
        >
          {/* controls — in-flow row on phones (they overlapped the āyah header),
              floating top-right from sm up */}
          <div
            className={`flex items-center justify-end gap-2 z-20 ${fullscreen ? 'absolute top-3 right-3 sm:top-4 sm:right-4' : 'sm:absolute sm:top-4 sm:right-4 mb-2 sm:mb-0'}`}
          >
            {/* in-app zoom — works in the card AND fullscreen (Istiak's spec) */}
            <div className="flex items-center rounded-full bg-white/5 border border-brand-emerald/10 overflow-hidden">
              <button
                aria-label={t('quranReader.zoomOut', 'Zoom out')}
                onClick={() => changeZoom(-0.1)}
                disabled={zoom <= 0.8}
                className="w-8 h-9 sm:h-10 grid place-items-center text-white/50 hover:text-white disabled:opacity-25 text-base font-black"
              >
                −
              </button>
              <button
                aria-label={t('quranReader.resetZoom', 'Reset zoom')}
                title={t('quranReader.resetZoom', 'Reset zoom')}
                onClick={() => changeZoom(0)}
                className={`px-1 text-[10px] font-bold tabular-nums ${zoom === 1 ? 'text-white/25' : 'text-brand-emerald'}`}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                aria-label={t('quranReader.zoomIn', 'Zoom in')}
                onClick={() => changeZoom(0.1)}
                disabled={zoom >= 1.8}
                className="w-8 h-9 sm:h-10 grid place-items-center text-white/50 hover:text-white disabled:opacity-25 text-base font-black"
              >
                ＋
              </button>
            </div>
            <button
              aria-label={
                playing
                  ? t('quranReader.stopRecitation', 'Stop recitation')
                  : t('quranReader.reciteAyah', 'Recite this ayah')
              }
              title={t('quranReader.reciteOnlyThis', 'Recite only this ayah')}
              onClick={playAyah}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center border transition-all ${playing ? 'bg-brand-emerald text-white border-brand-emerald' : 'bg-white/5 text-brand-emerald border-brand-emerald/10 hover:border-brand-emerald/50'}`}
            >
              {playing ? (
                <PauseIcon className="w-4 h-4" />
              ) : (
                <PlayIcon className="w-4 h-4 ml-0.5" />
              )}
            </button>
            {user && (
              <button
                aria-label={
                  isBookmarked
                    ? t('quranReader.removeBookmark', 'Remove bookmark')
                    : t('quranReader.bookmarkAyah', 'Bookmark this ayah')
                }
                onClick={() =>
                  current && toggleBookmark.mutate({ surah: surahNo, ayah: current.numberInSurah })
                }
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center border bg-white/5 border-brand-emerald/10 text-brand-gold hover:border-brand-gold/50"
              >
                {isBookmarked ? (
                  <BookmarkSolid className="w-4 h-4" />
                ) : (
                  <BookmarkOutline className="w-4 h-4" />
                )}
              </button>
            )}
            {current && (
              <button
                aria-label={t('shareAyah.shareButton', 'Share as image')}
                title={t('shareAyah.shareButton', 'Share as image')}
                onClick={() => setShareOpen(true)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center border bg-white/5 border-brand-emerald/10 text-white/50 hover:text-white hover:border-brand-emerald/50"
              >
                <ShareIcon className="w-4 h-4" />
              </button>
            )}
            {/* fullscreen-only: open the tafsir (split on desktop, stacked below on mobile) */}
            {fullscreen && (
              <button
                aria-label={
                  splitTafsir
                    ? t('quranReader.hideTafsir', 'Hide tafsir')
                    : t('quranReader.readTafsir', 'Read tafsir')
                }
                title={t('quranReader.tafsir', 'Tafsir')}
                onClick={() => setSplitTafsir((v) => !v)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center border transition-all ${splitTafsir ? 'bg-brand-emerald/20 text-brand-emerald border-brand-emerald/50' : 'bg-white/5 text-white/60 border-brand-emerald/10 hover:text-white'}`}
              >
                <BookOpenIcon className="w-4 h-4" />
              </button>
            )}
            <button
              aria-label={
                fullscreen
                  ? t('quranReader.exitFullscreen', 'Exit fullscreen')
                  : t('quranReader.fullscreen', 'Fullscreen')
              }
              onClick={toggleFullscreen}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center border bg-white/5 border-brand-emerald/10 text-white/50 hover:text-white"
            >
              {fullscreen ? (
                <ArrowsPointingInIcon className="w-4 h-4" />
              ) : (
                <ArrowsPointingOutIcon className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* LEFT pane (the āyah + meaning). Fullscreen desktop: resizable width; mobile: full-width block. */}
          <div
            className={
              fullscreen
                ? `relative md:h-full grid place-items-center md:overflow-y-auto p-6 pt-16 sm:p-12 w-full shrink-0 md:shrink ${splitTafsir ? 'md:border-r md:border-brand-emerald/15 min-h-[70vh] md:min-h-0 md:w-[var(--split)]' : ''}`
                : 'contents'
            }
            style={
              fullscreen && splitTafsir
                ? ({ '--split': `${splitPct}%` } as CSSProperties)
                : undefined
            }
          >
            {loading || !current ? (
              <div className="min-h-[40vh] grid place-items-center">
                <span className="loading loading-spinner loading-lg text-brand-emerald" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.number}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className={`${fullscreen ? 'max-w-4xl' : ''} w-full text-center space-y-6 sm:space-y-8 pt-2 sm:pt-8`}
                >
                  <div className="space-y-0.5">
                    <p className="text-white/25 text-xs font-bold tracking-widest">
                      {surahMeta?.name} ·{' '}
                      <span className="text-brand-emerald/80 text-sm">
                        {formatLocaleNumber(current.numberInSurah)}
                      </span>
                      <span className="text-white/20">
                        /{surahMeta ? formatLocaleNumber(surahMeta.numberOfAyahs) : ''}
                      </span>
                    </p>
                    {surahMeta?.englishNameTranslation && (
                      <p className="text-white/30 text-[11px]">
                        {surahDisplayName(surahMeta, i18n.language)} — “
                        {surahMeaningDisplay(surahMeta, i18n.language)}”
                      </p>
                    )}
                  </div>

                  {/* Arabic — word hover highlight; timed highlight while reciting */}
                  <p
                    dir="rtl"
                    lang="ar"
                    className="leading-[2.1] text-[#e8e2d0]"
                    style={{ fontSize: fs.arabic, fontFamily: arabicFont.stack }}
                  >
                    {words.map((w, i) => (
                      <span
                        key={i}
                        className={`transition-colors duration-150 rounded px-0.5 cursor-default ${playing && i === wordIdx ? 'bg-brand-emerald/30 text-white' : 'hover:bg-white/10'}`}
                      >
                        {w}{' '}
                      </span>
                    ))}
                  </p>

                  {/* Transliteration — Latin pronunciation aid (optional) */}
                  {showTranslit && current.transliteration && (
                    <p
                      className="text-brand-gold/60 italic leading-relaxed max-w-2xl mx-auto"
                      style={{ fontSize: fs.translit }}
                    >
                      {current.transliteration}
                    </p>
                  )}

                  <div className="space-y-3 max-w-2xl mx-auto">
                    {current.translations.map((tr, i) => (
                      <p
                        key={editions[i] ?? i}
                        className={`${i === 0 ? 'text-white/60' : 'text-brand-info/50'} leading-relaxed`}
                        style={{ fontSize: fs.translation }}
                      >
                        {tr}
                      </p>
                    ))}
                  </div>
                  <p className="text-white/20 text-[10px]">
                    {editions.map(editionLabel).join(' · ')} ·{' '}
                    <a
                      className="underline"
                      href={`https://quran.com/${surahNo}/${current.numberInSurah}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      quran.com/{surahNo}/{current.numberInSurah}
                    </a>
                  </p>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Prev/Next stay IN FLOW. They used to be md:absolute with
              left-8/right-8 in fullscreen, which is measured against the
              nearest positioned ancestor — with the tafsir split that is not
              the reading pane, so the row overflowed and "Next" sat off-screen
              behind a horizontal scroll. In-flow + min-w-0 + shrink can't
              overflow regardless of pane width. */}
            {!loading && current && (
              <div
                className={`flex items-center justify-between gap-3 w-full max-w-4xl mx-auto mt-8 ${fullscreen ? 'md:mt-6' : ''}`}
              >
                <button
                  aria-label={t('quranReader.previousAyah', 'Previous ayah')}
                  onClick={goPrev}
                  disabled={idx <= firstIdx}
                  className="flex items-center gap-1.5 min-w-0 px-4 py-2.5 rounded-2xl bg-white/5 border border-brand-emerald/10 text-white/60 hover:text-white disabled:opacity-20 text-sm font-bold"
                >
                  <ChevronLeftIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t('quranReader.previous', 'Previous')}</span>
                </button>
                <button
                  aria-label={t('quranReader.nextAyah', 'Next ayah')}
                  onClick={goNext}
                  className="flex items-center gap-1.5 min-w-0 px-5 py-2.5 rounded-2xl bg-brand-emerald/90 hover:bg-brand-emerald text-white text-sm font-black border-0"
                >
                  <span className="truncate">
                    {idx >= lastIdx
                      ? mode === 'bundle'
                        ? t('quranReader.finishDua', 'Finish 🤲')
                        : mode === 'single'
                          ? t('quranReader.finishLeaf', 'Finish 🌿')
                          : surahNo < 114
                            ? t('quranReader.nextSurah', 'Next surah')
                            : t('quranReader.finish', 'Finish')
                      : t('quranReader.next', 'Next')}
                  </span>
                  <ChevronRightIcon className="w-4 h-4 shrink-0" />
                </button>
              </div>
            )}
          </div>
          {/* end left pane */}

          {/* drag handle — desktop fullscreen split only */}
          {fullscreen && splitTafsir && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label={t('quranReader.resizeTafsirPane', 'Resize the tafsir pane')}
              onPointerDown={onDragStart}
              className="hidden md:flex items-center justify-center w-3 -mx-1.5 h-full cursor-col-resize z-30 group shrink-0"
            >
              <div className="w-1 h-16 rounded-full bg-white/15 group-hover:bg-brand-emerald/60 transition-colors" />
            </div>
          )}

          {/* TAFSIR pane — beside the āyah on desktop, stacked below on mobile.
              Calm long-form reading: warm surface, warm ink, roomy line-height. */}
          {fullscreen && splitTafsir && (
            <div className="w-full md:flex-1 md:h-full md:overflow-y-auto bg-[#1a1812] px-5 sm:px-8 pb-10 pt-4 md:pt-6 border-t border-brand-gold/5 md:border-t-0">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-2 mb-3 md:sticky md:top-0 bg-[#1a1812]/95 backdrop-blur md:-mt-2 md:pt-2 pb-2 z-10">
                  <BookOpenIcon className="w-4 h-4 text-brand-gold/60 shrink-0" />
                  <select
                    aria-label={t('quranReader.tafsirEdition', 'Tafsir edition')}
                    className="select select-xs flex-1 max-w-xs bg-white/5 border-brand-gold/10 text-white/80 rounded-lg"
                    value={tafsirEdition}
                    onChange={(e) => changeTafsirEdition(Number(e.target.value))}
                  >
                    <optgroup label={t('quranReader.tafsirEnglish', 'English')}>
                      {TAFSIRS.filter((tf) => tf.language === 'en').map((tf) => (
                        <option key={tf.id} value={tf.id}>
                          {tf.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t('quranReader.tafsirBengali', 'বাংলা (Bengali)')}>
                      {TAFSIRS.filter((tf) => tf.language === 'bn').map((tf) => (
                        <option key={tf.id} value={tf.id}>
                          {tf.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                {tafsir.isLoading ? (
                  <div className="py-10 grid place-items-center">
                    <span className="loading loading-spinner text-brand-emerald" />
                  </div>
                ) : tafsir.isError ? (
                  <p className="text-white/50 text-sm">
                    {t(
                      'quranReader.tafsirLoadErrorShort',
                      "Couldn't load this tafsir — try another edition."
                    )}
                  </p>
                ) : (
                  <>
                    <p className="text-brand-gold/50 text-xs font-bold mb-3">
                      {formatLocaleNumber(surahNo)}:{formatLocaleNumber(ayahNo)} ·{' '}
                      {tafsir.data?.resourceName}
                    </p>
                    <div className={`whitespace-pre-line`} style={tafsirTextStyle}>
                      {tafsir.data?.text}
                    </div>
                    <p className="text-white/25 text-[10px] mt-4">
                      {t('quranReader.sourcedFromPrefix', 'Sourced from')}{' '}
                      <a
                        className="underline"
                        href={tafsir.data?.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        quran.com
                      </a>{' '}
                      — {t('quranReader.authenticUnedited', 'authentic, unedited.')}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* bottom controls: jump (left) · volume (right) */}
        {!loading && ayat.length > 0 && (
          <div className="flex items-center justify-between gap-3 text-xs text-white/40">
            {/* Khatam must be read serially — a jump dropdown here would let
                ayat get skipped without being counted, breaking the "read
                every āyah in order" invariant the khatam count relies on.
                Bundle mode already had no jump control; khatam now matches. */}
            {mode !== 'bundle' && mode !== 'khatam' ? (
              <div className="flex items-center gap-2">
                <label htmlFor="jump-ayah" className="font-bold">
                  {t('quranReader.jumpToAyah', 'Jump to āyah')}
                </label>
                <select
                  id="jump-ayah"
                  className="select select-xs bg-white/5 border-brand-emerald/10 text-white/70 rounded-lg"
                  value={idx + 1}
                  onChange={(e) => goToIdx(Number(e.target.value) - 1)}
                >
                  {ayat.map((a) => (
                    <option key={a.number} value={a.numberInSurah}>
                      {a.numberInSurah}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span />
            )}

            {/* volume control (defaults to 40%) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                aria-label={
                  volume === 0
                    ? t('quranReader.volumeOff', 'Volume off')
                    : t('quranReader.volume', 'Volume')
                }
                className="text-white/50 hover:text-white"
                onClick={() => changeVolume(volume === 0 ? 0.4 : 0)}
              >
                {volume === 0 ? (
                  <SpeakerXMarkIcon className="w-4 h-4" />
                ) : (
                  <SpeakerWaveIcon className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                aria-label={t('quranReader.recitationVolume', 'Recitation volume')}
                onChange={(e) => changeVolume(Number(e.target.value) / 100)}
                className="range range-xs w-24 [--range-shdw:theme(colors.emerald.400)]"
              />
            </div>
          </div>
        )}

        {/* ── Tafsir (authentic, sourced — the Quran rooms carry NO AI) ── */}
        {!loading && current && user && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setTafsirOpen((o) => !o)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold border transition-all ${tafsirOpen ? 'bg-brand-emerald/15 border-brand-emerald/30 text-brand-emerald' : 'bg-white/5 border-brand-emerald/10 text-white/70 hover:text-white'}`}
              >
                <BookOpenIcon className="w-4 h-4" /> {t('quranReader.tafsir', 'Tafsir')}
              </button>
              {dua?.context && (
                <button
                  onClick={() => setContextOpen((o) => !o)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold border transition-all ${contextOpen ? 'bg-brand-gold/15 border-brand-gold/30 text-brand-gold' : 'bg-white/5 border-brand-emerald/10 text-white/70 hover:text-white'}`}
                >
                  📜 {t('quranReader.whyThisDua', 'Why this duʿā')}
                </button>
              )}
            </div>

            {/* The story & evidence behind this duʿā (verified reference) */}
            {contextOpen && dua?.context && (
              <div className="rounded-2xl border border-brand-gold/15 bg-[#211f16] p-4 sm:p-5 space-y-2.5">
                <p className="text-brand-gold/80 text-xs font-black">
                  {dua.emoji} {i18n.language === 'bn' && dua.titleBn ? dua.titleBn : dua.title}
                </p>
                <p className="text-[#d8d0b8] text-sm leading-relaxed">
                  {i18n.language === 'bn' && dua.context.textBn
                    ? dua.context.textBn
                    : dua.context.text}
                </p>
                <a
                  className="inline-block text-brand-gold/60 text-[11px] underline hover:text-brand-gold"
                  href={dua.context.ref.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference(dua.context.ref.text, i18n.language)} ↗
                </a>
              </div>
            )}

            {/* Calm reading surface: warm dark ground + warm ink, never pure white */}
            {tafsirOpen && (
              <div className="rounded-2xl border border-brand-gold/10 bg-[#1a1812] p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <select
                    aria-label={t('quranReader.tafsirEdition', 'Tafsir edition')}
                    className="select select-xs flex-1 bg-white/5 border-brand-gold/10 text-white/80 rounded-lg"
                    value={tafsirEdition}
                    onChange={(e) => changeTafsirEdition(Number(e.target.value))}
                  >
                    <optgroup label={t('quranReader.tafsirEnglish', 'English')}>
                      {TAFSIRS.filter((tf) => tf.language === 'en').map((tf) => (
                        <option key={tf.id} value={tf.id}>
                          {tf.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t('quranReader.tafsirBengali', 'বাংলা (Bengali)')}>
                      {TAFSIRS.filter((tf) => tf.language === 'bn').map((tf) => (
                        <option key={tf.id} value={tf.id}>
                          {tf.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <button
                    className="text-white/40 hover:text-white text-xs shrink-0"
                    onClick={() => setTafsirOpen(false)}
                  >
                    {t('quranReader.close', 'Close')}
                  </button>
                </div>

                {tafsir.isLoading ? (
                  <div className="py-6 grid place-items-center">
                    <span className="loading loading-spinner text-brand-emerald" />
                  </div>
                ) : tafsir.isError ? (
                  <p className="text-white/50 text-sm py-2">
                    {t(
                      'quranReader.tafsirLoadErrorLong',
                      "Couldn't load this tafsir — check your connection or try another edition."
                    )}
                  </p>
                ) : (
                  <>
                    <div
                      className={`max-h-96 overflow-y-auto pr-2 whitespace-pre-line`}
                      style={tafsirTextStyle}
                    >
                      {tafsir.data?.text}
                    </div>
                    <p className="text-white/30 text-[10px]">
                      📖 {tafsir.data?.resourceName} ·{' '}
                      {t('quranReader.sourcedFromLower', 'sourced from')}{' '}
                      <a
                        className="underline"
                        href={tafsir.data?.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        quran.com
                      </a>{' '}
                      — {t('quranReader.authenticUnedited', 'authentic, unedited.')}
                      <span className="mx-1.5">·</span>
                      <a
                        className="underline text-white/20 hover:text-brand-emerald/60"
                        href="/feedback"
                      >
                        {t('quranReader.reportReferenceIssue', 'Report a reference issue')}
                      </a>
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Continue where you left off? ── */}
      <AnimatePresence>
        {resumeAyah !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 8 }}
              transition={{ type: 'spring', damping: 24 }}
              className="w-full max-w-xs rounded-2xl bg-brand-deep border border-brand-emerald/25 p-5 text-center"
              role="alertdialog"
              aria-modal="true"
            >
              <div className="text-3xl mb-2">📖</div>
              <h3 className="text-white font-black text-base">
                {t('quranReader.continueReading', 'Continue reading?')}
              </h3>
              <p className="text-white/50 text-xs mt-1.5 leading-relaxed">
                {t('quranReader.leftOffAt', 'You left {{name}} at āyah', {
                  name: surahMeta
                    ? surahDisplayName(surahMeta, i18n.language)
                    : t('quranReader.thisSurah', 'this surah'),
                })}{' '}
                <b className="text-brand-emerald">{resumeAyah}</b>.{' '}
                {t(
                  'quranReader.pickUpOrRestart',
                  'Pick up from there, or start over from the beginning.'
                )}
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  className="flex-1 btn btn-sm rounded-xl bg-white/5 border-brand-emerald/10 text-white/70"
                  onClick={() => {
                    clearResume(surahNo);
                    syncResume(0);
                    setIdx(0);
                    setResumeAyah(null);
                  }}
                >
                  {t('quranReader.startOver', 'Start over')}
                </button>
                <button
                  className="flex-1 btn btn-sm rounded-xl border-0 text-white font-bold bg-gradient-to-r from-brand-emerald to-brand-info"
                  onClick={() => {
                    setIdx(Math.min(ayat.length - 1, resumeAyah - 1));
                    setResumeAyah(null);
                  }}
                >
                  {t('quranReader.continue', 'Continue')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {current && (
        <ShareAyahModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          surahNo={surahNo}
          surahMeta={surahMeta}
          ayahNumberInSurah={current.numberInSurah}
          initialEditions={editions}
          initialTranslit={showTranslit}
        />
      )}
    </div>
  );
}
