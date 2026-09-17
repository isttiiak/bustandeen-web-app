import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BanknotesIcon,
  InboxStackIcon,
  UsersIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import Seo from '../components/Seo.js';
import { useAdminStore } from '../store/useAdminStore.js';
import { useAdminStats } from '../hooks/useAdminStats.js';

function AdminCard({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-start gap-3 rounded-2xl bg-base-200 border border-base-300 p-4 hover:border-brand-emerald/40 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-emerald/10 grid place-items-center shrink-0">
        <Icon className="w-5 h-5 text-brand-emerald" />
      </div>
      <div>
        <div className="font-bold text-white">{title}</div>
        <div className="text-sm text-white/50">{description}</div>
      </div>
    </Link>
  );
}

function StatTile({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        emphasis ? 'bg-brand-gold/10 border-brand-gold/30' : 'bg-base-200 border-base-300'
      }`}
    >
      <div className={`text-2xl font-black ${emphasis ? 'text-brand-gold' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-xs text-white/50 mt-0.5">{label}</div>
    </div>
  );
}

export default function AdminHome() {
  const { t } = useTranslation();
  const { role, ansarDomain } = useAdminStore();
  const isServant = role === 'servant';
  const { data: stats } = useAdminStats();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Seo
        title={t('adminHome.seoTitle', 'Admin Overview')}
        description="Internal dashboard."
        path="/admin"
        index={false}
      />
      <div>
        <h1 className="text-xl font-black text-white">{t('adminHome.title', 'Admin overview')}</h1>
        <p className="text-sm text-white/50 mt-1">
          {isServant
            ? t('adminHome.subtitleServant', 'Full operational access — Servant tier.')
            : t(
                'adminHome.subtitleAnsar',
                'Routine review access — Ansar tier. Critical operations are Servant-only.'
              )}
        </p>
      </div>

      {/* Servant: a full stats hub. Sadaqah Ansar: pending-donations hero.
          General Ansar: pending zikr requests + open feedback hero. Never
          renders a number from outside the caller's own domain — the
          endpoint itself only computes what the caller's role can see. */}
      {isServant && stats?.servant && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            label={t('adminHome.pendingSadaqah', 'Pending donations')}
            value={stats.pendingSadaqah ?? 0}
            emphasis={(stats.pendingSadaqah ?? 0) > 0}
          />
          <StatTile
            label={t('adminHome.pendingZikr', 'Pending zikr requests')}
            value={stats.pendingZikrRequests ?? 0}
            emphasis={(stats.pendingZikrRequests ?? 0) > 0}
          />
          <StatTile
            label={t('adminHome.verifiedTotal', 'Verified donations (৳)')}
            value={stats.servant.totalVerifiedAmount.toLocaleString()}
          />
          <StatTile
            label={t('adminHome.newUsers', 'New users this week')}
            value={stats.servant.newUsersThisWeek}
          />
        </div>
      )}

      {!isServant && ansarDomain === 'sadaqah' && (
        <Link
          to="/admin/sadaqah"
          className="block rounded-2xl border border-brand-gold/30 bg-brand-gold/10 p-5 hover:bg-brand-gold/15 transition-colors"
        >
          <div className="text-3xl font-black text-brand-gold">{stats?.pendingSadaqah ?? 0}</div>
          <div className="text-sm text-white/60 mt-1">
            {t('adminHome.pendingSadaqahCta', 'Donations waiting for review — tap to review now')}
          </div>
        </Link>
      )}

      {!isServant && ansarDomain === 'general' && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Link
            to="/admin/zikr-requests"
            className="block rounded-2xl border border-brand-gold/30 bg-brand-gold/10 p-5 hover:bg-brand-gold/15 transition-colors"
          >
            <div className="text-3xl font-black text-brand-gold">
              {stats?.pendingZikrRequests ?? 0}
            </div>
            <div className="text-sm text-white/60 mt-1">
              {t('adminHome.pendingZikrCta', 'Zikr requests waiting for review')}
            </div>
          </Link>
          <Link
            to="/admin/feedback"
            className="block rounded-2xl border border-brand-emerald/20 bg-brand-emerald/[0.06] p-5 hover:bg-brand-emerald/10 transition-colors"
          >
            <div className="text-3xl font-black text-brand-emerald">{stats?.openFeedback ?? 0}</div>
            <div className="text-sm text-white/60 mt-1">
              {t('adminHome.openFeedbackCta', 'Open feedback/contact messages')}
            </div>
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <AdminCard
          to="/admin/sadaqah"
          icon={BanknotesIcon}
          title={t('adminHome.sadaqahTitle', 'Sadaqah management')}
          description={t(
            'adminHome.sadaqahDesc',
            'Review donations, expenses, and quarterly financial stats.'
          )}
        />
        <AdminCard
          to="/admin/zikr-requests"
          icon={InboxStackIcon}
          title={t('adminHome.zikrTitle', 'Zikr requests')}
          description={t(
            'adminHome.zikrDesc',
            'Approve or reject user-submitted zikr/dua suggestions.'
          )}
        />
        <AdminCard
          to="/admin/feedback"
          icon={EnvelopeIcon}
          title={t('adminHome.feedbackTitle', 'Feedback & contact')}
          description={t('adminHome.feedbackDesc', 'Read and reply to user messages.')}
        />
        {isServant && (
          <AdminCard
            to="/admin/users"
            icon={UsersIcon}
            title={t('adminHome.usersTitle', 'User management')}
            description={t(
              'adminHome.usersDesc',
              'Browse the user directory and manage welcome emails.'
            )}
          />
        )}
        {isServant && (
          <AdminCard
            to="/admin/accounts"
            icon={ShieldCheckIcon}
            title={t('adminHome.accountsTitle', 'Manage Ansars')}
            description={t('adminHome.accountsDesc', 'Add or deactivate Ansar admin accounts.')}
          />
        )}
      </div>
    </div>
  );
}
