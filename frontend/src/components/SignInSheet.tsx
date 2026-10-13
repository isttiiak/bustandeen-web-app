import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { BTN_PRIMARY, BTN_QUIET, BTN_SECONDARY, DIALOG } from './bustanStyles.js';
import { useAuthStore } from '../store/useAuthStore.js';

// U10 "explore freely, sign in to save": the one sheet a guest sees the first
// time they save a record (Salat, Fasting, the zikr note, Rayhanah). It gives
// the reason for an account, never a lock or "required". Both buttons keep
// the current page as the return path (bustandeen_redirect), so after sign-in
// the person lands back where they were. "Keep exploring" changes nothing.

export type SignInFeature = 'salat' | 'fasting' | 'zikr' | 'rayhanah' | 'quran' | 'ramadan';

/** For pages a guest can use until the first save (the Quran habit pages,
 *  Ramadan): `canSave()` is true for an account, and for a guest it opens the
 *  sheet instead. Render `sheet` once on the page. */
export function useSignInGate(feature: SignInFeature) {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const canSave = () => {
    if (user) return true;
    setOpen(true);
    return false;
  };
  const sheet = <SignInSheet open={open} onClose={() => setOpen(false)} feature={feature} />;
  return { isGuest: !user, canSave, sheet };
}

/** Stores where to come back to, then opens sign-in or sign-up. */
export function useSignInNav() {
  const navigate = useNavigate();
  const location = useLocation();
  return (to: '/login' | '/signup') => {
    sessionStorage.setItem('bustandeen_redirect', location.pathname + location.search);
    navigate(to);
  };
}

/** Create free account (primary), Sign in (secondary): the pair every gate shows. */
export function SignInButtons({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const go = useSignInNav();
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        type="button"
        className={`${BTN_PRIMARY} w-full min-h-[44px]`}
        onClick={() => go('/signup')}
      >
        {t('signInGate.createAccount')}
      </button>
      <button
        type="button"
        className={`${BTN_SECONDARY} w-full min-h-[44px]`}
        onClick={() => go('/login')}
      >
        {t('signInGate.signIn')}
      </button>
    </div>
  );
}

export default function SignInSheet({
  open,
  onClose,
  feature,
}: {
  open: boolean;
  onClose: () => void;
  feature: SignInFeature;
}) {
  const { t } = useTranslation();
  const first = useRef<HTMLDivElement>(null);
  const pink = feature === 'rayhanah';
  const Icon = pink ? LockClosedIcon : ShieldCheckIcon;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    first.current?.querySelector('button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Portaled: AnimatedBackground wraps every tracker in `relative z-10`,
  // which would keep the sheet under the sticky navbar.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.18, ease: 'easeOut' }}
            className={`${DIALOG} w-full sm:max-w-sm rounded-b-none sm:rounded-b-card px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 text-center`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sign-in-sheet-title"
            aria-describedby="sign-in-sheet-desc"
            data-testid="sign-in-sheet"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-brand-border sm:hidden" />
            <span
              className={`mx-auto mb-3 w-14 h-14 rounded-full grid place-items-center border ${
                pink
                  ? 'border-brand-pink/30 bg-brand-pink/10 text-brand-pink'
                  : 'border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald'
              }`}
            >
              <Icon className="w-7 h-7" aria-hidden="true" />
            </span>
            <h2 id="sign-in-sheet-title" className="font-display text-xl font-bold text-white">
              {t(`signInGate.${feature}.title`)}
            </h2>
            <p id="sign-in-sheet-desc" className="text-white/75 text-sm leading-relaxed mt-2">
              {t(`signInGate.${feature}.desc`)}
            </p>
            <div ref={first} className="mt-5">
              <SignInButtons />
              <button
                type="button"
                className={`${BTN_QUIET} w-full min-h-[44px] mt-2`}
                onClick={onClose}
              >
                {t('signInGate.keepExploring')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
