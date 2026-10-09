import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import Seo from '../components/Seo.js';
import { AdminHero } from '../components/admin/adminParts.js';
import { useAdminAuditLog } from '../hooks/useAdminAudit.js';

const ACTION_LABELS: Record<string, string> = {
  'donation.verify': 'Verified donation',
  'donation.reject': 'Rejected donation',
  'donation.delete': 'Deleted donation',
  'expense.add': 'Added expense',
  'expense.delete': 'Deleted expense',
  'quarterly.publish': 'Published quarterly stats',
  'quarterly.unpublish': 'Unpublished quarterly stats',
  'quarterly.delete': 'Deleted quarterly stats',
  'donor.email': 'Sent donor appreciation email',
  'zikrRequest.approve': 'Approved zikr request',
  'zikrRequest.reject': 'Rejected zikr request',
  'library.updateCategory': 'Re-categorized library item',
  'library.update': 'Edited library item',
  'library.delete': 'Deleted library item',
  'account.create': 'Created admin account',
  'account.activate': 'Activated admin account',
  'account.deactivate': 'Deactivated admin account',
  'account.setDomain': "Changed an Ansar's domain",
  'user.disable': 'Disabled user account',
  'user.enable': 'Re-enabled user account',
  'user.reengagementEmail': 'Sent re-engagement email',
  'feedback.reply': 'Replied to feedback',
  'feedback.markRepliedExternal': 'Marked feedback replied (sent via Zoho)',
  'feedback.archive': 'Archived feedback',
  'feedback.delete': 'Deleted feedback',
  'email.compose.send': 'Sent a composed email',
  'user.delete': 'Deleted user account',
  'user.resendWelcome': 'Sent welcome email',
  'user.customEmail': 'Sent custom email to user',
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <AdminHero
          icon={ClipboardDocumentListIcon}
          title={t('adminAuditLog.title', 'Audit log')}
          subtitle={t(
            'adminAuditLog.subtitle',
            'Every mutating admin action: who did what, and when.'
          )}
        />

        <input
          value={actor}
          onChange={(e) => {
            setActor(e.target.value);
            setPage(1);
          }}
          placeholder={t('adminAuditLog.filterPlaceholder', 'Filter by admin email…')}
          aria-label={t('adminAuditLog.filterPlaceholder', 'Filter by admin email…')}
          className="px-3 py-2 rounded-control bg-brand-surface border border-brand-border text-white text-sm placeholder:text-white/70 focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/30 transition-colors w-full max-w-xs"
        />

        <div className="rounded-card border border-brand-border bg-brand-deep shadow-elev-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/70 text-xs uppercase tracking-wide border-b border-brand-border">
                <th className="px-3 py-2">{t('adminAuditLog.colWhen', 'When')}</th>
                <th className="px-3 py-2">{t('adminAuditLog.colActor', 'Actor')}</th>
                <th className="px-3 py-2">{t('adminAuditLog.colAction', 'Action')}</th>
                <th className="px-3 py-2">{t('adminAuditLog.colTarget', 'Target')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="text-center text-white/70 py-6">
                    {t('common.loading', 'Loading…')}
                  </td>
                </tr>
              )}
              {!isLoading && data?.entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-white/70 py-6">
                    {t('adminAuditLog.empty', 'No admin actions recorded yet.')}
                  </td>
                </tr>
              )}
              {data?.entries.map((e) => (
                <tr key={e._id} className="border-b border-brand-border/60 last:border-0">
                  <td className="px-3 py-2 text-white/70 whitespace-nowrap">
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
                  <td className="px-3 py-2 text-white/70 font-mono text-xs">
                    {e.targetType}#{e.targetId.slice(-6)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm text-white/70">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center justify-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-bold text-white/80 hover:text-white bg-brand-surface border border-brand-border hover:border-brand-emerald/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('adminUsers.prev', 'Prev')}
            </button>
            <span>
              {t('adminUsers.pageOf', 'Page {{page}} of {{total}}', { page, total: totalPages })}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center justify-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-bold text-white/80 hover:text-white bg-brand-surface border border-brand-border hover:border-brand-emerald/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('adminUsers.next', 'Next')}
            </button>
          </div>
        )}
      </div>
    </AnimatedBackground>
  );
}
