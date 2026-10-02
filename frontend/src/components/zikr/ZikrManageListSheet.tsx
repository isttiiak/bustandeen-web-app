import React from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  PREDEFINED_TYPES,
  findLibraryZikr,
  isCoreZikr,
  zikrDisplayName,
} from '../../utils/zikrLibrary.js';
import { PlusIcon, XMarkIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

export interface ZikrManageListSheetProps {
  setConfirmDelete: React.Dispatch<React.SetStateAction<string | null>>;
  setEditZikr: React.Dispatch<React.SetStateAction<string | null>>;
  setShowAddCustom: React.Dispatch<React.SetStateAction<boolean>>;
  setShowManage: React.Dispatch<React.SetStateAction<boolean>>;
  showManage: boolean;
  types: string[];
}

export default function ZikrManageListSheet({
  setConfirmDelete,
  setEditZikr,
  setShowAddCustom,
  setShowManage,
  showManage,
  types,
}: ZikrManageListSheetProps) {
  const { t, i18n } = useTranslation();
  return (
    <>
      {createPortal(
        <AnimatePresence>
          {showManage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowManage(false);
              }}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
                className="bg-brand-surface rounded-3xl p-6 w-full max-w-md shadow-2xl border border-brand-border max-h-[80vh] flex flex-col"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-bold text-brand-emerald">
                    {t('zikr.myZikrList', 'My zikr list')}
                  </h3>
                  <button
                    onClick={() => setShowManage(false)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-white/40 text-xs mb-4">
                  {t(
                    'zikr.manageNote',
                    'Custom zikr can be edited (✏️) — renaming keeps all your counts. Removing only takes it out of your dropdown; saved counts stay in analytics.'
                  )}
                </p>
                <div className="space-y-1.5 overflow-y-auto pr-1">
                  {types.length === 0 && (
                    <p className="text-white/40 text-sm text-center py-6">
                      {t('zikr.emptyList', 'Your list is empty. Add one with ＋.')}
                    </p>
                  )}
                  {types.map((typ) => {
                    const isCustom =
                      !PREDEFINED_TYPES.some((p) => p.toLowerCase() === typ.toLowerCase()) &&
                      !findLibraryZikr(typ);
                    const locked = isCoreZikr(typ);
                    return (
                      <div
                        key={typ}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-brand-border bg-brand-deep/50"
                      >
                        <span className="flex-1 min-w-0 truncate text-white/80 text-sm font-semibold">
                          {zikrDisplayName(typ, i18n.language)}
                        </span>
                        {isCustom && (
                          <button
                            onClick={() => {
                              setShowManage(false);
                              setEditZikr(typ);
                            }}
                            aria-label={t('zikr.editAriaLabel', 'Edit {{name}}', { name: typ })}
                            className="btn btn-xs btn-ghost text-brand-emerald/70 hover:text-brand-emerald hover:bg-brand-emerald/10 gap-1 shrink-0"
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" /> {t('zikr.editBtn', 'Edit')}
                          </button>
                        )}
                        {locked ? (
                          <span
                            title={t(
                              'zikr.lockedTitle',
                              'Your salat tracker adds counts to this dhikr, so it stays in your list.'
                            )}
                            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-brand-gold/70 bg-brand-gold/10 border border-brand-gold/20"
                          >
                            {t('zikr.alwaysOn', 'Always on')}
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(typ)}
                            aria-label={t('zikr.removeAriaLabel', 'Remove {{name}}', { name: typ })}
                            className="btn btn-xs btn-ghost text-red-400/60 hover:text-red-400 hover:bg-red-500/10 gap-1 shrink-0"
                          >
                            <TrashIcon className="w-3.5 h-3.5" /> {t('zikr.removeBtn', 'Remove')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    setShowManage(false);
                    setShowAddCustom(true);
                  }}
                  className="btn btn-sm mt-4 bg-brand-emerald/15 border border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald/25 gap-1.5"
                >
                  <PlusIcon className="w-4 h-4" /> {t('zikr.addNewZikr', 'Add a new zikr')}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
