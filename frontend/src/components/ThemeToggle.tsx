import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { THEME_MODE_EVENT, toggleLightDark, type ResolvedTheme } from '../utils/theme.js';

function currentTheme(): ResolvedTheme {
  return document.documentElement.getAttribute('data-theme') === 'bustandeen-light'
    ? 'bustandeen-light'
    : 'bustandeen';
}

/** Navbar Light/Dark switch. It shows what tapping will turn on. System and
 *  Daylight modes stay in Settings → Appearance; a tap here replaces them. */
export default function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<ResolvedTheme>(currentTheme);

  useEffect(() => {
    // Settings, the OS theme or the daylight boundary can change it too.
    const sync = () => setTheme(currentTheme());
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    window.addEventListener(THEME_MODE_EVENT, sync);
    return () => {
      observer.disconnect();
      window.removeEventListener(THEME_MODE_EVENT, sync);
    };
  }, []);

  const light = theme === 'bustandeen-light';
  const label = light
    ? t('nav.themeToDark', 'Switch to dark')
    : t('nav.themeToLight', 'Switch to light');
  return (
    <button
      type="button"
      onClick={() => setTheme(toggleLightDark(theme))}
      aria-label={label}
      title={label}
      className="flex items-center justify-center w-8 h-8 rounded-xl border border-brand-border/60 bg-brand-deep/60 hover:shadow-hover text-white/80 hover:text-white hover:bg-white/10 transition-all"
    >
      {light ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
    </button>
  );
}
