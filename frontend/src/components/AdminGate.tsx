import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from './AnimatedBackground.js';
import { useAdminStore } from '../store/useAdminStore.js';
import { useVerifyAdminPassword } from '../hooks/useAdminAuth.js';

/**
 * Second factor gating every admin page — a signed-in account on the
 * ADMIN_EMAILS allowlist still hits this password prompt before any
 * /api/admin/* call works (see requireAdminSession on the backend). The
 * resulting session token lives only in sessionStorage, so it's asked again
 * each new browser tab/session, on purpose.
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const token = useAdminStore((s) => s.token);
  const [password, setPassword] = useState('');
  const verify = useVerifyAdminPassword();

  if (token) return <>{children}</>;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    verify.mutate(password, { onError: () => setPassword('') });
  };

  return (
    <AnimatedBackground variant="dark">
      <div className="max-w-sm mx-auto px-4 py-24">
        <form
          onSubmit={submit}
          className="rounded-2xl border border-brand-emerald/15 bg-white/[0.03] p-6 space-y-4"
        >
          <div>
            <h1 className="text-lg font-black text-white">
              {t('adminGate.title', 'Admin sign-in')}
            </h1>
            <p className="text-white/40 text-xs mt-1">
              {t(
                'adminGate.subtitle',
                'Enter the admin panel password to continue — separate from your account sign-in.'
              )}
            </p>
          </div>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('adminGate.placeholder', 'Admin password')}
            aria-label={t('adminGate.placeholder', 'Admin password')}
            className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl"
          />
          {verify.isError && (
            <p className="text-red-400 text-xs">
              {t('adminGate.incorrect', 'Incorrect password — try again.')}
            </p>
          )}
          <button
            type="submit"
            disabled={verify.isPending || !password}
            className="btn btn-sm w-full rounded-xl border-0 text-white font-bold bg-gradient-to-r from-brand-emerald to-brand-info disabled:opacity-50"
          >
            {verify.isPending ? '…' : t('adminGate.continue', 'Continue')}
          </button>
        </form>
      </div>
    </AnimatedBackground>
  );
}
