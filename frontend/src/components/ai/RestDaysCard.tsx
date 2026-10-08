import { m as motion } from 'framer-motion';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FlowerIcon } from '../icons/IslamicIcons.js';
import { BTN_SECONDARY, CARD } from '../bustanStyles.js';

/**
 * Shown on the Naseeh page instead of the streak, weekly, pattern and
 * make-up-plan cards while a Rayhanah cycle is active.
 *
 * Fixed, hand-written text. It makes no network call and no AI request, and
 * it reads nothing except the on-device "resting" flag (see useCycleAiGate).
 */
export default function RestDaysCard() {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${CARD} !border-brand-pink/40 p-5 space-y-3`}
    >
      <div className="flex items-center gap-2">
        <FlowerIcon aria-hidden className="w-6 h-6 text-brand-pink" />
        <h2 className="font-display text-white font-bold text-lg">
          {t('restDays.heading', 'Take it gently')}
        </h2>
      </div>
      <p className="text-white/80 text-sm leading-relaxed">
        {t(
          'restDays.body',
          'These are rest days. Nothing here is a slip, and your streaks and goals are paused, not lost. Naseeh will not check your progress until you are back.'
        )}
      </p>
      <p className="text-white/65 text-xs leading-relaxed">
        {t(
          'restDays.note',
          'You can still make dhikr or read Quran whenever your heart wants to. Anything you do counts, and nothing you skip is held against you.'
        )}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link to="/zikr" className={`${BTN_SECONDARY} !border-brand-pink/40 !text-brand-pink`}>
          {t('restDays.dhikr', 'Do some dhikr')}
        </Link>
        <Link to="/quran" className={BTN_SECONDARY}>
          {t('restDays.quran', 'Read Quran')}
        </Link>
      </div>
      <p className="text-white/55 text-[11px] leading-relaxed">
        {t(
          'restDays.privacy',
          'This card is worked out on your device. Nothing about your cycle is sent to an AI, ever.'
        )}
      </p>
    </motion.div>
  );
}
