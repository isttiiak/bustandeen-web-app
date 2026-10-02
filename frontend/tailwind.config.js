import daisyui from 'daisyui';
import colors from 'tailwindcss/colors';

const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;
const BRAND = {
  void: c('void'),
  deep: c('deep'),
  // between void and deep: the navbar/footer gradient start
  'void-deep': c('void-deep'),
  surface: c('surface'),
  border: c('border'),
  emerald: c('emerald'),
  'emerald-dim': c('emerald-dim'),
  gold: c('gold'),
  'gold-dim': c('gold-dim'),
  info: c('info'),
  'info-dim': c('info-dim'),
  pink: c('pink'),
  'pink-dim': c('pink-dim'),
  magenta: c('warm'),
  warm: c('warm'),
  'warm-dim': c('warm-dim'),
};
// Text colours get a per-theme opacity floor (0 on dark = unchanged).
const tf = (v, floor) => v.replace('<alpha-value>', `max(<alpha-value>, var(--${floor}))`);

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Theme tokens live in src/styles/global.css as RGB channels per
      // data-theme (dark = the original palette). `white` is "ink": real
      // white on dark, dark ink on the sage-paper light theme. `on-color`
      // stays white for text on a solid coloured fill.
      colors: {
        white: c('ink'),
        'on-color': '#ffffff',
        // Dark text that must stay dark (on a literally white surface).
        'ink-fixed': '#1a1812',
        // Inset panels (`bg-shade/20`): black on dark, a soft sage on paper.
        shade: c('shade'),
        hero: c('hero'),
        reader: {
          from: c('reader-from'),
          via: c('reader-via'),
          to: c('reader-to'),
          text: c('reader-text'),
          note: c('reader-note'),
        },
        red: { ...colors.red, 300: c('red-300'), 400: c('red-400') },
        brand: BRAND,
      },
      // Faint ink text never drops below the theme's floor (0 on dark, so
      // nothing changes there; lifted on paper to keep 4.5:1, see global.css).
      textColor: {
        white: 'rgb(var(--c-ink) / max(<alpha-value>, var(--ink-text-floor)))',
        brand: Object.fromEntries(
          Object.entries(BRAND).map(([k, v]) => [k, tf(v, 'accent-text-floor')])
        ),
        red: {
          ...colors.red,
          300: tf(c('red-300'), 'accent-text-floor'),
          400: tf(c('red-400'), 'accent-text-floor'),
        },
      },
      borderRadius: {
        card: '1.25rem',
        control: '0.75rem',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'conic-brand': 'conic-gradient(from 0deg, #7a9e6e, #c9a96e, #c4825a, #7a9e6e)',
      },
      boxShadow: {
        'elev-1': 'var(--elev-1)',
        'elev-2': 'var(--elev-2)',
        'elev-3': 'var(--elev-3)',
        hover: 'var(--elev-hover)',
        hero: 'var(--elev-hero)',
        glass: '0 20px 60px -20px rgba(0,0,0,0.6)',
        islamic: '0 10px 40px rgba(122,158,110,0.2)',
        'glow-emerald': '0 0 24px rgba(122,158,110,0.45)',
        'glow-gold': '0 0 24px rgba(201,169,110,0.45)',
        'glow-magenta': '0 0 24px rgba(196,130,90,0.45)',
      },
      fontFamily: {
        display: ['"El Messiri"', '"Hind Siliguri"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', '"Hind Siliguri"', 'system-ui', 'sans-serif'],
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        navbarShimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        bustandeen: {
          primary: '#7a9e6e',
          secondary: '#5a7a50',
          accent: '#c9a96e',
          neutral: '#211f16',
          'base-100': '#0e0d0a',
          'base-200': '#1a1812',
          'base-300': '#211f16',
          'base-content': '#e8e2d4',
          success: '#7a9e6e',
          warning: '#c9a96e',
          error: '#ef4444',
          info: '#5a9e8e',
        },
      },
      {
        // Sage paper (T3.2). Brand colours above swap with it too.
        'bustandeen-light': {
          primary: '#3a5632',
          secondary: '#36512e',
          accent: '#5f4a18',
          neutral: '#e2e7d3',
          'base-100': '#edefe2',
          'base-200': '#f8f8ef',
          'base-300': '#e2e7d3',
          'base-content': '#1f2418',
          success: '#3a5632',
          warning: '#5f4a18',
          error: '#b42318',
          info: '#285b51',
        },
      },
    ],
    darkTheme: 'bustandeen',
  },
};
