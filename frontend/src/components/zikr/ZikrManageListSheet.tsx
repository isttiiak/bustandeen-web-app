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
import { BTN_ROW, BTN_ROW_DANGER, BTN_SECONDARY, DIALOG } from '../bustanStyles.js';

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
                className={`${DIALOG} p-6 w-full max-w-md max-h-[80vh] flex flex-col`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="zikr-manage-title"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 id="zikr-manage-title" className="font-display text-xl font-bold text-white">
                    {t('zikr.myZikrList', 'My zikr list')}
                  </h3>
                  <button
                    onClick={() => setShowManage(false)}
                    aria-label={t('common.close')}
                    className="w-11 h-11 -mr-2 grid place-items-center rounded-control text-white/75 hover:text-white hover:bg-brand-surface"
                  >
                    <XMarkIcon className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
                <p className="text-white/75 text-xs leading-relaxed mb-4">
                  {t(
                    'zikr.manageNote',
                    'Custom zikr can be edited with the pencil. Renaming keeps all your counts. Removing only takes it out of your dropdown; saved counts stay in analytics.'
                  )}
                </p>
                <div className="space-y-1.5 overflow-y-auto pr-1">
                  {types.length === 0 && (
                    <p className="text-white/70 text-sm text-center py-6">
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
                        className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-control border border-brand-border bg-brand-surface/50"
                      >
                        <span className="flex-1 min-w-0 truncate text-white text-sm font-semibold">
                          {zikrDisplayName(typ, i18n.language)}
                        </span>
                        {isCustom && (
                          <button
                            onClick={() => {
                              setShowManage(false);
                              setEditZikr(typ);
                            }}
                            aria-label={t('zikr.editAriaLabel', 'Edit {{name}}', { name: typ })}
                            className={BTN_ROW}
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" aria-hidden="true" />{' '}
                            {t('zikr.editBtn', 'Edit')}
                          </button>
                        )}
                        {locked ? (
                          <span
                            title={t(
                              'zikr.lockedTitle',
                              'Your salat tracker adds counts to this dhikr, so it stays in your list.'
                            )}
                            className="shrink-0 flex items-center gap-1 mr-1.5 px-2 py-1 rounded-control text-[11px] font-semibold text-brand-gold bg-brand-gold/10 border border-brand-gold/20"
                          >
                            {t('zikr.alwaysOn', 'Always on')}
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(typ)}
                            aria-label={t('zikr.removeAriaLabel', 'Remove {{name}}', { name: typ })}
                            className={BTN_ROW_DANGER}
                          >
                            <TrashIcon className="w-3.5 h-3.5" aria-hidden="true" />{' '}
                            {t('zikr.removeBtn', 'Remove')}
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
                  className={`${BTN_SECONDARY} mt-4`}
                >
                  <PlusIcon className="w-4 h-4 text-brand-emerald" aria-hidden="true" />{' '}
                  {t('zikr.addNewZikr', 'Add a new zikr')}
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
