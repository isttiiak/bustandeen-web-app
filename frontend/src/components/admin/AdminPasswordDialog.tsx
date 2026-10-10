import { useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { KeyIcon } from '@heroicons/react/24/outline';
import { PasswordField } from '../auth/authParts.js';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';
import { useChangeAdminPassword } from '../../hooks/useAdminAuth.js';
import { ADMIN_PASSWORD_MIN, passwordProblem } from '../../utils/adminPassword.js';

/** Change your own admin password (any admin). Other sign-ins end. */
export default function AdminPasswordDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const change = useChangeAdminPassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [tried, setTried] = useState(false);
  const problem = passwordProblem(current, next, repeat);

  const messages: Record<NonNullable<typeof problem>, string> = {
    missing: t('adminPassword.missing', 'Enter your current and new password.'),
    short: t('adminPassword.short', 'The new password needs at least {{min}} characters.', {
      min: ADMIN_PASSWORD_MIN,
    }),
    same: t('adminPassword.same', 'The new password is the same as the current one.'),
    mismatch: t('adminPassword.mismatch', 'The two new passwords are different.'),
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (problem) return;
    change.mutate({ current, next });
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm grid place-items-center p-4">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-password-title"
        className="w-full max-w-sm rounded-card bg-brand-deep border border-brand-border shadow-elev-3 p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <KeyIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
          <h3 id="admin-password-title" className="text-white font-black text-base">
            {t('adminPassword.title', 'Change your admin password')}
          </h3>
        </div>
        {change.isSuccess ? (
          <>
            <p role="status" className="text-brand-emerald text-sm">
              {t(
                'adminPassword.done',
                'Password changed. Any other device signed in to the panel with this account has to sign in again.'
              )}
            </p>
            <button
              type="button"
              onClick={onClose}
              className={`${BTN_PRIMARY} w-full justify-center`}
            >
              {t('adminPassword.close', 'Close')}
            </button>
          </>
        ) : (
          <>
            <PasswordField
              autoComplete="current-password"
              aria-label={t('adminPassword.current', 'Current password')}
              placeholder={t('adminPassword.current', 'Current password')}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <PasswordField
              autoComplete="new-password"
              aria-label={t('adminPassword.new', 'New password')}
              placeholder={t('adminPassword.new', 'New password')}
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <PasswordField
              autoComplete="new-password"
              aria-label={t('adminPassword.repeat', 'New password again')}
              placeholder={t('adminPassword.repeat', 'New password again')}
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
            {tried && problem && (
              <p role="alert" className="text-red-400 text-xs">
                {messages[problem]}
              </p>
            )}
            {change.isError && (
              <p role="alert" className="text-red-400 text-xs">
                {t(
                  'adminPassword.failed',
                  'That did not work. Check your current password and try again.'
                )}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`${BTN_SECONDARY} flex-1 justify-center`}
              >
                {t('adminPassword.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={change.isPending}
                className={`${BTN_PRIMARY} flex-1 justify-center`}
              >
                {change.isPending ? '…' : t('adminPassword.save', 'Change password')}
              </button>
            </div>
          </>
        )}
      </form>
    </div>,
    document.body
  );
}
