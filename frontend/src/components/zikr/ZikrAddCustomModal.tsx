import type { NavigateFunction } from 'react-router';
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ZikrSuggestForm from '../ZikrSuggestForm.js';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface ZikrAddCustomModalProps {
  navigate: NavigateFunction;
  setShowAddCustom: React.Dispatch<React.SetStateAction<boolean>>;
  showAddCustom: boolean;
}

export default function ZikrAddCustomModal({
  navigate,
  setShowAddCustom,
  showAddCustom,
}: ZikrAddCustomModalProps) {
  const { t } = useTranslation();
  return (
    <>
      {createPortal(
        <AnimatePresence>
          {showAddCustom && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowAddCustom(false);
              }}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
                className="bg-brand-surface rounded-3xl p-6 w-full max-w-md shadow-2xl border border-brand-border max-h-[85vh] flex flex-col"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-bold text-brand-emerald">
                    {t('zikr.addCustom', 'Suggest a Dhikr')}
                  </h3>
                  <button
                    onClick={() => setShowAddCustom(false)}
                    aria-label={t('common.close', 'Close')}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs mb-3">
                  <button
                    className="text-brand-gold/80 underline"
                    onClick={() => {
                      setShowAddCustom(false);
                      navigate('/settings');
                    }}
                  >
                    📿 {t('zikr.checkLibrary', 'First check the zikr library in Settings')}
                  </button>
                  <span className="text-white/30">
                    {' '}
                    -{' '}
                    {t(
                      'zikr.checkLibraryNote',
                      'ṣalawāt, istighfār & more, already verified with references.'
                    )}
                  </span>
                </p>
                <div className="overflow-y-auto flex-1 pr-1">
                  <ZikrSuggestForm onDone={() => setShowAddCustom(false)} />
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
