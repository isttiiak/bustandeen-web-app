import { useEffect } from 'react';

/** Calls `onEscape` when Escape is pressed while `active` (a modal is open).
 * Keyboard users get the same way out that the click-outside backdrop gives
 * pointer users (audit T3.5). */
export function useEscapeKey(onEscape: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEscape, active]);
}
