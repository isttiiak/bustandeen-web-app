import type { NavigateFunction } from 'react-router';
import React from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { TasbihIcon } from '../icons/IslamicIcons.js';
import { BTN_PRIMARY, BTN_QUIET, BTN_SECONDARY, DIALOG } from '../bustanStyles.js';

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
  // Portaled: AnimatedBackground wraps the Zikr page in `relative z-10`, which
  // kept this under the sticky navbar.
  return createPortal(
    <>
      <AnimatePresence>
        {showGuestDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22 }}
              className={`${DIALOG} p-6 w-full max-w-sm text-center`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="zikr-guest-title"
            >
              <TasbihIcon
                className="w-12 h-12 mx-auto mb-4 text-brand-emerald"
                aria-hidden="true"
              />
              <h3 id="zikr-guest-title" className="font-display text-xl font-bold text-white mb-2">
                {t('zikr.dontLoseCounts', "Don't lose your counts")}
              </h3>
              <p className="text-white/75 text-sm mb-6 leading-relaxed">
                {t(
                  'zikr.unsavedCounts',
                  'You have {{count}} unsaved zikr counts. Sign in to save your progress and track your streaks.',
                  { count: Object.values(pending ?? {}).reduce((a, b) => a + b, 0) }
                )}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  className={`${BTN_PRIMARY} w-full`}
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', '/zikr');
                    navigate('/login');
                  }}
                >
                  {t('zikr.signInToSave', 'Sign In to Save')}
                </button>
                <button
                  className={`${BTN_SECONDARY} w-full`}
                  onClick={() => setShowGuestDialog(false)}
                >
                  {t('zikr.keepCounting', 'Keep counting')}
                </button>
                <button
                  className={`${BTN_QUIET} w-full`}
                  onClick={() => {
                    setShowGuestDialog(false);
                    navigate('/');
                  }}
                >
                  {t('zikr.leaveWithout', 'Leave without saving')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
