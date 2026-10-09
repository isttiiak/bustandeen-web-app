// The 64 districts (zila) of Bangladesh, grouped by the 8 divisions (audit
// T4.4, Bangla long tail). Every district has one prayer-times page: its
// headquarters town. 30 HQ towns were already in the GeoNames city list
// (cities.generated.json), so `citySlug` points at that page and its slug
// stays. The other 34 carry their own HQ coordinates and get new pages.
//
// Sources, checked 2026-10-10:
// - Districts, divisions and Bangla names: the BBS district list, matched
//   name for name against bn.wikipedia.org "বাংলাদেশের জেলাসমূহ".
// - HQ coordinates: the GeoNames dump (download.geonames.org/export/dump/
//   BD.zip, CC BY 4.0), the town row inside that district (geonameId kept
//   so a coordinate can be traced). One minute of prayer time is ~15 km
//   east-west, so the town's centre is precise enough.
//
// Towns and Dhaka neighbourhoods in the city list that are NOT a district HQ
// (Tungi, Paltan, Azimpur, ...) keep their pages and link to their district
// (BD_PART_OF below).

export type BdDivisionId =
  'barishal' | 'chattogram' | 'dhaka' | 'khulna' | 'mymensingh' | 'rajshahi' | 'rangpur' | 'sylhet';

export const BD_DIVISIONS: Record<BdDivisionId, { en: string; bn: string }> = {
  barishal: { en: 'Barishal', bn: 'বরিশাল' },
  chattogram: { en: 'Chattogram', bn: 'চট্টগ্রাম' },
  dhaka: { en: 'Dhaka', bn: 'ঢাকা' },
  khulna: { en: 'Khulna', bn: 'খুলনা' },
  mymensingh: { en: 'Mymensingh', bn: 'ময়মনসিংহ' },
  rajshahi: { en: 'Rajshahi', bn: 'রাজশাহী' },
  rangpur: { en: 'Rangpur', bn: 'রংপুর' },
  sylhet: { en: 'Sylhet', bn: 'সিলেট' },
};

export interface BdDistrict {
  /** English district name as a slug, e.g. `chattogram`. */
  id: string;
  en: string;
  bn: string;
  division: BdDivisionId;
  /** The HQ town's page: /prayer-times/{citySlug}. */
  citySlug: string;
  /** Only for HQ towns that were not in the city list yet. */
  hq?: { lat: number; lng: number; geonameId: number; population: number };
}

type Row = [id: string, en: string, bn: string, citySlug: string | null, hq?: BdDistrict['hq']];

// citySlug null = new page at `{id}-bangladesh`.
const hq = (lat: number, lng: number, geonameId: number, population = 0) => ({
  lat,
  lng,
  geonameId,
  population,
});

const ROWS: Record<BdDivisionId, Row[]> = {
  barishal: [
    ['barguna', 'Barguna', 'বরগুনা', null, hq(22.15672, 90.11758, 8304391)],
    ['barishal', 'Barishal', 'বরিশাল', 'barisal-bangladesh'],
    ['bhola', 'Bhola', 'ভোলা', 'bhola-bangladesh'],
    ['jhalokati', 'Jhalokati', 'ঝালকাঠি', null, hq(22.64265, 90.20109, 8432944)],
    ['patuakhali', 'Patuakhali', 'পটুয়াখালী', null, hq(22.36833, 90.3458, 7646711, 65000)],
    ['pirojpur', 'Pirojpur', 'পিরোজপুর', null, hq(22.57965, 89.97521, 1185138, 54418)],
  ],
  chattogram: [
    ['bandarban', 'Bandarban', 'বান্দরবান', null, hq(22.19534, 92.21946, 1185270, 54450)],
    [
      'brahmanbaria',
      'Brahmanbaria',
      'ব্রাহ্মণবাড়িয়া',
      null,
      hq(23.97464, 91.11228, 1336142, 264326),
    ],
    ['chandpur', 'Chandpur', 'চাঁদপুর', null, hq(23.22714, 90.65433, 1207337, 203000)],
    ['chattogram', 'Chattogram', 'চট্টগ্রাম', 'chittagong-bangladesh'],
    ['coxs-bazar', "Cox's Bazar", 'কক্সবাজার', 'cox-s-bazar-bangladesh'],
    ['cumilla', 'Cumilla', 'কুমিল্লা', 'comilla-bangladesh'],
    ['feni', 'Feni', 'ফেনী', null, hq(23.0144, 91.3966, 1185224, 84028)],
    ['khagrachhari', 'Khagrachhari', 'খাগড়াছড়ি', null, hq(23.10787, 91.97007, 1185252, 50364)],
    ['lakshmipur', 'Lakshmipur', 'লক্ষ্মীপুর', null, hq(22.9443, 90.83005, 1196292, 61703)],
    // HQ town: Maijdi.
    ['noakhali', 'Noakhali', 'নোয়াখালী', null, hq(22.86667, 91.1, 1195434, 132185)],
    ['rangamati', 'Rangamati', 'রাঙ্গামাটি', null, hq(22.64317, 92.19186, 1336139, 106069)],
  ],
  dhaka: [
    ['dhaka', 'Dhaka', 'ঢাকা', 'dhaka-bangladesh'],
    ['faridpur', 'Faridpur', 'ফরিদপুর', 'faridpur-bangladesh'],
    ['gazipur', 'Gazipur', 'গাজীপুর', null, hq(23.99844, 90.42234, 1200109, 2674697)],
    ['gopalganj', 'Gopalganj', 'গোপালগঞ্জ', null, hq(23.01018, 89.83278, 7480616)],
    ['kishoreganj', 'Kishoreganj', 'কিশোরগঞ্জ', 'kishorganj-bangladesh'],
    ['madaripur', 'Madaripur', 'মাদারীপুর', null, hq(23.17097, 90.20935, 1337245, 84789)],
    ['manikganj', 'Manikganj', 'মানিকগঞ্জ', null, hq(23.85768, 90.00957, 1348441, 71698)],
    ['munshiganj', 'Munshiganj', 'মুন্সীগঞ্জ', null, hq(23.5517, 90.53459, 1336141)],
    ['narayanganj', 'Narayanganj', 'নারায়ণগঞ্জ', 'narayanganj-bangladesh'],
    ['narsingdi', 'Narsingdi', 'নরসিংদী', 'narsingdi-bangladesh'],
    ['rajbari', 'Rajbari', 'রাজবাড়ী', null, hq(23.75726, 89.64632, 7479432)],
    // HQ town: Palang (Shariatpur Sadar).
    ['shariatpur', 'Shariatpur', 'শরীয়তপুর', null, hq(23.21824, 90.35076, 1191368, 67652)],
    ['tangail', 'Tangail', 'টাঙ্গাইল', 'tangail-bangladesh'],
  ],
  khulna: [
    ['bagerhat', 'Bagerhat', 'বাগেরহাট', 'bagerhat-bangladesh'],
    ['chuadanga', 'Chuadanga', 'চুয়াডাঙ্গা', null, hq(23.64299, 88.85291, 7646420)],
    ['jashore', 'Jashore', 'যশোর', 'jessore-bangladesh'],
    ['jhenaidah', 'Jhenaidah', 'ঝিনাইদহ', null, hq(23.54254, 89.17486, 1185202)],
    ['khulna', 'Khulna', 'খুলনা', 'khulna-bangladesh'],
    ['kushtia', 'Kushtia', 'কুষ্টিয়া', 'kushtia-bangladesh'],
    ['magura', 'Magura', 'মাগুরা', null, hq(23.48702, 89.41592, 7649230)],
    ['meherpur', 'Meherpur', 'মেহেরপুর', null, hq(23.77687, 88.63033, 8304418)],
    ['narail', 'Narail', 'নড়াইল', null, hq(23.15509, 89.49515, 1185293, 55112)],
    ['satkhira', 'Satkhira', 'সাতক্ষীরা', 'satkhira-bangladesh'],
  ],
  mymensingh: [
    ['jamalpur', 'Jamalpur', 'জামালপুর', 'jamalpur-bangladesh'],
    ['mymensingh', 'Mymensingh', 'ময়মনসিংহ', 'mymensingh-bangladesh'],
    ['netrokona', 'Netrokona', 'নেত্রকোণা', null, hq(24.88352, 90.72898, 1185116, 79016)],
    ['sherpur', 'Sherpur', 'শেরপুর', 'sherpur-bangladesh'],
  ],
  rajshahi: [
    ['bogura', 'Bogura', 'বগুড়া', 'bogra-bangladesh'],
    ['chapainawabganj', 'Chapainawabganj', 'চাঁপাইনবাবগঞ্জ', 'nawabganj-bangladesh'],
    ['joypurhat', 'Joypurhat', 'জয়পুরহাট', null, hq(25.10147, 89.02734, 1185206, 73068)],
    ['naogaon', 'Naogaon', 'নওগাঁ', 'par-naogaon-bangladesh'],
    ['natore', 'Natore', 'নাটোর', 'natore-bangladesh'],
    ['pabna', 'Pabna', 'পাবনা', 'pabna-bangladesh'],
    ['rajshahi', 'Rajshahi', 'রাজশাহী', 'rajshahi-bangladesh'],
    ['sirajganj', 'Sirajganj', 'সিরাজগঞ্জ', 'sirajganj-bangladesh'],
  ],
  rangpur: [
    ['dinajpur', 'Dinajpur', 'দিনাজপুর', 'dinajpur-bangladesh'],
    ['gaibandha', 'Gaibandha', 'গাইবান্ধা', null, hq(25.3297, 89.5435, 7921384)],
    ['kurigram', 'Kurigram', 'কুড়িগ্রাম', null, hq(25.81158, 89.64284, 7646708)],
    ['lalmonirhat', 'Lalmonirhat', 'লালমনিরহাট', null, hq(25.91719, 89.44595, 1185181, 65127)],
    ['nilphamari', 'Nilphamari', 'নীলফামারী', null, hq(25.94167, 88.84667, 7646714)],
    ['panchagarh', 'Panchagarh', 'পঞ্চগড়', null, hq(26.33338, 88.55777, 1185141, 48531)],
    ['rangpur', 'Rangpur', 'রংপুর', 'rangpur-bangladesh'],
    ['thakurgaon', 'Thakurgaon', 'ঠাকুরগাঁও', null, hq(26.03097, 88.46989, 1185092, 71096)],
  ],
  sylhet: [
    ['habiganj', 'Habiganj', 'হবিগঞ্জ', 'habiganj-bangladesh'],
    ['moulvibazar', 'Moulvibazar', 'মৌলভীবাজার', null, hq(24.48888, 91.77075, 1185166, 57441)],
    ['sunamganj', 'Sunamganj', 'সুনামগঞ্জ', null, hq(25.06889, 91.40243, 1185105, 74570)],
    ['sylhet', 'Sylhet', 'সিলেট', 'sylhet-bangladesh'],
  ],
};

export const BD_DISTRICTS: BdDistrict[] = (Object.keys(ROWS) as BdDivisionId[]).flatMap(
  (division) =>
    ROWS[division].map(([id, en, bn, citySlug, hqData]) => ({
      id,
      en,
      bn,
      division,
      citySlug: citySlug ?? `${id}-bangladesh`,
      ...(hqData ? { hq: hqData } : {}),
    }))
);

/** Town and neighbourhood pages that are not a district HQ: city slug ->
 * district id. Each one links to its district's page. */
export const BD_PART_OF: Record<string, string> = {
  'azimpur-bangladesh': 'dhaka',
  'paltan-bangladesh': 'dhaka',
  'tungi-bangladesh': 'gazipur',
  'sonargaon-bangladesh': 'narayanganj',
  'bhairab-bazar-bangladesh': 'kishoreganj',
  'nagarpur-bangladesh': 'tangail',
  'bibir-hat-bangladesh': 'chattogram',
  'puthia-bangladesh': 'rajshahi',
  'shahzadpur-bangladesh': 'sirajganj',
  'shibganj-bangladesh': 'bogura',
  'saidpur-bangladesh': 'nilphamari',
};

const BY_ID = new Map(BD_DISTRICTS.map((d) => [d.id, d]));
const BY_CITY = new Map(BD_DISTRICTS.map((d) => [d.citySlug, d]));

export function bdDistrictById(id: string): BdDistrict | undefined {
  return BY_ID.get(id);
}

/** The district a BD city page belongs to, and whether it is the HQ page. */
export function bdDistrictForCity(
  citySlug: string
): { district: BdDistrict; isHq: boolean } | undefined {
  const own = BY_CITY.get(citySlug);
  if (own) return { district: own, isHq: true };
  const id = BD_PART_OF[citySlug];
  const district = id ? BY_ID.get(id) : undefined;
  return district ? { district, isHq: false } : undefined;
}
