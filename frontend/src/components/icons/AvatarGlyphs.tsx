// Preset profile avatars (audit T2.8 follow-up): drawn SVG marks on a theme
// tint, stored as a short id in User.avatarId. No photo uploads: Firebase
// Storage is not enabled. Keep AVATARS in sync with backend/src/utils/avatars.ts.

import {
  CrescentIcon,
  FlowerIcon,
  LeafIcon,
  MosqueIcon,
  Star8Icon,
  type IconProps,
} from './IslamicIcons.js';

function Svg({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

function PalmIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21c0-5 .5-8 1-11" />
      <path d="M13 10c-2-3-5.5-3.5-8-2 2.5.3 4.5 1.2 6 3" />
      <path d="M13 10c2-3 5.5-3.5 8-2-2.5.3-4.5 1.2-6 3" />
      <path d="M13 10c-.5-3 1-5.5 3.5-6.5-1 2-1.5 4-1.5 6" />
      <path d="M8 21h8" />
    </Svg>
  );
}

function LanternIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5v2M10 4.5h4M9 7h6l1 3v6l-1 3H9l-1-3v-6z" />
      <path d="M8 10h8M8 16h8M12 19v2.5" />
    </Svg>
  );
}

function ArchIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 21V11a7 7 0 0 1 14 0v10" />
      <path d="M9 21v-8a3 3 0 0 1 6 0v8M3 21h18" />
    </Svg>
  );
}

function OliveIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 19C9 15 13 10 19 5" />
      <path d="M9 15c-2.5-.2-4-1.5-4.5-3.5 2.2-.3 4 .8 4.5 3.5zM13 11c.2-2.5 1.5-4 3.5-4.5.3 2.2-.8 4-3.5 4.5zM14 11.5c2.2-.3 4 .8 4.5 3-2.2.3-4-.8-4.5-3z" />
      <circle cx="9.5" cy="9" r="1.3" />
    </Svg>
  );
}

function MountainIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 19.5 9 9l3.5 5.5L15 11l6.5 8.5z" />
      <path d="M7.5 11.5 9 13l1.5-1.5" />
    </Svg>
  );
}

function WaveIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 9c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
      <path d="M3 14c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
      <path d="M3 19c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
    </Svg>
  );
}

function OpenBookIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z" />
      <path d="M12 6.5v13" />
    </Svg>
  );
}

/** Tint classes are literal strings so Tailwind generates them. */
export const AVATARS = [
  { id: 'leaf', label: 'Leaf', Icon: LeafIcon, tint: 'bg-brand-emerald/20 text-brand-emerald' },
  { id: 'palm', label: 'Palm', Icon: PalmIcon, tint: 'bg-brand-emerald/20 text-brand-emerald' },
  {
    id: 'crescent',
    label: 'Crescent',
    Icon: CrescentIcon,
    tint: 'bg-brand-gold/20 text-brand-gold',
  },
  { id: 'star', label: 'Star', Icon: Star8Icon, tint: 'bg-brand-gold/20 text-brand-gold' },
  { id: 'lantern', label: 'Lantern', Icon: LanternIcon, tint: 'bg-brand-warm/20 text-brand-warm' },
  { id: 'arch', label: 'Arch', Icon: ArchIcon, tint: 'bg-brand-warm/20 text-brand-warm' },
  { id: 'dome', label: 'Dome', Icon: MosqueIcon, tint: 'bg-brand-info/20 text-brand-info' },
  { id: 'olive', label: 'Olive', Icon: OliveIcon, tint: 'bg-brand-emerald/20 text-brand-emerald' },
  { id: 'rose', label: 'Rose', Icon: FlowerIcon, tint: 'bg-brand-pink/20 text-brand-pink' },
  {
    id: 'mountain',
    label: 'Mountain',
    Icon: MountainIcon,
    tint: 'bg-brand-info/20 text-brand-info',
  },
  { id: 'wave', label: 'Wave', Icon: WaveIcon, tint: 'bg-brand-info/20 text-brand-info' },
  { id: 'book', label: 'Book', Icon: OpenBookIcon, tint: 'bg-brand-gold/20 text-brand-gold' },
] as const;

export type AvatarId = (typeof AVATARS)[number]['id'];

export function avatarById(id: string | null | undefined) {
  return AVATARS.find((a) => a.id === id);
}

/** A preset avatar disc; size via className (e.g. "w-10 h-10"). */
export function AvatarDisc({ id, className = 'w-10 h-10' }: { id: string; className?: string }) {
  const av = avatarById(id);
  if (!av) return null;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${av.tint} ${className}`}
    >
      <av.Icon className="w-[55%] h-[55%]" />
    </span>
  );
}

/**
 * Anyone's picture: their photo (Google), else their preset avatar, else the
 * first letter of their name.
 */
export function UserAvatar({
  photoUrl,
  avatarId,
  name,
  className = 'w-10 h-10',
}: {
  photoUrl?: string | null;
  avatarId?: string | null;
  name?: string | null;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={`rounded-full object-cover ${className}`}
      />
    );
  }
  if (avatarById(avatarId)) return <AvatarDisc id={avatarId!} className={className} />;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-brand-emerald/20 text-brand-emerald font-bold ${className}`}
    >
      {(name?.trim()?.[0] ?? '?').toUpperCase()}
    </span>
  );
}
