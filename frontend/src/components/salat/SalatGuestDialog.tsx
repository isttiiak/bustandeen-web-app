import type { NavigateFunction } from 'react-router';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { MosqueIcon } from '../icons/IslamicIcons.js';
import { BTN_PRIMARY, BTN_QUIET, BTN_SECONDARY, DIALOG } from '../bustanStyles.js';

export interface SalatGuestDialogProps {
  navigate: NavigateFunction;
  setShowGuestDialog: React.Dispatch<React.SetStateAction<boolean>>;
  showGuestDialog: boolean;
}

export default function SalatGuestDialog({
  navigate,
  setShowGuestDialog,
  showGuestDialog,
}: SalatGuestDialogProps) {
  const { t } = useTranslation();
  // Portaled like the Fasting and Zikr dialogs, so no page layer can keep it
  // under the sticky navbar.
  return createPortal(
    <>
      <AnimatePresence>
        {showGuestDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowGuestDialog(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22 }}
              className={`${DIALOG} p-6 w-full max-w-sm text-center`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="salat-guest-title"
            >
              <MosqueIcon
                className="w-12 h-12 mx-auto mb-4 text-brand-emerald"
                aria-hidden="true"
              />
              <h3 id="salat-guest-title" className="font-display text-xl font-bold text-white mb-2">
                {t('salatTracker.signInToTrack', 'Sign in to track prayers')}
              </h3>
              <p className="text-white/75 text-sm mb-6 leading-relaxed">
                {t(
                  'salatTracker.signInDesc',
                  'Your salat log is saved to your account so it syncs across devices. Create a free account to start tracking.'
                )}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  className={`${BTN_PRIMARY} w-full`}
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', '/salat');
                    navigate('/login');
                  }}
                >
                  {t('common.signIn')}
                </button>
                <button
                  className={`${BTN_SECONDARY} w-full`}
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', '/salat');
                    navigate('/signup');
                  }}
                >
                  {t('salatTracker.createFreeAccount', 'Create Free Account')}
                </button>
                <button className={`${BTN_QUIET} w-full`} onClick={() => setShowGuestDialog(false)}>
                  {t('salatTracker.justLooking', 'Just looking around')}
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
