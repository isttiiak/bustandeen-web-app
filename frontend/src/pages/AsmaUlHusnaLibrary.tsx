import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { CARD } from '../components/bustanStyles.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import { ARABIC_STYLE, LibraryHero, LibrarySearch } from '../components/library/libraryParts.js';
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
          <LibraryHero
            Icon={SparklesIcon}
            title={t('library.asmaTitle')}
            subtitle={t('library.asmaSubtitle')}
          />

          <LibrarySearch
            value={query}
            onChange={setQuery}
            placeholder={t('library.searchPlaceholder')}
          />

          {filtered.length === 0 ? (
            <p className="text-center text-white/60 text-sm py-8">{t('library.noResults')}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  className={`${CARD} p-3.5 flex flex-col items-center text-center gap-1.5`}
                >
                  <span className="text-[11px] text-brand-gold font-bold tabular-nums">
                    {formatLocaleNumber(n.number)}
                  </span>
                  <p dir="rtl" lang="ar" className="text-2xl text-white" style={ARABIC_STYLE}>
                    {n.arabic}
                  </p>
                  <p className="text-xs font-bold text-white">{n.transliteration}</p>
                  <p className="text-xs text-white/70 leading-snug">{n.meaning[lang]}</p>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-white/60 leading-relaxed text-center pt-4 max-w-lg mx-auto">
            {t('library.asmaSourceNote')}
          </p>
        </div>
      </div>
    </AnimatedBackground>
  );
}
