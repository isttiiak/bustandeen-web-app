import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { translateReference } from '../utils/localeReference.js';

/**
 * Shown in place of salat/fasting logging while a Rayhanah cycle is active.
 * Tone: sweet, powerful, zero guilt (Istiak's spec — flower emojis, motivating).
 */
export default function ExcusedCard({ feature }: { feature: 'salat' | 'fasting' }) {
  const { t, i18n } = useTranslation();
  const CARD_PHRASES = [
    t('excusedCard.phrase1'),
    t('excusedCard.phrase2'),
    t('excusedCard.phrase3'),
  ];
  const phrase = CARD_PHRASES[Math.floor(Date.now() / 86_400_000) % CARD_PHRASES.length]!;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl p-6 sm:p-8 border border-brand-pink/25 bg-gradient-to-br from-brand-pink/15 via-brand-pink/10 to-brand-warm/10 relative overflow-hidden text-center"
    >
      <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-brand-pink/15 blur-2xl" />
      <div className="relative space-y-3">
        <div className="text-5xl">🌸</div>
        <h2 className="text-xl font-black text-white">{t('excusedCard.heading')}</h2>
        <p className="text-brand-pink/80 text-sm leading-relaxed max-w-md mx-auto">{phrase}</p>
        <p className="text-white/40 text-xs leading-relaxed max-w-md mx-auto">
          {feature === 'salat' ? (
            <>
              {t('excusedCard.salatExplanation')} —{' '}
              <a
                className="underline"
                href="https://sunnah.com/muslim:335"
                target="_blank"
                rel="noreferrer"
              >
                {translateReference('Ṣaḥīḥ Muslim 335', i18n.language)}
              </a>
              .
            </>
          ) : (
            <>
              {t('excusedCard.fastingExplanation')} —{' '}
              <a
                className="underline"
                href="https://sunnah.com/muslim:335"
                target="_blank"
                rel="noreferrer"
              >
                {translateReference('Ṣaḥīḥ Muslim 335', i18n.language)}
              </a>
              .
            </>
          )}
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link
            to="/cycle"
            className="btn btn-sm rounded-xl border border-brand-pink/30 bg-brand-pink/15 hover:bg-brand-pink/25 text-brand-pink font-bold"
          >
            {t('excusedCard.openGarden')}
          </Link>
          <Link
            to="/zikr"
            className="btn btn-sm rounded-xl border border-brand-emerald/10 bg-white/5 hover:bg-white/10 text-white/70 font-bold"
          >
            {t('excusedCard.doDhikr')}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
