import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CARD } from '../../bustanStyles.js';
import { ADMIN_INPUT_SM, BTN_SMALL } from '../adminParts.js';
import DonationStatusBadge from '../../DonationStatusBadge.js';
import { useSadaqahStats } from '../../../hooks/useSadaqah.js';
import {
  useAllDonations,
  useDeleteDonation,
  useDownloadReceipt,
  usePendingDonations,
  useReopenDonation,
} from '../../../hooks/useAdminSadaqah.js';
import type { DonationStatus } from '../../../types/api.js';
import { PendingCard } from './PendingCard.js';
import { donorLabel } from './adminSadaqahUtils.js';

function isThisMonth(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function SubmissionsTab({ isServant }: { isServant: boolean }) {
  const { t } = useTranslation();
  const { data: stats } = useSadaqahStats();
  const { data: pending, isLoading: pendingLoading } = usePendingDonations();
  const { data: verifiedRecent } = useAllDonations('verified', 1, 100);

  const [filterStatus, setFilterStatus] = useState<DonationStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const { data: allResult, isLoading: allLoading } = useAllDonations(
    filterStatus === 'all' ? undefined : filterStatus,
    page
  );
  const deleteDonation = useDeleteDonation();
  const reopenDonation = useReopenDonation();
  const [confirmReopenId, setConfirmReopenId] = useState<string | null>(null);
  const clickReopen = (id: string) => {
    if (confirmReopenId !== id) {
      setConfirmReopenId(id);
      setTimeout(() => setConfirmReopenId((cur) => (cur === id ? null : cur)), 6000);
      return;
    }
    setConfirmReopenId(null);
    reopenDonation.mutate(id);
  };
  const downloadReceipt = useDownloadReceipt();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const clickDelete = (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId((cur) => (cur === id ? null : cur)), 6000);
      return;
    }
    setConfirmDeleteId(null);
    deleteDonation.mutate(id);
  };

  const verifiedThisMonth =
    verifiedRecent?.donations.filter((d) => isThisMonth(d.verifiedAt)) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className={`${CARD} p-4 text-center`}>
          <p className="text-white text-2xl font-bold">{pending?.length ?? '-'}</p>
          <p className="text-white/70 text-xs mt-1">{t('adminSadaqah.statPending', 'Pending')}</p>
        </div>
        <div className={`${CARD} p-4 text-center`}>
          <p className="text-white text-2xl font-bold">{verifiedThisMonth.length}</p>
          <p className="text-white/70 text-xs mt-1">
            {t('adminSadaqah.statThisMonth', 'Verified this month')}
          </p>
        </div>
        <div className={`${CARD} p-4 text-center`}>
          <p className="text-white text-2xl font-bold">
            {stats?.totalVerifiedAmount.toLocaleString() ?? '-'}
          </p>
          <p className="text-white/70 text-xs mt-1">
            {t('adminSadaqah.statLifetime', 'Lifetime BDT')}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-white font-bold text-sm uppercase tracking-widest text-brand-gold">
          {t('adminSadaqah.pendingQueue', 'Pending queue')}
        </h2>
        {pendingLoading && (
          <p className="text-white/70 text-sm">{t('common.loading', 'Loading…')}</p>
        )}
        {!pendingLoading && pending?.length === 0 && (
          <p className="text-white/70 text-sm">
            {t('adminSadaqah.noPending', 'Nothing waiting. All caught up.')}
          </p>
        )}
        <div className="grid lg:grid-cols-2 gap-3">
          {pending?.map((d) => (
            <PendingCard key={d._id} donation={d} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/70">
            {t('adminSadaqah.allSubmissions', 'All submissions')}
          </h2>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as DonationStatus | 'all');
              setPage(1);
            }}
            className={ADMIN_INPUT_SM}
          >
            <option value="all">{t('adminSadaqah.filterAll', 'All')}</option>
            <option value="pending">{t('adminSadaqah.statusPending', 'Pending')}</option>
            <option value="verified">{t('adminSadaqah.statusVerified', 'Verified')}</option>
            <option value="rejected">{t('adminSadaqah.statusRejected', 'Rejected')}</option>
          </select>
        </div>

        <div className={`${CARD} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/70 text-xs border-b border-brand-border">
                  <th className="text-left px-3 py-2">{t('adminSadaqah.colDate', 'Date')}</th>
                  <th className="text-left px-3 py-2">{t('adminSadaqah.colDonor', 'Donor')}</th>
                  <th className="text-right px-3 py-2">{t('adminSadaqah.colAmount', 'Amount')}</th>
                  <th className="text-left px-3 py-2">{t('adminSadaqah.colTrxId', 'Trx ID')}</th>
                  <th className="text-left px-3 py-2">{t('adminSadaqah.colStatus', 'Status')}</th>
                  <th className="text-left px-3 py-2">
                    {t('adminSadaqah.colHandledBy', 'Handled by')}
                  </th>
                  {isServant && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {allLoading && (
                  <tr>
                    <td colSpan={isServant ? 7 : 6} className="text-center text-white/70 py-4">
                      {t('common.loading', 'Loading…')}
                    </td>
                  </tr>
                )}
                {allResult?.donations.map((d) => (
                  <tr key={d._id} className="border-b border-brand-border/60 last:border-0">
                    <td className="px-3 py-2 text-white/70 whitespace-nowrap">
                      {d.createdAt.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2 text-white/80 truncate max-w-[160px]">
                      {donorLabel(d)}
                    </td>
                    <td className="px-3 py-2 text-white text-right font-bold whitespace-nowrap">
                      {d.amount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-white/70 font-mono text-xs">{d.transactionId}</td>
                    <td className="px-3 py-2">
                      <DonationStatusBadge status={d.status} />
                    </td>
                    <td className="px-3 py-2 text-white/70 text-xs max-w-[220px]">
                      <span className="truncate">{d.verifiedBy ?? '-'}</span>
                      {d.status === 'verified' && (
                        <button
                          onClick={() => downloadReceipt.mutate(d._id)}
                          disabled={downloadReceipt.isPending}
                          title={t(
                            'adminSadaqah.downloadReceipt',
                            'Download the signed receipt PDF'
                          )}
                          className="ml-2 text-brand-emerald hover:underline disabled:opacity-40"
                        >
                          {t('adminSadaqah.receiptPdf', 'Receipt PDF')}
                        </button>
                      )}
                    </td>
                    {isServant && (
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {d.status !== 'pending' && (
                          <button
                            onClick={() => clickReopen(d._id)}
                            disabled={reopenDonation.isPending}
                            title={t(
                              'adminSadaqah.reopenHint',
                              'Back to pending, for a decision taken by mistake. No email is sent.'
                            )}
                            className={`mr-3 ${
                              confirmReopenId === d._id
                                ? 'text-brand-gold text-xs font-bold'
                                : 'text-white/70 hover:text-white text-xs'
                            }`}
                          >
                            {confirmReopenId === d._id
                              ? t('adminSadaqah.confirmReopen', 'Reopen?')
                              : t('adminSadaqah.reopen', 'Reopen')}
                          </button>
                        )}
                        <button
                          onClick={() => clickDelete(d._id)}
                          title={t('adminSadaqah.deleteEntry', 'Permanently delete this entry')}
                          className={
                            confirmDeleteId === d._id
                              ? 'text-red-400 text-xs font-bold'
                              : 'text-white/70 hover:text-red-400 text-xs'
                          }
                        >
                          {confirmDeleteId === d._id
                            ? t('adminSadaqah.confirmDelete', 'Confirm?')
                            : '✕'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {allResult && allResult.total > allResult.limit && (
          <div className="flex items-center justify-center gap-3 text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={BTN_SMALL}
            >
              {t('adminSadaqah.prevPage', 'Prev')}
            </button>
            <span className="text-white/70">
              {t('adminSadaqah.pageOf', 'Page {{page}} of {{total}}', {
                page,
                total: Math.ceil(allResult.total / allResult.limit),
              })}
            </span>
            <button
              disabled={page >= Math.ceil(allResult.total / allResult.limit)}
              onClick={() => setPage((p) => p + 1)}
              className={BTN_SMALL}
            >
              {t('adminSadaqah.nextPage', 'Next')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
