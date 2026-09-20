import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  AuthError,
} from 'firebase/auth';
import { auth } from '../firebase.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

type Translator = (key: string, fallback: string) => string;

function getPasswordStrength(
  pw: string,
  t: Translator
): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1)
    return { score, label: t('authSignUp.strengthWeak', 'Weak'), color: 'bg-red-500' };
  if (score === 2)
    return { score, label: t('authSignUp.strengthFair', 'Fair'), color: 'bg-brand-gold' };
  if (score === 3)
    return { score, label: t('authSignUp.strengthGood', 'Good'), color: 'bg-brand-info' };
  return { score, label: t('authSignUp.strengthStrong', 'Strong'), color: 'bg-brand-emerald' };
}

// ── Shared layout wrapper ────────────────────────────────────────────────────
function ActionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-brand-void flex items-center justify-center p-4">
      <motion.div
        className="absolute top-0 left-0 w-96 h-96 rounded-full bg-gradient-to-br from-brand-emerald/20 to-brand-info/20 blur-3xl pointer-events-none"
        animate={{ y: [0, -30, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-brand-warm/20 to-brand-warm/20 blur-3xl pointer-events-none"
        animate={{ y: [0, 30, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <div className="relative w-full max-w-md space-y-6">
        {/* Bustandeen wordmark */}
        <div className="text-center">
          <span className="text-3xl font-black tracking-tight text-brand-emerald">
            🌱 Bustandeen
          </span>
          <p className="text-white/30 text-xs mt-1">Nourish your deen</p>
        </div>
        {children}
      </div>
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
    <ActionLayout>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-brand-surface/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-brand-border/60 text-center space-y-6"
      >
        {status === 'loading' && (
          <>
            <span className="loading loading-spinner loading-lg text-brand-emerald mx-auto block" />
            <p className="text-white/50 text-sm">
              {t('authAction.verifyingEmail', 'Verifying your email…')}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-brand-emerald/15 border-2 border-brand-emerald/40 flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 text-brand-emerald" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">
                {t('authAction.emailVerified', 'Email Verified!')}
              </h2>
              <p className="text-white/50 text-sm leading-relaxed">
                {t(
                  'authAction.emailVerifiedDesc',
                  'Your email address has been successfully verified. Redirecting to the app…'
                )}
              </p>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
              <motion.div
                className="h-full bg-brand-emerald rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 4, ease: 'linear' }}
              />
            </div>
            <p className="text-white/30 text-xs">
              {t('authAction.redirectingIn', 'Redirecting in {{count}}s…', { count: countdown })}
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-brand-emerald hover:bg-brand-emerald-dim text-white rounded-xl font-semibold transition-all"
            >
              {t('authAction.goToAppNow', 'Go to App Now')}
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center">
                <ExclamationCircleIcon className="w-10 h-10 text-red-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">
                {t('authAction.verificationFailed', 'Verification Failed')}
              </h2>
              <p className="text-white/50 text-sm leading-relaxed">
                {t(
                  'authAction.verificationFailedDesc',
                  'The verification link has expired or already been used. Please sign in and request a new verification email.'
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/login')}
                className="flex-1 py-3 bg-brand-emerald hover:bg-brand-emerald-dim text-white rounded-xl font-semibold transition-all text-sm"
              >
                {t('common.signIn')}
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 py-3 bg-brand-surface border border-brand-border hover:border-brand-emerald/40 text-white/60 hover:text-white rounded-xl font-semibold transition-all text-sm"
              >
                {t('authAction.home', 'Home')}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </ActionLayout>
  );
}

// ── Password Reset handler ───────────────────────────────────────────────────
function ResetPasswordView({ oobCode }: { oobCode: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [verifyStatus, setVerifyStatus] = useState<'loading' | 'ready' | 'invalid'>('loading');
  const [resetEmail, setResetEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(password, t);
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
      else if (code === 'auth/weak-password')
        setError(t('authSignUp.errWeakPassword', 'Password must be at least 6 characters.'));
      else setError(t('authAction.errResetFailed', 'Failed to reset password. Please try again.'));
    }
    setSubmitting(false);
  };

  if (verifyStatus === 'loading') {
    return (
      <ActionLayout>
        <div className="bg-brand-surface/80 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-brand-border/60 text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-brand-emerald mx-auto block" />
          <p className="text-white/50 text-sm">
            {t('authAction.verifyingResetLink', 'Verifying reset link…')}
          </p>
        </div>
      </ActionLayout>
    );
  }

  if (verifyStatus === 'invalid') {
    return (
      <ActionLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-surface/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-brand-border/60 text-center space-y-6"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center">
              <ExclamationCircleIcon className="w-10 h-10 text-red-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">
              {t('authAction.linkExpired', 'Link Expired')}
            </h2>
            <p className="text-white/50 text-sm leading-relaxed">
              {t(
                'authAction.linkExpiredDesc',
                'This password reset link has expired or already been used. Please request a new one from the sign-in page.'
              )}
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-brand-emerald hover:bg-brand-emerald-dim text-white rounded-xl font-semibold transition-all"
          >
            {t('authSignIn.backToSignIn', 'Back to sign in')}
          </button>
        </motion.div>
      </ActionLayout>
    );
  }

  if (success) {
    return (
      <ActionLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-brand-surface/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-brand-border/60 text-center space-y-6"
        >
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
              className="w-20 h-20 rounded-full bg-brand-emerald/15 border-2 border-brand-emerald/40 flex items-center justify-center"
            >
              <ShieldCheckIcon className="w-10 h-10 text-brand-emerald" />
            </motion.div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">
              {t('authAction.passwordReset', 'Password Reset!')}
            </h2>
            <p className="text-white/50 text-sm leading-relaxed">
              {t(
                'authAction.passwordResetDesc',
                'Your password has been changed successfully. You can now sign in with your new password.'
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/login')}
              className="flex-1 py-3 bg-brand-emerald hover:bg-brand-emerald-dim text-white rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              {t('common.signIn')}
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-3 bg-brand-surface border border-brand-border hover:border-brand-emerald/40 text-white/60 hover:text-white rounded-xl font-semibold transition-all text-sm"
            >
              {t('authAction.goToApp', 'Go to App')}
            </button>
          </div>
        </motion.div>
      </ActionLayout>
    );
  }

  return (
    <ActionLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-brand-surface/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-brand-border/60 space-y-7"
      >
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-brand-emerald/15 border border-brand-emerald/30 flex items-center justify-center">
              <ShieldCheckIcon className="w-7 h-7 text-brand-emerald" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            {t('authAction.newPassword', 'New Password')}
          </h1>
          {resetEmail && (
            <p className="text-white/40 text-sm">
              {t('authAction.forEmail', 'for')}{' '}
              <span className="text-brand-emerald/80 font-medium">{resetEmail}</span>
            </p>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
              >
                <ExclamationCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* New password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70">
              {t('authAction.newPasswordLabel', 'New Password')}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder={t('authSignUp.passwordPlaceholder', 'Create a strong password')}
                required
                autoFocus
                className="w-full px-4 py-3.5 pr-12 bg-white/5 border border-brand-border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-emerald/50 focus:border-transparent transition-all"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                {showPass ? (
                  <EyeSlashIcon className="w-5 h-5 text-white/40" />
                ) : (
                  <EyeIcon className="w-5 h-5 text-white/40" />
                )}
              </button>
            </div>
            {password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-white/10'}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-white/40">
                  {t('authSignUp.passwordStrengthLabel', '{{strength}} password', {
                    strength: strength.label,
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70">
              {t('authSignUp.confirmPassword', 'Confirm Password')}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError('');
                }}
                onBlur={() => setConfirmTouched(true)}
                placeholder={t('authSignUp.confirmPasswordPlaceholder', 'Repeat your password')}
                required
                className={`w-full px-4 py-3.5 pr-12 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                  confirmMismatch
                    ? 'border-red-500/60 focus:ring-red-500/40'
                    : confirmTouched && confirm && confirm === password
                      ? 'border-brand-emerald/60 focus:ring-brand-emerald/50'
                      : 'border-brand-border focus:ring-brand-emerald/50'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {confirmTouched &&
                  confirm &&
                  (confirm === password ? (
                    <CheckCircleIcon className="w-4 h-4 text-brand-emerald" />
                  ) : (
                    <ExclamationCircleIcon className="w-4 h-4 text-red-400" />
                  ))}
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {showConfirm ? (
                    <EyeSlashIcon className="w-5 h-5 text-white/40" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-white/40" />
                  )}
                </button>
              </div>
            </div>
            {confirmMismatch && (
              <p className="text-xs text-red-400">
                {t('authSignUp.errPasswordMismatch', 'Passwords do not match.')}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || confirmMismatch || !password || !confirm}
            className="w-full py-4 bg-brand-emerald hover:bg-brand-emerald-dim text-white font-semibold rounded-xl transition-all shadow-[0_4px_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              t('authAction.setNewPassword', 'Set New Password')
            )}
          </button>
        </form>

        <p className="text-center text-white/30 text-xs">
          {t('authAction.rememberedPassword', 'Remembered your password?')}{' '}
          <button onClick={() => navigate('/login')} className="text-brand-emerald hover:underline">
            {t('common.signIn')}
          </button>
        </p>
      </motion.div>
    </ActionLayout>
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
    // intercept the email link before this one ever sees mode/oobCode — its
    // "Continue" link forwards only continueUrl, not the action params. If
    // that happened, the action already completed there; this is reassurance,
    // not a real dead end, so it deliberately avoids alarming "invalid" wording.
    return (
      <ActionLayout>
        <div className="bg-brand-surface/80 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-brand-border/60 text-center space-y-5">
          <ExclamationCircleIcon className="w-12 h-12 text-brand-gold mx-auto" />
          <h2 className="text-2xl font-black text-white">
            {t('authAction.noActionCode', "This link didn't carry the details we need")}
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            {t(
              'authAction.noActionCodeDesc',
              "If you just clicked a verification or password reset link, it may have already gone through. Try signing in — if it didn't work, request a new link and use it directly from your email."
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/login')}
              className="flex-1 py-3 bg-brand-emerald hover:bg-brand-emerald-dim text-white rounded-xl font-semibold transition-all"
            >
              {t('common.signIn')}
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-3 bg-brand-surface border border-brand-border hover:border-brand-emerald/40 text-white/60 hover:text-white rounded-xl font-semibold transition-all text-sm"
            >
              {t('authAction.goHome', 'Go Home')}
            </button>
          </div>
        </div>
      </ActionLayout>
    );
  }

  if (mode === 'verifyEmail') return <VerifyEmailView oobCode={oobCode} />;
  if (mode === 'resetPassword') return <ResetPasswordView oobCode={oobCode} />;

  return (
    <ActionLayout>
      <div className="bg-brand-surface/80 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-brand-border/60 text-center space-y-5">
        <p className="text-white/50 text-sm">
          {t(
            'authAction.unknownAction',
            'Unknown action. Please use a valid link from your email.'
          )}
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 bg-brand-emerald hover:bg-brand-emerald-dim text-white rounded-xl font-semibold transition-all"
        >
          {t('authAction.goHome', 'Go Home')}
        </button>
      </div>
    </ActionLayout>
  );
}
