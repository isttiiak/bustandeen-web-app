// "Did Ramadan begin on a different day where you live?" (R12): a visitor
// moves a prerendered Ramadan calendar by one day, earlier or later. The
// page is built from Umm al-Qura and the country's moon-sighting records; a
// visitor's masjid may begin a day apart. Sehri and iftar belong to the
// Gregorian date and never move: only which date is fast 1, the fast
// numbers and the "if Ramadan has 30 days" row move with the shift.
//
// The templates (RamadanCalendarPage, BdRamadanPage) prerender one extra row
// before fast 1 and one after the last, hidden, so either shift is drawn
// without a gap. Row `i` is the built plan's fast `i` (0 = the day before).
// Wired by static-entry.ts on the prerendered page, and by the template's
// own effect when the app's router draws it. Only attributes and text are
// changed (no nodes move), so React's markup stays intact.

export type RamadanShift = -1 | 0 | 1;

export const RAMADAN_SHIFTS: readonly RamadanShift[] = [-1, 0, 1];

/** The month's shape as built: its last fast, and whether that 30th is only
 * "if Ramadan has 30 days" (the Shawwal moon is not announced yet). */
export interface RamadanShape {
  maxFast: number;
  possible30: boolean;
}

export interface RowState {
  /** The fast this row's date holds under the shift (0 or less, or past the
   * month: not Ramadan). */
  fast: number;
  visible: boolean;
  possible: boolean;
}

/** Shift -1 ("began one day earlier"): the day before the built fast 1 is
 * fast 1. Shift +1 ("one day later"): the built fast 2 is fast 1. */
export function rowState(row: number, shift: RamadanShift, shape: RamadanShape): RowState {
  const fast = row - shift;
  const visible = fast >= 1 && fast <= shape.maxFast;
  return { fast, visible, possible: visible && shape.possible30 && fast === 30 };
}

export function parseShift(value: string | null | undefined): RamadanShift {
  return value === '-1' ? -1 : value === '1' ? 1 : 0;
}

/** One key per city and year, shared by the page's languages. */
export function shiftStorageKey(barePath: string): string {
  return `bustandeen_ramadan_shift:${barePath}`;
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** A fast number in the page's digits (Bangla pages: Bangla digits). */
export function formatFast(n: number, digits: string | undefined): string {
  const s = String(n);
  return digits === 'bn' ? s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : s;
}

function readShift(key: string): RamadanShift {
  try {
    return parseShift(localStorage.getItem(key));
  } catch {
    return 0; // storage blocked: the page as built
  }
}

function saveShift(key: string, shift: RamadanShift): void {
  try {
    if (shift === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, String(shift));
  } catch {
    /* storage blocked: the shift still applies until the page is left */
  }
}

/** Draw the page's calendar under `shift`. */
export function applyRamadanShift(root: ParentNode, shift: RamadanShift): void {
  const table = root.querySelector<HTMLElement>('[data-ramadan-table]');
  if (!table) return;
  const shape: RamadanShape = {
    maxFast: Number(table.dataset.maxFast) || 29,
    possible30: table.dataset.possible30 === '1',
  };
  const digits = table.dataset.digits;

  table.querySelectorAll<HTMLElement>('tr[data-ramadan-row]').forEach((tr) => {
    const s = rowState(Number(tr.dataset.ramadanRow), shift, shape);
    tr.hidden = !s.visible;
    if (s.visible) tr.dataset.fast = String(s.fast);
    else delete tr.dataset.fast;
    tr.toggleAttribute('data-possible', s.possible);
    const num = tr.querySelector<HTMLElement>('[data-fast-num]');
    if (num) num.textContent = s.visible ? formatFast(s.fast, digits) : '';
    const note = tr.querySelector<HTMLElement>('[data-possible-note]');
    if (note) note.hidden = !s.possible;
  });
  // The "if Ramadan has 30 days" label sits above whichever row is the 30th.
  table.querySelectorAll<HTMLElement>('tr[data-possible-label]').forEach((tr) => {
    tr.hidden = !rowState(Number(tr.dataset.possibleLabel), shift, shape).possible;
  });

  root.querySelectorAll<HTMLElement>('[data-shift-note]').forEach((p) => {
    p.hidden = parseShift(p.dataset.shiftNote) !== shift || shift === 0;
  });
  root.querySelectorAll<HTMLElement>('[data-shift-value]').forEach((b) => {
    b.setAttribute('aria-pressed', String(parseShift(b.dataset.shiftValue) === shift));
  });
}

/** Show the control, apply the visitor's saved shift and follow the buttons. */
export function wireRamadanShift(root: ParentNode = document): void {
  const control = root.querySelector<HTMLElement>('[data-ramadan-shift]');
  if (!control || control.dataset.wired) return;
  control.dataset.wired = '1';
  const key = shiftStorageKey(control.dataset.ramadanShift ?? location.pathname);
  control.hidden = false;
  applyRamadanShift(root, readShift(key));
  control.querySelectorAll<HTMLButtonElement>('[data-shift-value]').forEach((b) =>
    b.addEventListener('click', () => {
      const shift = parseShift(b.dataset.shiftValue);
      saveShift(key, shift);
      applyRamadanShift(root, shift);
    })
  );
}
