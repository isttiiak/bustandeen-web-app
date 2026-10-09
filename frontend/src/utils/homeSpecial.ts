// How Home shows today's special days (Settings → Home). Three levels of
// guidance, picked by the user:
//  - 'full'  : the whole special-day block (rows, sadaqah, Friday hour, Kahf)
//              right under the prayer arch, above the worship cards.
//  - 'strip' : a compact "Today" strip under the arch (default); the detailed
//              cards stay below the worship cards.
//  - 'pills' : small chips in the arch foot, no extra height; detailed cards
//              stay below the worship cards.
// Musafir / location prompts always sit directly under the arch, before any of these.

export type HomeSpecialLayout = 'full' | 'strip' | 'pills';

export const HOME_SPECIAL_KEY = 'bustandeen_home_special';
export const HOME_SPECIAL_LAYOUTS: readonly HomeSpecialLayout[] = ['full', 'strip', 'pills'];
export const HOME_SPECIAL_DEFAULT: HomeSpecialLayout = 'strip';
/** Rows (strip) or chips (pills) shown before the "N more" link. */
export const HIGHLIGHT_CAP = 2;
/** Anchor of the detailed special-day block that "N more" scrolls to. */
export const TODAY_SPECIAL_ID = 'today-special';

export function parseHomeSpecialLayout(v: string | null): HomeSpecialLayout {
  return (HOME_SPECIAL_LAYOUTS as readonly string[]).includes(v ?? '')
    ? (v as HomeSpecialLayout)
    : HOME_SPECIAL_DEFAULT;
}

const MAJOR_DAYS = new Set(['arafah', 'laylat_qadr', 'eid_fitr', 'eid_adha']);
const dayRank = (id: string) => (MAJOR_DAYS.has(id) ? 0 : id === 'fast_mon_thu' ? 2 : 1);

export type Highlight = { kind: 'fridayHour'; finalStretch: boolean } | { kind: 'day'; id: string };

/**
 * Order for the strip / pills: the Friday hour of response while it is on,
 * then Arafah / Laylat al-Qadr / the two Eids, then other special days, then
 * the Monday/Thursday fast. Stable within a rank.
 */
export function orderHighlights(
  dayIds: readonly string[],
  fridayHour: { active: boolean; isFinalStretch: boolean }
): Highlight[] {
  const days = dayIds
    .map((id, i) => ({ id, i }))
    .sort((a, b) => dayRank(a.id) - dayRank(b.id) || a.i - b.i)
    .map(({ id }): Highlight => ({ kind: 'day', id }));
  return fridayHour.active
    ? [{ kind: 'fridayHour', finalStretch: fridayHour.isFinalStretch }, ...days]
    : days;
}
