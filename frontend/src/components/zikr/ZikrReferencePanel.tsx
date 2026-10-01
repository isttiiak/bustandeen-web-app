import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { translateReference } from '../../utils/localeReference.js';
import ReportReference from '../ReportReference.js';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { DHIKR_HADITHS, FULL_PREDEFINED } from './zikrCounterData.js';

export interface ZikrReferencePanelProps {
  customMeanings: Record<string, import('../../store/useZikrStore.js').CustomMeaning>;
  libItem: import('../../utils/zikrLibrary.js').LibraryZikr | null;
  refExpanded: boolean;
  selected: string;
  setRefExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ZikrReferencePanel({
  customMeanings,
  libItem,
  refExpanded,
  selected,
  setRefExpanded,
}: ZikrReferencePanelProps) {
  const { t, i18n } = useTranslation();
  return (
    <>
      {(() => {
        const builtin = DHIKR_HADITHS[selected];
        const custom = customMeanings[selected];
        const predef = FULL_PREDEFINED[selected];
        // Full-text resolution: library → predefined extras → custom
        const full = libItem
          ? {
              arabic: libItem.arabic,
              transliteration: libItem.transliteration,
              meaning:
                i18n.language === 'bn' && libItem.meaningBn ? libItem.meaningBn : libItem.meaning,
              virtue:
                i18n.language === 'bn' && libItem.virtueBn ? libItem.virtueBn : libItem.virtue,
              source: libItem.source,
              sourceUrl: libItem.sourceUrl,
              grade: libItem.grade,
            }
          : predef
            ? {
                arabic: predef.arabic,
                transliteration: undefined,
                meaning: t(predef.meaningKey, predef.meaningFallback),
                virtue: undefined,
                source: predef.source,
                sourceUrl: predef.sourceUrl,
                grade: undefined,
              }
            : custom
              ? {
                  arabic: custom.fullArabic ?? custom.arabic,
                  transliteration: custom.transliteration,
                  meaning: custom.fullMeaning ?? custom.meaning,
                  virtue: custom.virtue,
                  source: custom.source,
                  sourceUrl: custom.sourceUrl,
                  grade: custom.grade,
                }
              : null;
        if (!full && !builtin) return null;
        return (
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            className="rounded-2xl border border-brand-emerald/10 bg-white/5 backdrop-blur-sm overflow-hidden"
          >
            <button
              onClick={() => setRefExpanded((v) => !v)}
              aria-expanded={refExpanded}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <span className="text-white/40 text-[11px] uppercase tracking-widest font-bold">
                📖 {t('zikr.fullTextRef', 'Full text & reference')}
              </span>
              <ChevronDownIcon
                className={`w-4 h-4 text-white/30 transition-transform ${refExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            <AnimatePresence>
              {refExpanded && (
                <motion.div
                  // NO height animation: measuring 'auto' before the Arabic
                  // web font loads clipped long texts (Durud Ibrahim showed
                  // half its lines). Fade only — content always full height.
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-4 pb-4 space-y-3">
                    {full?.arabic && (
                      <p
                        dir="rtl"
                        lang="ar"
                        className="text-xl sm:text-2xl text-white/90 leading-[2.2] text-right"
                        style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
                      >
                        {full.arabic}
                      </p>
                    )}
                    {/* Pronunciation sits directly under the Arabic — the
                        order a learner reads in: script, then how to say it,
                        then what it means. */}
                    {full?.transliteration && (
                      <p className="text-sm text-brand-gold/70 italic leading-relaxed tracking-wide">
                        {full.transliteration}
                      </p>
                    )}
                    {full?.meaning && (
                      <p className="text-sm text-white/60 leading-relaxed">{full.meaning}</p>
                    )}
                    {full?.virtue && (
                      <p className="text-brand-gold/60 text-xs leading-relaxed">✨ {full.virtue}</p>
                    )}
                    {builtin && (
                      <p className="text-white/50 text-xs italic leading-relaxed border-l-2 border-brand-emerald/25 pl-3">
                        {t(builtin.textKey, builtin.textFallback)}
                      </p>
                    )}
                    <ReportReference what={selected} className="pt-1" />
                    {(builtin || full?.source) && (
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        {(builtin?.grade ?? full?.grade) && (
                          <span className="text-brand-emerald/60 text-[10px] font-semibold bg-brand-emerald/10 px-2 py-0.5 rounded-full">
                            {translateReference((builtin?.grade ?? full?.grade)!, i18n.language)}
                          </span>
                        )}
                        {builtin ? (
                          <a
                            href={builtin.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-gold/60 text-[10px] underline hover:text-brand-gold/90 transition-colors"
                          >
                            {translateReference(builtin.source, i18n.language)} ↗
                          </a>
                        ) : full?.sourceUrl ? (
                          <a
                            href={full.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-gold/60 text-[10px] underline hover:text-brand-gold/90 transition-colors"
                          >
                            {translateReference(full.source ?? '', i18n.language)} ↗
                          </a>
                        ) : full?.source ? (
                          <span className="text-white/40 text-xs">
                            {translateReference(full.source, i18n.language)}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })()}
    </>
  );
}
