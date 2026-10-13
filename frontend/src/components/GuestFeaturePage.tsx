import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from './AnimatedBackground.js';
import SignInSheet, { SignInButtons } from './SignInSheet.js';
import { CARD } from './bustanStyles.js';
import { useAuthStore } from '../store/useAuthStore.js';

// U10: Rayhanah and Friends for a guest, view only. What the feature does is
// fully visible; nothing is entered or kept. Rayhanah's "Log today" opens the
// sign-in sheet with its privacy reason; Friends shows one card that says why
// an account is needed (no add, no invite link).

export type GuestFeature = 'rayhanah' | 'friends';

const FEATURES = {
  rayhanah: ['excused', 'qada', 'private'],
  friends: ['noor', 'choose', 'noRank'],
};

export default function GuestFeaturePage({ feature }: { feature: GuestFeature }) {
  const { t } = useTranslation();
  const enterDemoMode = useAuthStore((s) => s.enterDemoMode);
  const [sheet, setSheet] = useState(false);
  const pink = feature === 'rayhanah';
  const ns = `signInGate.${feature}`;

  return (
    <AnimatedBackground variant="dark">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-10 space-y-4" data-testid={`guest-${feature}`}>
        <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-10 pb-6 text-center">
          <h1 className="font-display text-3xl font-bold text-white">{t(`${ns}.pageTitle`)}</h1>
          <p className="text-white/75 text-sm mt-2">{t(`${ns}.tagline`)}</p>
        </section>

        <ul className={`${CARD} p-5 space-y-3`}>
          {FEATURES[feature].map((k) => (
            <li key={k} className="flex items-start gap-3 text-sm text-white/85 leading-relaxed">
              <CheckIcon
                className={`w-5 h-5 shrink-0 mt-0.5 ${pink ? 'text-brand-pink' : 'text-brand-emerald'}`}
                aria-hidden="true"
              />
              {t(`${ns}.points.${k}`)}
            </li>
          ))}
        </ul>

        {pink ? (
          <button
            type="button"
            onClick={() => setSheet(true)}
            className={`${CARD} w-full min-h-[56px] px-5 flex items-center justify-between text-white font-bold hover:border-brand-pink/40 transition-colors`}
          >
            {t(`${ns}.logToday`)}
            <PlusIcon className="w-5 h-5 text-brand-pink" aria-hidden="true" />
          </button>
        ) : (
          <section className={`${CARD} p-6 text-center`} aria-labelledby="guest-friends-title">
            <span className="mx-auto mb-3 w-14 h-14 rounded-full grid place-items-center border border-brand-gold/30 bg-brand-gold/10 text-brand-gold">
              <UserGroupIcon className="w-7 h-7" aria-hidden="true" />
            </span>
            <h2 id="guest-friends-title" className="font-display text-lg font-bold text-white">
              {t(`${ns}.title`)}
            </h2>
            <p className="text-white/75 text-sm leading-relaxed mt-2">{t(`${ns}.desc`)}</p>
            <SignInButtons className="mt-5" />
          </section>
        )}

        <div className="text-center">
          <button
            type="button"
            className="min-h-[44px] px-3 text-sm font-semibold text-brand-emerald underline underline-offset-2 hover:text-white transition-colors"
            onClick={() => enterDemoMode(pink ? 'female' : 'male')}
          >
            {t('signInGate.seeExample')}
          </button>
        </div>
      </div>
      {pink && <SignInSheet open={sheet} onClose={() => setSheet(false)} feature="rayhanah" />}
    </AnimatedBackground>
  );
}
