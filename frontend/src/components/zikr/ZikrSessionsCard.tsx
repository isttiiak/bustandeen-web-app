import { useTranslation } from 'react-i18next';
import { ListBulletIcon } from '@heroicons/react/24/outline';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import type { useZikrSessions } from '../../hooks/useAnalytics.js';
import { zikrDisplayName } from '../../utils/zikrLibrary.js';
import { formatLocaleNumber, formatLocaleTime } from '../../utils/localeDate.js';
import { getTrackingDay } from '../../utils/trackingDay.js';

/** Session history for one chosen day. */
export function ZikrSessionsCard({
  sessionsDate,
  setSessionsDate,
  sessionsData,
  sessionsLoading,
}: {
  sessionsDate: string;
  setSessionsDate: (date: string) => void;
  sessionsData: ReturnType<typeof useZikrSessions>['data'];
  sessionsLoading: boolean;
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className={`${CARD} p-4 sm:p-5 space-y-3`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={SECTION_TITLE}>
          <ListBulletIcon className="w-5 h-5 text-brand-info" />
          {t('zikrAnalytics.sessions.title', 'Session history')}
        </h2>
        <input
          type="date"
          value={sessionsDate}
          max={getTrackingDay()}
          onChange={(e) => setSessionsDate(e.target.value)}
          aria-label={t('zikrAnalytics.sessions.dateLabel', 'Choose a day')}
          className="input input-xs h-11 input-bordered rounded-control bg-brand-surface border-brand-border text-white/80 text-xs"
        />
      </div>
      {sessionsLoading ? (
        <p className="text-white/70 text-xs text-center py-4">{t('common.loading', 'Loading…')}</p>
      ) : sessionsData && sessionsData.length > 0 ? (
        <div className="space-y-2">
          {sessionsData.map((s, i) => {
            // Manual entries carry an explicit flag. Older ones (logged
            // before the flag existed) were anchored to the tracking
            // day's midday, so still detect those by both start and end
            // falling within 1 minute of noon.
            const startMs = new Date(s.start).getTime();
            const endMs = new Date(s.end).getTime();
            const startHour = new Date(s.start).getHours();
            const startMin = new Date(s.start).getMinutes();
            const isManualEntry =
              s.manual === true || (endMs - startMs < 60_000 && startHour === 12 && startMin === 0);
            return (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-control bg-brand-surface/50 border border-brand-border p-3"
              >
                <div className="min-w-0">
                  <p className="text-white/80 text-sm font-semibold tabular-nums">
                    {isManualEntry ? (
                      <span className="text-white/70 text-xs font-medium italic">
                        {t('zikrAnalytics.sessions.manualLog', 'Manual log')}
                      </span>
                    ) : (
                      <>
                        {formatLocaleTime(new Date(s.start), {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {' – '}
                        {formatLocaleTime(new Date(s.end), {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(s.perType).map(([type, count]) => (
                      <span
                        key={type}
                        className="px-1.5 py-0.5 rounded-md bg-shade/10 border border-brand-border text-[10px] text-white/70"
                      >
                        {zikrDisplayName(type, i18n.language)} ×{formatLocaleNumber(count)}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-brand-emerald font-black text-lg shrink-0">
                  {formatLocaleNumber(s.total)}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-white/70 text-xs text-center py-4">
          {t('zikrAnalytics.sessions.empty', 'No sessions logged for this day')}
        </p>
      )}
      <p className="text-white/70 text-[10px] leading-relaxed">
        {t(
          'zikrAnalytics.sessions.note',
          "Sessions come from real taps on the counter. Counts you add with Log missed counts show as a manual log with no clock time, and the tasbih the salat tracker adds for you isn't listed here."
        )}
      </p>
    </div>
  );
}
