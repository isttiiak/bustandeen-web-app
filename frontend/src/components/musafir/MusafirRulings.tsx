import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, GiftIcon } from '@heroicons/react/24/outline';
import { SECTION_TITLE } from '../bustanStyles.js';
import { RulingIcon } from './musafirIcons.js';
import { MUSAFIR_RULINGS } from '../../utils/musafir.js';
import { RefQuote } from './MusafirBits.js';
import { type MusafirPage } from './useMusafirPage.js';

export default function MusafirRulings({ page }: { page: MusafirPage }) {
  const { t } = useTranslation();
  const { openRuling, setOpenRuling, bn, lang } = page;

  return (
    <section>
      <h3 className={`${SECTION_TITLE} px-1`}>
        <GiftIcon className="w-5 h-5 text-brand-gold" aria-hidden />
        {t('musafir.rulingsTitle', 'The traveller’s concessions')}
      </h3>
      <p className="text-white/70 text-xs px-1 mt-0.5 mb-3">
        {t('musafir.rulingsSub', 'Tap any card for the details and the hadith behind it.')}
      </p>
      <div className="space-y-2">
        {MUSAFIR_RULINGS.map((r) => {
          const open = openRuling === r.id;
          return (
            <div
              key={r.id}
              className={`rounded-control border bg-brand-deep shadow-elev-1 overflow-hidden transition-colors ${
                open ? 'border-brand-gold/50' : 'border-brand-border'
              }`}
            >
              <button
                onClick={() => setOpenRuling(open ? null : r.id)}
                aria-expanded={open}
                className="w-full text-left p-3.5 flex items-start gap-3"
              >
                <span className="w-9 h-9 shrink-0 rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/25">
                  <RulingIcon id={r.id} className="w-5 h-5 text-brand-gold" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-white font-bold text-sm leading-snug">
                    {bn ? r.titleBn : r.title}
                  </span>
                  <span className="block text-white/70 text-xs mt-0.5 leading-relaxed">
                    {bn ? r.summaryBn : r.summary}
                  </span>
                </span>
                <ChevronDownIcon
                  className={`w-4 h-4 mt-1 shrink-0 text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      <ul className="space-y-1.5">
                        {r.points.map((pt, i) => (
                          <li
                            key={i}
                            className="text-white/80 text-xs sm:text-sm leading-relaxed flex gap-2"
                          >
                            <span className="text-brand-gold shrink-0">•</span>
                            <span>{bn ? pt.bn : pt.en}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="space-y-2.5 border-t border-brand-border pt-3">
                        {r.refs.map((ref) => (
                          <RefQuote key={ref.source + ref.text.slice(0, 12)} r={ref} lang={lang} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
