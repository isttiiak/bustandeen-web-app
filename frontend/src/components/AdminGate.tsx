import { useState, useEffect, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import axios from 'axios';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from './AnimatedBackground.js';
import {
  AuthCard,
  AuthHero,
  AuthShell,
  ErrorNote,
  INPUT,
  LABEL,
  PasswordField,
} from './auth/authParts.js';
import { BTN_PRIMARY } from './bustanStyles.js';
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
      } catch (err) {
        const code = axios.isAxiosError(err)
          ? (err.response?.data as { error?: string } | undefined)?.error
          : undefined;
        setRejectedError(
          code === 'admin_session_expired'
            ? t(
                'adminGate.sessionExpired',
                'Your admin session ended (12 hours after sign-in). Please sign in again.'
              )
            : t('adminGate.notRegistered', 'This account is not registered as a Bustandeen admin.')
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
    <AuthShell>
      <AuthHero
        icon={<ShieldCheckIcon className="w-7 h-7" aria-hidden="true" />}
        title={t('adminGate.title', 'Admin sign-in')}
        subtitle={t('adminGate.subtitle', 'Servant and Ansar accounts only.')}
      />
      <AuthCard>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="admin-email" className={LABEL}>
              {t('adminGate.emailPlaceholder', 'Admin email')}
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={INPUT}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="admin-password" className={LABEL}>
              {t('adminGate.passwordPlaceholder', 'Password')}
            </label>
            <PasswordField
              id="admin-password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          {(login.isError || rejectedError) && (
            <ErrorNote>
              {rejectedError ?? t('adminGate.incorrect', 'Incorrect email or password. Try again.')}
            </ErrorNote>
          )}
          <button
            type="submit"
            disabled={login.isPending || !form.email || !form.password}
            className={`${BTN_PRIMARY} w-full`}
          >
            {login.isPending ? (
              <span className="loading loading-spinner loading-sm" aria-label="Signing in" />
            ) : (
              t('adminGate.continue', 'Sign in')
            )}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
