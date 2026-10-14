// Route guards and the root route (audit T2.4: moved out of App.tsx unchanged).
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { BTN_SECONDARY } from './components/bustanStyles.js';
import PreviewGate from './components/PreviewGate.js';
import { useAuthStore } from './store/useAuthStore.js';
import { useVerificationEmail } from './hooks/useAuthEmails.js';
import { demoTarget } from './utils/demoTarget.js';
import Home from './pages/Home.js';

const Landing = lazy(() => import('./pages/Landing.js'));

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
  const sendVerification = useVerificationEmail();
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const resend = async () => {
    if (resending) return;
    setResending(true);
    try {
      await sendVerification.mutateAsync();
      setResent(true);
    } catch {
      /* non-fatal */
    }
    setResending(false);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center space-y-5 max-w-sm w-full">
        <div className="mx-auto w-16 h-16 rounded-full grid place-items-center border border-brand-border bg-brand-deep shadow-elev-1">
          <EnvelopeIcon className="w-8 h-8 text-brand-gold" aria-hidden="true" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white">
          {t('app.verifyEmailTitle', 'Verify your email')}
        </h2>
        <p className="text-white/70 text-sm leading-relaxed">
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
            className={`${BTN_SECONDARY} w-full`}
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
 * (audit PERF-01), which has no app to call enterDemoMode on. `?to=` opens
 * one feature in the demo (the landing's "Try it" cards, U9), from a fixed
 * list. Someone already signed in goes straight there. */
export const DemoEntry = () => {
  const { as } = useParams();
  const [params] = useSearchParams();
  const { user, authLoading, enterDemoMode } = useAuthStore();
  const navigate = useNavigate();
  const to = demoTarget(params.get('to'));
  useEffect(() => {
    if (authLoading) return;
    if (!user) enterDemoMode(as === 'sister' ? 'female' : 'male');
    navigate(to, { replace: true });
  }, [as, to, user, authLoading, enterDemoMode, navigate]);
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

/** A page for signed-in users. A guest gets `guest` (a view-only version of
 *  the page, U10) or the PreviewGate: the reason for an account, never a lock. */
export const Protected = ({ children, guest }: ProtectedProps & { guest?: React.ReactNode }) => {
  const { user, authLoading } = useAuthStore();
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
    // Too short a grace window here was flashing the sign-in gate at
    // legitimate users mid-refresh. 6s trades a slightly longer spinner for
    // not kicking a signed-in user back to the login screen.
    const t = setTimeout(() => setGrace(false), 6000);
    return () => clearTimeout(t);
  }, [user, grace]);
  // Hooks above must run unconditionally on every render (react-hooks/rules-of-hooks) —
  // these early returns come after.
  if (authLoading) return null;
  if (grace) return <RouteFallback />;
  if (!user) return <>{guest ?? <PreviewGate />}</>;
  if (user.emailVerified === false) {
    return <VerifyEmailGate email={user.email} />;
  }
  return <>{children}</>;
};
