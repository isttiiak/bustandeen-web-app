import { useTranslation, Trans } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { CrescentIcon } from '../icons/IslamicIcons.js';

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
          className="rounded-card border border-brand-gold/40 bg-brand-deep shadow-elev-2 p-4 flex items-center gap-3"
        >
          <span className="w-10 h-10 shrink-0 rounded-control grid place-items-center bg-brand-gold/10 text-brand-gold">
            <CrescentIcon className="w-5 h-5" />
          </span>
          <p className="text-white/80 text-sm leading-relaxed">
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
              defaults="Ramadan starts in <b>{{days}} days</b>, and you still have <b>{{count}} qada {{fastsWord}}</b> to make up."
              components={{ b: <span className="text-brand-gold font-bold" /> }}
            />
          </p>
        </motion.div>
      )}
    </>
  );
}
