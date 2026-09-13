import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from './AnimatedBackground.js';
import { useAdminStore } from '../store/useAdminStore.js';
import { useAdminLogin } from '../hooks/useAdminAuth.js';

/**
 * The ENTIRE gate on every admin page — a direct email+password login with
 * no dependency on the app's own Firebase user accounts at all. An admin
 * never needs to sign in as a normal user first (see
 * requireAdminAuth/adminAuth.controller.ts on the backend). The resulting
 * session lives only in sessionStorage, so logging in is a deliberate,
 * per-tab action each time.
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { token, email, isOwner, logout } = useAdminStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const login = useAdminLogin();

  if (token) {
    return (
      <div>
        <div className="max-w-3xl mx-auto px-4 pt-4 flex items-center justify-end gap-2 text-xs text-white/40">
          <span>
            {t('adminGate.signedInAs', 'Signed in as {{email}}', { email })}
            {isOwner && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold text-[10px] font-bold uppercase tracking-wide">
                {t('adminGate.owner', 'Owner')}
              </span>
            )}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
            {t('adminGate.logOut', 'Log out')}
          </button>
        </div>
        {children}
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    login.mutate(form, { onError: () => setForm((f) => ({ ...f, password: '' })) });
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
              {t('adminGate.subtitle', 'Direct admin login — no app account needed.')}
            </p>
          </div>
          <input
            type="email"
            autoFocus
            autoComplete="username"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder={t('adminGate.emailPlaceholder', 'Admin email')}
            aria-label={t('adminGate.emailPlaceholder', 'Admin email')}
            className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl"
          />
          <input
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder={t('adminGate.passwordPlaceholder', 'Admin password')}
            aria-label={t('adminGate.passwordPlaceholder', 'Admin password')}
            className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl"
          />
          {login.isError && (
            <p className="text-red-400 text-xs">
              {t('adminGate.incorrect', 'Incorrect email or password — try again.')}
            </p>
          )}
          <button
            type="submit"
            disabled={login.isPending || !form.email || !form.password}
            className="btn btn-sm w-full rounded-xl border-0 text-white font-bold bg-gradient-to-r from-brand-emerald to-brand-info disabled:opacity-50"
          >
            {login.isPending ? '…' : t('adminGate.continue', 'Sign in')}
          </button>
        </form>
      </div>
    </AnimatedBackground>
  );
}
