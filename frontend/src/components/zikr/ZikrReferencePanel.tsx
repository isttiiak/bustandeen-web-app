import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { translateReference } from '../../utils/localeReference.js';
import ReportReference from '../ReportReference.js';
import {
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { Star8Icon } from '../icons/IslamicIcons.js';
import { DHIKR_HADITHS, FULL_PREDEFINED } from './zikrCounterData.js';

export interface ZikrReferencePanelProps {
  customMeanings: Record<string, import('../../store/useZikrStore.js').CustomMeaning>;
  libItem: import('../../utils/zikrLibrary.js').LibraryZikr | null;
  refExpanded: boolean;
  selected: string;
  setRefExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

/** Marks a link that opens the source in a new tab (replaces the ↗ glyph). */
function ExternalMark() {
  return <ArrowTopRightOnSquareIcon className="inline w-3 h-3 ml-0.5 -mt-0.5" aria-hidden="true" />;
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
            className="rounded-card border border-brand-border bg-brand-deep shadow-elev-1 overflow-hidden"
          >
            <button
              onClick={() => setRefExpanded((v) => !v)}
              aria-expanded={refExpanded}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <span className="flex items-center gap-1.5 text-white/60 text-[11px] uppercase tracking-widest font-bold">
                <BookOpenIcon className="w-3.5 h-3.5 text-brand-gold" aria-hidden="true" />
                {t('zikr.fullTextRef', 'Full text & reference')}
              </span>
              <ChevronDownIcon
                className={`w-4 h-4 text-white/50 transition-transform ${refExpanded ? 'rotate-180' : ''}`}
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
                      <p className="flex gap-1.5 text-brand-gold text-xs leading-relaxed">
                        <Star8Icon className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
                        <span>{full.virtue}</span>
                      </p>
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
                            className="text-brand-gold text-[11px] underline hover:text-brand-gold/80 transition-colors"
                          >
                            {translateReference(builtin.source, i18n.language)}
                            <ExternalMark />
                          </a>
                        ) : full?.sourceUrl ? (
                          <a
                            href={full.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-gold text-[11px] underline hover:text-brand-gold/80 transition-colors"
                          >
                            {translateReference(full.source ?? '', i18n.language)}
                            <ExternalMark />
                          </a>
                        ) : full?.source ? (
                          <span className="text-white/40 text-xs">
                            {translateReference(full.source, i18n.language)}
                          </span>
                        ) : null}
                      </div>
                    )}
                    {/* FIQH-04: an optional Sunnah way of counting, shown for every
                        dhikr. Both narrations verified on sunnah.com (2026-10-02). */}
                    <div className="border-t border-brand-border pt-3 space-y-1.5">
                      <p className="text-white/50 text-xs leading-relaxed">
                        {t(
                          'zikr.fingertipNote',
                          'Optional: you can also count on your fingertips. The Prophet ﷺ told the women Companions to count tasbīḥ on their fingertips, for the fingers will be questioned and made to speak.'
                        )}
                      </p>
                      <a
                        href="https://sunnah.com/abudawud:1501"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-brand-gold text-[11px] underline hover:text-brand-gold/80 transition-colors"
                      >
                        {t('zikr.fingertipCite', 'Sunan Abī Dāwūd 1501 · ḥasan (al-Albānī)')}
                        <ExternalMark />
                      </a>
                      <p className="text-white/50 text-xs leading-relaxed">
                        {t('zikr.fingertipHand', 'He ﷺ counted tasbīḥ on his own hand.')}
                      </p>
                      <a
                        href="https://sunnah.com/abudawud:1502"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-brand-gold text-[11px] underline hover:text-brand-gold/80 transition-colors"
                      >
                        {t('zikr.fingertipHandCite', 'Sunan Abī Dāwūd 1502 · ṣaḥīḥ (al-Albānī)')}
                        <ExternalMark />
                      </a>
                    </div>
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
