import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
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
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4 space-y-2"
          >
            <p className="text-4xl">🤲</p>
            <h1 className="text-2xl font-black text-white">{t('library.duaTitle')}</h1>
            <p className="text-white/40 text-sm max-w-md mx-auto">{t('library.duaSubtitle')}</p>
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
            <div className="space-y-2.5">
              {filtered.map((d) => {
                const open = openId === d.id;
                return (
                  <div
                    key={d.id}
                    className="rounded-2xl border border-brand-border bg-white/[0.04] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : d.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
                    >
                      <span className="text-sm font-bold text-white">{d.situation[lang]}</span>
                      <ChevronDownIcon
                        className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
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
                              style={{ fontFamily: "'Amiri', serif" }}
                            >
                              {d.arabic}
                            </p>
                            <p className="italic text-white/40 text-xs">{d.transliteration}</p>
                            <p className="text-white/70 text-sm leading-relaxed">
                              {d.translation[lang]}
                            </p>
                            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                              <span className="text-white/30">{t('library.sourceLabel')}</span>
                              <a
                                href={d.reference.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-emerald underline"
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
