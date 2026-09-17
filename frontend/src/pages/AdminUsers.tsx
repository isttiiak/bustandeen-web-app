import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { useAdminUserList } from '../hooks/useAdminUsers.js';

export default function AdminUsers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;
  const { data, isLoading } = useAdminUserList(search, page, limit);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminUsers.seoTitle', 'User Management')}
        description="Internal dashboard."
        path="/admin/users"
        index={false}
      />
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        <h1 className="text-2xl font-black text-white">
          {t('adminUsers.title', 'User management')}
        </h1>

        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('adminUsers.searchPlaceholder', 'Search by email or name…')}
            className="input input-sm w-full max-w-xs bg-white/5 border-brand-emerald/15 text-white rounded-xl"
          />
          {data && (
            <span className="text-xs text-white/40">
              {t('adminUsers.total', '{{count}} users', { count: data.total })}
            </span>
          )}
        </div>

        <div className="rounded-2xl bg-base-200 border border-base-300 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 text-xs uppercase tracking-wide border-b border-base-300">
                <th className="px-3 py-2">{t('adminUsers.colEmail', 'Email')}</th>
                <th className="px-3 py-2">{t('adminUsers.colName', 'Name')}</th>
                <th className="px-3 py-2">{t('adminUsers.colLocation', 'Location')}</th>
                <th className="px-3 py-2">{t('adminUsers.colJoined', 'Joined')}</th>
                <th className="px-3 py-2">{t('adminUsers.colWelcome', 'Welcomed')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center text-white/30 py-6">
                    {t('common.loading', 'Loading…')}
                  </td>
                </tr>
              )}
              {!isLoading && data?.users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-white/30 py-6">
                    {t('adminUsers.empty', 'No users found.')}
                  </td>
                </tr>
              )}
              {data?.users.map((u) => (
                <tr
                  key={u.uid}
                  onClick={() => navigate(`/admin/users/${u.uid}`)}
                  className="border-b border-base-300/60 last:border-0 hover:bg-white/[0.03] cursor-pointer"
                >
                  <td className="px-3 py-2 text-white/80">{u.email}</td>
                  <td className="px-3 py-2 text-white/60">
                    {u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-3 py-2 text-white/60">
                    {[u.city, u.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2 text-white/60">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">{u.welcomeEmailSentAt ? '✓' : '—'}</td>
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
