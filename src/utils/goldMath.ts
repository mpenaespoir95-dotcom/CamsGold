import {
  GoldStockMovement,
  GoldCategory,
  PurchaseFormulaConfig,
  DEFAULT_PURCHASE_FORMULA_CONFIG,
} from '../types';

export const TROY_OUNCE_IN_GRAMS = 31.1034768;

export function roundOunces(ounces: number): number {
  return Math.round((ounces + Number.EPSILON) * 1000) / 1000;
}

export function calculateFineGoldStockOunces(movements: GoldStockMovement[]): number {
  const fineWeightGrams = movements.reduce((total, movement) => {
    const karat = goldKaratValue(movement.karat);
    if (karat === null || !Number.isFinite(movement.weightGrams)) return total;
    return total + (movement.weightGrams * karat) / 24;
  }, 0);

  return Math.max(0, fineWeightGrams) / TROY_OUNCE_IN_GRAMS;
}

export function goldKaratValue(karat: string): number | null {
  const normalized = karat.trim().toUpperCase();
  const raw = normalized.endsWith('K') ? normalized.slice(0, -1) : normalized;
  const val = parseFloat(raw.replace(',', '.'));
  return !isNaN(val) && val >= 1 && val <= 24 ? val : null;
}

export function isValidGoldKarat(karat: string): boolean {
  return goldKaratValue(karat) !== null;
}

export interface FormulaCalculationResult {
  tUsd: number;
  orBrut1: number;
  pricePerGram: number; // Prix en XAF au taux officiel
  pricePerGramUsd: number; // Prix en USD au gramme
  parallelPricePerGram: number; // Prix en XAF au taux parallèle
  fonduPricePerGram?: number;
  formulaDescription: string;
  category: GoldCategory;
  karat: number;
  premiumPercent: number;
  officialRate: number;
  parallelRate: number;
}

/**
 * Formule demandée par l'utilisateur :
 * premium = (conversion_dollar_en_fcfa_dans_le_marché_noir - dollar_international) / dollar_international * 100
 * taux_parallèle = Taux_officiel * (1 + premium / 100)
 */
export function calculateParallelRate({
  officialRate,
  blackMarketRate,
}: {
  officialRate: number;
  blackMarketRate: number;
}): { premiumPercent: number; parallelRate: number } {
  const official = officialRate > 0 ? officialRate : 0;
  if (official === 0) return { premiumPercent: 0, parallelRate: 0 };
  const blackMarket = blackMarketRate > 0 ? blackMarketRate : official;
  const premiumPercent = ((blackMarket - official) / official) * 100;
  const parallelRate = official * (1 + premiumPercent / 100);
  return { premiumPercent, parallelRate };
}

/**
 * Calcule le prix d'achat au gramme selon les formules officielles du comptoir :
 * 1. T = prix OZ - 30 (décote once)
 * 2. L'or brut_1 = (T * taux USD/XAF) / 31.103477
 * 3. L'or brut = ((L'or brut_1 - 4500) / 24) * Carat
 * 4. L'or fondu = ((L'or brut_1 - 3500) / 24) * Carat
 * 5. Bijoux = fondu - 7000 (ou selon le mode configuré)
 * Intègre simultanément le Taux Officiel et le Taux Parallèle (marché noir + premium)
 */
export function computeComptoirGoldPurchasePrice({
  pricePerTroyOunceUsd,
  usdToXafRate,
  karat,
  category,
  config = DEFAULT_PURCHASE_FORMULA_CONFIG,
}: {
  pricePerTroyOunceUsd: number;
  usdToXafRate?: number;
  karat: number;
  category: GoldCategory;
  config?: PurchaseFormulaConfig;
}): FormulaCalculationResult {
  const ounceDiscount = config.ounceDiscountUsd ?? 30;
  const tUsd = Math.max(0, (pricePerTroyOunceUsd || 0) - ounceDiscount);
  const divisor = config.troyOunceDivisor && config.troyOunceDivisor > 0 ? config.troyOunceDivisor : 31.103477;
  
  const officialRate = usdToXafRate && usdToXafRate > 0 ? usdToXafRate : config.officialUsdRate || 0;
  const blackMarketRate = config.blackMarketUsdRate || 0;
  
  const { premiumPercent, parallelRate } = calculateParallelRate({
    officialRate,
    blackMarketRate,
  });

  // Base 24K pure en XAF
  const orBrut1 = (tUsd * officialRate) / divisor;
  const orBrut1Parallel = (tUsd * parallelRate) / divisor;

  const clampedKarat = Math.max(1, Math.min(24, Number.isFinite(karat) && karat > 0 ? karat : 24));
  let pricePerGram = 0;
  let parallelPricePerGram = 0;
  let fonduPricePerGram: number | undefined;
  let formulaDescription = '';

  const brutDeduction = config.brutDeductionXaf ?? 4500;
  const fonduDeduction = config.fonduDeductionXaf ?? 3500;
  const bijouxDeduction = config.bijouxDeductionXaf ?? 7000;

  const calculatedFonduOfficial = Math.max(0, ((orBrut1 - fonduDeduction) / 24) * clampedKarat);
  const calculatedFonduParallel = Math.max(0, ((orBrut1Parallel - fonduDeduction) / 24) * clampedKarat);

  const brutDiscountPercent = config.brutDiscountPercent !== undefined ? config.brutDiscountPercent : 6;
  const brutDiscountMultiplier = 1 - (brutDiscountPercent / 100);

  if (category === 'Or brut') {
    const baseOfficial = ((orBrut1 - brutDeduction) / 24) * clampedKarat;
    const baseParallel = ((orBrut1Parallel - brutDeduction) / 24) * clampedKarat;
    pricePerGram = Math.max(0, baseOfficial * brutDiscountMultiplier);
    parallelPricePerGram = Math.max(0, baseParallel * brutDiscountMultiplier);
    formulaDescription = `Or brut = ((((${formatPriceCard(orBrut1, 0)} - ${brutDeduction}) / 24) × ${clampedKarat}) - ${brutDiscountPercent}%) = ${formatPriceCard(pricePerGram, 2)} XAF/g`;
  } else if (category === 'Or fondu') {
    pricePerGram = calculatedFonduOfficial;
    parallelPricePerGram = calculatedFonduParallel;
    fonduPricePerGram = calculatedFonduOfficial;
    formulaDescription = `Or fondu = ((${formatPriceCard(orBrut1, 0)} - ${fonduDeduction}) / 24) × ${clampedKarat} = ${formatPriceCard(pricePerGram, 2)} XAF/g`;
  } else if (category === 'Bijoux') {
    fonduPricePerGram = calculatedFonduOfficial;
    if (config.bijouxFormulaMode === 'deductFromBrut1') {
      pricePerGram = Math.max(0, ((orBrut1 - bijouxDeduction) / 24) * clampedKarat);
      parallelPricePerGram = Math.max(0, ((orBrut1Parallel - bijouxDeduction) / 24) * clampedKarat);
      formulaDescription = `Bijoux = ((${formatPriceCard(orBrut1, 0)} - ${bijouxDeduction}) / 24) × ${clampedKarat} = ${formatPriceCard(pricePerGram, 2)} XAF/g`;
    } else {
      // Formule exacte du document manuscrit : Bijoux = fondu - 7000
      pricePerGram = Math.max(0, calculatedFonduOfficial - bijouxDeduction);
      parallelPricePerGram = Math.max(0, calculatedFonduParallel - bijouxDeduction);
      formulaDescription = `Bijoux = Fondu (${formatPriceCard(calculatedFonduOfficial, 0)} F) - ${bijouxDeduction} = ${formatPriceCard(pricePerGram, 2)} XAF/g`;
    }
  } else {
    // Non catégorisé : prorata pur
    pricePerGram = Math.max(0, (orBrut1 / 24) * clampedKarat);
    parallelPricePerGram = Math.max(0, (orBrut1Parallel / 24) * clampedKarat);
    formulaDescription = `Non catégorisé = (${formatPriceCard(orBrut1, 0)} / 24) × ${clampedKarat} = ${formatPriceCard(pricePerGram, 2)} XAF/g`;
  }

  // Prix équivalent en USD par gramme
  const pricePerGramUsd = officialRate > 0 ? pricePerGram / officialRate : 0;

  return {
    tUsd,
    orBrut1,
    pricePerGram,
    pricePerGramUsd,
    parallelPricePerGram,
    fonduPricePerGram,
    formulaDescription,
    category,
    karat: clampedKarat,
    premiumPercent,
    officialRate,
    parallelRate,
  };
}

export function calculateCrudeGoldPricePerKaratGramXaf({
  pricePerTroyOunceUsd,
  usdToXafRate,
  karat,
  deductionXafPer24KGram = 4500,
  discountPercent = 6,
}: {
  pricePerTroyOunceUsd: number;
  usdToXafRate: number;
  karat: number;
  deductionXafPer24KGram?: number;
  discountPercent?: number;
}): number {
  if (!Number.isFinite(pricePerTroyOunceUsd) || pricePerTroyOunceUsd <= 30) {
    throw new Error('Le cours de l’once doit dépasser 30 USD.');
  }
  if (!Number.isFinite(usdToXafRate) || usdToXafRate <= 0) {
    throw new Error('Le taux USD/XAF doit être positif.');
  }
  if (karat < 1 || karat > 24) {
    throw new Error('Le carat doit être compris entre 1 et 24.');
  }
  if (!Number.isFinite(deductionXafPer24KGram) || deductionXafPer24KGram < 0) {
    throw new Error('La déduction par gramme 24K ne peut pas être négative.');
  }

  const pricePerFineGram = ((pricePerTroyOunceUsd - 30) * usdToXafRate) / 31.103477;
  const basePrice = ((pricePerFineGram - deductionXafPer24KGram) / 24) * karat;
  const finalPrice = basePrice * (1 - (discountPercent / 100));
  return Math.max(0, Math.round(finalPrice));
}

export function formatMoney(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  const rounded = Math.round(amount);
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(rounded).replace(/\u202F/g, ' ');
}

export function formatNumber(amount: number | undefined | null, decimals = 2): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(amount).replace(/\u202F/g, ' ');
}

export function formatPriceCard(amount: number | undefined | null, decimals = 2): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0,00';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(amount).replace(/\u202F/g, ' ');
}

export function parseNumberInput(input: string): number {
  if (!input) return 0;
  const cleaned = input.trim().replace(/\s+/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatDate(dateStr: string | Date | undefined): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(dateStr: string | Date | undefined): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Conversions Onces Troy (oz) <-> Grammes (g)
 * Standard international : 1 oz troy = 31.1034768 g
 */
export function gramsToTroyOunces(grams: number): number {
  if (!grams || isNaN(grams) || grams <= 0) return 0;
  return grams / TROY_OUNCE_IN_GRAMS;
}

export function troyOuncesToGrams(ounces: number): number {
  if (!ounces || isNaN(ounces) || ounces <= 0) return 0;
  return ounces * TROY_OUNCE_IN_GRAMS;
}

export function formatOunces(oz: number | undefined | null, decimals = 3): string {
  if (oz === undefined || oz === null || isNaN(oz)) return '0,000';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  }).format(oz).replace(/\u202F/g, ' ');
}

/**
 * Analyse & parsing des dates d'opérations (support ISO, français, "Aujourd'hui")
 */
export function parseLedgerDate(dateStr?: string, createdAt?: string): Date {
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  if (!dateStr) return new Date();
  const lower = dateStr.toLowerCase().trim();
  if (lower.includes('aujourd')) return new Date();
  if (lower.includes('hier')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }

  // ISO string
  const isoTry = new Date(dateStr);
  if (!isNaN(isoTry.getTime()) && dateStr.includes('-')) return isoTry;

  // Slash DD/MM/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    return new Date(parseInt(slashMatch[3], 10), parseInt(slashMatch[2], 10) - 1, parseInt(slashMatch[1], 10));
  }

  const monthsMap: Record<string, number> = {
    janv: 0, jan: 0, janvier: 0,
    févr: 1, fevr: 1, fév: 1, fev: 1, février: 1, fevrier: 1,
    mars: 2, mar: 2,
    avr: 3, avril: 3,
    mai: 4,
    juin: 5,
    juil: 6, juill: 6, juillet: 6,
    août: 7, aout: 7,
    sept: 8, sep: 8, septembre: 8,
    oct: 9, octobre: 9,
    nov: 10, novembre: 10,
    déc: 11, dec: 11, décembre: 11, decembre: 11,
  };

  const clean = dateStr.replace(/[.,]/g, '').toLowerCase();
  const parts = clean.split(/\s+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const monthKey = parts[1];
    const year = parseInt(parts[2], 10);
    const matchedKey = Object.keys(monthsMap).find((k) => monthKey.startsWith(k));
    const monthIndex = matchedKey !== undefined ? monthsMap[matchedKey] : undefined;
    if (!isNaN(day) && !isNaN(year) && monthIndex !== undefined) {
      return new Date(year, monthIndex, day);
    }
  }

  return new Date();
}

/**
 * Périodes de trésorerie (Mois, Trimestre, Semestre, Année)
 */
export type TreasuryPeriodMode = 'month' | 'quarter' | 'semester' | 'year';

export interface TreasuryPeriodFilter {
  mode: TreasuryPeriodMode;
  year: number;
  monthIndex?: number; // 0-11
  quarterIndex?: 1 | 2 | 3 | 4; // T1 (0-2), T2 (3-5), T3 (6-8), T4 (9-11)
  semesterIndex?: 1 | 2; // S1 (0-5), S2 (6-11)
}

export function isDateInPeriod(date: Date, filter: TreasuryPeriodFilter): boolean {
  if (date.getFullYear() !== filter.year) return false;
  const m = date.getMonth();

  switch (filter.mode) {
    case 'month':
      return filter.monthIndex !== undefined ? m === filter.monthIndex : true;
    case 'quarter':
      if (filter.quarterIndex === 1) return m >= 0 && m <= 2;
      if (filter.quarterIndex === 2) return m >= 3 && m <= 5;
      if (filter.quarterIndex === 3) return m >= 6 && m <= 8;
      if (filter.quarterIndex === 4) return m >= 9 && m <= 11;
      return true;
    case 'semester':
      if (filter.semesterIndex === 1) return m >= 0 && m <= 5;
      if (filter.semesterIndex === 2) return m >= 6 && m <= 11;
      return true;
    case 'year':
    default:
      return true;
  }
}

export const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const QUARTER_NAMES_FR = [
  { id: 1 as const, label: 'T1 (Janvier - Mars)', short: 'T1' },
  { id: 2 as const, label: 'T2 (Avril - Juin)', short: 'T2' },
  { id: 3 as const, label: 'T3 (Juillet - Septembre)', short: 'T3' },
  { id: 4 as const, label: 'T4 (Octobre - Décembre)', short: 'T4' },
];

export const SEMESTER_NAMES_FR = [
  { id: 1 as const, label: 'S1 (1er Semestre : Janvier - Juin)', short: 'S1' },
  { id: 2 as const, label: 'S2 (2ème Semestre : Juillet - Décembre)', short: 'S2' },
];
