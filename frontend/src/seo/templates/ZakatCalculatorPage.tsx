import { useState } from 'react';
import { CHROME, type SeoLang } from '../locales/chrome.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd, faqJsonLd } from '../components/JsonLd.js';
import { toHijri, hijriToGregorian } from '../utils/calc.js';
import {
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
  GOLD_PRICE_USD_PER_GRAM,
  SILVER_PRICE_USD_PER_GRAM,
  PRICES_AS_OF,
  ZAKAT_RATE,
} from '../content/zakat.js';

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
      <span className="text-xs text-[#94a3b8]">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="mt-1 w-full rounded-lg bg-[#141e2e] border border-[#1e2d42] text-[#f1f5f9] px-3 py-2 text-sm"
      />
    </label>
  );
}

interface Props {
  lang: SeoLang;
}

export default function ZakatCalculatorPage({ lang }: Props) {
  const t = CHROME[lang];
  const url = `https://bustandeen.com${langPath(lang, '/zakat-calculator')}`;

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
    <Layout
      lang={lang}
      barePath="/zakat-calculator"
      breadcrumbs={[
        { label: t.home, path: 'https://bustandeen.com/' },
        { label: t.breadcrumbZakat },
      ]}
    >
      <h1 className="text-2xl sm:text-3xl font-black text-[#f1f5f9]">{t.zakat.title}</h1>
      <p className="text-[#94a3b8] mt-2">{t.zakat.subtitle}</p>
      <p className="text-xs text-[#94a3b8] mt-3">{t.zakat.pricesAsOfLabel(PRICES_AS_OF)}</p>

      {/* Nisab standard */}
      <div className="mt-6 rounded-2xl border border-[#1e2d42] bg-[#0d1520] p-4">
        <p className="text-xs uppercase tracking-widest text-[#94a3b8] mb-2">
          {t.zakat.nisabTitle}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStandard('silver')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
              standard === 'silver'
                ? 'bg-[#10b981] text-[#080c12]'
                : 'bg-[#141e2e] border border-[#1e2d42] text-[#94a3b8]'
            }`}
          >
            {t.zakat.nisabSilverLabel}
          </button>
          <button
            type="button"
            onClick={() => setStandard('gold')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
              standard === 'gold'
                ? 'bg-[#10b981] text-[#080c12]'
                : 'bg-[#141e2e] border border-[#1e2d42] text-[#94a3b8]'
            }`}
          >
            {t.zakat.nisabGoldLabel}
          </button>
        </div>
        <p className="text-xs text-[#94a3b8] mt-2">{t.zakat.nisabStandardHint}</p>
        <p className="text-sm font-bold text-[#10b981] mt-2">
          {t.zakat.nisabTitle}: {fmtCurrency(nisabThreshold, lang)}
        </p>
        <p className="text-xs text-[#94a3b8] mt-3 font-semibold">{t.zakat.madhabTitle}</p>
        <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">{t.zakat.madhabNote}</p>
      </div>

      {/* Jewelry disclosure */}
      <div className="mt-4 rounded-2xl border border-[#1e2d42] bg-[#0d1520] p-4">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeJewelry}
            onChange={(e) => setIncludeJewelry(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-sm font-semibold text-[#f1f5f9]">{t.zakat.jewelryLabel}</span>
        </label>
        <p className="text-xs text-[#94a3b8] mt-2 leading-relaxed">{t.zakat.jewelryNote}</p>
        <p className="text-xs text-[#10b981] mt-2">
          {includeJewelry
            ? lang === 'bn'
              ? 'নিচের স্বর্ণ/রৌপ্যের ঘরে গহনার মূল্যও যোগ করুন।'
              : lang === 'ar'
                ? 'أضف قيمة الحلي إلى حقول الذهب/الفضة أدناه.'
                : 'Add your jewelry value into the gold/silver fields below.'
            : lang === 'bn'
              ? 'নিচের স্বর্ণ/রৌপ্যের ঘরে শুধু বিনিয়োগ/সঞ্চয়ের অংশ লিখুন, গহনা বাদ দিন।'
              : lang === 'ar'
                ? 'أدخل في حقول الذهب/الفضة أدناه أموال الاستثمار/الادخار فقط، دون الحلي.'
                : 'Enter only investment/savings gold and silver below, excluding jewelry.'}
        </p>
      </div>

      {/* Assets */}
      <div className="mt-4 rounded-2xl border border-[#1e2d42] bg-[#0d1520] p-4 space-y-3">
        <p className="text-xs uppercase tracking-widest text-[#94a3b8]">{t.zakat.assetsTitle}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <MoneyField label={t.zakat.cashLabel} value={cash} onChange={setCash} />
          <MoneyField label={t.zakat.goldValueLabel} value={goldValue} onChange={setGoldValue} />
          <MoneyField
            label={t.zakat.silverValueLabel}
            value={silverValue}
            onChange={setSilverValue}
          />
          <MoneyField label={t.zakat.businessLabel} value={business} onChange={setBusiness} />
          <MoneyField
            label={t.zakat.receivablesLabel}
            value={receivables}
            onChange={setReceivables}
          />
          <MoneyField
            label={t.zakat.liabilitiesLabel}
            value={liabilities}
            onChange={setLiabilities}
          />
        </div>

        <div className="pt-3 border-t border-[#1e2d42] space-y-1">
          <p className="text-xs text-[#94a3b8] flex justify-between">
            <span>{t.zakat.totalLabel}</span>
            <span>{fmtCurrency(totalAssets, lang)}</span>
          </p>
          <p className="text-sm font-bold text-[#f1f5f9] flex justify-between">
            <span>{t.zakat.netZakatableLabel}</span>
            <span>{fmtCurrency(netZakatable, lang)}</span>
          </p>
        </div>

        <div className="rounded-xl bg-[#141e2e] p-3">
          {aboveNisab ? (
            <p className="text-sm font-bold text-[#10b981]">
              {t.zakat.aboveNisabMsg(fmtCurrency(zakatDue, lang))}
            </p>
          ) : (
            <p className="text-sm text-[#94a3b8]">{t.zakat.belowNisabMsg}</p>
          )}
          <p className="text-xs text-[#94a3b8] mt-2">{t.zakat.rateNote}</p>
        </div>
      </div>

      {/* Hawl tracker */}
      <div className="mt-4 rounded-2xl border border-[#1e2d42] bg-[#0d1520] p-4">
        <p className="text-xs uppercase tracking-widest text-[#94a3b8] mb-2">{t.zakat.hawlTitle}</p>
        <p className="text-xs text-[#94a3b8] mb-2">{t.zakat.hawlNote}</p>
        <label className="block">
          <span className="text-xs text-[#94a3b8]">{t.zakat.hawlStartLabel}</span>
          <input
            type="date"
            value={hawlStart}
            onChange={(e) => setHawlStart(e.target.value)}
            className="mt-1 w-full rounded-lg bg-[#141e2e] border border-[#1e2d42] text-[#f1f5f9] px-3 py-2 text-sm"
          />
        </label>
        {hawlResult ? (
          <p className="text-sm font-bold text-[#10b981] mt-3">
            {t.zakat.hawlDueDateLabel}: {fmtDate(hawlResult.dueDate, lang)}.{' '}
            {t.zakat.hawlDaysLeftMsg(hawlResult.daysLeft)}
          </p>
        ) : (
          <p className="text-xs text-[#94a3b8] mt-3">{t.zakat.hawlNotSetMsg}</p>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-4 rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-4">
        <p className="text-xs font-bold text-[#f59e0b]">{t.zakat.disclaimerTitle}</p>
        <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">{t.zakat.disclaimer}</p>
      </div>

      {/* FAQ */}
      <div className="mt-6 space-y-3">
        <p className="text-xs uppercase tracking-widest text-[#94a3b8]">{t.zakat.faqTitle}</p>
        {t.zakat.faq.map((f, i) => (
          <div key={i} className="rounded-xl border border-[#1e2d42] bg-[#0d1520] p-4">
            <p className="text-sm font-bold text-[#f1f5f9]">{f.q}</p>
            <p className="text-xs text-[#94a3b8] mt-1.5 leading-relaxed">{f.a}</p>
          </div>
        ))}
      </div>

      <a
        href="https://bustandeen.com/"
        className="mt-5 inline-block rounded-xl bg-[#10b981] text-[#080c12] font-bold text-sm px-4 py-2.5 no-underline"
      >
        {t.zakat.liveAppCta}
      </a>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: t.home, url: 'https://bustandeen.com/' },
          { name: t.breadcrumbZakat, url },
        ])}
      />
      <JsonLd data={faqJsonLd(t.zakat.faq)} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: t.zakat.title,
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web',
          url,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />
    </Layout>
  );
}
