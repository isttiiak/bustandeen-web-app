// Route guards and the root route (audit T2.4: moved out of App.tsx unchanged).
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import { loadFirebase } from './authClient.js';
import { useAuthStore } from './store/useAuthStore.js';
import { useAdminStore } from './store/useAdminStore.js';
import Home from './pages/Home.js';

const Landing = lazy(() => import('./pages/Landing.js'));
// Lazy, both: they bring the admin panel's own Firebase app (adminFirebase.ts,
// through AdminGate and the logout in AdminLayout), which no other page needs.
const AdminGate = lazy(() => import('./components/AdminGate.js'));
const AdminLayout = lazy(() => import('./components/AdminLayout.js'));

// Full height (audit PERF-01): at 60vh the Footer below it showed on screen
// and was then pushed down when the page arrived (CLS 0.278 on Home).
export function RouteFallback() {
  return (
    <div className="min-h-screen grid place-items-center bg-brand-void">
      <span className="loading loading-spinner loading-lg text-brand-emerald" />
    </div>
  );
}

function VerifyEmailGate({ email }: { email: string | null }) {
  const { t } = useTranslation();
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const resend = async () => {
    if (resending) return;
    setResending(true);
    try {
      const { auth, sendEmailVerification } = await loadFirebase();
      if (!auth.currentUser) throw new Error('signed out');
      await sendEmailVerification(auth.currentUser, {
        url: 'https://bustandeen.com/auth/action',
        handleCodeInApp: true,
      });
      setResent(true);
    } catch {
      /* non-fatal */
    }
    setResending(false);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center space-y-5 max-w-sm w-full">
        <div className="text-6xl">📧</div>
        <h2 className="text-2xl font-black text-white">
          {t('app.verifyEmailTitle', 'Verify your email')}
        </h2>
        <p className="text-white/50 text-sm leading-relaxed">
          {t('app.verifyEmailSentTo', 'A verification link was sent to')}{' '}
          <span className="text-brand-emerald font-medium">{email}</span>.{' '}
          {t(
            'app.verifyEmailCheckInbox',
            'Check your inbox (and spam folder) and click the link to unlock this page.'
          )}
        </p>
        {resent ? (
          <p className="text-brand-emerald text-sm font-medium">
            {t('app.verifyEmailResent', 'Email resent! Check your inbox.')}
          </p>
        ) : (
          <button
            className="btn btn-ghost text-brand-emerald border border-brand-emerald/30 w-full"
            onClick={() => void resend()}
            disabled={resending}
          >
            {resending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              t('app.resendVerification', 'Resend verification email')
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/** /demo/brother and /demo/sister: the demo links of the static landing
 * (audit PERF-01), which has no app to call enterDemoMode on. Someone already
 * signed in just goes Home. */
export const DemoEntry = () => {
  const { as } = useParams();
  const { user, authLoading, enterDemoMode } = useAuthStore();
  const navigate = useNavigate();
  useEffect(() => {
    if (authLoading) return;
    if (!user) enterDemoMode(as === 'sister' ? 'female' : 'male');
    navigate('/', { replace: true });
  }, [as, user, authLoading, enterDemoMode, navigate]);
  return <RouteFallback />;
};

/** `/bn` is the static Bangla landing; when the app answers it instead (the
 * service worker offline, or a link inside the app), switch the app to
 * Bangla and show `/`. */
export const BanglaEntry = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  useEffect(() => {
    void i18n.changeLanguage('bn');
    navigate('/', { replace: true });
  }, [i18n, navigate]);
  return <RouteFallback />;
};

/** "/" shows the marketing landing to guests and the app home to users. */
export const RootRoute = () => {
  const { user, authLoading } = useAuthStore();
  if (user) return <Home />;
  if (authLoading) return <RouteFallback />;
  return (
    <Suspense fallback={<RouteFallback />}>
      <Landing />
    </Suspense>
  );
};

interface ProtectedProps {
  children: React.ReactNode;
}

export const Protected = ({ children }: ProtectedProps) => {
  const { t } = useTranslation();
  const { user, authLoading } = useAuthStore();
  const location = useLocation();
  const nav = useNavigate();
  const hadSession = !!localStorage.getItem('bustandeen_idToken');
  const [grace, setGrace] = useState(hadSession && !user);
  useEffect(() => {
    if (user) {
      setGrace(false);
      return;
    }
    if (!grace) return;
    // A returning user whose cached idToken has expired needs Firebase to
    // silently refresh it over the network before onAuthStateChanged confirms
    // them — on a slow/high-latency connection (e.g. freshly relocated,
    // patchy wifi) that can take noticeably longer than a couple of seconds.
    // Too short a grace window here was flashing "Sign in required" at
    // legitimate users mid-refresh. 6s trades a slightly longer spinner for
    // not kicking a signed-in user back to the login screen.
    const t = setTimeout(() => setGrace(false), 6000);
    return () => clearTimeout(t);
  }, [user, grace]);
  // Hooks above must run unconditionally on every render (react-hooks/rules-of-hooks) —
  // these early returns come after.
  if (authLoading) return null;
  if (grace) return <RouteFallback />;
  if (!user) {
    const redirectTarget = location.pathname + location.search;
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center space-y-5 max-w-sm w-full">
          <div className="text-6xl">🔐</div>
          <h2 className="text-2xl font-black text-white">
            {t('app.signInRequired', 'Sign in required')}
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            {t(
              'app.signInRequiredDesc',
              'This page is only available to signed-in users. Create a free account to track your progress and access analytics.'
            )}
          </p>
          <div className="flex flex-col gap-3">
            <button
              className="btn bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 text-white border-0 w-full"
              onClick={() => {
                sessionStorage.setItem('bustandeen_redirect', redirectTarget);
                nav('/login');
              }}
            >
              {t('app.signIn', 'Sign In')}
            </button>
            <button
              className="btn btn-ghost text-brand-emerald border border-brand-emerald/30 w-full"
              onClick={() => {
                sessionStorage.setItem('bustandeen_redirect', redirectTarget);
                nav('/signup');
              }}
            >
              {t('app.createFreeAccount', 'Create Free Account')}
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (user.emailVerified === false) {
    return <VerifyEmailGate email={user.email} />;
  }
  return <>{children}</>;
};

/**
 * Admin-only pages: gated by AdminGate's own real Firebase sign-in (a second,
 * isolated Firebase app — see adminFirebase.ts) confirmed against the
 * backend's AdminAccount collection — deliberately NOT wrapped in the main
 * app's Protected/Firebase account, since a Servant/Ansar should never need
 * a REGULAR app account to reach the admin panel, and the two identities
 * must never be conflated (see AdminLayout.tsx's doc comment for the
 * incident that motivated this separation). AdminLayout renders the admin
 * panel's own chrome — never the main app's Navbar (see isAdminPage below).
 * Real enforcement is always server-side (requireAdminAuth on every
 * /api/admin/* route); this route being reachable while signed out is
 * expected, not a hole.
 */
export const AdminProtected = ({ children }: ProtectedProps) => (
  <Suspense fallback={<RouteFallback />}>
    <AdminGate>
      <AdminLayout>{children}</AdminLayout>
    </AdminGate>
  </Suspense>
);

/** Servant-only pages (user directory, managing Ansars) — the backend
 *  already 403s an Ansar's API calls, this just avoids rendering a page that
 *  can't do anything for that role. Must be nested INSIDE AdminProtected so
 *  useAdminStore's role is populated by the time this checks it. */
export const ServantProtected = ({ children }: ProtectedProps) => {
  const role = useAdminStore((s) => s.role);
  if (role !== 'servant') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-white/60">
        Servant-only page.
      </div>
    );
  }
  return <>{children}</>;
};
