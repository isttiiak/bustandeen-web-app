import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { CrescentIcon } from '../icons/IslamicIcons.js';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';

export interface FastingGuestDialogProps {
  navigate: import('../../../node_modules/react-router/dist/development/index.js').NavigateFunction;
  setShowGuestDialog: React.Dispatch<React.SetStateAction<boolean>>;
  showGuestDialog: boolean;
}

export default function FastingGuestDialog({
  navigate,
  setShowGuestDialog,
  showGuestDialog,
}: FastingGuestDialogProps) {
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
              className="bg-brand-deep rounded-card p-6 w-full max-w-sm shadow-elev-3 border border-brand-border text-center"
            >
              <span className="mx-auto mb-4 w-14 h-14 rounded-full grid place-items-center border border-brand-border bg-brand-surface text-brand-gold">
                <CrescentIcon className="w-7 h-7" />
              </span>
              <h3 className="font-display text-xl font-bold text-white mb-2">
                {t('fasting.signInToTrack', 'Sign in to track fasting')}
              </h3>
              <p className="text-white/80 text-sm mb-6 leading-relaxed">
                {t(
                  'fasting.signInDesc',
                  'Your fasting record (make-up days, vows and sunnah fasts) is saved to your account so it syncs across devices.'
                )}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  className={`${BTN_PRIMARY} w-full`}
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', '/fasting');
                    navigate('/login');
                  }}
                >
                  {t('common.signIn')}
                </button>
                <button
                  className={`${BTN_SECONDARY} w-full`}
                  onClick={() => {
                    sessionStorage.setItem('bustandeen_redirect', '/fasting');
                    navigate('/signup');
                  }}
                >
                  {t('fasting.createFreeAccount', 'Create Free Account')}
                </button>
                <button
                  className="py-2 text-white/70 hover:text-white text-sm w-full"
                  onClick={() => setShowGuestDialog(false)}
                >
                  {t('fasting.justLooking', 'Just looking around')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
