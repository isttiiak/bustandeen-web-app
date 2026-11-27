import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { CARD } from '../bustanStyles.js';
import { translateReference } from '../../utils/localeReference.js';

const SOURCE_REFS: {
  key: string;
  labelKey: string;
  labelFallback: string;
  refs: { cite: string; url: string }[];
}[] = [
  {
    key: 'forbidden',
    labelKey: 'prayerTimes.sourcesForbiddenLabel',
    labelFallback: 'Forbidden times',
    refs: [
      { cite: 'Ṣaḥīḥ al-Bukhārī 581, 585, 586', url: 'https://sunnah.com/bukhari:581' },
      { cite: 'Ṣaḥīḥ Muslim 831', url: 'https://sunnah.com/muslim:831' },
    ],
  },
  {
    key: 'ishraq',
    labelKey: 'prayerTimes.sourcesIshraqLabel',
    labelFallback: 'Ishraq/Duha',
    refs: [
      { cite: 'Tirmidhī 586', url: 'https://sunnah.com/tirmidhi:586' },
      { cite: 'Ṣaḥīḥ Muslim 717', url: 'https://sunnah.com/muslim:717' },
    ],
  },
  {
    key: 'awwabin',
    labelKey: 'prayerTimes.sourcesAwwabinLabel',
    labelFallback: 'Awwabin',
    refs: [{ cite: 'Ibn Mājah 1167', url: 'https://sunnah.com/ibnmajah:1167' }],
  },
  {
    key: 'tahajjud',
    labelKey: 'prayerTimes.sourcesTahajjudLabel',
    labelFallback: 'Tahajjud',
    refs: [
      { cite: 'Ṣaḥīḥ al-Bukhārī 1145', url: 'https://sunnah.com/bukhari:1145' },
      { cite: 'Ṣaḥīḥ Muslim 758, 1163', url: 'https://sunnah.com/muslim:758' },
    ],
  },
];

export default function PrayerSources({
  sourcesExpanded,
  setSourcesExpanded,
}: {
  sourcesExpanded: boolean;
  setSourcesExpanded: Dispatch<SetStateAction<boolean>>;
}) {
  const { t, i18n } = useTranslation();

  return (
    <div className={`${CARD} overflow-hidden`}>
      <button
        onClick={() => setSourcesExpanded((v) => !v)}
        aria-expanded={sourcesExpanded}
        className="w-full p-4 flex items-center justify-between gap-2 text-left"
      >
        <span className="text-white/75 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
          <InformationCircleIcon className="w-4 h-4 text-brand-gold" aria-hidden />
          {t('prayerTimes.sourcesTitle', 'Sources')}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-white/60 shrink-0 transition-transform ${sourcesExpanded ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      <AnimatePresence>
        {sourcesExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1.5 text-xs text-white/70 leading-relaxed">
              <p>
                <span className="text-white/90 font-semibold">
                  {t('prayerTimes.sourcesPrayerTimesLabel', 'Prayer times')}:
                </span>{' '}
                {t(
                  'prayerTimes.sourcesPrayerTimesDesc',
                  'Calculated on your device with the adhan library, using the calculation method and Asr setting you choose in Prayer time settings. No external API: all calculations use your coordinates only.'
                )}
              </p>
              {SOURCE_REFS.map((entry) => (
                <p key={entry.key}>
                  <span className="text-white/90 font-semibold">
                    {t(entry.labelKey, entry.labelFallback)}:
                  </span>{' '}
                  {entry.refs.map((ref, i) => (
                    <span key={ref.url}>
                      {i > 0 && ' · '}
                      {translateReference(ref.cite, i18n.language)} ·{' '}
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-gold underline underline-offset-2"
                      >
                        {ref.url.replace('https://', '')}
                      </a>
                    </span>
                  ))}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
