// Zakat calculator constants. Nisab weights are the two commonly-cited
// figures across Islamic finance references (gold: 20 mithqal; silver: 200
// dirhams) - different reputable sources round these slightly differently,
// which is exactly why the page surfaces both standards and lets the reader
// choose rather than asserting one "correct" number. Metal prices are a
// static snapshot, NOT a live feed (no metals-price API is wired into this
// app) - update GOLD_PRICE_USD_PER_GRAM / SILVER_PRICE_USD_PER_GRAM and
// PRICES_AS_OF periodically (spot prices checked via public sources).
export const GOLD_NISAB_GRAMS = 87.48;
export const SILVER_NISAB_GRAMS = 612.36;
export const ZAKAT_RATE = 0.025;

// Last checked 2026-09-18 (Kitco / JM Bullion spot price).
export const GOLD_PRICE_USD_PER_GRAM = 140.82;
export const SILVER_PRICE_USD_PER_GRAM = 2.13;
export const PRICES_AS_OF = '2026-09-18';
