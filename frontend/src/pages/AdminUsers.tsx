import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import { CheckIcon, UsersIcon } from '@heroicons/react/24/outline';
import Seo from '../components/Seo.js';
import { AdminHero, OPTION_CHIP } from '../components/admin/adminParts.js';
import { OPTION_OFF, OPTION_ON } from '../components/bustanStyles.js';
import { useAdminUserList, type UserListShow, type UserListSort } from '../hooks/useAdminUsers.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (iso: string): number =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS));

export default function AdminUsers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<UserListSort>('newest');
  const [show, setShow] = useState<UserListShow>('all');
  const limit = 25;
  const { data, isLoading } = useAdminUserList(search, page, limit, sort, show);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('adminUsers.seoTitle', 'User Management')}
        description="Internal dashboard."
        path="/admin/users"
        index={false}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <AdminHero icon={UsersIcon} title={t('adminUsers.title', 'User management')} />

        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('adminUsers.searchPlaceholder', 'Search by email or name…')}
            aria-label={t('adminUsers.searchPlaceholder', 'Search by email or name…')}
            className="px-3 py-2 rounded-control bg-brand-surface border border-brand-border text-white text-sm placeholder:text-white/70 focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/30 transition-colors w-full max-w-xs"
          />
          <div className="flex gap-1">
            <button
              onClick={() => {
                setSort('newest');
                setPage(1);
              }}
              aria-pressed={sort === 'newest'}
              className={`${OPTION_CHIP} ${sort === 'newest' ? OPTION_ON : OPTION_OFF}`}
            >
              {t('adminUsers.sortNewest', 'Recently joined')}
            </button>
            <button
              onClick={() => {
                setSort('inactive');
                setPage(1);
              }}
              aria-pressed={sort === 'inactive'}
              className={`${OPTION_CHIP} ${sort === 'inactive' ? OPTION_ON : OPTION_OFF}`}
            >
              {t('adminUsers.sortInactive', 'Most inactive first')}
            </button>
          </div>
          <select
            value={show}
            onChange={(e) => {
              setShow(e.target.value as UserListShow);
              setPage(1);
            }}
            aria-label={t('adminUsers.showLabel', 'Show')}
            className="px-3 py-2 rounded-control bg-brand-surface border border-brand-border text-white text-sm focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/30 transition-colors"
          >
            <option value="all">{t('adminUsers.showAll', 'Everyone')}</option>
            <option value="disabled">{t('adminUsers.showDisabled', 'Disabled accounts')}</option>
            <option value="staff">{t('adminUsers.showStaff', 'Staff logins')}</option>
            <option value="neverWelcomed">
              {t('adminUsers.showNeverWelcomed', 'Never sent a welcome email')}
            </option>
          </select>
          {data && (
            <span className="text-xs text-white/70">
              {t('adminUsers.total', '{{count}} users', { count: data.total })}
            </span>
          )}
        </div>

        <div className="rounded-card border border-brand-border bg-brand-deep shadow-elev-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/70 text-xs uppercase tracking-wide border-b border-brand-border">
                <th className="px-3 py-2">{t('adminUsers.colEmail', 'Email')}</th>
                <th className="px-3 py-2">{t('adminUsers.colName', 'Name')}</th>
                <th className="px-3 py-2">{t('adminUsers.colLocation', 'Location')}</th>
                <th className="px-3 py-2">{t('adminUsers.colJoined', 'Joined')}</th>
                <th className="px-3 py-2">{t('adminUsers.colLastActive', 'Last active')}</th>
                <th className="px-3 py-2">{t('adminUsers.colWelcome', 'Welcomed')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="text-center text-white/70 py-6">
                    {t('common.loading', 'Loading…')}
                  </td>
                </tr>
              )}
              {!isLoading && data?.users.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-white/70 py-6">
                    {t('adminUsers.empty', 'No users found.')}
                  </td>
                </tr>
              )}
              {data?.users.map((u) => {
                const inactiveDays = daysAgo(u.lastActiveAt || u.createdAt);
                return (
                  <tr
                    key={u.uid}
                    onClick={() => navigate(`/admin/users/${u.uid}`)}
                    className="border-b border-brand-border/60 last:border-0 hover:bg-brand-surface/50 cursor-pointer"
                  >
                    <td className="px-3 py-2 text-white/80">
                      {u.email}
                      {u.admin && (
                        <span
                          title={`${u.admin.role}${u.admin.active ? '' : ', inactive'}`}
                          className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-brand-gold/15 text-brand-gold"
                        >
                          {t('adminUsers.adminBadge', 'Admin')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-white/70">
                      {u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || '-'}
                    </td>
                    <td className="px-3 py-2 text-white/70">
                      {[u.city, u.country].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="px-3 py-2 text-white/70">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td
                      className={`px-3 py-2 ${inactiveDays >= 30 ? 'text-brand-gold' : 'text-white/70'}`}
                    >
                      {t('adminUsers.daysAgo', '{{count}}d ago', { count: inactiveDays })}
                    </td>
                    <td className="px-3 py-2">
                      {u.disabled ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-400/15 text-red-400">
                          {t('adminUsers.disabled', 'Disabled')}
                        </span>
                      ) : u.welcomeEmailSentAt ? (
                        <CheckIcon
                          className="w-4 h-4 text-brand-emerald"
                          aria-label={t('adminUsers.welcomed', 'Welcomed')}
                        />
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
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
