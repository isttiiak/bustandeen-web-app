import { useTranslation, Trans } from 'react-i18next';
import { motion } from 'framer-motion';

export interface RamadanQadaWarningProps {
  qadaRemaining: number;
  ramadanWindow: import('../../utils/ramadan.js').RamadanWindow;
  showRamadanQadaWarning: boolean;
}

export default function RamadanQadaWarning({
  qadaRemaining,
  ramadanWindow,
  showRamadanQadaWarning,
}: RamadanQadaWarningProps) {
  const { t } = useTranslation();
  return (
    <>
      {showRamadanQadaWarning && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-brand-gold/25 bg-brand-gold/[0.06] p-3.5 flex items-center gap-3"
        >
          <span className="text-2xl shrink-0">🌙</span>
          <p className="text-white/70 text-xs leading-relaxed">
            <Trans
              i18nKey="fasting.ramadanQadaWarning"
              values={{
                days: ramadanWindow.daysUntil,
                count: qadaRemaining,
                fastsWord:
                  qadaRemaining === 1
                    ? t('fasting.qadaFastSingular', 'fast')
                    : t('fasting.qadaFastPlural', 'fasts'),
              }}
              defaults="Ramadan starts in <b>{{days}} days</b> — you still have <b>{{count}} qada {{fastsWord}}</b> to make up."
              components={{ b: <span className="text-brand-gold font-bold" /> }}
            />
          </p>
        </motion.div>
      )}
    </>
  );
}
