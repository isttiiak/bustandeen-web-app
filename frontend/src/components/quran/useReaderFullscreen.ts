import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

/** Fullscreen reading, the tafsir split and its draggable divider. */
export function useReaderFullscreen() {
  const [splitTafsir, setSplitTafsir] = useState(false); // fullscreen 2-pane reading
  // Draggable split (Istiak: a short āyah can pair with a LONG tafsir — the
  // reader decides how much room each side gets). Left-pane %, persisted.
  const [splitPct, setSplitPct] = useState<number>(() => {
    const v = Number(localStorage.getItem('bustandeen_split_pct'));
    return Number.isFinite(v) && v >= 25 && v <= 75 ? v : 50;
  });
  const draggingRef = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

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

  return {
    fullscreen,
    splitTafsir,
    setSplitTafsir,
    splitPct,
    cardRef,
    toggleFullscreen,
    onDragStart,
  };
}
