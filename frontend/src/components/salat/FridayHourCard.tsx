import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FRIDAY_HOUR_REF } from '../../utils/fridayHour.js';
import { translateReference } from '../../utils/localeReference.js';

export interface FridayHourCardProps {
  fridayHour: import('../../utils/fridayHour.js').FridayHourState;
}

export default function FridayHourCard({ fridayHour }: FridayHourCardProps) {
  const { t, i18n } = useTranslation();
  return (
    <>
      {fridayHour.active && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-4 ${
            fridayHour.isFinalStretch
              ? 'border-brand-gold/50 bg-gradient-to-br from-brand-gold/15 to-brand-gold-dim/5'
              : 'border-brand-gold/25 bg-brand-gold/[0.06]'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🤲</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h3 className="text-brand-gold font-black text-sm">
                  {fridayHour.isFinalStretch
                    ? t('salatTracker.hourOfResponseNow', 'The hour of response — now')
                    : t('salatTracker.hourOfResponse', 'Friday: the hour of response')}
                </h3>
                <span className="text-brand-gold/70 text-xs font-bold tabular-nums">
                  {t('salatTracker.toMaghrib', '{{countdown}} to Maghrib', {
                    countdown: fridayHour.countdown,
                  })}
                </span>
              </div>
              <p className="text-white/60 text-xs mt-1.5 leading-relaxed">
                {t(
                  'salatTracker.hourOfResponseQuote',
                  '"{{text}}" Keep asking until the sun sets — for yourself, your parents, and the ummah.',
                  {
                    text: i18n.language === 'bn' ? FRIDAY_HOUR_REF.textBn : FRIDAY_HOUR_REF.text,
                  }
                )}
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-2.5">
                <a
                  href={FRIDAY_HOUR_REF.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-white/35 hover:text-brand-gold underline underline-offset-2"
                >
                  {translateReference(FRIDAY_HOUR_REF.source, i18n.language)} ·{' '}
                  {translateReference(FRIDAY_HOUR_REF.grade, i18n.language)} ↗
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
