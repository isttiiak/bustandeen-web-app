import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { BriefcaseIcon } from '@heroicons/react/24/outline';
import MusafirBanner from '../MusafirBanner.js';
import {
  defaultSchool,
  dismissTravelHint,
  startMusafir,
  suggestStartAfter,
} from '../../utils/musafir.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { getTrackingDay } from '../../utils/trackingDay.js';
import type { HomeState } from './useHomeData.js';

/** Musafir mode: the journey at a glance, or a hint to turn it on when you are far from home. */
export function HomeMusafirGlance({
  musafir,
  travelHint,
  setHintDismissed,
}: Pick<HomeState, 'musafir' | 'travelHint' | 'setHintDismissed'>) {
  const { t } = useTranslation();
  return (
    <>
      {musafir ? (
        <div className="mb-4">
          <MusafirBanner state={musafir} today={getTrackingDay()} variant="home" />
        </div>
      ) : (
        travelHint && (
          // Off, but the device is already past the qaṣr distance from the
          // saved prayer-times location (only checked when location
          // permission was already granted, see useTravelHint).
          <div className="mb-4 flex items-center gap-3 rounded-card border border-brand-info/30 bg-brand-info/[0.08] px-4 py-3">
            <BriefcaseIcon className="w-6 h-6 shrink-0 text-brand-info" />
            <Link to="/musafir" className="min-w-0 flex-1">
              <span className="block text-white/85 font-bold text-sm leading-tight">
                {t('home.musafirHintTitle', 'Travelling?')}
              </span>
              <span className="block text-white/60 text-xs mt-0.5 leading-snug">
                {travelHint.from
                  ? t('home.musafirHintDesc', 'You are about {{km}} km from {{place}}.', {
                      km: formatLocaleNumber(travelHint.km),
                      place: travelHint.from,
                    })
                  : t(
                      'home.musafirHintDescNoName',
                      'You are about {{km}} km from your saved location.',
                      {
                        km: formatLocaleNumber(travelHint.km),
                      }
                    )}
              </span>
            </Link>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  const today = getTrackingDay();
                  startMusafir({
                    today,
                    startAfter: suggestStartAfter(today),
                    school: defaultSchool(),
                  });
                  toast.success(t('home.musafirStarted', 'Safe travels! Musafir mode is on.'), {
                    icon: <BriefcaseIcon className="w-5 h-5 text-brand-info" />,
                  });
                }}
                className="px-3 py-1.5 rounded-control text-xs font-bold bg-brand-info/20 border border-brand-info/60 text-brand-info hover:bg-brand-info/30"
              >
                {t('home.musafirTurnOn', 'Turn on')}
              </motion.button>
              <button
                onClick={() => {
                  dismissTravelHint(getTrackingDay());
                  setHintDismissed(true);
                }}
                className="text-white/50 text-[11px] underline hover:text-white/70"
              >
                {t('home.musafirHintDismiss', 'Not now')}
              </button>
            </div>
          </div>
        )
      )}
    </>
  );
}
