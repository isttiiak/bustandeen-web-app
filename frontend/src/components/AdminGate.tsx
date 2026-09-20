import { useState, useEffect, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import axios from 'axios';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from './AnimatedBackground.js';
import { adminAuth } from '../adminFirebase.js';
import { API_BASE } from '../lib/api.js';
import { useAdminStore, AdminRole, AnsarDomain } from '../store/useAdminStore.js';
import { useAdminLogin } from '../hooks/useAdminAuth.js';

/**
 * The ENTIRE gate on every admin page — real Firebase sign-in against a
 * second, isolated Firebase app instance (adminFirebase.ts), confirmed
 * against the backend's AdminAccount collection (which admin, which role)
 * before anything behind this gate renders. A Firebase identity that isn't a
 * registered, active admin is signed straight back out — it never gets a
 * chance to poke at an /api/admin/* route with a "logged in but not
 * authorized" session hanging around.
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const status = useAdminStore((s) => s.status);
  const setSession = useAdminStore((s) => s.setSession);
  const setSignedOut = useAdminStore((s) => s.setSignedOut);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rejectedError, setRejectedError] = useState<string | null>(null);
  const login = useAdminLogin();

  useEffect(() => {
    const unsub = onAuthStateChanged(adminAuth, async (user) => {
      if (!user) {
        setSignedOut();
        return;
      }
      try {
        const idToken = await user.getIdToken();
        const res = await axios.get<{
          email: string;
          role: AdminRole;
          ansarDomain: AnsarDomain | null;
        }>(`${API_BASE}/api/admin/auth/session`, { headers: { 'X-Admin-Token': idToken } });
        setRejectedError(null);
        setSession(res.data.email, res.data.role, res.data.ansarDomain ?? null);
      } catch {
        setRejectedError(
          t('adminGate.notRegistered', 'This account is not registered as a Bustandeen admin.')
        );
        await signOut(adminAuth);
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once on mount only; t/setSession/setSignedOut are stable
  }, []);

  if (status === 'checking') {
    return (
      <AnimatedBackground variant="dark">
        <div className="max-w-sm mx-auto px-4 py-24 grid place-items-center">
          <span className="loading loading-spinner loading-lg text-brand-emerald" />
        </div>
      </AnimatedBackground>
    );
  }

  if (status === 'ready') {
    // AdminLayout (rendered by AdminProtected, App.tsx) owns the actual
    // chrome — role badge, nav, logout — this gate's only job past this
    // point is to have proven the session, not to render anything itself.
    return <>{children}</>;
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    setRejectedError(null);
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
              {t('adminGate.subtitle', 'Servant and Ansar accounts only.')}
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
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={t('adminGate.passwordPlaceholder', 'Password')}
              aria-label={t('adminGate.passwordPlaceholder', 'Password')}
              className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('adminGate.hidePassword', 'Hide password')
                  : t('adminGate.showPassword', 'Show password')
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
            >
              {showPassword ? (
                <EyeSlashIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
            </button>
          </div>
          {(login.isError || rejectedError) && (
            <p className="text-red-400 text-xs">
              {rejectedError ??
                t('adminGate.incorrect', 'Incorrect email or password — try again.')}
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
