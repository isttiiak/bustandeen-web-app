import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@heroicons/react/24/outline';
import { CARD } from '../../bustanStyles.js';
import { useDonorAnalytics } from '../../../hooks/useAdminSadaqah.js';
import { DonorEmailAction } from './DonorEmailAction.js';
import { QuarterlyPublisher } from './QuarterlyPublisher.js';

export function AnalyticsTab({ isServant }: { isServant: boolean }) {
  const { t } = useTranslation();
  const { data: donorAnalytics } = useDonorAnalytics(isServant);

  if (!isServant) {
    return (
      <p className="text-white/70 text-sm">
        {t('adminSadaqah.analyticsServantOnly', 'Servant-only: financial analytics and reporting.')}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <QuarterlyPublisher />

      {donorAnalytics && (
        <section className="space-y-3">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/70">
            {t('adminSadaqah.donorAnalyticsTitle', 'Donor analytics')}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className={`${CARD} p-4 text-center`}>
              <p className="text-white text-2xl font-bold">{donorAnalytics.repeatDonorCount}</p>
              <p className="text-white/70 text-xs mt-1">
                {t('adminSadaqah.repeatDonors', 'Repeat donors')}
              </p>
            </div>
            <div className={`${CARD} p-4 text-center`}>
              <p className="text-white text-2xl font-bold">{donorAnalytics.oneOffDonorCount}</p>
              <p className="text-white/70 text-xs mt-1">
                {t('adminSadaqah.oneOffDonors', 'One-off donors')}
              </p>
            </div>
          </div>

          {donorAnalytics.monthlyTrend.length > 0 && (
            <div className={`${CARD} p-4`}>
              <p className="text-white/70 text-xs font-bold mb-2">
                {t('adminSadaqah.monthlyTrend', 'Month-over-month (verified)')}
              </p>
              <div className="space-y-1.5">
                {donorAnalytics.monthlyTrend.map((m) => {
                  const max = Math.max(...donorAnalytics.monthlyTrend.map((x) => x.amount), 1);
                  return (
                    <div key={m.month} className="flex items-center gap-2 text-xs">
                      <span className="text-white/70 w-16 shrink-0">{m.month}</span>
                      <div className="flex-1 h-2 rounded-full bg-brand-surface/50 overflow-hidden">
                        <div
                          className="h-full bg-brand-emerald rounded-full"
                          style={{ width: `${(m.amount / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-white/70 font-bold w-20 text-right shrink-0">
                        {m.amount.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={`${CARD} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/70 text-xs border-b border-brand-border">
                    <th className="text-left px-3 py-2">{t('adminSadaqah.colEmail', 'Email')}</th>
                    <th className="text-right px-3 py-2">
                      {t('adminSadaqah.colDonations', 'Donations')}
                    </th>
                    <th className="text-right px-3 py-2">{t('adminSadaqah.colTotal', 'Total')}</th>
                    <th className="text-left px-3 py-2">
                      {t('adminSadaqah.colAppUser', 'App user?')}
                    </th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {donorAnalytics.topDonors.map((d) => (
                    <tr key={d.email} className="border-b border-brand-border/60 last:border-0">
                      <td className="px-3 py-2 text-white/80 truncate max-w-[200px]">{d.email}</td>
                      <td className="px-3 py-2 text-white text-right font-bold">
                        {d.donationCount}
                      </td>
                      <td className="px-3 py-2 text-white text-right font-bold">
                        {d.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        {d.isAppUser ? (
                          <CheckIcon className="w-4 h-4 text-brand-emerald" aria-label="App user" />
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <DonorEmailAction email={d.email} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
