// The live-page parts of the Ramadan calendars that go with the print sheets
// (R2-R4, approved 2026-10-17): the download panel (three sheets, colour or
// black and white), the fasting-length tiles, and "About these dates and
// times", where every explanation lives now that the paper carries only the
// times. Bustan look.
import { useEffect, useState, type ReactNode } from 'react';
import {
  RAMADAN_SHEET,
  SHEET_VARIANTS,
  type SheetInk,
  type SheetLang,
  type SheetVariant,
} from '../locales/ramadanSheet.js';
import { readSheetInk, saveSheetInk, wireSheetDownloads } from '../sheetPrint.js';

const DownloadIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="h-4 w-4 flex-none"
  >
    <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14" />
  </svg>
);

/**
 * "Print this Ramadan": three sheets and the ink. On a prerendered page the
 * buttons are wired by static-entry.ts (wireSheetDownloads); when the app's
 * router draws the page the effect wires them. The app's own sheet card
 * passes `onPrint` and handles the click itself.
 */
export function RamadanDownloads({
  lang,
  onPrint,
  className = '',
}: {
  lang: SheetLang;
  onPrint?: (variant: SheetVariant, ink: SheetInk) => void;
  className?: string;
}) {
  const s = RAMADAN_SHEET[lang];
  const [ink, setInk] = useState<SheetInk>('color');
  useEffect(() => {
    if (onPrint) setInk(readSheetInk());
    else wireSheetDownloads();
  }, [onPrint]);
  const pickInk = (v: SheetInk) => {
    setInk(v);
    saveSheetInk(v);
  };
  return (
    <section
      data-sheet-downloads=""
      aria-labelledby="sheet-downloads-title"
      className={`print:hidden rounded-card border border-brand-border bg-brand-deep p-4 shadow-elev-1 ${className}`}
    >
      <h2 id="sheet-downloads-title" className="font-display text-base font-bold text-white">
        {s.downloadTitle}
      </h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {SHEET_VARIANTS.map((v, i) => (
          <button
            key={v}
            type="button"
            data-sheet-print={v}
            onClick={onPrint ? () => onPrint(v, ink) : undefined}
            className={`flex min-h-11 flex-col items-start gap-1 rounded-control px-3 py-2.5 text-start text-sm font-bold ${
              i === 0
                ? 'bg-brand-emerald-dim text-on-color shadow-elev-1'
                : 'border border-brand-border text-white'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <DownloadIcon />
              {s.download[v]}
            </span>
            <span className="text-xs font-normal opacity-80">{s.downloadHelp[v]}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/75">
        <span id="sheet-ink-label">{s.inkLabel}</span>
        <div role="group" aria-labelledby="sheet-ink-label" className="flex gap-2">
          {(['color', 'bw'] as const).map((v) => (
            <button
              key={v}
              type="button"
              data-ink-value={v}
              aria-pressed={ink === v}
              onClick={onPrint ? () => pickInk(v) : undefined}
              className="min-h-11 rounded-control border border-brand-border px-3 py-2 text-xs font-semibold text-white aria-pressed:border-brand-emerald aria-pressed:bg-brand-emerald/15"
            >
              {s.ink[v]}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-white/65">{s.hint}</p>
    </section>
  );
}

export interface FastingLength {
  /** Minutes from the end of suhoor to iftar. */
  first: number;
  last: number;
  shortest: { minutes: number; dateLabel: string };
  longest: { minutes: number; dateLabel: string };
}

/** "12 h 31 min" in the page's digits. */
export function formatDuration(lang: SheetLang, minutes: number, num: (n: number) => string) {
  const s = RAMADAN_SHEET[lang];
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  return h ? s.hoursMinutes(num(h), num(m)) : s.minutesOnly(num(m));
}

/** Shortest and longest fast, and how much the days grow over the month. */
export function FastingLengthTiles({
  lang,
  length,
  num,
}: {
  lang: SheetLang;
  length: FastingLength;
  num: (n: number) => string;
}) {
  const s = RAMADAN_SHEET[lang];
  const d = (m: number) => formatDuration(lang, m, num);
  const tile = (label: string, value: string, sub?: string) => (
    <div className="rounded-control border border-brand-border bg-brand-deep px-3 py-2 text-center">
      <div className="text-[11px] font-semibold text-white/65">{label}</div>
      <div className="mt-0.5 text-sm font-extrabold text-brand-gold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-white/60">{sub}</div>}
    </div>
  );
  return (
    <div data-fasting-length="" className="mt-4">
      <div className="grid grid-cols-3 gap-2">
        {tile(s.shortest, d(length.shortest.minutes), length.shortest.dateLabel)}
        {tile(s.longest, d(length.longest.minutes), length.longest.dateLabel)}
        {tile(s.grows, d(length.last - length.first))}
      </div>
      <p className="mt-2 text-center text-xs text-white/70">
        {s.durationLine(d(length.first), d(length.last))}
      </p>
    </div>
  );
}

export interface AboutItem {
  title: string;
  body: ReactNode;
}

/** "About these dates and times": every explanation, the first one open. */
export function RamadanAbout({ lang, items }: { lang: SheetLang; items: AboutItem[] }) {
  const s = RAMADAN_SHEET[lang];
  return (
    <section
      data-ramadan-about=""
      aria-labelledby="ramadan-about-title"
      className="print:hidden mt-6 overflow-hidden rounded-card border border-brand-border bg-brand-deep"
    >
      <h2
        id="ramadan-about-title"
        className="px-4 pt-3 pb-1 font-display text-base font-bold text-white"
      >
        {s.aboutTitle}
      </h2>
      {items.map((item, i) => (
        <details
          key={item.title}
          open={i === 0}
          className="border-t border-brand-border/60 first-of-type:border-t-0"
        >
          <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-bold text-white">
            {item.title}
          </summary>
          <div className="px-4 pb-3 text-sm leading-relaxed text-white/80">{item.body}</div>
        </details>
      ))}
    </section>
  );
}
