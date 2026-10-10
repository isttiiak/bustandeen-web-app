import { useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { adminAuth } from '../../adminFirebase.js';
import { useAdminReauthStore } from '../../store/useAdminReauthStore.js';
import { PasswordField } from '../auth/authParts.js';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';

/**
 * Password prompt for an irreversible admin action (see useAdminReauthStore).
 * A successful re-auth refreshes the admin token, so the repeated request
 * carries a fresh auth_time.
 */
export default function AdminReauthDialog() {
  const { t } = useTranslation();
  const open = useAdminReauthStore((s) => s.open);
  const settle = useAdminReauthStore((s) => s.settle);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const close = (ok: boolean) => {
    setPassword('');
    setError(null);
    settle(ok);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const user = adminAuth.currentUser;
    if (!user?.email || !password) return;
    setBusy(true);
    setError(null);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      await user.getIdToken(true);
      close(true);
    } catch {
      setError(t('adminReauth.wrong', 'That password did not work. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black/60 grid place-items-center p-4">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-reauth-title"
        className="w-full max-w-xs rounded-card bg-brand-deep border border-brand-border shadow-elev-3 p-5 space-y-3"
      >
        <div className="w-11 h-11 mx-auto rounded-full grid place-items-center bg-brand-gold/10 text-brand-gold">
          <LockClosedIcon className="w-6 h-6" aria-hidden="true" />
        </div>
        <h3 id="admin-reauth-title" className="text-white font-bold text-base text-center">
          {t('adminReauth.title', 'Confirm it is you')}
        </h3>
        <p className="text-white/80 text-xs text-center leading-relaxed">
          {t(
            'adminReauth.body',
            'This cannot be undone, so enter your admin password again. It is asked again after 5 minutes.'
          )}
        </p>
        <PasswordField
          autoComplete="current-password"
          aria-label={t('adminReauth.password', 'Admin password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          state={error ? 'bad' : undefined}
        />
        {error && (
          <p role="alert" className="text-red-400 text-xs">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            className={`${BTN_SECONDARY} flex-1 justify-center`}
          >
            {t('adminReauth.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            disabled={busy || !password}
            className={`${BTN_PRIMARY} flex-1 justify-center`}
          >
            {busy ? '…' : t('adminReauth.confirm', 'Confirm')}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
