import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  BanknotesIcon,
  InboxStackIcon,
  UsersIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  ClipboardDocumentListIcon,
  HeartIcon,
  MegaphoneIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import Seo from '../components/Seo.js';
import { AdminHero } from '../components/admin/adminParts.js';
import { CARD } from '../components/bustanStyles.js';
import { useAdminStore } from '../store/useAdminStore.js';
import { useAdminStats, type AdminOverviewStats } from '../hooks/useAdminStats.js';
import { cameBackPercent, weekLabel } from '../utils/adminActivity.js';

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
      className={`${CARD} flex items-start gap-3 p-4 hover:border-brand-emerald/40 transition-colors`}
    >
      <div className="w-10 h-10 rounded-control bg-brand-emerald/10 grid place-items-center shrink-0">
        <Icon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />
      </div>
      <div>
        <div className="font-display font-bold text-white">{title}</div>
        <div className="text-sm text-white/80">{description}</div>
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
      className={
        emphasis
          ? 'rounded-card border border-brand-gold/40 bg-brand-gold/10 shadow-elev-2 p-4'
          : `${CARD} p-4`
      }
    >
      <div
        className={`text-2xl font-bold font-display ${emphasis ? 'text-brand-gold' : 'text-white'}`}
      >
        {value}
      </div>
      <div className="text-xs text-white/80 mt-0.5">{label}</div>
    </div>
  );
}

type Activity = NonNullable<AdminOverviewStats['servant']>['activity'];

/** Who uses the app (Servant only): opened it lately, came back after week
 *  one, and sign-ups per week as a bar list that also reads as a table. */
function ActivityPanel({ activity }: { activity: Activity }) {
  const { t } = useTranslation();
  const { today, week, month, signupsByWeek, cameBack } = activity;
  const max = Math.max(1, ...signupsByWeek);
  const percent = cameBackPercent(cameBack);
  return (
    <section className="space-y-3" aria-labelledby="admin-activity-title">
      <h2 id="admin-activity-title" className="font-display font-bold text-white">
        {t('adminHome.activityTitle', 'Who uses the app')}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label={t('adminHome.activeToday', 'Opened the app today')} value={today} />
        <StatTile label={t('adminHome.activeWeek', 'In the last 7 days')} value={week} />
        <StatTile label={t('adminHome.activeMonth', 'In the last 30 days')} value={month} />
        <StatTile
          label={t(
            'adminHome.cameBack',
            'Came back after week 1 ({{returned}} of {{cohort}} who joined 8 to 35 days ago)',
            cameBack
          )}
          value={percent === null ? '–' : `${percent}%`}
        />
      </div>
      <div className={`${CARD} p-4`}>
        <h3 className="text-sm font-bold text-white mb-3">
          {t('adminHome.signupsTitle', 'Sign-ups per week')}
        </h3>
        <ul className="space-y-1.5">
          {signupsByWeek.map((n, i) => (
            <li
              key={i}
              className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-2 text-xs"
              title={`${weekLabel(i)}: ${n}`}
            >
              <span className="text-white/70">{weekLabel(i)}</span>
              <span className="h-3 rounded-full bg-white/5" aria-hidden="true">
                <span
                  className="block h-3 rounded-full bg-brand-emerald"
                  style={{ width: `${(n / max) * 100}%`, minWidth: n > 0 ? 4 : 0 }}
                />
              </span>
              <span className="text-white text-right tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-white/60 mt-3">
          {t(
            'adminHome.activityNote',
            'Active means the app was opened (or zikr was logged) in that time. Staff and disabled accounts are not counted.'
          )}
        </p>
      </div>
    </section>
  );
}

export default function AdminHome() {
  const { t } = useTranslation();
  const { role, ansarDomain } = useAdminStore();
  const isServant = role === 'servant';
  // Same domain-visibility rule AdminLayout.tsx's top nav uses — this card
  // grid must match it exactly, otherwise a domain-scoped Ansar sees a card
  // for a section the API will 403 them out of the moment they click it.
  const canSeeSadaqah = isServant || ansarDomain === 'sadaqah';
  const canSeeZikrRequests = isServant || ansarDomain === 'general';
  const { data: stats } = useAdminStats();

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
      <Seo
        title={t('adminHome.seoTitle', 'Admin Overview')}
        description="Internal dashboard."
        path="/admin"
        index={false}
      />
      <AdminHero
        icon={Squares2X2Icon}
        title={t('adminHome.title', 'Admin overview')}
        subtitle={
          isServant
            ? t('adminHome.subtitleServant', 'Full operational access, Servant tier.')
            : t(
                'adminHome.subtitleAnsar',
                'Routine review access, Ansar tier. Critical operations are Servant-only.'
              )
        }
      />

      {/* Servant: a full stats hub. Sadaqah Ansar: pending-donations hero.
          General Ansar: pending zikr requests + open feedback hero. Never
          renders a number from outside the caller's own domain — the
          endpoint itself only computes what the caller's role can see. */}
      {isServant && stats?.servant && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
            label={t('adminHome.totalUsers', 'Total users')}
            value={stats.servant.totalUsers.toLocaleString()}
          />
          <StatTile
            label={t('adminHome.newUsers', 'New users this week')}
            value={stats.servant.newUsersThisWeek}
          />
        </div>
      )}

      {isServant && stats?.servant?.activity && <ActivityPanel activity={stats.servant.activity} />}

      {!isServant && ansarDomain === 'sadaqah' && (
        <Link
          to="/admin/sadaqah"
          className="block rounded-card border border-brand-gold/40 bg-brand-gold/10 shadow-elev-2 p-5 hover:bg-brand-gold/15 transition-colors"
        >
          <div className="text-3xl font-display font-bold text-brand-gold">
            {stats?.pendingSadaqah ?? 0}
          </div>
          <div className="text-sm text-white/80 mt-1">
            {t('adminHome.pendingSadaqahCta', 'Donations waiting for review. Tap to review now.')}
          </div>
        </Link>
      )}

      {!isServant && ansarDomain === 'general' && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Link
            to="/admin/zikr-requests"
            className="block rounded-card border border-brand-gold/40 bg-brand-gold/10 shadow-elev-2 p-5 hover:bg-brand-gold/15 transition-colors"
          >
            <div className="text-3xl font-display font-bold text-brand-gold">
              {stats?.pendingZikrRequests ?? 0}
            </div>
            <div className="text-sm text-white/80 mt-1">
              {t('adminHome.pendingZikrCta', 'Zikr requests waiting for review')}
            </div>
          </Link>
          <Link
            to="/admin/feedback"
            className="block rounded-card border border-brand-emerald/30 bg-brand-emerald/10 shadow-elev-2 p-5 hover:bg-brand-emerald/15 transition-colors"
          >
            <div className="text-3xl font-display font-bold text-brand-emerald">
              {stats?.openFeedback ?? 0}
            </div>
            <div className="text-sm text-white/80 mt-1">
              {t('adminHome.openFeedbackCta', 'Open feedback and contact messages')}
            </div>
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {canSeeSadaqah && (
          <AdminCard
            to="/admin/sadaqah"
            icon={BanknotesIcon}
            title={t('adminHome.sadaqahTitle', 'Sadaqah management')}
            description={t(
              'adminHome.sadaqahDesc',
              'Review donations, expenses, and quarterly financial stats.'
            )}
          />
        )}
        {canSeeZikrRequests && (
          <AdminCard
            to="/admin/zikr-requests"
            icon={InboxStackIcon}
            title={t('adminHome.zikrTitle', 'Zikr requests')}
            description={t(
              'adminHome.zikrDesc',
              'Approve or reject user-submitted zikr/dua suggestions.'
            )}
          />
        )}
        {canSeeZikrRequests && (
          <AdminCard
            to="/admin/feedback"
            icon={EnvelopeIcon}
            title={t('adminHome.feedbackTitle', 'Feedback & contact')}
            description={t('adminHome.feedbackDesc', 'Read and reply to user messages.')}
          />
        )}
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
            description={t(
              'adminHome.accountsDesc',
              'Add, deactivate, or change the domain of an Ansar account.'
            )}
          />
        )}
        {isServant && (
          <AdminCard
            to="/admin/audit-log"
            icon={ClipboardDocumentListIcon}
            title={t('adminHome.auditLogTitle', 'Audit log')}
            description={t('adminHome.auditLogDesc', 'Every mutating admin action, who and when.')}
          />
        )}
        {isServant && (
          <AdminCard
            to="/admin/ops-health"
            icon={HeartIcon}
            title={t('adminHome.opsHealthTitle', 'System & ops health')}
            description={t(
              'adminHome.opsHealthDesc',
              'Email failures, DB/Firebase status, rate-limit hits.'
            )}
          />
        )}
        <AdminCard
          to="/admin/broadcast"
          icon={MegaphoneIcon}
          title={t('adminHome.broadcastTitle', 'Broadcast')}
          description={t(
            'adminHome.broadcastDesc',
            'Push a banner to every visitor, or send an update email.'
          )}
        />
      </div>
    </div>
  );
}
