import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useDangerAction } from '../../hooks/useDangerZone.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { DANGER_GROUPS, type DangerRow } from './dangerGroups.js';

/** The danger zone: the rows to show, the confirm step, and the executor. */
export function useDangerRows() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  // Rayhanah is a sisters-only feature — its delete group must not appear for
  // anyone else (a brother seeing a 🌸 cycle-data row was a bug).
  const dangerGroups = DANGER_GROUPS.filter((g) => g.id !== 'cycle' || user?.gender === 'female');
  /** The visible word on a row's button; its accessible name starts with it. */
  const dangerActionText = (row: DangerRow): string =>
    row.method === 'delete'
      ? t('common.delete')
      : row.id === 'quran-khatam'
        ? t('common.reset')
        : t('common.remove');
  const dangerAction = useDangerAction();
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // ── Danger-zone executor (full + partial actions, double confirm) ──────────
  const runDanger = async (row: DangerRow) => {
    setDeleting(row.id);
    try {
      await dangerAction.mutateAsync(row);
      await queryClient.invalidateQueries();
      toast.success(
        t('settings.toast.dangerDone', { label: row.label, defaultValue: '{{label}}: done.' })
      );
    } catch {
      toast.error(
        t('settings.toast.dangerFail', {
          label: row.label,
          defaultValue: 'Could not complete "{{label}}". Please try again.',
        })
      );
    } finally {
      setDeleting(null);
      setConfirmTarget(null);
    }
  };

  return { dangerGroups, dangerActionText, confirmTarget, setConfirmTarget, deleting, runDanger };
}
