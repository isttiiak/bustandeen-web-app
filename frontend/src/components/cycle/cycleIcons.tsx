// SVG marks for the Rayhanah screens (T3.2: no emoji in redesigned screens).
// Purely visual: nothing here reads or sends cycle data.
import type { ComponentType, SVGProps } from 'react';
import {
  AcademicCapIcon,
  CloudIcon,
  GiftIcon,
  HeartIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SpeakerWaveIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import { DropIcon, DuaHandsIcon, LeafIcon, TasbihIcon } from '../icons/IslamicIcons.js';

export type Icon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

/** Garden of Light checklist, by item id. */
export const GARDEN_ICON: Record<string, Icon> = {
  adhkar: SunIcon,
  dhikr: TasbihIcon,
  salawat: HeartIcon,
  istighfar: CloudIcon,
  listen: SpeakerWaveIcon,
  learn: AcademicCapIcon,
  kindness: GiftIcon,
};

/** Adhkār garden, in EXCUSED_ADHKAR order. */
export const ADHKAR_ICON: Icon[] = [
  DuaHandsIcon,
  HeartIcon,
  ShieldCheckIcon,
  LeafIcon,
  CloudIcon,
  SparklesIcon,
];

/** Flow intensity as one to three drops. */
export function FlowDrops({ level, className = '' }: { level: 1 | 2 | 3; className?: string }) {
  return (
    <span className={`inline-flex -space-x-1 ${className}`} aria-hidden="true">
      {Array.from({ length: level }, (_, i) => (
        <DropIcon key={i} className="w-3.5 h-3.5" />
      ))}
    </span>
  );
}
