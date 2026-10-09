import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail, AuthError } from 'firebase/auth';
import { auth } from '../firebase.js';
import { useSignInFlow } from '../utils/useSignInFlow.js';
import SigningInOverlay from '../components/SigningInOverlay.js';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import LegalAgreeLine from '../components/LegalAgreeLine.js';
import { EnvelopeIcon, ArrowLeftIcon, KeyIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { CrescentIcon } from '../components/icons/IslamicIcons.js';
import { BTN_PRIMARY, BTN_SECONDARY } from '../components/bustanStyles.js';
import {
  AuthCard,
  AuthHero,
  AuthShell,
  ErrorNote,
  INPUT,
  LABEL,
  OrDivider,
  PasswordField,
  TEXT_ACTION,
} from '../components/auth/authParts.js';
import GoogleGlyph, { GOOGLE_BTN } from '../components/auth/GoogleGlyph.js';

type Translator = (key: string, fallback: string) => string;

function mapFirebaseError(code: string, t: Translator): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return t('authSignIn.errInvalidCredential', 'Invalid email or password. Please try again.');
    case 'auth/invalid-email':
      return t('authSignIn.errInvalidEmail', 'Please enter a valid email address.');
    case 'auth/user-disabled':
      return t('authSignIn.errUserDisabled', 'This account has been disabled. Contact support.');
    case 'auth/too-many-requests':
      return t(
        'authSignIn.errTooManyRequests',
        'Too many sign-in attempts. Please wait a moment and try again.'
      );
    case 'auth/network-request-failed':
      return t('authSignIn.errNetwork', 'Network error. Check your connection and try again.');
    default:
      return t('authSignIn.errGeneric', 'Sign in failed. Please try again.');
  }
}

function mapResetError(code: string, t: Translator): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return t('authSignIn.errResetNoAccount', 'No account found with this email address.');
    case 'auth/too-many-requests':
      return t(
        'authSignIn.errTooManyRequestsReset',
        'Too many requests. Please wait before trying again.'
      );
    case 'auth/network-request-failed':
      return t('authSignIn.errNetwork', 'Network error. Check your connection and try again.');
    default:
      return t('authSignIn.errResetGeneric', 'Could not send reset email. Please try again.');
  }
}

export default function AuthSignIn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [error, setError] = useState('');
  const { loading, setLoading, setFinishing, google, signingIn } = useSignInFlow((code) =>
    setError(mapFirebaseError(code, t))
  );

  // Safety net: once the auth store has a user, this page is done. App.tsx
  // navigates verified users away; unverified email/password sign-ins would
  // otherwise leave the button spinning here forever — send them home (the
  // verify-email gate protects the private pages).
  useEffect(() => {
    if (!user) return;
    setLoading(false);
    if (user.emailVerified === false) navigate('/', { replace: true });
  }, [user, navigate, setLoading]);

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const onGoogle = () => {
    setError('');
    void google();
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setFinishing(true);
    } catch (err) {
      setError(mapFirebaseError((err as AuthError).code ?? '', t));
      setLoading(false);
    }
  };

  const onSendReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError('');
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    try {
      // handleCodeInApp:true redirects to our branded /auth/action with oobCode intact.
      // After the password is reset, AuthAction navigates the user to /login.
      await sendPasswordResetEmail(auth, resetEmail.trim(), {
        url: 'https://bustandeen.com/auth/action',
        handleCodeInApp: true,
      });
      setResetSent(true);
    } catch (err) {
      setResetError(mapResetError((err as AuthError).code ?? '', t));
    }
    setResetLoading(false);
  };

  const closeForgot = () => {
    setForgotMode(false);
    setResetSent(false);
    setResetError('');
    setResetEmail('');
  };

  // ── Forgot password ──────────────────────────────────────────────────────────
  if (forgotMode) {
    return (
      <AuthShell>
        {resetSent ? (
          <AuthHero
            icon={<EnvelopeIcon className="w-7 h-7" />}
            title={t('authSignIn.checkEmail', 'Check your email')}
            subtitle={
              <>
                <p>{t('authSignIn.resetLinkSentTo', 'We sent a password reset link to')}</p>
                <p className="text-brand-emerald font-semibold break-all mt-1">{resetEmail}</p>
                <p className="text-white/70 text-xs mt-2">
                  {t(
                    'authSignIn.didntReceive',
                    "Didn't receive it? Check your spam folder or try again."
                  )}
                </p>
              </>
            }
          >
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setResetSent(false);
                  setResetError('');
                }}
                className={TEXT_ACTION}
              >
                {t('authSignIn.sendAgain', 'Send again')}
              </button>
              <button type="button" onClick={closeForgot} className={`${BTN_SECONDARY} w-full`}>
                <ArrowLeftIcon className="w-4 h-4" />
                {t('authSignIn.backToSignIn', 'Back to sign in')}
              </button>
            </div>
          </AuthHero>
        ) : (
          <>
            <AuthHero
              icon={<KeyIcon className="w-7 h-7" />}
              title={t('authSignIn.resetPassword', 'Reset your password')}
              subtitle={t(
                'authSignIn.resetPasswordDesc',
                "Enter your account email and we'll send you a link to reset your password."
              )}
            />
            <AuthCard>
              <form onSubmit={onSendReset} className="space-y-5">
                {resetError && <ErrorNote>{resetError}</ErrorNote>}
                <div className="space-y-2">
                  <label htmlFor="reset-email" className={LABEL}>
                    {t('authSignIn.emailAddress', 'Email address')}
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      if (resetError) setResetError('');
                    }}
                    className={INPUT}
                    placeholder={t('authSignIn.emailPlaceholder', 'you@example.com')}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading || !resetEmail.trim()}
                  className={`${BTN_PRIMARY} w-full py-3`}
                >
                  {resetLoading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    t('authSignIn.sendResetLink', 'Send Reset Link')
                  )}
                </button>
              </form>
              <button type="button" onClick={closeForgot} className={`${BTN_SECONDARY} w-full`}>
                <ArrowLeftIcon className="w-4 h-4" />
                {t('authSignIn.backToSignIn', 'Back to sign in')}
              </button>
            </AuthCard>
          </>
        )}
      </AuthShell>
    );
  }

  // ── Sign in ──────────────────────────────────────────────────────────────────
  return (
    <AuthShell>
      <SigningInOverlay show={signingIn} />
      <AuthHero
        icon={<CrescentIcon className="w-7 h-7" />}
        title={t('authSignIn.welcomeBack', 'Welcome Back')}
        subtitle={t('authSignIn.subtitle', 'Log in to continue your spiritual journey')}
      />
      <AuthCard>
        <button type="button" className={GOOGLE_BTN} onClick={onGoogle} disabled={loading}>
          {loading ? (
            <span className="loading loading-spinner loading-md text-brand-emerald" />
          ) : (
            <>
              <GoogleGlyph className="w-6 h-6" />
              <span>{t('authSignIn.continueWithGoogle', 'Continue with Google')}</span>
            </>
          )}
        </button>
        <p className="flex items-start gap-2 text-brand-gold text-xs leading-relaxed">
          <LightBulbIcon className="w-4 h-4 shrink-0 mt-px" />
          <span>
            {t(
              'authSignIn.googleTipPrefix',
              'For the most flexible experience (instant photo, easier sign-in), use'
            )}{' '}
            <span className="font-semibold">
              {t('authSignIn.continueWithGoogle', 'Continue with Google')}
            </span>
            .
          </span>
        </p>

        <OrDivider label={t('authSignIn.orContinueWithEmail', 'or continue with email')} />

        <form onSubmit={onSubmit} className="space-y-5">
          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="space-y-2">
            <label htmlFor="signin-email" className={LABEL}>
              {t('authSignIn.email', 'Email')}
            </label>
            <input
              id="signin-email"
              type="email"
              name="email"
              autoComplete="email"
              required
              onChange={() => error && setError('')}
              className={INPUT}
              placeholder={t('authSignIn.emailPlaceholder', 'you@example.com')}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="signin-password" className={LABEL}>
                {t('authSignIn.password', 'Password')}
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(true);
                  setError('');
                }}
                className={`${TEXT_ACTION} text-xs`}
              >
                {t('authSignIn.forgotPasswordLink', 'Forgot password?')}
              </button>
            </div>
            <PasswordField
              id="signin-password"
              name="password"
              autoComplete="current-password"
              required
              onChange={() => error && setError('')}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className={`${BTN_PRIMARY} w-full py-3`}>
            {loading ? <span className="loading loading-spinner loading-sm" /> : t('common.signIn')}
          </button>
        </form>

        <p className="text-center text-white/80 text-sm">
          {t('authSignIn.noAccount', "Don't have an account?")}{' '}
          <button type="button" onClick={() => navigate('/signup')} className={TEXT_ACTION}>
            {t('authSignIn.signUpLink', 'Sign up')}
          </button>
        </p>
        <LegalAgreeLine mode="signIn" />
      </AuthCard>
    </AuthShell>
  );
}
