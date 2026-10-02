import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
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
              className="bg-brand-surface rounded-3xl p-6 w-full max-w-md shadow-2xl border-2 border-brand-gold/50"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: [0, -8, 8, 0] }}
                    transition={{ duration: 0.5 }}
                    className="text-3xl"
                  >
                    ⚠️
                  </motion.span>
                  <h3 className="text-lg font-black text-brand-gold">
                    {t('fasting.oneMoment', 'One moment…')}
                  </h3>
                </div>
                <button
                  onClick={() => setWarnState(null)}
                  aria-label={t('fasting.closeWarningAriaLabel', 'Close warning')}
                  className="text-white/30 hover:text-white p-1"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 mb-5">
                {warnState.cautions.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl bg-brand-gold/10 border border-brand-gold/25 p-3 space-y-1"
                  >
                    <p className="text-brand-gold font-bold text-sm">
                      {c.info.emoji} {t(`fastingRules.disliked.${c.info.id}`, c.info.label)}
                    </p>
                    <p className="text-white/60 text-xs leading-relaxed">
                      {t(`fastingRules.dislikedDetail.${c.info.id}`, c.info.detail)}
                    </p>
                    {c.info.refs.map((r, i) => (
                      <div key={r.url} className="space-y-0.5 pt-1">
                        <p className="text-white/30 text-xs italic">
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
                  <p className="text-white/40 text-xs">
                    💡{' '}
                    {t(
                      'fasting.easyFixTip',
                      "Easy fix: also fast the day before or after — then there's no dislike at all."
                    )}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setWarnState(null)}
                  className="btn flex-1 bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 text-on-color border-0 font-bold"
                >
                  {t('fasting.illReconsider', "I'll reconsider")}
                </button>
                <button
                  onClick={() => submitLog(warnState.vars)}
                  className="btn flex-1 btn-ghost text-white/50 hover:text-white border border-brand-border"
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
