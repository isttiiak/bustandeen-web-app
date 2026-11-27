import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { HomeIcon } from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { REF_RETURN_MASJID } from '../../utils/musafir.js';
import { RefQuote } from './MusafirBits.js';
import { type MusafirPage } from './useMusafirPage.js';

export default function MusafirReturned({ page }: { page: MusafirPage }) {
  const { t } = useTranslation();
  const { returned, setReturned, active, fmtDate, lang } = page;

  return (
    <AnimatePresence>
      {returned && !active && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`${CARD} p-5`}
        >
          <h3 className={SECTION_TITLE}>
            <HomeIcon className="w-5 h-5 text-brand-emerald" aria-hidden />
            {t('musafir.welcomeHome', 'Welcome home! Alhamdulillah.')}
          </h3>
          <p className="text-white/75 text-sm mt-1">
            {t(
              'musafir.tripSummary',
              '{{days}}-day journey, {{from}} → {{to}}. Musafir mode is off.',
              {
                days: formatLocaleNumber(returned.days),
                from: fmtDate(returned.from),
                to: fmtDate(returned.to),
              }
            )}
          </p>
          <div className="mt-3 space-y-3">
            <div className="rounded-control bg-shade/20 p-3">
              <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">
                {t('musafir.returnSunnah', 'The returning sunnah')}
              </p>
              <RefQuote r={REF_RETURN_MASJID} lang={lang} />
            </div>
            <button
              onClick={() => setReturned(null)}
              className="text-white/70 text-xs underline hover:text-white"
            >
              {t('common.close', 'Close')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
