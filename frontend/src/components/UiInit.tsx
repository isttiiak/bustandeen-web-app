import { useEffect, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { useUiStore } from '../store/useUiStore.js';

export default function UiInit() {
  const { reduceMotion, highContrast, setOsReducedMotion } = useUiStore();

  // 'Auto' follows the device: keep listening, the user can change it any time
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setOsReducedMotion(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [setOsReducedMotion]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-reduce-motion', reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-high-contrast', highContrast);
  }, [highContrast]);

  return null;
}

/** Framer Motion follows the same reduce-motion choice as the CSS: transform
 * and layout animations are skipped, opacity fades stay (T3.5). */
export function MotionPrefs({ children }: { children: ReactNode }) {
  const reduceMotion = useUiStore((s) => s.reduceMotion);
  return <MotionConfig reducedMotion={reduceMotion ? 'always' : 'never'}>{children}</MotionConfig>;
}
