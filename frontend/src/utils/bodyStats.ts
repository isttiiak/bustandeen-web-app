// Body-stats helpers shared by the Rayhanah settings drawer and the BMI card.
// Everything is stored in metric (cm / kg); units are only a display choice.

export type HeightUnit = 'm' | 'ft';
export type WeightUnit = 'kg' | 'lbs';

/** Parse a height input to cm. Meters: "1.63" or "163". Feet: "5'4\"", "5.33"
 * (feet) or "64" (raw inches, when above 12). Returns null if unreadable or
 * outside the 50-300 cm the server accepts. */
export function parseHeightToCm(val: string, unit: HeightUnit): number | null {
  const s = val.trim();
  if (!s) return null;
  if (unit === 'm') {
    const n = parseFloat(s);
    if (!n || n <= 0) return null;
    const cm = n < 10 ? n * 100 : n; // "1.63" → 163, "163" → 163
    return cm >= 50 && cm <= 300 ? Math.round(cm) : null;
  }
  const feetInch = s.match(/^(\d+(?:\.\d+)?)'?\s*(\d+(?:\.\d+)?)"?$/);
  if (feetInch) {
    const cm = Math.round(parseFloat(feetInch[1]!) * 30.48 + parseFloat(feetInch[2]!) * 2.54);
    return cm >= 50 && cm <= 300 ? cm : null;
  }
  const n = parseFloat(s);
  if (!n || n <= 0) return null;
  const totalIn = n > 12 ? n : n * 12;
  const cm = Math.round(totalIn * 2.54);
  return cm >= 50 && cm <= 300 ? cm : null;
}

export function parseWeightToKg(val: string, unit: WeightUnit): number | null {
  const n = parseFloat(val.trim());
  if (!n || n <= 0) return null;
  const kg = unit === 'kg' ? n : n / 2.20462;
  return kg >= 20 && kg <= 500 ? Math.round(kg * 10) / 10 : null;
}

export function cmToFtStr(cm: number): string {
  let feet = Math.floor(cm / 2.54 / 12);
  let inches = Math.round((cm / 2.54) % 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return `${feet}'${inches}"`;
}

export function formatHeight(cm: number, unit: HeightUnit): string {
  return unit === 'm' ? String(Math.round(cm) / 100) : cmToFtStr(cm);
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return String(unit === 'kg' ? Math.round(kg * 10) / 10 : Math.round(kg * 2.20462 * 10) / 10);
}

export function computeBmi(cm: number, kg: number): number {
  return Math.round((kg / ((cm / 100) * (cm / 100))) * 10) / 10;
}

export function bmiCategory(bmi: number): { key: string; label: string; color: string } {
  if (bmi < 18.5) return { key: 'bmiUnder', label: 'Underweight', color: 'text-sky-400' };
  if (bmi < 25) return { key: 'bmiNormal', label: 'Normal', color: 'text-brand-emerald' };
  if (bmi < 30) return { key: 'bmiOver', label: 'Overweight', color: 'text-brand-gold' };
  return { key: 'bmiObese', label: 'Well above range', color: 'text-red-400' };
}
