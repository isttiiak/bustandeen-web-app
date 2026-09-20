import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/**
 * Phase-aware encouragement for Rayhanah.
 *
 * Rayhanah privacy rule: NO cycle data (phase, day count, dates) is ever sent
 * to an AI or any other outside service. This is fixed, hand-written text
 * chosen on the device from the day number; it makes no network call. The
 * istihada/ghusl guidance stays as the app's own static copy shown elsewhere.
 */
export default function CycleGuidance({ dayCount }: { dayCount: number }) {
  const { t } = useTranslation();

  const options = [
    t(
      'cycleSupport.day.a',
      'Rest is written for you these days. Your dhikr and du’a reach Him just the same.'
    ),
    t(
      'cycleSupport.day.b',
      'You are not behind. This is a different kind of worship season, and you are still close to Allah.'
    ),
    t(
      'cycleSupport.day.c',
      'Be gentle with yourself today. A quiet moment of remembrance is enough.'
    ),
  ];
  const message = options[Math.abs(dayCount) % options.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-brand-pink/25 bg-brand-pink/[0.07] p-3.5"
    >
      <p className="text-brand-pink/70 text-[11px] font-bold">
        {t('cycleSupport.label', 'For you today')}
      </p>
      <p className="text-brand-pink/80 text-sm leading-relaxed mt-1.5">{message}</p>
      <p className="text-white/30 text-[10px] mt-2">
        {t(
          'cycleSupport.disclaimer',
          'Kind words, not medical or religious advice. What you record here stays private and is never sent to an AI.'
        )}
      </p>
    </motion.div>
  );
}
