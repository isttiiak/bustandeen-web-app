import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { LightBulbIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';
import { CautionIcon } from './fastingIcons.js';
import { UpsertFastingVars } from '../../hooks/useFasting.js';
import { RefLink } from './fastingParts.js';

export interface FastingMakruhModalProps {
  setWarnState: React.Dispatch<
    React.SetStateAction<{
      cautions: import('../../utils/fastingRules.js').DayCaution[];
      vars: import('../../hooks/useFasting.js').UpsertFastingVars;
    } | null>
  >;
  submitLog: (vars: import('../../hooks/useFasting.js').UpsertFastingVars) => void;
  warnState: {
    cautions: import('../../utils/fastingRules.js').DayCaution[];
    vars: import('../../hooks/useFasting.js').UpsertFastingVars;
  } | null;
}

export default function FastingMakruhModal({
  setWarnState,
  submitLog,
  warnState,
}: FastingMakruhModalProps) {
  const { t } = useTranslation();
  return (
    <>
      <AnimatePresence>
        {warnState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setWarnState(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22 }}
              className="bg-brand-deep rounded-card p-6 w-full max-w-md shadow-elev-3 border border-brand-gold/50"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-10 h-10 rounded-control grid place-items-center bg-brand-gold/10 text-brand-gold">
                    <CautionIcon className="w-6 h-6" aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-xl font-bold text-brand-gold">
                    {t('fasting.oneMoment', 'One moment…')}
                  </h3>
                </div>
                <button
                  onClick={() => setWarnState(null)}
                  aria-label={t('fasting.closeWarningAriaLabel', 'Close warning')}
                  className="text-white/60 hover:text-white p-1"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 mb-5">
                {warnState.cautions.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-control bg-brand-gold/10 border border-brand-gold/30 p-3 space-y-1"
                  >
                    <p className="text-brand-gold font-bold text-sm">
                      {t(`fastingRules.disliked.${c.info.id}`, c.info.label)}
                    </p>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {t(`fastingRules.dislikedDetail.${c.info.id}`, c.info.detail)}
                    </p>
                    {c.info.refs.map((r, i) => (
                      <div key={r.url} className="space-y-0.5 pt-1">
                        <p className="text-white/70 text-xs italic">
                          {t(`fastingRules.dislikedRefText.${c.info.id}.${i}`, r.text)}
                        </p>
                        <RefLink r={r} />
                      </div>
                    ))}
                  </div>
                ))}
                {warnState.cautions.some(
                  (c) => c.id === 'friday_alone' || c.id === 'saturday_alone'
                ) && (
                  <p className="flex items-start gap-2 text-white/80 text-xs">
                    <LightBulbIcon
                      className="w-4 h-4 shrink-0 text-brand-gold"
                      aria-hidden="true"
                    />
                    {t(
                      'fasting.easyFixTip',
                      "Easy fix: also fast the day before or after, and then there's no dislike at all."
                    )}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setWarnState(null)} className={`${BTN_PRIMARY} flex-1`}>
                  {t('fasting.illReconsider', "I'll reconsider")}
                </button>
                <button
                  onClick={() => submitLog(warnState.vars)}
                  className={`${BTN_SECONDARY} flex-1`}
                >
                  {t('fasting.logAnyway', 'Log anyway')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
