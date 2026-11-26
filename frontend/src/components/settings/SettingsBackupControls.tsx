import { useTranslation } from 'react-i18next';
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { BTN_SECONDARY } from '../bustanStyles.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useBackupActions } from './useBackupActions.js';

/** Full backup, Excel report and restore, with their notes. */
export function SettingsBackupControls() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    exporting,
    importing,
    exportingXlsx,
    exportPending,
    exportBackup,
    exportExcel,
    importProfile,
  } = useBackupActions();
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        <button
          className={BTN_SECONDARY}
          onClick={() => void exportBackup()}
          disabled={exportPending}
        >
          {exporting ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <ArrowDownTrayIcon className="w-4 h-4" />
          )}
          {t('settings.fullBackup')}
        </button>
        <button
          className={BTN_SECONDARY}
          onClick={() => void exportExcel()}
          disabled={exportPending}
        >
          {exportingXlsx ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <ArrowDownTrayIcon className="w-4 h-4" />
          )}
          {t('settings.exportExcel')}
        </button>
        <label
          className={`${BTN_SECONDARY} cursor-pointer ${importing ? 'pointer-events-none opacity-60' : ''}`}
        >
          {importing ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <ArrowUpTrayIcon className="w-4 h-4" />
          )}
          {t('settings.restoreBackup')}
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void importProfile(e)}
          />
        </label>
      </div>
      <p className="text-white/70 text-[11px] mb-2 leading-relaxed">
        {t('settings.backupNote')}
        {user?.gender === 'female' ? ` ${t('settings.backupNoteCycle')}` : ''}
      </p>
      <p className="text-white/70 text-[11px] mb-4 leading-relaxed">{t('settings.excelNote')}</p>
    </>
  );
}
