import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth } from '../firebase.js';
import { signOut } from 'firebase/auth';
import logo from '../assets/logo.svg';
import { useAuthStore } from '../store/useAuthStore.js';
import { useZikrStore } from '../store/useZikrStore.js';
import { useNoor } from '../hooks/useSocial.js';
import { useUiStore } from '../store/useUiStore.js';
import { getHijriToday, formatHijriDate } from '../utils/islamicCalendar.js';
import { formatLocaleDate, formatLocaleNumber } from '../utils/localeDate.js';
import {
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  HeartIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import i18n from '../i18n.js';
import { syncQuranTranslationWithLang } from '../utils/quranData.js';

// ── Page metadata ─────────────────────────────────────────────────────────────
// i18n keys for the translatable page titles (fallback = the English title)
const PAGE_KEYS: Record<string, string> = {
  '/zikr': 'nav.zikrCounter',
  '/zikr/analytics': 'nav.zikrAnalytics',
  '/salat': 'nav.salatTracker',
  '/salat/analytics': 'nav.salatAnalytics',
  '/fasting': 'nav.fasting',
  '/fasting/analytics': 'nav.fastingAnalytics',
  '/prayer-times': 'nav.prayerTimes',
  '/qibla': 'nav.qibla',
  '/quran': 'nav.quranHabit',
  '/friends': 'nav.friends',
  '/settings': 'nav.settings',
  '/profile': 'nav.myProfile',
  '/naseeh': 'nav.naseeh',
};
const PAGE_META: Record<string, { title: string; emoji: string }> = {
  '/zikr': { title: 'Zikr Counter', emoji: '📿' },
  '/zikr/analytics': { title: 'Zikr Analytics', emoji: '📊' },
  '/salat': { title: 'Salat Tracker', emoji: '🕌' },
  '/salat/analytics': { title: 'Salat Analytics', emoji: '📊' },
  '/fasting': { title: 'Fasting', emoji: '🌙' },
  '/fasting/analytics': { title: 'Fasting Analytics', emoji: '📊' },
  '/prayer-times': { title: 'Prayer Times', emoji: '🕐' },
  '/qibla': { title: 'Qibla Compass', emoji: '🧭' },
  '/quran': { title: 'Quran Habit', emoji: '📖' },
  '/friends': { title: 'Friends', emoji: '🤝' },
  '/settings': { title: 'Settings', emoji: '⚙️' },
  '/about': { title: 'About Bustandeen', emoji: '🌱' },
  '/privacy': { title: 'Privacy', emoji: '🔒' },
  '/feedback': { title: 'Feedback', emoji: '💬' },
  '/contact': { title: 'Contact Us', emoji: '📨' },
  '/profile': { title: 'My Profile', emoji: '👤' },
  '/naseeh': { title: 'Naseeh', emoji: '✨' },
};

// Maps each page to its logical parent for the back button
const PARENT_ROUTES: Record<string, string> = {
  '/zikr': '/',
  '/zikr/analytics': '/zikr',
  '/salat': '/',
  '/salat/analytics': '/salat',
  '/fasting': '/',
  '/fasting/analytics': '/fasting',
  '/prayer-times': '/',
  '/qibla': '/prayer-times',
  '/quran': '/',
  '/friends': '/',
  '/settings': '/',
  '/about': '/',
  '/privacy': '/',
  '/feedback': '/',
  '/contact': '/',
  '/profile': '/',
  '/naseeh': '/',
};

// ── Typewriter greeting ───────────────────────────────────────────────────────
function TextType({ text, speed = 55 }: { text: string; speed?: number }) {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    let i = 0;
    setDisplay('');
    const id = setInterval(() => {
      setDisplay(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <span
      style={{
        backgroundImage:
          'linear-gradient(90deg,var(--brand-emerald,#7a9e6e) 0%,var(--brand-gold,#c9a96e) 50%,var(--brand-warm,#c4825a) 100%)',
        backgroundSize: '200% 100%',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        animation: 'navbarShimmer 10s linear infinite',
      }}
    >
      {display}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  /** translated page title with English fallback */
  const pageTitle = (path: string, fallback: string) =>
    PAGE_KEYS[path] ? t(PAGE_KEYS[path]!, { defaultValue: fallback }) : fallback;
  const { user, setUser, aiEnabled } = useAuthStore();
  const resetAll = useZikrStore((s) => s.resetAll);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isHome = location.pathname === '/';
  const pageMeta = PAGE_META[location.pathname];
  const parentPath = PARENT_ROUTES[location.pathname] ?? '/';
  const parentMeta =
    parentPath === '/'
      ? { title: 'Home', emoji: '🏠' }
      : (PAGE_META[parentPath] ?? { title: 'Home', emoji: '🏠' });

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname]);

  // Noor capsules: always on /friends; elsewhere per the Settings toggles
  const { showNoorAllTime, showNoorToday, discreetMode } = useUiStore();
  const onFriendsPage = location.pathname === '/friends';
  const noorTodayVisible = onFriendsPage || showNoorToday;
  const noorAllTimeVisible = onFriendsPage || showNoorAllTime;
  const { data: noor } = useNoor(!!user && (noorTodayVisible || noorAllTimeVisible));

  const firstName = user?.displayName?.split(' ')[0] ?? '';
  const greeting = `${t('home.greeting')}${firstName ? ', ' + firstName : ''}`;

  // ── Center content by route ───────────────────────────────────────────────
  const hijriToday = (() => {
    const h = getHijriToday();
    return h ? formatHijriDate(h) : null;
  })();

  const todayEnglish = (() => {
    return formatLocaleDate(new Date(), { month: 'short', day: 'numeric', year: 'numeric' });
  })();

  const centerContent = (() => {
    if (isHome && user) {
      return (
        <div className="hidden sm:flex flex-col items-center truncate">
          <span className="text-sm font-bold leading-tight">
            <TextType text={greeting} speed={50} />
          </span>
        </div>
      );
    }
    return null;
  })();

  return (
    <>
      <nav className="sticky top-0 z-40 bg-gradient-to-r from-[#14130e] via-brand-deep to-brand-deep border-b border-brand-emerald/20 shadow-[0_2px_16px_rgba(122,158,110,0.08)]">
        <div className="flex items-center h-14 px-2 sm:px-4 gap-1 sm:gap-2">
          {/* ── Left: logo + back + title ─────────────────── */}
          <div className="flex items-center gap-0.5 flex-shrink-0 min-w-0">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-white/10 transition-all group"
            >
              <img src={logo as string} alt="Bustandeen" className="w-5 h-5 flex-shrink-0" />
              <span className="font-display font-bold text-white text-sm hidden sm:inline group-hover:text-brand-emerald transition-colors">
                Bustandeen
              </span>
            </Link>

            {!isHome && (
              <div className="flex items-center gap-0.5 min-w-0">
                <button
                  onClick={() => navigate(parentPath)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs font-medium flex-shrink-0"
                >
                  <ArrowLeftIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {parentMeta.emoji}{' '}
                    {parentPath === '/' ? t('nav.home') : pageTitle(parentPath, parentMeta.title)}
                  </span>
                </button>

                {pageMeta && (
                  <div className="flex items-center gap-1 min-w-0 pl-1">
                    <span className="text-white/15 text-sm hidden sm:inline">|</span>
                    <span className="text-sm shrink-0" aria-hidden>
                      {pageMeta.emoji}
                    </span>
                    <span className="font-semibold text-white/70 text-xs sm:text-sm truncate max-w-[70px] sm:max-w-[130px]">
                      {pageTitle(location.pathname, pageMeta.title)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Center ────────────────────────────────────── */}
          <div className="flex-1 flex justify-center items-center overflow-hidden px-1">
            {centerContent}
            {isHome && user && (
              <div className="sm:hidden min-w-0 overflow-hidden">
                <span
                  className="text-xs font-bold truncate block"
                  style={{
                    backgroundImage:
                      'linear-gradient(90deg,var(--brand-emerald,#7a9e6e) 0%,var(--brand-gold,#c9a96e) 50%,var(--brand-warm,#c4825a) 100%)',
                    backgroundSize: '200% 100%',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    WebkitTextFillColor: 'transparent',
                    animation: 'navbarShimmer 10s linear infinite',
                  }}
                >
                  {greeting}
                </span>
              </div>
            )}
          </div>

          {/* ── Right: lang + noor + profile ────────────────── */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Language toggle — cycles en ↔ bn */}
            <button
              onClick={() => {
                const next = i18n.resolvedLanguage === 'bn' ? 'en' : 'bn';
                void i18n.changeLanguage(next);
                syncQuranTranslationWithLang(next);
              }}
              aria-label={t('nav.switchLang')}
              className="flex items-center gap-1 px-1 sm:px-2 py-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <GlobeAltIcon className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase hidden sm:inline">
                {i18n.resolvedLanguage === 'bn' ? 'EN' : 'বা'}
              </span>
            </button>
            {user && noor && (noorTodayVisible || noorAllTimeVisible) && (
              <div className="flex items-center gap-0.5 sm:gap-1">
                {noorTodayVisible && (
                  <div
                    className="tooltip tooltip-bottom"
                    data-tip="Today's Noor — fresh light every day, resets at midnight"
                  >
                    <span className="px-1 sm:px-2 py-0.5 rounded-full bg-brand-emerald/15 border border-brand-emerald/40 text-brand-emerald text-xs font-bold flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
                      ✨ {formatLocaleNumber(noor.today)}
                    </span>
                  </div>
                )}
                {noorAllTimeVisible && (
                  // Hidden below sm (640px) — below that, the left (back+title)
                  // and right (lang+noor+avatar) nav sections don't both fit at
                  // their minimum widths even after trimming padding, and on
                  // some pages (Friends, which forces both badges) both badges
                  // together pushed the profile avatar fully off-screen behind
                  // the global `overflow-x:hidden` even at 375px — a much wider
                  // phone than the old 360px cutoff assumed. Today's Noor is the
                  // more actionable one, so it stays; all-time drops first.
                  <div
                    className="hidden sm:block tooltip tooltip-bottom"
                    data-tip="All-time Noor — every day's light, gathered. Never resets"
                  >
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-brand-gold/15 border border-brand-gold/40 text-brand-gold text-xs font-bold flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
                      🌟 {formatLocaleNumber(noor.allTime ?? 0)}
                    </span>
                  </div>
                )}
              </div>
            )}
            {/* Date display — home page only */}
            {isHome && user && (
              <div className="hidden md:flex flex-col items-end mr-2 shrink-0 px-2 py-1 rounded-xl bg-white/5 border border-brand-border/60">
                <span className="text-white/80 text-xs font-bold leading-none">{todayEnglish}</span>
                {hijriToday && (
                  <span className="text-brand-gold/70 text-[10px] font-medium leading-none mt-0.5">
                    {hijriToday}
                  </span>
                )}
              </div>
            )}

            {user ? (
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-label={t('navbar.openAccountMenu', 'Open account menu')}
                  aria-expanded={dropdownOpen}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ring-2 ${dropdownOpen ? 'ring-brand-emerald scale-105' : 'ring-brand-emerald/30 hover:ring-brand-emerald/70'}`}
                >
                  {user.photoUrl ? (
                    <img
                      alt="Profile"
                      src={user.photoUrl}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-emerald/30 flex items-center justify-center">
                      <span className="text-xs font-black text-white">
                        {user.displayName?.[0]?.toUpperCase() ??
                          user.email?.[0]?.toUpperCase() ??
                          'U'}
                      </span>
                    </div>
                  )}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-brand-deep border border-brand-border rounded-2xl z-50 w-64 shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-brand-border/60 bg-brand-surface/60">
                      <div className="flex items-center gap-3">
                        {user.photoUrl ? (
                          <img
                            src={user.photoUrl}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-emerald/40 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-brand-emerald/20 ring-2 ring-brand-emerald/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-black text-brand-emerald">
                              {user.displayName?.[0]?.toUpperCase() ?? 'U'}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-bold text-sm truncate leading-snug">
                            {user.displayName ?? 'User'}
                          </p>
                          <p className="text-white/30 text-xs truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 text-sm transition-colors"
                      >
                        <UserCircleIcon className="w-4 h-4 text-brand-emerald/70" />
                        {t('nav.editProfile')}
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 text-sm transition-colors"
                      >
                        <Cog6ToothIcon className="w-4 h-4 text-white/40" />
                        {t('nav.settings')}
                      </Link>
                      {aiEnabled && (
                        <Link
                          to="/naseeh"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-brand-emerald/10 text-sm transition-colors"
                        >
                          <span className="w-4 h-4 grid place-items-center text-sm leading-none">
                            ✨
                          </span>
                          {t('nav.naseeh', 'Naseeh')}
                        </Link>
                      )}
                      <Link
                        to="/about"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 text-sm transition-colors"
                      >
                        <InformationCircleIcon className="w-4 h-4 text-brand-gold/60" />
                        {t('nav.aboutUs')}
                      </Link>
                      <Link
                        to="/privacy"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 text-sm transition-colors"
                      >
                        <ShieldCheckIcon className="w-4 h-4 text-brand-info/60" />
                        {t('nav.privacy')}
                      </Link>

                      {user.gender === 'female' && (
                        <Link
                          to="/cycle"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-brand-pink/10 text-sm transition-colors"
                        >
                          <span className="w-4 h-4 grid place-items-center text-brand-pink/90 text-sm leading-none">
                            {discreetMode ? '🍃' : '🌸'}
                          </span>
                          {discreetMode ? t('nav.wellness', 'Wellness') : t('nav.rayhanahCycle')}
                        </Link>
                      )}

                      {/* One link, not one per admin section — the admin panel has its
                          own separate Servant/Ansar sign-in either way (see AdminGate),
                          so a deep link here would only look like a shortcut it isn't. */}
                      {user.isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-brand-gold/10 text-sm transition-colors"
                        >
                          <LockClosedIcon className="w-4 h-4 text-brand-gold/70" />
                          {t('nav.adminPanel', 'Admin Panel')}
                        </Link>
                      )}

                      {/* Feedback — set apart with a thin, low-opacity border */}
                      <Link
                        to="/feedback"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 mt-1 rounded-xl border border-brand-emerald/15 text-white/70 hover:text-white hover:bg-white/5 hover:border-brand-emerald/40 text-sm transition-colors"
                      >
                        <ChatBubbleLeftRightIcon className="w-4 h-4 text-brand-emerald/70" />
                        {t('nav.feedbackContact')}
                      </Link>

                      {/* Sadaqah — visible to everyone, not just admins, right
                          before sign-out so it's seen without being loud. */}
                      <Link
                        to="/sadaqah"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-brand-gold/10 text-sm transition-colors"
                      >
                        <HeartIcon className="w-4 h-4 text-brand-gold/70" />
                        {t('nav.sadaqah', 'Sadaqah')}
                      </Link>

                      <div className="border-t border-brand-border/60 mt-1 pt-1">
                        <button
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 text-sm transition-colors"
                          onClick={() => {
                            setDropdownOpen(false);
                            setConfirmLogout(true);
                          }}
                        >
                          <ArrowRightOnRectangleIcon className="w-4 h-4" />
                          {t('nav.signOut')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="ml-1 px-3 py-1.5 rounded-xl bg-brand-emerald hover:bg-brand-emerald-dim text-white text-xs font-semibold transition-all shadow-md"
                onClick={() => sessionStorage.setItem('bustandeen_redirect', location.pathname)}
              >
                {t('nav.signIn')}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Sign out confirmation ─────────────────────────────────────────── */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card bg-brand-surface border border-brand-border shadow-2xl w-full max-w-sm">
            <div className="card-body gap-4 p-6">
              <h3 className="text-lg font-black text-brand-emerald">{t('nav.signOutConfirm')}</h3>
              <p className="text-sm text-white/60">{t('nav.signOutMsg')}</p>
              <div className="flex gap-3 justify-end">
                <button
                  className="btn btn-ghost btn-sm text-white/60"
                  onClick={() => setConfirmLogout(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className="btn btn-sm bg-red-500 hover:bg-red-600 text-white border-0"
                  onClick={async () => {
                    await signOut(auth);
                    setUser(null);
                    localStorage.removeItem('bustandeen_user');
                    localStorage.removeItem('bustandeen_idToken');
                    sessionStorage.removeItem('bustandeen_redirect');
                    resetAll();
                    setConfirmLogout(false);
                    navigate('/', { replace: true });
                  }}
                >
                  {t('nav.signOut')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
