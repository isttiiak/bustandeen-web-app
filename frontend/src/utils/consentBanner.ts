import { analyticsConfigured } from './analytics.js';
import { readConsent, writeConsent } from './analyticsConsent.js';

/**
 * The one-time question "may we count page visits?" (audit 2026-11-16 P2-10).
 *
 * Plain DOM, not React, so the same banner serves the prerendered pages (which never load the
 * app) and the app. Shown only when this build reports to Google Analytics at all and the
 * visitor has not answered yet. "Allow" and "No thanks" look the same and are the same size, and
 * nothing is pre-chosen: not answering is a no. It does not cover the page and is not a modal.
 */

export interface ConsentCopy {
  title: string;
  body: string;
  allow: string;
  deny: string;
  privacy: string;
  label: string;
}

export const CONSENT_COPY: Record<'en' | 'bn' | 'ar', ConsentCopy> = {
  en: {
    title: 'May we count visits to our public pages?',
    body: 'We use Google Analytics to count which public pages are read, so we can improve them. It stays off unless you allow it. It never sees private areas or anything you log, and your IP address is anonymised.',
    allow: 'Allow',
    deny: 'No thanks',
    privacy: 'Privacy',
    label: 'Visit counting',
  },
  bn: {
    title: 'আমাদের পাবলিক পাতার ভিজিট গুনতে পারি?',
    body: 'কোন পাবলিক পাতা পড়া হচ্ছে তা গুনতে আমরা গুগল অ্যানালিটিক্স ব্যবহার করি, যাতে পাতাগুলো আরও ভালো করতে পারি। আপনি অনুমতি না দিলে এটি বন্ধ থাকে। ব্যক্তিগত অংশ বা আপনার লগ করা কোনো তথ্য এটি কখনো দেখে না, আর আপনার আইপি ঠিকানা গোপন করা হয়।',
    allow: 'অনুমতি দিন',
    deny: 'না, ধন্যবাদ',
    privacy: 'গোপনীয়তা',
    label: 'ভিজিট গণনা',
  },
  ar: {
    title: 'هل يمكننا عدّ زيارات صفحاتنا العامة؟',
    body: 'نستخدم Google Analytics لعدّ الصفحات العامة التي تُقرأ حتى نحسّنها. يبقى متوقفًا ما لم تسمح به. لا يرى الأجزاء الخاصة ولا أي شيء تسجّله، ويُخفى عنوان IP الخاص بك.',
    allow: 'السماح',
    deny: 'لا، شكرًا',
    privacy: 'الخصوصية',
    label: 'عدّ الزيارات',
  },
};

/** A page that names its own language (a Bangla or Arabic prerendered page) wins; otherwise the
 * app's saved language (the app leaves <html lang> at "en" while it shows Bangla), else English. */
export function consentLang(
  htmlLang: string | null | undefined,
  saved: string | null
): 'en' | 'bn' | 'ar' {
  const pick = (v: string | null | undefined): 'en' | 'bn' | 'ar' | null => {
    const l = (v ?? '').toLowerCase().slice(0, 2);
    return l === 'bn' || l === 'ar' || l === 'en' ? l : null;
  };
  const page = pick(htmlLang);
  if (page === 'bn' || page === 'ar') return page;
  return pick(saved) ?? page ?? 'en';
}

const BANNER_ID = 'consent-banner';

export function mountConsentBanner(): void {
  if (typeof document === 'undefined' || !analyticsConfigured()) return;
  if (readConsent() !== 'unset' || document.getElementById(BANNER_ID)) return;

  let saved: string | null = null;
  try {
    saved = localStorage.getItem('bustandeen_lang');
  } catch {
    /* storage blocked */
  }
  const lang = consentLang(document.documentElement.lang, saved);
  const copy = CONSENT_COPY[lang];

  const root = document.createElement('div');
  root.id = BANNER_ID;
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', copy.label);
  root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  // Dark in both themes, like the app's other always-dark cards; the fallbacks are the same
  // token values for the prerendered pages, which do not load the app's stylesheet.
  root.setAttribute('data-theme', 'bustandeen');
  const tok = (name: string, fallback: string) => `rgb(var(--c-${name}, ${fallback}))`;
  Object.assign(root.style, {
    position: 'fixed',
    insetInline: '12px',
    bottom: 'max(12px, env(safe-area-inset-bottom))',
    zIndex: '60',
    maxWidth: '34rem',
    marginInline: 'auto',
    padding: '16px',
    borderRadius: '20px',
    background: tok('deep', '26 24 18'),
    color: 'rgb(232 226 212)',
    border: `1px solid ${tok('border', '58 52 37')}`,
    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
    fontFamily: 'inherit',
    fontSize: '14px',
    lineHeight: '1.5',
  });

  const title = document.createElement('p');
  title.textContent = copy.title;
  Object.assign(title.style, { margin: '0 0 6px', fontWeight: '700', fontSize: '15px' });

  const body = document.createElement('p');
  body.textContent = copy.body + ' ';
  Object.assign(body.style, { margin: '0 0 12px', opacity: '0.9' });
  const more = document.createElement('a');
  more.href = '/privacy';
  more.textContent = copy.privacy;
  Object.assign(more.style, { color: tok('gold', '201 169 110'), textDecoration: 'underline' });
  body.appendChild(more);

  const row = document.createElement('div');
  Object.assign(row.style, { display: 'flex', gap: '10px' });

  const button = (label: string, value: 'granted' | 'denied') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    // Identical styling for both answers: neither is made to look like the "right" one.
    Object.assign(b.style, {
      flex: '1',
      minHeight: '44px',
      padding: '8px 14px',
      borderRadius: '12px',
      border: `1px solid ${tok('emerald', '122 158 110')}`,
      background: 'transparent',
      color: 'rgb(232 226 212)',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer',
      fontFamily: 'inherit',
    });
    b.addEventListener('click', () => {
      writeConsent(value);
      root.remove();
    });
    return b;
  };
  row.append(button(copy.allow, 'granted'), button(copy.deny, 'denied'));

  const hideInPrint = document.createElement('style');
  hideInPrint.textContent = `@media print{#${BANNER_ID}{display:none!important}}`;
  root.append(title, body, row, hideInPrint);
  document.body.appendChild(root);
}
