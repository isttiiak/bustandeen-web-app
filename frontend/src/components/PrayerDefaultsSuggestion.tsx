import { useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  CALC_METHODS,
  acceptPrayerDefaultsSuggestion,
  dismissPrayerDefaultsSuggestion,
  getPrayerDefaultsSuggestion,
  type AsrMadhab,
} from '../utils/salatPrefs.js';
import { countryName } from '../utils/countryDefaults.js';

/**
 * One-time card for people who were already using prayer times before the
 * country-aware defaults (audit T1.9): their timetable was kept exactly as it
 * was, and this offers what most mosques in their country use instead. They
 * decide; either button hides it for good, and so does choosing a method or
 * ʿAṣr school in Prayer time settings.
 */
export default function PrayerDefaultsSuggestion({ onChange }: { onChange: () => void }) {
  const { t, i18n } = useTranslation();
  const [suggestion, setSuggestion] = useState(getPrayerDefaultsSuggestion);
  if (!suggestion) return null;

  const country = countryName(suggestion.countryCode, i18n.language === 'bn' ? 'bn' : 'en');
  const methodLabel = (id: string) => CALC_METHODS.find((m) => m.id === id)?.label ?? id;
  const asrLabel = (a: AsrMadhab) =>
    a === 'hanafi'
      ? t('prayerTimes.defaults.asrHanafi', 'Ḥanafī ʿAṣr')
      : t('prayerTimes.defaults.asrStandard', 'standard ʿAṣr');

  const accept = () => {
    acceptPrayerDefaultsSuggestion();
    setSuggestion(null);
    onChange();
  };
  const keep = () => {
    dismissPrayerDefaultsSuggestion();
    setSuggestion(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="rounded-2xl border border-brand-gold/25 bg-brand-gold/[0.06] p-4 space-y-3"
        role="region"
        aria-label={t('prayerTimes.defaults.title', 'Times used in {{country}}', { country })}
      >
        <div>
          <p className="text-brand-gold font-bold text-sm">
            {t('prayerTimes.defaults.title', 'Times used in {{country}}', { country })}
          </p>
          <p className="text-white/60 text-xs leading-relaxed mt-1.5">
            {t(
              'prayerTimes.defaults.body',
              'Most mosques in {{country}} use the {{method}} method with {{asr}}. You are using {{currentMethod}} with {{currentAsr}}. Follow your local mosque.',
              {
                country,
                method: methodLabel(suggestion.suggested.method),
                asr: asrLabel(suggestion.suggested.asr),
                currentMethod: methodLabel(suggestion.current.method),
                currentAsr: asrLabel(suggestion.current.asr),
              }
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={accept}
            className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim border-none text-brand-void font-bold"
          >
            {t('prayerTimes.defaults.accept', 'Use the usual times')}
          </button>
          <button
            onClick={keep}
            className="btn btn-sm btn-ghost text-white/60 hover:text-white border border-white/10"
          >
            {t('prayerTimes.defaults.keep', 'Keep mine')}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
