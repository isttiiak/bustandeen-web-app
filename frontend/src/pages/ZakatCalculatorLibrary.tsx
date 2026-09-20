import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { CHROME, type SeoLang } from '../seo/locales/chrome.js';
import { toHijri, hijriToGregorian } from '../seo/utils/calc.js';
import {
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
  GOLD_PRICE_USD_PER_GRAM,
  SILVER_PRICE_USD_PER_GRAM,
  PRICES_AS_OF,
  ZAKAT_RATE,
} from '../seo/content/zakat.js';

const LOCALE_BY_LANG: Record<SeoLang, string> = { en: 'en-US', bn: 'bn-BD', ar: 'ar-SA' };

function fmtCurrency(amount: number, lang: SeoLang): string {
  return new Intl.NumberFormat(LOCALE_BY_LANG[lang], {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtDate(date: Date, lang: SeoLang): string {
  return new Intl.DateTimeFormat(LOCALE_BY_LANG[lang], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function MoneyField({ label, value, onChange }: FieldProps) {
  return (
    <label className="block">
      <span className="text-xs text-white/40">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="mt-1 w-full rounded-lg bg-white/[0.04] border border-brand-border text-white px-3 py-2 text-sm"
      />
    </label>
  );
}

export default function ZakatCalculatorLibrary() {
  const { t, i18n } = useTranslation();
  // The app only ships en/bn (see i18n.ts) - reusing the same vetted copy
  // from the public SEO page's chrome.ts (CHROME.en.zakat / CHROME.bn.zakat)
  // rather than duplicating ~40 translated strings a second time.
  const lang: SeoLang = i18n.language === 'bn' ? 'bn' : 'en';
  const z = CHROME[lang].zakat;

  const [standard, setStandard] = useState<'gold' | 'silver'>('silver');
  const [includeJewelry, setIncludeJewelry] = useState(false);
  const [cash, setCash] = useState('');
  const [goldValue, setGoldValue] = useState('');
  const [silverValue, setSilverValue] = useState('');
  const [business, setBusiness] = useState('');
  const [receivables, setReceivables] = useState('');
  const [liabilities, setLiabilities] = useState('');
  const [hawlStart, setHawlStart] = useState('');

  const n = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
  const totalAssets = n(cash) + n(goldValue) + n(silverValue) + n(business) + n(receivables);
  const netZakatable = Math.max(0, totalAssets - n(liabilities));

  const nisabThreshold =
    standard === 'gold'
      ? GOLD_NISAB_GRAMS * GOLD_PRICE_USD_PER_GRAM
      : SILVER_NISAB_GRAMS * SILVER_PRICE_USD_PER_GRAM;
  const aboveNisab = netZakatable >= nisabThreshold;
  const zakatDue = aboveNisab ? netZakatable * ZAKAT_RATE : 0;

  let hawlResult: { daysLeft: number; dueDate: Date } | null = null;
  const parsedHawlStart = hawlStart ? new Date(`${hawlStart}T00:00:00Z`) : null;
  if (parsedHawlStart && !Number.isNaN(parsedHawlStart.getTime())) {
    const startHijri = toHijri(parsedHawlStart);
    const now = new Date();
    let yearsAhead = 1;
    let dueDate = hijriToGregorian(startHijri.year + yearsAhead, startHijri.month, startHijri.day);
    while (dueDate.getTime() < now.getTime() && yearsAhead < 50) {
      yearsAhead++;
      dueDate = hijriToGregorian(startHijri.year + yearsAhead, startHijri.month, startHijri.day);
    }
    const daysLeft = Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000));
    hawlResult = { daysLeft, dueDate };
  }

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('library.zakatSeoTitle', 'Zakat Calculator')}
        description={t(
          'library.zakatSeoDescription',
          'Work out your zakat: nisab by gold or silver standard, your assets and debts, and when your hawl is due.'
        )}
        path="/library/zakat-calculator"
        index={false}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-5 pb-10">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4 space-y-2"
          >
            <p className="text-4xl">🧮</p>
            <h1 className="text-2xl font-black text-white">{z.title}</h1>
            <p className="text-white/40 text-sm max-w-md mx-auto">{z.subtitle}</p>
            <p className="text-xs text-white/30">{z.pricesAsOfLabel(PRICES_AS_OF)}</p>
          </motion.div>

          {/* Nisab standard */}
          <div className="rounded-2xl border border-brand-border bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-2">{z.nisabTitle}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStandard('silver')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                  standard === 'silver'
                    ? 'bg-brand-emerald text-brand-void'
                    : 'bg-white/[0.04] border border-brand-border text-white/50'
                }`}
              >
                {z.nisabSilverLabel}
              </button>
              <button
                type="button"
                onClick={() => setStandard('gold')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                  standard === 'gold'
                    ? 'bg-brand-emerald text-brand-void'
                    : 'bg-white/[0.04] border border-brand-border text-white/50'
                }`}
              >
                {z.nisabGoldLabel}
              </button>
            </div>
            <p className="text-xs text-white/40 mt-2">{z.nisabStandardHint}</p>
            <p className="text-sm font-bold text-brand-emerald mt-2">
              {z.nisabTitle}: {fmtCurrency(nisabThreshold, lang)}
            </p>
            <p className="text-xs text-white/40 mt-3 font-semibold">{z.madhabTitle}</p>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">{z.madhabNote}</p>
          </div>

          {/* Jewelry disclosure */}
          <div className="rounded-2xl border border-brand-border bg-white/[0.04] p-4">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeJewelry}
                onChange={(e) => setIncludeJewelry(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm font-semibold text-white">{z.jewelryLabel}</span>
            </label>
            <p className="text-xs text-white/40 mt-2 leading-relaxed">{z.jewelryNote}</p>
          </div>

          {/* Assets */}
          <div className="rounded-2xl border border-brand-border bg-white/[0.04] p-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-white/40">{z.assetsTitle}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <MoneyField label={z.cashLabel} value={cash} onChange={setCash} />
              <MoneyField label={z.goldValueLabel} value={goldValue} onChange={setGoldValue} />
              <MoneyField
                label={z.silverValueLabel}
                value={silverValue}
                onChange={setSilverValue}
              />
              <MoneyField label={z.businessLabel} value={business} onChange={setBusiness} />
              <MoneyField
                label={z.receivablesLabel}
                value={receivables}
                onChange={setReceivables}
              />
              <MoneyField
                label={z.liabilitiesLabel}
                value={liabilities}
                onChange={setLiabilities}
              />
            </div>

            <div className="pt-3 border-t border-white/10 space-y-1">
              <p className="text-xs text-white/40 flex justify-between">
                <span>{z.totalLabel}</span>
                <span>{fmtCurrency(totalAssets, lang)}</span>
              </p>
              <p className="text-sm font-bold text-white flex justify-between">
                <span>{z.netZakatableLabel}</span>
                <span>{fmtCurrency(netZakatable, lang)}</span>
              </p>
            </div>

            <div className="rounded-xl bg-white/[0.06] p-3">
              {aboveNisab ? (
                <p className="text-sm font-bold text-brand-emerald">
                  {z.aboveNisabMsg(fmtCurrency(zakatDue, lang))}
                </p>
              ) : (
                <p className="text-sm text-white/40">{z.belowNisabMsg}</p>
              )}
              <p className="text-xs text-white/40 mt-2">{z.rateNote}</p>
            </div>
          </div>

          {/* Hawl tracker */}
          <div className="rounded-2xl border border-brand-border bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-2">{z.hawlTitle}</p>
            <p className="text-xs text-white/40 mb-2">{z.hawlNote}</p>
            <label className="block">
              <span className="text-xs text-white/40">{z.hawlStartLabel}</span>
              <input
                type="date"
                value={hawlStart}
                onChange={(e) => setHawlStart(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white/[0.04] border border-brand-border text-white px-3 py-2 text-sm"
              />
            </label>
            {hawlResult ? (
              <p className="text-sm font-bold text-brand-emerald mt-3">
                {z.hawlDueDateLabel}: {fmtDate(hawlResult.dueDate, lang)}.{' '}
                {z.hawlDaysLeftMsg(hawlResult.daysLeft)}
              </p>
            ) : (
              <p className="text-xs text-white/40 mt-3">{z.hawlNotSetMsg}</p>
            )}
          </div>

          {/* Disclaimer */}
          <div className="rounded-2xl border border-brand-gold/30 bg-brand-gold/5 p-4">
            <p className="text-xs font-bold text-brand-gold">{z.disclaimerTitle}</p>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">{z.disclaimer}</p>
          </div>

          {/* FAQ */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-white/40">{z.faqTitle}</p>
            {z.faq.map((f, i) => (
              <div key={i} className="rounded-xl border border-brand-border bg-white/[0.04] p-4">
                <p className="text-sm font-bold text-white">{f.q}</p>
                <p className="text-xs text-white/40 mt-1.5 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
