// Self-hosted fonts (audit T2.7 / PWA-03). These used to come from Google
// Fonts, which meant a request to Google on every first visit and no text
// styling offline until the font cache warmed up. Fontsource ships the same
// faces as woff2 files that Vite bundles with the app.
//
// Only the scripts each face is used for are imported, so the browser never
// downloads glyphs it cannot use (each @font-face carries a unicode-range):
// - Plus Jakarta Sans (body) and El Messiri (headings): Latin + Latin Extended.
// - Amiri and Scheherazade New: Arabic only (Quran, duʿā and dhikr text).
// - Hind Siliguri: Bengali only, the Bangla UI face. The body and heading
//   stacks list it after the Latin face, so Bangla text uses it and English
//   keeps Plus Jakarta Sans / El Messiri.
// The weights match what was loaded from Google Fonts before.

import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
// latin-ext: the transliteration letters (ā ḥ ṣ ʿ ...) in "Ṣaḥīḥ", "ʿAṣr".
import '@fontsource/plus-jakarta-sans/latin-ext-400.css';
import '@fontsource/plus-jakarta-sans/latin-ext-500.css';
import '@fontsource/plus-jakarta-sans/latin-ext-600.css';
import '@fontsource/plus-jakarta-sans/latin-ext-700.css';

import '@fontsource/el-messiri/latin-400.css';
import '@fontsource/el-messiri/latin-500.css';
import '@fontsource/el-messiri/latin-600.css';
import '@fontsource/el-messiri/latin-700.css';
import '@fontsource/el-messiri/latin-ext-400.css';
import '@fontsource/el-messiri/latin-ext-500.css';
import '@fontsource/el-messiri/latin-ext-600.css';
import '@fontsource/el-messiri/latin-ext-700.css';

import '@fontsource/amiri/arabic-400.css';
import '@fontsource/amiri/arabic-700.css';

import '@fontsource/scheherazade-new/arabic-400.css';
import '@fontsource/scheherazade-new/arabic-500.css';

import '@fontsource/hind-siliguri/bengali-400.css';
import '@fontsource/hind-siliguri/bengali-500.css';
import '@fontsource/hind-siliguri/bengali-600.css';
import '@fontsource/hind-siliguri/bengali-700.css';
