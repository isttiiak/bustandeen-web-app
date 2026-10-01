// Profile page building blocks (audit T2.4: moved out of pages/Profile.tsx unchanged): country/city data, preset avatars, date helpers, types, flag and Google logo.
import React from 'react';
import { formatLocaleDate } from '../../utils/localeDate.js';

// ── Country → Cities data ─────────────────────────────────────────────────────
export const COUNTRIES_CITIES: Record<string, string[]> = {
  Afghanistan: ['Kabul', 'Kandahar', 'Herat', 'Mazar-i-Sharif', 'Kunduz'],
  Algeria: ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Batna'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra'],
  Azerbaijan: ['Baku', 'Ganja', 'Sumqayit'],
  Bangladesh: [
    'Dhaka',
    'Chittagong',
    'Sylhet',
    'Rajshahi',
    'Khulna',
    'Barisal',
    'Mymensingh',
    'Comilla',
    'Rangpur',
    'Narayanganj',
  ],
  Belgium: ['Brussels', 'Antwerp', 'Ghent', 'Liège', 'Bruges'],
  'Bosnia and Herzegovina': ['Sarajevo', 'Banja Luka', 'Tuzla', 'Zenica'],
  Brazil: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Manaus'],
  Brunei: ['Bandar Seri Begawan', 'Kuala Belait', 'Seria'],
  Canada: [
    'Toronto',
    'Montreal',
    'Vancouver',
    'Calgary',
    'Edmonton',
    'Ottawa',
    'Winnipeg',
    'Mississauga',
  ],
  China: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', "Xi'an", 'Urumqi', 'Kunming'],
  Egypt: ['Cairo', 'Alexandria', 'Giza', 'Port Said', 'Luxor', 'Aswan', 'Sharm el-Sheikh'],
  France: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Strasbourg', 'Bordeaux', 'Nantes'],
  Germany: [
    'Berlin',
    'Hamburg',
    'Munich',
    'Cologne',
    'Frankfurt',
    'Stuttgart',
    'Düsseldorf',
    'Bremen',
  ],
  Ghana: ['Accra', 'Kumasi', 'Tamale', 'Cape Coast', 'Sekondi-Takoradi'],
  India: [
    'Mumbai',
    'Delhi',
    'Bangalore',
    'Chennai',
    'Kolkata',
    'Hyderabad',
    'Ahmedabad',
    'Pune',
    'Surat',
    'Lucknow',
    'Jaipur',
    'Srinagar',
  ],
  Indonesia: [
    'Jakarta',
    'Surabaya',
    'Bandung',
    'Medan',
    'Semarang',
    'Makassar',
    'Palembang',
    'Yogyakarta',
  ],
  Iran: ['Tehran', 'Mashhad', 'Isfahan', 'Karaj', 'Tabriz', 'Shiraz', 'Ahvaz'],
  Iraq: ['Baghdad', 'Basra', 'Mosul', 'Erbil', 'Najaf', 'Karbala', 'Sulaymaniyah'],
  Jordan: ['Amman', 'Zarqa', 'Irbid', 'Aqaba', 'Madaba'],
  Kazakhstan: ['Almaty', 'Astana', 'Shymkent', 'Karaganda'],
  Kenya: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
  Kuwait: ['Kuwait City', 'Hawalli', 'Salmiya', 'Farwaniya', 'Jahra'],
  Kyrgyzstan: ['Bishkek', 'Osh', 'Jalal-Abad'],
  Lebanon: ['Beirut', 'Tripoli', 'Sidon', 'Tyre', 'Baalbek'],
  Libya: ['Tripoli', 'Benghazi', 'Misrata', 'Bayda'],
  Malaysia: [
    'Kuala Lumpur',
    'George Town',
    'Johor Bahru',
    'Ipoh',
    'Shah Alam',
    'Petaling Jaya',
    'Kota Kinabalu',
  ],
  Maldives: ['Malé', 'Addu City', 'Fuvahmulah'],
  Mali: ['Bamako', 'Sikasso', 'Mopti', 'Timbuktu'],
  Mauritania: ['Nouakchott', 'Nouadhibou', 'Rosso'],
  Morocco: ['Casablanca', 'Rabat', 'Fez', 'Marrakech', 'Agadir', 'Tangier', 'Meknes', 'Oujda'],
  Netherlands: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'],
  Niger: ['Niamey', 'Zinder', 'Maradi', 'Agadez'],
  Nigeria: [
    'Lagos',
    'Kano',
    'Ibadan',
    'Abuja',
    'Port Harcourt',
    'Kaduna',
    'Benin City',
    'Maiduguri',
  ],
  Oman: ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur'],
  Pakistan: [
    'Karachi',
    'Lahore',
    'Faisalabad',
    'Rawalpindi',
    'Islamabad',
    'Gujranwala',
    'Peshawar',
    'Multan',
    'Hyderabad',
    'Quetta',
    'Sialkot',
  ],
  Palestine: ['Gaza', 'Jerusalem', 'Ramallah', 'Hebron', 'Nablus', 'Jenin'],
  Philippines: ['Manila', 'Quezon City', 'Davao', 'Cebu', 'Zamboanga', 'Cotabato'],
  Qatar: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor'],
  Russia: ['Moscow', 'Saint Petersburg', 'Kazan', 'Ufa', 'Novosibirsk', 'Grozny', 'Makhachkala'],
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', "Ta'if", 'Tabuk', 'Abha'],
  Senegal: ['Dakar', 'Touba', 'Thiès', 'Kaolack', 'Saint-Louis'],
  'Sierra Leone': ['Freetown', 'Bo', 'Kenema'],
  Somalia: ['Mogadishu', 'Hargeisa', 'Bosaso', 'Kismayo', 'Berbera'],
  'South Africa': [
    'Johannesburg',
    'Cape Town',
    'Durban',
    'Pretoria',
    'Port Elizabeth',
    'Bloemfontein',
  ],
  Spain: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Málaga', 'Zaragoza'],
  Sudan: ['Khartoum', 'Omdurman', 'Port Sudan', 'Kassala', 'Obeid'],
  Syria: ['Damascus', 'Aleppo', 'Homs', 'Latakia', 'Hama'],
  Tajikistan: ['Dushanbe', 'Khujand', 'Kulob', 'Qurghonteppa'],
  Tanzania: ['Dar es Salaam', 'Zanzibar City', 'Mwanza', 'Arusha', 'Dodoma'],
  Tunisia: ['Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Bizerte'],
  Turkey: [
    'Istanbul',
    'Ankara',
    'Izmir',
    'Bursa',
    'Antalya',
    'Adana',
    'Konya',
    'Gaziantep',
    'Mersin',
    'Diyarbakır',
  ],
  Turkmenistan: ['Ashgabat', 'Turkmenabat', 'Dashoguz'],
  Uganda: ['Kampala', 'Gulu', 'Lira', 'Mbarara', 'Jinja'],
  'United Arab Emirates': [
    'Dubai',
    'Abu Dhabi',
    'Sharjah',
    'Ajman',
    'Al Ain',
    'Ras al-Khaimah',
    'Fujairah',
  ],
  'United Kingdom': [
    'London',
    'Birmingham',
    'Manchester',
    'Leeds',
    'Glasgow',
    'Liverpool',
    'Newcastle',
    'Sheffield',
    'Bradford',
    'Leicester',
  ],
  'United States': [
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Phoenix',
    'Philadelphia',
    'San Antonio',
    'San Diego',
    'Dallas',
    'Detroit',
    'Dearborn',
    'Jersey City',
    'Paterson',
  ],
  Uzbekistan: ['Tashkent', 'Samarkand', 'Namangan', 'Andijan', 'Bukhara', 'Fergana'],
  Yemen: ['Sanaa', 'Aden', 'Taiz', 'Hudaydah', 'Mukalla', 'Ibb'],
};

export const SORTED_COUNTRIES = Object.keys(COUNTRIES_CITIES).sort();

export const COUNTRY_CODES: Record<string, string> = {
  Afghanistan: 'AF',
  Algeria: 'DZ',
  Australia: 'AU',
  Azerbaijan: 'AZ',
  Bangladesh: 'BD',
  Belgium: 'BE',
  'Bosnia and Herzegovina': 'BA',
  Brazil: 'BR',
  Brunei: 'BN',
  Canada: 'CA',
  China: 'CN',
  Egypt: 'EG',
  France: 'FR',
  Germany: 'DE',
  Ghana: 'GH',
  India: 'IN',
  Indonesia: 'ID',
  Iran: 'IR',
  Iraq: 'IQ',
  Jordan: 'JO',
  Kazakhstan: 'KZ',
  Kenya: 'KE',
  Kuwait: 'KW',
  Kyrgyzstan: 'KG',
  Lebanon: 'LB',
  Libya: 'LY',
  Malaysia: 'MY',
  Maldives: 'MV',
  Mali: 'ML',
  Mauritania: 'MR',
  Morocco: 'MA',
  Netherlands: 'NL',
  Niger: 'NE',
  Nigeria: 'NG',
  Oman: 'OM',
  Pakistan: 'PK',
  Palestine: 'PS',
  Philippines: 'PH',
  Qatar: 'QA',
  Russia: 'RU',
  'Saudi Arabia': 'SA',
  Senegal: 'SN',
  'Sierra Leone': 'SL',
  Somalia: 'SO',
  'South Africa': 'ZA',
  Spain: 'ES',
  Sudan: 'SD',
  Syria: 'SY',
  Tajikistan: 'TJ',
  Tanzania: 'TZ',
  Tunisia: 'TN',
  Turkey: 'TR',
  Turkmenistan: 'TM',
  Uganda: 'UG',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
  Uzbekistan: 'UZ',
  Yemen: 'YE',
};

export function CountryFlag({ countryName }: { countryName: string }) {
  const code = COUNTRY_CODES[countryName];
  if (!code) return null;
  return (
    <img
      src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w40/${code.toLowerCase()}.png 2x`}
      width="20"
      alt={countryName}
      title={countryName}
      className="inline-block rounded-sm align-middle"
    />
  );
}

// ── Preset avatars ────────────────────────────────────────────────────────────
export const PRESET_AVATARS = [
  { id: 'sun', emoji: '☀️', label: 'Sun', bg: '#92400e' },
  { id: 'moon', emoji: '🌙', label: 'Moon', bg: '#312e81' },
  { id: 'star', emoji: '⭐', label: 'Star', bg: '#1e3a5f' },
  { id: 'glowstar', emoji: '🌟', label: 'Glow Star', bg: '#3b1f63' },
  { id: 'rose', emoji: '🌹', label: 'Rose', bg: '#7f1d1d' },
  { id: 'tulip', emoji: '🌷', label: 'Tulip', bg: '#831843' },
  { id: 'sunflower', emoji: '🌻', label: 'Sunflower', bg: '#713f12' },
  { id: 'blossom', emoji: '🌸', label: 'Blossom', bg: '#9d174d' },
  { id: 'leaf', emoji: '🌿', label: 'Leaf', bg: '#064e3b' },
  { id: 'tree', emoji: '🌳', label: 'Tree', bg: '#14532d' },
  { id: 'palm', emoji: '🌴', label: 'Palm', bg: '#365314' },
  { id: 'mountain', emoji: '⛰️', label: 'Mountain', bg: '#292524' },
  { id: 'ocean', emoji: '🌊', label: 'Ocean', bg: '#0c4a6e' },
  { id: 'diamond', emoji: '💎', label: 'Diamond', bg: '#164e63' },
  { id: 'crystal', emoji: '🔮', label: 'Crystal', bg: '#2e1065' },
  { id: 'rainbow', emoji: '🌈', label: 'Rainbow', bg: '#3b0764' },
] as const;

export function createAvatarDataUrl(emoji: string, bg: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(100, 100, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '90px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 100, 108);
  return canvas.toDataURL('image/png');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function calcFullAge(birthDate: string): { years: number; months: number } | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 0) return null;
  return { years, months };
}

export function formatFullDate(iso: string): string {
  if (!iso) return '—';
  return formatLocaleDate(new Date(iso), { day: 'numeric', month: 'long', year: 'numeric' });
}

// Animated sparkle dots for the profile card header
export const SPARKLE_POSITIONS = [
  { left: '8%', top: '18%', delay: 0 },
  { left: '22%', top: '72%', delay: 0.4 },
  { left: '40%', top: '12%', delay: 0.8 },
  { left: '58%', top: '80%', delay: 0.3 },
  { left: '72%', top: '20%', delay: 1.1 },
  { left: '85%', top: '55%', delay: 0.6 },
  { left: '92%', top: '25%', delay: 1.5 },
  { left: '15%', top: '45%', delay: 0.9 },
];

export interface ProfileData {
  displayName: string;
  firstName: string;
  lastName: string;
  photoUrl: string;
  gender: string;
  birthDate: string;
  occupation: string;
  bio: string;
  city: string;
  country: string;
}

export interface LinkedProvider {
  provider: string;
  email: string;
  providerUid: string;
}

export interface DBUser {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  gender?: string;
  birthDate?: string;
  occupation?: string;
  bio?: string;
  city?: string;
  country?: string;
  totalCount?: number;
  createdAt?: string;
  primaryEmail?: string;
  linkedProviders?: LinkedProvider[];
}

export interface UserResponse {
  user?: DBUser;
}

// Inline Google logo SVG
export function GoogleLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
