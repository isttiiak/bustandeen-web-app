import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { BTN_PRIMARY, BTN_SECONDARY } from '../bustanStyles.js';

/** Set Goal modal: portaled above the navbar, like the other dialogs. */
export function ZikrGoalDialog({
  showGoalModal,
  onClose,
  newGoal,
  setNewGoal,
  newGraceDays,
  setNewGraceDays,
  isUpdating,
  isSaving,
  onSave,
}: {
  showGoalModal: boolean;
  onClose: () => void;
  newGoal: number;
  setNewGoal: (n: number) => void;
  newGraceDays: number;
  setNewGraceDays: (n: number) => void;
  isUpdating: boolean;
  isSaving: boolean;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  if (!showGoalModal) return null;
  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className="bg-brand-deep border border-brand-border shadow-elev-3 rounded-card w-full max-w-md p-6 max-h-[88vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="font-display font-bold text-xl mb-6 text-brand-emerald">
          {t('zikrAnalytics.setDailyGoal')}
        </h3>
        <div className="form-control">
          <label className="label">
            <span className="label-text text-white/70 font-semibold">
              {t('zikrAnalytics.dailyTarget')}
            </span>
          </label>
          <input
            type="number"
            min="1"
            value={newGoal}
            onChange={(e) => setNewGoal(parseInt(e.target.value) || 0)}
            className="input input-bordered rounded-control bg-brand-surface/50 border-brand-border text-white focus:border-brand-emerald"
            placeholder={t('zikrAnalytics.enterGoal')}
          />
        </div>
        <div className="form-control mt-4">
          <label className="label">
            <span className="label-text text-white/70 font-semibold">
              {t('zikrAnalytics.graceDays')}
            </span>
          </label>
          <select
            value={newGraceDays}
            onChange={(e) => setNewGraceDays(parseInt(e.target.value, 10))}
            className="select select-bordered rounded-control bg-brand-surface/50 border-brand-border text-white focus:border-brand-emerald"
          >
            <option value={0}>{t('zikrAnalytics.grace0')}</option>
            <option value={1}>{t('zikrAnalytics.grace1')}</option>
            <option value={2}>{t('zikrAnalytics.grace2')}</option>
            <option value={3}>{t('zikrAnalytics.grace3')}</option>
          </select>
          <label className="label">
            <span className="label-text-alt text-white/70">{t('zikrAnalytics.graceDaysNote')}</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <button className={`${BTN_SECONDARY} flex-1`} onClick={onClose} disabled={isUpdating}>
            {t('common.cancel')}
          </button>
          <button
            className={`${BTN_PRIMARY} flex-1`}
            onClick={onSave}
            disabled={isUpdating || !newGoal || newGoal < 1}
          >
            {isSaving ? t('zikrAnalytics.updating') : t('zikrAnalytics.saveGoal')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
