import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { LeafIcon } from './icons/IslamicIcons.js';
import { CARD } from './bustanStyles.js';

/** Covers the sign-in form while a sign-in finishes (utils/useSignInFlow.ts),
 *  so the form never shows again after a successful sign-in. Portaled above
 *  the navbar. T3.2: the leaf mark in a theme card, like the auth screens. */
export default function SigningInOverlay({ show }: { show: boolean }) {
  const { t } = useTranslation();
  if (!show) return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[90] grid place-items-center bg-brand-void p-4"
    >
      <div className={`${CARD} flex flex-col items-center gap-4 px-10 py-8`}>
        <div className="relative w-16 h-16 grid place-items-center">
          <span
            className="absolute inset-0 loading loading-ring w-16 text-brand-emerald motion-reduce:hidden"
            aria-hidden="true"
          />
          <span className="w-11 h-11 rounded-full grid place-items-center bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald">
            <LeafIcon className="w-6 h-6" aria-hidden="true" />
          </span>
        </div>
        <p className="font-display text-white text-base">
          {t('authSignIn.signingIn', 'Signing you in...')}
        </p>
      </div>
    </div>,
    document.body
  );
}
