import { AcademicCapIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { CrescentIcon, FlowerIcon, MosqueIcon, TasbihIcon } from '../icons/IslamicIcons.js';
import type { SvgIcon } from './settingsParts.js';

// ── Unified danger zone (Istiak's spec): EVERY data-erase control lives here,
// grouped per feature, with full AND partial options. ─────────────────────────
export interface DangerRow {
  id: string;
  label: string;
  detail: string;
  method: 'delete' | 'post' | 'patch';
  endpoint: string;
  body?: Record<string, unknown>;
  /** partial action (indented under the group's "everything" row) */
  sub?: boolean;
}
export interface DangerGroup {
  id: string;
  Icon: SvgIcon;
  title: string;
  /** icon colour so groups are recognizable at a glance */
  tone: string;
  rows: DangerRow[];
}

export const DANGER_GROUPS: DangerGroup[] = [
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
