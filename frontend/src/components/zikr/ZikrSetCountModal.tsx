import React from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BTN_PRIMARY, BTN_SECONDARY, DIALOG } from '../bustanStyles.js';

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
                className={`${DIALOG} p-6 w-full max-w-xs`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="zikr-set-count-title"
              >
                <h3
                  id="zikr-set-count-title"
                  className="font-display text-xl font-bold text-white mb-1"
                >
                  {t('zikr.setCountTitle', 'Set starting count')}
                </h3>
                <p className="text-white/75 text-xs leading-relaxed mb-4">
                  {t(
                    'zikr.setCountDesc',
                    'Jump straight to a number: start from 33, 99, or wherever you left off.'
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
                  aria-labelledby="zikr-set-count-title"
                  className="w-full rounded-control border border-brand-border bg-brand-void text-white focus:border-brand-emerald focus:outline-none px-3 py-2.5 text-lg text-center"
                  // eslint-disable-next-line jsx-a11y-x/no-autofocus -- the dialog's only field; moving focus into a dialog is expected
                  autoFocus
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setShowSetCount(false)}
                    className={`${BTN_SECONDARY} flex-1`}
                  >
                    {t('common.cancel')}
                  </button>
                  <button onClick={submitSetCount} className={`${BTN_PRIMARY} flex-1`}>
                    {t('zikr.setCountBtn', 'Set')}
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
