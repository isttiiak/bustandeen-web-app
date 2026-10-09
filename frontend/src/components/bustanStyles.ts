// Bustan Arch classes (T3.2), shared by the redesigned screens (Quran,
// Fasting) so every card, button and tile has the same radius, border and
// elevation in both themes.

/** A raised theme card (dark card on dark, paper on sage paper). */
export const CARD = 'rounded-card border border-brand-border bg-brand-deep shadow-elev-2';

/** A stat tile: a card with centred content. */
export const TILE = `${CARD} p-4 text-center`;

/** Section heading inside a card, with a leading SVG icon. */
export const SECTION_TITLE = 'font-display text-white font-bold text-base flex items-center gap-2';

/** A tappable row/item inside a card. */
export const ITEM =
  'rounded-control border border-brand-border bg-brand-surface/50 hover:border-brand-gold/40 hover:bg-brand-surface p-3 text-left transition-colors';

/** Solid dark-sage action (white text at 4.8:1, A11Y-01). `btn-solid`: stays white
 *  text when disabled (styles/global.css). */
export const BTN_PRIMARY =
  'btn-solid inline-flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-bold text-on-color bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-110 shadow-elev-1 transition disabled:opacity-50 disabled:cursor-not-allowed';

/** Quiet action: a raised paper/dark button with a border. */
export const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-bold text-white/80 hover:text-white bg-brand-deep border border-brand-border hover:border-brand-emerald/40 shadow-elev-1 transition-colors';

/** A chosen / not chosen option tile or chip (Settings, Library, Share āyah). */
export const OPTION_ON = 'bg-brand-emerald/10 border-brand-emerald text-white';
export const OPTION_OFF =
  'bg-brand-surface/50 border-brand-border text-white/80 hover:text-white hover:border-brand-emerald/40';

/** A citation link under a virtue or note. */
export const REF_LINK =
  'inline-block mt-1 text-brand-gold text-[11px] underline underline-offset-2';
