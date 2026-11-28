import { useTranslation } from 'react-i18next';
import { AnimatePresence, m as motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { HandRaisedIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useDismissNudges, useIncomingNudges } from '../../hooks/useSocial.js';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { Avatar, ROW } from './friendsParts.js';

/**
 * A friend nudged me: a dialog I can dismiss with the cross. It says who, how
 * many times they have nudged me, a kind predefined line and the short note they
 * added. The web app only shows this; the app will deliver it its own way.
 */
export default function NudgeDialog() {
  const { t } = useTranslation();
  const { data } = useIncomingNudges();
  const dismiss = useDismissNudges();
  const nudges = data ?? [];
  const open = nudges.length > 0;
  const close = () => {
    if (!dismiss.isPending) dismiss.mutate(nudges.map((n) => n.fromUid));
  };
  useEscapeKey(close, open);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[75] bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={close}
          data-testid="nudge-dialog"
        >
          <motion.div
            initial={{ scale: 0.94, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 8 }}
            transition={{ type: 'spring', damping: 24 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nudge-dialog-title"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-card bg-brand-deep border border-brand-border shadow-elev-3 p-5 space-y-4"
          >
            <button
              type="button"
              onClick={close}
              aria-label={t('friends.nudge.dismiss', 'Dismiss')}
              className="absolute top-2.5 right-2.5 w-11 h-11 grid place-items-center rounded-full text-white/70 hover:text-white hover:bg-brand-surface transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <div className="text-center pt-2">
              <span className="w-12 h-12 mx-auto rounded-full grid place-items-center bg-brand-emerald/10 border border-brand-emerald/30">
                <HandRaisedIcon className="w-6 h-6 text-brand-emerald" aria-hidden="true" />
              </span>
              <h2
                id="nudge-dialog-title"
                className="font-display text-lg font-bold text-white mt-3 px-8"
              >
                {nudges.length === 1
                  ? t('friends.nudge.dialogTitleOne', 'A friend is thinking of you')
                  : t('friends.nudge.dialogTitle', 'Your circle is thinking of you')}
              </h2>
              <p className="text-white/80 text-sm mt-2 leading-relaxed">
                {t(
                  'friends.nudge.motivation',
                  'Your friend is thinking of you. Come back to the journey: even one small act today counts, and your circle is glad to have you.'
                )}
              </p>
            </div>
            <div className="space-y-2">
              {nudges.map((n) => (
                <div key={n.fromUid} className={ROW}>
                  <div className="flex items-center gap-3">
                    <Avatar name={n.displayName} photoUrl={n.photoUrl} avatarId={n.avatarId} />
                    <p className="flex-1 min-w-0 text-white font-bold text-sm">
                      {n.count > 1
                        ? t('friends.nudge.times', '{{name}} has nudged you {{n}} times', {
                            name: n.displayName,
                            n: formatLocaleNumber(n.count),
                          })
                        : t('friends.nudge.once', '{{name}} nudged you', { name: n.displayName })}
                    </p>
                  </div>
                  {n.message && (
                    <p className="mt-2 text-white/85 text-sm italic border-l-2 border-brand-emerald/50 pl-3 break-words">
                      {n.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
