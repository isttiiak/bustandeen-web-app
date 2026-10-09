import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownTrayIcon,
  ArrowUpOnSquareIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { useInstallPrompt } from '../hooks/useInstallPrompt.js';
import { BTN_PRIMARY, BTN_SECONDARY } from './bustanStyles.js';

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
 * week after the user dismisses it. Portaled to <body> so the page's `z-10`
 * layer (AnimatedBackground) cannot trap it under other fixed UI. */
export default function InstallPwaBanner() {
  const { t } = useTranslation();
  const { canInstall, installed, promptInstall, isIOS } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(wasDismissedRecently);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  // beforeinstallprompt can fire a moment after mount; re-reading the
  // dismissal here keeps the banner from flashing/unflashing.
  useEffect(() => {
    setDismissed(wasDismissedRecently());
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private browsing: non-fatal, just won't remember the dismissal */
    }
  };

  const visible = !installed && !dismissed && (canInstall || isIOS);
  if (!visible || typeof document === 'undefined') return null;

  const iosManual = isIOS && !canInstall;
  const small = 'py-1.5 text-xs';

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="fixed inset-x-0 bottom-0 z-[95] px-4 pb-4 sm:pb-6 flex justify-center pointer-events-none"
    >
      <div
        role="region"
        aria-label={t('pwa.installTitle', 'Install Bustandeen')}
        className="pointer-events-auto w-full max-w-md rounded-card border border-brand-border bg-brand-deep shadow-elev-3 p-4 flex items-start gap-3"
      >
        <img src="/pwa-192.png" alt="" className="w-11 h-11 rounded-control shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-white font-bold text-sm">
            {t('pwa.installTitle', 'Install Bustandeen')}
          </p>
          {iosManual && showIOSSteps ? (
            <p className="text-white/80 text-xs mt-1 leading-relaxed">
              <ArrowUpOnSquareIcon
                className="inline w-4 h-4 -mt-0.5 mr-1 text-brand-gold"
                aria-hidden="true"
              />
              {t(
                'pwa.iosSteps',
                'Tap the Share icon in Safari\'s toolbar, then choose "Add to Home Screen".'
              )}
            </p>
          ) : (
            <p className="text-white/80 text-xs mt-1 leading-relaxed">
              {t(
                'pwa.installDesc',
                'Add Bustandeen to your home screen for a faster, full-screen experience. It works offline and opens in one tap.'
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {iosManual ? (
              !showIOSSteps && (
                <button className={`${BTN_PRIMARY} ${small}`} onClick={() => setShowIOSSteps(true)}>
                  <PlusCircleIcon className="w-4 h-4" aria-hidden="true" />
                  {t('pwa.howTo', 'How to install')}
                </button>
              )
            ) : (
              <button
                className={`${BTN_PRIMARY} ${small}`}
                onClick={() => void promptInstall().then((outcome) => outcome && dismiss())}
              >
                <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" />
                {t('pwa.install', 'Install')}
              </button>
            )}
            <button className={`${BTN_SECONDARY} ${small}`} onClick={dismiss}>
              {t('pwa.notNow', 'Not now')}
            </button>
          </div>
        </div>
      </div>
    </motion.div>,
    document.body
  );
}
