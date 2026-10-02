import { useEffect, useState } from 'react';
import { AnimatePresence, m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useInstallPrompt } from '../hooks/useInstallPrompt.js';

const DISMISS_KEY = 'bustandeen_pwa_prompt_dismissed_at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // don't nag again for a week

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

/** Shown on the landing page: a native install prompt on Chrome/Edge/Android,
 * or manual "Add to Home Screen" steps on iOS Safari (which has no
 * `beforeinstallprompt` API at all). Hidden once already installed, or for a
 * week after the user dismisses it. */
export default function InstallPwaBanner() {
  const { t } = useTranslation();
  const { canInstall, installed, promptInstall, isIOS } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(wasDismissedRecently);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  // beforeinstallprompt can fire a moment after mount — re-check dismissal
  // state isn't affected, but this keeps the banner from flashing/unflashing.
  useEffect(() => {
    setDismissed(wasDismissedRecently());
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private browsing — non-fatal, just won't remember the dismissal */
    }
  };

  const visible = !installed && !dismissed && (canInstall || isIOS);
  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="fixed inset-x-0 bottom-0 z-[95] px-4 pb-4 sm:pb-6 flex justify-center pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-brand-surface/95 backdrop-blur-xl border border-brand-border shadow-2xl p-4 flex items-start gap-3">
          <img src="/pwa-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm">
              {t('pwa.installTitle', 'Install Bustandeen')}
            </p>
            {isIOS && !canInstall ? (
              showIOSSteps ? (
                <p className="text-white/60 text-xs mt-1 leading-relaxed">
                  {t(
                    'pwa.iosSteps',
                    'Tap the Share icon in Safari\'s toolbar, then choose "Add to Home Screen".'
                  )}
                </p>
              ) : (
                <p className="text-white/60 text-xs mt-1 leading-relaxed">
                  {t(
                    'pwa.installDesc',
                    'Add Bustandeen to your home screen for a faster, full-screen experience — offline-ready and one tap away.'
                  )}
                </p>
              )
            ) : (
              <p className="text-white/60 text-xs mt-1 leading-relaxed">
                {t(
                  'pwa.installDesc',
                  'Add Bustandeen to your home screen for a faster, full-screen experience — offline-ready and one tap away.'
                )}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              {isIOS && !canInstall ? (
                !showIOSSteps && (
                  <button
                    className="px-4 py-1.5 rounded-full bg-brand-emerald text-white text-xs font-bold hover:bg-brand-emerald-dim transition-colors"
                    onClick={() => setShowIOSSteps(true)}
                  >
                    {t('pwa.howTo', 'How to install')}
                  </button>
                )
              ) : (
                <button
                  className="px-4 py-1.5 rounded-full bg-brand-emerald text-white text-xs font-bold hover:bg-brand-emerald-dim transition-colors"
                  onClick={() => void promptInstall().then((outcome) => outcome && dismiss())}
                >
                  {t('pwa.install', 'Install')}
                </button>
              )}
              <button
                className="px-4 py-1.5 rounded-full bg-white/5 text-white/50 text-xs font-semibold hover:bg-white/10 hover:text-white/70 transition-colors"
                onClick={dismiss}
              >
                {t('pwa.notNow', 'Not now')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
