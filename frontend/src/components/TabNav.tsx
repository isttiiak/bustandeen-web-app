import React from 'react';
import { Link } from 'react-router';

export interface TabNavItem {
  label: string;
  /** Route for inactive tabs; the active tab renders as a static pill. */
  to: string;
  active?: boolean;
  /** Optional click interceptor for inactive tabs (e.g. guest dialogs). */
  onClick?: () => void;
}

/** Segmented control classes, shared with QuranTabNav. A raised paper pill on
 * a sage-tinted track in light; a lifted dark pill on a darker track in dark
 * (plain `bg-white/x` was grey ink on paper). */
export const SEGMENT = {
  track: 'flex gap-1 rounded-control p-1 border border-brand-border bg-shade/10',
  active: 'rounded-lg bg-brand-deep text-white font-bold shadow-elev-1',
  idle: 'rounded-lg text-white/60 font-semibold hover:text-white hover:bg-brand-deep/60 transition-colors',
};

/**
 * The Counter/Analytics (or Tracker/Analytics) pill switcher used at the top
 * of the zikr and salat pages. One shared component so spacing, width, and
 * styling stay identical everywhere.
 */
export default function TabNav({ items }: { items: TabNavItem[] }) {
  return (
    <div className={`${SEGMENT.track} max-w-xs`}>
      {items.map((item) =>
        item.active ? (
          <span
            key={item.label}
            aria-current="page"
            className={`flex-1 text-center text-xs py-1.5 whitespace-nowrap px-3 ${SEGMENT.active}`}
          >
            {item.label}
          </span>
        ) : item.onClick ? (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`flex-1 text-center text-xs py-1.5 whitespace-nowrap px-3 ${SEGMENT.idle}`}
          >
            {item.label}
          </button>
        ) : (
          <Link
            key={item.label}
            to={item.to}
            className={`flex-1 text-center text-xs py-1.5 whitespace-nowrap px-3 ${SEGMENT.idle}`}
          >
            {item.label}
          </Link>
        )
      )}
    </div>
  );
}
