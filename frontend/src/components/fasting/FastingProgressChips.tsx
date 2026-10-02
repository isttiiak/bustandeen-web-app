import { useTranslation } from 'react-i18next';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import { CARD } from '../bustanStyles.js';

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
              tone: 'text-data-good',
            },
            ...(qadaOwed > 0
              ? [
                  {
                    label: t('fasting.qadaLeft', 'Qada left'),
                    value: qadaRemaining,
                    tone: 'text-brand-gold',
                  },
                ]
              : [
                  {
                    label: t('fasting.last30d', 'Last 30d'),
                    value: summary?.stats.last30 ?? 0,
                    tone: 'text-brand-info',
                  },
                ]),
            ...(kaffarahActive
              ? [
                  {
                    label: t('fasting.kaffarahRun', 'Kaffarah run'),
                    value: summary?.kaffarah.currentRun ?? 0,
                    tone: 'text-brand-warm',
                  },
                ]
              : [
                  {
                    label: t('fasting.allTime', 'All time'),
                    value: summary?.stats.total ?? 0,
                    tone: 'text-brand-info',
                  },
                ]),
          ].map((s) => (
            <div key={s.label} className={`${CARD} px-2 py-3 text-center`}>
              <p className={`font-display font-bold text-2xl tabular-nums leading-none ${s.tone}`}>
                {formatLocaleNumber(s.value)}
              </p>
              <p className="text-white/70 text-[10px] uppercase tracking-wide font-bold mt-1.5">
                {s.label}
              </p>
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
          className={`${CARD} px-3 flex flex-col items-center justify-center gap-1 text-white/70 hover:text-white hover:border-brand-emerald/40 hover:shadow-hover transition-[border-color,box-shadow,color]`}
        >
          <Cog6ToothIcon className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase">{t('fasting.manage', 'Manage')}</span>
        </button>
      </div>
    </>
  );
}
