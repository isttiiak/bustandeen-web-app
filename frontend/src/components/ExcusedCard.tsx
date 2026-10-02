import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { translateReference } from '../utils/localeReference.js';
import { FlowerIcon } from './icons/IslamicIcons.js';
import { CARD, REF_LINK } from './bustanStyles.js';

/**
 * Shown in place of salat/fasting logging while a Rayhanah cycle is active.
 * Tone: sweet, powerful, zero guilt (Istiak's spec: a flower, motivating). The
 * flower is the drawn Rayhanah mark now that redesigned screens carry no emoji.
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
    <div className={`${CARD} border-brand-pink/40 p-6 sm:p-8 text-center space-y-3`}>
      <span className="mx-auto w-14 h-14 rounded-full grid place-items-center bg-brand-pink/10 border border-brand-pink/40 text-brand-pink">
        <FlowerIcon className="w-7 h-7" aria-hidden="true" />
      </span>
      <h2 className="font-display text-xl font-bold text-white">{t('excusedCard.heading')}</h2>
      <p className="text-brand-pink text-sm leading-relaxed max-w-md mx-auto">{phrase}</p>
      <p className="text-white/70 text-xs leading-relaxed max-w-md mx-auto">
        {feature === 'salat'
          ? t('excusedCard.salatExplanation')
          : t('excusedCard.fastingExplanation')}
        <br />
        <a
          className={REF_LINK}
          href="https://sunnah.com/muslim:335"
          target="_blank"
          rel="noreferrer"
        >
          {translateReference('Ṣaḥīḥ Muslim 335', i18n.language)}
        </a>
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        <Link
          to="/cycle"
          className="inline-flex items-center rounded-control px-3 py-2 text-sm font-bold border border-brand-pink/40 bg-brand-pink/10 hover:bg-brand-pink/20 text-brand-pink transition-colors"
        >
          {t('excusedCard.openGarden')}
        </Link>
        <Link
          to="/zikr"
          className="inline-flex items-center rounded-control px-3 py-2 text-sm font-bold border border-brand-border bg-brand-surface/50 hover:bg-brand-surface text-white/80 transition-colors"
        >
          {t('excusedCard.doDhikr')}
        </Link>
      </div>
    </div>
  );
}
