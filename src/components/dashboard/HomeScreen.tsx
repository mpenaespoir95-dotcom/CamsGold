import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  RefreshCw,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  PlusCircle,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Send,
  Sliders,
  Save,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { AppPanel, SectionHeading } from '../common/UIComponents';
import {
  formatMoney,
  formatNumber,
  formatDate,
  computeComptoirGoldPurchasePrice,
  calculateParallelRate,
} from '../../utils/goldMath';
import { GoldPriceService } from '../../services/goldPriceService';
import { ExchangeRateService } from '../../services/exchangeRateService';
import { GoldCategory, GoldPriceQuote, ExchangeRateSnapshot } from '../../types';
import { GoldRateCardsDisplay } from '../purchases/GoldRateCardsDisplay';
import { PurchaseFormulaModal } from '../purchases/PurchaseFormulaModal';

export const HomeScreen: React.FC<{ onNavigate: (dest: number) => void }> = ({ onNavigate }) => {
  const store = useAppStore();
  const config = store.purchaseFormulaConfig;
  const [goldQuote, setGoldQuote] = useState<GoldPriceQuote | null>(null);
  const [silverQuote, setSilverQuote] = useState<GoldPriceQuote | null>(null);
  const [ratesSource, setRatesSource] = useState<string>('Aucune source disponible');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateSnapshot | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Interactive rates bar states
  const [selectedCategory, setSelectedCategory] = useState<GoldCategory>('Or brut');
  const [selectedKarat, setSelectedKarat] = useState<string>('22');
  const [useParallelRate, setUseParallelRate] = useState<boolean>(
    Boolean(config.useParallelRateInPurchases)
  );
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);

  const cashBalance = store.bankBalances['Caisse (espèces)'] ?? 0;
  
  // Total gold weight across all standard karats
  const totalGoldGrams = ['24K', '22K', '21K', '18K', '14K', '9K'].reduce(
    (acc, k) => acc + store.stockWeightForKarat(k),
    0
  );

  // Total currency estimation
  const totalCurrenciesCount = Object.keys(store.currencyBalances).length;

  const loadMarket = async () => {
    setIsRefreshing(true);
    try {
      const [metals, rates] = await Promise.all([
        GoldPriceService.fetchLiveMetals(),
        ExchangeRateService.fetchRates(),
      ]);
      if (metals.gold) {
        setGoldQuote(metals.gold);
      }
      if (metals.silver) {
        setSilverQuote(metals.silver);
      }
      if (metals.source) {
        setRatesSource(metals.source);
      }
      setExchangeRates(rates);
      setLastRefreshed(rates.updatedAt || metals.updatedAt || '');
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMarket();
  }, []);

  useEffect(() => {
    const liveUsdToXaf = exchangeRates?.usdRates['XAF'];
    if (liveUsdToXaf && liveUsdToXaf > 0) {
      setFormOfficialRate((current) =>
        current.trim() ? current : String(config.officialUsdRate || liveUsdToXaf)
      );
    }
  }, [exchangeRates, config.officialUsdRate]);

  const [isRatesFormOpen, setIsRatesFormOpen] = useState(true);
  const [formKitcoPrice, setFormKitcoPrice] = useState<string>(() =>
    String(config.kitcoGoldSpotUsd || '')
  );
  const [formOfficialRate, setFormOfficialRate] = useState<string>(() =>
    String(config.officialUsdRate || '')
  );
  const [formBlackMarketRate, setFormBlackMarketRate] = useState<string>(() =>
    String(config.blackMarketUsdRate || '')
  );
  const [formOunceDiscount, setFormOunceDiscount] = useState<string>(() =>
    String(config.ounceDiscountUsd || 30)
  );
  const [formBrutDeduction, setFormBrutDeduction] = useState<string>(() =>
    String(config.brutDeductionXaf || 4500)
  );
  const [formBrutDiscountPercent, setFormBrutDiscountPercent] = useState<string>(() =>
    String(config.brutDiscountPercent ?? 6)
  );
  const [formFonduDeduction, setFormFonduDeduction] = useState<string>(() =>
    String(config.fonduDeductionXaf || 3500)
  );
  const [formBijouxDeduction, setFormBijouxDeduction] = useState<string>(() =>
    String(config.bijouxDeductionXaf || 7000)
  );
  const [formSaveFeedback, setFormSaveFeedback] = useState<string | null>(null);

  // Sync inputs if remote config changes
  useEffect(() => {
    if (config.officialUsdRate) setFormOfficialRate(String(config.officialUsdRate));
    if (config.blackMarketUsdRate) setFormBlackMarketRate(String(config.blackMarketUsdRate));
    if (config.brutDeductionXaf !== undefined) setFormBrutDeduction(String(config.brutDeductionXaf));
    if (config.brutDiscountPercent !== undefined) setFormBrutDiscountPercent(String(config.brutDiscountPercent));
    if (config.fonduDeductionXaf !== undefined) setFormFonduDeduction(String(config.fonduDeductionXaf));
    if (config.bijouxDeductionXaf !== undefined) setFormBijouxDeduction(String(config.bijouxDeductionXaf));
    if (config.ounceDiscountUsd !== undefined) setFormOunceDiscount(String(config.ounceDiscountUsd));
    if (config.kitcoGoldSpotUsd) setFormKitcoPrice(String(config.kitcoGoldSpotUsd));
  }, [config]);

  // Sync if live goldQuote updates and user hasn't set custom
  useEffect(() => {
    if (goldQuote?.pricePerTroyOunceUsd && !config.kitcoGoldSpotUsd) {
      setFormKitcoPrice(String(goldQuote.pricePerTroyOunceUsd));
    }
  }, [goldQuote, config.kitcoGoldSpotUsd]);

  const handleSaveRatesAndFormula = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const kitcoSpot = parseFloat(formKitcoPrice.replace(',', '.') || '0');
    const official = parseFloat(formOfficialRate.replace(',', '.') || '0');
    const blackMarket = parseFloat(formBlackMarketRate.replace(',', '.') || '0');
    const ounceDisc = parseFloat(formOunceDiscount.replace(',', '.') || '0');
    const brutDed = parseFloat(formBrutDeduction.replace(',', '.') || '0');
    const brutDiscPct = parseFloat(formBrutDiscountPercent.replace(',', '.') || '0');
    const fonduDed = parseFloat(formFonduDeduction.replace(',', '.') || '0');
    const bijouxDed = parseFloat(formBijouxDeduction.replace(',', '.') || '0');

    store.updatePurchaseFormulaConfig({
      kitcoGoldSpotUsd: kitcoSpot > 0 ? kitcoSpot : undefined,
      officialUsdRate: official > 0 ? official : 0,
      blackMarketUsdRate: blackMarket > 0 ? blackMarket : 0,
      ounceDiscountUsd: ounceDisc >= 0 ? ounceDisc : 30,
      brutDeductionXaf: brutDed >= 0 ? brutDed : 4500,
      brutDiscountPercent: brutDiscPct >= 0 ? brutDiscPct : 6,
      fonduDeductionXaf: fonduDed >= 0 ? fonduDed : 3500,
      bijouxDeductionXaf: bijouxDed >= 0 ? bijouxDed : 7000,
    });

    setFormSaveFeedback('Paramètres Kitco, cours et formule d’or brut enregistrés avec succès !');
    setTimeout(() => setFormSaveFeedback(null), 3500);
  };

  const handleFetchKitcoSpot = async () => {
    setIsRefreshing(true);
    try {
      const q = await GoldPriceService.fetchGoldUsd();
      setGoldQuote(q);
      if (q && q.pricePerTroyOunceUsd) {
        setFormKitcoPrice(String(q.pricePerTroyOunceUsd));
        store.updatePurchaseFormulaConfig({ kitcoGoldSpotUsd: q.pricePerTroyOunceUsd });
        setFormSaveFeedback(`Cours Kitco actualisé : $${formatNumber(q.pricePerTroyOunceUsd, 2)} / oz`);
        setTimeout(() => setFormSaveFeedback(null), 3000);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Live simulation for preview table
  const parsedKitcoPrice = parseFloat(formKitcoPrice.replace(',', '.') || '0');
  const simKitco = parsedKitcoPrice > 0
    ? parsedKitcoPrice
    : config.kitcoGoldSpotUsd || goldQuote?.pricePerTroyOunceUsd || 0;
  const parsedOfficialRate = parseFloat(formOfficialRate.replace(',', '.') || '0');
  const simOfficialRate =
    parsedOfficialRate > 0
      ? parsedOfficialRate
      : exchangeRates?.usdRates['XAF'] || config.officialUsdRate || 0;
  const simBlackMarket = parseFloat(formBlackMarketRate.replace(',', '.') || '0');
  const simOunceDisc = parseFloat(formOunceDiscount.replace(',', '.') || '30') || 30;
  const simBrutDed = parseFloat(formBrutDeduction.replace(',', '.') || '4500') || 4500;
  const simBrutDiscPct = parseFloat(formBrutDiscountPercent.replace(',', '.') || '6') || 6;
  const simFonduDed = parseFloat(formFonduDeduction.replace(',', '.') || '3500') || 3500;
  const simBijouxDed = parseFloat(formBijouxDeduction.replace(',', '.') || '7000') || 7000;

  const simTUsd = Math.max(0, simKitco - simOunceDisc);
  const simOrBrut1 = (simTUsd * simOfficialRate) / 31.103477;

  // Exact formulas:
  // Or brut = (((L'or brut1 - 4500) / 24) * Carat) - 6%
  const calcSimBrut = (karat: number) =>
    Math.max(0, Math.round((((simOrBrut1 - simBrutDed) / 24) * karat) * (1 - simBrutDiscPct / 100)));
  const calcSimFondu = (karat: number) =>
    Math.max(0, Math.round(((simOrBrut1 - simFonduDed) / 24) * karat));
  const calcSimBijoux = (karat: number) =>
    Math.max(0, Math.round(calcSimFondu(karat) - simBijouxDed));

  const { premiumPercent: simPremium } = calculateParallelRate({
    officialRate: simOfficialRate,
    blackMarketRate: simBlackMarket,
  });

  const usdToXaf = exchangeRates?.usdRates['XAF'] || 0;
  const goldPriceUsd = config.kitcoGoldSpotUsd || goldQuote?.pricePerTroyOunceUsd || 0;
  const gramFineUsd = goldPriceUsd / 31.1034768;
  const gramFineXaf = gramFineUsd * usdToXaf;

  const totalTreasury = Object.values(store.bankBalances).reduce((acc, v) => acc + v, 0);
  const bankOnlyTotal = Math.max(0, totalTreasury - cashBalance);

  return (
    <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-7">
      {/* ========================================================================= */}
      {/* SECTION 2 : VUE D'ENSEMBLE DE LA TRÉSORERIE & DES INDICATEURS GLOBAUX      */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-[#192A24] flex items-center gap-2">
            <TrendingUp size={20} className="text-[#008B62]" />
            <span>Vue d’Ensemble & Trésorerie Globale Entreprise</span>
          </h2>
          <span className="text-xs text-gray-500">
            Trésorerie consolidée (Caisse physique + Banques)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Trésorerie Globale (Caisse + Banques) */}
          <div
            onClick={() => onNavigate(5)}
            className="p-5 rounded-2xl bg-[#FFF9EA] border border-[#F6E1B4] shadow-xs cursor-pointer hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9E731B]">
                Trésorerie Globale
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#D39725]/20 text-[#9E731B] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet size={19} />
              </div>
            </div>
            <div className="text-2xl font-black text-[#17313D]">
              {formatMoney(totalTreasury)} <span className="text-sm font-semibold text-gray-500">FCFA</span>
            </div>
            <div className="text-[11px] text-[#9E731B] mt-1.5 flex items-center justify-between font-semibold">
              <span>Caisse : {formatMoney(cashBalance)} F</span>
              <span>Banques : {formatMoney(bankOnlyTotal)} F</span>
            </div>
          </div>

          {/* Bénéfice total Net (Or + Devises) */}
          <div
            onClick={() => onNavigate(9)}
            className="p-5 rounded-2xl bg-[#F0F6FD] border border-[#CDE1F9] shadow-xs cursor-pointer hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2B6CB0]">
                Bénéfice Net Total
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#438BDD]/20 text-[#2B6CB0] flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp size={19} />
              </div>
            </div>
            <div className="text-2xl font-black text-[#17313D]">
              {formatMoney(store.totalProfit)} <span className="text-sm font-semibold text-gray-500">FCFA</span>
            </div>
            <div className="text-[11px] text-[#2B6CB0] mt-1.5 flex items-center justify-between font-semibold">
              <span>Or : {formatMoney(store.goldProfit)} F</span>
              <span>Devises : {formatMoney(store.currencyProfit)} F</span>
            </div>
          </div>

          {/* Stock Devises en réserve */}
          <div
            onClick={() => onNavigate(3)}
            className="p-5 rounded-2xl bg-[#F0FDF8] border border-[#BCEBD7] shadow-xs cursor-pointer hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#16A477]">
                Stock Devises
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#16A477]/20 text-[#16A477] flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowLeftRight size={19} />
              </div>
            </div>
            <div className="text-2xl font-black text-[#17313D]">
              {totalCurrenciesCount} <span className="text-sm font-semibold text-gray-500">devises</span>
            </div>
            <div className="text-xs text-[#71828B] mt-1">USD, EUR, XAF, AED, CNY...</div>
          </div>

          {/* Or physique en coffre */}
          <div
            onClick={() => onNavigate(10)}
            className="p-5 rounded-2xl bg-[#FDF4F2] border border-[#F9D0CA] shadow-xs cursor-pointer hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#DD5C50]">
                Or physique en stock
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#ED786E]/20 text-[#DD5C50] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Coins size={19} />
              </div>
            </div>
            <div className="text-2xl font-black text-[#17313D]">
              {formatNumber(totalGoldGrams, 1)} <span className="text-sm font-semibold text-gray-500">grammes</span>
            </div>
            <div className="text-xs text-[#71828B] mt-1">Tous carats confondus (Coffre-fort)</div>
          </div>
        </div>
      </div>

      {/* MARCHÉ & COURS SPOT DE L'OR (Version Réduite et Compacte pour l'Accueil) */}
      <GoldRateCardsDisplay
        goldPriceOunce={goldPriceUsd}
        silverPriceOunce={silverQuote?.pricePerTroyOunceUsd || 0}
        officialUsdRate={usdToXaf || config.officialUsdRate}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
        selectedKarat={selectedKarat}
        onSelectKarat={(selectedK) => {
          setSelectedKarat(selectedK);
          onNavigate(1); // Naviguer vers Achat d'Or
        }}
        onOpenFormulaModal={() => setIsFormulaModalOpen(true)}
        useParallelRate={useParallelRate}
        onToggleUseParallelRate={(val) => setUseParallelRate(val)}
        compact={true}
        isLiveRates={Boolean(goldQuote?.isLive)}
        ratesSource={ratesSource}
        lastUpdated={lastRefreshed || undefined}
        isRefreshing={isRefreshing}
        onRefreshRates={loadMarket}
        goldChangePercent={goldQuote?.changePercent}
        goldChangeUsd={goldQuote?.changeUsd}
        silverChangePercent={silverQuote?.changePercent}
        silverChangeUsd={silverQuote?.changeUsd}
      />

      {/* FORMULAIRE COURS & TAUX DU JOUR (Kitco, Devises & Formule Or) */}
      <AppPanel className="border-2 border-[#D39725]/40 bg-gradient-to-br from-[#FFFDF8] via-white to-[#FDF8EE] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8D8BE] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D39725]/20 text-[#9E731B] flex items-center justify-center">
              <Sliders size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-[#192A24]">
                  Formulaire Cours & Taux du Jour (Kitco, Devises & Formule Or)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Kitco Spot Live
                </span>
              </div>
              <p className="text-xs text-[#7D8176] mt-0.5">
                Réglez le cours Kitco, les parités USD/FCFA et ajustez la formule officielle : <span className="font-mono text-[#D39725] font-bold">Or brut = (((L'or brut₁ - {formBrutDeduction}) / 24) × Carat) - {formBrutDiscountPercent}%</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFetchKitcoSpot}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#9E731B] border border-amber-200 text-xs font-bold cursor-pointer transition-colors"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Kitco Live</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRatesFormOpen(!isRatesFormOpen)}
              className="p-1.5 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              {isRatesFormOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {formSaveFeedback && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{formSaveFeedback}</span>
          </div>
        )}

        {isRatesFormOpen && (
          <form onSubmit={handleSaveRatesAndFormula} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Cours Kitco Spot */}
              <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#192A24]">
                  <span className="flex items-center gap-1">
                    <Sparkles size={13} className="text-[#D39725]" />
                    Cours Kitco Spot ($/oz)
                  </span>
                  <span className="text-[10px] text-gray-500">Live feed</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formKitcoPrice}
                    onChange={(e) => setFormKitcoPrice(e.target.value)}
                    placeholder="Cours actuel USD/oz"
                    className="w-full pl-7 pr-3 py-2 bg-white rounded-lg border border-[#D5C2A5] font-black text-sm text-[#192A24]"
                  />
                </div>
                <div className="text-[10px] text-gray-500">
                  Base once troy (31,1035 g)
                </div>
              </div>

              {/* 2. Taux USD Officiel */}
              <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#192A24]">
                  <span>Taux USD Officiel (FCFA)</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">BCEAO</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={formOfficialRate}
                  onChange={(e) => setFormOfficialRate(e.target.value)}
                  placeholder="Taux USD/XAF"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-[#D5C2A5] font-black text-sm text-[#192A24]"
                />
                <div className="text-[10px] text-gray-500">
                  Dollar international standard
                </div>
              </div>

              {/* 3. Taux Marché Noir / Parallèle */}
              <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#192A24]">
                  <span>Taux Marché Noir (FCFA)</span>
                  <span className="text-[10px] text-amber-700 font-bold">
                    +{formatNumber(simPremium, 1)}%
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={formBlackMarketRate}
                  onChange={(e) => setFormBlackMarketRate(e.target.value)}
                  placeholder="Taux parallèle"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-[#D5C2A5] font-black text-sm text-[#192A24]"
                />
                <div className="text-[10px] text-gray-500">
                  Taux négocié sur place
                </div>
              </div>

              {/* 4. Décote once T (T = Prix - 30) */}
              <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#192A24]">
                  <span>Décote Once T ($)</span>
                  <span className="text-[10px] text-gray-500">T = Spot - X</span>
                </div>
                <input
                  type="text"
                  value={formOunceDiscount}
                  onChange={(e) => setFormOunceDiscount(e.target.value)}
                  placeholder="30"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-[#D5C2A5] font-black text-sm text-[#192A24]"
                />
                <div className="text-[10px] text-gray-500">
                  T net = ${(simTUsd).toFixed(2)} / oz
                </div>
              </div>
            </div>

            {/* FORMULE OR BRUT ET AUTRES DÉCOTES */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                  <span>Paramètres personnalisables de la formule d'achat de l'or :</span>
                </div>
                <div className="text-[11px] font-mono text-amber-900 bg-amber-100/70 px-2.5 py-1 rounded-md">
                  L'or brut₁ (24K brut) = {formatMoney(simOrBrut1)} FCFA/g
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Décote Or brut en FCFA */}
                <div>
                  <label className="block font-bold text-[#192A24] mb-1">
                    Décote Or brut (FCFA / 24K)
                  </label>
                  <input
                    type="text"
                    value={formBrutDeduction}
                    onChange={(e) => setFormBrutDeduction(e.target.value)}
                    placeholder="4500"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-amber-300 font-bold"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Défaut comptoir : 4 500 F</span>
                </div>

                {/* Décote % Or brut */}
                <div>
                  <label className="block font-bold text-[#192A24] mb-1">
                    Pourcentage décote Or brut (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formBrutDiscountPercent}
                      onChange={(e) => setFormBrutDiscountPercent(e.target.value)}
                      placeholder="6"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-amber-300 font-black text-amber-900"
                    />
                    <span className="absolute right-3 top-2 font-bold text-gray-400">%</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Formule exacte : - 6%</span>
                </div>

                {/* Décote Or Fondu */}
                <div>
                  <label className="block font-bold text-[#192A24] mb-1">
                    Décote Or fondu (FCFA / 24K)
                  </label>
                  <input
                    type="text"
                    value={formFonduDeduction}
                    onChange={(e) => setFormFonduDeduction(e.target.value)}
                    placeholder="3500"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-amber-300 font-bold"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Défaut comptoir : 3 500 F</span>
                </div>

                {/* Décote Bijoux */}
                <div>
                  <label className="block font-bold text-[#192A24] mb-1">
                    Décote Bijoux (FCFA / g)
                  </label>
                  <input
                    type="text"
                    value={formBijouxDeduction}
                    onChange={(e) => setFormBijouxDeduction(e.target.value)}
                    placeholder="7000"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-amber-300 font-bold"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Défaut comptoir : 7 000 F</span>
                </div>
              </div>
            </div>

            {/* BARÈME RÉSULTANT EN DIRECT (TABLEAU COMPARATIF) */}
            <div className="rounded-xl border border-[#E8D8BE] overflow-hidden bg-white">
              <div className="px-4 py-2 bg-[#FAF8F3] border-b border-[#E8D8BE] flex items-center justify-between">
                <span className="text-xs font-bold text-[#192A24]">
                  Barème calculé en direct au comptoir (Prix d'achat net par gramme)
                </span>
                <span className="text-[10px] text-gray-500">
                  Simulé sur cours Kitco ${formatNumber(simKitco, 2)} · USD {formatNumber(simOfficialRate, 2)} F
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-500 bg-gray-50/50 uppercase">
                      <th className="py-2.5 px-4">Titre Carat</th>
                      <th className="py-2.5 px-4 text-amber-900 font-black">
                        Or Brut (Formule -{simBrutDiscPct}%)
                      </th>
                      <th className="py-2.5 px-4 text-[#D39725] font-black">Or Fondu</th>
                      <th className="py-2.5 px-4 text-[#008B62] font-black">Bijoux</th>
                      <th className="py-2.5 px-4 text-right text-gray-400">Poids 24K pureté</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    <tr>
                      <td className="py-2 px-4 font-bold font-sans text-gray-900">24K (999‰)</td>
                      <td className="py-2 px-4 font-black text-amber-900">{formatMoney(calcSimBrut(24))} FCFA</td>
                      <td className="py-2 px-4 font-bold text-[#D39725]">{formatMoney(calcSimFondu(24))} FCFA</td>
                      <td className="py-2 px-4 font-bold text-[#008B62]">{formatMoney(calcSimBijoux(24))} FCFA</td>
                      <td className="py-2 px-4 text-right font-sans text-gray-400">100%</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-bold font-sans text-gray-900">22K (916‰)</td>
                      <td className="py-2 px-4 font-black text-amber-900">{formatMoney(calcSimBrut(22))} FCFA</td>
                      <td className="py-2 px-4 font-bold text-[#D39725]">{formatMoney(calcSimFondu(22))} FCFA</td>
                      <td className="py-2 px-4 font-bold text-[#008B62]">{formatMoney(calcSimBijoux(22))} FCFA</td>
                      <td className="py-2 px-4 text-right font-sans text-gray-400">91.6%</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-bold font-sans text-gray-900">18K (750‰)</td>
                      <td className="py-2 px-4 font-black text-amber-900">{formatMoney(calcSimBrut(18))} FCFA</td>
                      <td className="py-2 px-4 font-bold text-[#D39725]">{formatMoney(calcSimFondu(18))} FCFA</td>
                      <td className="py-2 px-4 font-bold text-[#008B62]">{formatMoney(calcSimBijoux(18))} FCFA</td>
                      <td className="py-2 px-4 text-right font-sans text-gray-400">75.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  store.resetPurchaseFormulaConfig();
                  setFormBrutDeduction('4500');
                  setFormBrutDiscountPercent('6');
                  setFormFonduDeduction('3500');
                  setFormBijouxDeduction('7000');
                  setFormOunceDiscount('30');
                  setFormOfficialRate('');
                  setFormBlackMarketRate('');
                  setFormSaveFeedback('Valeurs par défaut restaurées.');
                  setTimeout(() => setFormSaveFeedback(null), 2500);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Rétablir les valeurs comptoir</span>
              </button>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#192A24] hover:bg-[#253D34] text-white text-xs font-black shadow-md cursor-pointer transition-all"
              >
                <Save size={15} />
                <span>Enregistrer & Appliquer au Comptoir</span>
              </button>
            </div>
          </form>
        )}
      </AppPanel>

      {/* Main Grid: Market Rates & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Market Widget & Recent Operations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Market Bar */}
          <AppPanel className="bg-gradient-to-r from-[#192A24] to-[#253D34] text-white border-0 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-sm tracking-wide">Cours international en direct</span>
              </div>
              <span className="text-xs text-white/60">
                {lastRefreshed
                  ? `Mis à jour à ${new Date(lastRefreshed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Aucune cotation disponible'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[11px] text-white/70 uppercase tracking-wider font-semibold">Or spot / Once</div>
                <div className="text-lg font-black text-[#F2BD45] mt-1">
                  {goldPriceUsd > 0 ? `$${formatNumber(goldPriceUsd, 2)}` : 'Indisponible'}
                </div>
                {goldQuote?.changePercent !== undefined && (
                  <div className={`text-[10px] font-medium ${goldQuote.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {goldQuote.changePercent >= 0 ? '+' : ''}{goldQuote.changePercent.toFixed(2)}% (24h)
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[11px] text-white/70 uppercase tracking-wider font-semibold">Or fin 24K / gramme</div>
                <div className="text-lg font-black text-white mt-1">
                  {gramFineXaf > 0 ? <>{formatMoney(gramFineXaf)} <span className="text-xs">F</span></> : 'Indisponible'}
                </div>
                {gramFineUsd > 0 && <div className="text-[10px] text-white/60">${formatNumber(gramFineUsd, 2)} / g</div>}
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[11px] text-white/70 uppercase tracking-wider font-semibold">USD / XAF</div>
                <div className="text-lg font-black text-white mt-1">
                  {usdToXaf > 0 ? formatNumber(usdToXaf, 2) : 'Indisponible'}
                </div>
                <div className="text-[10px] text-white/60">Taux officiel</div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[11px] text-white/70 uppercase tracking-wider font-semibold">EUR / XAF</div>
                <div className="text-lg font-black text-white mt-1">
                  {exchangeRates?.usdRates['XAF'] && exchangeRates.usdRates['EUR']
                    ? formatNumber(exchangeRates.usdRates['XAF'] / exchangeRates.usdRates['EUR'], 2)
                    : 'Indisponible'}
                </div>
                <div className="text-[10px] text-white/60">Parité BCEAO</div>
              </div>
            </div>
          </AppPanel>

          {/* Operations to process */}
          {store.unprocessedOperations.length > 0 && (
            <AppPanel className="border-amber-200 bg-amber-50/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <AlertCircle size={18} className="text-amber-600" />
                  <span>Opérations en attente de validation ({store.unprocessedOperations.length})</span>
                </div>
              </div>
              <div className="space-y-2">
                {store.unprocessedOperations.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200 shadow-2xs"
                  >
                    <div>
                      <div className="text-sm font-bold text-[#17313D]">{op.title}</div>
                      <div className="text-xs text-[#71828B]">{op.subtitle} · {op.date}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold text-[#17313D]">
                        {formatMoney(op.amount)} FCFA
                      </span>
                      <button
                        onClick={() => store.markOperationProcessed(op.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <CheckCircle2 size={13} />
                        <span>Valider</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </AppPanel>
          )}

          {/* Recent Operations */}
          <AppPanel>
            <SectionHeading
              title="Dernières opérations enregistrées"
              icon={<Clock size={20} />}
              trailing={
                <button
                  onClick={() => onNavigate(9)}
                  className="text-xs font-bold text-[#D39725] hover:underline cursor-pointer"
                >
                  Voir tout ({store.operations.length})
                </button>
              }
            />

            <div className="divide-y divide-gray-100">
              {store.operations.slice(0, 5).map((op) => (
                <div key={op.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        op.isIncome
                          ? 'bg-emerald-100 text-emerald-700'
                          : op.isTransfer
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {op.isIncome ? (
                        <ArrowDownLeft size={18} />
                      ) : op.isTransfer ? (
                        <ArrowLeftRight size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#17313D]">{op.title}</div>
                      <div className="text-xs text-[#71828B]">{op.subtitle} · {op.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-black ${
                        op.isIncome
                          ? 'text-emerald-600'
                          : op.isTransfer
                          ? 'text-blue-600'
                          : 'text-[#17313D]'
                      }`}
                    >
                      {op.isIncome ? '+ ' : ''}
                      {formatMoney(op.amount)} FCFA
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {op.isProcessed ? 'Traité' : 'En attente'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AppPanel>
        </div>

        {/* Right Column: Quick shortcuts & upcoming appointments */}
        <div className="space-y-6">
          {/* Quick Shortcuts */}
          <AppPanel>
            <SectionHeading title="Actions rapides" />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate(1)}
                className="p-3.5 rounded-xl bg-[#FAF8F3] hover:bg-[#F6F0E5] border border-[#E8D8BE] text-left transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#D39725]/15 text-[#D39725] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Wallet size={17} />
                </div>
                <div className="font-bold text-xs text-[#192A24]">Achat d'Or</div>
                <div className="text-[11px] text-[#7D8176]">Pesée & calcul</div>
              </button>

              <button
                onClick={() => onNavigate(2)}
                className="p-3.5 rounded-xl bg-[#FAF8F3] hover:bg-[#F6F0E5] border border-[#E8D8BE] text-left transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <TrendingUp size={17} />
                </div>
                <div className="font-bold text-xs text-[#192A24]">Vente Dubaï</div>
                <div className="text-[11px] text-[#7D8176]">Export & marge</div>
              </button>

              <button
                onClick={() => onNavigate(13)}
                className="p-3.5 rounded-xl bg-[#FAF8F3] hover:bg-[#F6F0E5] border border-[#E8D8BE] text-left transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <ArrowLeftRight size={17} />
                </div>
                <div className="font-bold text-xs text-[#192A24]">Change Devise</div>
                <div className="text-[11px] text-[#7D8176]">Taux & parallèle</div>
              </button>

              <button
                onClick={() => onNavigate(5)}
                className="p-3.5 rounded-xl bg-[#FAF8F3] hover:bg-[#F6F0E5] border border-[#E8D8BE] text-left transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Coins size={17} />
                </div>
                <div className="font-bold text-xs text-[#192A24]">Appro</div>
                <div className="text-[11px] text-[#7D8176]">Alimentation caisse</div>
              </button>

              {/* Virement Client button */}
              <button
                onClick={() => onNavigate(1)}
                className="col-span-2 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-300 text-left transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#008B62] text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                      <Send size={18} />
                    </div>
                    <div>
                      <div className="font-black text-xs text-[#192A24]">Virement vers compte client</div>
                      <div className="text-[11px] text-[#008B62] font-semibold">Débiter mon compte pour payer un client</div>
                    </div>
                  </div>
                  <ArrowUpRight size={16} className="text-[#008B62]" />
                </div>
              </button>
            </div>
          </AppPanel>

          {/* Upcoming RDV */}
          <AppPanel>
            <SectionHeading
              title="Prochains rendez-vous"
              icon={<Calendar size={18} />}
              trailing={
                <button
                  onClick={() => onNavigate(7)}
                  className="text-xs font-bold text-[#D39725] hover:underline cursor-pointer"
                >
                  Agenda
                </button>
              }
            />

            {store.contactsWithAppointments.length === 0 ? (
              <div className="text-xs text-gray-500 py-3 text-center">
                Aucun rendez-vous fixé pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {store.contactsWithAppointments.slice(0, 3).map((c) => (
                  <div
                    key={c.reference}
                    className="p-3 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE] flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#192A24]">{c.name}</div>
                      <div className="text-[11px] text-[#7D8176]">{c.city} · {c.phone}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-[#D39725]/15 text-[#9E731B] text-[11px] font-bold">
                      {c.appointment}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </AppPanel>

          {/* Treasury breakdown */}
          <AppPanel>
            <SectionHeading title="Répartition Trésorerie" />
            <div className="space-y-2.5">
              {Object.entries(store.bankBalances).map(([name, balance]) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#71828B]">{name}</span>
                  <span className="font-bold text-[#17313D]">{formatMoney(balance)} FCFA</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-black">
                <span className="text-[#17313D]">Total Général</span>
                <span className="text-[#D39725]">{formatMoney(store.totalTreasury)} FCFA</span>
              </div>
            </div>
          </AppPanel>
        </div>
      </div>

      {/* Modal Formules & Taux Parallèle */}
      <PurchaseFormulaModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
        defaultOuncePrice={String(goldPriceUsd)}
        defaultUsdRate={String(usdToXaf)}
        onGoldQuoteReceived={(quote) => {
          setGoldQuote(quote);
          setRatesSource(quote.source || 'GoldAPI.io (Live)');
          setLastRefreshed(quote.updatedAt);
          store.updatePurchaseFormulaConfig({ kitcoGoldSpotUsd: quote.pricePerTroyOunceUsd });
        }}
      />
    </div>
  );
};
