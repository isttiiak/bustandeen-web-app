import { useTranslation } from 'react-i18next';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { formatLocaleNumber } from '../../utils/localeDate.js';

export interface FastingProgressChipsProps {
  kaffarahActive: boolean;
  qadaOwed: number;
  qadaRemaining: number;
  setQadaInput: React.Dispatch<React.SetStateAction<string>>;
  setShowGuestDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowManage: React.Dispatch<React.SetStateAction<boolean>>;
  summary: (import('../../hooks/useFasting.js').FastingSummary & { ok: boolean }) | undefined;
  user: import('../../types/api.js').AuthUser | null;
}

export default function FastingProgressChips({
  kaffarahActive,
  qadaOwed,
  qadaRemaining,
  setQadaInput,
  setShowGuestDialog,
  setShowManage,
  summary,
  user,
}: FastingProgressChipsProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-stretch gap-2">
        <div className="flex-1 grid grid-cols-3 gap-2">
          {[
            {
              label: t('fasting.thisMonth', 'This month'),
              value: summary?.stats.thisMonth ?? 0,
              color: '#7a9e6e',
            },
            ...(qadaOwed > 0
              ? [
                  {
                    label: t('fasting.qadaLeft', 'Qada left'),
                    value: qadaRemaining,
                    color: '#c9a96e',
                  },
                ]
              : [
                  {
                    label: t('fasting.last30d', 'Last 30d'),
                    value: summary?.stats.last30 ?? 0,
                    color: '#5a9e8e',
                  },
                ]),
            ...(kaffarahActive
              ? [
                  {
                    label: t('fasting.kaffarahRun', 'Kaffarah run'),
                    value: summary?.kaffarah.currentRun ?? 0,
                    color: '#c4825a',
                  },
                ]
              : [
                  {
                    label: t('fasting.allTime', 'All time'),
                    value: summary?.stats.total ?? 0,
                    color: '#5a9e8e',
                  },
                ]),
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-brand-emerald/10 bg-white/[0.04] px-2 py-2 text-center"
            >
              <p
                className="font-black text-lg tabular-nums leading-none"
                style={{ color: s.color }}
              >
                {formatLocaleNumber(s.value)}
              </p>
              <p className="text-white/30 text-[9px] uppercase tracking-wide mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            if (!user) {
              setShowGuestDialog(true);
              return;
            }
            // Seed the editor once on open — not on every refetch, which
            // would wipe the input while the user is typing
            setQadaInput(String(qadaOwed));
            setShowManage(true);
          }}
          aria-label={t('fasting.manageAriaLabel', 'Manage make-up fasts and vows')}
          title={t('fasting.manageTitle', 'Make-up fasts, kaffarah & vows')}
          className="rounded-xl border border-brand-emerald/10 bg-white/[0.04] hover:bg-white/10 px-3 flex flex-col items-center justify-center gap-1 text-white/40 hover:text-white transition-all"
        >
          <Cog6ToothIcon className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase">{t('fasting.manage', 'Manage')}</span>
        </button>
      </div>
    </>
  );
}
