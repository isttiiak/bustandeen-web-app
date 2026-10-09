import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import AnimatedBackground from '../AnimatedBackground.js';
import { LeafIcon } from '../icons/IslamicIcons.js';
import { CARD } from '../bustanStyles.js';

// T3.2 Auth screens (sign in, sign up, /auth/action) in the Bustan Arch design:
// a wordmark, one arch hero per screen, then a theme card with the form.
// Shared here so the three pages keep the same inputs, password field and
// strength meter in both themes.

/** A text input on the theme surface. */
export const INPUT =
  'w-full px-4 py-3 rounded-control bg-brand-surface border border-brand-border text-white placeholder:text-white/70 focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/30 transition-colors';
export const INPUT_BAD = 'border-red-400/70 focus:border-red-400 focus:ring-red-400/30';
export const INPUT_OK = 'border-brand-emerald/60';
export const LABEL = 'block text-sm font-semibold text-white/80';
/** Quiet inline text action (Forgot password, Send again, Go back). */
export const TEXT_ACTION =
  'text-brand-emerald font-semibold hover:underline underline-offset-2 transition-colors';

/** The arch hero: icon, title, optional subtitle, and anything below them. */
export const ARCH_HERO =
  'rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-10 pb-6 sm:px-8 text-center';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <AnimatedBackground variant="dark">
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md space-y-4"
        >
          <div className="text-center">
            <span className="inline-flex items-center gap-2 font-display text-2xl font-bold text-brand-emerald">
              <LeafIcon className="w-6 h-6" aria-hidden="true" />
              Bustandeen
            </span>
            <p className="text-white/70 text-xs mt-0.5">Nourish your deen</p>
          </div>
          {children}
        </motion.div>
      </div>
    </AnimatedBackground>
  );
}

export function AuthHero({
  icon,
  title,
  subtitle,
  children,
  titleAs: Title = 'h1',
}: {
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  titleAs?: 'h1' | 'h2';
}) {
  return (
    <section className={ARCH_HERO}>
      <div className="w-14 h-14 mx-auto mb-4 rounded-full grid place-items-center bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald">
        {icon}
      </div>
      <Title className="font-display text-3xl font-bold text-white leading-tight">{title}</Title>
      {subtitle && <div className="text-white/80 text-sm mt-2 leading-relaxed">{subtitle}</div>}
      {children}
    </section>
  );
}

/** The form card under the hero. */
export function AuthCard({ children }: { children: ReactNode }) {
  return <div className={`${CARD} p-6 sm:p-8 space-y-5`}>{children}</div>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 px-4 py-3 rounded-control border border-red-400/40 bg-red-400/10 text-red-400 text-sm"
    >
      <ExclamationCircleIcon className="w-5 h-5 shrink-0 mt-px" />
      <span>{children}</span>
    </div>
  );
}

/** "or" between the Google button and the email form. */
export function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-white/70">
      <span className="h-px flex-1 bg-brand-border" />
      {label}
      <span className="h-px flex-1 bg-brand-border" />
    </div>
  );
}

/** Password input with a show/hide toggle and an optional match mark. */
export function PasswordField({
  state,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { state?: 'ok' | 'bad' }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...input}
        type={show ? 'text' : 'password'}
        className={`${INPUT} pr-20 ${state === 'bad' ? INPUT_BAD : state === 'ok' ? INPUT_OK : ''}`}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {state === 'ok' && <CheckCircleIcon className="w-4 h-4 text-brand-emerald" />}
        {state === 'bad' && <ExclamationCircleIcon className="w-4 h-4 text-red-400" />}
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={
            show
              ? t('authSignIn.hidePassword', 'Hide password')
              : t('authSignIn.showPassword', 'Show password')
          }
          aria-pressed={show}
          className="p-1.5 rounded-control text-white/70 hover:text-white hover:bg-brand-deep transition-colors"
        >
          {show ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

type Translator = (key: string, fallback: string) => string;

export function getPasswordStrength(
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
    return { score, label: t('authSignUp.strengthWeak', 'Weak'), color: 'bg-red-400' };
  if (score === 2)
    return { score, label: t('authSignUp.strengthFair', 'Fair'), color: 'bg-brand-gold' };
  if (score === 3)
    return { score, label: t('authSignUp.strengthGood', 'Good'), color: 'bg-brand-info' };
  return { score, label: t('authSignUp.strengthStrong', 'Strong'), color: 'bg-brand-emerald' };
}

export function StrengthMeter({ password }: { password: string }) {
  const { t } = useTranslation();
  if (!password) return null;
  const strength = getPasswordStrength(password, t);
  return (
    <div className="space-y-1">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= strength.score ? strength.color : 'bg-brand-border'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-white/70">
        {t('authSignUp.passwordStrengthLabel', '{{strength}} password', {
          strength: strength.label,
        })}
      </p>
    </div>
  );
}
