// Country tiers + display names for the programmatic-SEO city dataset
// (scripts/build-cities.mjs). Kept as plain data, not an npm dependency,
// since it only needs to cover the ~95 countries actually referenced below.

// Muslim-majority countries (Pew Research / general consensus, ~50
// countries) — the core audience, so cities here get the lowest
// population bar for inclusion.
export const MUSLIM_MAJORITY = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AZ: 'Azerbaijan',
  BH: 'Bahrain', BD: 'Bangladesh', BA: 'Bosnia and Herzegovina', BN: 'Brunei',
  BF: 'Burkina Faso', TD: 'Chad', KM: 'Comoros', DJ: 'Djibouti', EG: 'Egypt',
  GM: 'Gambia', GN: 'Guinea', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq',
  JO: 'Jordan', KZ: 'Kazakhstan', XK: 'Kosovo', KW: 'Kuwait',
  KG: 'Kyrgyzstan', LB: 'Lebanon', LY: 'Libya', MY: 'Malaysia',
  MV: 'Maldives', ML: 'Mali', MR: 'Mauritania', MA: 'Morocco', NE: 'Niger',
  NG: 'Nigeria', OM: 'Oman', PK: 'Pakistan', PS: 'Palestine', QA: 'Qatar',
  SA: 'Saudi Arabia', SN: 'Senegal', SL: 'Sierra Leone', SO: 'Somalia',
  SD: 'Sudan', SY: 'Syria', TJ: 'Tajikistan', TN: 'Tunisia', TR: 'Turkey',
  TM: 'Turkmenistan', AE: 'United Arab Emirates', UZ: 'Uzbekistan',
  EH: 'Western Sahara', YE: 'Yemen', GW: 'Guinea-Bissau',
};

// Very large absolute Muslim population despite not being majority —
// high genuine search intent, so it gets its own (still generous) tier
// rather than being lumped into "diaspora."
export const HIGH_MUSLIM_POPULATION = {
  IN: 'India',
};

// Large Muslim-minority communities / diaspora hubs — real search intent,
// but a higher population bar so only actually-major cities qualify.
export const DIASPORA = {
  US: 'United States', GB: 'United Kingdom', FR: 'France', DE: 'Germany',
  CA: 'Canada', AU: 'Australia', NL: 'Netherlands', BE: 'Belgium',
  IT: 'Italy', ES: 'Spain', SE: 'Sweden', RU: 'Russia', CN: 'China',
  ZA: 'South Africa', KE: 'Kenya', TZ: 'Tanzania', ET: 'Ethiopia',
  GH: 'Ghana', CI: "Cote d'Ivoire", PH: 'Philippines', TH: 'Thailand',
  SG: 'Singapore', LK: 'Sri Lanka', TT: 'Trinidad and Tobago',
  SR: 'Suriname', GY: 'Guyana', FJ: 'Fiji', MU: 'Mauritius',
  CM: 'Cameroon', UG: 'Uganda', MZ: 'Mozambique', BJ: 'Benin',
  TG: 'Togo', GE: 'Georgia', CY: 'Cyprus', IL: 'Israel', JP: 'Japan',
  KR: 'South Korea', NO: 'Norway', DK: 'Denmark', CH: 'Switzerland',
  AT: 'Austria', BR: 'Brazil', AR: 'Argentina', MX: 'Mexico',
  NZ: 'New Zealand', IE: 'Ireland', PT: 'Portugal', PL: 'Poland',
  MM: 'Myanmar',
};

// Full ISO 3166-1 alpha-2 fallback so a "rest of world" city (any country
// not in the three tiers above) still gets a real display name instead of
// a raw code.
export const ALL_COUNTRY_NAMES = {
  AD: 'Andorra', AO: 'Angola', AI: 'Anguilla', AQ: 'Antarctica',
  AG: 'Antigua and Barbuda', AR: 'Argentina', AM: 'Armenia', AW: 'Aruba',
  AU: 'Australia', AT: 'Austria', AZ: 'Azerbaijan', BS: 'Bahamas',
  BH: 'Bahrain', BD: 'Bangladesh', BB: 'Barbados', BY: 'Belarus',
  BE: 'Belgium', BZ: 'Belize', BJ: 'Benin', BM: 'Bermuda', BT: 'Bhutan',
  BO: 'Bolivia', BA: 'Bosnia and Herzegovina', BW: 'Botswana',
  BR: 'Brazil', BN: 'Brunei', BG: 'Bulgaria', BF: 'Burkina Faso',
  BI: 'Burundi', KH: 'Cambodia', CM: 'Cameroon', CA: 'Canada',
  CV: 'Cabo Verde', KY: 'Cayman Islands', CF: 'Central African Republic',
  TD: 'Chad', CL: 'Chile', CN: 'China', CO: 'Colombia', KM: 'Comoros',
  CG: 'Congo', CD: 'DR Congo', CR: 'Costa Rica', CI: "Cote d'Ivoire",
  HR: 'Croatia', CU: 'Cuba', CY: 'Cyprus', CZ: 'Czechia', DK: 'Denmark',
  DJ: 'Djibouti', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador',
  EG: 'Egypt', SV: 'El Salvador', GQ: 'Equatorial Guinea', ER: 'Eritrea',
  EE: 'Estonia', SZ: 'Eswatini', ET: 'Ethiopia', FJ: 'Fiji',
  FI: 'Finland', FR: 'France', GA: 'Gabon', GM: 'Gambia', GE: 'Georgia',
  DE: 'Germany', GH: 'Ghana', GR: 'Greece', GL: 'Greenland',
  GD: 'Grenada', GT: 'Guatemala', GN: 'Guinea', GW: 'Guinea-Bissau',
  GY: 'Guyana', HT: 'Haiti', HN: 'Honduras', HK: 'Hong Kong',
  HU: 'Hungary', IS: 'Iceland', IN: 'India', ID: 'Indonesia',
  IR: 'Iran', IQ: 'Iraq', IE: 'Ireland', IL: 'Israel', IT: 'Italy',
  JM: 'Jamaica', JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan',
  KE: 'Kenya', KI: 'Kiribati', KW: 'Kuwait', KG: 'Kyrgyzstan',
  LA: 'Laos', LV: 'Latvia', LB: 'Lebanon', LS: 'Lesotho', LR: 'Liberia',
  LY: 'Libya', LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg',
  MO: 'Macau', MG: 'Madagascar', MW: 'Malawi', MY: 'Malaysia',
  MV: 'Maldives', ML: 'Mali', MT: 'Malta', MR: 'Mauritania',
  MU: 'Mauritius', MX: 'Mexico', MD: 'Moldova', MC: 'Monaco',
  MN: 'Mongolia', ME: 'Montenegro', MA: 'Morocco', MZ: 'Mozambique',
  MM: 'Myanmar', NA: 'Namibia', NP: 'Nepal', NL: 'Netherlands',
  NZ: 'New Zealand', NI: 'Nicaragua', NE: 'Niger', NG: 'Nigeria',
  KP: 'North Korea', MK: 'North Macedonia', NO: 'Norway', OM: 'Oman',
  PK: 'Pakistan', PA: 'Panama', PG: 'Papua New Guinea', PY: 'Paraguay',
  PE: 'Peru', PH: 'Philippines', PL: 'Poland', PT: 'Portugal',
  PR: 'Puerto Rico', QA: 'Qatar', RO: 'Romania', RU: 'Russia',
  RW: 'Rwanda', WS: 'Samoa', SM: 'San Marino', SA: 'Saudi Arabia',
  SN: 'Senegal', RS: 'Serbia', SC: 'Seychelles', SL: 'Sierra Leone',
  SG: 'Singapore', SK: 'Slovakia', SI: 'Slovenia', SB: 'Solomon Islands',
  SO: 'Somalia', ZA: 'South Africa', KR: 'South Korea', SS: 'South Sudan',
  ES: 'Spain', LK: 'Sri Lanka', SD: 'Sudan', SR: 'Suriname',
  SE: 'Sweden', CH: 'Switzerland', SY: 'Syria', TW: 'Taiwan',
  TJ: 'Tajikistan', TZ: 'Tanzania', TH: 'Thailand', TL: 'Timor-Leste',
  TG: 'Togo', TO: 'Tonga', TT: 'Trinidad and Tobago', TN: 'Tunisia',
  TR: 'Turkey', TM: 'Turkmenistan', UG: 'Uganda', UA: 'Ukraine',
  AE: 'United Arab Emirates', GB: 'United Kingdom', US: 'United States',
  UY: 'Uruguay', UZ: 'Uzbekistan', VU: 'Vanuatu', VA: 'Vatican City',
  VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen', ZM: 'Zambia',
  ZW: 'Zimbabwe', PS: 'Palestine', XK: 'Kosovo', EH: 'Western Sahara',
  AF: 'Afghanistan', DZ: 'Algeria', AL: 'Albania',
};

export const COUNTRY_NAMES = {
  ...ALL_COUNTRY_NAMES,
  ...MUSLIM_MAJORITY,
  ...HIGH_MUSLIM_POPULATION,
  ...DIASPORA,
};
