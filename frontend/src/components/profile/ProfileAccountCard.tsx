import React from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from '../../firebase.js';
import { m as motion } from 'framer-motion';
import { EnvelopeIcon, LinkIcon } from '@heroicons/react/24/outline';
import { GoogleLogo } from './profileParts.js';

export interface ProfileAccountCardProps {
  firebaseHasGoogle: boolean;
  googleIsPrimary: boolean;
  googleLinked: import('./profileParts.js').LinkedProvider | undefined;
  linkGoogle: () => Promise<void>;
  linkingGoogle: boolean;
  makePrimaryEmail: (email: string) => Promise<void>;
  primaryEmailLoading: boolean;
  unlinkGoogle: (providerUid: string) => Promise<void>;
  unlinkingGoogle: boolean;
  user: import('../../types/api.js').AuthUser | null;
}

export default function ProfileAccountCard({
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
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="card bg-brand-surface border border-brand-border rounded-2xl"
      >
        <div className="card-body p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-1">
              {t('profile.accountLinked', 'Account & Linked Accounts')}
            </p>
            <p className="text-white/25 text-xs">
              {t(
                'profile.primaryEmailNote',
                'Primary email is used for password reset and notifications.'
              )}
            </p>
          </div>

          <div className="space-y-2.5">
            {/* ── Email/Password row ── */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-deep border border-brand-border">
              <EnvelopeIcon className="w-4 h-4 text-white/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white/70 text-sm truncate">{user?.email ?? '—'}</p>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                      !googleIsPrimary
                        ? 'bg-brand-emerald/20 border border-brand-emerald/40 text-brand-emerald'
                        : 'bg-white/5 border border-brand-border text-white/30'
                    }`}
                  >
                    {!googleIsPrimary
                      ? t('profile.primary', 'PRIMARY')
                      : t('profile.secondary', 'SECONDARY')}
                  </span>
                </div>
                <p className="text-white/25 text-xs">
                  {t('profile.emailPassword', 'Email / Password')}
                </p>
              </div>
              {/* Make Primary — only when password is secondary */}
              {googleIsPrimary && user?.email && (
                <button
                  onClick={() => void makePrimaryEmail(user.email!)}
                  disabled={primaryEmailLoading}
                  className="text-xs px-2.5 py-1 rounded-lg bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald/80 hover:bg-brand-emerald/20 hover:text-brand-emerald transition-all shrink-0 font-medium whitespace-nowrap disabled:opacity-50"
                >
                  {primaryEmailLoading ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    t('profile.makePrimary', 'Make Primary')
                  )}
                </button>
              )}
            </div>

            {/* ── Google row (linked / already signed-in with Google / not connected) ── */}
            {googleLinked ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-deep border border-brand-border">
                <GoogleLogo className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white/70 text-sm truncate">{googleLinked.email}</p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                        googleIsPrimary
                          ? 'bg-brand-emerald/20 border border-brand-emerald/40 text-brand-emerald'
                          : 'bg-white/5 border border-brand-border text-white/30'
                      }`}
                    >
                      {googleIsPrimary
                        ? t('profile.primary', 'PRIMARY')
                        : t('profile.secondary', 'SECONDARY')}
                    </span>
                  </div>
                  <p className="text-white/25 text-xs">
                    {t('profile.googleAccount', 'Google Account')}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Make Primary / Make Secondary toggle */}
                  {googleIsPrimary ? (
                    <button
                      onClick={() => user?.email && void makePrimaryEmail(user.email)}
                      disabled={primaryEmailLoading}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-brand-border text-white/40 hover:bg-white/10 hover:text-white/70 transition-all font-medium whitespace-nowrap disabled:opacity-50"
                    >
                      {primaryEmailLoading ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        t('profile.makeSecondary', 'Make Secondary')
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => void makePrimaryEmail(googleLinked.email)}
                      disabled={primaryEmailLoading}
                      className="text-xs px-2.5 py-1 rounded-lg bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald/80 hover:bg-brand-emerald/20 hover:text-brand-emerald transition-all font-medium whitespace-nowrap disabled:opacity-50"
                    >
                      {primaryEmailLoading ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        t('profile.makePrimary', 'Make Primary')
                      )}
                    </button>
                  )}

                  {/* Disconnect — only enabled when Google is SECONDARY */}
                  <div className="relative group/dis">
                    <button
                      onClick={() =>
                        !googleIsPrimary && void unlinkGoogle(googleLinked.providerUid)
                      }
                      disabled={unlinkingGoogle || googleIsPrimary}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                        googleIsPrimary
                          ? 'bg-white/5 border border-brand-border text-white/20 cursor-not-allowed'
                          : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/60'
                      }`}
                    >
                      {unlinkingGoogle ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        t('profile.disconnect', 'Disconnect')
                      )}
                    </button>
                    {googleIsPrimary && (
                      <div className="absolute -top-9 right-0 bg-brand-deep border border-brand-border text-white/60 text-[10px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover/dis:opacity-100 transition-opacity pointer-events-none z-10">
                        {t('profile.makeSecondaryFirst', 'Make secondary first to disconnect')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : firebaseHasGoogle ? (
              // User signed in with Google — their account IS Google, no linking needed.
              <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-deep border border-brand-emerald/20 opacity-80 cursor-default">
                <GoogleLogo className="w-4 h-4 shrink-0" />
                <div className="text-left min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight text-white/70">
                    {auth.currentUser?.email ??
                      t('profile.googleAccountFallback', 'Google Account')}
                  </p>
                  <p className="text-xs text-white/30 leading-tight mt-0.5">
                    {t(
                      'profile.signedInGoogle',
                      "You're signed in with Google — this is your primary account"
                    )}
                  </p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-emerald/20 border border-brand-emerald/40 text-brand-emerald font-bold shrink-0">
                  {t('profile.primary', 'PRIMARY')}
                </span>
              </div>
            ) : (
              // Email/password user — offer to link Google
              <button
                onClick={() => void linkGoogle()}
                disabled={linkingGoogle}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-brand-deep border border-dashed border-brand-border hover:border-brand-emerald/40 text-white/40 hover:text-white/70 transition-all disabled:opacity-50 group"
              >
                {linkingGoogle ? (
                  <span className="loading loading-spinner loading-xs text-brand-emerald" />
                ) : (
                  <LinkIcon className="w-4 h-4 shrink-0 group-hover:text-brand-emerald transition-colors" />
                )}
                <div className="text-left min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">
                    {t('profile.connectGoogle', 'Connect Google Account')}
                  </p>
                  <p className="text-xs text-white/25 leading-tight mt-0.5">
                    {t(
                      'profile.connectGoogleDesc',
                      'Sign in with Google & sync your profile photo'
                    )}
                  </p>
                </div>
                <GoogleLogo className="w-4 h-4 ml-auto shrink-0 opacity-50" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
