// Where the user last read, in any surah or mode (T3.4 E): Home's Quran
// "Continue" goes here when khatam mode is off. Written by the reader as the
// āyah changes. Synced across devices.

export const QURAN_LAST_KEY = 'bustandeen_quran_last';

export interface LastRead {
  surah: number;
  ayah: number;
}

export function getLastRead(): LastRead | null {
  try {
    const raw = localStorage.getItem(QURAN_LAST_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<LastRead>;
    const ok =
      Number.isInteger(v.surah) &&
      v.surah! >= 1 &&
      v.surah! <= 114 &&
      Number.isInteger(v.ayah) &&
      v.ayah! >= 1 &&
      v.ayah! <= 286;
    return ok ? { surah: v.surah!, ayah: v.ayah! } : null;
  } catch {
    return null;
  }
}

export function setLastRead(pos: LastRead): void {
  try {
    const prev = localStorage.getItem(QURAN_LAST_KEY);
    const next = JSON.stringify(pos);
    // Avoid a sync write for every re-render on the same āyah.
    if (prev !== next) localStorage.setItem(QURAN_LAST_KEY, next);
  } catch {
    /* private mode */
  }
}

/**
 * Home's "Continue": the khatam position when the khatam journey is on,
 * otherwise the last place read; null when there is nothing to continue.
 */
export function continueHref(opts: {
  khatamOn: boolean;
  khatamPos: LastRead | null;
  last: LastRead | null;
}): string | null {
  if (opts.khatamOn)
    return opts.khatamPos
      ? `/quran/read/${opts.khatamPos.surah}?start=${opts.khatamPos.ayah}&mode=khatam`
      : '/quran/khatam'; // position not known yet (surah list still loading)
  if (opts.last) return `/quran/read/${opts.last.surah}?start=${opts.last.ayah}`;
  return null;
}
