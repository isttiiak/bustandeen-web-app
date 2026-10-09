import type { ComponentType, ReactNode } from 'react';

// T3.2 Admin pages (staff only, English only) in the Bustan Arch design: one
// arch hero per screen, then theme cards. Shared so every admin page keeps the
// same header, inputs and status pills in both themes.

export { INPUT as ADMIN_INPUT, LABEL as ADMIN_LABEL } from '../auth/authParts.js';

/** A compact text input/select for filters and inline forms. */
export const ADMIN_INPUT_SM =
  'px-3 py-2 rounded-control bg-brand-surface border border-brand-border text-white text-sm placeholder:text-white/70 focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/30 transition-colors';

/** A small filter/sort chip; pair with OPTION_ON / OPTION_OFF. */
export const OPTION_CHIP =
  'inline-flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-xs font-bold transition-colors';

/** Small pill for a status or role. */
export const PILL = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold';
export const PILL_GOLD = `${PILL} bg-brand-gold/15 text-brand-gold`;
export const PILL_EMERALD = `${PILL} bg-brand-emerald/15 text-brand-emerald`;
export const PILL_RED = `${PILL} bg-red-400/15 text-red-400`;
export const PILL_MUTED = `${PILL} bg-brand-surface text-white/80 border border-brand-border`;

/** A quiet small button (row actions, pagination). */
export const BTN_SMALL =
  'inline-flex items-center justify-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-bold text-white/80 hover:text-white bg-brand-surface border border-brand-border hover:border-brand-emerald/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
/** A destructive small button. */
export const BTN_DANGER =
  'inline-flex items-center justify-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/30 hover:bg-red-400/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

/** The one arch hero of an admin screen: icon, title, subtitle, extras. */
export function AdminHero({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-8 pb-5 sm:px-8 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full grid place-items-center bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
        {title}
      </h1>
      {subtitle && <div className="text-white/80 text-sm mt-2 leading-relaxed">{subtitle}</div>}
      {children}
    </section>
  );
}
