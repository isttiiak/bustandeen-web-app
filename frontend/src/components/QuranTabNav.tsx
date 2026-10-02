import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  Cog6ToothIcon,
  Bars3Icon,
  CheckIcon,
  BookOpenIcon,
  QueueListIcon,
  SpeakerWaveIcon,
  BookmarkIcon,
  AcademicCapIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import QuranSettings from './QuranSettings.js';
import { SEGMENT } from './TabNav.js';
import { Star8Icon } from './icons/IslamicIcons.js';

/**
 * The Quran section's six rooms + the settings drawer, available on EVERY
 * Quran page (Istiak's spec).
 *
 * RESPONSIVE (Istiak): six pills never fit a phone — they squashed and broke.
 * On small screens this collapses into a single MENU button showing the current
 * room, which opens a sheet listing every room plus Settings. From `sm` up the
 * familiar pill row returns (scrollable, never squashed).
 */
const TAB_DEFS = [
  { id: 'home', labelKey: 'quranTabs.quran', fallback: 'Quran', to: '/quran', Icon: BookOpenIcon },
  {
    id: 'khatam',
    labelKey: 'quranTabs.khatam',
    fallback: 'Khatam',
    to: '/quran/khatam',
    Icon: Star8Icon,
  },
  {
    id: 'read',
    labelKey: 'quranTabs.read',
    fallback: 'Read',
    to: '/quran/browse',
    Icon: QueueListIcon,
  },
  {
    id: 'listen',
    labelKey: 'quranTabs.listen',
    fallback: 'Listen',
    to: '/quran/listen',
    Icon: SpeakerWaveIcon,
  },
  {
    id: 'bookmarks',
    labelKey: 'quranTabs.saved',
    fallback: 'Saved',
    to: '/quran/bookmarks',
    Icon: BookmarkIcon,
  },
  {
    id: 'hifz',
    labelKey: 'quranTabs.hifz',
    fallback: 'Hifz',
    to: '/quran/hifz',
    Icon: AcademicCapIcon,
  },
  {
    id: 'analytics',
    labelKey: 'quranTabs.analytics',
    fallback: 'Analytics',
    to: '/quran/analytics',
    Icon: ChartBarIcon,
  },
] as const;

const ICON = 'w-4 h-4 shrink-0';
const SQUARE_BTN =
  'rounded-control border border-brand-border bg-brand-deep shadow-elev-1 text-white/70 hover:text-white hover:border-brand-emerald/40 transition-colors shrink-0';

export type QuranTab = (typeof TAB_DEFS)[number]['id'];

export default function QuranTabNav({ active }: { active: QuranTab }) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const TABS = TAB_DEFS.map((d) => ({ ...d, label: t(d.labelKey, d.fallback) }));
  const activeTab = TABS.find((tab) => tab.id === active) ?? TABS[0];

  // Close the sheet on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="relative">
      {/* ── Mobile: menu button + settings, always both visible so settings
          is reachable in one tap from every Quran page, not buried inside
          the room-picker sheet. ── */}
      <div className="sm:hidden flex items-center gap-2">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex-1 flex items-center justify-between gap-2 rounded-control border border-brand-border bg-brand-deep shadow-elev-1 px-3.5 py-2.5 text-white font-bold text-sm"
        >
          <span className="flex items-center gap-2 min-w-0">
            <activeTab.Icon className={`${ICON} text-brand-emerald`} aria-hidden="true" />
            <span className="truncate">{activeTab.label}</span>
          </span>
          <Bars3Icon className="w-5 h-5 text-white/50 shrink-0" />
        </button>
        <button
          aria-label={t('quranSettings.title', 'Quran settings')}
          className={`p-2.5 ${SQUARE_BTN}`}
          onClick={() => setSettingsOpen(true)}
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
      </div>

      {/* ── sm and up: the pill row ── */}
      <div className="hidden sm:flex items-center gap-2">
        <div className={`flex-1 overflow-x-auto ${SEGMENT.track}`}>
          {TABS.map((tab) =>
            tab.id === active ? (
              <span
                key={tab.id}
                aria-current="page"
                className={`shrink-0 flex items-center gap-1.5 text-xs py-1.5 whitespace-nowrap px-3 ${SEGMENT.active}`}
              >
                <tab.Icon className={`${ICON} text-brand-emerald`} aria-hidden="true" />
                {tab.label}
              </span>
            ) : (
              <Link
                key={tab.id}
                to={tab.to}
                className={`shrink-0 flex items-center gap-1.5 text-xs py-1.5 whitespace-nowrap px-3 ${SEGMENT.idle}`}
              >
                <tab.Icon className={ICON} aria-hidden="true" />
                {tab.label}
              </Link>
            )
          )}
        </div>
        <button
          aria-label={t('quranSettings.title', 'Quran settings')}
          className={`p-2 ${SQUARE_BTN}`}
          onClick={() => setSettingsOpen(true)}
        >
          <Cog6ToothIcon className="w-4 h-4" />
        </button>
      </div>

      {/* ── Mobile menu sheet ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="sm:hidden fixed inset-0 z-40 bg-black/40"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              role="menu"
              className="sm:hidden absolute left-0 right-0 top-full mt-2 z-50 rounded-card border border-brand-border bg-brand-deep shadow-elev-3 overflow-hidden"
            >
              {TABS.map((t) => (
                <Link
                  key={t.id}
                  to={t.to}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 text-sm border-b border-brand-border last:border-0 transition-colors ${
                    t.id === active
                      ? 'bg-brand-emerald/10 text-brand-emerald font-bold'
                      : 'text-white/80 active:bg-shade/10'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <t.Icon className={ICON} aria-hidden="true" />
                    {t.label}
                  </span>
                  {t.id === active && <CheckIcon className="w-4 h-4" />}
                </Link>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <QuranSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
