/**
 * Design options for the āyah share card: colour themes, tiled background
 * patterns, decorative ornaments, aspect ratios and pattern intensity. Every
 * choice is independent, so the combinations multiply (themes × patterns ×
 * ornaments × ratios × intensities) and are remembered as one prefs object.
 */

export type ShareCardRatioId = 'square' | 'portrait' | 'story';
export type ShareCardPatternId = 'none' | 'star' | 'lattice' | 'dots' | 'waves' | 'rays';
export type ShareCardOrnamentId = 'none' | 'frame' | 'corners' | 'skyline' | 'arch' | 'crescent';
export type ShareCardIntensityId = 'subtle' | 'medium' | 'bold';

export interface ShareCardRatio {
  id: ShareCardRatioId;
  label: string;
  width: number;
  height: number;
  /** multiplies the base font sizes, since a taller frame has room to breathe */
  fontBoost: number;
}

export const SHARE_CARD_WIDTH = 1080;

export const SHARE_CARD_RATIOS: ShareCardRatio[] = [
  { id: 'square', label: 'Square', width: 1080, height: 1080, fontBoost: 1 },
  { id: 'portrait', label: 'Portrait', width: 1080, height: 1350, fontBoost: 1.05 },
  { id: 'story', label: 'Story', width: 1080, height: 1920, fontBoost: 1.15 },
];

export interface ShareCardTheme {
  id: string;
  label: string;
  /** decorative radial glow + base gradient */
  background: string;
  border: string;
  /** used for the āyah badge, the footer dot, patterns and ornaments */
  accent: string;
  /** Arabic text */
  text: string;
  /** primary translation */
  body: string;
  /** secondary translation, surah name, footer */
  muted: string;
  /** transliteration */
  translit: string;
}

const DARK_TEXT = {
  text: '#f1f5f9',
  body: 'rgba(241,245,249,0.8)',
  muted: '#94a3b8',
  translit: 'rgba(245,158,11,0.8)',
};

function glowTheme(
  id: string,
  label: string,
  accent: string,
  base: [string, string, string]
): ShareCardTheme {
  const { r, g, b } = hexToRgb(accent);
  return {
    id,
    label,
    background: `radial-gradient(circle at 25% 15%, rgba(${r},${g},${b},0.14), transparent 55%), linear-gradient(135deg, ${base[0]} 0%, ${base[1]} 55%, ${base[2]} 100%)`,
    border: `rgba(${r},${g},${b},0.2)`,
    accent,
    ...DARK_TEXT,
  };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1]!, 16) : 0x10b981;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export const CUSTOM_THEME_ID = 'custom';
export const DEFAULT_CUSTOM_ACCENT = '#38bdf8';

/** A dark theme derived from any accent colour the user picks. */
export function makeCustomTheme(accent: string): ShareCardTheme {
  return {
    ...glowTheme(CUSTOM_THEME_ID, 'Custom', accent, ['#0d1218', '#0a0e14', '#0b0d12']),
    translit: accent,
  };
}

/** Dark-first, built from the app's brand tokens, plus a few extra hues and one
 * light "Ivory" option for people who want a paper-like card. */
export const SHARE_CARD_THEMES: ShareCardTheme[] = [
  glowTheme('emerald', 'Emerald', '#10b981', ['#0d1b17', '#0a1412', '#0d1420']),
  glowTheme('gold', 'Gold', '#f59e0b', ['#1a1510', '#120e0a', '#0d0b08']),
  glowTheme('midnight', 'Midnight', '#c026d3', ['#0d1220', '#0a0a14', '#120a18']),
  {
    id: 'slate',
    label: 'Slate',
    background: 'linear-gradient(135deg, #080c12 0%, #0a0e14 100%)',
    border: 'rgba(148,163,184,0.16)',
    accent: '#94a3b8',
    ...DARK_TEXT,
  },
  glowTheme('ocean', 'Ocean', '#38bdf8', ['#0a1620', '#08111a', '#0a0e18']),
  glowTheme('rose', 'Rose', '#fb7185', ['#1c0f14', '#140a0e', '#0e0a0d']),
  glowTheme('forest', 'Forest', '#84cc16', ['#12180d', '#0d1209', '#0b0e09']),
  {
    id: 'ivory',
    label: 'Ivory',
    background:
      'radial-gradient(circle at 25% 15%, rgba(180,140,60,0.16), transparent 55%), linear-gradient(135deg, #f8f3e8 0%, #f1ead9 55%, #ebe2cd 100%)',
    border: 'rgba(120,90,30,0.25)',
    accent: '#a16207',
    text: '#1c1917',
    body: 'rgba(28,25,23,0.82)',
    muted: '#78716c',
    translit: '#a16207',
  },
];

export const DEFAULT_SHARE_CARD_THEME = SHARE_CARD_THEMES[0]!;

export const SHARE_CARD_PATTERNS: { id: ShareCardPatternId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'star', label: 'Star' },
  { id: 'lattice', label: 'Lattice' },
  { id: 'dots', label: 'Dots' },
  { id: 'waves', label: 'Waves' },
  { id: 'rays', label: 'Rays' },
];

export const SHARE_CARD_ORNAMENTS: { id: ShareCardOrnamentId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'frame', label: 'Frame' },
  { id: 'corners', label: 'Corners' },
  { id: 'arch', label: 'Arch' },
  { id: 'skyline', label: 'Mosque' },
  { id: 'crescent', label: 'Crescent' },
];

export const SHARE_CARD_INTENSITIES: { id: ShareCardIntensityId; label: string; mult: number }[] = [
  { id: 'subtle', label: 'Subtle', mult: 0.6 },
  { id: 'medium', label: 'Medium', mult: 1 },
  { id: 'bold', label: 'Bold', mult: 1.7 },
];

export interface ShareCardPrefs {
  themeId: string;
  customAccent: string;
  pattern: ShareCardPatternId;
  ornament: ShareCardOrnamentId;
  intensity: ShareCardIntensityId;
  ratio: ShareCardRatioId;
}

export const DEFAULT_SHARE_CARD_PREFS: ShareCardPrefs = {
  themeId: DEFAULT_SHARE_CARD_THEME.id,
  customAccent: DEFAULT_CUSTOM_ACCENT,
  pattern: 'star',
  ornament: 'none',
  intensity: 'medium',
  ratio: 'square',
};

const PREFS_KEY = 'bustandeen_share_card_prefs';
/** pre-v5.41 key that stored only the theme id */
const LEGACY_THEME_KEY = 'bustandeen_share_card_theme';

function pick<T extends string>(value: unknown, options: { id: T }[], fallback: T): T {
  return options.find((o) => o.id === value)?.id ?? fallback;
}

export function getShareCardPrefs(): ShareCardPrefs {
  const d = DEFAULT_SHARE_CARD_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<ShareCardPrefs>;
      const themeIds = [...SHARE_CARD_THEMES, { id: CUSTOM_THEME_ID }];
      return {
        themeId: pick(p.themeId, themeIds, d.themeId),
        customAccent:
          typeof p.customAccent === 'string' && /^#[0-9a-f]{6}$/i.test(p.customAccent)
            ? p.customAccent
            : d.customAccent,
        pattern: pick(p.pattern, SHARE_CARD_PATTERNS, d.pattern),
        ornament: pick(p.ornament, SHARE_CARD_ORNAMENTS, d.ornament),
        intensity: pick(p.intensity, SHARE_CARD_INTENSITIES, d.intensity),
        ratio: pick(p.ratio, SHARE_CARD_RATIOS, d.ratio),
      };
    }
    // Carry over the theme people already picked before the redesign.
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy && SHARE_CARD_THEMES.some((t) => t.id === legacy)) return { ...d, themeId: legacy };
  } catch {
    /* storage blocked or corrupt: fall through to defaults */
  }
  return d;
}

export function setShareCardPrefs(prefs: ShareCardPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* non-fatal: prefs just won't be remembered */
  }
}

export function resolveShareCardTheme(prefs: ShareCardPrefs): ShareCardTheme {
  if (prefs.themeId === CUSTOM_THEME_ID) return makeCustomTheme(prefs.customAccent);
  return SHARE_CARD_THEMES.find((t) => t.id === prefs.themeId) ?? DEFAULT_SHARE_CARD_THEME;
}
