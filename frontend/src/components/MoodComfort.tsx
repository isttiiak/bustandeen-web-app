import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/**
 * A gentle line for the feelings she selected today.
 *
 * Rayhanah privacy rule: NO cycle data (moods, symptoms, days, phases) is ever
 * sent to an AI or any other outside service. This card is fixed, hand-written
 * text picked on the device from the moods on screen. It makes no network call.
 */

const DISTRESS_MOODS = new Set(['low', 'anxious']);
const KNOWN_MOODS = ['low', 'anxious', 'tired', 'irritable', 'happy', 'calm'] as const;
type KnownMood = (typeof KNOWN_MOODS)[number];

export default function MoodComfort({ moods }: { moods: string[] }) {
  const { t } = useTranslation();
  if (!moods.length) return null;

  // Heavier feelings first, so the line speaks to the hardest one she named.
  const lead: KnownMood | undefined = KNOWN_MOODS.find((m) => moods.includes(m));
  const showResourceNote = moods.some((m) => DISTRESS_MOODS.has(m));

  const lines: Record<KnownMood, string> = {
    low: t(
      'cycleSupport.mood.low',
      'A low day is allowed. You are still held and still loved by Allah. Be soft with yourself today.'
    ),
    anxious: t(
      'cycleSupport.mood.anxious',
      'Take one slow breath. Whatever is worrying you, you do not have to carry it all today.'
    ),
    tired: t(
      'cycleSupport.mood.tired',
      'Rest is not laziness. Your body is asking for care, and giving it is a good thing.'
    ),
    irritable: t(
      'cycleSupport.mood.irritable',
      'Feeling on edge is okay. Give yourself some quiet and a little patience today.'
    ),
    happy: t(
      'cycleSupport.mood.happy',
      'A happy heart is a gift. Enjoy it, and say Alhamdulillah for it.'
    ),
    calm: t(
      'cycleSupport.mood.calm',
      'Calm is a blessing. Let this peace stay with you through the day.'
    ),
  };
  const message = lead
    ? lines[lead]
    : t(
        'cycleSupport.mood.other',
        'Whatever today feels like, you are still held and still loved by Allah. Be gentle with yourself.'
      );

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
      {showResourceNote && (
        <p className="text-brand-pink/60 text-[11px] mt-1.5 leading-relaxed">
          {t(
            'cycleSupport.resourceNote',
            'If this feeling sits heavy for more than today, please reach out to someone you trust or a mental health professional. You deserve real support, not just words.'
          )}
        </p>
      )}
    </motion.div>
  );
}
