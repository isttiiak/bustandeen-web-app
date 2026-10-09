import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { CARD } from '../components/bustanStyles.js';

/** Section keys under terms.* in both locales, with their paragraph counts. */
export const TERMS_SECTIONS = [
  { key: 'agreement', bodyCount: 2 },
  { key: 'service', bodyCount: 3 },
  { key: 'account', bodyCount: 4 },
  { key: 'use', bodyCount: 4 },
  { key: 'data', bodyCount: 3 },
  { key: 'naseeh', bodyCount: 2 },
  { key: 'sadaqah', bodyCount: 2 },
  { key: 'availability', bodyCount: 3 },
  { key: 'ending', bodyCount: 2 },
  { key: 'changes', bodyCount: 2 },
] as const;

export default function Terms() {
  const { t } = useTranslation();

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('terms.seoTitle', 'Terms of Service')}
        description={t(
          'terms.seoDescription',
          'The terms for using Bustandeen, a free, non-commercial worship companion: your account, fair use, your data, and our limits.'
        )}
        path="/terms"
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-4 pb-10">
          <header className="text-center py-6 space-y-2">
            <span className="mx-auto w-14 h-14 rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/40 text-brand-gold">
              <DocumentTextIcon className="w-7 h-7" aria-hidden="true" />
            </span>
            <h1 className="font-display text-3xl font-bold text-white">{t('terms.heading')}</h1>
            <p className="text-white/75 text-sm max-w-md mx-auto leading-relaxed">
              {t('terms.subtitle')}
            </p>
            <p className="text-white/70 text-xs">{t('terms.lastUpdated')}</p>
          </header>

          {TERMS_SECTIONS.map((s, i) => (
            <section key={s.key} className={`${CARD} p-5`} aria-labelledby={`terms-${s.key}`}>
              <h2 id={`terms-${s.key}`} className="text-white font-bold text-sm mb-2">
                {i + 1}. {t(`terms.${s.key}.title`)}
              </h2>
              <ul className="space-y-1.5">
                {Array.from({ length: s.bodyCount }, (_, j) => (
                  <li
                    key={j}
                    className="text-white/80 text-xs leading-relaxed pl-3 border-l-2 border-brand-border"
                  >
                    {t(`terms.${s.key}.body${j}`)}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="text-center pt-4 space-y-2">
            <p className="text-white/75 text-xs">
              {t('terms.contactText')}{' '}
              <a href="mailto:ansar@bustandeen.com" className="text-brand-emerald underline">
                ansar@bustandeen.com
              </a>
            </p>
            <Link to="/privacy" className="text-white/70 text-xs underline hover:text-white">
              {t('terms.privacyLink')}
            </Link>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
