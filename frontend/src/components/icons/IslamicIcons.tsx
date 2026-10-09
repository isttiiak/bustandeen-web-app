// Hand-made line icons for the Bustan Arch design (audit T3.2): prayer
// times, worship trackers and the manuscript ornaments. 24x24, stroke
// `currentColor`, so they follow the theme's text colour. Generic icons come
// from Heroicons; only what Heroicons lacks lives here. No emoji in redesigned
// screens.

import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement> & { className?: string };

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

/** Pre-dawn: first light on the horizon. */
export function FajrIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 17h18M8.5 17a3.5 3.5 0 0 1 7 0M12 7v4M10 9l2-2 2 2" />
    </Svg>
  );
}

/** Sunrise (shurūq), also the ishrāq window. */
export function SunriseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 18h18M6.5 18a5.5 5.5 0 0 1 11 0M12 6v2.5M5.2 9.7l1.7 1.7M18.8 9.7l-1.7 1.7M3.5 14.5h1.5M19 14.5h1.5" />
    </Svg>
  );
}

/** Midday sun: ẓuhr, also ḍuḥā. */
export function DhuhrIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </Svg>
  );
}

/** Afternoon: the sun lower, a shadow longer than the stick. */
export function AsrIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="17" cy="7" r="3" />
      <path d="M17 2.5v1M21.5 7h-1M20.2 3.8l-.7.7M3 20h18M7 20v-7M7 20l9-2" />
    </Svg>
  );
}

/** Sunset: maghrib, also awwābīn. */
export function MaghribIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 17h18M6.5 17a5.5 5.5 0 0 1 11 0M12 5v4M10 7l2 2 2-2M5 21h14" />
    </Svg>
  );
}

/** Night: ʿishāʾ, also tahajjud. */
export function IshaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.5 4.5a7.5 7.5 0 1 0 5 12.5 6 6 0 0 1-5-12.5z" />
      <path d="M18.5 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" />
    </Svg>
  );
}

/** Crescent: fasting and Ramadan. */
export function CrescentIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15 3.5a8.5 8.5 0 1 0 5.5 14.2A7 7 0 0 1 15 3.5z" />
    </Svg>
  );
}

/** Tasbīḥ: a loop of beads with a tassel, zikr. */
export function TasbihIcon(p: IconProps) {
  // Beads on a ring, open at the bottom where the tassel hangs.
  const beads = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI / 2 + ((i + 1) / 10) * Math.PI * 2;
    return [12 + 6.5 * Math.cos(a), 9 + 6.5 * Math.sin(a)] as const;
  });
  return (
    <Svg {...p}>
      {beads.map(([x, y], i) => (
        <circle
          key={i}
          cx={x.toFixed(2)}
          cy={y.toFixed(2)}
          r="1.5"
          fill="currentColor"
          stroke="none"
        />
      ))}
      <path d="M12 15.5v3M10 21.5l2-3 2 3z" />
    </Svg>
  );
}

/** Dome and minaret: salat. */
export function MosqueIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 20v-7h12v7M4 20h16M6 13a6 6 0 0 1 12 0M12 7V4.5M10.5 20v-3a1.5 1.5 0 0 1 3 0v3M3 20v-9M2 11h2M3 11V8.5" />
    </Svg>
  );
}

/** Two raised palms: duʿā. */
export function DuaHandsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10.5 20.5 6.8 18a3 3 0 0 1-1.3-2.5V8.5a1.3 1.3 0 0 1 2.6 0V13M8.1 11V6a1.3 1.3 0 0 1 2.6 0v8.5" />
      <path d="M13.5 20.5l3.7-2.5a3 3 0 0 0 1.3-2.5V8.5a1.3 1.3 0 0 0-2.6 0V13M15.9 11V6a1.3 1.3 0 0 0-2.6 0v8.5" />
    </Svg>
  );
}

/** Eight-point star (khātam): ornament, special days. */
export function Star8Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="6.5" y="6.5" width="11" height="11" />
      <rect x="6.5" y="6.5" width="11" height="11" transform="rotate(45 12 12)" />
    </Svg>
  );
}

/** Leaf: completion marks; "discreet" wellness. */
export function LeafIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16z" />
      <path d="M4 20 14 10" />
    </Svg>
  );
}

/** Five-petal flower: Rayhanah. */
export function FlowerIcon(p: IconProps) {
  const petals = Array.from({ length: 5 }, (_, i) => (i * 72 * Math.PI) / 180 - Math.PI / 2);
  return (
    <Svg {...p}>
      {petals.map((a, i) => (
        <circle
          key={i}
          cx={(12 + 4.2 * Math.cos(a)).toFixed(2)}
          cy={(12 + 4.2 * Math.sin(a)).toFixed(2)}
          r="3"
        />
      ))}
      <circle cx="12" cy="12" r="1.6" />
    </Svg>
  );
}

/** Six-spoke frost: a streak in its grace day. */
export function FrostIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M10 4.5l2 1.5 2-1.5M10 19.5l2-1.5 2 1.5" />
    </Svg>
  );
}

/** Target: progress towards a daily goal. */
export function TargetIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </Svg>
  );
}

/** Water drop: wuḍūʾ (taḥiyyat al-wuḍūʾ). */
export function DropIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5c3 4 5.5 7.2 5.5 10.5a5.5 5.5 0 0 1-11 0c0-3.3 2.5-6.5 5.5-10.5z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
    </Svg>
  );
}

/** A path that forks in two: istikhārah, asking Allah to choose. */
export function ForkPathIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21v-7M12 14 6.5 8.5M12 14l5.5-5.5M4.5 9.5V6.5h3M19.5 9.5V6.5h-3" />
    </Svg>
  );
}

/** Full moon with a soft halo: the white days (13-15th of the lunar month). */
export function FullMoonIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2.5v1.5M12 20v1.5M2.5 12H4M20 12h1.5" />
    </Svg>
  );
}

/** A mountain: ʿArafah. */
export function MountainIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 19.5 9.5 8l3.5 6 2.5-3.5L21 19.5z" />
      <path d="M8 10.7 9.5 12l1.6-1.4" />
    </Svg>
  );
}

/** Waves: ʿĀshūrāʾ, the day the sea parted for Mūsā. */
export function WavesIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </Svg>
  );
}

/** Line, star, line: the section divider. */
export function OrnamentDivider({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 text-brand-gold/70 ${className}`}
      role="separator"
      aria-hidden="true"
    >
      <span className="h-px flex-1 bg-brand-border" />
      <Star8Icon className="w-4 h-4" />
      <span className="h-px flex-1 bg-brand-border" />
    </div>
  );
}

/** A compass rose: a ring and a needle (Qibla). */
export function CompassIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5 13.2 13.2 8.5 15.5l2.3-4.7z" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </Svg>
  );
}

/** A medallion: a ringed eight-point star, for the 99 Names (Asmāʾ al-Ḥusnā).
 *  Deliberately not a sparkle, which marks the Naseeh AI. */
export function NamesMedallionIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.5" />
      <rect x="8.2" y="8.2" width="7.6" height="7.6" />
      <rect x="8.2" y="8.2" width="7.6" height="7.6" transform="rotate(45 12 12)" />
      <circle cx="12" cy="12" r="1.3" />
    </Svg>
  );
}

/** The Kaaba: a cube with its gold band (kiswah belt) and door. */
export function KaabaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 8.5 12 5l8 3.5v8L12 20l-8-3.5z" />
      <path d="M4 8.5 12 12l8-3.5M12 12v8" />
      <path d="M4 10.8 12 14.3l8-3.5" />
      <path d="M14.6 13.2v4.4" />
    </Svg>
  );
}

const PRAYER_GLYPHS: Record<string, (p: IconProps) => React.ReactNode> = {
  fajr: FajrIcon,
  sunrise: SunriseIcon,
  ishraq: SunriseIcon,
  dhuhr: DhuhrIcon,
  duha: DhuhrIcon,
  asr: AsrIcon,
  maghrib: MaghribIcon,
  awwabin: MaghribIcon,
  isha: IshaIcon,
  tahajjud: IshaIcon,
  witr: IshaIcon,
  tarawih: CrescentIcon,
  tahiyyat_wudu: DropIcon,
  tahiyyat_masjid: MosqueIcon,
  hajat: DuaHandsIcon,
  istikharah: ForkPathIcon,
};

/** The glyph for a prayer or nafl id (utils/prayerTimes.ts, NAFL_TYPE_META ids). */
export function PrayerGlyph({ id, ...p }: IconProps & { id: string }) {
  const Glyph = PRAYER_GLYPHS[id] ?? DhuhrIcon;
  return <Glyph {...p} />;
}
