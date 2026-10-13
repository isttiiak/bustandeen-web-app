import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { HomeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { BTN_PRIMARY } from '../components/bustanStyles.js';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('notFound.seoTitle', 'Page Not Found')}
        description={t('notFound.seoDescription', "The page you're looking for doesn't exist.")}
        path="/404"
        index={false}
      />
      <div className="min-h-[70vh] grid place-items-center p-4">
        <div className="w-full max-w-sm rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-10 pb-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full grid place-items-center bg-brand-emerald/10 border border-brand-emerald/30">
            <MagnifyingGlassIcon className="w-8 h-8 text-brand-emerald" aria-hidden="true" />
          </div>
          <p className="font-display text-4xl font-bold text-brand-gold" aria-hidden="true">
            404
          </p>
          <h1 className="font-display text-xl font-bold text-white">{t('notFound.heading')}</h1>
          <p className="text-white/70 text-sm leading-relaxed">{t('notFound.description')}</p>
          <Link to="/" className={`${BTN_PRIMARY} w-full`}>
            <HomeIcon className="w-5 h-5" aria-hidden="true" />
            {t('notFound.backHome')}
          </Link>
        </div>
      </div>
    </AnimatedBackground>
  );
}
