import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { useAdminAuditLog } from '../hooks/useAdminAudit.js';

const ACTION_LABELS: Record<string, string> = {
  'donation.verify': 'Verified donation',
  'donation.reject': 'Rejected donation',
  'donation.delete': 'Deleted donation',
  'expense.add': 'Added expense',
  'expense.delete': 'Deleted expense',
  'quarterly.upsert': 'Edited quarterly stats',
  'quarterly.delete': 'Deleted quarterly stats',
  'zikrRequest.approve': 'Approved zikr request',
  'zikrRequest.reject': 'Rejected zikr request',
  'library.updateCategory': 'Re-categorized library item',
  'library.update': 'Edited library item',
  'library.delete': 'Deleted library item',
  'account.create': 'Created admin account',
  'account.activate': 'Activated admin account',
  'account.deactivate': 'Deactivated admin account',
  'feedback.reply': 'Replied to feedback',
  'feedback.archive': 'Archived feedback',
  'feedback.delete': 'Deleted feedback',
  'user.delete': 'Deleted user account',
  'user.resendWelcome': 'Resent welcome email',
  'announcement.create': 'Published announcement',
  'announcement.deactivate': 'Deactivated announcement',
};

export default function AdminAuditLog() {
  const { t } = useTranslation();
  const [actor, setActor] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;
  const { data, isLoading } = useAdminAuditLog(actor, page, limit);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminAuditLog.seoTitle', 'Audit Log')}
        description="Internal dashboard."
        path="/admin/audit-log"
        index={false}
      />
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">
            {t('adminAuditLog.title', 'Audit log')}
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {t('adminAuditLog.subtitle', 'Every mutating admin action — who did what, and when.')}
          </p>
        </div>

        <input
          value={actor}
          onChange={(e) => {
            setActor(e.target.value);
            setPage(1);
          }}
          placeholder={t('adminAuditLog.filterPlaceholder', 'Filter by admin email…')}
          className="input input-sm w-full max-w-xs bg-white/5 border-brand-emerald/15 text-white rounded-xl"
        />

        <div className="rounded-2xl bg-base-200 border border-base-300 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 text-xs uppercase tracking-wide border-b border-base-300">
                <th className="px-3 py-2">{t('adminAuditLog.colWhen', 'When')}</th>
                <th className="px-3 py-2">{t('adminAuditLog.colActor', 'Actor')}</th>
                <th className="px-3 py-2">{t('adminAuditLog.colAction', 'Action')}</th>
                <th className="px-3 py-2">{t('adminAuditLog.colTarget', 'Target')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="text-center text-white/30 py-6">
                    {t('common.loading', 'Loading…')}
                  </td>
                </tr>
              )}
              {!isLoading && data?.entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-white/30 py-6">
                    {t('adminAuditLog.empty', 'No admin actions recorded yet.')}
                  </td>
                </tr>
              )}
              {data?.entries.map((e) => (
                <tr key={e._id} className="border-b border-base-300/60 last:border-0">
                  <td className="px-3 py-2 text-white/50 whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-white/80">
                    {e.actorEmail}
                    <span
                      className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        e.actorRole === 'servant'
                          ? 'bg-brand-gold/15 text-brand-gold'
                          : 'bg-brand-emerald/15 text-brand-emerald'
                      }`}
                    >
                      {e.actorRole}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white/70">{ACTION_LABELS[e.action] ?? e.action}</td>
                  <td className="px-3 py-2 text-white/40 font-mono text-xs">
                    {e.targetType}#{e.targetId.slice(-6)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm text-white/60">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn btn-xs rounded-lg disabled:opacity-30"
            >
              {t('adminUsers.prev', 'Prev')}
            </button>
            <span>
              {t('adminUsers.pageOf', 'Page {{page}} of {{total}}', { page, total: totalPages })}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn btn-xs rounded-lg disabled:opacity-30"
            >
              {t('adminUsers.next', 'Next')}
            </button>
          </div>
        )}
      </div>
    </AnimatedBackground>
  );
}
