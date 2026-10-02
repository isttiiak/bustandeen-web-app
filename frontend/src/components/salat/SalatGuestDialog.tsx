import type { NavigateFunction } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';

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
  return (
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
              className="bg-brand-surface rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-brand-border text-center"
            >
              <div className="text-5xl mb-4">🕌</div>
              <h3 className="text-xl font-black text-white mb-2">
                {t('salatTracker.signInToTrack', 'Sign in to track prayers')}
              </h3>
              <p className="text-white/50 text-sm mb-6 leading-relaxed">
                {t(
                  'salatTracker.signInDesc',
                  'Your salat log is saved to your account so it syncs across devices. Create a free account to start tracking.'
                )}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  className="btn bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 text-white border-0 w-full"
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', '/salat');
                    navigate('/login');
                  }}
                >
                  {t('common.signIn')}
                </button>
                <button
                  className="btn btn-ghost text-brand-emerald border border-brand-emerald/30 w-full"
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', '/salat');
                    navigate('/signup');
                  }}
                >
                  {t('salatTracker.createFreeAccount', 'Create Free Account')}
                </button>
                <button
                  className="btn btn-ghost text-white/50 text-sm w-full"
                  onClick={() => setShowGuestDialog(false)}
                >
                  {t('salatTracker.justLooking', 'Just looking around')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
