import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          void: '#0e0d0a',
          deep: '#1a1812',
          surface: '#211f16',
          border: '#3a3425',
          emerald: '#7a9e6e',
          'emerald-dim': '#5a7a50',
          gold: '#c9a96e',
          'gold-dim': '#a08850',
          info: '#5a9e8e',
          'info-dim': '#488078',
          pink: '#d4839e',
          'pink-dim': '#b06a84',
          magenta: '#c4825a',
          warm: '#c4825a',
          'warm-dim': '#a06840',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'conic-brand': 'conic-gradient(from 0deg, #7a9e6e, #c9a96e, #c4825a, #7a9e6e)',
      },
      boxShadow: {
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
      'light',
    ],
    darkTheme: 'bustandeen',
  },
};
