import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';
import { zikrDisplayName } from '../../utils/zikrLibrary.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import type { QuickZikr } from '../../utils/zikrQuick.js';

/**
 * Home's quick dhikr chips ask before they do anything, so a stray tap never
 * adds counts. Two ways forward: open the counter with the number as its
 * target, or add the number to today's list at once (Istiak, 2026-11-28).
 * Portaled above everything, like ConfirmDialog.
 */
export default function ZikrQuickConfirm({
  chip,
  onOpenCounter,
  onAdd,
  onCancel,
}: {
  /** The tapped chip, or null while the dialog is closed. */
  chip: QuickZikr | null;
  onOpenCounter: (z: QuickZikr) => void;
  onAdd: (z: QuickZikr) => void;
  onCancel: () => void;
}) {
  const { t, i18n } = useTranslation();
  useEscapeKey(onCancel, chip !== null);
  const name = chip ? zikrDisplayName(chip.name, i18n.language) : '';
  const n = chip ? formatLocaleNumber(chip.count) : '';
  return createPortal(
    <AnimatePresence>
      {chip && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={onCancel}
          data-testid="zikr-quick-confirm"
        >
          <motion.div
            initial={{ scale: 0.94, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 8 }}
            transition={{ type: 'spring', damping: 24 }}
            className="w-full max-w-xs rounded-card bg-brand-deep border border-brand-border shadow-elev-3 p-5 text-center"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="zikr-quick-confirm-title"
          >
            <h3 id="zikr-quick-confirm-title" className="text-white font-black text-base">
              {t('home.quick.confirmTitle', '{{name}}, {{n}} times', { name, n })}
            </h3>
            <p className="text-white/75 text-xs mt-1.5 leading-relaxed">
              {t('home.quick.confirmBody', 'What would you like to do with this number?')}
            </p>
            <div className="flex flex-col gap-2 mt-4">
              <button
                type="button"
                className={BTN_PRIMARY}
                data-testid="zikr-quick-open"
                onClick={() => onOpenCounter(chip)}
              >
                {t('home.quick.confirmOpen', 'Open the counter with {{n}} as the target', { n })}
              </button>
              <button
                type="button"
                className={BTN_SECONDARY}
                data-testid="zikr-quick-add"
                onClick={() => onAdd(chip)}
              >
                {t('home.quick.confirmAdd', 'Add {{n}} to my list', { n })}
              </button>
              <button
                type="button"
                className="min-h-[44px] rounded-control text-sm font-semibold text-white/70 hover:text-white"
                onClick={onCancel}
              >
                {t('common.cancel')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
