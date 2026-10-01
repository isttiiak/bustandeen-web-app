import React, { useEffect, useState } from 'react';
import AnimatedBackground from '../components/AnimatedBackground.js';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  AuthError,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase.js';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../store/useAuthStore.js';
import { useTranslation } from 'react-i18next';
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

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

// Stricter email regex: requires a real domain with a TLD of 2+ chars
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export default function AuthSignUp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);
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

  const strength = getPasswordStrength(password, t);
  const confirmMismatch = confirmTouched && confirm !== password;
  const emailInvalid = emailTouched && emailValue.length > 0 && !isValidEmail(emailValue);

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
    if (password !== confirm) {
      setError(t('authSignUp.errPasswordMismatch', 'Passwords do not match.'));
      return;
    }
    if (password.length < 6) {
      setError(t('authSignUp.errWeakPassword', 'Password must be at least 6 characters.'));
      return;
    }

    setLoading(true);
    try {
      sessionStorage.setItem('bustandeen_pending_gender', gender);
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      if (fullName) {
        try {
          await updateProfile(res.user, { displayName: fullName });
        } catch {
          /* non-fatal */
        }
      }
      // Send verification email — redirect to home after verification
      try {
        // handleCodeInApp:true makes Firebase's intermediate page immediately
        // redirect to our branded /auth/action with mode+oobCode still in the URL,
        // so the user never sees Firebase's generic action page.
        await sendEmailVerification(res.user, {
          url: 'https://bustandeen.com/auth/action',
          handleCodeInApp: true,
        });
      } catch {
        /* non-fatal */
      }
      setVerificationEmail(email);
      setVerificationSent(true);
      setLoading(false);
    } catch (err) {
      setError(mapFirebaseError((err as AuthError).code ?? '', t));
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (resendLoading) return;
    setResendLoading(true);
    setResendSuccess(false);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await sendEmailVerification(currentUser, {
          url: 'https://bustandeen.com/auth/action',
          handleCodeInApp: true,
        });
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
      <AnimatedBackground variant="dark">
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full max-w-md"
          >
            <div className="backdrop-blur-xl bg-brand-surface/80 rounded-3xl shadow-2xl border border-brand-border/60 p-8 sm:p-10 text-center space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-brand-emerald/15 border border-brand-emerald/30 flex items-center justify-center">
                  <EnvelopeIcon className="w-10 h-10 text-brand-emerald" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {t('authSignUp.checkInbox', 'Check your inbox')}
                </h2>
                <p className="text-white/50 text-sm leading-relaxed">
                  {t('authSignUp.verificationSentTo', 'We sent a verification link to')}
                </p>
                <p className="text-brand-emerald font-semibold text-sm break-all">
                  {verificationEmail}
                </p>
                <p className="text-white/40 text-xs leading-relaxed pt-1">
                  {t(
                    'authSignUp.verifyClickHint',
                    'Click the link in the email to verify your address. You can use the app now — some features require a verified email.'
                  )}
                </p>
              </div>

              {/* Resend */}
              <div className="space-y-2">
                {resendSuccess ? (
                  <div className="flex items-center justify-center gap-2 text-brand-emerald text-sm">
                    <CheckCircleIcon className="w-4 h-4" />
                    {t('authSignUp.verificationResent', 'Verification email resent!')}
                  </div>
                ) : (
                  <button
                    onClick={() => void resendVerification()}
                    disabled={resendLoading}
                    className="text-white/40 hover:text-brand-emerald text-sm transition-colors disabled:opacity-40"
                  >
                    {resendLoading
                      ? t('authSignUp.sending', 'Sending…')
                      : t('app.resendVerification', 'Resend verification email')}
                  </button>
                )}
              </div>

              {/* Continue to app */}
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 px-4 bg-brand-emerald hover:bg-brand-emerald-dim text-white rounded-xl font-semibold shadow-lg transition-all duration-300"
              >
                {t('authSignUp.continueToApp', 'Continue to App')}
              </button>

              <p className="text-white/30 text-xs">
                {t('authSignUp.wrongEmail', 'Wrong email?')}{' '}
                <button
                  className="text-brand-emerald hover:underline"
                  onClick={() => {
                    setVerificationSent(false);
                    setVerificationEmail('');
                  }}
                >
                  {t('authSignUp.goBack', 'Go back')}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      </AnimatedBackground>
    );
  }

  // ── Sign-up form ─────────────────────────────────────────────────────────────
  return (
    <AnimatedBackground variant="dark">
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="backdrop-blur-xl bg-brand-surface/80 rounded-3xl shadow-2xl border border-brand-border/60 overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-4xl sm:text-5xl font-bold text-brand-emerald">
                  {t('authSignUp.joinIhsan', 'Join Bustandeen')}
                </h2>
                <p className="text-white/60 text-sm sm:text-base">
                  {t('authSignUp.subtitle', 'Start your spiritual journey today')}
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 px-4 bg-white hover:bg-white/90 text-brand-deep rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 border border-brand-emerald/20 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={google}
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-md" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                    {t('authSignUp.signUpWithGoogle', 'Sign up with Google')}
                  </>
                )}
              </motion.button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-brand-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-brand-surface text-white/40">
                    {t('authSignUp.or', 'OR')}
                  </span>
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    <ExclamationCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-white/70 text-sm font-medium">
                      {t('authSignUp.firstName', 'First Name')}
                    </label>
                    <input
                      name="firstName"
                      type="text"
                      placeholder={t('authSignUp.firstNamePlaceholder', 'First name')}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-emerald/50 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-white/70 text-sm font-medium">
                      {t('authSignUp.lastName', 'Last Name')}
                    </label>
                    <input
                      name="lastName"
                      type="text"
                      placeholder={t('authSignUp.lastNamePlaceholder', 'Last name')}
                      className="w-full px-4 py-3 bg-white/5 border border-brand-border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-emerald/50 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-white/70 text-sm font-medium">
                    {t('authSignUp.gender', 'Gender')} <span className="text-red-400">*</span>
                  </label>
                  <p className="text-white/30 text-xs leading-relaxed">
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
                        onClick={() => setGender(g)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                          gender === g
                            ? 'bg-brand-emerald/20 border-brand-emerald/60 text-brand-emerald'
                            : 'bg-white/5 border-brand-border text-white/50 hover:border-brand-border/80'
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
                  <label className="text-white/70 text-sm font-medium">
                    {t('authSignIn.email', 'Email')}
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder={t('authSignIn.emailPlaceholder', 'you@example.com')}
                    value={emailValue}
                    onChange={(e) => {
                      setEmailValue(e.target.value);
                      error && setError('');
                    }}
                    onBlur={() => setEmailTouched(true)}
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      emailInvalid
                        ? 'border-red-500/60 focus:ring-red-500/40'
                        : emailTouched && emailValue && isValidEmail(emailValue)
                          ? 'border-brand-emerald/50 focus:ring-brand-emerald/50'
                          : 'border-brand-border focus:ring-brand-emerald/50'
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

                <div className="space-y-1.5">
                  <label className="text-white/70 text-sm font-medium">
                    {t('authSignIn.password', 'Password')}
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('authSignUp.passwordPlaceholder', 'Create a strong password')}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        error && setError('');
                      }}
                      className="w-full px-4 py-3 pr-12 bg-white/5 border border-brand-border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-emerald/50 focus:border-transparent transition-all"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5 text-white/50" />
                      ) : (
                        <EyeIcon className="w-5 h-5 text-white/50" />
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

                <div className="space-y-1.5">
                  <label className="text-white/70 text-sm font-medium">
                    {t('authSignUp.confirmPassword', 'Confirm Password')}
                  </label>
                  <div className="relative">
                    <input
                      name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder={t(
                        'authSignUp.confirmPasswordPlaceholder',
                        'Repeat your password'
                      )}
                      value={confirm}
                      onChange={(e) => {
                        setConfirm(e.target.value);
                        error && setError('');
                      }}
                      onBlur={() => setConfirmTouched(true)}
                      className={`w-full px-4 py-3 pr-12 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        confirmMismatch
                          ? 'border-red-500/60 focus:ring-red-500/40'
                          : confirmTouched && confirm && confirm === password
                            ? 'border-brand-emerald/60 focus:ring-brand-emerald/50'
                            : 'border-brand-border focus:ring-brand-emerald/50'
                      }`}
                      required
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
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                        onClick={() => setShowConfirm(!showConfirm)}
                        tabIndex={-1}
                      >
                        {showConfirm ? (
                          <EyeSlashIcon className="w-5 h-5 text-white/50" />
                        ) : (
                          <EyeIcon className="w-5 h-5 text-white/50" />
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

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 px-4 bg-brand-emerald hover:bg-brand-emerald-dim text-white rounded-xl font-semibold shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loading || confirmMismatch || emailInvalid}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-md" />
                  ) : (
                    t('authSignUp.createAccount', 'Create Account')
                  )}
                </motion.button>
              </form>

              <div className="text-center text-sm">
                <span className="text-white/50">
                  {t('authSignUp.alreadyHaveAccount', 'Already have an account?')}{' '}
                </span>
                <button
                  className="text-brand-emerald font-semibold hover:text-brand-emerald-dim transition-colors cursor-pointer"
                  onClick={() => navigate('/login')}
                >
                  {t('authSignUp.logIn', 'Log in')}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatedBackground>
  );
}
