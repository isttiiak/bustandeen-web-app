import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE, getIdToken } from '../lib/api.js';
import { getTrackingDay } from '../utils/trackingDay.js';

const TICK_MS = 1000;
const SAVE_INTERVAL_MS = 20_000;
// No interaction (scroll/tap/key) for this long pauses the timer — handles
// "opened the app and walked away" without cutting off normal reading.
const IDLE_TIMEOUT_MS = 2 * 60 * 1000;
// Reading tafsir often means minutes of stillness while actually reading —
// a generous grace period so that doesn't get mistaken for being away.
const IDLE_TIMEOUT_TAFSIR_MS = 5 * 60 * 1000;
// Visits shorter than this aren't worth a session row (accidental taps into
// the reader while navigating past it).
const MIN_SESSION_SEC_TO_SAVE = 5;

function randomSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface SessionSavePayload {
  clientSessionId: string;
  date: string;
  startedAt: string;
  endedAt: string;
  activeDurationSec: number;
  ayahCount: number;
  pagesRead: number;
  surahs: number[];
  source: 'read' | 'listen';
}

/** Mirrors useZikrStore's flush(): a plain `fetch` (not the axios instance)
 * so `keepalive` can survive page unload, with the cached token as a fallback
 * when there's no time left for Firebase's async refresh. */
async function postSession(payload: SessionSavePayload, keepalive: boolean): Promise<void> {
  const idToken = keepalive ? localStorage.getItem('bustandeen_idToken') : await getIdToken();
  if (!idToken) return;
  try {
    await fetch(`${API_BASE}/api/quran/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(payload),
      keepalive,
    });
  } catch {
    // Best-effort — the next periodic save (or the next visit's session)
    // picks up where this left off; nothing here is worth surfacing to the user.
  }
}

export interface UseQuranReadingSessionOptions {
  /** Extends the idle grace period — pass true while the tafsir panel is open.
   * Ignored when `isActiveOverride` is set. */
  extendedIdle?: boolean;
  /** Set false to stop tracking entirely (guests, demo mode). */
  enabled?: boolean;
  /** Tag stored with the session so read/listen sessions stay distinguishable
   * in shared session history. Defaults to 'read'. */
  source?: 'read' | 'listen';
  /** When provided, THIS drives active/paused state directly instead of the
   * idle/visibility heuristic — e.g. the Listen page passes whether audio is
   * currently playing, since background/screen-off playback should still
   * count as active (visibility/idle detection would wrongly pause it). */
  isActiveOverride?: boolean;
  /** Hard pause: time doesn't accrue while true, whatever else is going on
   * (e.g. the āyah share modal is open, so card-designing isn't counted as
   * reading). Resumes on its own when it goes back to false. */
  paused?: boolean;
}

export interface QuranReadingSessionHandle {
  /** Active reading seconds accumulated so far this visit (idle/hidden time excluded). */
  activeSec: number;
  /** True while the timer isn't advancing (tab hidden or idle). */
  isPaused: boolean;
  registerAyahRead: (count: number) => void;
  registerSurah: (surah: number) => void;
}

/**
 * Tracks one continuous reading visit as a single session: counts only
 * ACTIVE time (tab visible AND recently interacted with), checkpoints it to
 * the backend periodically, and finalizes on teardown. A visit stays one
 * session across surah navigation within the Reader — it only ends when the
 * component unmounts (leaving the Reader) or the tab is closed.
 */
export function useQuranReadingSession(
  options: UseQuranReadingSessionOptions = {}
): QuranReadingSessionHandle {
  const {
    extendedIdle = false,
    enabled = true,
    source = 'read',
    isActiveOverride,
    paused: forcedPause = false,
  } = options;
  const usesOverride = isActiveOverride !== undefined;

  const [activeSec, setActiveSec] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const clientSessionIdRef = useRef<string>(randomSessionId());
  const startedAtRef = useRef<Date>(new Date());
  // The last moment the clock actually advanced. A session's end time must be
  // this, not "whenever it happened to be saved": teardown/visibility saves
  // fire when the user comes back (e.g. wakes up hours after falling asleep
  // with audio playing), and stamping THAT moment made a 4-minute listen read
  // as 7:06 AM to 10:30 AM in session history.
  const lastActiveAtRef = useRef<number>(Date.now());
  const lastInteractionRef = useRef<number>(Date.now());
  const activeSecRef = useRef(0);
  const lastSavedSecRef = useRef(0);
  const ayahCountRef = useRef(0);
  const surahsRef = useRef<Set<number>>(new Set());
  const extendedIdleRef = useRef(extendedIdle);
  extendedIdleRef.current = extendedIdle;
  const activeOverrideRef = useRef(isActiveOverride);
  activeOverrideRef.current = isActiveOverride;
  const forcedPauseRef = useRef(forcedPause);
  forcedPauseRef.current = forcedPause;

  const registerAyahRead = useCallback((count: number) => {
    ayahCountRef.current += count;
  }, []);

  const registerSurah = useCallback((surah: number) => {
    surahsRef.current.add(surah);
  }, []);

  const save = useCallback(
    (keepalive: boolean) => {
      if (activeSecRef.current < MIN_SESSION_SEC_TO_SAVE) return;
      if (activeSecRef.current === lastSavedSecRef.current && !keepalive) return;
      lastSavedSecRef.current = activeSecRef.current;
      void postSession(
        {
          clientSessionId: clientSessionIdRef.current,
          // The CURRENT tracking day, not the day the session started — a
          // session that spans a Fajr/midnight rollover gets its time split
          // correctly across both days' totals this way.
          date: getTrackingDay(),
          startedAt: startedAtRef.current.toISOString(),
          endedAt: new Date(
            Math.max(lastActiveAtRef.current, startedAtRef.current.getTime())
          ).toISOString(),
          activeDurationSec: activeSecRef.current,
          ayahCount: ayahCountRef.current,
          pagesRead: 0,
          surahs: [...surahsRef.current],
          source,
        },
        keepalive
      );
    },
    [source]
  );

  // Interactions reset the idle clock. Only meaningful in idle/visibility
  // mode — skipped entirely when an active-state override drives things
  // (e.g. Listen, where scrolling/tapping has nothing to do with whether
  // audio is actually playing).
  useEffect(() => {
    if (!enabled || usesOverride) return;
    const markActive = () => {
      lastInteractionRef.current = Date.now();
    };
    window.addEventListener('pointerdown', markActive, { passive: true });
    window.addEventListener('scroll', markActive, { passive: true });
    window.addEventListener('keydown', markActive);
    window.addEventListener('touchmove', markActive, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', markActive);
      window.removeEventListener('scroll', markActive);
      window.removeEventListener('keydown', markActive);
      window.removeEventListener('touchmove', markActive);
    };
  }, [enabled, usesOverride]);

  // The clock: advances once per second while active. "Active" is either the
  // caller's own override (Listen: audio is playing) or, by default, the
  // idle/visibility heuristic (Reader: tab visible AND recently interacted with).
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      let paused: boolean;
      if (forcedPauseRef.current) {
        paused = true;
      } else if (activeOverrideRef.current !== undefined) {
        paused = !activeOverrideRef.current;
      } else {
        const idleTimeout = extendedIdleRef.current ? IDLE_TIMEOUT_TAFSIR_MS : IDLE_TIMEOUT_MS;
        const idle = Date.now() - lastInteractionRef.current > idleTimeout;
        const hidden = document.visibilityState !== 'visible';
        paused = idle || hidden;
      }
      setIsPaused(paused);
      if (!paused) {
        lastActiveAtRef.current = Date.now();
        activeSecRef.current += 1;
        setActiveSec(activeSecRef.current);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [enabled]);

  // Periodic checkpoint + teardown flush (tab hidden, closed, or navigated away).
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => save(false), SAVE_INTERVAL_MS);
    const flushOnHide = () => {
      if (document.hidden) save(true);
    };
    const flushOnPagehide = () => save(true);
    document.addEventListener('visibilitychange', flushOnHide);
    window.addEventListener('pagehide', flushOnPagehide);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', flushOnHide);
      window.removeEventListener('pagehide', flushOnPagehide);
      // Leaving the Reader for another in-app page is a normal unmount, not
      // a pagehide — flush here so that case is saved too.
      save(false);
    };
  }, [enabled, save]);

  return { activeSec, isPaused, registerAyahRead, registerSurah };
}
