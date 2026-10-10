// Strings for the "Download PDF" button and the A4 print sheet (audit T4.4).
import type { SeoLang } from './chrome.js';

export interface PrintStrings {
  download: string;
  hint: string;
  viewOnline: string;
  /** Daily district page: link to this month's timetable as a PDF. */
  monthlyPdf: (district: string) => string;
}

export const PRINT: Record<SeoLang, PrintStrings> = {
  en: {
    download: 'Download PDF',
    hint: 'Opens the print window: choose "Save as PDF". A4, one page.',
    viewOnline: 'View online',
    monthlyPdf: (d) => `Download the ${d} monthly timetable (PDF)`,
  },
  bn: {
    download: 'PDF ডাউনলোড',
    hint: 'প্রিন্ট উইন্ডো খুলবে: "PDF হিসেবে সেভ" বেছে নিন। A4, এক পাতা।',
    viewOnline: 'অনলাইনে দেখুন',
    monthlyPdf: (d) => `${d} জেলার মাসিক সময়সূচি ডাউনলোড (PDF)`,
  },
  ar: {
    download: 'تنزيل PDF',
    hint: 'تُفتح نافذة الطباعة: اختر "حفظ بتنسيق PDF". صفحة A4 واحدة.',
    viewOnline: 'اعرضها على الإنترنت',
    monthlyPdf: (d) => `تنزيل الجدول الشهري لـ ${d} (PDF)`,
  },
};
