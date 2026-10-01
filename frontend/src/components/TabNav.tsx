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

/**
 * The Counter/Analytics (or Tracker/Analytics) pill switcher used at the top
 * of the zikr and salat pages. One shared component so spacing, width, and
 * styling stay identical everywhere.
 */
export default function TabNav({ items }: { items: TabNavItem[] }) {
  return (
    <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-brand-emerald/10 max-w-xs">
      {items.map((item) =>
        item.active ? (
          <span
            key={item.label}
            aria-current="page"
            className="flex-1 text-center text-xs font-bold py-1.5 rounded-lg bg-white/10 text-white whitespace-nowrap px-3"
          >
            {item.label}
          </span>
        ) : item.onClick ? (
          <button
            key={item.label}
            onClick={item.onClick}
            className="flex-1 text-center text-xs font-semibold py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap px-3"
          >
            {item.label}
          </button>
        ) : (
          <Link
            key={item.label}
            to={item.to}
            className="flex-1 text-center text-xs font-semibold py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap px-3"
          >
            {item.label}
          </Link>
        )
      )}
    </div>
  );
}
