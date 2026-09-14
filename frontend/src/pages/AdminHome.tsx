import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BanknotesIcon,
  InboxStackIcon,
  UsersIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import Seo from '../components/Seo.js';
import { useAdminStore } from '../store/useAdminStore.js';

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

export default function AdminHome() {
  const { t } = useTranslation();
  const role = useAdminStore((s) => s.role);
  const isServant = role === 'servant';

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
