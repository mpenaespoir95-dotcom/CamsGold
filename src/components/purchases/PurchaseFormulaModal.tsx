import React, { useState, useEffect } from 'react';
import {
  Calculator,
  RotateCcw,
  Check,
  Info,
  DollarSign,
  Layers,
  Sparkles,
  HelpCircle,
  TrendingDown,
  ArrowRight,
  BarChart2,
  Globe,
  Radio,
  Edit3,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { Modal } from '../common/UIComponents';
import { useAppStore } from '../../context/AppContext';
import {
  PurchaseFormulaConfig,
  DEFAULT_PURCHASE_FORMULA_CONFIG,
  GoldPriceQuote,
} from '../../types';
import {
  computeComptoirGoldPurchasePrice,
  formatPriceCard,
  formatMoney,
  formatNumber,
} from '../../utils/goldMath';
import { GoldPriceService } from '../../services/goldPriceService';
import { ExchangeRateService } from '../../services/exchangeRateService';

interface PurchaseFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOuncePrice?: string;
  defaultUsdRate?: string;
  onGoldQuoteReceived?: (quote: GoldPriceQuote) => void;
}

export const PurchaseFormulaModal: React.FC<PurchaseFormulaModalProps> = ({
  isOpen,
  onClose,
  defaultOuncePrice = '',
  defaultUsdRate = '',
  onGoldQuoteReceived,
}) => {
  const store = useAppStore();

  // Local form state for formula parameters
  const [ounceDiscountUsd, setOunceDiscountUsd] = useState(
    String(store.purchaseFormulaConfig.ounceDiscountUsd)
  );
  const [troyOunceDivisor, setTroyOunceDivisor] = useState(
    String(store.purchaseFormulaConfig.troyOunceDivisor)
  );
  const [brutDeductionXaf, setBrutDeductionXaf] = useState(
    String(store.purchaseFormulaConfig.brutDeductionXaf)
  );
  const [brutDiscountPercent, setBrutDiscountPercent] = useState(
    String(store.purchaseFormulaConfig.brutDiscountPercent ?? 6)
  );
  const [fonduDeductionXaf, setFonduDeductionXaf] = useState(
    String(store.purchaseFormulaConfig.fonduDeductionXaf)
  );
  const [bijouxDeductionXaf, setBijouxDeductionXaf] = useState(
    String(store.purchaseFormulaConfig.bijouxDeductionXaf)
  );
  const [bijouxFormulaMode, setBijouxFormulaMode] = useState<'deductFromFondu' | 'deductFromBrut1'>(
    store.purchaseFormulaConfig.bijouxFormulaMode || 'deductFromFondu'
  );
  const [officialUsdRate, setOfficialUsdRate] = useState(
    String(store.purchaseFormulaConfig.officialUsdRate || '')
  );
  const [blackMarketUsdRate, setBlackMarketUsdRate] = useState(
    String(store.purchaseFormulaConfig.blackMarketUsdRate || '')
  );
  const [useParallelRateInPurchases, setUseParallelRateInPurchases] = useState(
    Boolean(store.purchaseFormulaConfig.useParallelRateInPurchases)
  );

  // Custom formula textual representations (editable by step)
  const [customFormulaT, setCustomFormulaT] = useState(
    store.purchaseFormulaConfig.customFormulaT || 'T = Prix OZ ($) - 30 $'
  );
  const [customFormulaOrBrut1, setCustomFormulaOrBrut1] = useState(
    store.purchaseFormulaConfig.customFormulaOrBrut1 || "L'or brut₁ = (T × Taux USD/XAF) / 31.103477"
  );
  const [customFormulaOrBrut, setCustomFormulaOrBrut] = useState(
    store.purchaseFormulaConfig.customFormulaOrBrut || "Or brut = (((L'or brut₁ - 4 500) / 24) × Carat) - 6%"
  );
  const [customFormulaOrFondu, setCustomFormulaOrFondu] = useState(
    store.purchaseFormulaConfig.customFormulaOrFondu || "Or fondu = ((L'or brut₁ - 3 500) / 24) × Carat"
  );
  const [customFormulaBijoux, setCustomFormulaBijoux] = useState(
    store.purchaseFormulaConfig.customFormulaBijoux || 'Bijoux = Or fondu - 7 000 FCFA/g'
  );

  // API keys
  const [fxApiKey, setFxApiKey] = useState(ExchangeRateService.getSavedApiKey());
  const [goldApiStatus, setGoldApiStatus] = useState<{ message: string; success: boolean } | null>(null);
  const [isTestingGoldApi, setIsTestingGoldApi] = useState(false);

  // Live simulation inputs
  const [simOunce, setSimOunce] = useState(defaultOuncePrice);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // Sync when modal opens or store changes
  useEffect(() => {
    if (isOpen) {
      const cfg = store.purchaseFormulaConfig;
      setOunceDiscountUsd(String(cfg.ounceDiscountUsd));
      setTroyOunceDivisor(String(cfg.troyOunceDivisor));
      setBrutDeductionXaf(String(cfg.brutDeductionXaf));
      setBrutDiscountPercent(String(cfg.brutDiscountPercent ?? 6));
      setFonduDeductionXaf(String(cfg.fonduDeductionXaf));
      setBijouxDeductionXaf(String(cfg.bijouxDeductionXaf));
      setBijouxFormulaMode(cfg.bijouxFormulaMode || 'deductFromFondu');
      setOfficialUsdRate(String(cfg.officialUsdRate || ''));
      setBlackMarketUsdRate(String(cfg.blackMarketUsdRate || ''));
      setUseParallelRateInPurchases(Boolean(cfg.useParallelRateInPurchases));

      setCustomFormulaT(cfg.customFormulaT || `T = Prix OZ ($) - ${cfg.ounceDiscountUsd} $`);
      setCustomFormulaOrBrut1(cfg.customFormulaOrBrut1 || `L'or brut₁ = (T × Taux USD/XAF) / ${cfg.troyOunceDivisor}`);
      setCustomFormulaOrBrut(
        cfg.customFormulaOrBrut ||
          `Or brut = (((L'or brut₁ - ${formatMoney(cfg.brutDeductionXaf)}) / 24) × Carat) - ${cfg.brutDiscountPercent}%`
      );
      setCustomFormulaOrFondu(
        cfg.customFormulaOrFondu ||
          `Or fondu = ((L'or brut₁ - ${formatMoney(cfg.fonduDeductionXaf)}) / 24) × Carat`
      );
      setCustomFormulaBijoux(
        cfg.customFormulaBijoux ||
          (cfg.bijouxFormulaMode === 'deductFromBrut1'
            ? `Bijoux = ((L'or brut₁ - ${formatMoney(cfg.bijouxDeductionXaf)}) / 24) × Carat`
            : `Bijoux = Or fondu - ${formatMoney(cfg.bijouxDeductionXaf)} FCFA/g`)
      );

      setFxApiKey(ExchangeRateService.getSavedApiKey());
      setSimOunce(defaultOuncePrice);
      setSavedBanner(null);
    }
  }, [isOpen, store.purchaseFormulaConfig, defaultOuncePrice]);

  const parsedOfficialRate = parseFloat(officialUsdRate.replace(',', '.') || '0');
  const parsedBlackMarketRate = parseFloat(blackMarketUsdRate.replace(',', '.') || '0');

  // Calcul du premium selon la formule de l'utilisateur:
  // premium = ((marché_noir - dollar_international) / dollar_international) * 100
  const computedPremium =
    parsedOfficialRate > 0 && parsedBlackMarketRate > 0
      ? ((parsedBlackMarketRate - parsedOfficialRate) / parsedOfficialRate) * 100
      : 0;

  // Taux parallèle = Taux_officiel * (1 + premium / 100)
  const computedParallelRate = parsedOfficialRate * (1 + computedPremium / 100);

  // Construct draft config for live evaluation
  const draftConfig: PurchaseFormulaConfig = {
    ounceDiscountUsd: parseFloat(ounceDiscountUsd.replace(',', '.') || '30') || 30,
    troyOunceDivisor: parseFloat(troyOunceDivisor.replace(',', '.') || '31.103477') || 31.103477,
    brutDeductionXaf: parseFloat(brutDeductionXaf.replace(',', '.') || '4500') || 0,
    brutDiscountPercent: parseFloat(brutDiscountPercent.replace(',', '.') || '6') || 0,
    fonduDeductionXaf: parseFloat(fonduDeductionXaf.replace(',', '.') || '3500') || 0,
    bijouxDeductionXaf: parseFloat(bijouxDeductionXaf.replace(',', '.') || '7000') || 0,
    bijouxFormulaMode,
    officialUsdRate: parsedOfficialRate,
    blackMarketUsdRate: parsedBlackMarketRate,
    useParallelRateInPurchases,
    customFormulaT,
    customFormulaOrBrut1,
    customFormulaOrBrut,
    customFormulaOrFondu,
    customFormulaBijoux,
  };

  const simOunceNum = parseFloat(simOunce.replace(',', '.') || '0');

  const simT = Math.max(0, simOunceNum - draftConfig.ounceDiscountUsd);
  const simOrBrut1 = (simT * parsedOfficialRate) / (draftConfig.troyOunceDivisor || 31.103477);
  const simOrBrut1Parallel = (simT * computedParallelRate) / (draftConfig.troyOunceDivisor || 31.103477);

  // Quick helper simulation for carats
  const calcBrutPrice = (k: number) => {
    const base = ((simOrBrut1 - draftConfig.brutDeductionXaf) / 24) * k;
    return Math.max(0, Math.round(base * (1 - draftConfig.brutDiscountPercent / 100)));
  };

  const calcFonduPrice = (k: number) => {
    return Math.max(0, Math.round(((simOrBrut1 - draftConfig.fonduDeductionXaf) / 24) * k));
  };

  const calcBijouxPrice = (k: number) => {
    if (draftConfig.bijouxFormulaMode === 'deductFromBrut1') {
      return Math.max(0, Math.round(((simOrBrut1 - draftConfig.bijouxDeductionXaf) / 24) * k));
    }
    return Math.max(0, Math.round(calcFonduPrice(k) - draftConfig.bijouxDeductionXaf));
  };

  const caratsToSimulate = [24, 22, 21, 18, 14, 9];

  // Save all step formulas globally
  const handleSaveGlobal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    store.updatePurchaseFormulaConfig(draftConfig);
    ExchangeRateService.setSavedApiKey(fxApiKey);
    setSavedBanner('Formule globale et paramètres enregistrés avec succès ! Appliqués immédiatement à tout le comptoir.');
    setTimeout(() => {
      onClose();
    }, 1100);
  };

  const handleTestGoldApi = async () => {
    setGoldApiStatus(null);
    setIsTestingGoldApi(true);
    try {
      const quote = await GoldPriceService.fetchGoldApiComQuote('XAU');
      onGoldQuoteReceived?.(quote);
      setGoldApiStatus({
        message: `gold-api.com connecté : $${formatNumber(quote.pricePerTroyOunceUsd, 2)} USD/oz.`,
        success: true,
      });
    } catch (error: unknown) {
      setGoldApiStatus({
        message: error instanceof Error ? error.message : 'La connexion à gold-api.com a échoué.',
        success: false,
      });
    } finally {
      setIsTestingGoldApi(false);
    }
  };

  const handleReset = () => {
    store.resetPurchaseFormulaConfig();
    const def = DEFAULT_PURCHASE_FORMULA_CONFIG;
    setOunceDiscountUsd(String(def.ounceDiscountUsd));
    setTroyOunceDivisor(String(def.troyOunceDivisor));
    setBrutDeductionXaf(String(def.brutDeductionXaf));
    setBrutDiscountPercent(String(def.brutDiscountPercent ?? 6));
    setFonduDeductionXaf(String(def.fonduDeductionXaf));
    setBijouxDeductionXaf(String(def.bijouxDeductionXaf));
    setBijouxFormulaMode(def.bijouxFormulaMode);
    setOfficialUsdRate(String(def.officialUsdRate));
    setBlackMarketUsdRate(String(def.blackMarketUsdRate));
    setUseParallelRateInPurchases(def.useParallelRateInPurchases);

    setCustomFormulaT(def.customFormulaT || 'T = Prix OZ ($) - 30 $');
    setCustomFormulaOrBrut1(def.customFormulaOrBrut1 || "L'or brut₁ = (T × Taux USD/XAF) / 31.103477");
    setCustomFormulaOrBrut(def.customFormulaOrBrut || "Or brut = (((L'or brut₁ - 4 500) / 24) × Carat) - 6%");
    setCustomFormulaOrFondu(def.customFormulaOrFondu || "Or fondu = ((L'or brut₁ - 3 500) / 24) × Carat");
    setCustomFormulaBijoux(def.customFormulaBijoux || 'Bijoux = Or fondu - 7 000 FCFA/g');

    setSavedBanner('Formules réinitialisées aux valeurs officielles du comptoir.');
  };

  // Auto-sync custom formula text when parameters change (unless user customizes it)
  const handleOunceDiscountChange = (val: string) => {
    setOunceDiscountUsd(val);
    setCustomFormulaT(`T = Prix OZ ($) - ${val || '0'} $`);
  };

  const handleDivisorChange = (val: string) => {
    setTroyOunceDivisor(val);
    setCustomFormulaOrBrut1(`L'or brut₁ = (T × Taux USD/XAF) / ${val || '31.103477'}`);
  };

  const handleBrutChange = (deduction: string, discount: string) => {
    setBrutDeductionXaf(deduction);
    setBrutDiscountPercent(discount);
    setCustomFormulaOrBrut(
      `Or brut = (((L'or brut₁ - ${formatMoney(parseFloat(deduction || '0'))}) / 24) × Carat) - ${discount || '0'}%`
    );
  };

  const handleFonduChange = (deduction: string) => {
    setFonduDeductionXaf(deduction);
    setCustomFormulaOrFondu(
      `Or fondu = ((L'or brut₁ - ${formatMoney(parseFloat(deduction || '0'))}) / 24) × Carat`
    );
  };

  const handleBijouxChange = (deduction: string, mode: 'deductFromFondu' | 'deductFromBrut1') => {
    setBijouxDeductionXaf(deduction);
    setBijouxFormulaMode(mode);
    setCustomFormulaBijoux(
      mode === 'deductFromBrut1'
        ? `Bijoux = ((L'or brut₁ - ${formatMoney(parseFloat(deduction || '0'))}) / 24) × Carat`
        : `Bijoux = Or fondu - ${formatMoney(parseFloat(deduction || '0'))} FCFA/g`
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Formules de Calcul des Prix d'Achat d'Or (Comptoir)"
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSaveGlobal} className="space-y-6 max-h-[82vh] overflow-y-auto pr-1">
        {/* Banner notification */}
        {savedBanner && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-xs animate-in fade-in">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{savedBanner}</span>
          </div>
        )}

        <section className="p-4 rounded-2xl bg-white border border-[#E8D8BE] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-[#D39725]" />
            <h3 className="text-xs font-black text-[#192A24] uppercase tracking-wider">Source gold-api.com</h3>
          </div>
          <button
            type="button"
            onClick={handleTestGoldApi}
            disabled={isTestingGoldApi}
            className="px-4 py-2.5 rounded-xl bg-[#192A24] hover:bg-[#253D34] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            {isTestingGoldApi ? 'Test en cours…' : 'Actualiser et appliquer le cours'}
          </button>
          {goldApiStatus && (
            <p className={`text-xs font-semibold ${goldApiStatus.success ? 'text-emerald-700' : 'text-red-700'}`}>
              {goldApiStatus.message}
            </p>
          )}
          <p className="text-[10px] text-gray-500">
            Source publique sans clé. Le cours est exprimé en USD par once troy et actualisé par le fournisseur.
          </p>
        </section>

        {/* Top Header / Instructions with Quick Save Button */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FAF8F3] via-amber-50/60 to-white border border-[#E8D8BE] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D39725]/15 border border-[#D39725]/30 flex items-center justify-center text-[#966308] shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#192A24] uppercase tracking-wider">
                FORMULES OFFICIELLES DU COMPTOIR (ÉTAPES MODIFIABLES)
              </h3>
              <p className="text-[11px] text-gray-600">
                Vous pouvez saisir directement dans les champs de chaque étape, puis cliquer sur « Enregistrer la formule globale ».
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save size={15} />
              <span>Enregistrer la formule globale</span>
            </button>
          </div>
        </div>

        {/* THE 5 INTERACTIVE / DIRECTLY EDITABLE FORMULA CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ÉTAPE 1: COURS RÉFÉRENCE T */}
          <div className="p-4 bg-white rounded-2xl border-2 border-amber-200/80 shadow-xs space-y-3 hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-black text-[#7D8176] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black flex items-center justify-center">
                  1
                </span>
                <span>Cours Référence T</span>
              </span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                T = {formatNumber(simT, 2)} $
              </span>
            </div>

            {/* Direct Equation with Editable Input */}
            <div className="bg-[#FAF8F3] p-3 rounded-xl border border-[#E8D8BE] space-y-2">
              <div className="flex items-center flex-wrap gap-2 text-xs font-mono font-bold text-[#192A24]">
                <span>T = Prix OZ ($) - </span>
                <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#D5C2A5] shadow-xs">
                  <input
                    type="text"
                    required
                    value={ounceDiscountUsd}
                    onChange={(e) => handleOunceDiscountChange(e.target.value)}
                    placeholder="30"
                    className="w-14 text-center font-black text-sm text-[#192A24] outline-hidden"
                  />
                  <span className="text-xs text-gray-500 font-bold">$</span>
                </div>
              </div>

              {/* Editable Formula String */}
              <div className="pt-1">
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5 flex items-center gap-1">
                  <Edit3 size={10} className="text-amber-600" />
                  <span>Formule de l'étape 1 (modifiable) :</span>
                </label>
                <input
                  type="text"
                  value={customFormulaT}
                  onChange={(e) => setCustomFormulaT(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs font-mono bg-white rounded-md border border-gray-200 text-[#192A24]"
                />
              </div>
            </div>

            <p className="text-[11px] text-[#7D8176]">
              Déduction standard sur le cours mondial de l'once d'or (ex: 30 $).
            </p>
          </div>

          {/* ÉTAPE 2: BASE OR BRUT 1 (24K) */}
          <div className="p-4 bg-white rounded-2xl border-2 border-blue-200/80 shadow-xs space-y-3 hover:border-blue-400 transition-colors">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-black flex items-center justify-center">
                  2
                </span>
                <span>Base Or Brut 1 (24K)</span>
              </span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {formatMoney(simOrBrut1)} F/g
              </span>
            </div>

            {/* Direct Equation with Editable Input */}
            <div className="bg-[#FAF8F3] p-3 rounded-xl border border-[#E8D8BE] space-y-2">
              <div className="flex items-center flex-wrap gap-2 text-xs font-mono font-bold text-[#192A24]">
                <span>L'or brut₁ = (T × Taux USD/XAF) / </span>
                <div className="inline-flex items-center bg-white px-2 py-1 rounded-lg border border-[#D5C2A5] shadow-xs">
                  <input
                    type="text"
                    required
                    value={troyOunceDivisor}
                    onChange={(e) => handleDivisorChange(e.target.value)}
                    placeholder="31.103477"
                    className="w-24 text-center font-black text-xs text-[#192A24] outline-hidden"
                  />
                </div>
              </div>

              {/* Editable Formula String */}
              <div className="pt-1">
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5 flex items-center gap-1">
                  <Edit3 size={10} className="text-blue-600" />
                  <span>Formule de l'étape 2 (modifiable) :</span>
                </label>
                <input
                  type="text"
                  value={customFormulaOrBrut1}
                  onChange={(e) => setCustomFormulaOrBrut1(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs font-mono bg-white rounded-md border border-gray-200 text-[#192A24]"
                />
              </div>
            </div>

            <p className="text-[11px] text-[#7D8176]">
              Conversion en FCFA par gramme d'or fin 24 carats ({draftConfig.troyOunceDivisor} g par once troy).
            </p>
          </div>

          {/* ÉTAPE 3: PRIX D'ACHAT OR BRUT */}
          <div className="p-4 bg-white rounded-2xl border-2 border-[#D39725] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black flex items-center justify-center">
                  3
                </span>
                <span>Prix d'Achat Or Brut</span>
              </span>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                22K : {formatMoney(calcBrutPrice(22))} F/g
              </span>
            </div>

            {/* Direct Equation with 2 Editable Inputs (Deduction & Discount %) */}
            <div className="bg-[#FAF8F3] p-3 rounded-xl border border-[#E8D8BE] space-y-2">
              <div className="text-xs font-mono font-bold text-[#192A24] space-y-1.5">
                <div className="flex items-center flex-wrap gap-1.5">
                  <span>Or brut = (((L'or brut₁ - </span>
                  <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#D5C2A5] shadow-xs">
                    <input
                      type="text"
                      required
                      value={brutDeductionXaf}
                      onChange={(e) => handleBrutChange(e.target.value, brutDiscountPercent)}
                      placeholder="4500"
                      className="w-16 text-center font-black text-sm text-[#D39725] outline-hidden"
                    />
                    <span className="text-xs text-gray-500 font-bold">F</span>
                  </div>
                  <span>) / 24) × Carat)</span>
                </div>

                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-red-700 font-black">- </span>
                  <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-red-300 shadow-xs">
                    <input
                      type="text"
                      required
                      value={brutDiscountPercent}
                      onChange={(e) => handleBrutChange(brutDeductionXaf, e.target.value)}
                      placeholder="6"
                      className="w-12 text-center font-black text-sm text-red-600 outline-hidden"
                    />
                    <span className="text-xs text-red-600 font-bold">%</span>
                  </div>
                  <span className="text-[11px] text-gray-500">(décote brute globale)</span>
                </div>
              </div>

              {/* Editable Formula String */}
              <div className="pt-1">
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5 flex items-center gap-1">
                  <Edit3 size={10} className="text-amber-600" />
                  <span>Formule de l'étape 3 (modifiable) :</span>
                </label>
                <input
                  type="text"
                  value={customFormulaOrBrut}
                  onChange={(e) => setCustomFormulaOrBrut(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs font-mono bg-white rounded-md border border-gray-200 text-[#192A24]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#7D8176]">
              <span>Formule officielle : déduction poussière {formatMoney(draftConfig.brutDeductionXaf)} F puis décote de -{draftConfig.brutDiscountPercent}%.</span>
            </div>
          </div>

          {/* ÉTAPE 4: PRIX D'ACHAT OR FONDU */}
          <div className="p-4 bg-white rounded-2xl border-2 border-emerald-200/80 shadow-xs space-y-3 hover:border-emerald-400 transition-colors">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black flex items-center justify-center">
                  4
                </span>
                <span>Prix d'Achat Or Fondu</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                22K : {formatMoney(calcFonduPrice(22))} F/g
              </span>
            </div>

            {/* Direct Equation with Editable Input */}
            <div className="bg-[#FAF8F3] p-3 rounded-xl border border-[#E8D8BE] space-y-2">
              <div className="flex items-center flex-wrap gap-2 text-xs font-mono font-bold text-[#192A24]">
                <span>Or fondu = ((L'or brut₁ - </span>
                <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#D5C2A5] shadow-xs">
                  <input
                    type="text"
                    required
                    value={fonduDeductionXaf}
                    onChange={(e) => handleFonduChange(e.target.value)}
                    placeholder="3500"
                    className="w-16 text-center font-black text-sm text-emerald-700 outline-hidden"
                  />
                  <span className="text-xs text-gray-500 font-bold">F</span>
                </div>
                <span>) / 24) × Carat</span>
              </div>

              {/* Editable Formula String */}
              <div className="pt-1">
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5 flex items-center gap-1">
                  <Edit3 size={10} className="text-emerald-600" />
                  <span>Formule de l'étape 4 (modifiable) :</span>
                </label>
                <input
                  type="text"
                  value={customFormulaOrFondu}
                  onChange={(e) => setCustomFormulaOrFondu(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs font-mono bg-white rounded-md border border-gray-200 text-[#192A24]"
                />
              </div>
            </div>

            <p className="text-[11px] text-[#7D8176]">
              Déduction sur lingots déjà fondus et homogénéisés (défaut : 3 500 FCFA).
            </p>
          </div>

          {/* ÉTAPE 5: PRIX D'ACHAT BIJOUX */}
          <div className="p-4 bg-white rounded-2xl border-2 border-purple-200/80 shadow-xs space-y-3 md:col-span-2 hover:border-purple-400 transition-colors">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-black flex items-center justify-center">
                  5
                </span>
                <span>Prix d'Achat Bijoux</span>
              </span>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                18K : {formatMoney(calcBijouxPrice(18))} F/g
              </span>
            </div>

            {/* Direct Equation with Mode Toggle and Editable Input */}
            <div className="bg-[#FAF8F3] p-3.5 rounded-xl border border-[#E8D8BE] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center flex-wrap gap-2 text-xs font-mono font-bold text-[#192A24]">
                  {bijouxFormulaMode === 'deductFromBrut1' ? (
                    <>
                      <span>Bijoux = ((L'or brut₁ - </span>
                      <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#D5C2A5] shadow-xs">
                        <input
                          type="text"
                          required
                          value={bijouxDeductionXaf}
                          onChange={(e) => handleBijouxChange(e.target.value, 'deductFromBrut1')}
                          placeholder="7000"
                          className="w-16 text-center font-black text-sm text-purple-700 outline-hidden"
                        />
                        <span className="text-xs text-gray-500 font-bold">F</span>
                      </div>
                      <span>) / 24) × Carat</span>
                    </>
                  ) : (
                    <>
                      <span>Bijoux = Or fondu - </span>
                      <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#D5C2A5] shadow-xs">
                        <input
                          type="text"
                          required
                          value={bijouxDeductionXaf}
                          onChange={(e) => handleBijouxChange(e.target.value, 'deductFromFondu')}
                          placeholder="7000"
                          className="w-16 text-center font-black text-sm text-purple-700 outline-hidden"
                        />
                        <span className="text-xs text-gray-500 font-bold">F</span>
                      </div>
                      <span>FCFA/g</span>
                    </>
                  )}
                </div>

                {/* Mode Selector */}
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => handleBijouxChange(bijouxDeductionXaf, 'deductFromFondu')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      bijouxFormulaMode === 'deductFromFondu'
                        ? 'bg-purple-100 text-purple-900 shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Fondu - Déduction (Manuscrit)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBijouxChange(bijouxDeductionXaf, 'deductFromBrut1')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      bijouxFormulaMode === 'deductFromBrut1'
                        ? 'bg-purple-100 text-purple-900 shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Sur Brut₁ / 24
                  </button>
                </div>
              </div>

              {/* Editable Formula String */}
              <div className="pt-1">
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5 flex items-center gap-1">
                  <Edit3 size={10} className="text-purple-600" />
                  <span>Formule de l'étape 5 (modifiable) :</span>
                </label>
                <input
                  type="text"
                  value={customFormulaBijoux}
                  onChange={(e) => setCustomFormulaBijoux(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs font-mono bg-white rounded-md border border-gray-200 text-[#192A24]"
                />
              </div>
            </div>

            <p className="text-[11px] text-[#7D8176]">
              Formule manuscrite : soustraction forfaitaire de {formatMoney(draftConfig.bijouxDeductionXaf)} FCFA sur le prix fondu (perte fonte, soudure, usure).
            </p>
          </div>
        </div>

        {/* Global save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-xs font-black bg-gray-600 hover:bg-gray-700 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
          >
            <Save size={16} />
            <span>Enregistrer la formule globale</span>
          </button>
        </div>

        {/* PARITÉ USD & MARCHÉ NOIR (TAUX PARALLÈLE) */}
        <div className="p-4 rounded-2xl bg-white border border-[#E8D8BE] shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-xs font-black text-[#192A24] uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 size={16} className="text-[#D39725]" />
              <span>Paramètres Taux de Change & Parité Parallèle</span>
            </span>
            <span className="text-[11px] font-bold text-gray-500">
              Premium marché noir : {computedPremium.toFixed(2)}% · Parallèle : {formatMoney(computedParallelRate)} F
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">
                Dollar International (Taux officiel USD/XAF)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={officialUsdRate}
                  onChange={(e) => setOfficialUsdRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold text-[#192A24] focus:outline-hidden focus:border-[#D39725]"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">FCFA</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">À renseigner depuis une source de taux réelle</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">
                Dollar Marché Noir (Conversion FCFA marché noir)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={blackMarketUsdRate}
                  onChange={(e) => setBlackMarketUsdRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold text-[#192A24] focus:outline-hidden focus:border-[#D39725]"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">FCFA</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">À renseigner depuis une source de taux réelle</p>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="useParallelCheckbox"
              checked={useParallelRateInPurchases}
              onChange={(e) => setUseParallelRateInPurchases(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="useParallelCheckbox" className="text-xs font-bold text-[#192A24] cursor-pointer">
              Appliquer par défaut le cours au Taux Parallèle lors des nouveaux achats d'or
            </label>
          </div>
        </div>

        {/* Simulation Table in Real Time */}
        <div className="p-4 rounded-2xl bg-white border border-[#E8D8BE] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <Calculator size={16} className="text-[#D39725]" />
              <span className="text-xs font-black text-[#192A24] uppercase tracking-wider">
                Simulation en Direct des Prix d'Achat par Carat
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-bold">Once test :</span>
              <div className="inline-flex items-center gap-1 bg-[#FAF8F3] px-2 py-1 rounded-lg border border-[#E8D8BE]">
                <input
                  type="text"
                  value={simOunce}
                  onChange={(e) => setSimOunce(e.target.value)}
                  className="w-20 text-xs font-mono font-bold text-center outline-hidden"
                />
                <span className="text-[10px] text-gray-400">$</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F3] border-b border-gray-200 text-[#192A24]">
                <tr>
                  <th className="p-2.5 font-black">Carat</th>
                  <th className="p-2.5 font-black">Pureté</th>
                  <th className="p-2.5 text-right font-black text-amber-900">
                    Or Brut (Officiel / Parallèle)
                  </th>
                  <th className="p-2.5 text-right font-black text-emerald-900">
                    Or Fondu
                  </th>
                  <th className="p-2.5 text-right font-black text-purple-900">
                    Bijoux
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold font-mono">
                {caratsToSimulate.map((k) => {
                  const brutRes = computeComptoirGoldPurchasePrice({
                    pricePerTroyOunceUsd: simOunceNum,
                    usdToXafRate: parsedOfficialRate,
                    karat: k,
                    category: 'Or brut',
                    config: draftConfig,
                  });
                  const fonduRes = computeComptoirGoldPurchasePrice({
                    pricePerTroyOunceUsd: simOunceNum,
                    usdToXafRate: parsedOfficialRate,
                    karat: k,
                    category: 'Or fondu',
                    config: draftConfig,
                  });
                  const bijouxRes = computeComptoirGoldPurchasePrice({
                    pricePerTroyOunceUsd: simOunceNum,
                    usdToXafRate: parsedOfficialRate,
                    karat: k,
                    category: 'Bijoux',
                    config: draftConfig,
                  });

                  return (
                    <tr key={k} className="hover:bg-amber-50/30">
                      <td className="p-2.5 font-bold text-[#192A24] font-sans">{k}K</td>
                      <td className="p-2.5 text-gray-500 text-[11px]">
                        {((k / 24) * 100).toFixed(1)}%
                      </td>
                      <td className="p-2.5 text-right font-bold text-amber-900">
                        {formatMoney(brutRes.pricePerGram)} F{' '}
                        <span className="text-emerald-700 font-normal">
                          / {formatMoney(brutRes.parallelPricePerGram)} F
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-emerald-900">
                        {formatMoney(fonduRes.pricePerGram)} F{' '}
                        <span className="text-emerald-700 font-normal">
                          / {formatMoney(fonduRes.parallelPricePerGram)} F
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-bold text-purple-900">
                        {formatMoney(bijouxRes.pricePerGram)} F{' '}
                        <span className="text-emerald-700 font-normal">
                          / {formatMoney(bijouxRes.parallelPricePerGram)} F
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal bottom actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#E8D8BE]">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-red-700 hover:bg-red-50 border border-gray-200 transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Rétablir les formules par défaut</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-black bg-[#D39725] hover:bg-[#c2871b] text-white shadow-md transition-all cursor-pointer"
            >
              <Save size={15} />
              <span>Enregistrer la formule globale</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
