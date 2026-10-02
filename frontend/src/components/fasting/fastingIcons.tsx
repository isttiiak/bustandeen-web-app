// SVG marks for the fasting screens (T3.2: no emoji in redesigned screens).
// utils/fastingRules.ts still carries an `emoji` per rule as data (other
// screens use it); the fasting UI draws these icons instead.
import type { ComponentType, SVGProps } from 'react';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CalendarIcon,
  CheckCircleIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  HandRaisedIcon,
  NoSymbolIcon,
  ScaleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import {
  CrescentIcon,
  FajrIcon,
  FullMoonIcon,
  LeafIcon,
  MountainIcon,
  Star8Icon,
  WavesIcon,
} from '../icons/IslamicIcons.js';
import type { FastingCategory, FastingStatus, VoluntaryKind } from '../../utils/fastingRules.js';

type Icon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export const VOLUNTARY_ICON: Record<VoluntaryKind, Icon> = {
  mon_thu: CalendarDaysIcon,
  ayyam_bid: FullMoonIcon,
  arafah: MountainIcon,
  ashura: WavesIcon,
  shawwal_six: CalendarIcon,
  muharram: CrescentIcon,
  shaban: CloudIcon,
  dhul_hijjah: Star8Icon,
  dawud: ArrowPathIcon,
  general: LeafIcon,
};

export const CATEGORY_ICON: Record<FastingCategory, Icon> = {
  voluntary: LeafIcon,
  qada: ArrowPathIcon,
  kaffarah: ScaleIcon,
  nadhr: HandRaisedIcon,
  ramadan: CrescentIcon,
};

export const STATUS_ICON: Record<FastingStatus, Icon> = {
  intended: FajrIcon,
  completed: CheckCircleIcon,
  broken: XCircleIcon,
};

/** Status colours as Tailwind classes (text + dot), theme-aware. */
export const STATUS_TONE: Record<FastingStatus, { text: string; dot: string }> = {
  completed: { text: 'text-data-good', dot: 'bg-data-good' },
  intended: { text: 'text-brand-info', dot: 'bg-brand-info' },
  broken: { text: 'text-red-400', dot: 'bg-red-400' },
};

export { NoSymbolIcon as ProhibitedIcon, ExclamationTriangleIcon as CautionIcon };

/** Icon for a logged fast: its voluntary kind when known, else its category. */
export function fastIcon(category: FastingCategory, kind?: VoluntaryKind | null): Icon {
  if (category === 'voluntary' && kind && VOLUNTARY_ICON[kind]) return VOLUNTARY_ICON[kind];
  return CATEGORY_ICON[category] ?? LeafIcon;
}
