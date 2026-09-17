import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import DonationStatusBadge from '../components/DonationStatusBadge.js';
import { useSadaqahStats } from '../hooks/useSadaqah.js';
import { useAdminStore } from '../store/useAdminStore.js';
import {
  usePendingDonations,
  useAllDonations,
  useEmailDraft,
  useVerifyDonation,
  useRejectDonation,
  useDeleteDonation,
  useAdminQuarterlyList,
  useQuarterlyPreview,
  usePublishQuarterly,
  useUnpublishQuarterly,
  useDeleteQuarterly,
  useExpenses,
  useAddExpense,
  useDeleteExpense,
  useDonorAnalytics,
  useDonorEmailDraft,
  useSendDonorEmail,
} from '../hooks/useAdminSadaqah.js';
import type { Donation, DonationStatus } from '../types/api.js';

function donorLabel(d: Donation): string {
  if (d.isAnonymous) return 'Anonymous';
  return d.donorName || '(no name)';
}

function isThisMonth(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/** Current quarter as 'YYYY-Qn' — the default starting point for the
 *  publish flow, since publishing last quarter's final numbers is the most
 *  common action but any quarter string can be typed in. */
function currentQuarter(): string {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
}

function PendingCard({ donation }: { donation: Donation }) {
  const { t } = useTranslation();
  const draft = useEmailDraft();
  const verify = useVerifyDonation();
  const reject = useRejectDonation();
  const [mode, setMode] = useState<'idle' | 'verified' | 'rejected'>('idle');
  const [emailText, setEmailText] = useState('');

  // Verify/Reject never send immediately — both open the same editable,
  // prefilled email textarea first, so nothing goes to a donor without the
  // admin actually seeing (and being able to change) the exact wording.
  const startAction = (type: 'verified' | 'rejected') => {
    setMode(type);
    setEmailText('');
    draft.mutate({ id: donation._id, type }, { onSuccess: (d) => setEmailText(d.body) });
  };
  const cancel = () => {
    setMode('idle');
    setEmailText('');
  };
  const confirm = () => {
    const emailBody = emailText.trim();
    if (!emailBody) return;
    if (mode === 'verified') verify.mutate({ id: donation._id, emailBody });
    if (mode === 'rejected') reject.mutate({ id: donation._id, emailBody });
  };
  const sending = verify.isPending || reject.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-brand-gold/20 bg-white/[0.03] p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm truncate">
            {donorLabel(donation)}
            {donation.onBehalfOf && (
              <span className="text-white/40 font-normal">
                {' '}
                — {t('adminSadaqah.onBehalfOfPrefix', 'on behalf of')} {donation.onBehalfOf}
              </span>
            )}
          </p>
          <p className="text-white/40 text-xs mt-0.5">
            {donation.email} · {donation.phone}
          </p>
        </div>
        <p className="text-brand-gold font-black text-lg shrink-0">
          {donation.amount.toLocaleString()} <span className="text-xs">BDT</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-black/20 px-3 py-2">
          <p className="text-white/30">{t('adminSadaqah.trxId', 'Transaction ID')}</p>
          <p className="text-white font-mono font-bold">{donation.transactionId}</p>
        </div>
        <div className="rounded-xl bg-black/20 px-3 py-2">
          <p className="text-white/30">
            {t('adminSadaqah.method', 'Method')} · {t('adminSadaqah.date', 'Date')}
          </p>
          <p className="text-white font-bold">
            {donation.paymentMethod === 'bkash' ? 'bKash' : 'Nagad'} ·{' '}
            {donation.transactionDate.slice(0, 10)}
          </p>
        </div>
      </div>

      {donation.message && (
        <p className="text-white/50 text-xs italic border-l-2 border-white/10 pl-3">
          {donation.message}
        </p>
      )}

      {mode === 'idle' ? (
        <div className="flex gap-2">
          <button
            onClick={() => startAction('verified')}
            className="btn btn-sm flex-1 bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white"
          >
            {t('adminSadaqah.verify', 'Verify')}
          </button>
          <button
            onClick={() => startAction('rejected')}
            className="btn btn-sm flex-1 bg-white/5 hover:bg-red-500/20 border border-red-400/30 text-red-300"
          >
            {t('adminSadaqah.reject', 'Reject')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-white/40 text-xs">
            {t(
              'adminSadaqah.emailEditableNote',
              'Prefilled — edit anything before sending. This is exactly what the donor receives.'
            )}
          </p>
          {draft.isPending ? (
            <p className="text-white/30 text-sm">{t('common.loading', 'Loading…')}</p>
          ) : (
            <textarea
              autoFocus
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              rows={8}
              className={`textarea textarea-bordered w-full text-white text-sm leading-relaxed ${
                mode === 'rejected'
                  ? 'bg-white/5 border-red-400/20'
                  : 'bg-white/5 border-brand-emerald/20'
              }`}
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={confirm}
              disabled={!emailText.trim() || sending || draft.isPending}
              className={`btn btn-sm flex-1 border-0 text-white disabled:opacity-40 ${
                mode === 'rejected'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-brand-emerald hover:bg-brand-emerald-dim'
              }`}
            >
              {sending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : mode === 'rejected' ? (
                t('adminSadaqah.sendReject', 'Send rejection email')
              ) : (
                t('adminSadaqah.sendVerify', 'Send verification email')
              )}
            </button>
            <button
              onClick={cancel}
              className="btn btn-sm bg-white/5 border border-white/10 text-white/60"
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SubmissionsTab({ isServant }: { isServant: boolean }) {
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
        <div className="rounded-2xl border border-brand-gold/20 bg-brand-gold/5 p-4 text-center">
          <p className="text-white text-2xl font-black">{pending?.length ?? '—'}</p>
          <p className="text-white/40 text-xs mt-1">{t('adminSadaqah.statPending', 'Pending')}</p>
        </div>
        <div className="rounded-2xl border border-brand-emerald/20 bg-brand-emerald/5 p-4 text-center">
          <p className="text-white text-2xl font-black">{verifiedThisMonth.length}</p>
          <p className="text-white/40 text-xs mt-1">
            {t('adminSadaqah.statThisMonth', 'Verified this month')}
          </p>
        </div>
        <div className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] p-4 text-center">
          <p className="text-white text-2xl font-black">
            {stats?.totalVerifiedAmount.toLocaleString() ?? '—'}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {t('adminSadaqah.statLifetime', 'Lifetime BDT')}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-white font-bold text-sm uppercase tracking-widest text-brand-gold">
          {t('adminSadaqah.pendingQueue', 'Pending queue')}
        </h2>
        {pendingLoading && (
          <p className="text-white/40 text-sm">{t('common.loading', 'Loading…')}</p>
        )}
        {!pendingLoading && pending?.length === 0 && (
          <p className="text-white/30 text-sm">
            {t('adminSadaqah.noPending', 'Nothing waiting — all caught up.')}
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
          <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
            {t('adminSadaqah.allSubmissions', 'All submissions')}
          </h2>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as DonationStatus | 'all');
              setPage(1);
            }}
            className="select select-sm bg-white/5 border-brand-emerald/15 text-white"
          >
            <option value="all">{t('adminSadaqah.filterAll', 'All')}</option>
            <option value="pending">{t('adminSadaqah.statusPending', 'Pending')}</option>
            <option value="verified">{t('adminSadaqah.statusVerified', 'Verified')}</option>
            <option value="rejected">{t('adminSadaqah.statusRejected', 'Rejected')}</option>
          </select>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs border-b border-white/10">
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
                    <td colSpan={isServant ? 7 : 6} className="text-center text-white/30 py-4">
                      {t('common.loading', 'Loading…')}
                    </td>
                  </tr>
                )}
                {allResult?.donations.map((d) => (
                  <tr key={d._id} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2 text-white/50 whitespace-nowrap">
                      {d.createdAt.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2 text-white/80 truncate max-w-[160px]">
                      {donorLabel(d)}
                    </td>
                    <td className="px-3 py-2 text-white text-right font-bold whitespace-nowrap">
                      {d.amount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-white/50 font-mono text-xs">{d.transactionId}</td>
                    <td className="px-3 py-2">
                      <DonationStatusBadge status={d.status} />
                    </td>
                    <td className="px-3 py-2 text-white/40 text-xs truncate max-w-[180px]">
                      {d.verifiedBy ?? '—'}
                    </td>
                    {isServant && (
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => clickDelete(d._id)}
                          title={t('adminSadaqah.deleteEntry', 'Permanently delete this entry')}
                          className={
                            confirmDeleteId === d._id
                              ? 'text-red-400 text-xs font-bold'
                              : 'text-white/20 hover:text-red-400 text-xs'
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
              className="btn btn-sm bg-white/5 border border-white/10 text-white/60 disabled:opacity-30"
            >
              {t('adminSadaqah.prevPage', 'Prev')}
            </button>
            <span className="text-white/40">
              {t('adminSadaqah.pageOf', 'Page {{page}} of {{total}}', {
                page,
                total: Math.ceil(allResult.total / allResult.limit),
              })}
            </span>
            <button
              disabled={page >= Math.ceil(allResult.total / allResult.limit)}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn-sm bg-white/5 border border-white/10 text-white/60 disabled:opacity-30"
            >
              {t('adminSadaqah.nextPage', 'Next')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function ExpensesTab({ isServant }: { isServant: boolean }) {
  const { t } = useTranslation();
  const { data: expenses } = useExpenses();
  const [expForm, setExpForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    description: '',
  });
  const addExpense = useAddExpense();
  const deleteExpense = useDeleteExpense();
  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  const saveExpense = () => {
    const amount = Number(expForm.amount);
    if (!expForm.date || !expForm.description.trim() || !(amount >= 0)) return;
    addExpense.mutate(
      { date: expForm.date, amount, description: expForm.description.trim() },
      {
        onSuccess: () =>
          setExpForm({ date: new Date().toISOString().slice(0, 10), amount: '', description: '' }),
      }
    );
  };
  const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState<string | null>(null);
  const clickDeleteExpense = (id: string) => {
    if (confirmDeleteExpenseId !== id) {
      setConfirmDeleteExpenseId(id);
      setTimeout(() => setConfirmDeleteExpenseId((cur) => (cur === id ? null : cur)), 6000);
      return;
    }
    setConfirmDeleteExpenseId(null);
    deleteExpense.mutate(id);
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
          {t('adminSadaqah.expensesTitle', 'Project costs')}
        </h2>
        <p className="text-white/25 text-xs mt-0.5">
          {t(
            'adminSadaqah.expensesNote',
            'Internal record only — never shown publicly. This is also what the Analytics tab sums to auto-calculate a quarter\'s "spent" figure.'
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
          {expenses?.length === 0 && (
            <p className="text-white/30 text-sm">
              {t('adminSadaqah.noExpenses', 'No costs recorded yet.')}
            </p>
          )}
          {expenses?.map((e) => (
            <div
              key={e._id}
              className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-white font-bold text-sm">
                  {e.amount.toLocaleString()} <span className="text-xs text-white/40">BDT</span>
                </p>
                <p className="text-white/40 text-xs truncate">
                  {e.date.slice(0, 10)} — {e.description}
                </p>
              </div>
              {isServant && (
                <button
                  onClick={() => clickDeleteExpense(e._id)}
                  className="btn btn-xs bg-white/5 border border-red-400/20 text-red-300 shrink-0"
                >
                  {confirmDeleteExpenseId === e._id
                    ? t('adminSadaqah.confirmDelete', 'Confirm?')
                    : t('adminSadaqah.delete', 'Delete')}
                </button>
              )}
            </div>
          ))}
          {!!expenses?.length && (
            <p className="text-white/50 text-xs font-bold pt-1">
              {t('adminSadaqah.totalCosts', 'Total: {{amount}} BDT', {
                amount: totalExpenses.toLocaleString(),
              })}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-brand-emerald/15 bg-brand-emerald/5 p-4 space-y-2 h-fit">
          <p className="text-white/70 text-xs font-bold">
            {t('adminSadaqah.addExpense', 'Record a cost')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={expForm.date}
              onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))}
              className="input input-sm bg-white/5 border-brand-emerald/15 text-white"
            />
            <input
              type="number"
              value={expForm.amount}
              onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder={t('adminSadaqah.amountBdt', 'Amount (BDT)')}
              className="input input-sm bg-white/5 border-brand-emerald/15 text-white"
            />
          </div>
          <input
            value={expForm.description}
            onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))}
            placeholder={t(
              'adminSadaqah.expenseDescPlaceholder',
              'e.g. Server hosting — September'
            )}
            className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white"
          />
          <button
            onClick={saveExpense}
            disabled={
              !expForm.date ||
              !expForm.description.trim() ||
              !(Number(expForm.amount) >= 0) ||
              addExpense.isPending
            }
            className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white disabled:opacity-40"
          >
            {t('adminSadaqah.save', 'Save')}
          </button>
        </div>
      </div>
    </section>
  );
}

function QuarterlyPublisher() {
  const { t } = useTranslation();
  const { data: quarterlyList } = useAdminQuarterlyList();
  const preview = useQuarterlyPreview();
  const publish = usePublishQuarterly();
  const unpublish = useUnpublishQuarterly();
  const deleteQuarterly = useDeleteQuarterly();

  const [quarter, setQuarter] = useState(currentQuarter());
  const [notes, setNotes] = useState('');
  const [previewData, setPreviewData] = useState<{ received: number; spent: number } | null>(null);

  const runPreview = () => {
    if (!/^\d{4}-Q[1-4]$/.test(quarter)) return;
    setPreviewData(null);
    preview.mutate(quarter, { onSuccess: (d) => setPreviewData(d) });
  };

  const confirmPublish = () => {
    publish.mutate(
      { quarter, notes: notes.trim() || undefined },
      { onSuccess: () => setPreviewData(null) }
    );
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
          {t('adminSadaqah.quarterlyTitle', 'Quarterly public report')}
        </h2>
        <p className="text-white/25 text-xs mt-0.5">
          {t(
            'adminSadaqah.quarterlyNote',
            'Received and spent are always computed fresh from verified donations and the expense ledger — nothing here is typed in by hand. Nothing shows on the public page until you publish.'
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
          <p className="text-white/50 text-xs font-bold uppercase tracking-wide">
            {t('adminSadaqah.publishedQuarters', 'Quarters')}
          </p>
          {quarterlyList?.length === 0 && (
            <p className="text-white/30 text-sm">{t('adminSadaqah.noQuarters', 'None yet.')}</p>
          )}
          {quarterlyList?.map((q) => (
            <div
              key={q.quarter}
              className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-white font-bold text-sm">
                  {q.quarter}{' '}
                  <span
                    className={`text-[10px] font-black uppercase tracking-wide ml-1 ${
                      q.published ? 'text-brand-emerald' : 'text-white/30'
                    }`}
                  >
                    {q.published
                      ? t('adminSadaqah.published', 'published')
                      : t('adminSadaqah.draft', 'draft')}
                  </span>
                </p>
                <p className="text-white/40 text-xs truncate">
                  +{q.received.toLocaleString()} / -{q.spent.toLocaleString()}
                  {q.notes ? ` — ${q.notes}` : ''}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {q.published ? (
                  <button
                    onClick={() => unpublish.mutate(q.quarter)}
                    className="btn btn-xs bg-white/5 border border-white/10 text-white/60"
                  >
                    {t('adminSadaqah.unpublish', 'Unpublish')}
                  </button>
                ) : (
                  <button
                    onClick={() => publish.mutate({ quarter: q.quarter })}
                    className="btn btn-xs bg-brand-emerald/20 border border-brand-emerald/30 text-brand-emerald"
                  >
                    {t('adminSadaqah.publish', 'Publish')}
                  </button>
                )}
                <button
                  onClick={() => deleteQuarterly.mutate(q.quarter)}
                  className="btn btn-xs bg-white/5 border border-red-400/20 text-red-300"
                >
                  {t('adminSadaqah.delete', 'Delete')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-brand-emerald/15 bg-brand-emerald/5 p-4 space-y-2 h-fit">
          <p className="text-white/70 text-xs font-bold">
            {t('adminSadaqah.previewPublish', 'Preview & publish a quarter')}
          </p>
          <input
            value={quarter}
            onChange={(e) => {
              setQuarter(e.target.value);
              setPreviewData(null);
            }}
            placeholder="2026-Q3"
            className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white"
          />
          <button
            onClick={runPreview}
            disabled={!/^\d{4}-Q[1-4]$/.test(quarter) || preview.isPending}
            className="btn btn-sm bg-white/5 border border-white/10 text-white/70 disabled:opacity-40"
          >
            {preview.isPending ? '…' : t('adminSadaqah.calculate', 'Calculate')}
          </button>

          {previewData && (
            <div className="rounded-xl bg-black/20 px-3 py-2 text-sm">
              <p className="text-white">
                {t('adminSadaqah.received', 'Received')}:{' '}
                <span className="font-bold text-brand-emerald">
                  {previewData.received.toLocaleString()}
                </span>
              </p>
              <p className="text-white">
                {t('adminSadaqah.spent', 'Spent')}:{' '}
                <span className="font-bold text-brand-gold">
                  {previewData.spent.toLocaleString()}
                </span>
              </p>
            </div>
          )}

          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t(
              'adminSadaqah.notesPlaceholder',
              'Notes (e.g. server costs, qari recording)'
            )}
            className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white"
          />
          <button
            onClick={confirmPublish}
            disabled={!previewData || publish.isPending}
            className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white disabled:opacity-40"
          >
            {publish.isPending ? '…' : t('adminSadaqah.publish', 'Publish')}
          </button>
        </div>
      </div>
    </section>
  );
}

function DonorEmailAction({ email }: { email: string }) {
  const { t } = useTranslation();
  const draft = useDonorEmailDraft();
  const send = useSendDonorEmail();
  const [form, setForm] = useState<{ subject: string; body: string } | null>(null);

  const start = () => {
    draft.mutate(email, { onSuccess: (d) => setForm(d) });
  };
  const confirmSend = () => {
    if (!form) return;
    send.mutate(
      { email, subject: form.subject, body: form.body },
      { onSuccess: () => setForm(null) }
    );
  };

  if (!form) {
    return (
      <button
        onClick={start}
        disabled={draft.isPending}
        className="btn btn-xs bg-white/5 border border-white/10 text-white/60"
      >
        {draft.isPending ? '…' : t('adminSadaqah.sendEmail', 'Send email')}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-brand-emerald/20 bg-brand-deep p-5 space-y-3">
        <p className="text-white font-bold text-sm">
          {t('adminSadaqah.emailTo', 'Email to')} {email}
        </p>
        <p className="text-white/40 text-xs">
          {t(
            'adminSadaqah.emailEditableNote',
            'Prefilled — edit anything before sending. This is exactly what the donor receives.'
          )}
        </p>
        <input
          value={form.subject}
          onChange={(e) => setForm((f) => (f ? { ...f, subject: e.target.value } : f))}
          className="input input-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl"
        />
        <textarea
          value={form.body}
          onChange={(e) => setForm((f) => (f ? { ...f, body: e.target.value } : f))}
          rows={9}
          className="textarea textarea-sm w-full bg-white/5 border-brand-emerald/15 text-white rounded-xl font-mono"
        />
        <div className="flex gap-2">
          <button
            onClick={confirmSend}
            disabled={send.isPending}
            className="btn btn-sm bg-brand-emerald hover:bg-brand-emerald-dim border-0 text-white"
          >
            {send.isPending ? '…' : t('adminSadaqah.confirmSendEmail', 'Send this email')}
          </button>
          <button onClick={() => setForm(null)} className="btn btn-sm btn-ghost text-white/50">
            {t('adminZikr.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({ isServant }: { isServant: boolean }) {
  const { t } = useTranslation();
  const { data: donorAnalytics } = useDonorAnalytics(isServant);

  if (!isServant) {
    return (
      <p className="text-white/40 text-sm">
        {t(
          'adminSadaqah.analyticsServantOnly',
          'Servant-only — financial analytics and reporting.'
        )}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <QuarterlyPublisher />

      {donorAnalytics && (
        <section className="space-y-3">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest text-white/50">
            {t('adminSadaqah.donorAnalyticsTitle', 'Donor analytics')}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-brand-emerald/20 bg-brand-emerald/5 p-4 text-center">
              <p className="text-white text-2xl font-black">{donorAnalytics.repeatDonorCount}</p>
              <p className="text-white/40 text-xs mt-1">
                {t('adminSadaqah.repeatDonors', 'Repeat donors')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <p className="text-white text-2xl font-black">{donorAnalytics.oneOffDonorCount}</p>
              <p className="text-white/40 text-xs mt-1">
                {t('adminSadaqah.oneOffDonors', 'One-off donors')}
              </p>
            </div>
          </div>

          {donorAnalytics.monthlyTrend.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-white/50 text-xs font-bold mb-2">
                {t('adminSadaqah.monthlyTrend', 'Month-over-month (verified)')}
              </p>
              <div className="space-y-1.5">
                {donorAnalytics.monthlyTrend.map((m) => {
                  const max = Math.max(...donorAnalytics.monthlyTrend.map((x) => x.amount), 1);
                  return (
                    <div key={m.month} className="flex items-center gap-2 text-xs">
                      <span className="text-white/40 w-16 shrink-0">{m.month}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
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

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs border-b border-white/10">
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
                    <tr key={d.email} className="border-b border-white/5 last:border-0">
                      <td className="px-3 py-2 text-white/80 truncate max-w-[200px]">{d.email}</td>
                      <td className="px-3 py-2 text-white text-right font-bold">
                        {d.donationCount}
                      </td>
                      <td className="px-3 py-2 text-white text-right font-bold">
                        {d.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{d.isAppUser ? '✓' : '—'}</td>
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

type Tab = 'submissions' | 'expenses' | 'analytics';

export default function AdminSadaqah() {
  const { t } = useTranslation();
  const isServant = useAdminStore((s) => s.role === 'servant');
  const [tab, setTab] = useState<Tab>('submissions');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'submissions', label: t('adminSadaqah.tabSubmissions', 'All submissions') },
    { id: 'expenses', label: t('adminSadaqah.tabExpenses', 'Expenses') },
    { id: 'analytics', label: t('adminSadaqah.tabAnalytics', 'Analytics') },
  ];

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminSadaqah.seoTitle', 'Sadaqah Admin')}
        description="Internal dashboard."
        path="/admin/sadaqah"
        index={false}
      />
      <div className="max-w-6xl mx-auto px-6 py-6 sm:py-10 space-y-6">
        <h1 className="text-2xl font-black text-white">
          {t('adminSadaqah.title', 'Sadaqah Admin')}
        </h1>

        <div className="flex gap-2 border-b border-white/10 pb-px">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${
                tab === tb.id
                  ? 'bg-brand-emerald/15 text-brand-emerald border-b-2 border-brand-emerald'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'submissions' && <SubmissionsTab isServant={isServant} />}
        {tab === 'expenses' && <ExpensesTab isServant={isServant} />}
        {tab === 'analytics' && <AnalyticsTab isServant={isServant} />}
      </div>
    </AnimatedBackground>
  );
}
