// National days for the Islamic calendar (Library) in the countries most
// Bustandeen users come from, besides Bangladesh (bd.ts). Pure data.
//
// Only fixed-date national commemorations: independence, national, republic,
// founding and similar days, whether or not they are also public holidays.
// Never moon-based days, religious days or general days off (New Year,
// May Day, Christmas): the Islamic days come from the rules, and government
// holiday lists stay manual per year (bd.ts). A day that a country observes on
// a nearby weekday is listed on its own date. Sources checked 2026-10-16.
//
// Upkeep: when a country gets a government holiday list (like BD), take its
// holiday national days out of here so a day is not listed twice.

import type { NationalDay } from './bd.js';

export interface CountryNationalDays {
  sources: { title: string; url: string }[];
  days: readonly NationalDay[];
}

export const NATIONAL_DAYS: Readonly<Record<string, CountryNationalDays>> = {
  PK: {
    sources: [
      {
        title: 'Cabinet Division, Public and Optional Holidays for the Year 2025 (circular)',
        url: 'https://cabinet.gov.pk/SiteImage/Misc/files/Holidays/Public-Holidays-2025.pdf',
      },
      {
        title: 'Cabinet Division, Public and Optional Holidays for the Year 2026 (circular)',
        url: 'https://cabinet.gov.pk/SiteImage/Misc/files/Holidays/2026/Public-Holidays-2026.pdf',
      },
    ],
    days: [
      {
        monthDay: '02-05',
        en: 'Kashmir Solidarity Day',
        bn: 'কাশ্মীর সংহতি দিবস',
        shortEn: 'Kashmir Day',
        shortBn: 'কাশ্মীর দিবস',
      },
      { monthDay: '03-23', en: 'Pakistan Day', bn: 'পাকিস্তান দিবস' },
      { monthDay: '05-28', en: 'Youm-e-Takbeer', bn: 'ইয়াওমে তাকবির' },
      { monthDay: '08-14', en: 'Independence Day', bn: 'স্বাধীনতা দিবস' },
      {
        monthDay: '11-09',
        en: 'Allama Iqbal Day',
        bn: 'আল্লামা ইকবাল দিবস',
        shortEn: 'Iqbal Day',
        shortBn: 'ইকবাল দিবস',
      },
      { monthDay: '12-25', en: 'Quaid-e-Azam Day', bn: 'কায়েদে আজম দিবস' },
    ],
  },
  IN: {
    sources: [
      {
        title: 'Holidays in Central Government offices 2026, per DoPT order (CAG)',
        url: 'https://cag.gov.in/uploads/media/Holiday-List-2026-069521fe6f358d0-89936988.pdf',
      },
      {
        title: 'National Portal of India, holiday calendar',
        url: 'https://www.india.gov.in/calendar',
      },
    ],
    days: [
      { monthDay: '01-26', en: 'Republic Day', bn: 'প্রজাতন্ত্র দিবস' },
      { monthDay: '08-15', en: 'Independence Day', bn: 'স্বাধীনতা দিবস' },
      { monthDay: '10-02', en: 'Gandhi Jayanti', bn: 'গান্ধী জয়ন্তী' },
    ],
  },
  SA: {
    sources: [
      {
        title: 'Saudi National Platform (my.gov.sa), The Founding Day',
        url: 'https://www.my.gov.sa/wps/portal/snp/content/events/eventsDetails/CONT-events-25220248',
      },
      {
        title: 'Saudi Press Agency, Celebrating 95 Years of Unity: Saudi National Day',
        url: 'https://spa.gov.sa/en/N2404431',
      },
    ],
    days: [
      { monthDay: '02-22', en: 'Founding Day', bn: 'প্রতিষ্ঠা দিবস' },
      { monthDay: '09-23', en: 'Saudi National Day', bn: 'সৌদি জাতীয় দিবস' },
    ],
  },
  AE: {
    sources: [
      {
        title: 'UAE Government portal (u.ae), Public holidays',
        url: 'https://u.ae/en/information-and-services/public-holidays-and-religious-affairs/public-holidays',
      },
      {
        title: 'UAE Cabinet, Flying the UAE flag at half-mast on November 30th',
        url: 'https://uaecabinet.ae/en/news/presidential-affairs-ministry-flying-the-uae-flag-at-half-mast-on-november-30th',
      },
    ],
    days: [
      { monthDay: '11-30', en: 'Commemoration Day', bn: 'স্মরণ দিবস' },
      { monthDay: '12-02', en: 'National Day', bn: 'জাতীয় দিবস' },
    ],
  },
  MY: {
    sources: [
      {
        title: 'Cabinet Division, Prime Minister’s Department: public holidays 2026',
        url: 'https://www.kabinet.gov.my/storage/2025/08/HKA-2026.pdf',
      },
    ],
    days: [
      { monthDay: '08-31', en: 'National Day', bn: 'জাতীয় দিবস' },
      { monthDay: '09-16', en: 'Malaysia Day', bn: 'মালয়েশিয়া দিবস' },
    ],
  },
  ID: {
    sources: [
      {
        title: 'Ministry of State Secretariat, joint decree on national holidays 2026',
        url: 'https://setneg.go.id/baca/index/inilah_skb_3_menteri_libur_nasional_dan_cuti_bersama_2026',
      },
    ],
    days: [
      { monthDay: '06-01', en: 'Pancasila Day', bn: 'পাঞ্চাসিলা দিবস' },
      { monthDay: '08-17', en: 'Independence Day', bn: 'স্বাধীনতা দিবস' },
    ],
  },
  GB: {
    // The UK has no national day; Armistice Day is the one fixed date the
    // whole country marks (the two-minute silence at 11am).
    sources: [
      {
        title: 'GOV.UK, UK marks Armistice Day',
        url: 'https://www.gov.uk/government/news/uk-marks-armistice-day',
      },
    ],
    days: [{ monthDay: '11-11', en: 'Armistice Day', bn: 'যুদ্ধবিরতি দিবস' }],
  },
  US: {
    sources: [
      {
        title: 'U.S. Office of Personnel Management, Federal holidays',
        url: 'https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/',
      },
    ],
    days: [
      { monthDay: '06-19', en: 'Juneteenth', bn: 'জুনটিনথ' },
      { monthDay: '07-04', en: 'Independence Day', bn: 'স্বাধীনতা দিবস' },
      { monthDay: '11-11', en: 'Veterans Day', bn: 'প্রবীণ সৈনিক দিবস' },
    ],
  },
  EG: {
    sources: [
      {
        title: 'Presidency of Egypt, National Holidays 2026',
        url: 'https://www.presidency.eg/en/%D9%85%D8%B5%D8%B1/%D8%A7%D9%84%D8%B9%D8%B7%D9%84%D8%A7%D8%AA-%D8%A7%D9%84%D8%B1%D8%B3%D9%85%D9%8A%D8%A9/',
      },
    ],
    days: [
      {
        monthDay: '01-25',
        en: 'January 25 Revolution and Police Day',
        bn: '২৫ জানুয়ারি বিপ্লব ও পুলিশ দিবস',
        shortEn: 'Police Day',
        shortBn: 'পুলিশ দিবস',
      },
      { monthDay: '04-25', en: 'Sinai Liberation Day', bn: 'সিনাই মুক্তি দিবস' },
      {
        monthDay: '06-30',
        en: 'June 30 Revolution',
        bn: '৩০ জুন বিপ্লব দিবস',
        shortEn: 'June 30',
        shortBn: '৩০ জুন দিবস',
      },
      {
        monthDay: '07-23',
        en: 'July 23 Revolution Day',
        bn: '২৩ জুলাই বিপ্লব দিবস',
        shortEn: 'Revolution Day',
        shortBn: 'বিপ্লব দিবস',
      },
      { monthDay: '10-06', en: 'Armed Forces Day', bn: 'সশস্ত্র বাহিনী দিবস' },
    ],
  },
  TR: {
    sources: [
      {
        title: 'Law No. 2429 on National Holiday and General Holidays (mevzuat.gov.tr)',
        url: 'https://www.mevzuat.gov.tr/mevzuatmetin/1.5.2429.pdf',
      },
    ],
    days: [
      {
        monthDay: '04-23',
        en: 'National Sovereignty and Children’s Day',
        bn: 'জাতীয় সার্বভৌমত্ব ও শিশু দিবস',
        shortEn: 'Sovereignty Day',
        shortBn: 'সার্বভৌমত্ব দিবস',
      },
      {
        monthDay: '05-19',
        en: 'Commemoration of Atatürk, Youth and Sports Day',
        bn: 'আতাতুর্ক স্মরণ, যুব ও ক্রীড়া দিবস',
        shortEn: 'Youth and Sports Day',
        shortBn: 'যুব ও ক্রীড়া দিবস',
      },
      {
        monthDay: '07-15',
        en: 'Democracy and National Unity Day',
        bn: 'গণতন্ত্র ও জাতীয় ঐক্য দিবস',
        shortEn: 'Democracy Day',
        shortBn: 'গণতন্ত্র দিবস',
      },
      { monthDay: '08-30', en: 'Victory Day', bn: 'বিজয় দিবস' },
      { monthDay: '10-29', en: 'Republic Day', bn: 'প্রজাতন্ত্র দিবস' },
    ],
  },
};
