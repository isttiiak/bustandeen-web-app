import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { auth } from '../firebase.js';
import {
  type SignupStartInput,
  useSignupStart,
  useVerificationEmail,
} from '../hooks/useAuthEmails.js';
import { useSignInFlow } from '../utils/useSignInFlow.js';
import SigningInOverlay from '../components/SigningInOverlay.js';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../store/useAuthStore.js';
import { useTranslation } from 'react-i18next';
import LegalAgreeLine from '../components/LegalAgreeLine.js';
import { CheckCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { LeafIcon } from '../components/icons/IslamicIcons.js';
import { BTN_PRIMARY, OPTION_OFF, OPTION_ON } from '../components/bustanStyles.js';
import {
  AuthCard,
  AuthHero,
  AuthShell,
  ErrorNote,
  INPUT,
  INPUT_BAD,
  INPUT_OK,
  LABEL,
  OrDivider,
  TEXT_ACTION,
} from '../components/auth/authParts.js';
import GoogleGlyph, { GOOGLE_BTN } from '../components/auth/GoogleGlyph.js';

type Translator = (key: string, fallback: string) => string;

function mapFirebaseError(code: string, t: Translator): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return t(
        'authSignUp.errEmailInUse',
        'An account with this email already exists. Try signing in instead.'
      );
    case 'auth/invalid-email':
      return t('authSignUp.errInvalidEmail', 'Please enter a valid email address.');
    case 'auth/weak-password':
      return t('authSignUp.errWeakPassword', 'Password must be at least 6 characters.');
    case 'auth/too-many-requests':
      return t(
        'authSignUp.errTooManyRequests',
        'Too many attempts. Please wait a moment and try again.'
      );
    case 'auth/network-request-failed':
      return t('authSignUp.errNetwork', 'Network error. Check your connection and try again.');
    default:
      return t('authSignUp.errGeneric', 'Account creation failed. Please try again.');
  }
}

// Stricter email regex: requires a real domain with a TLD of 2+ chars
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function signupStartError(err: unknown, t: Translator): string {
  if (axios.isAxiosError(err) && err.response?.status === 429)
    return t(
      'authSignUp.errTooManyRequests',
      'Too many attempts. Please wait a moment and try again.'
    );
  if (axios.isAxiosError(err) && !err.response)
    return t('authSignUp.errNetwork', 'Network error. Check your connection and try again.');
  return t('authSignUp.errGeneric', 'Account creation failed. Please try again.');
}

export default function AuthSignUp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const sendVerification = useVerificationEmail();
  const [error, setError] = useState('');
  const { loading, setLoading, google, signingIn } = useSignInFlow((code) =>
    setError(mapFirebaseError(code, t))
  );
  const signupStart = useSignupStart();
  // Email-first sign-up: step 1 only emails a link; the account is created
  // on /signup/complete once a password is chosen (AuthSignupComplete).
  const [linkInput, setLinkInput] = useState<SignupStartInput | null>(null);
  const [linkResent, setLinkResent] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailValue, setEmailValue] = useState('');

  // After successful account creation
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | ''>('');

  // If the user navigates back to /signup while already signed in but unverified, show the verification screen
  useEffect(() => {
    if (user && user.emailVerified === false && !verificationSent) {
      setVerificationEmail(user.email ?? '');
      setVerificationSent(true);
    }
  }, [user, verificationSent]);

  const emailInvalid = emailTouched && emailValue.length > 0 && !isValidEmail(emailValue);

  const onGoogle = () => {
    setError('');
    void google();
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const form = e.currentTarget;
    const firstName = (form.elements.namedItem('firstName') as HTMLInputElement).value.trim();
    const lastName = (form.elements.namedItem('lastName') as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();

    if (!gender) {
      setError(t('authSignUp.errGenderRequired', 'Please select your gender to continue.'));
      return;
    }
    if (!isValidEmail(email)) {
      setError(
        t('authSignUp.errEmailFormat', 'Please enter a valid email address (e.g. name@domain.com).')
      );
      return;
    }

    setLoading(true);
    const input: SignupStartInput = { firstName, lastName, email, gender };
    try {
      await signupStart.mutateAsync(input);
      setLinkInput(input);
    } catch (err) {
      setError(signupStartError(err, t));
    }
    setLoading(false);
  };

  const resendLink = async () => {
    if (!linkInput || signupStart.isPending) return;
    setLinkResent(false);
    try {
      await signupStart.mutateAsync(linkInput);
      setLinkResent(true);
    } catch (err) {
      setError(signupStartError(err, t));
    }
  };

  const resendVerification = async () => {
    if (resendLoading) return;
    setResendLoading(true);
    setResendSuccess(false);
    try {
      if (auth.currentUser) {
        await sendVerification.mutateAsync();
        setResendSuccess(true);
      }
    } catch {
      /* non-fatal */
    }
    setResendLoading(false);
  };

  // ── Verification sent screen ─────────────────────────────────────────────────
  if (verificationSent) {
    return (
      <AuthShell>
        <AuthHero
          icon={<EnvelopeIcon className="w-7 h-7" />}
          titleAs="h1"
          title={t('authSignUp.checkInbox', 'Check your inbox')}
          subtitle={
            <>
              <p>{t('authSignUp.verificationSentTo', 'We sent a verification link to')}</p>
              <p className="text-brand-emerald font-semibold break-all mt-1">{verificationEmail}</p>
              <p className="text-white/70 text-xs mt-2">
                {t(
                  'authSignUp.verifyToContinue',
                  'Click the link in the email to confirm your address. Your account opens once it is confirmed.'
                )}
              </p>
            </>
          }
        >
          <div className="mt-6 space-y-4">
            {resendSuccess ? (
              <p className="flex items-center justify-center gap-2 text-brand-emerald text-sm">
                <CheckCircleIcon className="w-4 h-4" />
                {t('authSignUp.verificationResent', 'Verification email resent!')}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void resendVerification()}
                disabled={resendLoading}
                className={`${TEXT_ACTION} text-sm disabled:opacity-50`}
              >
                {resendLoading
                  ? t('authSignUp.sending', 'Sending…')
                  : t('app.resendVerification', 'Resend verification email')}
              </button>
            )}
            <p className="text-white/80 text-xs">
              {t('authSignUp.wrongEmail', 'Wrong email?')}{' '}
              <button
                type="button"
                className={TEXT_ACTION}
                onClick={() => {
                  setVerificationSent(false);
                  setVerificationEmail('');
                }}
              >
                {t('authSignUp.goBack', 'Go back')}
              </button>
            </p>
          </div>
        </AuthHero>
      </AuthShell>
    );
  }

  // ── Sign-up link sent (email-first) ──────────────────────────────────────────
  if (linkInput) {
    return (
      <AuthShell>
        <AuthHero
          icon={<EnvelopeIcon className="w-7 h-7" />}
          titleAs="h1"
          title={t('authSignUp.checkInbox', 'Check your inbox')}
          subtitle={
            <>
              <p>
                {t('authSignUp.linkSentTo', 'We sent a link to finish creating your account to')}
              </p>
              <p className="text-brand-emerald font-semibold break-all mt-1">{linkInput.email}</p>
              <p className="text-white/70 text-xs mt-2">
                {t(
                  'authSignUp.linkSentHint',
                  'Open it and choose your password. The link works once and expires within 1 hour. Your account is created only after that.'
                )}
              </p>
            </>
          }
        >
          <div className="mt-6 space-y-4">
            {error && <ErrorNote>{error}</ErrorNote>}
            {linkResent ? (
              <p className="flex items-center justify-center gap-2 text-brand-emerald text-sm">
                <CheckCircleIcon className="w-4 h-4" />
                {t('authSignUp.linkResent', 'A new link is on its way.')}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void resendLink()}
                disabled={signupStart.isPending}
                className={`${TEXT_ACTION} text-sm disabled:opacity-50`}
              >
                {signupStart.isPending
                  ? t('authSignUp.sending', 'Sending…')
                  : t('authSignIn.sendAgain', 'Send again')}
              </button>
            )}
            <p className="text-white/80 text-xs">
              {t('authSignUp.wrongEmail', 'Wrong email?')}{' '}
              <button
                type="button"
                className={TEXT_ACTION}
                onClick={() => {
                  setLinkInput(null);
                  setLinkResent(false);
                  setError('');
                }}
              >
                {t('authSignUp.goBack', 'Go back')}
              </button>
            </p>
          </div>
        </AuthHero>
      </AuthShell>
    );
  }

  // ── Sign-up form ─────────────────────────────────────────────────────────────
  return (
    <AuthShell>
      <SigningInOverlay show={signingIn} />
      <AuthHero
        icon={<LeafIcon className="w-7 h-7" />}
        title={t('authSignUp.joinIhsan', 'Join Bustandeen')}
        subtitle={t('authSignUp.subtitle', 'Start your spiritual journey today')}
      />
      <AuthCard>
        <button type="button" className={GOOGLE_BTN} onClick={onGoogle} disabled={loading}>
          {loading ? (
            <span className="loading loading-spinner loading-md text-brand-emerald" />
          ) : (
            <>
              <GoogleGlyph />
              {t('authSignUp.signUpWithGoogle', 'Sign up with Google')}
            </>
          )}
        </button>

        <OrDivider label={t('authSignUp.or', 'OR')} />

        <form onSubmit={onSubmit} className="space-y-4">
          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="signup-first" className={LABEL}>
                {t('authSignUp.firstName', 'First Name')}
              </label>
              <input
                id="signup-first"
                name="firstName"
                type="text"
                autoComplete="given-name"
                placeholder={t('authSignUp.firstNamePlaceholder', 'First name')}
                className={INPUT}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="signup-last" className={LABEL}>
                {t('authSignUp.lastName', 'Last Name')}
              </label>
              <input
                id="signup-last"
                name="lastName"
                type="text"
                autoComplete="family-name"
                placeholder={t('authSignUp.lastNamePlaceholder', 'Last name')}
                className={INPUT}
              />
            </div>
          </div>

          <div className="space-y-2" role="radiogroup" aria-labelledby="signup-gender">
            <p id="signup-gender" className={LABEL}>
              {t('authSignUp.gender', 'Gender')} <span className="text-red-400">*</span>
            </p>
            <p className="text-white/70 text-xs leading-relaxed">
              {t(
                'authSignUp.genderHint',
                'Required for personalized content and Rayhanah (cycle tracking for sisters).'
              )}
            </p>
            <div className="flex gap-3">
              {(['male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={gender === g}
                  onClick={() => setGender(g)}
                  className={`flex-1 py-2.5 rounded-control text-sm font-semibold border transition-colors ${
                    gender === g ? OPTION_ON : OPTION_OFF
                  }`}
                >
                  {g === 'male'
                    ? t('authSignUp.brother', 'Brother')
                    : t('authSignUp.sister', 'Sister')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signup-email" className={LABEL}>
              {t('authSignIn.email', 'Email')}
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t('authSignIn.emailPlaceholder', 'you@example.com')}
              value={emailValue}
              onChange={(e) => {
                setEmailValue(e.target.value);
                if (error) setError('');
              }}
              onBlur={() => setEmailTouched(true)}
              aria-invalid={emailInvalid || undefined}
              className={`${INPUT} ${
                emailInvalid
                  ? INPUT_BAD
                  : emailTouched && emailValue && isValidEmail(emailValue)
                    ? INPUT_OK
                    : ''
              }`}
              required
            />
            {emailInvalid && (
              <p className="text-xs text-red-400">
                {t(
                  'authSignUp.errEmailFormat',
                  'Enter a valid email address (e.g. name@domain.com).'
                )}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || emailInvalid}
            className={`${BTN_PRIMARY} w-full py-3`}
          >
            {loading ? (
              <span className="loading loading-spinner loading-md" />
            ) : (
              t('authSignUp.sendLink', 'Continue with email')
            )}
          </button>
        </form>

        <p className="text-center text-sm text-white/80">
          {t('authSignUp.alreadyHaveAccount', 'Already have an account?')}{' '}
          <button type="button" className={TEXT_ACTION} onClick={() => navigate('/login')}>
            {t('authSignUp.logIn', 'Log in')}
          </button>
        </p>
        <LegalAgreeLine mode="signUp" />
      </AuthCard>
    </AuthShell>
  );
}
