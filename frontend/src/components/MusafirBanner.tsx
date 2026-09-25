import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { formatLocaleNumber } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';
import { translateSalatName } from '../utils/prayerTimes.js';
import {
  journeyDay,
  staysAsResident,
  musafirAppliesTo,
  QASR_PRAYERS,
  type MusafirState,
} from '../utils/musafir.js';

/**
 * The one-line "you're travelling" strip shown on the trackers while Musafir
 * mode is on. Each variant states only what changes on that page, and the
 * whole strip opens /musafir.
 */
export default function MusafirBanner({
  state,
  today,
  variant,
}: {
  state: MusafirState;
  today: string;
  variant: 'salat' | 'home' | 'fasting';
}) {
  const { t, i18n } = useTranslation();
  const day = formatLocaleNumber(journeyDay(state, today));
  const resident = staysAsResident(state);
  // On the start day only the prayers after the one prayed at home shorten.
  const qasrToday = QASR_PRAYERS.filter((p) => musafirAppliesTo(state, today, p));

  const line =
    variant === 'fasting'
      ? t(
          'musafir.bannerFasting',
          'You may fast or break it on a journey; a missed Ramadan day becomes a qaḍāʾ to make up later.'
        )
      : resident
        ? t(
            'musafir.bannerResident',
            'Shorten on the road; pray in full once you settle at your destination.'
          )
        : qasrToday.length === QASR_PRAYERS.length
          ? t('musafir.bannerQasr', 'Ẓuhr, ʿAṣr and ʿIshāʾ are 2 rak’ahs today.')
          : qasrToday.length === 0
            ? t('musafir.bannerQasrTomorrow', 'Shortened prayers start from tomorrow.')
            : t('musafir.bannerQasrSome', 'Today {{names}}: 2 rak’ahs.', {
                names: qasrToday.map((p) => translateSalatName(p, p, t)).join(', '),
              });

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
      <Link
        to="/musafir"
        className="flex items-center gap-3 rounded-2xl border border-brand-info/40 bg-gradient-to-r from-brand-info/15 to-brand-emerald/10 px-4 py-3 hover:border-brand-info/70 transition-colors"
      >
        <span className="text-2xl shrink-0">🧳</span>
        <span className="min-w-0 flex-1">
          <span className="block text-brand-info font-black text-sm leading-tight">
            {t('musafir.bannerTitle', 'Musafir · day {{day}}', { day })}
            {state.destination && (
              <span className="text-white/40 font-semibold"> · {state.destination}</span>
            )}
          </span>
          <span className="block text-white/60 text-xs mt-0.5 leading-snug">{line}</span>
          {variant === 'fasting' && (
            <span className="block text-white/30 text-[10px] mt-0.5">
              {translateReference('Ṣaḥīḥ al-Bukhārī 1943 · Ṣaḥīḥ', i18n.language)}
            </span>
          )}
        </span>
        <span className="text-brand-info/60 text-lg shrink-0">→</span>
      </Link>
    </motion.div>
  );
}
