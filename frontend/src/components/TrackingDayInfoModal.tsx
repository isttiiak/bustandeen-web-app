import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { DayStartMode } from '../utils/trackingDay.js';

const MODE_META: Record<DayStartMode, { emoji: string; titleKey: string; bodyKey: string }> = {
  fajr: {
    emoji: '🌅',
    titleKey: 'settings.dayStartFajr',
    bodyKey: 'settings.dayStartFajrInfoBody',
  },
  midnight: {
    emoji: '🕛',
    titleKey: 'settings.dayStartMidnight',
    bodyKey: 'settings.dayStartMidnightInfoBody',
  },
  maghrib: {
    emoji: '🌙',
    titleKey: 'settings.dayStartMaghrib',
    bodyKey: 'settings.dayStartMaghribInfoBody',
  },
};

/**
 * Full explanation for one tracking-day-boundary mode — opened from the 'i'
 * icon on each option card in Settings so the user can pick with actual
 * understanding of what it does, not just a one-line label.
 */
export default function TrackingDayInfoModal({
  mode,
  onClose,
}: {
  mode: DayStartMode | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const meta = mode ? MODE_META[mode] : null;

  return createPortal(
    <AnimatePresence>
      {meta && (
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
              <h3 className="text-white font-black text-lg flex items-center gap-2">
                <span className="text-2xl leading-none">{meta.emoji}</span>
                {t(meta.titleKey)}
              </h3>
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 grid place-items-center rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                aria-label={t('common.close')}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">
              {t(meta.bodyKey)}
            </p>

            <p className="text-white/30 text-xs leading-relaxed mt-4 pt-4 border-t border-brand-border">
              {t('settings.dayStartInfoAppliesTo')}
            </p>

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
