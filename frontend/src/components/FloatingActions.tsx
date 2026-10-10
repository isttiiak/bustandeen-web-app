import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpIcon } from '@heroicons/react/24/solid';
import { useUiStore } from '../store/useUiStore.js';

/** Scrolled this far (px) before "go to top" appears: half a phone screen. */
export const GO_TOP_THRESHOLD = 400;

/**
 * The bottom-right corner stack (U1). One flex column, so the "go to top"
 * button always sits ABOVE the Naseeh quick-log button and never on it;
 * when quick-log is absent (AI off, demo, zikr counter) it takes the corner.
 * Safe-area aware for phones with a home indicator.
 */
export default function FloatingActions({ quickLog }: { quickLog?: React.ReactNode }) {
  const { t } = useTranslation();
  const reduceMotion = useUiStore((s) => s.reduceMotion);
  const [scrolled, setScrolled] = useState(false);

  // <body> is the real scroller, not the window (see the note in App.tsx), so
  // listen and scroll on both: whichever one moves.
  useEffect(() => {
    const onScroll = () =>
      setScrolled(Math.max(window.scrollY, document.body.scrollTop) > GO_TOP_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.body.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.body.removeEventListener('scroll', onScroll);
    };
  }, []);

  const goTop = () => {
    const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';
    window.scrollTo({ top: 0, behavior });
    document.body.scrollTo({ top: 0, behavior });
  };

  if (!scrolled && !quickLog) return null;

  return (
    <div
      className="fixed right-4 z-40 flex flex-col items-center gap-3 pointer-events-none"
      style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {scrolled && (
        <button
          type="button"
          onClick={goTop}
          aria-label={t('common.goToTop')}
          title={t('common.goToTop')}
          className="pointer-events-auto w-11 h-11 rounded-full grid place-items-center bg-brand-deep text-white border border-brand-border shadow-elev-2 hover:border-brand-emerald hover:text-brand-emerald transition-colors"
        >
          <ArrowUpIcon className="w-5 h-5" />
        </button>
      )}
      {quickLog && <div className="pointer-events-auto">{quickLog}</div>}
    </div>
  );
}
