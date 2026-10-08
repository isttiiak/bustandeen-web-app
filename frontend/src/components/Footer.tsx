import React from 'react';
import { Link } from 'react-router';
import { HeartIcon } from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-brand-deep text-white border-t border-brand-border mt-auto">
      <div className="footer footer-center p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm sm:text-base">
            <span>{t('footer.madeWith')}</span>
            <HeartIcon className="w-4 h-4 text-red-300" aria-hidden="true" />
            <span>{t('footer.forTheUmmah')}</span>
          </div>
          <nav className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 text-xs">
            <Link
              to="/feedback"
              className="inline-flex items-center text-white/60 hover:text-brand-emerald underline underline-offset-2 transition-colors"
            >
              {t('footer.feedbackContact')}
            </Link>
            <span className="text-white/60" aria-hidden="true">
              •
            </span>
            <Link
              to="/about"
              className="inline-flex items-center text-white/60 hover:text-brand-gold underline underline-offset-2 transition-colors"
            >
              {t('footer.about')}
            </Link>
            <span className="text-white/60" aria-hidden="true">
              •
            </span>
            <Link
              to="/privacy"
              className="inline-flex items-center text-white/60 hover:text-white underline underline-offset-2 transition-colors"
            >
              {t('footer.privacy')}
            </Link>
            <span className="text-white/60" aria-hidden="true">
              •
            </span>
            <Link
              to="/terms"
              className="inline-flex items-center text-white/60 hover:text-white underline underline-offset-2 transition-colors"
            >
              {t('footer.terms')}
            </Link>
          </nav>
          <p className="text-xs sm:text-sm text-white/70">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <div className="flex gap-4 text-xs opacity-70">
            <span>{t('footer.nonCommercial')}</span>
            <span>•</span>
            <span>{t('footer.adFree')}</span>
            <span>•</span>
            <span>{t('footer.secure')}</span>
          </div>
          <p className="text-[10px] text-white/60 tabular-nums">v{__APP_VERSION__}</p>
        </div>
      </div>
    </footer>
  );
}
