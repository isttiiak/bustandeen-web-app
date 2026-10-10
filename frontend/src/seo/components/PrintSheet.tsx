import type { SeoLang } from '../locales/chrome.js';
import { PRINT } from '../locales/print.js';
import type { QrPath } from '../utils/qr.js';

/** "Download PDF": opens the browser's print window on the A4 sheet
 * (static-entry.ts wires prerendered pages; onClick serves the app). */
export function DownloadPdfButton({ lang, className = '' }: { lang: SeoLang; className?: string }) {
  const p = PRINT[lang];
  return (
    <div className={`print:hidden ${className}`}>
      <button
        type="button"
        data-print-button=""
        onClick={() => window.print()}
        className="inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-emerald-dim px-4 py-2.5 text-sm font-bold text-on-color shadow-elev-1"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
        >
          <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14" />
        </svg>
        {p.download}
      </button>
      <p className="mt-1.5 text-xs opacity-70">{p.hint}</p>
    </div>
  );
}

/** The head of the A4 sheet: only on paper. */
export function PrintSheetHead({
  lang,
  title,
  sub,
  qr,
}: {
  lang: SeoLang;
  title: string;
  sub: string;
  qr?: QrPath;
}) {
  return (
    <div
      data-print-head=""
      className="hidden print:flex items-start justify-between gap-4 border-b-2 border-brand-emerald pb-2 mb-3"
    >
      <div>
        <p className="font-display text-xs font-bold tracking-wide">Bustandeen</p>
        <p className="font-display text-lg font-bold leading-snug">{title}</p>
        <p className="text-xs">{sub}</p>
      </div>
      {qr && (
        <figure className="m-0 w-[22mm] flex-none text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${qr.size} ${qr.size}`}
            shapeRendering="crispEdges"
            role="img"
            aria-label="QR"
            className="block h-[22mm] w-[22mm]"
          >
            <path fill="currentColor" d={qr.d} />
          </svg>
          <figcaption className="mt-0.5 text-[7pt] leading-tight">
            {PRINT[lang].viewOnline}
            <br />
            bustandeen.com
          </figcaption>
        </figure>
      )}
    </div>
  );
}
