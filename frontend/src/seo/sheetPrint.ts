// Printing one of the three Ramadan sheets (R2-R4): the chosen sheet and ink
// go on <html> while the print window is open (styles/global.css shows only
// that sheet), and come off afterwards so a plain Ctrl+P prints the default
// (the timetable, in colour). The visitor's ink choice is a per-viewer
// convenience in localStorage. Wired by static-entry.ts on prerendered pages
// and by the component's effect when the app's router draws the page.
import { SHEET_VARIANTS, type SheetInk, type SheetVariant } from './locales/ramadanSheet.js';

const INK_KEY = 'bustandeen_sheet_ink';

export function readSheetInk(): SheetInk {
  try {
    return localStorage.getItem(INK_KEY) === 'bw' ? 'bw' : 'color';
  } catch {
    return 'color'; // storage blocked: the default
  }
}

export function saveSheetInk(ink: SheetInk): void {
  try {
    if (ink === 'color') localStorage.removeItem(INK_KEY);
    else localStorage.setItem(INK_KEY, ink);
  } catch {
    /* storage blocked: the choice still applies on this page */
  }
}

/** Put the sheet and ink on <html> until the print window closes. */
export function markSheetPrint(variant: SheetVariant, ink: SheetInk): () => void {
  const html = document.documentElement;
  html.dataset.printVariant = variant;
  html.dataset.printInk = ink;
  const clear = () => {
    delete html.dataset.printVariant;
    delete html.dataset.printInk;
  };
  window.addEventListener('afterprint', clear, { once: true });
  return clear;
}

export function printSheet(variant: SheetVariant, ink: SheetInk): void {
  markSheetPrint(variant, ink);
  window.print();
}

const isVariant = (v: string | undefined): v is SheetVariant =>
  !!v && (SHEET_VARIANTS as readonly string[]).includes(v);

/** The download panel of a prerendered page: ink buttons and three sheets. */
export function wireSheetDownloads(root: ParentNode = document): void {
  const panel = root.querySelector<HTMLElement>('[data-sheet-downloads]');
  if (!panel || panel.dataset.wired) return;
  panel.dataset.wired = '1';
  let ink = readSheetInk();
  const inkButtons = panel.querySelectorAll<HTMLButtonElement>('[data-ink-value]');
  const drawInk = () =>
    inkButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.inkValue === ink)));
  drawInk();
  inkButtons.forEach((b) =>
    b.addEventListener('click', () => {
      ink = b.dataset.inkValue === 'bw' ? 'bw' : 'color';
      saveSheetInk(ink);
      drawInk();
    })
  );
  panel.querySelectorAll<HTMLButtonElement>('[data-sheet-print]').forEach((b) =>
    b.addEventListener('click', () => {
      const v = b.dataset.sheetPrint;
      if (isVariant(v)) printSheet(v, ink);
    })
  );
}
