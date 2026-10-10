import React from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from '../../firebase.js';
import { m as motion } from 'framer-motion';
import { EnvelopeIcon, LinkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { GoogleLogo } from './profileParts.js';
import { useAuthStore } from '../../store/useAuthStore.js';

export interface ProfileAccountCardProps {
  accountError: string;
  firebaseHasGoogle: boolean;
  googleIsPrimary: boolean;
  googleLinked: import('./profileParts.js').LinkedProvider | undefined;
  linkGoogle: () => Promise<void>;
  linkingGoogle: boolean;
  makePrimaryEmail: (email: string) => Promise<void>;
  primaryEmailLoading: boolean;
  unlinkGoogle: (providerUid: string) => void;
  unlinkingGoogle: boolean;
  user: import('../../types/api.js').AuthUser | null;
}

const ROW =
  'flex items-center gap-3 p-3 rounded-control border border-brand-border bg-brand-surface/50';
const BADGE_ON =
  'text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 border border-brand-emerald/50 bg-brand-emerald/10 text-brand-emerald';
const BADGE_OFF =
  'text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 border border-brand-border text-white/70';
/** A quiet inline button inside a row (same as Settings). */
const BTN_QUIET =
  'inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-bold text-white/80 hover:text-white hover:bg-brand-surface transition-colors whitespace-nowrap disabled:opacity-50';
const BTN_QUIET_ON =
  'inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-bold text-brand-emerald hover:bg-brand-emerald/10 transition-colors whitespace-nowrap disabled:opacity-50';
const BTN_DANGER_QUIET =
  'inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed';

const Spinner = () => <span className="loading loading-spinner loading-xs" />;

export default function ProfileAccountCard({
  accountError,
  firebaseHasGoogle,
  googleIsPrimary,
  googleLinked,
  linkGoogle,
  linkingGoogle,
  makePrimaryEmail,
  primaryEmailLoading,
  unlinkGoogle,
  unlinkingGoogle,
  user,
}: ProfileAccountCardProps) {
  const { t } = useTranslation();
  // The demo account is not a Firebase account: nothing to link (U9).
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const badge = (primary: boolean) => (
    <span className={primary ? BADGE_ON : BADGE_OFF}>
      {primary ? t('profile.primary', 'PRIMARY') : t('profile.secondary', 'SECONDARY')}
    </span>
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className={`${CARD} p-5 sm:p-6`}
    >
      <h2 className={SECTION_TITLE}>
        <LinkIcon className="w-5 h-5 text-brand-emerald" />
        {t('profile.accountLinked', 'Account & Linked Accounts')}
      </h2>
      <p className="text-white/70 text-xs mt-1 mb-4 leading-relaxed">
        {t(
          'profile.primaryEmailNote',
          'Primary email is used for password reset and notifications.'
        )}
      </p>

      <div className="space-y-2.5">
        {/* Email / password */}
        <div className={ROW}>
          <EnvelopeIcon className="w-5 h-5 text-white/70 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white text-sm truncate">{user?.email ?? '-'}</p>
              {badge(!googleIsPrimary)}
            </div>
            <p className="text-white/70 text-xs">
              {t('profile.emailPassword', 'Email / Password')}
            </p>
          </div>
          {googleIsPrimary && user?.email && (
            <button
              type="button"
              onClick={() => void makePrimaryEmail(user.email!)}
              disabled={primaryEmailLoading}
              className={BTN_QUIET_ON}
            >
              {primaryEmailLoading ? <Spinner /> : t('profile.makePrimary', 'Make Primary')}
            </button>
          )}
        </div>

        {/* Google: linked / signed in with Google / not connected */}
        {googleLinked ? (
          <div className={`${ROW} flex-wrap`}>
            <GoogleLogo className="w-5 h-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white text-sm truncate">{googleLinked.email}</p>
                {badge(googleIsPrimary)}
              </div>
              <p className="text-white/70 text-xs">
                {t('profile.googleAccount', 'Google Account')}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              {googleIsPrimary ? (
                <button
                  type="button"
                  onClick={() => user?.email && void makePrimaryEmail(user.email)}
                  disabled={primaryEmailLoading}
                  className={BTN_QUIET}
                >
                  {primaryEmailLoading ? <Spinner /> : t('profile.makeSecondary', 'Make Secondary')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void makePrimaryEmail(googleLinked.email)}
                  disabled={primaryEmailLoading}
                  className={BTN_QUIET_ON}
                >
                  {primaryEmailLoading ? <Spinner /> : t('profile.makePrimary', 'Make Primary')}
                </button>
              )}
              <button
                type="button"
                onClick={() => unlinkGoogle(googleLinked.providerUid)}
                disabled={unlinkingGoogle || googleIsPrimary}
                className={BTN_DANGER_QUIET}
              >
                {unlinkingGoogle ? <Spinner /> : t('profile.disconnect', 'Disconnect')}
              </button>
            </div>
            {/* Shown, not a hover tooltip: phones have no hover. */}
            {googleIsPrimary && (
              <p className="basis-full text-white/70 text-xs">
                {t('profile.makeSecondaryFirst', 'Make secondary first to disconnect')}
              </p>
            )}
          </div>
        ) : firebaseHasGoogle ? (
          // Signed in with Google: the account IS Google, nothing to link.
          <div className={ROW}>
            <GoogleLogo className="w-5 h-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white truncate">
                {auth.currentUser?.email ?? t('profile.googleAccountFallback', 'Google Account')}
              </p>
              <p className="text-xs text-white/70 leading-snug mt-0.5">
                {t(
                  'profile.signedInGoogle',
                  "You're signed in with Google, so this is your primary account"
                )}
              </p>
            </div>
            {badge(true)}
          </div>
        ) : isDemoMode ? null : (
          // Email/password account: offer to link Google.
          <button
            type="button"
            onClick={() => void linkGoogle()}
            disabled={linkingGoogle}
            className="w-full flex items-center gap-3 p-3 rounded-control border border-dashed border-brand-border hover:border-brand-emerald/50 hover:bg-brand-surface/50 text-white transition-colors disabled:opacity-50 text-left"
          >
            {linkingGoogle ? (
              <span className="loading loading-spinner loading-xs text-brand-emerald" />
            ) : (
              <LinkIcon className="w-5 h-5 shrink-0 text-brand-emerald" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">
                {t('profile.connectGoogle', 'Connect Google Account')}
              </p>
              <p className="text-xs text-white/70 leading-snug mt-0.5">
                {t('profile.connectGoogleDesc', 'Sign in with Google & sync your profile photo')}
              </p>
            </div>
            <GoogleLogo className="w-5 h-5 shrink-0" />
          </button>
        )}

        {accountError && (
          <p
            role="alert"
            className="flex items-start gap-2 p-3 rounded-control border border-red-400/40 bg-red-500/10 text-red-400 text-xs leading-relaxed"
          >
            <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-px" />
            {accountError}
          </p>
        )}
      </div>
    </motion.section>
  );
}
