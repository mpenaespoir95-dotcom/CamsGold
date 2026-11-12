import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Coins,
  ArrowLeftRight,
  Plus,
  Minus,
  Sliders,
  AlertCircle,
  CheckCircle2,
  Scale,
  TrendingUp,
  Banknote,
  Building2,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { AppPanel, Modal, PageHeading, SectionHeading } from '../common/UIComponents';
import { formatNumber, formatDateTime, formatMoney } from '../../utils/goldMath';
import { GOLD_STOCK_CATEGORIES, GoldCategory, ExchangeRateSnapshot } from '../../types';
import { ExchangeRateService } from '../../services/exchangeRateService';

type StockScreenMode = 'all' | 'gold' | 'currency';

export const StockScreen: React.FC<{ mode?: StockScreenMode }> = ({ mode = 'all' }) => {
  const store = useAppStore();
  const [activeTab, setActiveTab] = useState<'gold' | 'currency'>('gold');
  const currentTab = mode === 'currency' ? 'currency' : mode === 'gold' ? 'gold' : activeTab;

  // Rates for currency valuation & default pricing
  const [ratesSnapshot, setRatesSnapshot] = useState<ExchangeRateSnapshot | null>(null);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  // Gold Adjustment Modal
  const [showGoldAdjModal, setShowGoldAdjModal] = useState(false);
  const [goldKarat, setGoldKarat] = useState('24K');
  const [goldCategory, setGoldCategory] = useState<GoldCategory>('Or brut');
  const [goldWeightGrams, setGoldWeightGrams] = useState('');
  const [goldReason, setGoldReason] = useState('');
  const [goldError, setGoldError] = useState<string | null>(null);

  // Currency Adjustment Modal (Inventaire)
  const [showCurAdjModal, setShowCurAdjModal] = useState(false);
  const [curCurrency, setCurCurrency] = useState('USD');
  const [curAmount, setCurAmount] = useState('');
  const [curIsAddition, setCurIsAddition] = useState(true);
  const [curReason, setCurReason] = useState('');
  const [curError, setCurError] = useState<string | null>(null);

  // Currency BUY Modal (Achat de devise)
  const [showBuyCurModal, setShowBuyCurModal] = useState(false);
  const [buyCurrencyCode, setBuyCurrencyCode] = useState('USD');
  const [buyAmount, setBuyAmount] = useState('');
  const [buyRate, setBuyRate] = useState('605');
  const [buyPaymentAccount, setBuyPaymentAccount] = useState('Caisse (espèces)');
  const [buyContact, setBuyContact] = useState('');
  const [buyNotes, setBuyNotes] = useState('');
  const [buyError, setBuyError] = useState<string | null>(null);

  // Currency SELL Modal (Vente de devise)
  const [showSellCurModal, setShowSellCurModal] = useState(false);
  const [sellCurrencyCode, setSellCurrencyCode] = useState('USD');
  const [sellAmount, setSellAmount] = useState('');
  const [sellRate, setSellRate] = useState('625');
  const [sellReceiptAccount, setSellReceiptAccount] = useState('Caisse (espèces)');
  const [sellContact, setSellContact] = useState('');
  const [sellNotes, setSellNotes] = useState('');
  const [sellError, setSellError] = useState<string | null>(null);

  // Success notifications
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Currency movements filter
  const [curMovFilter, setCurMovFilter] = useState<'ALL' | 'ACHAT' | 'VENTE' | 'AJUSTEMENT'>('ALL');

  const standardKarats = ['24K', '22K', '21K', '18K', '14K', '9K'];
  const currencyList = ['USD', 'EUR', 'AED', 'CNY', 'GBP', 'XOF', 'CAD', 'CHF'];

  const loadExchangeRates = async () => {
    setIsRefreshingRates(true);
    try {
      const snap = await ExchangeRateService.fetchRates();
      setRatesSnapshot(snap);
    } catch (e) {
      console.warn('Failed to load exchange rates:', e);
    } finally {
      setIsRefreshingRates(false);
    }
  };

  useEffect(() => {
    loadExchangeRates();
  }, []);

  const getLiveRateFor = (code: string): number => {
    if (code === 'XAF' || code === 'XOF') return 1;
    if (ratesSnapshot) {
      const r = ExchangeRateService.getRate(ratesSnapshot, code, 'XAF');
      if (r !== null && r > 0) return r;
    }
    return 0;
  };

  // Open Buy modal with pre-filled rate
  const openBuyModal = (code: string = 'USD') => {
    setBuyCurrencyCode(code);
    const live = getLiveRateFor(code);
    setBuyRate(live > 0 ? Math.round(live).toString() : '');
    setBuyAmount('');
    setBuyContact('');
    setBuyNotes('');
    setBuyError(null);
    setShowBuyCurModal(true);
  };

  // Open Sell modal with pre-filled rate (+ parallel spread)
  const openSellModal = (code: string = 'USD') => {
    setSellCurrencyCode(code);
    const live = getLiveRateFor(code);
    const defaultSellingRate = Math.round(live * 1.025); // +2.5% marge de change
    setSellRate(live > 0 ? defaultSellingRate.toString() : '');
    setSellAmount('');
    setSellContact('');
    setSellNotes('');
    setSellError(null);
    setShowSellCurModal(true);
  };

  // Handlers
  const handleAdjustGold = (e: React.FormEvent) => {
    e.preventDefault();
    setGoldError(null);
    const weight = parseFloat(goldWeightGrams.replace(',', '.') || '0');
    if (!weight) {
      setGoldError('Veuillez spécifier un poids non nul.');
      return;
    }
    if (!goldReason.trim()) {
      setGoldError('Le motif est requis.');
      return;
    }
    try {
      store.adjustGoldStock({
        karat: goldKarat,
        category: goldCategory,
        weightGrams: weight,
        reason: goldReason.trim(),
      });
      setShowGoldAdjModal(false);
      setGoldWeightGrams('');
      setGoldReason('');
      setSuccessBanner(`Ajustement d'or enregistré avec succès (${weight > 0 ? '+' : ''}${weight} g).`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: unknown) {
      setGoldError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleAdjustCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    setCurError(null);
    const amount = parseFloat(curAmount.replace(',', '.') || '0');
    if (amount <= 0) {
      setCurError('Le montant doit être positif.');
      return;
    }
    if (!curReason.trim()) {
      setCurError('Le motif est requis.');
      return;
    }
    try {
      store.adjustCurrencyStock({
        currency: curCurrency,
        amount,
        isAddition: curIsAddition,
        reason: curReason.trim(),
      });
      setShowCurAdjModal(false);
      setCurAmount('');
      setCurReason('');
      setSuccessBanner(`Stock de ${curCurrency} ajusté avec succès (${curIsAddition ? '+' : '-'}${amount} ${curCurrency}).`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: unknown) {
      setCurError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleExecuteBuyCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    setBuyError(null);
    const amountNum = parseFloat(buyAmount.replace(',', '.') || '0');
    const rateNum = parseFloat(buyRate.replace(',', '.') || '0');

    if (amountNum <= 0) {
      setBuyError('Le montant en devises doit être strictement positif.');
      return;
    }
    if (rateNum <= 0) {
      setBuyError('Le cours d’achat doit être strictement positif.');
      return;
    }

    const totalXaf = Math.round(amountNum * rateNum);
    const payBal = store.bankBalances[buyPaymentAccount] ?? 0;
    if (payBal < totalXaf) {
      setBuyError(
        `Solde insuffisant sur ${buyPaymentAccount} (${formatMoney(payBal)} FCFA disponible) pour décaisser ${formatMoney(totalXaf)} FCFA.`
      );
      return;
    }

    try {
      store.buyCurrency({
        currency: buyCurrencyCode,
        amount: amountNum,
        rate: rateNum,
        totalXaf,
        paymentAccount: buyPaymentAccount,
        contactName: buyContact.trim() || undefined,
        notes: buyNotes.trim() || undefined,
      });

      setShowBuyCurModal(false);
      setSuccessBanner(
        `Achat de devises validé : +${formatNumber(amountNum, 2)} ${buyCurrencyCode} entrés au coffre (-${formatMoney(totalXaf)} FCFA depuis ${buyPaymentAccount}).`
      );
      setTimeout(() => setSuccessBanner(null), 6000);
    } catch (err: unknown) {
      setBuyError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleExecuteSellCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    setSellError(null);
    const amountNum = parseFloat(sellAmount.replace(',', '.') || '0');
    const rateNum = parseFloat(sellRate.replace(',', '.') || '0');

    if (amountNum <= 0) {
      setSellError('Le montant en devises doit être strictement positif.');
      return;
    }
    if (rateNum <= 0) {
      setSellError('Le cours de vente doit être strictement positif.');
      return;
    }

    const currentBal = store.currencyBalances[sellCurrencyCode] ?? 0;
    if (currentBal < amountNum) {
      setSellError(
        `Stock insuffisant en ${sellCurrencyCode} au coffre (${formatNumber(currentBal, 2)} disponible) pour vendre ${formatNumber(amountNum, 2)} ${sellCurrencyCode}.`
      );
      return;
    }

    const totalXaf = Math.round(amountNum * rateNum);

    try {
      store.sellCurrency({
        currency: sellCurrencyCode,
        amount: amountNum,
        rate: rateNum,
        totalXaf,
        receiptAccount: sellReceiptAccount,
        contactName: sellContact.trim() || undefined,
        notes: sellNotes.trim() || undefined,
      });

      setShowSellCurModal(false);
      setSuccessBanner(
        `Vente de devises validée : -${formatNumber(amountNum, 2)} ${sellCurrencyCode} sortis du coffre (+${formatMoney(totalXaf)} FCFA encaissés en ${sellReceiptAccount}).`
      );
      setTimeout(() => setSuccessBanner(null), 6000);
    } catch (err: unknown) {
      setSellError(err instanceof Error ? err.message : String(err));
    }
  };

  // Calculations for Currency Stock overview
  const totalGoldWeightAll = standardKarats.reduce(
    (sum, k) => sum + store.stockWeightForKarat(k),
    0
  );
  const goldWeightByCategory = standardKarats.reduce<
    Record<'Or brut' | 'Or fondu' | 'Bijoux', number>
  >(
    (totals, karat) => {
      const karatMovements = store.stockMovements.filter((movement) => movement.karat === karat);
      totals['Or brut'] += Math.max(
        0,
        karatMovements
          .filter((movement) => movement.category !== 'Or fondu' && movement.category !== 'Bijoux')
          .reduce((sum, movement) => sum + movement.weightGrams, 0)
      );
      totals['Or fondu'] += Math.max(
        0,
        karatMovements
          .filter((movement) => movement.category === 'Or fondu')
          .reduce((sum, movement) => sum + movement.weightGrams, 0)
      );
      totals.Bijoux += Math.max(
        0,
        karatMovements
          .filter((movement) => movement.category === 'Bijoux')
          .reduce((sum, movement) => sum + movement.weightGrams, 0)
      );
      return totals;
    },
    { 'Or brut': 0, 'Or fondu': 0, Bijoux: 0 }
  );

  const estimatedTotalSafeValueXaf = Object.entries(store.currencyBalances).reduce(
    (acc, [cur, bal]) => {
      const rate = getLiveRateFor(cur);
      return acc + (bal > 0 ? bal * rate : 0);
    },
    0
  );
  const hasUnpricedCurrency = Object.entries(store.currencyBalances).some(
    ([currency, balance]) => balance > 0 && getLiveRateFor(currency) === 0
  );

  const totalCurPurchasedCount = store.currencyStockMovements.filter(
    (movement) => movement.type === 'Achat devise'
  ).length;

  const totalCurSoldCount = store.currencyStockMovements.filter(
    (movement) => movement.type === 'Vente devise'
  ).length;

  const currencyMovementTotals = (movementType: 'achat' | 'vente') => {
    const movementName = movementType === 'achat' ? 'Achat devise' : 'Vente devise';
    const movements = store.currencyStockMovements.filter(
      (movement) => movement.type === movementName
    );

    return {
      totalXaf: movements.reduce((total, movement) => total + (movement.totalXaf ?? 0), 0),
      amountsByCurrency: movements.reduce<Record<string, number>>((totals, movement) => {
        totals[movement.currency] = (totals[movement.currency] ?? 0) + Math.abs(movement.amount);
        return totals;
      }, {}),
    };
  };

  const currencyPurchaseTotals = currencyMovementTotals('achat');
  const currencySaleTotals = currencyMovementTotals('vente');

  const formatCurrencyAmounts = (amountsByCurrency: Record<string, number>) =>
    Object.entries(amountsByCurrency)
      .filter(([, amount]) => amount > 0)
      .map(([currency, amount]) => `${formatNumber(amount, 2)} ${currency}`)
      .join(' · ') || 'Aucun mouvement';

  // Filtered movements
  const filteredCurrencyMovements = store.currencyStockMovements.filter((mov) => {
    const tLower = mov.type.toLowerCase();
    if (curMovFilter === 'ACHAT') return mov.type === 'Achat devise';
    if (curMovFilter === 'VENTE') return mov.type === 'Vente devise';
    if (curMovFilter === 'AJUSTEMENT') return tLower.includes('ajustement') || tLower.includes('change');
    return true;
  });
  const getCurrencyFlag = (code: string) => {
    switch (code) {
      case 'USD':
        return '🇺🇸';
      case 'EUR':
        return '🇪🇺';
      case 'AED':
        return '🇦🇪';
      case 'CNY':
        return '🇨🇳';
      case 'GBP':
        return '🇬🇧';
      case 'XAF':
      case 'XOF':
        return '🌍';
      case 'CAD':
        return '🇨🇦';
      case 'CHF':
        return '🇨🇭';
      default:
        return '🪙';
    }
  };

  return (
    <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-6">
      <PageHeading
        eyebrow={mode === 'currency' ? 'Comptoir · Devises' : 'Inventaire & Coffre-Fort'}
        title={
          mode === 'currency'
            ? 'Gestion des devises'
            : mode === 'gold'
              ? "Gestion du stock d’or"
              : 'Gestion des Stocks'
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {currentTab === 'currency' ? (
              <>
                <button
                  onClick={() => openBuyModal('USD')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs transition-colors"
                >
                  <ArrowDownLeft size={16} />
                  <span>+ Achat devise</span>
                </button>
                <button
                  onClick={() => openSellModal('USD')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#192A24] hover:bg-[#253D34] text-white text-xs font-bold cursor-pointer shadow-xs transition-colors"
                >
                  <ArrowUpRight size={16} />
                  <span>- Vente de devise</span>
                </button>
                <button
                  onClick={() => setShowCurAdjModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold cursor-pointer transition-colors"
                  title="Ajustement d'inventaire"
                >
                  <Sliders size={15} />
                  <span>Ajuster</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowGoldAdjModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  <Sliders size={15} />
                  <span>Ajuster stock d'or</span>
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 text-[11px] font-bold"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Top Tabs */}
      {mode === 'all' && (
        <div className="flex items-center gap-2 border-b border-[#E8D8BE] pb-2">
        <button
          onClick={() => setActiveTab('gold')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentTab === 'gold'
              ? 'bg-[#192A24] text-white shadow-xs'
              : 'text-[#7D8176] hover:bg-[#F6F0E5]'
          }`}
        >
          <Coins size={16} />
          <span>Stock Métal Précieux (Or)</span>
        </button>

        <button
          onClick={() => setActiveTab('currency')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentTab === 'currency'
              ? 'bg-[#192A24] text-white shadow-xs'
              : 'text-[#7D8176] hover:bg-[#F6F0E5]'
          }`}
        >
          <Boxes size={16} />
          <span>Stock Devises Physiques (Achat & Vente)</span>
        </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* Tab 1: Gold Stock                                         */}
      {/* ========================================================= */}
      {(mode === 'all' || mode === 'gold') && currentTab === 'gold' && (
        <div className="space-y-6">
          {/* Total Gold Banner */}
          <AppPanel className="bg-gradient-to-r from-[#FAF8F3] to-[#F6F0E5] border-[#E8D8BE]">
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#D39725]/20 text-[#D39725] flex items-center justify-center">
                    <Scale size={24} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-[#7D8176] uppercase tracking-wider">
                      Poids total d'or en coffre
                    </span>
                    <div className="text-3xl font-black text-[#192A24]">
                      {formatNumber(totalGoldWeightAll, 2)} <span className="text-lg">grammes</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-[#7D8176]">
                  Stocks actualisés automatiquement après chaque achat et vente
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#E8D8BE] pt-4">
                {([
                  ['Or brut', goldWeightByCategory['Or brut']],
                  ['Or fondu', goldWeightByCategory['Or fondu']],
                  ['Bijoux', goldWeightByCategory.Bijoux],
                ] as const).map(([category, weight]) => (
                  <div key={category} className="rounded-xl bg-white/70 px-4 py-3">
                    <span className="text-[11px] font-bold text-[#7D8176] uppercase tracking-wider">
                      {category}
                    </span>
                    <div className="text-xl font-black text-[#192A24]">
                      {formatNumber(Math.max(0, weight), 2)} <span className="text-sm">grammes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AppPanel>

          {/* Karat Breakdown Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {standardKarats.map((k) => {
              const weightKarat = store.stockWeightForKarat(k);
              return (
                <AppPanel key={k} padding="p-5" className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-base font-black text-[#D39725]">{k}</span>
                    <span className="text-base font-extrabold text-[#192A24]">
                      {formatNumber(weightKarat, 2)} g
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#7D8176]">
                    {GOLD_STOCK_CATEGORIES.map((cat) => {
                      const catWeight = store.stockWeightForKarat(k, cat);
                      return (
                        <div key={cat} className="flex justify-between items-center">
                          <span>{cat}</span>
                          <span className="font-bold text-[#192A24]">
                            {formatNumber(catWeight, 1)} g
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </AppPanel>
              );
            })}
          </div>

          {/* Movement history */}
          {store.stockMovements.length > 0 && (
            <AppPanel className="space-y-4">
              <SectionHeading title="Mouvements et corrections de stock d'or" />
              <div className="divide-y divide-gray-100">
                {store.stockMovements.map((mov) => (
                  <div key={mov.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#192A24]">{mov.label}</div>
                      <div className="text-[11px] text-[#7D8176]">
                        {mov.karat} · {mov.category} · {formatDateTime(mov.date)}
                        {mov.reason && ` · Motif : ${mov.reason}`}
                      </div>
                    </div>
                    <span
                      className={`font-black ${
                        mov.weightGrams >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {mov.weightGrams >= 0 ? '+' : ''}
                      {formatNumber(mov.weightGrams, 2)} g
                    </span>
                  </div>
                ))}
              </div>
            </AppPanel>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* Tab 2: Currency Stock (Avec Achat Devise & Vente Devise)  */}
      {/* ========================================================= */}
      {(mode === 'all' || mode === 'currency') && currentTab === 'currency' && (
        <div className="space-y-6">
          {/* Top Banner KPI: Devises au coffre */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <AppPanel className="bg-gradient-to-br from-[#192A24] to-[#253D34] text-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/10 text-amber-400 flex items-center justify-center">
                  <Wallet size={22} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-300 uppercase tracking-wider block font-bold">
                    Valeur estimée au coffre
                  </span>
                  <div className="text-xl font-black text-amber-300">
                    {hasUnpricedCurrency
                      ? 'Cours indisponible'
                      : `≈ ${formatMoney(Math.round(estimatedTotalSafeValueXaf))} FCFA`}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-gray-300 mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                <span>Calculé aux cours du marché</span>
                <button
                  onClick={loadExchangeRates}
                  className="flex items-center gap-1 text-amber-300 hover:text-white cursor-pointer"
                >
                  <RefreshCw size={11} className={isRefreshingRates ? 'animate-spin' : ''} />
                  <span>Actualiser</span>
                </button>
              </div>
            </AppPanel>

            <AppPanel className="bg-emerald-50/60 border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Total des achats
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <ArrowDownLeft size={16} />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                {formatMoney(currencyPurchaseTotals.totalXaf)} FCFA
              </div>
              <div className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                {totalCurPurchasedCount} opération(s) · {formatCurrencyAmounts(currencyPurchaseTotals.amountsByCurrency)}
              </div>
            </AppPanel>

            <AppPanel className="bg-amber-50/60 border-amber-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  Total des ventes
                </span>
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                  <ArrowUpRight size={16} />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-950 mt-1">
                {formatMoney(currencySaleTotals.totalXaf)} FCFA
              </div>
              <div className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                {totalCurSoldCount} opération(s) · {formatCurrencyAmounts(currencySaleTotals.amountsByCurrency)}
              </div>
            </AppPanel>
          </div>

          {/* Currency Balances Grid with Fast Buy/Sell Buttons */}
          <AppPanel className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8D8BE] pb-3">
              <div>
                <SectionHeading title="Soldes physiques de devises au coffre-fort" />
                <p className="text-xs text-[#7D8176]">
                  Gérez l'approvisionnement (Achat) et la délivrance (Vente) directement par devise.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openBuyModal('USD')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <ArrowDownLeft size={14} />
                  <span>Acheter devise</span>
                </button>
                <button
                  onClick={() => openSellModal('USD')}
                  className="px-3 py-1.5 rounded-xl bg-[#192A24] hover:bg-[#253D34] text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <ArrowUpRight size={14} />
                  <span>Vendre devise</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {Object.entries(store.currencyBalances).map(([cur, bal]) => {
                const liveRate = getLiveRateFor(cur);
                const estimatedXaf = Math.round(bal * liveRate);
                return (
                  <div
                    key={cur}
                    className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8D8BE] hover:border-[#D39725]/60 transition-all space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getCurrencyFlag(cur)}</span>
                        <div>
                          <span className="text-sm font-black text-[#192A24] uppercase tracking-wide">
                            {cur}
                          </span>
                          <span className="text-[10px] text-gray-500 block">
                            {liveRate > 0
                              ? `1 ${cur} ≈ ${formatNumber(liveRate, 1)} FCFA`
                              : 'Cours indisponible'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-mono">
                        {cur}
                      </span>
                    </div>

                    <div className="pt-1">
                      <div className="text-xl font-black text-[#192A24] font-mono">
                        {formatNumber(bal, 2)}
                      </div>
                      <div className="text-[11px] text-gray-500 font-semibold">
                        Contre-valeur :{' '}
                        <strong className="text-emerald-800">
                          {liveRate > 0 ? `${formatMoney(estimatedXaf)} FCFA` : 'Cours indisponible'}
                        </strong>
                      </div>
                    </div>

                    {/* Quick action buttons per currency */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-gray-200/80">
                      <button
                        onClick={() => openBuyModal(cur)}
                        className="py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black cursor-pointer transition-colors flex items-center justify-center gap-1"
                        title={`Acheter du ${cur}`}
                      >
                        <Plus size={13} strokeWidth={3} />
                        <span>Achat</span>
                      </button>
                      <button
                        onClick={() => openSellModal(cur)}
                        className="py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black cursor-pointer transition-colors flex items-center justify-center gap-1"
                        title={`Vendre du ${cur}`}
                      >
                        <Minus size={13} strokeWidth={3} />
                        <span>Vente</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </AppPanel>

          {/* Currency Movements Table (Achats, Ventes, Ajustements) */}
          <AppPanel className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <SectionHeading title="Journal des mouvements de devises" />
                <span className="text-xs text-gray-500">
                  Historique complet des achats, ventes et approvisionnements du coffre
                </span>
              </div>

              {/* Movement Type Filter */}
              <div className="flex items-center gap-1 bg-[#FAF8F3] p-1 rounded-xl border border-[#E8D8BE]">
                {(
                  [
                    { id: 'ALL', label: 'Tous' },
                    { id: 'ACHAT', label: '🟢 Achats' },
                    { id: 'VENTE', label: '🔵 Ventes' },
                    { id: 'AJUSTEMENT', label: '⚙️ Ajustements' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCurMovFilter(f.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      curMovFilter === f.id
                        ? 'bg-[#192A24] text-white shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredCurrencyMovements.length === 0 ? (
              <p className="text-xs text-gray-500 py-8 text-center">
                Aucun mouvement de devise ne correspond à ce filtre.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F3] border-b border-[#E8D8BE] text-[11px] font-bold text-[#7D8176] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Devise & Montant</th>
                      <th className="py-2.5 px-3">Cours</th>
                      <th className="py-2.5 px-3">Contre-valeur FCFA</th>
                      <th className="py-2.5 px-3">Règlement / Compte</th>
                      <th className="py-2.5 px-3">Client / Tiers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCurrencyMovements.map((mov) => {
                      const isBuy = mov.type.toLowerCase().includes('achat') || mov.amount > 0;
                      const isSell = mov.type === 'Vente devise';
                      return (
                        <tr key={mov.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">
                            {formatDateTime(mov.date)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isBuy
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : isSell
                                  ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {isBuy && <ArrowDownLeft size={12} />}
                              {isSell && <ArrowUpRight size={12} />}
                              <span>{mov.type}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`font-mono font-black text-sm ${
                                mov.amount >= 0 ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              {mov.amount >= 0 ? '+' : ''}
                              {formatNumber(mov.amount, 2)} {mov.currency}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-gray-700">
                            {mov.rate ? `${formatNumber(mov.rate, 2)} FCFA` : '—'}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-900">
                            {mov.totalXaf ? `${formatMoney(mov.totalXaf)} FCFA` : '—'}
                          </td>
                          <td className="py-3 px-3 text-gray-600">
                            {mov.account || 'Coffre physique'}
                          </td>
                          <td className="py-3 px-3 text-gray-700 font-semibold">
                            {mov.contact || mov.label || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AppPanel>
        </div>
      )}

      {/* ========================================================= */}
      {/* Modal 1: ACHAT DE DEVISE (Achat Devise)                   */}
      {/* ========================================================= */}
      <Modal
        isOpen={showBuyCurModal}
        onClose={() => setShowBuyCurModal(false)}
        title="Achat de devises · Entrée au coffre-fort"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleExecuteBuyCurrency} className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <div className="font-bold flex items-center gap-1.5">
              <ArrowDownLeft size={16} className="text-emerald-600" />
              <span>Achat de devises étrangères auprès d'un client ou fournisseur</span>
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">
              Les devises sont ajoutées au coffre physique et le montant en FCFA est décaissé de la caisse ou banque.
            </div>
          </div>

          {buyError && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{buyError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Devise achetée *</label>
              <select
                value={buyCurrencyCode}
                onChange={(e) => {
                  setBuyCurrencyCode(e.target.value);
                  const r = getLiveRateFor(e.target.value);
                  setBuyRate(r > 0 ? Math.round(r).toString() : '');
                }}
                className="w-full px-3 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-black text-[#192A24]"
              >
                {currencyList.map((c) => (
                  <option key={c} value={c}>
                    {getCurrencyFlag(c)} {c} (Solde : {formatNumber(store.currencyBalances[c] || 0, 2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">
                Montant en {buyCurrencyCode} *
              </label>
              <input
                type="text"
                required
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                placeholder="ex: 1000"
                className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-400 ring-2 ring-emerald-300/30 text-sm font-black font-mono"
              />
            </div>
          </div>

          {/* Quick presets for Buy amount */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-gray-500 mr-1">Raccourcis :</span>
            {['100', '500', '1000', '2500', '5000', '10000'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setBuyAmount(preset)}
                className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-emerald-100 text-gray-700 text-[10px] font-bold cursor-pointer transition-colors"
              >
                {preset} {buyCurrencyCode}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">
                Cours d'achat (FCFA / {buyCurrencyCode}) *
              </label>
              <input
                type="text"
                required
                value={buyRate}
                onChange={(e) => setBuyRate(e.target.value)}
                placeholder="ex: 605"
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-black font-mono text-[#192A24]"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                {getLiveRateFor(buyCurrencyCode) > 0
                  ? `Cours réel : ≈ ${formatNumber(getLiveRateFor(buyCurrencyCode), 1)} FCFA`
                  : 'Cours indisponible'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">
                Compte de décaissement FCFA *
              </label>
              <select
                value={buyPaymentAccount}
                onChange={(e) => setBuyPaymentAccount(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold text-[#192A24]"
              >
                {Object.entries(store.bankBalances).map(([acc, bal]) => (
                  <option key={acc} value={acc}>
                    {acc} ({formatMoney(bal)} FCFA)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">
              Client / Vendeur de devises (Optionnel)
            </label>
            <select
              value={buyContact}
              onChange={(e) => setBuyContact(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
            >
              <option value="">Client comptoir de passage</option>
              {store.contacts.map((c) => (
                <option key={c.reference} value={c.name}>
                  {c.name} ({c.city}) {c.roles.length ? `· [${c.roles.join(', ')}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Financial Summary Card */}
          {parseFloat(buyAmount.replace(',', '.') || '0') > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-300 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-emerald-950 font-bold">
                <span>Devises à ajouter au coffre :</span>
                <span className="font-mono text-base font-black text-emerald-700">
                  +{formatNumber(parseFloat(buyAmount.replace(',', '.') || '0'), 2)} {buyCurrencyCode}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-700 font-bold">
                <span>Total FCFA à décaisser :</span>
                <span className="font-mono text-base font-black text-red-700">
                  -{formatMoney(
                    Math.round(
                      parseFloat(buyAmount.replace(',', '.') || '0') *
                        parseFloat(buyRate.replace(',', '.') || '0')
                    )
                  )}{' '}
                  FCFA
                </span>
              </div>
              <div className="text-[11px] text-gray-500 pt-1 border-t border-emerald-200">
                Débité du compte : <strong>{buyPaymentAccount}</strong>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2.5 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowBuyCurModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition-colors"
            >
              Valider l'achat de devises
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* Modal 2: VENTE DE DEVISE (Vente de devise)                */}
      {/* ========================================================= */}
      <Modal
        isOpen={showSellCurModal}
        onClose={() => setShowSellCurModal(false)}
        title="Vente de devises · Sortie du coffre-fort"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleExecuteSellCurrency} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <div className="font-bold flex items-center gap-1.5">
              <ArrowUpRight size={16} className="text-amber-600" />
              <span>Vente de devises étrangères à un client contre FCFA</span>
            </div>
            <div className="text-[11px] text-amber-700 mt-1">
              Les devises sont retirées du coffre et le règlement en FCFA est encaissé directement en caisse ou en banque.
            </div>
          </div>

          {sellError && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{sellError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Devise vendue *</label>
              <select
                value={sellCurrencyCode}
                onChange={(e) => {
                  setSellCurrencyCode(e.target.value);
                  const r = getLiveRateFor(e.target.value);
                    setSellRate(r > 0 ? Math.round(r * 1.025).toString() : '');
                }}
                className="w-full px-3 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-black text-[#192A24]"
              >
                {currencyList.map((c) => (
                  <option key={c} value={c}>
                    {getCurrencyFlag(c)} {c} (Dispo : {formatNumber(store.currencyBalances[c] || 0, 2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">
                Montant en {sellCurrencyCode} *
              </label>
              <input
                type="text"
                required
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                placeholder="ex: 500"
                className="w-full px-3 py-2 bg-white rounded-xl border border-amber-400 ring-2 ring-amber-300/30 text-sm font-black font-mono"
              />
            </div>
          </div>

          {/* Quick presets for Sell amount and All available stock */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-gray-500 mr-1">Raccourcis :</span>
            {['100', '500', '1000', '2000'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSellAmount(preset)}
                className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-amber-100 text-gray-700 text-[10px] font-bold cursor-pointer transition-colors"
              >
                {preset} {sellCurrencyCode}
              </button>
            ))}
            {(store.currencyBalances[sellCurrencyCode] || 0) > 0 && (
              <button
                type="button"
                onClick={() =>
                  setSellAmount(String(store.currencyBalances[sellCurrencyCode] || 0))
                }
                className="px-2 py-0.5 rounded-lg bg-[#D39725] text-white text-[10px] font-black cursor-pointer hover:bg-[#c2871b] transition-colors"
              >
                Tout le stock ({formatNumber(store.currencyBalances[sellCurrencyCode] || 0, 2)})
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">
                Cours de vente (FCFA / {sellCurrencyCode}) *
              </label>
              <input
                type="text"
                required
                value={sellRate}
                onChange={(e) => setSellRate(e.target.value)}
                placeholder="ex: 625"
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-black font-mono text-[#192A24]"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                {getLiveRateFor(sellCurrencyCode) > 0
                  ? `Cours indicatif : ≈ ${formatNumber(getLiveRateFor(sellCurrencyCode), 1)} FCFA`
                  : 'Cours indisponible'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">
                Compte d'encaissement FCFA *
              </label>
              <select
                value={sellReceiptAccount}
                onChange={(e) => setSellReceiptAccount(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold text-[#192A24]"
              >
                {Object.entries(store.bankBalances).map(([acc, bal]) => (
                  <option key={acc} value={acc}>
                    {acc} ({formatMoney(bal)} FCFA)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">
              Client acheteur de devises (Optionnel)
            </label>
            <select
              value={sellContact}
              onChange={(e) => setSellContact(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
            >
              <option value="">Client comptoir de passage</option>
              {store.contacts.map((c) => (
                <option key={c.reference} value={c.name}>
                  {c.name} ({c.city}) {c.roles.length ? `· [${c.roles.join(', ')}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Financial Summary Card */}
          {parseFloat(sellAmount.replace(',', '.') || '0') > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-300 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-amber-950 font-bold">
                <span>Devises à délivrer au client :</span>
                <span className="font-mono text-base font-black text-red-700">
                  -{formatNumber(parseFloat(sellAmount.replace(',', '.') || '0'), 2)} {sellCurrencyCode}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-700 font-bold">
                <span>Total FCFA à encaisser :</span>
                <span className="font-mono text-base font-black text-emerald-700">
                  +{formatMoney(
                    Math.round(
                      parseFloat(sellAmount.replace(',', '.') || '0') *
                        parseFloat(sellRate.replace(',', '.') || '0')
                    )
                  )}{' '}
                  FCFA
                </span>
              </div>
              <div className="text-[11px] text-gray-500 pt-1 border-t border-amber-200">
                Crédité sur le compte : <strong>{sellReceiptAccount}</strong>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2.5 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowSellCurModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-black bg-[#192A24] hover:bg-[#253D34] text-white shadow-xs cursor-pointer transition-colors"
            >
              Valider la vente de devises
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* Modal 3: Ajustement d'inventaire Devises (Classique)       */}
      {/* ========================================================= */}
      <Modal
        isOpen={showCurAdjModal}
        onClose={() => setShowCurAdjModal(false)}
        title="Ajustement d'inventaire de devises"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdjustCurrency} className="space-y-4">
          {curError && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold">
              {curError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Devise</label>
            <select
              value={curCurrency}
              onChange={(e) => setCurCurrency(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            >
              {Object.keys(store.currencyBalances).map((c) => (
                <option key={c} value={c}>
                  {getCurrencyFlag(c)} {c} (Solde : {formatNumber(store.currencyBalances[c] || 0, 2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Sens de l'ajustement</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCurIsAddition(true)}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  curIsAddition
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Ajout (+)
              </button>
              <button
                type="button"
                onClick={() => setCurIsAddition(false)}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  !curIsAddition
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Retrait (-)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Montant</label>
            <input
              type="text"
              required
              value={curAmount}
              onChange={(e) => setCurAmount(e.target.value)}
              placeholder="ex: 500"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Motif</label>
            <input
              type="text"
              required
              value={curReason}
              onChange={(e) => setCurReason(e.target.value)}
              placeholder="ex: Régularisation physique suite à comptage"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCurAdjModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200"
            >
              Annuler
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-[#192A24] text-white">
              Valider l'ajustement
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* Modal 4: Ajustement de Stock d'Or                          */}
      {/* ========================================================= */}
      <Modal
        isOpen={showGoldAdjModal}
        onClose={() => setShowGoldAdjModal(false)}
        title="Ajustement de stock d'or"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdjustGold} className="space-y-4">
          {goldError && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold">
              {goldError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Titre / Carat</label>
            <select
              value={goldKarat}
              onChange={(e) => setGoldKarat(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            >
              {standardKarats.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Catégorie</label>
            <select
              value={goldCategory}
              onChange={(e) => setGoldCategory(e.target.value as GoldCategory)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
            >
              {GOLD_STOCK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">
              Variation de poids en grammes (+ pour ajout, - pour retrait)
            </label>
            <input
              type="text"
              required
              value={goldWeightGrams}
              onChange={(e) => setGoldWeightGrams(e.target.value)}
              placeholder="ex: +25.4 ou -10.2"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Motif de correction obligatoire</label>
            <input
              type="text"
              required
              value={goldReason}
              onChange={(e) => setGoldReason(e.target.value)}
              placeholder="ex: Régularisation inventaire physique"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowGoldAdjModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200"
            >
              Annuler
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D39725] text-white">
              Enregistrer l'ajustement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
