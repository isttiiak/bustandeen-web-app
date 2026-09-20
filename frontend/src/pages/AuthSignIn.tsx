import React, { useEffect, useState } from 'react';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { useAuthStore } from '../store/useAuthStore.js';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  AuthError,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase.js';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function AuthSignIn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user);

  // Safety net: once the auth store has a user, this page is done. App.tsx
  // navigates verified users away; unverified email/password sign-ins would
  // otherwise leave the button spinning here forever — send them home (the
  // verify-email gate protects the private pages).
  useEffect(() => {
    if (!user) return;
    setLoading(false);
    if (user.emailVerified === false) navigate('/', { replace: true });
  }, [user, navigate]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const google = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as AuthError).code ?? '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(mapFirebaseError(code, t));
      }
      setLoading(false);
    }
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

  // ── Forgot password panel ────────────────────────────────────────────────────
  const forgotPanel = (
    <AnimatePresence mode="wait">
      {forgotMode && (
        <motion.div
          key="forgot"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <button
            type="button"
            onClick={() => {
              setForgotMode(false);
              setResetSent(false);
              setResetError('');
              setResetEmail('');
            }}
            className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" /> {t('authSignIn.backToSignIn', 'Back to sign in')}
          </button>

          {resetSent ? (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-brand-emerald/15 border border-brand-emerald/30 flex items-center justify-center">
                  <EnvelopeIcon className="w-8 h-8 text-brand-emerald" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-white">
                  {t('authSignIn.checkEmail', 'Check your email')}
                </h3>
                <p className="text-white/50 text-sm">
                  {t('authSignIn.resetLinkSentTo', 'We sent a password reset link to')}
                </p>
                <p className="text-brand-emerald font-semibold text-sm break-all">{resetEmail}</p>
                <p className="text-white/30 text-xs pt-1 leading-relaxed">
                  {t(
                    'authSignIn.didntReceive',
                    "Didn't receive it? Check your spam folder or try again."
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setResetSent(false);
                  setResetError('');
                }}
                className="text-white/40 hover:text-brand-emerald text-sm transition-colors"
              >
                {t('authSignIn.sendAgain', 'Send again')}
              </button>
            </div>
          ) : (
            <form onSubmit={onSendReset} className="space-y-5">
              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-white">
                  {t('authSignIn.resetPassword', 'Reset your password')}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {t(
                    'authSignIn.resetPasswordDesc',
                    "Enter your account email and we'll send you a link to reset your password."
                  )}
                </p>
              </div>

              {resetError && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  <ExclamationCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">
                  {t('authSignIn.emailAddress', 'Email address')}
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    resetError && setResetError('');
                  }}
                  className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-brand-border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-emerald/50 focus:border-transparent transition-all"
                  placeholder={t('authSignIn.emailPlaceholder', 'you@example.com')}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading || !resetEmail.trim()}
                className="w-full bg-brand-emerald hover:bg-brand-emerald-dim text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  t('authSignIn.sendResetLink', 'Send Reset Link')
                )}
              </button>
            </form>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Sign-in form ─────────────────────────────────────────────────────────────
  return (
    <AnimatedBackground variant="dark">
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          <motion.div
            variants={itemVariants}
            className="relative bg-brand-surface/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-brand-border/60"
          >
            <div className="space-y-8">
              {/* Title — always visible */}
              <motion.div variants={itemVariants} className="text-center space-y-3">
                <h1 className="text-4xl sm:text-5xl font-bold text-brand-emerald">
                  {forgotMode
                    ? t('authSignIn.forgotPasswordTitle', 'Forgot Password')
                    : t('authSignIn.welcomeBack', 'Welcome Back')}
                </h1>
                {!forgotMode && (
                  <p className="text-white/60 text-sm sm:text-base">
                    {t('authSignIn.subtitle', 'Log in to continue your spiritual journey')}
                  </p>
                )}
              </motion.div>

              {/* Forgot password panel */}
              {forgotMode ? (
                forgotPanel
              ) : (
                <>
                  {/* Google button */}
                  <motion.button
                    variants={itemVariants}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full relative group bg-white hover:bg-white/90 text-brand-deep font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={google}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="loading loading-spinner loading-md text-brand-emerald" />
                    ) : (
                      <>
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span>{t('authSignIn.continueWithGoogle', 'Continue with Google')}</span>
                      </>
                    )}
                  </motion.button>

                  <motion.div variants={itemVariants} className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-brand-border" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-brand-surface text-white/40">
                        {t('authSignIn.orContinueWithEmail', 'or continue with email')}
                      </span>
                    </div>
                  </motion.div>

                  <motion.form variants={itemVariants} onSubmit={onSubmit} className="space-y-5">
                    {error && (
                      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        <ExclamationCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70">
                        {t('authSignIn.email', 'Email')}
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        onChange={() => error && setError('')}
                        className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-brand-border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-emerald/50 focus:border-transparent transition-all duration-300"
                        placeholder={t('authSignIn.emailPlaceholder', 'you@example.com')}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-white/70">
                          {t('authSignIn.password', 'Password')}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotMode(true);
                            setError('');
                          }}
                          className="text-xs text-white/40 hover:text-brand-emerald transition-colors"
                        >
                          {t('authSignIn.forgotPasswordLink', 'Forgot password?')}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          required
                          onChange={() => error && setError('')}
                          className="w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-brand-border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-emerald/50 focus:border-transparent transition-all duration-300 pr-12"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="w-5 h-5" />
                          ) : (
                            <EyeIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="w-full bg-brand-emerald hover:bg-brand-emerald-dim text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        t('common.signIn')
                      )}
                    </motion.button>
                  </motion.form>

                  <motion.div variants={itemVariants} className="text-center">
                    <p className="text-brand-gold/50 text-xs italic mb-3 px-2">
                      💡{' '}
                      {t(
                        'authSignIn.googleTipPrefix',
                        'For the most flexible experience (instant photo, easier sign-in), use'
                      )}{' '}
                      <span className="font-semibold text-brand-gold/70">
                        {t('authSignIn.continueWithGoogle', 'Continue with Google')}
                      </span>
                      .
                    </p>
                  </motion.div>
                  <motion.div variants={itemVariants} className="text-center">
                    <p className="text-white/40 text-sm">
                      {t('authSignIn.noAccount', "Don't have an account?")}{' '}
                      <button
                        onClick={() => navigate('/signup')}
                        className="text-brand-emerald hover:text-brand-emerald-dim font-semibold transition-colors"
                      >
                        {t('authSignIn.signUpLink', 'Sign up')}
                      </button>
                    </p>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AnimatedBackground>
  );
}
