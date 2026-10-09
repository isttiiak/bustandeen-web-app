import React, { useEffect, useState } from 'react';
import { m as motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import i18n, { LANGUAGES } from '../i18n.js';
import { useQueryClient } from '@tanstack/react-query';
import {
  signOut,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  browserPopupRedirectResolver,
  EmailAuthProvider,
  type AuthError,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase.js';
import api, { API_BASE, getIdToken } from '../lib/api.js';
import {
  getHijriAdjustment,
  setHijriAdjustment,
  getHijriToday,
  formatHijriDate,
} from '../utils/islamicCalendar.js';
import {
  getDayStartMode,
  setDayStartModeLocal,
  getTrackingDay,
  type DayStartMode,
} from '../utils/trackingDay.js';
import { syncQuranTranslationWithLang } from '../utils/quranData.js';
import {
  useMusafir,
  startMusafir,
  endMusafir,
  defaultSchool,
  journeyDay,
  schoolMeta,
  suggestStartAfter,
} from '../utils/musafir.js';
import { translateSalatName } from '../utils/prayerTimes.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useUiStore } from '../store/useUiStore.js';
import { useUpdateProfile } from '../hooks/useUserProfile.js';
import { useGroqKeyStatus, useSetGroqKey, useClearGroqKey } from '../hooks/useAi.js';
import { formatLocaleDate } from '../utils/localeDate.js';
import AnimatedBackground from '../components/AnimatedBackground.js';
import ZikrLibrarySection from '../components/ZikrLibrarySection.js';
import TrackingDayInfoModal from '../components/TrackingDayInfoModal.js';
import {
  Cog6ToothIcon,
  SparklesIcon,
  MoonIcon,
  EyeIcon,
  ClockIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ShieldCheckIcon,
  LanguageIcon,
  KeyIcon,
  PencilSquareIcon,
  SwatchIcon,
  SunIcon,
  DevicePhoneMobileIcon,
  BookOpenIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  HomeIcon,
  RectangleStackIcon,
  QueueListIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import type { HomeSpecialLayout } from '../utils/homeSpecial.js';
import { getThemeMode, setThemeMode, THEME_MODE_EVENT, type ThemeMode } from '../utils/theme.js';
import {
  CrescentIcon,
  FlowerIcon,
  LeafIcon,
  MosqueIcon,
  SunriseIcon,
  TasbihIcon,
} from '../components/icons/IslamicIcons.js';
import { BTN_SECONDARY, CARD, ITEM, SECTION_TITLE } from '../components/bustanStyles.js';

type SvgIcon = (p: { className?: string }) => React.ReactNode;

/** A chosen / not chosen option tile (theme, language, day start). */
const OPTION_ON = 'bg-brand-emerald/10 border-brand-emerald text-white';
const OPTION_OFF =
  'bg-brand-surface/50 border-brand-border text-white/80 hover:text-white hover:border-brand-emerald/40';
/** A quiet inline button inside a card (Change, Cancel, Clear). */
const BTN_QUIET =
  'inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-bold text-white/75 hover:text-white hover:bg-brand-surface transition-colors';
/** A destructive action, quiet until confirmed. */
const BTN_DANGER_QUIET =
  'inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors';
const BTN_DANGER =
  'btn-solid inline-flex items-center justify-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-bold text-on-color bg-red-600 hover:bg-red-700 shadow-elev-1 transition-colors disabled:opacity-50';

// ── Unified danger zone (Istiak's spec): EVERY data-erase control lives here,
// grouped per feature, with full AND partial options. ─────────────────────────
interface DangerRow {
  id: string;
  label: string;
  detail: string;
  method: 'delete' | 'post' | 'patch';
  endpoint: string;
  body?: Record<string, unknown>;
  /** partial action (indented under the group's "everything" row) */
  sub?: boolean;
}
interface DangerGroup {
  id: string;
  Icon: SvgIcon;
  title: string;
  /** icon colour so groups are recognizable at a glance */
  tone: string;
  rows: DangerRow[];
}

const DANGER_GROUPS: DangerGroup[] = [
  {
    id: 'zikr',
    Icon: TasbihIcon,
    title: 'Zikr',
    tone: 'text-brand-emerald',
    rows: [
      {
        id: 'zikr-all',
        label: 'All zikr data',
        detail: 'Counts, daily history, goal & streak',
        method: 'delete',
        endpoint: '/api/zikr/all',
      },
    ],
  },
  {
    id: 'salat',
    Icon: MosqueIcon,
    title: 'Salat',
    tone: 'text-brand-info',
    rows: [
      {
        id: 'salat-all',
        label: 'All salat logs',
        detail: 'Every prayer log and its analytics',
        method: 'delete',
        endpoint: '/api/salat/all',
      },
    ],
  },
  {
    id: 'fasting',
    Icon: CrescentIcon,
    title: 'Fasting',
    tone: 'text-brand-gold',
    rows: [
      {
        id: 'fasting-all',
        label: 'All fasting data',
        detail: 'Every fast, qaḍā/kaffārah progress & vows',
        method: 'delete',
        endpoint: '/api/fasting/all',
      },
      {
        id: 'fasting-qada',
        label: 'Qaḍā only',
        detail: 'Make-up fast logs + the owed counter',
        method: 'delete',
        endpoint: '/api/fasting/category/qada',
        sub: true,
      },
      {
        id: 'fasting-kaffarah',
        label: 'Kaffārah only',
        detail: 'Expiation logs + its settings',
        method: 'delete',
        endpoint: '/api/fasting/category/kaffarah',
        sub: true,
      },
      {
        id: 'fasting-voluntary',
        label: 'Voluntary only',
        detail: 'Mon/Thu, white days, Arafah… logs',
        method: 'delete',
        endpoint: '/api/fasting/category/voluntary',
        sub: true,
      },
      {
        id: 'fasting-ramadan',
        label: 'Ramadan only',
        detail: 'Ramadan tracker logs (incl. tarawih)',
        method: 'delete',
        endpoint: '/api/fasting/category/ramadan',
        sub: true,
      },
      {
        id: 'fasting-vows',
        label: 'Vows (nadhr) only',
        detail: 'Vow fasts + the vow list itself',
        method: 'delete',
        endpoint: '/api/fasting/category/nadhr',
        sub: true,
      },
    ],
  },
  {
    id: 'quran',
    Icon: BookOpenIcon,
    title: 'Quran',
    tone: 'text-brand-info',
    rows: [
      {
        id: 'quran-all',
        label: 'All Quran data',
        detail: 'Reading logs, streak, bookmarks & khatm',
        method: 'delete',
        endpoint: '/api/quran/all',
      },
      {
        id: 'quran-khatam',
        label: 'Reset khatam journey',
        detail: 'Bookmark → 1:1, journey un-starts; completed count stays',
        method: 'post',
        endpoint: '/api/quran/khatam/reset',
        sub: true,
      },
      {
        id: 'quran-goal',
        label: 'Remove reading goal',
        detail: 'Back to no daily target; history stays',
        method: 'patch',
        endpoint: '/api/quran/profile',
        body: { dailyGoalAyat: 0 },
        sub: true,
      },
    ],
  },
  {
    id: 'hifz',
    Icon: AcademicCapIcon,
    title: 'Hifz',
    tone: 'text-brand-emerald',
    rows: [
      {
        id: 'hifz-all',
        label: 'All Hifz data',
        detail: 'Memorised āyāt, revision schedule & daily targets',
        method: 'delete',
        endpoint: '/api/hifz/all',
      },
      {
        id: 'hifz-cursor',
        label: 'Restart "add next āyah" cursor',
        detail: 'Back to 1:1; already-memorised āyāt keep their progress',
        method: 'post',
        endpoint: '/api/hifz/cursor/reset',
        sub: true,
      },
    ],
  },
  {
    id: 'cycle',
    Icon: FlowerIcon,
    title: 'Rayhanah Cycle',
    tone: 'text-brand-pink',
    rows: [
      {
        id: 'cycle-all',
        label: 'All cycle data',
        detail: 'History, wellness notes & settings, visible only to you',
        method: 'delete',
        endpoint: '/api/cycle/all',
      },
    ],
  },
];

function SectionCard({
  icon,
  title,
  subtitle,
  delay,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`${CARD} p-5 sm:p-6`}
    >
      <h2 className={SECTION_TITLE}>
        {icon}
        {title}
      </h2>
      {subtitle ? (
        <p className="text-white/70 text-xs mt-1 mb-4 leading-relaxed">{subtitle}</p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
    </motion.section>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  detail,
  accent = 'toggle-success',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  detail: string;
  accent?: string;
}) {
  return (
    <label className="flex items-center gap-4 p-3 rounded-control border border-brand-border bg-brand-surface/50 cursor-pointer hover:border-brand-emerald/40 transition-colors">
      <input
        type="checkbox"
        className={`toggle ${accent}`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="min-w-0">
        <p className="font-semibold text-white text-sm">{title}</p>
        <p className="text-white/70 text-xs leading-snug mt-0.5">{detail}</p>
      </div>
    </label>
  );
}

const THEME_ICONS: Record<ThemeMode, SvgIcon> = {
  system: DevicePhoneMobileIcon,
  dark: MoonIcon,
  light: SunIcon,
  daylight: SunriseIcon,
};

function ThemeModePicker({ t }: { t: (key: string) => string }) {
  const [mode, setMode] = useState<ThemeMode>(getThemeMode);
  // The navbar toggle can change the mode while this screen is open.
  useEffect(() => {
    const sync = () => setMode(getThemeMode());
    window.addEventListener(THEME_MODE_EVENT, sync);
    return () => window.removeEventListener(THEME_MODE_EVENT, sync);
  }, []);
  const options: { mode: ThemeMode; label: string; detail: string }[] = [
    { mode: 'system', label: t('settings.themeSystem'), detail: t('settings.themeSystemDetail') },
    { mode: 'dark', label: t('settings.themeDark'), detail: t('settings.themeDarkDetail') },
    { mode: 'light', label: t('settings.themeLight'), detail: t('settings.themeLightDetail') },
    {
      mode: 'daylight',
      label: t('settings.themeDaylight'),
      detail: t('settings.themeDaylightDetail'),
    },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t('settings.appearanceSection')}
      className="grid grid-cols-1 sm:grid-cols-2 gap-2"
    >
      {options.map(({ mode: m, label, detail }) => {
        const Icon = THEME_ICONS[m];
        const on = mode === m;
        return (
          <button
            key={m}
            role="radio"
            aria-checked={on}
            onClick={() => {
              setThemeMode(m);
              setMode(m);
            }}
            className={`flex items-start gap-3 text-left p-3 rounded-control border transition-colors ${
              on ? OPTION_ON : OPTION_OFF
            }`}
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${on ? 'text-brand-emerald' : ''}`} />
            <span className="min-w-0">
              <span className="block font-semibold text-sm">{label}</span>
              <span className="block text-xs text-white/70 mt-0.5 leading-snug">{detail}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

const HOME_SPECIAL_ICONS: Record<HomeSpecialLayout, SvgIcon> = {
  full: RectangleStackIcon,
  strip: QueueListIcon,
  pills: TagIcon,
};

/** Settings → Home: how much Home shows about today's special days
 * (utils/homeSpecial.ts). Synced across devices like the other UI prefs. */
function HomeSpecialPicker({ t }: { t: (key: string) => string }) {
  const layout = useUiStore((s) => s.homeSpecialLayout);
  const setLayout = useUiStore((s) => s.setHomeSpecialLayout);
  const options: { mode: HomeSpecialLayout; label: string; detail: string }[] = [
    {
      mode: 'full',
      label: t('settings.homeSpecialFull'),
      detail: t('settings.homeSpecialFullDetail'),
    },
    {
      mode: 'strip',
      label: t('settings.homeSpecialStrip'),
      detail: t('settings.homeSpecialStripDetail'),
    },
    {
      mode: 'pills',
      label: t('settings.homeSpecialPills'),
      detail: t('settings.homeSpecialPillsDetail'),
    },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t('settings.homeSection')}
      className="grid grid-cols-1 sm:grid-cols-3 gap-2"
    >
      {options.map(({ mode, label, detail }) => {
        const Icon = HOME_SPECIAL_ICONS[mode];
        const on = layout === mode;
        return (
          <button
            key={mode}
            role="radio"
            aria-checked={on}
            onClick={() => setLayout(mode)}
            className={`flex items-start gap-3 text-left p-3 rounded-control border transition-colors ${
              on ? OPTION_ON : OPTION_OFF
            }`}
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${on ? 'text-brand-emerald' : ''}`} />
            <span className="min-w-0">
              <span className="block font-semibold text-sm">{label}</span>
              <span className="block text-xs text-white/70 mt-0.5 leading-snug">{detail}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function GroqKeySetting({ t }: { t: (key: string) => string }) {
  const { data, isLoading } = useGroqKeyStatus();
  const setKey = useSetGroqKey();
  const clearKey = useClearGroqKey();
  const [value, setValue] = useState('');
  // Distinct from "no key yet" — lets an existing key be replaced without
  // first tapping Remove (previously the only way to rotate a key at all).
  const [changing, setChanging] = useState(false);

  const hasOwnKey = data?.hasOwnKey ?? false;
  const setAt = data?.setAt ?? null;
  const showForm = !isLoading && (!hasOwnKey || changing);

  const handleSave = () => {
    const apiKey = value.trim();
    if (!apiKey) return;
    setKey.mutate(apiKey, {
      onSuccess: () => {
        setValue('');
        setChanging(false);
        // Longer duration + a stable id (react-hot-toast dedupes/replaces by
        // id) so a quick re-click can't stack duplicate toasts, and the
        // message has a real chance to be seen instead of a default 4s blip.
        toast.success(t('settings.groqKeySaved'), { id: 'groq-key', duration: 5000 });
      },
      onError: () => toast.error(t('settings.groqKeyInvalid'), { id: 'groq-key', duration: 6000 }),
    });
  };

  const handleRemove = () => {
    clearKey.mutate(undefined, {
      onSuccess: () => {
        setChanging(false);
        toast.success(t('settings.groqKeyRemoved'), { id: 'groq-key' });
      },
      onError: () => toast.error(t('settings.groqKeyInvalid'), { id: 'groq-key' }),
    });
  };

  return (
    <div className="p-3 rounded-control border border-brand-border bg-brand-surface/50 space-y-2">
      <div className="flex items-center gap-2">
        <KeyIcon className="w-4 h-4 text-brand-gold shrink-0" />
        <p className="font-semibold text-white text-sm">{t('settings.groqKeySection')}</p>
      </div>
      <p className="text-white/70 text-xs leading-snug">
        {t('settings.groqKeyDetail')}{' '}
        <a
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-emerald underline"
        >
          {t('settings.groqKeyGetOne')}
        </a>
      </p>

      {!isLoading && hasOwnKey && !showForm && (
        <div className="pt-1 space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 text-xs text-brand-emerald font-bold">
              <CheckCircleIcon className="w-4 h-4" />
              {t('settings.groqKeyActive')}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setChanging(true)} className={BTN_QUIET}>
                <PencilSquareIcon className="w-3.5 h-3.5" />
                {t('settings.groqKeyChange')}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={clearKey.isPending}
                className={BTN_DANGER_QUIET}
              >
                {t('settings.groqKeyRemove')}
              </button>
            </div>
          </div>
          {setAt && (
            <p className="text-white/70 text-[11px]">
              {t('settings.groqKeyAddedOn')}{' '}
              {formatLocaleDate(new Date(setAt), {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          )}
          <p className="text-white/70 text-[11px]">{t('settings.groqKeySyncNote')}</p>
        </div>
      )}

      {showForm && (
        <div className="pt-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('settings.groqKeyPlaceholder')}
              autoComplete="off"
              className="flex-1 min-w-0 rounded-control border border-brand-border bg-shade/30 px-3 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-brand-emerald"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!value.trim() || setKey.isPending}
              className="btn-solid inline-flex items-center justify-center rounded-control px-3 py-1.5 text-xs font-bold text-on-color bg-brand-emerald-dim hover:brightness-110 shadow-elev-1 transition disabled:opacity-50"
            >
              {setKey.isPending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                t('settings.groqKeySave')
              )}
            </button>
            {hasOwnKey && (
              <button
                type="button"
                onClick={() => {
                  setChanging(false);
                  setValue('');
                }}
                className={BTN_QUIET}
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
          <p className="text-white/70 text-[11px]">{t('settings.groqKeySyncNote')}</p>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const musafir = useMusafir();
  const { user } = useAuthStore();
  // Rayhanah is a sisters-only feature — its delete group must not appear for
  // anyone else (a brother seeing a 🌸 cycle-data row was a bug).
  const dangerGroups = DANGER_GROUPS.filter((g) => g.id !== 'cycle' || user?.gender === 'female');
  const { aiEnabled, setAiEnabled } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const {
    reduceMotion,
    highContrast,
    showNoorAllTime,
    showNoorToday,
    vibrationEnabled,
    setReduceMotion,
    setHighContrast,
    setShowNoorAllTime,
    setShowNoorToday,
    setVibrationEnabled,
    homeAdhkar,
    setHomeAdhkar,
  } = useUiStore();
  const queryClient = useQueryClient();

  const [hijriAdj, setHijriAdjState] = useState(getHijriAdjustment());
  const [dayStartMode, setDayStartModeState] = useState<DayStartMode>(getDayStartMode());
  const [dayStartInfoMode, setDayStartInfoMode] = useState<DayStartMode | null>(null);
  const [savedLocation, setSavedLocation] = useState<string | null>(() => {
    try {
      const s = localStorage.getItem('bustandeen_location');
      return s ? ((JSON.parse(s) as { name?: string }).name ?? 'Saved location') : null;
    } catch {
      return null;
    }
  });
  const [exporting, setExporting] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteAccountStep, setDeleteAccountStep] = useState<
    'idle' | 'confirm' | 'reauth' | 'deleting'
  >('idle');
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [reauthBusy, setReauthBusy] = useState(false);
  // When both a password and Google are linked, let the user pick which one
  // to verify with instead of always defaulting to password.
  const [reauthMethod, setReauthMethod] = useState<'password' | 'google'>('password');

  const applyHijriAdj = (days: number) => {
    setHijriAdjustment(days);
    setHijriAdjState(days);
    if (user) updateProfile.mutateAsync({ hijriOffset: days }).catch(() => {});
  };

  const applyDayStartMode = (mode: DayStartMode) => {
    setDayStartModeLocal(mode);
    setDayStartModeState(mode);
    if (user) updateProfile.mutateAsync({ dayStartMode: mode }).catch(() => {});
  };

  // ── Data export / import ────────────────────────────────────────────────────
  // ── Full-account backup: EVERYTHING in one file (v4.9 rebuild) ──────────────
  const exportProfile = async () => {
    setExporting(true);
    try {
      const { data } = await api.get<{ ok: boolean; backup: unknown }>('/api/user/export');
      const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bustandeen-backup-${new Date().toISOString().substring(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded. Keep it somewhere safe.');
    } catch {
      toast.error('Export failed. Check your connection and try again.');
    } finally {
      setExporting(false);
    }
  };

  // ── Everything I have in the app, every feature (read-only copy) ───────────
  const exportEverything = async () => {
    setExportingAll(true);
    try {
      const { data } = await api.get<{ ok: boolean; data: unknown }>('/api/user/export/all');
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bustandeen-all-my-data-${new Date().toISOString().substring(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('settings.downloadAllDataDone'));
    } catch {
      toast.error(t('settings.downloadAllDataFailed'));
    } finally {
      setExportingAll(false);
    }
  };

  // ── Excel (.xlsx) export ────────────────────────────────────────────────────
  const exportExcel = async () => {
    setExportingXlsx(true);
    const idToken = await getIdToken();
    const base = API_BASE;
    const headers: Record<string, string> = idToken ? { Authorization: `Bearer ${idToken}` } : {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exported API responses have varying, ad-hoc shapes read with optional chaining below
    const getJson = async (path: string): Promise<any | null> => {
      try {
        const r = await fetch(`${base}${path}`, { headers });
        return r.ok ? await r.json() : null;
      } catch {
        return null;
      }
    };
    try {
      const XLSX = await import('xlsx');
      const [profile, zikr, quran, fasting] = await Promise.all([
        getJson('/api/user/me'),
        getJson('/api/zikr/summary'),
        getJson('/api/quran/summary'),
        getJson('/api/fasting/summary'),
      ]);

      const wb = XLSX.utils.book_new();
      const addSheet = (name: string, rows: Array<Record<string, unknown>>) => {
        if (!rows.length) return;
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name.slice(0, 31));
      };

      // Overview
      addSheet('Overview', [
        { Metric: 'Exported at', Value: new Date().toLocaleString() },
        { Metric: 'Name', Value: profile?.displayName ?? profile?.user?.displayName ?? '-' },
        { Metric: 'Email', Value: profile?.email ?? profile?.user?.email ?? '-' },
        { Metric: 'Zikr: lifetime total', Value: zikr?.totalCount ?? 0 },
        { Metric: 'Zikr: today', Value: zikr?.today?.total ?? 0 },
        { Metric: 'Quran: day streak', Value: quran?.streak ?? 0 },
        { Metric: 'Quran: khatms completed', Value: quran?.profile?.khatmCount ?? 0 },
        { Metric: 'Quran: āyāt all-time', Value: quran?.stats?.allTimeUnits ?? 0 },
      ]);

      // Zikr lifetime per type
      addSheet(
        'Zikr (lifetime)',
        (zikr?.perType ?? []).map((t: { zikrType: string; total: number }) => ({
          Zikr: t.zikrType,
          LifetimeCount: t.total,
        }))
      );

      // Quran top surahs
      addSheet(
        'Quran top surahs',
        (quran?.topSurahs ?? []).map((t: { surah: number; completions: number }) => ({
          Surah: t.surah,
          TimesCompleted: t.completions,
        }))
      );

      // Fasting recent logs
      addSheet(
        'Fasting (recent)',
        (fasting?.logs ?? []).map((l: { date: string; category: string; status: string }) => ({
          Date: l.date,
          Category: l.category,
          Status: l.status,
        }))
      );

      if (wb.SheetNames.length === 0) {
        toast.error('Nothing to export yet.');
        return;
      }
      XLSX.writeFile(wb, `bustandeen-export-${new Date().toISOString().substring(0, 10)}.xlsx`);
      toast.success('Excel file downloaded.');
    } catch {
      toast.error('Excel export failed. Check your connection and try again.');
    } finally {
      setExportingXlsx(false);
    }
  };

  // ── Restore from a Bustandeen backup .json — merge, imported days win ──────
  const importProfile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setImporting(true);
    try {
      const parsed = JSON.parse(await file.text()) as { app?: string; version?: number };
      if (parsed?.app !== 'ihsan') {
        toast.error('That is not a Bustandeen backup file. Export one from this page first.');
        return;
      }
      const { data } = await api.post<{ ok: boolean; counts: Record<string, number> }>(
        '/api/user/import',
        parsed
      );
      await queryClient.invalidateQueries();
      const c = data.counts ?? {};
      toast.success(
        `Restored: ${c.zikrDays ?? 0} zikr · ${c.salatDays ?? 0} salat · ${c.fastingDays ?? 0} fasting · ${c.quranDays ?? 0} quran day(s)`,
        { duration: 6000 }
      );
    } catch (err) {
      // The version mismatch is the one import error worth naming specifically
      // (backend/services/backup.service.ts) — an old export needs a fresh one.
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Import failed. The file may be damaged, or the connection dropped.');
    } finally {
      setImporting(false);
    }
  };

  // ── Delete account: full GDPR purge + Firebase auth removal ─────────────
  // Irreversible and full data loss — requires a fresh re-authentication
  // (not just the existing session token) immediately beforehand, so a
  // shared/unlocked device with a live session can't be used to wipe the
  // account. See docs on requireRecentAuth in the backend for the matching
  // server-side check (a stale token gets rejected even if this step is
  // somehow bypassed via a direct API call).
  const hasPasswordProvider = auth.currentUser?.providerData.some(
    (p) => p.providerId === 'password'
  );
  const hasGoogleProvider = auth.currentUser?.providerData.some(
    (p) => p.providerId === 'google.com'
  );
  const canChooseReauthMethod = !!hasPasswordProvider && !!hasGoogleProvider;

  const runDeleteAccount = async () => {
    setDeleteAccountStep('deleting');
    try {
      await api.delete('/api/user/me');
      localStorage.removeItem('bustandeen_idToken');
      await signOut(auth);
      // Without this, staying on /settings after sign-out hits the Protected
      // route's "sign in required" gate on the same page instead of landing
      // somewhere sensible for a now-signed-out visitor.
      navigate('/', { replace: true });
    } catch (err) {
      const reauthRequired =
        !!err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ===
          'reauth_required';
      if (reauthRequired) {
        toast.error('Your sign-in is too old for this. Please verify again.');
        setReauthError(null);
        setDeleteAccountStep('reauth');
      } else {
        toast.error('Account deletion failed. Please try again or contact support.');
        setDeleteAccountStep('idle');
      }
    }
  };

  const reauthErrorMessage = (err: unknown): string => {
    const code = (err as AuthError)?.code;
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return t('settings.reauthWrongPassword', 'Incorrect password. Please try again.');
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return t('settings.reauthPopupClosed', 'Verification was cancelled.');
    }
    if (code === 'auth/too-many-requests') {
      return t('settings.reauthTooManyRequests', 'Too many attempts. Please wait and try again.');
    }
    return t('settings.reauthFailed', 'Verification failed. Please try again.');
  };

  const reauthWithPassword = async () => {
    if (!auth.currentUser?.email || !reauthPassword) return;
    setReauthBusy(true);
    setReauthError(null);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, reauthPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      setReauthPassword('');
      await runDeleteAccount();
    } catch (err) {
      setReauthError(reauthErrorMessage(err));
    } finally {
      setReauthBusy(false);
    }
  };

  const reauthWithGoogle = async () => {
    if (!auth.currentUser) return;
    setReauthBusy(true);
    setReauthError(null);
    try {
      await reauthenticateWithPopup(auth.currentUser, googleProvider, browserPopupRedirectResolver);
      await runDeleteAccount();
    } catch (err) {
      setReauthError(reauthErrorMessage(err));
    } finally {
      setReauthBusy(false);
    }
  };

  // ── Danger-zone executor (full + partial actions, double confirm) ──────────
  const runDanger = async (row: DangerRow) => {
    setDeleting(row.id);
    try {
      if (row.method === 'delete') await api.delete(row.endpoint);
      else if (row.method === 'post') await api.post(row.endpoint, row.body ?? {});
      else await api.patch(row.endpoint, row.body ?? {});
      await queryClient.invalidateQueries();
      toast.success(`${row.label}: done.`);
    } catch {
      toast.error(`Could not complete "${row.label}". Please try again.`);
    } finally {
      setDeleting(null);
      setConfirmTarget(null);
    }
  };

  return (
    <AnimatedBackground variant="dark">
      <div className="px-4 pt-3 pb-16 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* ── The screen's one arch ── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-10 pb-6 text-center"
          >
            <div className="w-16 h-16 mx-auto rounded-full grid place-items-center bg-brand-emerald/10 border border-brand-emerald/30">
              <Cog6ToothIcon className="w-8 h-8 text-brand-emerald" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-4">
              {t('settings.title')}
            </h1>
            <p className="text-sm text-white/70 mt-1">{t('settings.subtitle')}</p>
          </motion.section>

          {/* ── Language — kept at the very top so it's the first thing found ── */}
          <SectionCard
            icon={<LanguageIcon className="w-5 h-5 text-brand-emerald" />}
            title={t('settings.language')}
            subtitle={t('settings.languageSubtitle')}
            delay={0.03}
          >
            <div className="grid grid-cols-2 gap-3">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    void i18n.changeLanguage(l.id);
                    syncQuranTranslationWithLang(l.id);
                  }}
                  aria-pressed={i18n.resolvedLanguage === l.id}
                  className={`p-3 rounded-control border text-sm font-bold transition-colors ${
                    i18n.resolvedLanguage === l.id ? OPTION_ON : OPTION_OFF
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="text-white/70 text-[11px] mt-3 leading-relaxed">
              {t('settings.languageNote')}
            </p>
          </SectionCard>

          {/* ── Musafir mode — right under Language so a traveller finds it fast ── */}
          <SectionCard
            icon={<BriefcaseIcon className="w-5 h-5 text-brand-info" />}
            title={t('settings.musafirSection')}
            subtitle={t('settings.musafirSubtitle')}
            delay={0.04}
          >
            <Toggle
              checked={!!musafir}
              onChange={(on) => {
                const today = getTrackingDay();
                if (on) {
                  startMusafir({
                    today,
                    startAfter: suggestStartAfter(today),
                    school: defaultSchool(),
                  });
                  toast.success(t('settings.musafirStarted'));
                } else {
                  endMusafir(today);
                  toast.success(t('settings.musafirEnded'));
                }
              }}
              title={musafir ? t('settings.musafirOnTitle') : t('settings.musafirOffTitle')}
              detail={
                musafir
                  ? t('settings.musafirOnDetail', {
                      day: journeyDay(musafir, getTrackingDay()),
                      school:
                        i18n.resolvedLanguage === 'bn'
                          ? schoolMeta(musafir.school).labelBn
                          : schoolMeta(musafir.school).label,
                    })
                  : t('settings.musafirOffDetail')
              }
              accent="toggle-info"
            />
            {musafir && (
              <p className="text-white/70 text-xs mt-2 px-1">
                {musafir.startAfter
                  ? t('settings.musafirStartedAfter', {
                      date: formatLocaleDate(new Date(`${musafir.startedAt}T12:00:00`), {
                        day: 'numeric',
                        month: 'short',
                      }),
                      prayer: translateSalatName(musafir.startAfter, musafir.startAfter, t),
                    })
                  : t('settings.musafirStartedOn', {
                      date: formatLocaleDate(new Date(`${musafir.startedAt}T12:00:00`), {
                        day: 'numeric',
                        month: 'short',
                      }),
                    })}{' '}
                <button
                  onClick={() => navigate('/musafir')}
                  className="underline underline-offset-2 text-white/85 hover:text-white"
                >
                  {t('settings.musafirChangeStart')}
                </button>
              </p>
            )}
            <button
              onClick={() => navigate('/musafir')}
              className="mt-3 w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-control border border-brand-info/30 bg-brand-info/[0.08] text-brand-info text-sm font-bold hover:border-brand-info/60 transition-colors"
            >
              {t('settings.musafirOpen')}
              <ChevronRightIcon className="w-4 h-4 shrink-0" />
            </button>
          </SectionCard>

          {/* ── Noor display ── */}
          <SectionCard
            icon={<SparklesIcon className="w-5 h-5 text-brand-gold" />}
            title={t('settings.noorSection')}
            subtitle={t('settings.noorSubtitle')}
            delay={0.05}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle
                checked={showNoorToday}
                onChange={setShowNoorToday}
                title={t('settings.noorToday')}
                detail={t('settings.noorTodayDetail')}
                accent="toggle-success"
              />
              <Toggle
                checked={showNoorAllTime}
                onChange={setShowNoorAllTime}
                title={t('settings.noorAllTime')}
                detail={t('settings.noorAllTimeDetail')}
                accent="toggle-warning"
              />
            </div>
          </SectionCard>

          {/* ── Islamic calendar ── */}
          <SectionCard
            icon={<MoonIcon className="w-5 h-5 text-brand-gold" />}
            title={t('settings.hijriSection')}
            subtitle={t('settings.hijriSubtitle')}
            delay={0.1}
          >
            <div className="flex items-center gap-2">
              {[-1, 0, 1].map((d) => (
                <button
                  key={d}
                  onClick={() => applyHijriAdj(d)}
                  aria-pressed={hijriAdj === d}
                  className={`flex-1 rounded-control border px-2 py-2 text-sm font-bold transition-colors ${
                    hijriAdj === d
                      ? 'bg-brand-emerald-dim text-on-color border-brand-emerald-dim shadow-elev-1'
                      : OPTION_OFF
                  }`}
                >
                  {d === 0
                    ? t('settings.hijriDefault')
                    : d > 0
                      ? t('settings.hijriPlus')
                      : t('settings.hijriMinus')}
                </button>
              ))}
            </div>
            <p className="text-brand-gold text-xs mt-3 font-semibold">
              {t('settings.hijriToday', 'Today:')}{' '}
              {(() => {
                const h = getHijriToday();
                return h ? formatHijriDate(h) : '-';
              })()}
              <span className="text-white/70 font-normal"> · {t('settings.hijriNote')}</span>
            </p>
          </SectionCard>

          {/* ── Tracking day boundary ── */}
          <SectionCard
            icon={<ClockIcon className="w-5 h-5 text-brand-emerald" />}
            title={t('settings.dayStartSection')}
            subtitle={t('settings.dayStartSubtitle')}
            delay={0.11}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  {
                    mode: 'fajr',
                    label: t('settings.dayStartFajr'),
                    detail: t('settings.dayStartFajrDetail'),
                  },
                  {
                    mode: 'midnight',
                    label: t('settings.dayStartMidnight'),
                    detail: t('settings.dayStartMidnightDetail'),
                  },
                  {
                    mode: 'maghrib',
                    label: t('settings.dayStartMaghrib'),
                    detail: t('settings.dayStartMaghribDetail'),
                  },
                ] as { mode: DayStartMode; label: string; detail: string }[]
              ).map(({ mode, label, detail }) => (
                <div
                  key={mode}
                  className={`relative rounded-control border transition-colors ${
                    dayStartMode === mode ? OPTION_ON : OPTION_OFF
                  }`}
                >
                  <button
                    onClick={() => applyDayStartMode(mode)}
                    aria-pressed={dayStartMode === mode}
                    className="w-full text-left p-3 pr-9"
                  >
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-white/70 mt-0.5 leading-snug">{detail}</p>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDayStartInfoMode(mode);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-full text-white/60 hover:text-brand-emerald hover:bg-brand-surface transition-colors"
                    aria-label={t('settings.dayStartInfoAria', { option: label })}
                  >
                    <InformationCircleIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <TrackingDayInfoModal
              mode={dayStartInfoMode}
              onClose={() => setDayStartInfoMode(null)}
            />
            {(dayStartMode === 'fajr' || dayStartMode === 'maghrib') && !savedLocation && (
              <p className="flex items-start gap-2 text-brand-gold text-xs mt-3 leading-relaxed">
                <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-px" />
                {t('settings.dayStartLocationNudge')}
              </p>
            )}
          </SectionCard>

          {/* Appearance: theme mode (utils/theme.ts) */}
          <SectionCard
            icon={<SwatchIcon className="w-5 h-5 text-brand-gold" />}
            title={t('settings.appearanceSection')}
            subtitle={t('settings.appearanceSubtitle')}
            delay={0.13}
          >
            <ThemeModePicker t={t} />
          </SectionCard>

          {/* Home screen: today's special days, detailed / compact / minimal */}
          <SectionCard
            icon={<HomeIcon className="w-5 h-5 text-brand-emerald" />}
            title={t('settings.homeSection')}
            subtitle={t('settings.homeSubtitle')}
            delay={0.14}
          >
            <HomeSpecialPicker t={t} />
            <div className="mt-4">
              <Toggle
                checked={homeAdhkar}
                onChange={setHomeAdhkar}
                title={t('settings.homeAdhkar', 'Adhkār on the timeline')}
                detail={t(
                  'settings.homeAdhkarDetail',
                  'Morning adhkār on Fajr until sunrise, evening adhkār on Maghrib until ʿIshāʾ.'
                )}
              />
            </div>
            <button
              onClick={() => navigate('/welcome')}
              className={`${ITEM} w-full mt-4 flex items-center gap-3`}
            >
              <LeafIcon className="w-5 h-5 shrink-0 text-brand-emerald" aria-hidden="true" />
              <span className="flex-1 min-w-0">
                <span className="block text-white font-bold text-sm">
                  {t('settings.setupAgain', 'Run the welcome setup again')}
                </span>
                <span className="block text-white/70 text-xs mt-0.5">
                  {t(
                    'settings.setupAgainDetail',
                    'Location, madhab, prayer method and your habits.'
                  )}
                </span>
              </span>
              <ChevronRightIcon className="w-4 h-4 shrink-0 text-white/60" aria-hidden="true" />
            </button>
          </SectionCard>

          {/* ── Accessibility ── */}
          <SectionCard
            icon={<EyeIcon className="w-5 h-5 text-brand-info" />}
            title={t('settings.accessibilitySection')}
            delay={0.15}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle
                checked={reduceMotion}
                onChange={setReduceMotion}
                title={t('settings.reduceMotion')}
                detail={t('settings.reduceMotionDetail')}
              />
              <Toggle
                checked={highContrast}
                onChange={setHighContrast}
                title={t('settings.highContrast')}
                detail={t('settings.highContrastDetail')}
                accent="toggle-warning"
              />
              <Toggle
                checked={vibrationEnabled}
                onChange={setVibrationEnabled}
                title={t('settings.vibration')}
                detail={t('settings.vibrationDetail')}
              />
            </div>
          </SectionCard>

          {/* ── Naseeh AI companion ── */}
          <SectionCard
            icon={<SparklesIcon className="w-5 h-5 text-brand-gold" />}
            title={t('settings.naseehSection')}
            subtitle={t('settings.naseehSubtitle')}
            delay={0.18}
          >
            <div className="space-y-3">
              <Toggle
                checked={aiEnabled}
                onChange={(v) => {
                  setAiEnabled(v);
                  // Through the profile hook so the cached profile follows (#141).
                  if (user) updateProfile.mutateAsync({ aiEnabled: v }).catch(() => {});
                }}
                title={t('settings.enableNaseeh')}
                detail={t('settings.enableNaseehDetail')}
                accent="toggle-warning"
              />
              {aiEnabled && <GroqKeySetting t={t} />}
            </div>
          </SectionCard>

          {/* ── Zikr library ── */}
          <SectionCard
            icon={<TasbihIcon className="w-5 h-5 text-brand-emerald" />}
            title={t('settings.zikrLibrary')}
            subtitle={t('settings.zikrLibrarySubtitle')}
            delay={0.22}
          >
            <ZikrLibrarySection />
          </SectionCard>

          {/* ── Your data ── */}
          <SectionCard
            icon={<ShieldCheckIcon className="w-5 h-5 text-brand-emerald" />}
            title={t('settings.dataSection')}
            subtitle={t('settings.dataSubtitle')}
            delay={0.25}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              <button
                className={BTN_SECONDARY}
                onClick={() => void exportProfile()}
                disabled={exporting}
              >
                {exporting ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <ArrowDownTrayIcon className="w-4 h-4" />
                )}
                {t('settings.fullBackup')}
              </button>
              <button
                className={BTN_SECONDARY}
                onClick={() => void exportExcel()}
                disabled={exportingXlsx}
              >
                {exportingXlsx ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <ArrowDownTrayIcon className="w-4 h-4" />
                )}
                {t('settings.exportExcel')}
              </button>
              <button
                className={BTN_SECONDARY}
                onClick={() => void exportEverything()}
                disabled={exportingAll}
              >
                {exportingAll ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <ArrowDownTrayIcon className="w-4 h-4" />
                )}
                {t('settings.downloadAllData')}
              </button>
              <label
                className={`${BTN_SECONDARY} cursor-pointer ${importing ? 'pointer-events-none opacity-60' : ''}`}
              >
                {importing ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <ArrowUpTrayIcon className="w-4 h-4" />
                )}
                {t('settings.restoreBackup')}
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => void importProfile(e)}
                />
              </label>
            </div>
            <p className="text-white/70 text-[11px] mb-2 leading-relaxed">
              {t('settings.backupNote')}
              {user?.gender === 'female' ? t('settings.backupNoteCycle') : ''}
            </p>
            <p className="text-white/70 text-[11px] mb-4 leading-relaxed">
              {t('settings.downloadAllDataNote')}
            </p>

            {/* Saved prayer location (stored only in this browser) */}
            <div className="flex items-center gap-3 p-3 rounded-control border border-brand-border bg-brand-surface/50 mb-5">
              <MapPinIcon className="w-5 h-5 shrink-0 text-brand-emerald" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold">{t('settings.prayerLocation')}</p>
                <p className="text-white/70 text-[11px] truncate">
                  {savedLocation
                    ? t('settings.locationSet', { name: savedLocation })
                    : t('settings.locationNotSet')}
                </p>
              </div>
              {savedLocation && (
                <button
                  onClick={() => {
                    localStorage.removeItem('bustandeen_location');
                    setSavedLocation(null);
                    toast.success('Saved location cleared.');
                  }}
                  className={`${BTN_DANGER_QUIET} shrink-0`}
                >
                  {t('settings.clearLocation')}
                </button>
              )}
            </div>

            {/* separator: everything below is destructive (Istiak's spec) */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 border-t border-red-400/30" />
              <span className="inline-flex items-center gap-1.5 text-red-400 text-[11px] uppercase tracking-widest font-bold">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {t('settings.dangerZone')}
              </span>
              <div className="flex-1 border-t border-red-400/30" />
            </div>
            <div className="rounded-card bg-red-500/[0.06] border border-red-400/30 p-3 space-y-3">
              <p className="text-red-400 text-[11px] font-semibold">{t('settings.dangerNote')}</p>
              {dangerGroups.map((g) => (
                <div
                  key={g.id}
                  className="rounded-control border border-brand-border bg-brand-deep shadow-elev-1 p-3 space-y-1.5"
                >
                  <p className="flex items-center gap-2 text-white text-xs font-bold">
                    <g.Icon className={`w-4 h-4 ${g.tone}`} />
                    {g.title}
                  </p>
                  {g.rows.map((row) => (
                    <div
                      key={row.id}
                      className={`flex items-center gap-3 py-1.5 ${row.sub ? 'pl-4 border-l-2 border-brand-border ml-1' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${row.sub ? 'text-white/85' : 'text-white font-semibold'}`}
                        >
                          {row.label}
                        </p>
                        <p className="text-white/70 text-[11px]">{row.detail}</p>
                      </div>
                      {confirmTarget === row.id ? (
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => void runDanger(row)}
                            disabled={deleting === row.id}
                            className={BTN_DANGER}
                          >
                            {deleting === row.id ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              t('settings.yesDoIt')
                            )}
                          </button>
                          <button onClick={() => setConfirmTarget(null)} className={BTN_QUIET}>
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmTarget(row.id)}
                          aria-label={row.label}
                          className={`${BTN_DANGER_QUIET} shrink-0`}
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                          {row.method === 'delete'
                            ? t('common.delete')
                            : row.id === 'quran-khatam'
                              ? t('common.reset')
                              : t('common.remove')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="text-white/70 text-[11px] mt-3">{t('settings.accountNote')}</p>

            {/* Delete entire account */}
            <div className="mt-4 rounded-card border border-red-400/40 bg-red-500/[0.06] p-4">
              <p className="text-red-400 font-bold text-sm mb-1">
                {t('settings.deleteAccount', 'Delete account')}
              </p>
              <p className="text-white/75 text-[11px] mb-3">
                {t(
                  'settings.deleteAccountDetail',
                  'Permanently removes all your data and your login. This cannot be undone.'
                )}
              </p>
              {deleteAccountStep === 'idle' && (
                <button onClick={() => setDeleteAccountStep('confirm')} className={BTN_DANGER}>
                  {t('settings.deleteAccount', 'Delete account')}
                </button>
              )}
              {deleteAccountStep === 'confirm' && (
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-red-400 text-xs font-semibold">
                    {t(
                      'settings.deleteAccountConfirm',
                      'This will erase everything. Are you sure?'
                    )}
                  </span>
                  <button
                    onClick={() => {
                      setReauthError(null);
                      setDeleteAccountStep('reauth');
                    }}
                    className={BTN_DANGER}
                  >
                    {t('settings.yesDeleteAccount', 'Yes, delete my account')}
                  </button>
                  <button onClick={() => setDeleteAccountStep('idle')} className={BTN_QUIET}>
                    {t('common.cancel')}
                  </button>
                </div>
              )}
              {deleteAccountStep === 'reauth' && (
                <div className="space-y-2">
                  <p className="text-white/85 text-xs">
                    {t(
                      'settings.reauthPrompt',
                      'For your security, please verify it’s really you before we delete everything.'
                    )}
                  </p>
                  {canChooseReauthMethod && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setReauthMethod('password')}
                        aria-pressed={reauthMethod === 'password'}
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${reauthMethod === 'password' ? 'bg-red-600 border-red-600 text-on-color' : 'bg-brand-surface/50 border-brand-border text-white/75'}`}
                      >
                        {t('settings.reauthMethodPassword', 'Password')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReauthMethod('google')}
                        aria-pressed={reauthMethod === 'google'}
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${reauthMethod === 'google' ? 'bg-red-600 border-red-600 text-on-color' : 'bg-brand-surface/50 border-brand-border text-white/75'}`}
                      >
                        {t('settings.reauthMethodGoogle', 'Google')}
                      </button>
                    </div>
                  )}
                  {(canChooseReauthMethod ? reauthMethod === 'password' : hasPasswordProvider) ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void reauthWithPassword();
                      }}
                      className="flex gap-2 items-center flex-wrap"
                    >
                      <input
                        type="password"
                        autoFocus
                        value={reauthPassword}
                        onChange={(e) => setReauthPassword(e.target.value)}
                        placeholder={t('settings.reauthPasswordPlaceholder', 'Your password')}
                        className="w-44 rounded-control border border-red-400/40 bg-shade/30 px-3 py-1.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-red-400"
                        disabled={reauthBusy}
                      />
                      <button
                        type="submit"
                        disabled={reauthBusy || !reauthPassword}
                        className={BTN_DANGER}
                      >
                        {reauthBusy ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          t('settings.reauthAndDelete', 'Verify & delete')
                        )}
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => void reauthWithGoogle()}
                      disabled={reauthBusy}
                      className={BTN_DANGER}
                    >
                      {reauthBusy ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        t('settings.reauthWithGoogle', 'Re-verify with Google & delete')
                      )}
                    </button>
                  )}
                  {reauthError && (
                    <p className="text-red-400 text-xs font-semibold">{reauthError}</p>
                  )}
                  <button
                    onClick={() => {
                      setReauthPassword('');
                      setReauthError(null);
                      setDeleteAccountStep('idle');
                    }}
                    className={BTN_QUIET}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              )}
              {deleteAccountStep === 'deleting' && (
                <span className="loading loading-spinner loading-sm text-red-400" />
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </AnimatedBackground>
  );
}
