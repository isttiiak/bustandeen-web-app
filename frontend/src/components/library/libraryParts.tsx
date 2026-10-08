import type { ReactNode } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// Shared parts of the four Library screens (du'as, adhkar, 99 Names, zakat) in
// Bustan Arch (T3.2): one arch hero each, theme inputs and option tiles.

type SvgIcon = (p: { className?: string }) => ReactNode;

/** A chosen / not chosen option tile (same as Settings). */
export const OPTION_ON = 'bg-brand-emerald/10 border-brand-emerald text-white';
export const OPTION_OFF =
  'bg-brand-surface/50 border-brand-border text-white/80 hover:text-white hover:border-brand-emerald/40';

/** A theme text/number/date field. */
export const INPUT =
  'w-full rounded-control border border-brand-border bg-shade/30 px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-brand-emerald';

/** Arabic du'a / dhikr text. */
export const ARABIC_STYLE = { fontFamily: "'Amiri', 'Scheherazade New', serif" } as const;

/** The screen's one arch: icon medallion, title, subtitle and an optional extra line. */
export function LibraryHero({
  Icon,
  title,
  subtitle,
  children,
}: {
  Icon: SvgIcon;
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-10 pb-6 text-center space-y-3">
      <div className="w-14 h-14 mx-auto rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/30">
        <Icon className="w-7 h-7 text-brand-gold" aria-hidden="true" />
      </div>
      <h1 className="font-display text-3xl font-bold text-white">{title}</h1>
      <p className="text-white/75 text-sm leading-relaxed max-w-md mx-auto">{subtitle}</p>
      {children}
    </section>
  );
}

/** The search field above a list. */
export function LibrarySearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <MagnifyingGlassIcon
        className="w-4 h-4 text-white/60 absolute left-3.5 top-1/2 -translate-y-1/2"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${INPUT} pl-10`}
      />
    </div>
  );
}
