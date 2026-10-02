import { useEffect } from 'react';
import { watchTheme } from '../utils/theme.js';

/** Applies the saved theme mode and keeps it current (utils/theme.ts). */
export default function ThemeInit() {
  useEffect(() => watchTheme(), []);
  return null;
}
