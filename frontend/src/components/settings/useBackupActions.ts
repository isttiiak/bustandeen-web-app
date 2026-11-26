import type React from 'react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  downloadBlob,
  useExportBackup,
  useImportBackup,
  type BackupFile,
} from '../../hooks/useBackup.js';

/** Data export (JSON backup, Excel report) and restore from a backup file. */
export function useBackupActions() {
  const { t } = useTranslation();
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const exportBackupMutation = useExportBackup();
  const importBackupMutation = useImportBackup();
  const exporting = exportBackupMutation.isPending && !exportingXlsx;
  const importing = importBackupMutation.isPending;

  // ── Data export / import (U6) ───────────────────────────────────────────
  // Two exports from ONE server file (backup v3): the restorable .json backup
  // and an Excel report built from it in the browser.
  const today = () => new Date().toISOString().substring(0, 10);
  const exportBackup = async () => {
    try {
      const file = await exportBackupMutation.mutateAsync();
      downloadBlob(
        new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }),
        `bustandeen-backup-${today()}.json`
      );
      toast.success(t('settings.backupDone'));
    } catch {
      toast.error(t('settings.exportFailed'));
    }
  };

  const exportExcel = async () => {
    setExportingXlsx(true);
    try {
      const file = await exportBackupMutation.mutateAsync();
      const [XLSX, { buildExcelSheets }] = await Promise.all([
        import('xlsx'),
        import('../../utils/backupExcel.js'),
      ]);
      const wb = XLSX.utils.book_new();
      for (const sheet of buildExcelSheets(file, t)) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet.rows), sheet.name);
      }
      XLSX.writeFile(wb, `bustandeen-report-${today()}.xlsx`);
      toast.success(t('settings.excelDone'));
    } catch {
      toast.error(t('settings.exportFailed'));
    } finally {
      setExportingXlsx(false);
    }
  };

  // ── Restore from a Bustandeen backup .json — merge, imported days win ──────
  const importProfile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    let parsed: BackupFile;
    try {
      parsed = JSON.parse(await file.text()) as BackupFile;
    } catch {
      toast.error(t('settings.notABackup'));
      return;
    }
    // 'ihsan' is the backup data contract (CLAUDE.md, Deferred Migrations).
    if (parsed?.app !== 'ihsan') {
      toast.error(t('settings.notABackup'));
      return;
    }
    try {
      const c = await importBackupMutation.mutateAsync(parsed);
      toast.success(
        t('settings.restoreDone', {
          zikr: c.zikrDays ?? 0,
          salat: c.salatDays ?? 0,
          fasting: c.fastingDays ?? 0,
          quran: c.quranDays ?? 0,
        }),
        { duration: 6000 }
      );
    } catch (err) {
      // The server names the one specific failure worth showing (an
      // unsupported file version); anything else is a generic message.
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(status === 400 ? t('settings.restoreOldVersion') : t('settings.restoreFailed'));
    }
  };

  return {
    exporting,
    importing,
    exportingXlsx,
    exportPending: exportBackupMutation.isPending,
    exportBackup,
    exportExcel,
    importProfile,
  };
}
