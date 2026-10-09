import confetti from 'canvas-confetti';

/**
 * Celebration bursts for completed acts of worship.
 * No-ops entirely under reduced motion: the Settings choice, which on Auto
 * follows the device (UiInit sets data-reduce-motion on <html>).
 */

function reducedMotion(): boolean {
  return document.documentElement.hasAttribute('data-reduce-motion');
}

const EMERALD_GOLD = ['#7a9e6e', '#c9a96e', '#9aba8e', '#d4be8a', '#ffffff'];
const NIGHT_SKY = ['#c9a96e', '#5a9e8e', '#ffffff', '#e8d9b0'];

/** Small pop — a single prayer marked done, small wins */
export function celebrateSmall(): void {
  if (reducedMotion()) return;
  void confetti({
    particleCount: 30,
    spread: 55,
    startVelocity: 28,
    scalar: 0.8,
    ticks: 90,
    colors: EMERALD_GOLD,
    origin: { y: 0.7 },
    disableForReducedMotion: true,
  });
}

/** Daily goal met (zikr / quran) */
export function celebrateGoal(): void {
  if (reducedMotion()) return;
  void confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 38,
    ticks: 140,
    colors: EMERALD_GOLD,
    origin: { y: 0.65 },
    disableForReducedMotion: true,
  });
}

/** A completed fast — moonlit colors */
export function celebrateFast(): void {
  if (reducedMotion()) return;
  void confetti({
    particleCount: 80,
    spread: 70,
    startVelocity: 34,
    ticks: 130,
    colors: NIGHT_SKY,
    shapes: ['circle', 'star'],
    origin: { y: 0.6 },
    disableForReducedMotion: true,
  });
}

/** All five prayers completed — double side burst */
export function celebrateAllPrayers(): void {
  if (reducedMotion()) return;
  const opts = { ticks: 160, colors: EMERALD_GOLD, disableForReducedMotion: true } as const;
  void confetti({ ...opts, particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
  void confetti({ ...opts, particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
}

/** Khatm complete — the grand one */
export function celebrateKhatm(): void {
  if (reducedMotion()) return;
  const end = Date.now() + 1200;
  const frame = (): void => {
    void confetti({
      particleCount: 8,
      angle: 60 + Math.random() * 60,
      spread: 70,
      startVelocity: 40,
      colors: EMERALD_GOLD,
      origin: { x: Math.random(), y: 0.6 },
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
