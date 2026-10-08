import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

/** Covers the sign-in form while a sign-in finishes (utils/useSignInFlow.ts),
 *  so the form never shows again after a successful sign-in. Portaled above
 *  the navbar. */
export default function SigningInOverlay({ show }: { show: boolean }) {
  const { t } = useTranslation();
  if (!show) return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[90] grid place-items-center bg-brand-void"
    >
      <div className="flex flex-col items-center gap-4">
        <span className="loading loading-spinner loading-lg text-brand-emerald" />
        <p className="font-display text-white/80 text-base">
          {t('authSignIn.signingIn', 'Signing you in...')}
        </p>
      </div>
    </div>,
    document.body
  );
}
