import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import { syncPrefsNow } from '../utils/prefsSync.js';

/** The version-3 backup file (backend/src/services/backup.service.ts). */
export type BackupFile = Record<string, unknown> & { app?: string; version?: number };

export interface ImportCounts {
  zikrDays: number;
  salatDays: number;
  fastingDays: number;
  quranDays: number;
  cycleEntries: number;
  adhkarDays?: number;
  hifzItems?: number;
  kazaUnits?: number;
  settings?: number;
}

/** Fetch the backup file. Used by both "Backup" and "Excel report". */
export function useExportBackup() {
  return useMutation({
    mutationFn: async (): Promise<BackupFile> => {
      const { data } = await api.get<{ ok: boolean; backup: BackupFile }>('/api/user/export');
      return data.backup;
    },
  });
}

/** gzip the file when the browser can, so a large history stays under the
 * host's 4.5 MB request cap (the server inflates Content-Encoding: gzip). */
async function encodeBody(json: string): Promise<{ body: BodyInit; gzip: boolean }> {
  if (typeof CompressionStream === 'undefined') return { body: json, gzip: false };
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  return { body: await new Response(stream).blob(), gzip: true };
}

export function useImportBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: BackupFile): Promise<ImportCounts> => {
      const { body, gzip } = await encodeBody(JSON.stringify(file));
      const { data } = await api.post<{ ok: boolean; counts: ImportCounts }>(
        '/api/user/import',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
          },
        }
      );
      return data.counts;
    },
    onSuccess: async () => {
      // Restored settings are stamped new on the server: pull them onto this
      // device now instead of waiting for the next focus.
      await syncPrefsNow();
      await queryClient.invalidateQueries();
    },
  });
}

/** Save a Blob as a download. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
