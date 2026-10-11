import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ExclamationCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { auth } from '../firebase.js';
import { useSignupCheck, useSignupComplete } from '../hooks/useAuthEmails.js';
import { BTN_PRIMARY } from '../components/bustanStyles.js';
import {
  AuthCard,
  AuthHero,
  AuthShell,
  ErrorNote,
  LABEL,
  PasswordField,
  StrengthMeter,
  TEXT_ACTION,
} from '../components/auth/authParts.js';

// Email-first sign-up, step 2 (v5.156.0): the link from the sign-up email
// lands here. Choosing a password creates the account (already verified) and
// signs in. Until this page is used, no account exists for the email.

const errorCode = (err: unknown): string =>
  axios.isAxiosError(err) ? ((err.response?.data as { error?: string })?.error ?? '') : '';

export default function AuthSignupComplete() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const check = useSignupCheck();
  const complete = useSignupComplete();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [expired, setExpired] = useState(false);

  const { mutate: runCheck } = check;
  useEffect(() => {
    if (token) runCheck(token);
  }, [token, runCheck]);

  const confirmMismatch = confirmTouched && confirm !== password;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError(t('authSignUp.errWeakPassword', 'Password must be at least 6 characters.'));
      return;
    }
    if (password !== confirm) {
      setError(t('authSignUp.errPasswordMismatch', 'Passwords do not match.'));
      return;
    }
    setError('');
    setWorking(true);
    try {
      const { email, gender } = await complete.mutateAsync({ token, password });
      // App.tsx sends it with the first /api/auth/verify after sign-in.
      sessionStorage.setItem('bustandeen_pending_gender', gender);
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      const code = errorCode(err);
      if (code === 'account_exists')
        setError(
          t(
            'authSignupComplete.errExists',
            'This email already has an account. Please sign in instead.'
          )
        );
      else if (code === 'link_invalid') setExpired(true);
      else
        setError(
          t('authSignupComplete.errGeneric', 'Could not create the account. Please try again.')
        );
      setWorking(false);
    }
  };

  if (!token || check.isError || expired) {
    return (
      <AuthShell>
        <AuthHero
          icon={<ExclamationCircleIcon className="w-7 h-7 text-red-400" />}
          title={t('authSignupComplete.invalidTitle', 'This link has expired')}
          titleAs="h1"
          subtitle={t(
            'authSignupComplete.invalidDesc',
            'Sign-up links work once and expire within 1 hour. Please sign up again to get a new link.'
          )}
        >
          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className={`${BTN_PRIMARY} w-full py-3`}
            >
              {t('authSignupComplete.signUpAgain', 'Sign up again')}
            </button>
          </div>
        </AuthHero>
      </AuthShell>
    );
  }

  if (!check.data) {
    return (
      <AuthShell>
        <AuthHero
          icon={<span className="loading loading-spinner loading-md" />}
          title={t('authSignupComplete.checking', 'Checking your link…')}
          titleAs="h1"
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHero
        icon={<ShieldCheckIcon className="w-7 h-7" />}
        title={t('authSignupComplete.title', 'Choose your password')}
        titleAs="h1"
        subtitle={
          <>
            {t('authSignupComplete.finishingFor', 'Finishing the account for')}{' '}
            <span className="text-brand-emerald break-all">{check.data.email}</span>
          </>
        }
      />
      <AuthCard>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="space-y-1.5">
            <label htmlFor="complete-password" className={LABEL}>
              {t('authSignIn.password', 'Password')}
            </label>
            <PasswordField
              id="complete-password"
              name="password"
              autoComplete="new-password"
              placeholder={t('authSignUp.passwordPlaceholder', 'Create a strong password')}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              required
            />
            <StrengthMeter password={password} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="complete-confirm" className={LABEL}>
              {t('authSignUp.confirmPassword', 'Confirm Password')}
            </label>
            <PasswordField
              id="complete-confirm"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder={t('authSignUp.confirmPasswordPlaceholder', 'Repeat your password')}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (error) setError('');
              }}
              onBlur={() => setConfirmTouched(true)}
              state={
                confirmMismatch
                  ? 'bad'
                  : confirmTouched && confirm && confirm === password
                    ? 'ok'
                    : undefined
              }
              aria-invalid={confirmMismatch || undefined}
              required
            />
            {confirmMismatch && (
              <p className="text-xs text-red-400">
                {t('authSignUp.errPasswordMismatch', 'Passwords do not match.')}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={working || confirmMismatch}
            className={`${BTN_PRIMARY} w-full py-3`}
          >
            {working ? (
              <span className="loading loading-spinner loading-md" />
            ) : (
              t('authSignupComplete.create', 'Create my account')
            )}
          </button>
        </form>
        <p className="text-center text-sm text-white/80">
          {t('authSignUp.alreadyHaveAccount', 'Already have an account?')}{' '}
          <button type="button" className={TEXT_ACTION} onClick={() => navigate('/login')}>
            {t('authSignUp.logIn', 'Log in')}
          </button>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
