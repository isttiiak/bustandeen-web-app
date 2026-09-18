import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { ASMA_UL_HUSNA } from '../seo/content/asmaUlHusna.js';

export default function AsmaUlHusnaLibrary() {
  const { t, i18n } = useTranslation();
  const lang: 'en' | 'bn' = i18n.language === 'bn' ? 'bn' : 'en';
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ASMA_UL_HUSNA;
    return ASMA_UL_HUSNA.filter(
      (n) =>
        n.transliteration.toLowerCase().includes(q) ||
        n.meaning.en.toLowerCase().includes(q) ||
        n.meaning.bn.includes(query.trim())
    );
  }, [query]);

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('library.asmaSeoTitle', '99 Names of Allah')}
        description={t(
          'library.asmaSeoDescription',
          'Al-Asma al-Husna: the Most Beautiful Names, with Arabic, transliteration and meaning.'
        )}
        path="/library/asma-ul-husna"
        index={false}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-5 pb-10">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4 space-y-2"
          >
            <p className="text-4xl">✨</p>
            <h1 className="text-2xl font-black text-white">{t('library.asmaTitle')}</h1>
            <p className="text-white/40 text-sm max-w-md mx-auto">{t('library.asmaSubtitle')}</p>
          </motion.div>

          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('library.searchPlaceholder') as string}
              className="w-full rounded-xl bg-white/[0.04] border border-brand-border text-white placeholder:text-white/30 pl-10 pr-4 py-3 text-sm"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-white/30 text-sm py-8">{t('library.noResults')}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filtered.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 20) * 0.02 }}
                  className="rounded-2xl border border-brand-border bg-white/[0.04] p-3.5 flex flex-col items-center text-center gap-1.5"
                >
                  <span className="text-[10px] text-brand-emerald font-bold">{n.number}</span>
                  <p
                    dir="rtl"
                    lang="ar"
                    className="text-2xl text-white"
                    style={{ fontFamily: "'Amiri', serif" }}
                  >
                    {n.arabic}
                  </p>
                  <p className="text-xs font-bold text-white">{n.transliteration}</p>
                  <p className="text-[11px] text-white/40 leading-snug">{n.meaning[lang]}</p>
                </motion.div>
              ))}
            </div>
          )}

          <p className="text-xs text-white/30 leading-relaxed text-center pt-4 max-w-lg mx-auto">
            {t('library.asmaSourceNote')}
          </p>
        </div>
      </div>
    </AnimatedBackground>
  );
}
