import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { AdminHero } from '../components/admin/adminParts.js';
import { AnalyticsTab } from '../components/admin/sadaqah/AnalyticsTab.js';
import { ExpensesTab } from '../components/admin/sadaqah/ExpensesTab.js';
import { SubmissionsTab } from '../components/admin/sadaqah/SubmissionsTab.js';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import Seo from '../components/Seo.js';
import { useAdminStore } from '../store/useAdminStore.js';

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <AdminHero icon={BanknotesIcon} title={t('adminSadaqah.title', 'Sadaqah Admin')} />

        <div className="flex gap-2 border-b border-brand-border pb-px">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`px-4 py-2 text-sm font-bold rounded-t-control transition-colors ${
                tab === tb.id
                  ? 'bg-brand-emerald/15 text-brand-emerald border-b-2 border-brand-emerald'
                  : 'text-white/70 hover:text-white'
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
