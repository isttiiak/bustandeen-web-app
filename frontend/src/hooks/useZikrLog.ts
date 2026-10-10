import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OfflineQueuedError, sendOrQueue } from '../utils/syncOutbox.js';
import { useZikrStore } from '../store/useZikrStore.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { buildZikrLogBody, logTargetDay, type LogDaysBack } from '../utils/zikrLog.js';

export interface LogZikrVars {
  zikrType: string;
  amount: number;
  daysBack: LogDaysBack;
  /** When the form was opened: the day choices were computed from it. */
  openedAt: Date;
}

/**
 * "Log counts" (U4): adds counts typed in afterwards to today or one of the
 * two previous tracking days. Goes through the offline outbox, so the write
 * carries an X-Client-Op-Id (a retry after a lost response is applied once by
 * the server) and is queued, not lost, when there is no connection.
 * Resolves to { queued: true } when it was stored for later.
 */
export function useLogZikrCounts() {
  const qc = useQueryClient();
  return useMutation({
    // The outbox decides what offline means; React Query must not pause it.
    networkMode: 'always',
    mutationFn: async (vars: LogZikrVars): Promise<{ queued: boolean }> => {
      const body = buildZikrLogBody(vars.zikrType, vars.amount, vars.daysBack, vars.openedAt);
      let queued = false;
      try {
        await sendOrQueue({
          tracker: 'zikr',
          method: 'post',
          url: '/api/zikr/increment/batch',
          body: body as unknown as Record<string, unknown>,
        });
      } catch (e) {
        if (!(e instanceof OfflineQueuedError)) throw e;
        queued = true;
      }
      // The live counter only holds the CURRENT tracking day. A queued log
      // for today is layered back on by unsyncedCounts() after a re-sync.
      if (logTargetDay(vars.daysBack, vars.openedAt) === getTrackingDay()) {
        useZikrStore.getState().addConfirmedCounts(vars.zikrType, vars.amount);
      }
      return { queued };
    },
    onSuccess: ({ queued }) => {
      if (queued) return; // nothing changed on the server yet
      void qc.invalidateQueries({ queryKey: ['analytics'] });
      void qc.invalidateQueries({ queryKey: ['zikr'] });
      void qc.invalidateQueries({ queryKey: ['social'] });
    },
  });
}
