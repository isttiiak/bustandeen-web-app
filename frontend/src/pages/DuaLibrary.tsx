import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { CARD } from '../components/bustanStyles.js';
import { DuaHandsIcon } from '../components/icons/IslamicIcons.js';
import { ARABIC_STYLE, LibraryHero, LibrarySearch } from '../components/library/libraryParts.js';
import { DUAS } from '../seo/content/duas.js';
import { translateReference } from '../utils/localeReference.js';

export default function DuaLibrary() {
  const { t, i18n } = useTranslation();
  const lang: 'en' | 'bn' = i18n.language === 'bn' ? 'bn' : 'en';
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DUAS;
    return DUAS.filter(
      (d) =>
        d.situation.en.toLowerCase().includes(q) ||
        d.situation.bn.includes(query.trim()) ||
        d.translation[lang].toLowerCase().includes(q)
    );
  }, [query, lang]);

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('library.duaSeoTitle', "Du'a Library")}
        description={t(
          'library.duaSeoDescription',
          "Authentic du'as for everyday situations, with source and grading for every entry."
        )}
        path="/library/duas"
        index={false}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-5 pb-10">
          <LibraryHero
            Icon={DuaHandsIcon}
            title={t('library.duaTitle')}
            subtitle={t('library.duaSubtitle')}
          />

          <LibrarySearch
            value={query}
            onChange={setQuery}
            placeholder={t('library.searchPlaceholder')}
          />

          {filtered.length === 0 ? (
            <p className="text-center text-white/60 text-sm py-8">{t('library.noResults')}</p>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((d) => {
                const open = openId === d.id;
                return (
                  <div key={d.id} className={`${CARD} overflow-hidden`}>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : d.id)}
                      aria-expanded={open}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-brand-surface/50 transition-colors"
                    >
                      <span className="text-sm font-bold text-white">{d.situation[lang]}</span>
                      <ChevronDownIcon
                        aria-hidden="true"
                        className={`w-4 h-4 text-white/60 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3">
                            <p
                              dir="rtl"
                              lang="ar"
                              className="text-xl leading-loose text-white"
                              style={ARABIC_STYLE}
                            >
                              {d.arabic}
                            </p>
                            <p className="italic text-white/60 text-xs">{d.transliteration}</p>
                            <p className="text-white/80 text-sm leading-relaxed">
                              {d.translation[lang]}
                            </p>
                            <div className="pt-2 border-t border-brand-border flex items-center justify-between gap-3 text-xs">
                              <span className="text-white/60">{t('library.sourceLabel')}</span>
                              <a
                                href={d.reference.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-gold underline underline-offset-2 text-right"
                              >
                                {translateReference(
                                  `${d.reference.text} · ${d.reference.grade}`,
                                  i18n.language
                                )}
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AnimatedBackground>
  );
}
