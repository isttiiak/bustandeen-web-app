// Salat tracker building blocks (audit T2.4: moved out of pages/SalatTracker.tsx
// unchanged): date helpers, status styles, the sunnah guidance row and the
// missed-day chips of the kaza panel.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getTrackingDay } from '../../utils/trackingDay.js';
import type { PrayerId, PrayerLocation, PrayerStatus } from '../../hooks/useSalatLog.js';
import type { SunnahSlot } from '../../utils/sunnahGuide.js';
import { formatLocaleDate } from '../../utils/localeDate.js';
import { translateReference } from '../../utils/localeReference.js';
import {
  BackwardIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ForwardIcon,
  HomeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { MosqueIcon, type IconProps } from '../icons/IslamicIcons.js';

// ─── helpers ────────────────────────────────────────────────────────────────

// Nafl is prayed in pairs — two rak'ahs is the smallest unit here. (Witr, the
// one odd-numbered prayer, is NOT tracked in this section: it belongs to Isha,
// not to voluntary rak'ah counting — Istiak's spec.)
export const MIN_RAKAT = 2;

export function isRamadanNow(): boolean {
  try {
    const month = parseInt(
      new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { month: 'numeric' }).format(
        new Date()
      ),
      10
    );
    return month === 9;
  } catch {
    return false;
  }
}

export function todayStr() {
  // Fajr boundary: before today's Fajr the "tracking day" is still yesterday.
  // Isha at 2 AM and Tahajjud before Fajr belong to the closing Islamic day.
  // Fallback to civil midnight when no location is saved.
  return getTrackingDay();
}
export function offsetDate(base: string, delta: number): string {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function isFuturePrayer(
  prayerId: string,
  todayTimes: Record<string, Date> | null | undefined
): boolean {
  if (!todayTimes) return false;
  const t = todayTimes[prayerId];
  return !!t && t > new Date();
}
export function isCurrentPrayer(prayerId: string, currentId: string | undefined): boolean {
  return prayerId === currentId;
}

/** One before/after sunnah-rak'ah guidance row — same visual contract as the
 * existing Witr reminder block (gold accent), just re-colored per emphasis:
 * emerald for Sunnah Mu'akkadah (confirmed), info-blue for the lighter
 * ghair-mu'akkadah/nafl set, so the two toggles read as visually distinct. */
export function SunnahGuidanceRow({
  slot,
  position,
  lang,
}: {
  slot: SunnahSlot;
  position: 'before' | 'after';
  lang: string;
}) {
  const { t } = useTranslation();
  const muakkadah = slot.emphasis === 'muakkadah';
  // Tailwind's JIT scanner needs literal class strings — a templated
  // `border-${accent}/20` would never get generated into the built CSS.
  const cls = muakkadah
    ? {
        wrap: 'px-3 py-2.5 border-t border-brand-emerald/20 flex items-start gap-2 bg-brand-emerald/5',
        icon: 'text-brand-emerald',
        title: 'text-brand-emerald font-bold text-xs leading-tight',
        sub: 'text-brand-emerald/70 font-normal',
        link: 'text-brand-emerald/50 text-xs underline hover:text-brand-emerald/80 transition-colors mt-0.5 inline-block',
      }
    : {
        wrap: 'px-3 py-2.5 border-t border-brand-info/20 flex items-start gap-2 bg-brand-info/5',
        icon: 'text-brand-info',
        title: 'text-brand-info font-bold text-xs leading-tight',
        sub: 'text-brand-info/70 font-normal',
        link: 'text-brand-info/50 text-xs underline hover:text-brand-info/80 transition-colors mt-0.5 inline-block',
      };
  return (
    <div className={cls.wrap}>
      {position === 'before' ? (
        <BackwardIcon className={`w-4 h-4 mt-px shrink-0 ${cls.icon}`} aria-hidden="true" />
      ) : (
        <ForwardIcon className={`w-4 h-4 mt-px shrink-0 ${cls.icon}`} aria-hidden="true" />
      )}
      <div className="min-w-0">
        <p className={cls.title}>
          {position === 'before'
            ? t('salatTracker.sunnahBefore', '{{rakat}} rakʿah sunnah before', {
                rakat: slot.rakat,
              })
            : t('salatTracker.sunnahAfter', '{{rakat}} rakʿah sunnah after', { rakat: slot.rakat })}
          {' · '}
          <span className={cls.sub}>
            {muakkadah
              ? t('salatTracker.sunnahMuakkadah', 'Muʾakkadah (confirmed)')
              : t('salatTracker.sunnahGhairMuakkadah', 'Nafl (recommended)')}
          </span>
        </p>
        <p className="text-white/30 text-xs leading-relaxed mt-0.5">{slot.note}</p>
        <a
          href={slot.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cls.link}
        >
          <RefIcon />
          {translateReference(slot.source, lang)} · {translateReference(slot.grade, lang)}
        </a>
      </div>
    </div>
  );
}
/** Small book mark before a hadith/Quran source link (replaces the 📖 emoji). */
export function RefIcon() {
  return <BookOpenIcon className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />;
}

/** "Details" / "Less" disclosure label with a chevron (replaces ▾ / ▲). */
export function DisclosureLabel({ open }: { open: boolean }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1">
      {open ? t('salatTracker.less', 'Less') : t('salatTracker.details', 'Details')}
      {open ? (
        <ChevronUpIcon className="w-3 h-3" aria-hidden="true" />
      ) : (
        <ChevronDownIcon className="w-3 h-3" aria-hidden="true" />
      )}
    </span>
  );
}

/** Day dot class for the week strip and month calendar (theme tokens). */
export function dayDotClass(completed: number): string {
  if (completed >= 5) return 'bg-brand-emerald';
  if (completed >= 3) return 'bg-brand-gold';
  if (completed >= 1) return 'bg-brand-warm';
  return 'bg-red-400'; // logged nothing that day
}

export function friendlyDate(
  dateStr: string,
  tr?: (key: string, fallback: string) => string
): string {
  const today = todayStr();
  const yesterday = offsetDate(today, -1);
  if (dateStr === today) return tr ? tr('common.today', 'Today') : 'Today';
  if (dateStr === yesterday) return tr ? tr('salat.yesterday', 'Yesterday') : 'Yesterday';
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ─── types ───────────────────────────────────────────────────────────────────

export interface SubTagDef {
  value: PrayerLocation;
  label: string;
  Icon: (p: IconProps) => React.ReactNode;
  note: string;
}

export const LOCATION_TAGS: SubTagDef[] = [
  { value: 'mosque', label: 'At Mosque', Icon: MosqueIcon, note: 'in jamat' },
  { value: 'jamat', label: 'In Jamat', Icon: UserGroupIcon, note: 'not at mosque' },
  { value: 'home', label: 'At Home', Icon: HomeIcon, note: 'alone' },
];

// Card tint per status (Bustan Arch: quiet tints on the deep card, no glow)
export const STATUS_STYLE: Record<PrayerStatus, { bg: string; border: string; text: string }> = {
  completed: {
    bg: 'bg-brand-emerald/[0.07]',
    border: 'border-brand-emerald/40',
    text: 'text-brand-emerald',
  },
  kaza: {
    bg: 'bg-brand-gold/[0.07]',
    border: 'border-brand-gold/40',
    text: 'text-brand-gold',
  },
  missed: { bg: 'bg-red-400/[0.06]', border: 'border-red-400/35', text: 'text-red-400' },
  pending: {
    bg: 'bg-brand-deep',
    border: 'border-brand-border',
    text: 'text-white/70',
  },
};

// ─── MissedDayChips ──────────────────────────────────────────────────────────
// Clickable date chips inside the kaza debt panel. Shows recent days that had
// at least one missed prayer (completed < 5). First row is always visible;
// extra rows expand on demand.

const CHIPS_PER_ROW = 5;
const INITIAL_ROWS = 1;
const MAX_EXPANDED_ROWS = 3;

export function MissedDayChips({
  calendarDataMap,
  t,
  setSelectedDate,
  setExpandedPrayer,
  setCalendarOpen,
}: {
  calendarDataMap: Map<string, number>;
  t: (key: string, fallback: string, opts?: Record<string, unknown>) => string;
  setSelectedDate: (d: string) => void;
  setExpandedPrayer: (p: PrayerId | null) => void;
  setCalendarOpen: (v: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const today = todayStr();
  const missedDays = Array.from(calendarDataMap.entries())
    .filter(([d, c]) => d < today && c < 5)
    .sort(([a], [b]) => b.localeCompare(a)); // newest first

  if (missedDays.length === 0) return null;

  const visibleCount = expanded
    ? Math.min(missedDays.length, CHIPS_PER_ROW * MAX_EXPANDED_ROWS)
    : CHIPS_PER_ROW * INITIAL_ROWS;
  const visible = missedDays.slice(0, visibleCount);
  const hasMore = missedDays.length > CHIPS_PER_ROW * INITIAL_ROWS;

  return (
    <div className="pt-2.5 mt-1 border-t border-brand-border/50 space-y-2">
      <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wide">
        {t('salatTracker.kazaJumpTitle', 'Quick-mark kaza')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map(([d]) => (
          <button
            key={d}
            onClick={() => {
              setSelectedDate(d);
              setExpandedPrayer(null);
              setCalendarOpen(false);
            }}
            className="px-2 py-1 rounded-control bg-brand-deep border border-brand-gold/25 text-brand-gold/80 hover:border-brand-gold/60 hover:text-brand-gold text-[11px] font-semibold transition-colors"
          >
            {friendlyDate(d, t)}
          </button>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-white/50 hover:text-white text-[11px] underline underline-offset-2 transition-colors"
        >
          {expanded
            ? t('salatTracker.kazaJumpLess', 'Show fewer dates')
            : t('salatTracker.kazaJumpMore', 'Show more dates ({{count}})', {
                count: missedDays.length - visibleCount,
              })}
        </button>
      )}
    </div>
  );
}
