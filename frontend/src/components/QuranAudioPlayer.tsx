import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { PlayIcon, PauseIcon, ForwardIcon, BackwardIcon } from '@heroicons/react/24/solid';
import { useAuthStore } from '../store/useAuthStore.js';
import { useReadAyat } from '../hooks/useQuran.js';
import { useQuranReadingSession } from '../hooks/useQuranReadingSession.js';
import {
  loadSurahList,
  surahDisplayName,
  surahMeaningDisplay,
  type SurahMeta,
} from '../utils/quranData.js';
import { listenCountsAsAyat } from '../utils/quranPrefs.js';

function formatListeningTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * 🎧 Audio Quran — all 114 surahs, streamed from the free Islamic Network CDN
 * (the audio backend of alquran.cloud; no storage cost on our side).
 *
 * LISTENING AUTO-LOG (v4.3, ayah units): listening feeds the SAME āyah goal
 * as reading. As you listen, we convert real listened time into āyāt using
 * the surah's own length (numberOfAyahs ÷ track duration), so a full listen
 * logs ≈ the surah's āyah count — finally fine-grained enough for a 1-āyah
 * goal. Seeks/jumps are ignored. This is also how Rayhanah users keep their
 * Quran connection — and their Noor — alive.
 */

// Full-surah audio only exists for some editions on each CDN — every entry
// here was verified (HTTP 200) against its host. islamic.network takes the
// plain surah number; mp3quran.net wants it zero-padded to 3 digits.
const RECITERS: Array<{ id: string; name: string; url: (n: number) => string }> = [
  // Priority pair (Istiak's spec): Yasser Al-Dossari default, Alafasy second.
  {
    id: 'dossari',
    name: 'Yasser Al-Dossari',
    url: (n) => `https://server11.mp3quran.net/yasser/${String(n).padStart(3, '0')}.mp3`,
  },
  {
    id: 'alafasy',
    name: 'Mishary Alafasy',
    url: (n) => `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${n}.mp3`,
  },
  {
    id: 'abdulbasit',
    name: 'Abdul Basit (Murattal)',
    url: (n) => `https://cdn.islamic.network/quran/audio-surah/128/ar.abdulbasitmurattal/${n}.mp3`,
  },
  {
    id: 'husary',
    name: 'Mahmoud Al-Husary',
    url: (n) => `https://server13.mp3quran.net/husr/${String(n).padStart(3, '0')}.mp3`,
  },
  {
    id: 'sudais',
    name: 'Abdur-Rahman As-Sudais',
    url: (n) => `https://server11.mp3quran.net/sds/${String(n).padStart(3, '0')}.mp3`,
  },
  {
    id: 'maher',
    name: 'Maher Al-Muaiqly',
    url: (n) => `https://server12.mp3quran.net/maher/${String(n).padStart(3, '0')}.mp3`,
  },
  {
    id: 'minshawi',
    name: 'Muhammad Al-Minshawi',
    url: (n) => `https://server10.mp3quran.net/minsh/${String(n).padStart(3, '0')}.mp3`,
  },
];

function fmtClock(sec: number): string {
  if (!Number.isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function QuranAudioPlayer() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const readAyat = useReadAyat();

  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [surahNo, setSurahNo] = useState<number>(
    () => Number(localStorage.getItem('bustandeen_last_surah')) || 1
  );
  const [reciter, setReciter] = useState<string>(() => {
    const stored = localStorage.getItem('bustandeen_reciter') || 'dossari';
    return RECITERS.some((r) => r.id === stored) ? stored : 'dossari';
  });
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [volume, setVolume] = useState<number>(() => {
    const raw = localStorage.getItem('bustandeen_quran_volume');
    const v = Number(raw);
    // Default 40% (Istiak's spec) when nothing is stored yet
    return raw !== null && Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.4;
  });
  const [muted, setMuted] = useState(false);

  // A listening session runs for as long as this component is mounted
  // (the whole Listen page visit), driven by whether audio is ACTUALLY
  // playing — not tab visibility/idle (background/screen-off playback should
  // still count, unlike the Reader where those signal "walked away").
  const readingSession = useQuranReadingSession({
    source: 'listen',
    isActiveOverride: playing,
    enabled: !!user && !isDemoMode,
  });
  const { registerSurah, registerAyahRead } = readingSession;
  useEffect(() => {
    registerSurah(surahNo);
  }, [registerSurah, surahNo]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Listening accumulators — survive pause, reset when the surah changes.
  const listenedRef = useRef(0); // total continuous seconds this surah
  const loggedAyatRef = useRef(0); // āyāt already logged this surah
  const lastTimeRef = useRef(0);

  useEffect(() => {
    let alive = true;
    loadSurahList()
      .then((list) => {
        if (alive) setSurahs(list);
      })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const surah = useMemo(() => surahs.find((s) => s.number === surahNo) ?? null, [surahs, surahNo]);
  const src = (RECITERS.find((r) => r.id === reciter) ?? RECITERS[0]!).url(surahNo);

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    setProgress(a.currentTime);
    // Count only continuous listening (ignore seeks/jumps > 2s)
    const delta = a.currentTime - lastTimeRef.current;
    if (delta > 0 && delta <= 2) {
      listenedRef.current += delta;
      // Convert listened seconds into āyāt using THIS surah's own length.
      const total = surah?.numberOfAyahs ?? 0;
      const dur = a.duration;
      if (user && total > 0 && Number.isFinite(dur) && dur > 0 && listenCountsAsAyat()) {
        const target = Math.min(total, Math.floor((listenedRef.current / dur) * total));
        const diff = target - loggedAyatRef.current;
        if (diff >= 1) {
          loggedAyatRef.current = target;
          registerAyahRead(diff);
          readAyat.mutate({ count: diff });
          toast.success(
            t('quranAudioPlayer.ayahLogged', {
              count: diff,
              defaultValue: '🎧 +{{count}} āyah(s) logged toward your goal',
            }),
            {
              id: 'quran-listen',
              duration: 2000,
            }
          );
        }
      }
    }
    lastTimeRef.current = a.currentTime;
  };

  useEffect(() => {
    const a = audioRef.current;
    if (a) {
      a.volume = volume;
      a.muted = muted;
    }
  }, [volume, muted]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
    if (playing) {
      a.pause();
    } else {
      void a.play();
    }
  };

  const changeSurah = (n: number) => {
    const clamped = Math.min(114, Math.max(1, n));
    setSurahNo(clamped);
    localStorage.setItem('bustandeen_last_surah', String(clamped));
    setProgress(0);
    lastTimeRef.current = 0;
    listenedRef.current = 0;
    loggedAyatRef.current = 0;
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const t = (Number(e.target.value) / 100) * duration;
    a.currentTime = t;
    lastTimeRef.current = t; // don't count the jump as listening
    setProgress(t);
  };

  return (
    <div className="card bg-gradient-to-br from-brand-info/10 to-brand-deep border border-brand-info/20 rounded-3xl">
      <div className="card-body p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-black">
            🎧 {t('quranAudioPlayer.title', 'Listen to the Quran')}
          </h2>
          <select
            aria-label={t('quranAudioPlayer.reciterLabel', 'Reciter')}
            className="select select-xs bg-white/5 border-brand-emerald/10 text-white/70 rounded-lg max-w-[45%]"
            value={reciter}
            onChange={(e) => {
              setReciter(e.target.value);
              localStorage.setItem('bustandeen_reciter', e.target.value);
            }}
          >
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {loadError ? (
          <p className="text-white/40 text-xs">
            {t(
              'quranAudioPlayer.loadError',
              "Couldn't load the surah list — check your connection and reload."
            )}
          </p>
        ) : (
          <>
            <select
              aria-label={t('quranAudioPlayer.surahLabel', 'Surah')}
              className="select select-sm w-full bg-white/5 border-brand-emerald/10 text-white rounded-xl"
              value={surahNo}
              onChange={(e) => changeSurah(Number(e.target.value))}
            >
              {(surahs.length
                ? surahs
                : [
                    {
                      number: 1,
                      name: '',
                      englishName: 'Al-Fatihah',
                      englishNameTranslation: 'The Opener',
                      numberOfAyahs: 7,
                    },
                  ]
              ).map((s) => (
                <option key={s.number} value={s.number}>
                  {s.number}. {surahDisplayName(s, i18n.language)} —{' '}
                  {surahMeaningDisplay(s, i18n.language)} ({s.numberOfAyahs} āyāt)
                </option>
              ))}
            </select>

            {surah && (
              <p className="text-center text-2xl text-brand-info/90 font-serif" dir="rtl">
                {surah.name}
              </p>
            )}

            {!!user && !isDemoMode && (
              <p className="text-center">
                <span
                  title={
                    readingSession.isPaused
                      ? t('quranAudioPlayer.timerPaused', 'Paused — press play to keep counting')
                      : t('quranAudioPlayer.timerActive', 'Active listening time this visit')
                  }
                  className="inline-block px-2.5 py-1 rounded-full border border-brand-info/10 bg-white/5 text-white/40 text-[11px] font-bold tabular-nums"
                >
                  {readingSession.isPaused ? '⏸' : '⏱'}{' '}
                  {formatListeningTime(readingSession.activeSec)}
                </span>
              </p>
            )}

            {/* transport */}
            <div className="flex items-center justify-center gap-4">
              <button
                aria-label={t('quranAudioPlayer.previousSurah', 'Previous surah')}
                className="p-2 text-white/50 hover:text-white disabled:opacity-20"
                disabled={surahNo <= 1}
                onClick={() => changeSurah(surahNo - 1)}
              >
                <BackwardIcon className="w-5 h-5" />
              </button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                aria-label={
                  playing
                    ? t('quranAudioPlayer.pause', 'Pause')
                    : t('quranAudioPlayer.play', 'Play')
                }
                className="w-14 h-14 rounded-full grid place-items-center text-white shadow-lg bg-gradient-to-br from-brand-info to-brand-emerald-dim"
                onClick={togglePlay}
              >
                {buffering ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : playing ? (
                  <PauseIcon className="w-6 h-6" />
                ) : (
                  <PlayIcon className="w-6 h-6 ml-0.5" />
                )}
              </motion.button>
              <button
                aria-label={t('quranAudioPlayer.nextSurah', 'Next surah')}
                className="p-2 text-white/50 hover:text-white disabled:opacity-20"
                disabled={surahNo >= 114}
                onClick={() => changeSurah(surahNo + 1)}
              >
                <ForwardIcon className="w-5 h-5" />
              </button>
            </div>

            {/* progress */}
            <div className="flex items-center gap-2 text-[10px] text-white/30">
              <span className="w-9 text-right">{fmtClock(progress)}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                aria-label={t('quranAudioPlayer.seek', 'Seek')}
                value={duration ? (progress / duration) * 100 : 0}
                onChange={seek}
                className="range range-xs flex-1 [--range-shdw:theme(colors.brand.info)]"
              />
              <span className="w-9">{fmtClock(duration)}</span>
            </div>

            {/* sound control */}
            <div className="flex items-center gap-2 text-white/40">
              <button
                aria-label={
                  muted
                    ? t('quranAudioPlayer.unmute', 'Unmute')
                    : t('quranAudioPlayer.mute', 'Mute')
                }
                className="text-sm w-6"
                onClick={() => setMuted((m) => !m)}
              >
                {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : Math.round(volume * 100)}
                aria-label={t('quranAudioPlayer.volume', 'Volume')}
                onChange={(e) => {
                  const v = Number(e.target.value) / 100;
                  setVolume(v);
                  setMuted(v === 0);
                  localStorage.setItem('bustandeen_quran_volume', String(v));
                }}
                className="range range-xs w-32 [--range-shdw:theme(colors.brand.info)]"
              />
            </div>

            <audio
              ref={audioRef}
              src={src}
              preload="none"
              onPlay={() => {
                setPlaying(true);
                setBuffering(false);
              }}
              onPause={() => setPlaying(false)}
              onWaiting={() => setBuffering(true)}
              onPlaying={() => setBuffering(false)}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
              onEnded={() => setPlaying(false)} // one surah at a time — no autoplay (Istiak's spec)
            />

            <p className="text-white/30 text-[10px] leading-relaxed">
              {t('quranAudioPlayer.loggedIntro', 'As you listen, āyāt are logged toward your')}{' '}
              <b className="text-white/50">{t('quranAudioPlayer.dailyGoal', 'daily goal')}</b>{' '}
              {t('quranAudioPlayer.andStreak', 'and streak')}
              {!user && ` ${t('quranAudioPlayer.signInToSave', '(sign in to save it)')}`}{' '}
              {t(
                'quranAudioPlayer.loggedTail',
                "— counted from each surah's own length. Recitation streamed free from the Islamic Network CDN."
              )}
              {user?.gender === 'female' && (
                <>
                  {' '}
                  🌸{' '}
                  {t(
                    'quranAudioPlayer.rayhanahNote',
                    'During Rayhanah days, listening keeps your Quran connection — and your Noor — alive.'
                  )}
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
