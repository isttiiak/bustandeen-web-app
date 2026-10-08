import { m as motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

/**
 * Small app-wide confirmation dialog — the SECOND "are you sure?" for every
 * destructive action (Istiak's rule: deleting any data always asks twice —
 * first the inline tap, then this dialog).
 *
 * Portaled to <body> at z-[80] so it ALWAYS sits above the modal/drawer that
 * opened it (those are portaled at z-[70]). Rendering it inline instead left it
 * trapped inside the page's transform stacking context — the confirm box then
 * appeared BEHIND the Manage-zikr form.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  icon,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  /** SVG icon over the title; a trash can by default. */
  icon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.94, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 8 }}
            transition={{ type: 'spring', damping: 24 }}
            className="w-full max-w-xs rounded-card bg-brand-deep border border-red-400/25 shadow-elev-3 p-5 text-center"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="w-11 h-11 mx-auto mb-2 rounded-full grid place-items-center bg-red-500/10 text-red-400">
              {icon ?? <TrashIcon className="w-6 h-6" />}
            </div>
            <h3 className="text-white font-black text-base">{title}</h3>
            <p className="text-white/75 text-xs mt-1.5 leading-relaxed">{message}</p>
            <div className="flex gap-2 mt-4">
              <button
                className="flex-1 btn btn-sm rounded-xl bg-white/5 border-brand-emerald/10 text-white/70"
                onClick={onCancel}
              >
                {t('common.cancel')}
              </button>
              <button
                className="flex-1 btn btn-sm rounded-xl border-0 text-on-color font-bold bg-red-500/80 hover:bg-red-500"
                onClick={onConfirm}
              >
                {confirmLabel ?? t('confirmDialog.yesDelete')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
