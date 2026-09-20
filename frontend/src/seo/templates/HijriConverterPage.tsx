import { useState } from 'react';
import { CHROME, type SeoLang } from '../locales/chrome.js';
import Layout from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd } from '../components/JsonLd.js';
import { toHijri, hijriToGregorian, type HijriDate } from '../utils/calc.js';

const LOCALE_BY_LANG: Record<SeoLang, string> = { en: 'en-US', bn: 'bn-BD', ar: 'ar-SA' };
const HIJRI_MONTHS: Record<SeoLang, string[]> = {
  en: [
    'Muharram',
    'Safar',
    "Rabi' al-Awwal",
    "Rabi' al-Thani",
    'Jumada al-Awwal',
    'Jumada al-Thani',
    'Rajab',
    "Sha'ban",
    'Ramadan',
    'Shawwal',
    "Dhu al-Qi'dah",
    'Dhu al-Hijjah',
  ],
  bn: [
    'মুহাররম',
    'সফর',
    'রবিউল আউয়াল',
    'রবিউস সানি',
    'জমাদিউল আউয়াল',
    'জমাদিউস সানি',
    'রজব',
    'শাবান',
    'রমজান',
    'শাওয়াল',
    'জিলকদ',
    'জিলহজ',
  ],
  ar: [
    'محرم',
    'صفر',
    'ربيع الأول',
    'ربيع الآخر',
    'جمادى الأولى',
    'جمادى الآخرة',
    'رجب',
    'شعبان',
    'رمضان',
    'شوال',
    'ذو القعدة',
    'ذو الحجة',
  ],
};

// Shared with the live app's Hijri-adjustment setting (utils/islamicCalendar.ts's
// getHijriAdjustment/setHijriAdjustment) — same key, so a choice made here
// carries over to the app's own Hijri-date display, and vice versa. Read/write
// wrapped in try/catch: during SSR (react-dom/server, no `localStorage`) this
// throws and falls back to 0, same pattern used throughout the codebase.
const HIJRI_ADJUSTMENT_KEY = 'bustandeen_hijri_offset';
function readStoredAdjustment(): -1 | 0 | 1 {
  try {
    const raw = parseInt(localStorage.getItem(HIJRI_ADJUSTMENT_KEY) ?? '0', 10);
    return raw === -1 || raw === 1 ? raw : 0;
  } catch {
    return 0;
  }
}
function writeStoredAdjustment(value: -1 | 0 | 1): void {
  try {
    localStorage.setItem(HIJRI_ADJUSTMENT_KEY, String(value));
  } catch {
    /* private mode */
  }
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatHijri(h: HijriDate, lang: SeoLang): string {
  return `${h.day} ${HIJRI_MONTHS[lang][h.month - 1]} ${h.year} AH`;
}

interface Props {
  lang: SeoLang;
  buildDate: Date;
}

export default function HijriConverterPage({ lang, buildDate }: Props) {
  const t = CHROME[lang];
  const locale = LOCALE_BY_LANG[lang];
  const todayHijri = toHijri(buildDate);

  const [adjustment, setAdjustment] = useState<-1 | 0 | 1>(() => readStoredAdjustment());
  const [gregorianInput, setGregorianInput] = useState(() => todayIsoDate());
  const [hijriDay, setHijriDay] = useState(todayHijri.day);
  const [hijriMonth, setHijriMonth] = useState(todayHijri.month);
  const [hijriYear, setHijriYear] = useState(todayHijri.year);

  const applyAdjustment = (value: -1 | 0 | 1) => {
    setAdjustment(value);
    writeStoredAdjustment(value);
  };

  const parsedGregorian = new Date(`${gregorianInput}T00:00:00Z`);
  const gregorianToHijriResult = Number.isNaN(parsedGregorian.getTime())
    ? null
    : toHijri(new Date(parsedGregorian.getTime() + adjustment * 86_400_000));

  const hijriToGregorianResult = new Date(
    hijriToGregorian(hijriYear, hijriMonth, hijriDay).getTime() - adjustment * 86_400_000
  );

  const url = `https://bustandeen.com${lang === 'en' ? '' : `/${lang}`}/hijri-date-converter`;

  return (
    <Layout
      lang={lang}
      barePath="/hijri-date-converter"
      breadcrumbs={[
        { label: t.home, path: 'https://bustandeen.com/' },
        { label: t.breadcrumbHijri },
      ]}
    >
      <h1 className="text-2xl sm:text-3xl font-black text-[#f1f5f9]">{t.hijri.title}</h1>
      <p className="text-[#94a3b8] mt-2">{t.hijri.subtitle}</p>

      {/* Region / moon-sighting adjustment — same ±1 day convention as the
          in-app Settings page, since Hijri month start can genuinely differ
          by a day between regions depending on local moon-sighting. */}
      <div className="mt-6 rounded-2xl border border-[#1e2d42] bg-[#0d1520] p-4">
        <p className="text-xs uppercase tracking-widest text-[#94a3b8] mb-2">
          {t.hijri.adjustmentLabel}
        </p>
        <div className="flex gap-2">
          {([-1, 0, 1] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => applyAdjustment(v)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
                adjustment === v
                  ? 'bg-[#10b981] text-[#080c12]'
                  : 'bg-[#141e2e] border border-[#1e2d42] text-[#94a3b8]'
              }`}
            >
              {v === 0 ? t.hijri.adjustmentNone : v > 0 ? `+${v}` : v}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#94a3b8] mt-2">{t.hijri.adjustmentNote}</p>
      </div>

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {/* Gregorian -> Hijri */}
        <div className="rounded-2xl border border-[#1e2d42] bg-[#0d1520] p-5">
          <p className="text-xs uppercase tracking-widest text-[#94a3b8] mb-2">
            {t.hijri.gregorianLabel}
          </p>
          <input
            type="date"
            value={gregorianInput}
            onChange={(e) => setGregorianInput(e.target.value)}
            className="w-full rounded-lg bg-[#141e2e] border border-[#1e2d42] text-[#f1f5f9] px-3 py-2 text-sm"
          />
          <p className="text-xs uppercase tracking-widest text-[#94a3b8] mt-4 mb-1">
            {t.hijri.hijriLabel}
          </p>
          <p className="text-lg font-bold text-[#10b981]">
            {gregorianToHijriResult ? formatHijri(gregorianToHijriResult, lang) : '—'}
          </p>
        </div>

        {/* Hijri -> Gregorian */}
        <div className="rounded-2xl border border-[#1e2d42] bg-[#0d1520] p-5">
          <p className="text-xs uppercase tracking-widest text-[#94a3b8] mb-2">
            {t.hijri.hijriLabel}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={hijriDay}
              onChange={(e) => setHijriDay(parseInt(e.target.value, 10))}
              className="rounded-lg bg-[#141e2e] border border-[#1e2d42] text-[#f1f5f9] px-2 py-2 text-sm"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={hijriMonth}
              onChange={(e) => setHijriMonth(parseInt(e.target.value, 10))}
              className="col-span-1 rounded-lg bg-[#141e2e] border border-[#1e2d42] text-[#f1f5f9] px-2 py-2 text-sm"
            >
              {HIJRI_MONTHS[lang].map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={hijriYear}
              onChange={(e) => setHijriYear(parseInt(e.target.value, 10) || hijriYear)}
              className="rounded-lg bg-[#141e2e] border border-[#1e2d42] text-[#f1f5f9] px-2 py-2 text-sm"
            />
          </div>
          <p className="text-xs uppercase tracking-widest text-[#94a3b8] mt-4 mb-1">
            {t.hijri.gregorianLabel}
          </p>
          <p className="text-lg font-bold text-[#10b981]">
            {new Intl.DateTimeFormat(locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'UTC',
            }).format(hijriToGregorianResult)}
          </p>
        </div>
      </div>

      <p className="text-xs text-[#94a3b8] mt-4">
        {t.hijri.todayLabel}: {formatHijri(todayHijri, lang)}
      </p>

      <a
        href="https://bustandeen.com/"
        className="mt-5 inline-block rounded-xl bg-[#10b981] text-[#080c12] font-bold text-sm px-4 py-2.5 no-underline"
      >
        {t.hijri.convertHint}
      </a>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: t.home, url: 'https://bustandeen.com/' },
          { name: t.breadcrumbHijri, url },
        ])}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: t.hijri.title,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Web',
          url,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />
    </Layout>
  );
}
