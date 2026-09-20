import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

/**
 * Small "ⓘ" trigger for a chart/section title — opens a ChartInfoModal
 * explaining what the chart shows and how to read it. Purely presentational;
 * the caller owns the open/close state so one modal instance can serve every
 * chart on a page (see SalatAnalytics.tsx).
 */
export function InfoButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="shrink-0 w-4 h-4 grid place-items-center rounded-full text-white/25 hover:text-brand-emerald transition-colors"
    >
      <InformationCircleIcon className="w-4 h-4" />
    </button>
  );
}

/**
 * Generic explanation modal — title + a short body — reused across every
 * chart on the Salat Analytics page so each has its own "how to read this"
 * note without a bespoke modal per chart.
 */
export default function ChartInfoModal({
  title,
  body,
  onClose,
}: {
  title: string | null;
  body?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return createPortal(
    <AnimatePresence>
      {title && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 24 }}
            className="bg-brand-surface rounded-3xl p-6 w-full max-w-md shadow-2xl border border-brand-border max-h-[85vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-white font-black text-base flex items-center gap-2">
                <InformationCircleIcon className="w-5 h-5 text-brand-emerald shrink-0" />
                {title}
              </h3>
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 grid place-items-center rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                aria-label={t('common.close')}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{body}</p>

            <button
              onClick={onClose}
              className="btn btn-sm w-full mt-4 rounded-xl bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald/20"
            >
              {t('common.close')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
