import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BanknotesIcon,
  InboxStackIcon,
  UsersIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  SpeakerWaveIcon,
  HeartIcon,
  MegaphoneIcon,
  ChevronDownIcon,
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

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
    isActive
      ? 'bg-brand-emerald/15 text-brand-emerald'
      : 'text-white/60 hover:text-white hover:bg-white/5'
  }`;

interface ToolLink {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

/** Servant-only secondary tools (account/ops management, not day-to-day
 *  review work) collapsed into one dropdown — flattening all of these into
 *  the main tab row is what made the navbar unreadable with 8+ tabs. */
function ToolsMenu({ links }: { links: ToolLink[] }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const isActive = links.some((l) => location.pathname.startsWith(l.to));

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
          isActive || open
            ? 'bg-brand-emerald/15 text-brand-emerald'
            : 'text-white/60 hover:text-white hover:bg-white/5'
        }`}
      >
        <ShieldCheckIcon className="w-4 h-4" />
        Tools
        <ChevronDownIcon
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-52 rounded-xl border border-brand-border bg-brand-deep shadow-xl shadow-black/40 py-1.5 z-30">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive: linkActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  linkActive
                    ? 'bg-brand-emerald/15 text-brand-emerald'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <l.icon className="w-4 h-4 shrink-0" />
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { email, role, ansarDomain } = useAdminStore();
  const logout = useAdminLogout();
  const isServant = role === 'servant';
  const canSeeSadaqah = isServant || ansarDomain === 'sadaqah';
  const canSeeZikrRequests = isServant || ansarDomain === 'general';

  // Role-coded accent (matches the role badge below) — a Servant's chrome
  // reads gold, an Ansar's reads emerald, so a glance at the header alone
  // hints which tier is signed in, before even reading the email.
  const accent = isServant ? 'text-brand-gold' : 'text-brand-emerald';

  const toolLinks: ToolLink[] = [
    { to: '/admin/users', icon: UsersIcon, label: t('adminLayout.users', 'Users') },
    {
      to: '/admin/accounts',
      icon: ShieldCheckIcon,
      label: t('adminLayout.accounts', 'Manage Ansars'),
    },
    {
      to: '/admin/audit-log',
      icon: ClipboardDocumentListIcon,
      label: t('adminLayout.auditLog', 'Audit Log'),
    },
    { to: '/admin/ops-health', icon: HeartIcon, label: t('adminLayout.opsHealth', 'Ops Health') },
    { to: '/admin/broadcast', icon: MegaphoneIcon, label: t('adminLayout.broadcast', 'Broadcast') },
  ];

  return (
    <div className="min-h-screen bg-brand-void">
      <header className="border-b border-brand-border/60 bg-brand-deep/90 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-6">
          {/* Row 1: brand ↔ identity/logout — two independent clusters so
              wrapping (narrow screens only) never interleaves them. */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-3 border-b border-white/5">
            <NavLink to="/admin" className="flex items-center gap-2 font-black text-white text-sm">
              <span aria-hidden className={accent}>
                🌙
              </span>
              {t('adminLayout.brand', 'Bustandeen Admin')}
            </NavLink>
            <div className="flex items-center gap-3 text-xs">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1 text-white/40 hover:text-white transition-colors"
              >
                {t('adminLayout.viewPublicSite', 'Public site')}
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
              </a>
              <span className="w-px h-4 bg-white/10 hidden sm:block" aria-hidden />
              <span className="flex items-center gap-1.5 text-white/60">
                <span className="truncate max-w-[160px] sm:max-w-none">{email}</span>
                {role && (
                  <span
                    className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      isServant
                        ? 'bg-brand-gold/15 text-brand-gold'
                        : 'bg-brand-emerald/15 text-brand-emerald'
                    }`}
                  >
                    {isServant ? t('adminGate.servant', 'Servant') : t('adminGate.ansar', 'Ansar')}
                  </span>
                )}
              </span>
              <button
                onClick={() => logout.mutate()}
                title={t('adminGate.logOut', 'Log out')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('adminGate.logOut', 'Log out')}</span>
              </button>
            </div>
          </div>

          {/* Row 2: primary review-queue tabs, scoped strictly to what this
              admin's role/domain can access — must match AdminHome.tsx's own
              card-grid gating exactly, or a domain-scoped Ansar sees a tab
              for a section the API will 403 them out of.
              ToolsMenu is a SIBLING of the overflow-x-auto tab strip, not a
              child of it — CSS gives an element `overflow-x: auto` an
              implicit `overflow-y: auto` too (an axis left `visible` while
              the other is set to anything else computes to `auto`), which
              was silently clipping the dropdown's vertical overflow whenever
              it lived inside that scroll container. */}
          <nav className="flex items-center gap-1 py-2">
            <div className="flex items-center gap-1 overflow-x-auto">
              {canSeeSadaqah && (
                <NavLink to="/admin/sadaqah" className={navItemClass}>
                  <BanknotesIcon className="w-4 h-4" />
                  {t('adminLayout.sadaqah', 'Sadaqah')}
                </NavLink>
              )}
              {canSeeZikrRequests && (
                <NavLink to="/admin/zikr-requests" className={navItemClass}>
                  <InboxStackIcon className="w-4 h-4" />
                  {t('adminLayout.zikrRequests', 'Zikr Requests')}
                </NavLink>
              )}
              {canSeeZikrRequests && (
                <NavLink to="/admin/feedback" className={navItemClass}>
                  <EnvelopeIcon className="w-4 h-4" />
                  {t('adminLayout.feedback', 'Feedback')}
                </NavLink>
              )}
              {canSeeZikrRequests && (
                <NavLink to="/admin/zikr-audio" className={navItemClass}>
                  <SpeakerWaveIcon className="w-4 h-4" />
                  {t('adminLayout.zikrAudio', 'Zikr Audio')}
                </NavLink>
              )}
            </div>
            {isServant && (
              <>
                <span className="w-px h-5 bg-white/10 mx-1 shrink-0" aria-hidden />
                <ToolsMenu links={toolLinks} />
              </>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
