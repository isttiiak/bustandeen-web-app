import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  AuthError,
} from 'firebase/auth';
import { auth } from '../firebase.js';
import { m as motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { BTN_PRIMARY, BTN_SECONDARY } from '../components/bustanStyles.js';
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

// Firebase email action links (verify email, reset password) land here.
// T3.2: the shared auth shell, one arch hero per state, theme card for the form.

const Spinner = ({ label }: { label: string }) => (
  <AuthHero
    icon={<span className="loading loading-spinner loading-md" />}
    title={label}
    titleAs="h1"
  />
);

const FailIcon = <ExclamationCircleIcon className="w-7 h-7 text-red-400" />;

/** Two actions side by side: primary first. */
function Actions({
  primary,
  secondary,
}: {
  primary: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mt-6 flex gap-3">
      <button type="button" onClick={primary.onClick} className={`${BTN_PRIMARY} flex-1 py-3`}>
        {primary.label}
      </button>
      {secondary && (
        <button
          type="button"
          onClick={secondary.onClick}
          className={`${BTN_SECONDARY} flex-1 py-3`}
        >
          {secondary.label}
        </button>
      )}
    </div>
  );
}

// ── Email Verification handler ───────────────────────────────────────────────
function VerifyEmailView({ oobCode }: { oobCode: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    applyActionCode(auth, oobCode)
      .then(() => {
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }, [oobCode]);

  useEffect(() => {
    if (status !== 'success') return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          navigate('/');
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status, navigate]);

  return (
    <AuthShell>
      {status === 'loading' && (
        <Spinner label={t('authAction.verifyingEmail', 'Verifying your email…')} />
      )}

      {status === 'success' && (
        <AuthHero
          icon={<CheckCircleIcon className="w-7 h-7" />}
          title={t('authAction.emailVerified', 'Email Verified!')}
          subtitle={t(
            'authAction.emailVerifiedDesc',
            'Your email address has been successfully verified. Redirecting to the app…'
          )}
        >
          <div className="mt-5 w-full bg-brand-border rounded-full h-1 overflow-hidden">
            <motion.div
              className="h-full bg-brand-emerald rounded-full"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 4, ease: 'linear' }}
            />
          </div>
          <p className="text-white/70 text-xs mt-2">
            {t('authAction.redirectingIn', 'Redirecting in {{count}}s…', { count: countdown })}
          </p>
          <Actions
            primary={{
              label: t('authAction.goToAppNow', 'Go to App Now'),
              onClick: () => navigate('/'),
            }}
          />
        </AuthHero>
      )}

      {status === 'error' && (
        <AuthHero
          icon={FailIcon}
          title={t('authAction.verificationFailed', 'Verification Failed')}
          subtitle={t(
            'authAction.verificationFailedDesc',
            'The verification link has expired or already been used. Please sign in and request a new verification email.'
          )}
        >
          <Actions
            primary={{ label: t('common.signIn'), onClick: () => navigate('/login') }}
            secondary={{ label: t('authAction.home', 'Home'), onClick: () => navigate('/') }}
          />
        </AuthHero>
      )}
    </AuthShell>
  );
}

// ── Password Reset handler ───────────────────────────────────────────────────
/** Admin reset links (sent by the Servant) carry next=admin: back to the admin
 * sign-in instead of the app's. A fixed path, never a URL from the link. */
function ResetPasswordView({ oobCode, signInPath }: { oobCode: string; signInPath: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [verifyStatus, setVerifyStatus] = useState<'loading' | 'ready' | 'invalid'>('loading');
  const [resetEmail, setResetEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const confirmMismatch = confirmTouched && confirm !== password;

  useEffect(() => {
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setResetEmail(email);
        setVerifyStatus('ready');
      })
      .catch(() => setVerifyStatus('invalid'));
  }, [oobCode]);

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
    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
    } catch (err) {
      const code = (err as AuthError).code ?? '';
      if (code === 'auth/expired-action-code')
        setError(
          t('authAction.errExpiredLink', 'This reset link has expired. Please request a new one.')
        );
      else if (code === 'auth/user-disabled')
        setError(
          t(
            'authAction.errUserDisabled',
            'This account is switched off, so its password cannot be changed. Please contact us.'
          )
        );
      else if (code === 'auth/weak-password')
        setError(t('authSignUp.errWeakPassword', 'Password must be at least 6 characters.'));
      else setError(t('authAction.errResetFailed', 'Failed to reset password. Please try again.'));
    }
    setSubmitting(false);
  };

  if (verifyStatus === 'loading') {
    return (
      <AuthShell>
        <Spinner label={t('authAction.verifyingResetLink', 'Verifying reset link…')} />
      </AuthShell>
    );
  }

  if (verifyStatus === 'invalid') {
    return (
      <AuthShell>
        <AuthHero
          icon={FailIcon}
          title={t('authAction.linkExpired', 'Link Expired')}
          subtitle={t(
            'authAction.linkExpiredDesc',
            'This password reset link has expired or already been used. Please request a new one from the sign-in page.'
          )}
        >
          <Actions
            primary={{
              label: t('authSignIn.backToSignIn', 'Back to sign in'),
              onClick: () => navigate(signInPath),
            }}
          />
        </AuthHero>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell>
        <AuthHero
          icon={<ShieldCheckIcon className="w-7 h-7" />}
          title={t('authAction.passwordReset', 'Password Reset!')}
          subtitle={t(
            'authAction.passwordResetDesc',
            'Your password has been changed successfully. You can now sign in with your new password.'
          )}
        >
          <Actions
            primary={{ label: t('common.signIn'), onClick: () => navigate(signInPath) }}
            secondary={
              signInPath === '/login'
                ? { label: t('authAction.goToApp', 'Go to App'), onClick: () => navigate('/') }
                : undefined
            }
          />
        </AuthHero>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHero
        icon={<ShieldCheckIcon className="w-7 h-7" />}
        title={t('authAction.newPassword', 'New Password')}
        subtitle={
          resetEmail && (
            <p>
              {t('authAction.forEmail', 'for')}{' '}
              <span className="text-brand-emerald font-semibold break-all">{resetEmail}</span>
            </p>
          )
        }
      />
      <AuthCard>
        <form onSubmit={onSubmit} className="space-y-5">
          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="space-y-2">
            <label htmlFor="reset-new" className={LABEL}>
              {t('authAction.newPasswordLabel', 'New Password')}
            </label>
            <PasswordField
              id="reset-new"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder={t('authSignUp.passwordPlaceholder', 'Create a strong password')}
              required
            />
            <StrengthMeter password={password} />
          </div>

          <div className="space-y-2">
            <label htmlFor="reset-confirm" className={LABEL}>
              {t('authSignUp.confirmPassword', 'Confirm Password')}
            </label>
            <PasswordField
              id="reset-confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError('');
              }}
              onBlur={() => setConfirmTouched(true)}
              placeholder={t('authSignUp.confirmPasswordPlaceholder', 'Repeat your password')}
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
            disabled={submitting || confirmMismatch || !password || !confirm}
            className={`${BTN_PRIMARY} w-full py-3`}
          >
            {submitting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              t('authAction.setNewPassword', 'Set New Password')
            )}
          </button>
        </form>

        <p className="text-center text-white/80 text-xs">
          {t('authAction.rememberedPassword', 'Remembered your password?')}{' '}
          <button type="button" onClick={() => navigate(signInPath)} className={TEXT_ACTION}>
            {t('common.signIn')}
          </button>
        </p>
      </AuthCard>
    </AuthShell>
  );
}

// ── Main dispatcher ──────────────────────────────────────────────────────────
export default function AuthAction() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  if (!oobCode) {
    // Firebase's own hosted action page (firebaseapp.com/__/auth/action) can
    // intercept the email link before this one ever sees mode/oobCode: its
    // "Continue" link forwards only continueUrl, not the action params. If
    // that happened, the action already completed there; this is reassurance,
    // not a real dead end, so it deliberately avoids alarming "invalid" wording.
    return (
      <AuthShell>
        <AuthHero
          icon={<ExclamationCircleIcon className="w-7 h-7 text-brand-gold" />}
          title={t('authAction.noActionCode', "This link didn't carry the details we need")}
          subtitle={t(
            'authAction.noActionCodeDesc',
            "If you just clicked a verification or password reset link, it may have already gone through. Try signing in. If it didn't work, request a new link and use it directly from your email."
          )}
        >
          <Actions
            primary={{ label: t('common.signIn'), onClick: () => navigate('/login') }}
            secondary={{ label: t('authAction.goHome', 'Go Home'), onClick: () => navigate('/') }}
          />
        </AuthHero>
      </AuthShell>
    );
  }

  if (mode === 'verifyEmail') return <VerifyEmailView oobCode={oobCode} />;
  if (mode === 'resetPassword')
    return (
      <ResetPasswordView
        oobCode={oobCode}
        signInPath={searchParams.get('next') === 'admin' ? '/admin' : '/login'}
      />
    );

  return (
    <AuthShell>
      <AuthHero
        icon={FailIcon}
        title={t(
          'authAction.unknownAction',
          'Unknown action. Please use a valid link from your email.'
        )}
      >
        <Actions
          primary={{ label: t('authAction.goHome', 'Go Home'), onClick: () => navigate('/') }}
        />
      </AuthHero>
    </AuthShell>
  );
}
