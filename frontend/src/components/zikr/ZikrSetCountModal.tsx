import React from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export interface ZikrSetCountModalProps {
  setCountValue: string;
  setSetCountValue: React.Dispatch<React.SetStateAction<string>>;
  setShowSetCount: React.Dispatch<React.SetStateAction<boolean>>;
  showSetCount: boolean;
  submitSetCount: () => void;
}

export default function ZikrSetCountModal({
  setCountValue,
  setSetCountValue,
  setShowSetCount,
  showSetCount,
  submitSetCount,
}: ZikrSetCountModalProps) {
  const { t } = useTranslation();
  return (
    <>
      {createPortal(
        <AnimatePresence>
          {showSetCount && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowSetCount(false);
              }}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
                className="bg-brand-surface rounded-3xl p-6 w-full max-w-xs shadow-2xl border border-brand-border"
              >
                <h3 className="text-xl font-bold text-brand-emerald mb-1">
                  {t('zikr.setCountTitle', 'Set starting count')}
                </h3>
                <p className="text-white/40 text-xs mb-4">
                  {t(
                    'zikr.setCountDesc',
                    'Jump straight to a number — start from 33, 99, or wherever you left off.'
                  )}
                </p>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={setCountValue}
                  onChange={(e) => setSetCountValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitSetCount();
                  }}
                  placeholder={t('zikr.setCountPlaceholder', 'Enter a number')}
                  className="input input-bordered w-full bg-brand-deep border-brand-border text-white focus:border-brand-emerald text-lg text-center"
                  autoFocus
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={submitSetCount}
                    className="btn flex-1 bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 border-0 text-white"
                  >
                    {t('zikr.setCountBtn', 'Set')}
                  </button>
                  <button onClick={() => setShowSetCount(false)} className="btn btn-ghost flex-1">
                    {t('common.cancel')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
