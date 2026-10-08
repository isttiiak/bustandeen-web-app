// SVG icons for Musafir mode (T3.2). The data in utils/musafir.ts still carries
// an `emoji` per ruling and du'a; the screen draws these instead, by id.
import type { ComponentType, SVGProps } from 'react';
import {
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ClockIcon,
  HandRaisedIcon,
  HomeIcon,
  HomeModernIcon,
  LinkIcon,
  MapIcon,
  MapPinIcon,
  MoonIcon,
  ScissorsIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { CrescentIcon, DropIcon, MosqueIcon, MountainIcon } from '../icons/IslamicIcons.js';

type Icon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

/** One icon per MUSAFIR_RULINGS id. */
const RULING_ICONS: Record<string, Icon> = {
  qasr: ScissorsIcon,
  when: MapIcon,
  stay: BuildingOfficeIcon,
  jam: LinkIcon,
  sunnah: MoonIcon,
  fard_vehicle: TruckIcon,
  imam: MosqueIcon,
  jumuah: CalendarDaysIcon,
  kaza: ClockIcon,
  fasting: CrescentIcon,
  khuff: DropIcon,
  tayammum: MountainIcon,
};

/** One icon per MUSAFIR_DUAS id. */
const DUA_ICONS: Record<string, Icon> = {
  leaving_home: HomeIcon,
  farewell: HandRaisedIcon,
  riding: TruckIcon,
  up_down: MountainIcon,
  stopping: MapPinIcon,
  returning: HomeModernIcon,
};

export function RulingIcon({ id, className }: { id: string; className?: string }) {
  const I = RULING_ICONS[id] ?? MapIcon;
  return <I className={className} aria-hidden />;
}

export function DuaIcon({ id, className }: { id: string; className?: string }) {
  const I = DUA_ICONS[id] ?? HandRaisedIcon;
  return <I className={className} aria-hidden />;
}

export const MUSAFIR_ICON_IDS = {
  rulings: Object.keys(RULING_ICONS),
  duas: Object.keys(DUA_ICONS),
};
