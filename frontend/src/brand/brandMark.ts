// The Bustandeen mark (v5.155.0): a crescent and star for the deen, a sprout
// with two flowers for the bustan. One source of geometry for the in-app
// <BrandMark> and scripts/generate-brand-assets.mjs (favicon, PWA icons,
// og-image, the social images in /brand). Drawn on a 512 grid.
//
// This file has no imports so Node can load it directly from the script.

export type MarkVariant = 'full' | 'small';

export interface Flower {
  cx: number;
  cy: number;
  r: number;
  /** Which petal colour: the coral one or the rose one. */
  petal: 'a' | 'b';
}

/** Moves the drawing so its bounding box is centred on (256, 256). */
export const MARK_OFFSET = 'translate(-8 -4)';

/** Behind the crescent, so the crescent edge stays whole. */
export const STEM = 'M222 356C240 306 262 254 302 204';
export const CRESCENT = 'M222.7 109.4A170 170 0 1 0 423.5 304.2A140 140 0 1 1 222.7 109.4Z';
export const LEAF = 'M262 270C282 238 318 224 362 234C342 270 302 284 262 270Z';
export const LEAF_WARM = 'M284 232C254 222 234 192 236 156C266 172 286 198 284 232Z';
export const STAR = 'M336 74Q343 113 382 120Q343 127 336 166Q329 127 290 120Q329 113 336 74Z';
/** The small coral star; left out of the small mark. */
export const SPARK = 'M424 184Q427 199 442 202Q427 205 424 220Q421 205 406 202Q421 199 424 184Z';

export const FLOWERS: Record<MarkVariant, Flower[]> = {
  full: [
    { cx: 299.9, cy: 324.2, r: 22, petal: 'a' },
    { cx: 344.9, cy: 327.4, r: 16, petal: 'b' },
  ],
  // One larger flower reads better at 16-32 px than two small ones.
  small: [{ cx: 296.7, cy: 319.6, r: 28, petal: 'a' }],
};

/** Five round petals around the flower centre. */
export function petals(f: Flower): { cx: number; cy: number; r: number }[] {
  return [0, 1, 2, 3, 4].map((k) => {
    const a = ((k * 72 - 90) * Math.PI) / 180;
    return {
      cx: +(f.cx + Math.cos(a) * f.r * 0.56).toFixed(1),
      cy: +(f.cy + Math.sin(a) * f.r * 0.56).toFixed(1),
      r: +(f.r * 0.5).toFixed(1),
    };
  });
}

export function flowerCentreRadius(f: Flower): number {
  return +(f.r * 0.34).toFixed(1);
}

export interface MarkPalette {
  tile: string;
  moon1: string;
  moon2: string;
  star1: string;
  star2: string;
  spark: string;
  leaf: string;
  leafWarm: string;
  petalA: string;
  petalB: string;
  flowerCentre: string;
}

/** "Bright": the chosen social and icon colours. Mirrored by --logo-* in global.css. */
export const BRIGHT: MarkPalette = {
  tile: '#0f1711',
  moon1: '#bff59a',
  moon2: '#239a6c',
  star1: '#ffe38c',
  star2: '#f5a22a',
  spark: '#ff7a4d',
  leaf: '#8fe070',
  leafWarm: '#ff8a55',
  petalA: '#ff7a4d',
  petalB: '#ff9fc6',
  flowerCentre: '#ffe38c',
};

/** Darker set for light (paper) backgrounds. Mirrored by --logo-* in global.css. */
export const PAPER: MarkPalette = {
  tile: '#eef0e2',
  moon1: '#4f7d40',
  moon2: '#1f3d1b',
  star1: '#c28a1f',
  star2: '#7a4f0a',
  spark: '#a3441c',
  leaf: '#356329',
  leafWarm: '#a3441c',
  petalA: '#a3441c',
  petalB: '#9c3d63',
  flowerCentre: '#c28a1f',
};

/** The mark as SVG markup (no <svg> wrapper), for the asset script. */
export function markSvg(variant: MarkVariant, p: MarkPalette, idPrefix = 'bm'): string {
  const flowers = FLOWERS[variant]
    .map(
      (f) =>
        `<g fill="${f.petal === 'a' ? p.petalA : p.petalB}">` +
        petals(f)
          .map((c) => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>`)
          .join('') +
        `</g><circle cx="${f.cx}" cy="${f.cy}" r="${flowerCentreRadius(f)}" fill="${p.flowerCentre}"/>`
    )
    .join('');
  return (
    `<defs>` +
    `<linearGradient id="${idPrefix}-moon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.moon1}"/><stop offset="1" stop-color="${p.moon2}"/></linearGradient>` +
    `<linearGradient id="${idPrefix}-star" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.star1}"/><stop offset="1" stop-color="${p.star2}"/></linearGradient>` +
    `</defs>` +
    `<g transform="${MARK_OFFSET}">` +
    `<path d="${STEM}" fill="none" stroke="${p.leaf}" stroke-width="12" stroke-linecap="round"/>` +
    `<path d="${CRESCENT}" fill="url(#${idPrefix}-moon)"/>` +
    `<path d="${LEAF}" fill="${p.leaf}"/>` +
    `<path d="${LEAF_WARM}" fill="${p.leafWarm}"/>` +
    flowers +
    `<path d="${STAR}" fill="url(#${idPrefix}-star)"/>` +
    (variant === 'full' ? `<path d="${SPARK}" fill="${p.spark}"/>` : '') +
    `</g>`
  );
}
