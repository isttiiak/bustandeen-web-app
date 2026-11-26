import { useTranslation } from 'react-i18next';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { BTN_DANGER, BTN_DANGER_QUIET, BTN_QUIET } from './settingsParts.js';
import { useDangerRows } from './useDangerRows.js';

/** Everything that erases data, grouped per feature, each row behind a confirm. */
export function SettingsDangerZone() {
  const { t } = useTranslation();
  const { dangerGroups, dangerActionText, confirmTarget, setConfirmTarget, deleting, runDanger } =
    useDangerRows();
  return (
    <>
      {/* separator: everything below is destructive (Istiak's spec) */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 border-t border-red-400/30" />
        <span className="inline-flex items-center gap-1.5 text-red-400 text-[11px] uppercase tracking-widest font-bold">
          <ExclamationTriangleIcon className="w-4 h-4" />
          {t('settings.dangerZone')}
        </span>
        <div className="flex-1 border-t border-red-400/30" />
      </div>
      <div className="rounded-card bg-red-500/[0.06] border border-red-400/30 p-3 space-y-3">
        <p className="text-red-400 text-[11px] font-semibold">{t('settings.dangerNote')}</p>
        {dangerGroups.map((g) => (
          <div
            key={g.id}
            className="rounded-control border border-brand-border bg-brand-deep shadow-elev-1 p-3 space-y-1.5"
          >
            <p className="flex items-center gap-2 text-white text-xs font-bold">
              <g.Icon className={`w-4 h-4 ${g.tone}`} />
              {g.title}
            </p>
            {g.rows.map((row) => (
              <div
                key={row.id}
                className={`flex items-center gap-3 py-1.5 ${row.sub ? 'pl-4 border-l-2 border-brand-border ml-1' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${row.sub ? 'text-white/85' : 'text-white font-semibold'}`}
                  >
                    {row.label}
                  </p>
                  <p className="text-white/70 text-[11px]">{row.detail}</p>
                </div>
                {confirmTarget === row.id ? (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => void runDanger(row)}
                      disabled={deleting === row.id}
                      className={BTN_DANGER}
                    >
                      {deleting === row.id ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        t('settings.yesDoIt')
                      )}
                    </button>
                    <button onClick={() => setConfirmTarget(null)} className={BTN_QUIET}>
                      {t('common.cancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmTarget(row.id)}
                    aria-label={`${dangerActionText(row)}: ${row.label}`}
                    className={`${BTN_DANGER_QUIET} shrink-0`}
                  >
                    <TrashIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    {dangerActionText(row)}
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="text-white/70 text-[11px] mt-3">{t('settings.accountNote')}</p>
    </>
  );
}
