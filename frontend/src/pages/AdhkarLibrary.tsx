import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { MORNING_ADHKAR, EVENING_ADHKAR, type AdhkarItem } from '../seo/content/adhkar.js';
import { translateReference } from '../utils/localeReference.js';

export default function AdhkarLibrary() {
  const { t, i18n } = useTranslation();
  const lang: 'en' | 'bn' = i18n.language === 'bn' ? 'bn' : 'en';
  const [period, setPeriod] = useState<'morning' | 'evening'>('morning');
  const [counts, setCounts] = useState<Record<string, number>>({});

  const items: AdhkarItem[] = period === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR;

  const bump = (item: AdhkarItem) => {
    setCounts((c) => {
      const current = c[item.id] ?? 0;
      const next = current >= item.repeat ? 0 : current + 1;
      return { ...c, [item.id]: next };
    });
  };

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('library.adhkarSeoTitle', 'Adhkar')}
        description={t(
          'library.adhkarSeoDescription',
          "Morning and evening adhkar — the Prophet's ﷺ remembrances for the start and end of the day."
        )}
        path="/library/adhkar"
        index={false}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-5 pb-10">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4 space-y-2"
          >
            <p className="text-4xl">{period === 'morning' ? '🌅' : '🌆'}</p>
            <h1 className="text-2xl font-black text-white">{t('library.adhkarTitle')}</h1>
            <p className="text-white/40 text-sm max-w-md mx-auto">{t('library.adhkarSubtitle')}</p>
          </motion.div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPeriod('morning')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                period === 'morning'
                  ? 'bg-brand-emerald text-brand-void'
                  : 'bg-white/[0.04] border border-brand-border text-white/50'
              }`}
            >
              {t('library.adhkarMorning')}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('evening')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                period === 'evening'
                  ? 'bg-brand-emerald text-brand-void'
                  : 'bg-white/[0.04] border border-brand-border text-white/50'
              }`}
            >
              {t('library.adhkarEvening')}
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const done = counts[item.id] ?? 0;
              const complete = done >= item.repeat;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-brand-border bg-white/[0.04] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-bold text-white text-sm">{item.title[lang]}</h2>
                    <button
                      type="button"
                      onClick={() => bump(item)}
                      title={t('library.tapToCount') as string}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-black tabular-nums transition-colors ${
                        complete
                          ? 'bg-brand-emerald text-brand-void'
                          : 'bg-white/10 text-white/60 hover:bg-white/15'
                      }`}
                    >
                      {done}/{item.repeat}
                    </button>
                  </div>
                  <p
                    dir="rtl"
                    lang="ar"
                    className="text-xl leading-loose text-white"
                    style={{ fontFamily: "'Amiri', serif" }}
                  >
                    {item.arabic}
                  </p>
                  <p className="italic text-white/40 text-xs">{item.transliteration}</p>
                  <p className="text-white/70 text-sm leading-relaxed">{item.translation[lang]}</p>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-white/30">{t('library.sourceLabel')}</span>
                    <a
                      href={item.reference.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-emerald underline"
                    >
                      {translateReference(
                        `${item.reference.text} · ${item.reference.grade}`,
                        i18n.language
                      )}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
