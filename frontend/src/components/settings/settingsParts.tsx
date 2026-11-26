import type React from 'react';
import { m as motion } from 'framer-motion';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import Switch from '../Switch.js';

export type SvgIcon = (p: { className?: string }) => React.ReactNode;

/** A chosen / not chosen option tile (theme, language, day start). */
export const OPTION_ON = 'bg-brand-emerald/10 border-brand-emerald text-white';
export const OPTION_OFF =
  'bg-brand-surface/50 border-brand-border text-white/80 hover:text-white hover:border-brand-emerald/40';
/** A quiet inline button inside a card (Change, Cancel, Clear). */
export const BTN_QUIET =
  'inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-bold text-white/75 hover:text-white hover:bg-brand-surface transition-colors';
/** A destructive action, quiet until confirmed. */
export const BTN_DANGER_QUIET =
  'inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors';
export const BTN_DANGER =
  'btn-solid inline-flex items-center justify-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-bold text-on-color bg-red-600 hover:bg-red-700 shadow-elev-1 transition-colors disabled:opacity-50';

export function SectionCard({
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

export function Toggle({
  checked,
  onChange,
  title,
  detail,
  tone = 'sage',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  detail: string;
  tone?: 'sage' | 'gold' | 'info';
}) {
  return (
    <label className="flex items-center gap-4 p-3 rounded-control border border-brand-border bg-brand-surface/50 cursor-pointer hover:border-brand-emerald/40 transition-colors">
      <Switch tone={tone} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="min-w-0">
        <p className="font-semibold text-white text-sm">{title}</p>
        <p className="text-white/70 text-xs leading-snug mt-0.5">{detail}</p>
      </div>
    </label>
  );
}
