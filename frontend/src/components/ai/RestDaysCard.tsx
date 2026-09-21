import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
      className="rounded-3xl border border-brand-pink/25 bg-gradient-to-br from-brand-pink/15 via-brand-pink/10 to-brand-warm/10 p-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>
          🌸
        </span>
        <h2 className="text-white font-black text-lg">{t('restDays.heading', 'Take it gently')}</h2>
      </div>
      <p className="text-brand-pink/85 text-sm leading-relaxed">
        {t(
          'restDays.body',
          'These are rest days. Nothing here is a slip, and your streaks and goals are paused, not lost. Naseeh will not check your progress until you are back.'
        )}
      </p>
      <p className="text-white/50 text-xs leading-relaxed">
        {t(
          'restDays.note',
          'You can still make dhikr or read Quran whenever your heart wants to. Anything you do counts, and nothing you skip is held against you.'
        )}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to="/zikr"
          className="btn btn-sm rounded-xl border border-brand-pink/30 bg-brand-pink/15 hover:bg-brand-pink/25 text-brand-pink font-bold"
        >
          {t('restDays.dhikr', 'Do some dhikr')}
        </Link>
        <Link
          to="/quran"
          className="btn btn-sm rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 font-bold"
        >
          {t('restDays.quran', 'Read Quran')}
        </Link>
      </div>
      <p className="text-white/30 text-[10px] leading-relaxed">
        {t(
          'restDays.privacy',
          'This card is worked out on your device. Nothing about your cycle is sent to an AI, ever.'
        )}
      </p>
    </motion.div>
  );
}
