/** Adds transparency to a colour given as `#rrggbb` or as a theme token
 *  `rgb(var(--c-x))`. `hexAlpha` is the two-digit hex alpha the old
 *  `${color}1c` code appended, so the dark theme renders exactly as before. */
export function withAlpha(color: string, hexAlpha: string): string {
  if (color.startsWith('#')) return `${color}${hexAlpha}`;
  const a = Math.round((parseInt(hexAlpha, 16) / 255) * 1000) / 1000;
  return color.replace(/\)\s*$/, ` / ${a})`);
}
