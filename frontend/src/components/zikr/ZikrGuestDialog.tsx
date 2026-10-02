import type { NavigateFunction } from 'react-router';
import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export interface ZikrGuestDialogProps {
  navigate: NavigateFunction;
  pending: Record<string, number>;
  setShowGuestDialog: React.Dispatch<React.SetStateAction<boolean>>;
  showGuestDialog: boolean;
}

export default function ZikrGuestDialog({
  navigate,
  pending,
  setShowGuestDialog,
  showGuestDialog,
}: ZikrGuestDialogProps) {
  const { t } = useTranslation();
  return (
    <>
      <AnimatePresence>
        {showGuestDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22 }}
              className="bg-brand-surface rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-brand-border text-center"
            >
              <div className="text-5xl mb-4">📿</div>
              <h3 className="text-xl font-black text-white mb-2">
                {t('zikr.dontLoseCounts', "Don't lose your counts")}
              </h3>
              <p className="text-white/50 text-sm mb-6 leading-relaxed">
                {t(
                  'zikr.unsavedCounts',
                  'You have {{count}} unsaved zikr counts. Sign in to save your progress and track your streaks.',
                  { count: Object.values(pending ?? {}).reduce((a, b) => a + b, 0) }
                )}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  className="btn bg-brand-emerald hover:bg-brand-emerald-dim text-white border-0 w-full"
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', '/zikr');
                    navigate('/login');
                  }}
                >
                  {t('zikr.signInToSave', 'Sign In to Save')}
                </button>
                <button
                  className="btn btn-ghost text-white/50 hover:text-white w-full"
                  onClick={() => {
                    setShowGuestDialog(false);
                    navigate('/');
                  }}
                >
                  {t('zikr.leaveWithout', 'Leave without saving')}
                </button>
                <button
                  className="btn btn-ghost text-brand-emerald text-sm w-full"
                  onClick={() => setShowGuestDialog(false)}
                >
                  {t('zikr.keepCounting', 'Keep counting')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
