import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import {
  BanknotesIcon,
  InboxStackIcon,
  UsersIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useAdminStore } from '../store/useAdminStore.js';
import { useAdminLogout } from '../hooks/useAdminAuth.js';

/**
 * The admin panel's OWN chrome — deliberately never the main app's Navbar
 * (see App.tsx's isAdminPage gating). That was the root cause of a real
 * incident: the main Navbar rendered on top of /admin pages, and its logo
 * link went to "/", which renders whichever regular app account happens to
 * be cached in this browser's normal (non-admin) Firebase session — nothing
 * to do with who is signed into the admin panel. An admin clicking what
 * looked like "Home" landed on a completely different person's dashboard.
 * This layout's own "Admin Home" link only ever goes to /admin, and leaving
 * to the public site is a distinct, explicitly-labeled action that opens in
 * a new tab, never something a stray click can trigger by accident.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { email, role } = useAdminStore();
  const logout = useAdminLogout();
  const isServant = role === 'servant';

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
      isActive
        ? 'bg-brand-emerald/15 text-brand-emerald'
        : 'text-white/60 hover:text-white hover:bg-white/5'
    }`;

  return (
    <div className="min-h-screen bg-brand-void">
      <header className="border-b border-brand-border/60 bg-brand-deep/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <NavLink to="/admin" className="flex items-center gap-2 font-black text-white text-sm">
              <span aria-hidden>🌙</span>
              {t('adminLayout.brand', 'Bustandeen Admin')}
            </NavLink>
            <nav className="flex items-center gap-1 flex-wrap">
              <NavLink to="/admin/sadaqah" className={navItemClass}>
                <BanknotesIcon className="w-4 h-4" />
                {t('adminLayout.sadaqah', 'Sadaqah')}
              </NavLink>
              <NavLink to="/admin/zikr-requests" className={navItemClass}>
                <InboxStackIcon className="w-4 h-4" />
                {t('adminLayout.zikrRequests', 'Zikr Requests')}
              </NavLink>
              {isServant && (
                <NavLink to="/admin/users" className={navItemClass}>
                  <UsersIcon className="w-4 h-4" />
                  {t('adminLayout.users', 'Users')}
                </NavLink>
              )}
              {isServant && (
                <NavLink to="/admin/accounts" className={navItemClass}>
                  <ShieldCheckIcon className="w-4 h-4" />
                  {t('adminLayout.accounts', 'Manage Ansars')}
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/40">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1 hover:text-white transition-colors"
            >
              {t('adminLayout.viewPublicSite', 'Public site')}
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            </a>
            <span className="flex items-center gap-1.5">
              {email}
              {role && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                    role === 'servant'
                      ? 'bg-brand-gold/15 text-brand-gold'
                      : 'bg-brand-emerald/15 text-brand-emerald'
                  }`}
                >
                  {role === 'servant'
                    ? t('adminGate.servant', 'Servant')
                    : t('adminGate.ansar', 'Ansar')}
                </span>
              )}
            </span>
            <button
              onClick={() => logout.mutate()}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
              {t('adminGate.logOut', 'Log out')}
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
