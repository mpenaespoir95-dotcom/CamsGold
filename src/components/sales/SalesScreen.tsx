import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  History,
  Plus,
  Trash2,
  Printer,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Wallet,
  Calendar,
  Building2,
  ChevronRight,
  TrendingUp,
  Receipt,
  LogOut,
  ShoppingBag,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { AppPanel, Modal, PageHeading, SectionHeading } from '../common/UIComponents';
import {
  formatMoney,
  formatNumber,
  TROY_OUNCE_IN_GRAMS,
  formatOunces,
  goldKaratValue,
  calculateFineGoldStockOunces,
  roundOunces,
  formatDate,
} from '../../utils/goldMath';
import {
  SaleRecord,
  SaleBarItem,
  SaleAdvancePayment,
  SaleChargeItem,
  GoldCategory,
} from '../../types';
import { GoldPriceService } from '../../services/goldPriceService';
import { ExchangeRateService } from '../../services/exchangeRateService';
import { DubaiSettlementSheet } from './DubaiSettlementSheet';

const CounterGoldSaleForm: React.FC<{
  totalStockFineOunces: number;
  onViewHistory: () => void;
  onOpenInvoice: () => void;
  onSaleSaved: (sale: SaleRecord) => void;
}> = ({ totalStockFineOunces, onViewHistory, onOpenInvoice, onSaleSaved }) => {
  const store = useAppStore();
  const [selectedClientReference, setSelectedClientReference] = useState('__manual__');
  const [buyer, setBuyer] = useState('');
  const karat = '24K';
  const category: GoldCategory = 'Non catégorisé';
  const [ounces, setOunces] = useState('');
  const [liveGoldUsd, setLiveGoldUsd] = useState<number>(0);
  const [isRefreshingMarketData, setIsRefreshingMarketData] = useState(false);
  const [usdToXaf, setUsdToXaf] = useState('');
  const [advanceAmountUsd, setAdvanceAmountUsd] = useState('');
  const [expenses, setExpenses] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refreshMarketData = async () => {
    setIsRefreshingMarketData(true);
    try {
      const [quote, rates] = await Promise.all([
        GoldPriceService.fetchGoldUsd(),
        ExchangeRateService.fetchRates(),
      ]);
      if (quote.pricePerTroyOunceUsd > 0) {
        setLiveGoldUsd(quote.pricePerTroyOunceUsd);
      }
      if (rates.usdRates['XAF'] > 0) {
        setUsdToXaf(String(rates.usdRates['XAF']));
      }
    } catch (cause) {
      console.warn('Impossible d’actualiser le cours de l’or et le taux USD/FCFA:', cause);
    } finally {
      setIsRefreshingMarketData(false);
    }
  };

  useEffect(() => {
    refreshMarketData();
  }, []);

  const ounceQuantity = roundOunces(parseFloat(ounces.replace(',', '.') || '0'));
  const weightGrams = ounceQuantity * TROY_OUNCE_IN_GRAMS;
  const usdOuncePrice = liveGoldUsd;
  const exchangeRate = parseFloat(usdToXaf.replace(',', '.') || '0');
  const advanceUsd = parseFloat(advanceAmountUsd.replace(',', '.') || '0');
  const purchaseCostBasis = store.purchases.reduce(
    (totals, purchase) => {
      if (purchase.cancelledAt || !Number.isFinite(purchase.amount) || purchase.amount <= 0) return totals;
      const karat = purchase.karat ? goldKaratValue(purchase.karat) : null;
      const netWeight = purchase.netWeightGrams ??
        Math.max(0, (purchase.grossWeightGrams || 0) - (purchase.nonGoldWeightGrams || 0));
      if (!karat || netWeight <= 0 || !Number.isFinite(netWeight)) return totals;
      return {
        costXaf: totals.costXaf + purchase.amount,
        fineGrams: totals.fineGrams + (netWeight * karat) / 24,
      };
    },
    { costXaf: 0, fineGrams: 0 }
  );
  const averagePurchaseCostPerFineGramXaf = purchaseCostBasis.fineGrams > 0
    ? purchaseCostBasis.costXaf / purchaseCostBasis.fineGrams
    : 0;
  const stockPurchaseCostXaf = Math.round(
    totalStockFineOunces * TROY_OUNCE_IN_GRAMS * averagePurchaseCostPerFineGramXaf
  );
  const purchaseCostXaf = Math.round(weightGrams * averagePurchaseCostPerFineGramXaf);
  const expensesXaf = parseFloat(expenses.replace(',', '.') || '0');
  const grossRevenueUsd = ounceQuantity * usdOuncePrice;
  const grossRevenue = Math.round(grossRevenueUsd * exchangeRate);
  const advanceXaf = Math.round(advanceUsd * exchangeRate);
  const remainingUsd = Math.max(0, grossRevenueUsd - advanceUsd);
  const remainingXaf = Math.max(0, grossRevenue - advanceXaf);
  const netProfit = grossRevenue - purchaseCostXaf - expensesXaf;
  const availableOunces = totalStockFineOunces;
  const clientContacts = store.contacts.filter((contact) =>
    contact.roles.some((role) => role.startsWith('Client'))
  );
  const selectedClient = clientContacts.find((contact) => contact.reference === selectedClientReference);
  const buyerName = selectedClient?.name || buyer;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!buyerName.trim()) {
      setError('Veuillez indiquer le nom de l’acheteur.');
      return;
    }
    if (ounceQuantity <= 0 || !Number.isFinite(ounceQuantity)) {
      setError('La quantité vendue en onces doit être supérieure à zéro.');
      return;
    }
    if (ounceQuantity > availableOunces) {
      setError(
        `Stock insuffisant : ${formatOunces(availableOunces, 3)} oz disponibles, pour ${formatOunces(ounceQuantity, 3)} oz demandées.`
      );
      return;
    }
    if (usdOuncePrice <= 0 || exchangeRate <= 0) {
      setError('Le prix de vente par once et le taux USD/FCFA doivent être supérieurs à zéro.');
      return;
    }
    if (averagePurchaseCostPerFineGramXaf <= 0) {
      setError('Le coût d’achat ne peut pas être calculé : vérifiez les achats enregistrés et leurs montants/poids.');
      return;
    }
    if (advanceUsd < 0 || !Number.isFinite(advanceUsd) || advanceUsd > grossRevenueUsd) {
      setError('L’avance doit être un montant positif ou nul et ne peut pas dépasser le prix total de vente en USD.');
      return;
    }
    if (
      [purchaseCostXaf, expensesXaf].some(
        (amount) => amount < 0 || !Number.isFinite(amount)
      )
    ) {
      setError('Les coûts et frais doivent être des montants valides et positifs.');
      return;
    }
    try {
      const now = new Date();
      const advances: SaleAdvancePayment[] = advanceUsd > 0
        ? [{
            id: `advance-${now.getTime()}`,
            date: now.toLocaleDateString('fr-FR'),
            label: 'Avance acheteur',
            amountUsd: advanceUsd,
            amountXaf: advanceXaf,
            currency: 'USD',
          }]
        : [];
      const notes = [
        `Vente au comptoir à ${formatNumber(usdOuncePrice, 2)} USD/oz.`,
        `Coût d’achat : ${formatMoney(purchaseCostXaf)} FCFA.`,
        `Frais et dépenses : ${formatMoney(expensesXaf)} FCFA.`,
        `Bénéfice net prévisionnel : ${formatMoney(netProfit)} FCFA.`,
      ].join(' ');
      const sale = store.addSaleRecord({
        clientName: buyerName.trim(),
        clientId: selectedClient?.id || selectedClient?.reference,
        clientReference: selectedClient?.reference,
        clientPhone: selectedClient?.phone,
        clientCity: selectedClient?.city,
        clientEmail: selectedClient?.email,
        clientBankName: selectedClient?.bankName,
        clientBankAccountNumber: selectedClient?.bankAccountNumber,
        date: now.toLocaleDateString('fr-FR'),
        bars: [{
          id: `counter-sale-${now.getTime()}`,
          srNo: '001',
          barRef: 'Vente comptoir',
          barWeight: weightGrams,
          sampleWeight: 0,
          goldPurity: 1,
          carat: 24,
          pureWeightGrams: weightGrams,
          ounces: ounceQuantity,
        }],
        totalGeneralWeightGrams: weightGrams,
        totalSampleWeightGrams: 0,
        averagePurity: 1,
        averageCarat: 24,
        totalPureWeight24kGrams: weightGrams,
        totalPureOunces: ounceQuantity,
        fixingDate: now.toLocaleDateString('fr-FR'),
        fixingPricePerOunceUsd: usdOuncePrice,
        grossRevenueUsd,
        grossRevenueAed: parseFloat((grossRevenueUsd * 3.6725).toFixed(2)),
        grossRevenueXaf: grossRevenue,
        charges: [],
        totalChargesUsd: 0,
        advances,
        totalAdvancesUsd: advanceUsd,
        totalAdvancesAed: parseFloat((advanceUsd * 3.6725).toFixed(2)),
        totalWithdrawUsd: advanceUsd,
        totalWithdrawAed: parseFloat((advanceUsd * 3.6725).toFixed(2)),
        totalWithdrawXaf: advanceXaf,
        balanceRemainingUsd: remainingUsd,
        balanceRemainingAed: parseFloat((remainingUsd * 3.6725).toFixed(2)),
        balanceRemainingXaf: remainingXaf,
        usdToAedRate: 3.6725,
        usdToXafRate: exchangeRate,
        status: remainingUsd <= 0.01 ? 'settled' : advanceUsd > 0 ? 'partially_paid' : 'pending',
        notes,
      });
      setSuccess(
        `Vente de ${formatOunces(ounceQuantity, 3)} oz enregistrée. ${advanceUsd > 0 ? `$${formatNumber(advanceUsd, 2)} ajoutés au stock USD.` : 'Aucun paiement reçu pour le moment.'} Solde restant dû : $${formatNumber(remainingUsd, 2)}.`
      );
      onSaleSaved(sale);
      setOunces('');
      setAdvanceAmountUsd('');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-6">
      <PageHeading
        eyebrow="Vente d’or au comptoir"
        title="Enregistrer une vente d’or"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenInvoice}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFD27A] border border-[#E7AD35] text-[#192A24] text-xs font-bold cursor-pointer"
            >
              <Receipt size={15} />
              <span>FACTURE</span>
            </button>
            <button
              type="submit"
              form="counter-gold-sale-form"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E8D8BE] text-[#192A24] text-xs font-bold cursor-pointer hover:bg-gray-50"
            >
              <LogOut size={15} />
              <span>SORTIR</span>
            </button>
            <button
              type="button"
              onClick={onViewHistory}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#192A24] text-white text-xs font-bold cursor-pointer"
            >
              <History size={15} />
              <span>Historique des ventes</span>
            </button>
          </div>
        }
      />

      <AppPanel className="bg-gradient-to-r from-[#FFE1A3] via-[#FFD27A] to-[#FFE1A3] border-[#E7AD35] grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#9E731B]">
            Stock global d’or fin disponible
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-black text-[#192A24]">
            {formatOunces(availableOunces, 3)} oz
          </div>
        </div>
        <div className="text-xs font-bold text-[#7D5711]">
          <div>Coût d’achat estimé de tout le stock</div>
          {averagePurchaseCostPerFineGramXaf > 0 ? (
            <>
              <div className="mt-1 text-base font-black text-[#192A24]">
                {formatMoney(stockPurchaseCostXaf)} FCFA
              </div>
              <div className="mt-0.5 text-[11px] font-medium">
                {exchangeRate > 0
                  ? `≈ $${formatNumber(stockPurchaseCostXaf / exchangeRate, 2)} USD au taux saisi`
                  : 'Saisissez un taux USD / FCFA pour afficher l’équivalent USD'}
              </div>
            </>
          ) : (
            <div className="mt-1 text-[11px] font-medium text-red-700">
              Coût indisponible : achats avec poids et montant requis
            </div>
          )}
        </div>
      </AppPanel>

      <form id="counter-gold-sale-form" onSubmit={handleSubmit} className="space-y-5">
        <AppPanel className="bg-white border-[#E8D8BE] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1.5">
                Client
              </label>
              <select
                value={selectedClientReference}
                onChange={(event) => setSelectedClientReference(event.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
              >
                <option value="__manual__">Saisie manuelle</option>
                {clientContacts.map((contact) => (
                  <option key={contact.reference} value={contact.reference}>
                    {contact.name} · {contact.reference}
                  </option>
                ))}
              </select>
              {selectedClient ? (
                <div className="mt-2 text-[11px] text-gray-600">
                  {[selectedClient.phone, selectedClient.city, selectedClient.email]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={buyer}
                  onChange={(event) => setBuyer(event.target.value)}
                  placeholder="Nom de l’acheteur"
                  className="mt-2 w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1.5">
                Quantité globale vendue (onces)
              </label>
              <input
                type="text"
                required
                value={ounces}
                onChange={(event) => setOunces(event.target.value)}
                placeholder="ex. 1,25"
                className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8D8BE] space-y-3">
            <h3 className="text-sm font-bold text-[#192A24]">Prix de vente et coûts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="text-xs text-gray-600">
                Prix de vente par once (USD / oz)
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={liveGoldUsd > 0 ? formatNumber(liveGoldUsd, 2) : ''}
                    placeholder={isRefreshingMarketData ? 'Chargement du cours…' : 'Cours indisponible'}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE] text-xs font-bold text-[#192A24] read-only:bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={refreshMarketData}
                    disabled={isRefreshingMarketData}
                    aria-label="Actualiser le cours de l’or et le taux USD/FCFA"
                    title="Actualiser le cours et le taux USD/FCFA"
                    className="shrink-0 px-3 rounded-lg border border-[#E8D8BE] text-[#192A24] hover:bg-white disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw size={14} className={isRefreshingMarketData ? 'animate-spin' : ''} />
                  </button>
                </div>
              </label>
              <label className="text-xs text-gray-600">
                Taux USD / FCFA
                <input
                  type="text"
                  readOnly
                  value={usdToXaf ? formatNumber(Number(usdToXaf), 2) : ''}
                  placeholder={isRefreshingMarketData ? 'Chargement du taux…' : 'Taux indisponible'}
                  className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE] text-xs font-bold text-[#192A24] read-only:bg-gray-50"
                />
              </label>
              <label className="text-xs text-gray-600">
                Frais / dépenses (montant total FCFA)
                <input type="text" value={expenses} onChange={(event) => setExpenses(event.target.value)} placeholder="Montant total des frais" className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE] text-xs font-bold text-[#192A24]" />
              </label>
              <label className="text-xs text-gray-600 sm:col-span-2 lg:col-span-4">
                Avance versée par l’acheteur (USD, facultatif)
                <input type="text" value={advanceAmountUsd} onChange={(event) => setAdvanceAmountUsd(event.target.value)} placeholder="0.00" className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE] text-xs font-bold text-[#192A24]" />
              </label>
              <div className="sm:col-span-2 lg:col-span-4 rounded-lg border border-[#F6E1B4] bg-[#FFF9EA] px-3 py-2 text-xs">
                <span className="text-gray-600">Prix total de vente estimé</span>
                <strong className="ml-2 text-[#192A24]">${formatNumber(grossRevenueUsd, 2)} USD</strong>
                <span className="ml-2 text-gray-500">≈ {formatMoney(grossRevenue)} FCFA</span>
                <span className="ml-2 text-gray-500">selon la quantité, le prix par once et le taux USD / FCFA</span>
                <div className="mt-1 text-gray-600">
                  Avance : <strong>${formatNumber(advanceUsd, 2)} USD</strong>
                  <span className="mx-2">·</span>
                  Solde restant : <strong>${formatNumber(remainingUsd, 2)} USD</strong>
                  <span className="ml-2 text-gray-500">(≈ {formatMoney(remainingXaf)} FCFA)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-900">
              Les paiements reçus sont ajoutés au stock de devises USD, pas à la caisse.
            </div>
            <div className="rounded-xl bg-[#FFF9EA] border border-[#F6E1B4] p-3 text-xs">
              <div className="flex justify-between"><span>Prix total de vente</span><strong>${formatNumber(grossRevenueUsd, 2)} USD</strong></div>
              <div className="flex justify-between mt-1 text-gray-600"><span>Avance reçue</span><strong>${formatNumber(advanceUsd, 2)} USD</strong></div>
              <div className="flex justify-between mt-1"><span>Solde dû</span><strong>${formatNumber(remainingUsd, 2)} USD</strong></div>
              <div className="flex justify-between mt-1 text-[#9E731B]"><span>Bénéfice net prévisionnel</span><strong>{formatMoney(netProfit)} FCFA</strong></div>
              <div className="mt-1 text-[10px] text-gray-500">
                Coût d’achat estimé de cette quantité : {formatMoney(purchaseCostXaf)} FCFA
              </div>
            </div>
          </div>

          {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
          {success && <p role="status" className="text-sm font-semibold text-emerald-800">{success}</p>}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#D39725] hover:bg-[#c2871b] text-white text-sm font-black shadow-xs cursor-pointer"
          >
            Enregistrer la vente et l’avance
          </button>
        </AppPanel>
      </form>
    </div>
  );
};

export const SalesScreen: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
  const store = useAppStore();
  const clientContacts = store.contacts.filter((contact) =>
    contact.roles.some((role) => role.startsWith('Client'))
  );

  const [activeTab, setActiveTab] = useState<'purchases' | 'new_sale' | 'history'>('new_sale');
  const [sortedPurchaseIds, setSortedPurchaseIds] = useState<string[]>([]);
  const visiblePurchases = store.purchases.filter((p) => !sortedPurchaseIds.includes(p.id));
  const [pendingPurchasePrint, setPendingPurchasePrint] = useState(false);

  // Market live quotes
  const [liveGoldUsd, setLiveGoldUsd] = useState<number>(0);
  const [isRefreshingQuote, setIsRefreshingQuote] = useState(false);

  // Form states: Client & General info
  const [selectedClientReference, setSelectedClientReference] = useState('__manual__');
  const [clientName, setClientName] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date().toLocaleDateString('fr-FR'));
  const [notes, setNotes] = useState('');
  const selectedSettlementClient = clientContacts.find(
    (contact) => contact.reference === selectedClientReference
  );

  // Rates
  const [usdToAedRate, setUsdToAedRate] = useState<number>(0);
  const [usdToXafRate, setUsdToXafRate] = useState<number>(0);

  // Table 1: Bars & Assay items
  const [bars, setBars] = useState<SaleBarItem[]>([]);

  // Table 2: Fixings
  const [fixingDate, setFixingDate] = useState('');
  const [fixingPriceUsd, setFixingPriceUsd] = useState('');

  // Table 3: Total expenses
  const [expensesXaf, setExpensesXaf] = useState('');

  // Table 3: Advances / Acomptes
  const [advances, setAdvances] = useState<SaleAdvancePayment[]>([]);

  // Modals
  const [viewingSale, setViewingSale] = useState<SaleRecord | null>(null);
  const [advanceSaleModal, setAdvanceSaleModal] = useState<SaleRecord | null>(null);
  const [newAdvanceLabel, setNewAdvanceLabel] = useState('Acompte complémentaire');
  const [newAdvanceAmountUsd, setNewAdvanceAmountUsd] = useState('');
  const [newAdvanceDate, setNewAdvanceDate] = useState('Aujourd’hui');
  const [advanceClientName, setAdvanceClientName] = useState('');
  const [advanceClientPhone, setAdvanceClientPhone] = useState('');
  const [advanceClientCity, setAdvanceClientCity] = useState('');
  const [advanceClientEmail, setAdvanceClientEmail] = useState('');
  const [advanceClientBank, setAdvanceClientBank] = useState('');
  const [advanceClientBankAccount, setAdvanceClientBankAccount] = useState('');
  const [postMeltWeight, setPostMeltWeight] = useState(
    () => localStorage.getItem('cg_sales_purchase_sheet_post_melt_weight') || ''
  );
  const [postMeltCarat, setPostMeltCarat] = useState(
    () => localStorage.getItem('cg_sales_purchase_sheet_post_melt_carat') || ''
  );

  useEffect(() => {
    localStorage.setItem('cg_sales_purchase_sheet_post_melt_weight', postMeltWeight);
  }, [postMeltWeight]);

  useEffect(() => {
    localStorage.setItem('cg_sales_purchase_sheet_post_melt_carat', postMeltCarat);
  }, [postMeltCarat]);

  useEffect(() => {
    if (!pendingPurchasePrint || activeTab !== 'purchases') return;
    setPendingPurchasePrint(false);
    window.requestAnimationFrame(() => window.print());
  }, [activeTab, pendingPurchasePrint]);

  const printPurchaseTable = () => {
    if (activeTab === 'purchases') {
      window.print();
      return;
    }
    setPendingPurchasePrint(true);
    setActiveTab('purchases');
  };

  const transferMeltValuesToBordereau = () => {
    const weight = Number.parseFloat(postMeltWeight.replace(',', '.'));
    const carat = Number.parseFloat(postMeltCarat.replace(',', '.'));

    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(carat) || carat <= 0 || carat > 24) {
      setErrorBanner('Renseignez un poids après fonte positif et un carat compris entre 0 et 24 avant de sortir.');
      return;
    }

    const goldPurity = carat / 24;
    const pureWeightGrams = Number.parseFloat((weight * goldPurity).toFixed(3));
    setBars([{
      id: `melted-gold-${Date.now()}`,
      srNo: '001',
      barRef: 'Après fonte',
      barWeight: weight,
      sampleWeight: 0,
      goldPurity,
      carat,
      pureWeightGrams,
      ounces: Number.parseFloat((pureWeightGrams / TROY_OUNCE_IN_GRAMS).toFixed(2)),
    }]);
    setSortedPurchaseIds((prev) => Array.from(new Set([...prev, ...store.purchases.map((p) => p.id)])));
    setPostMeltWeight('');
    setPostMeltCarat('');
    setFixingPriceUsd('');
    setErrorBanner(null);
    setActiveTab('new_sale');
  };

  // Feedback states
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Load real market gold fixing price
  const refreshLivePrice = async () => {
    setIsRefreshingQuote(true);
    try {
      const [quote, rates] = await Promise.all([
        GoldPriceService.fetchGoldUsd(),
        ExchangeRateService.fetchRates(),
      ]);
      if (quote?.pricePerTroyOunceUsd) {
        setLiveGoldUsd(quote.pricePerTroyOunceUsd);
      }
      if (rates.usdRates['AED']) {
        setUsdToAedRate(rates.usdRates['AED']);
      }
      if (rates.usdRates['XAF']) {
        setUsdToXafRate(rates.usdRates['XAF']);
      }
    } catch (e) {
      console.warn('Live price fetch fallback:', e);
    } finally {
      setIsRefreshingQuote(false);
    }
  };

  useEffect(() => {
    refreshLivePrice();
  }, []);

  // Recalculate row values when inputs change
  const handleUpdateBar = (
    index: number,
    field: keyof SaleBarItem,
    value: string
  ) => {
    const updated = [...bars];
    const item = { ...updated[index] };

    if (field === 'srNo' || field === 'barRef') {
      item[field] = value;
    } else {
      const numVal = parseFloat(value.replace(',', '.') || '0');

      if (field === 'barWeight') {
        item.barWeight = numVal;
      } else if (field === 'sampleWeight') {
        item.sampleWeight = numVal;
      } else if (field === 'goldPurity') {
        // Handle input as percentage (e.g. 70.7) or decimal (0.707)
        item.goldPurity = numVal > 1 ? numVal / 100 : numVal;
      }

      // Recompute Carat, Pure Weight 24K and Troy Ounces
      item.carat = parseFloat((item.goldPurity * 24).toFixed(2));
      item.pureWeightGrams = parseFloat((item.barWeight * item.goldPurity).toFixed(3));
      item.ounces = parseFloat((item.pureWeightGrams / TROY_OUNCE_IN_GRAMS).toFixed(2));
    }

    updated[index] = item;
    setBars(updated);
  };

  const handleAddBar = () => {
    const nextSr = String(bars.length + 1).padStart(3, '0');
    const newBar: SaleBarItem = {
      id: `bar-${Date.now()}-${Math.random()}`,
      srNo: nextSr,
      barRef: '',
      barWeight: 0,
      sampleWeight: 0,
      goldPurity: 0,
      carat: 0,
      pureWeightGrams: 0,
      ounces: 0,
    };
    setBars([...bars, newBar]);
  };

  const handleRemoveBar = (index: number) => {
    if (bars.length === 0) return;
    setBars(bars.filter((_, i) => i !== index));
  };

  // Calculations for Table 1 (Bars)
  const totalBarWeight = bars.reduce((sum, b) => sum + (b.barWeight || 0), 0);
  const totalSampleWeight = bars.reduce((sum, b) => sum + (b.sampleWeight || 0), 0);
  const totalPureWeight24k = bars.reduce((sum, b) => sum + (b.pureWeightGrams || 0), 0);
  const totalPureOz = totalPureWeight24k / TROY_OUNCE_IN_GRAMS;
  const averagePurity = totalBarWeight > 0 ? totalPureWeight24k / totalBarWeight : 0.707;
  const averageCarat = parseFloat((averagePurity * 24).toFixed(2));

  // Calculations for Table 2 (Fixing)
  const fixingPriceNum = parseFloat(fixingPriceUsd.replace(',', '.') || '0');
  const grossRevenueUsd = parseFloat((totalPureOz * fixingPriceNum).toFixed(2));
  const grossRevenueAed = parseFloat((grossRevenueUsd * usdToAedRate).toFixed(2));
  const grossRevenueXaf = Math.round(grossRevenueUsd * usdToXafRate);

  // The user enters the full expense amount in XAF; convert it for the settlement sheet.
  const expensesXafNum = parseFloat(expensesXaf.replace(',', '.') || '0');
  const expensesUsdNum = usdToXafRate > 0
    ? parseFloat((expensesXafNum / usdToXafRate).toFixed(2))
    : 0;
  const expensesAedNum = parseFloat((expensesUsdNum * usdToAedRate).toFixed(2));
  const chargesList: SaleChargeItem[] = expensesXafNum > 0
    ? [{
        id: 'ch-expenses',
        date: saleDate,
        type: 'other',
        label: 'FRAIS / DÉPENSES',
        rateOrDetails: `${formatMoney(expensesXafNum)} FCFA`,
        amountUsd: expensesUsdNum,
        amountAed: expensesAedNum,
        amountXaf: Math.round(expensesXafNum),
      }]
    : [];
  const totalChargesUsd = expensesUsdNum;

  // Calculations for Advances (Acomptes)
  const totalAdvancesUsd = parseFloat(
    advances.reduce((sum, a) => sum + (a.amountUsd || 0), 0).toFixed(2)
  );
  const totalAdvancesAed = parseFloat(
    advances.reduce((sum, a) => sum + (a.amountAed || a.amountUsd * usdToAedRate), 0).toFixed(2)
  );

  // Totals & Balance
  const totalWithdrawUsd = parseFloat((totalChargesUsd + totalAdvancesUsd).toFixed(2));
  const totalWithdrawAed = parseFloat((totalWithdrawUsd * usdToAedRate).toFixed(2));
  const balanceRemainingUsd = Math.max(
    0,
    parseFloat((grossRevenueUsd - totalWithdrawUsd).toFixed(2))
  );
  const balanceRemainingAed = parseFloat((balanceRemainingUsd * usdToAedRate).toFixed(2));
  const balanceRemainingXaf = Math.round(balanceRemainingUsd * usdToXafRate);

  // Handlers for Advances inside New Sale form
  const handleAddAdvanceRow = () => {
    const newAdv: SaleAdvancePayment = {
      id: `adv-${Date.now()}`,
      date: saleDate,
      label: `Acompte #${advances.length + 1}`,
      amountUsd: 0,
      amountAed: 0,
      amountXaf: 0,
      currency: 'USD',
      note: '',
    };
    setAdvances([...advances, newAdv]);
  };

  const handleUpdateAdvance = (index: number, field: string, val: string) => {
    const updated = [...advances];
    const item = { ...updated[index] };
    if (field === 'label' || field === 'date') {
      (item as Record<string, unknown>)[field] = val;
    } else if (field === 'amountUsd') {
      const num = parseFloat(val.replace(',', '.') || '0');
      item.currency = 'USD';
      item.amountUsd = num;
      item.amountAed = parseFloat((num * usdToAedRate).toFixed(2));
      item.amountXaf = Math.round(num * usdToXafRate);
    } else if (field === 'amountAed') {
      const numAed = parseFloat(val.replace(',', '.') || '0');
      item.currency = 'AED';
      item.amountAed = numAed;
      item.amountUsd = parseFloat((numAed / usdToAedRate).toFixed(2));
      item.amountXaf = Math.round(item.amountUsd * usdToXafRate);
    }
    updated[index] = item;
    setAdvances(updated);
  };

  const handleRemoveAdvance = (index: number) => {
    setAdvances(advances.filter((_, i) => i !== index));
  };

  // Submit and save new settlement sheet
  const handleSaveSaleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!selectedSettlementClient && !clientName.trim()) {
      setErrorBanner('Veuillez saisir le nom du client.');
      return;
    }
    if (totalBarWeight <= 0 || totalPureWeight24k <= 0) {
      setErrorBanner("Veuillez saisir au moins une barre d'or avec un poids et une pureté valides.");
      return;
    }
    if (fixingPriceNum <= 0) {
      setErrorBanner('Veuillez renseigner le cours fixing USD/oz.');
      return;
    }
    if (usdToXafRate <= 0) {
      setErrorBanner('Un taux USD/XAF réel est nécessaire pour enregistrer la vente.');
      return;
    }
    if (!Number.isFinite(expensesXafNum) || expensesXafNum < 0) {
      setErrorBanner('Le montant total des frais doit être un nombre positif ou nul.');
      return;
    }

    try {
      const newSale = store.addSaleRecord({
        clientName: selectedSettlementClient?.name || clientName.trim(),
        clientId: selectedSettlementClient?.id || selectedSettlementClient?.reference,
        clientReference: selectedSettlementClient?.reference,
        clientPhone: selectedSettlementClient?.phone,
        clientCity: selectedSettlementClient?.city,
        clientEmail: selectedSettlementClient?.email,
        clientBankName: selectedSettlementClient?.bankName,
        clientBankAccountNumber: selectedSettlementClient?.bankAccountNumber,
        date: saleDate.trim() || 'Aujourd’hui',
        bars,
        totalGeneralWeightGrams: totalBarWeight,
        totalSampleWeightGrams: totalSampleWeight,
        averagePurity,
        averageCarat,
        totalPureWeight24kGrams: totalPureWeight24k,
        totalPureOunces: totalPureOz,
        fixingDate,
        fixingPricePerOunceUsd: fixingPriceNum,
        fixings: [{
          id: `fixing-${Date.now()}`,
          date: fixingDate || saleDate,
          quantityGrams: totalPureWeight24k,
          ounces: totalPureOz,
          pricePerOunceUsd: fixingPriceNum,
        }],
        grossRevenueUsd,
        grossRevenueAed,
        grossRevenueXaf,
        charges: chargesList,
        totalChargesUsd,
        advances,
        totalAdvancesUsd,
        totalWithdrawUsd,
        totalWithdrawAed,
        balanceRemainingUsd,
        balanceRemainingAed,
        balanceRemainingXaf,
        usdToAedRate,
        usdToXafRate,
        status: balanceRemainingUsd <= 0.01 ? 'settled' : 'partially_paid',
        notes: notes.trim(),
      });

      setSuccessBanner(
        `Bordereau de vente ${newSale.reference} enregistré avec succès ! Stock déduit de ${formatNumber(totalPureWeight24k, 2)} g (24K).`
      );
      setViewingSale(newSale);
      setActiveTab('history');
      setTimeout(() => setSuccessBanner(null), 6000);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : String(err));
    }
  };

  // Modal handler: add new advance to an existing sale with remaining balance
  const openAdvanceModal = (sale: SaleRecord) => {
    setAdvanceSaleModal(sale);
    setNewAdvanceAmountUsd(sale.balanceRemainingUsd.toFixed(2));
    setAdvanceClientName(sale.clientName);
    setAdvanceClientPhone(sale.clientPhone || '');
    setAdvanceClientCity(sale.clientCity || '');
    setAdvanceClientEmail(sale.clientEmail || '');
    setAdvanceClientBank(sale.clientBankName || '');
    setAdvanceClientBankAccount(sale.clientBankAccountNumber || '');
  };

  const handleExecuteAddAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceSaleModal) return;
    const amountNum = parseFloat(newAdvanceAmountUsd.replace(',', '.') || '0');
    if (amountNum <= 0) {
      alert('Veuillez saisir un montant positif pour l’acompte.');
      return;
    }
    if (amountNum > advanceSaleModal.balanceRemainingUsd) {
      alert(
        `L’acompte ($${amountNum.toFixed(2)}) ne peut pas dépasser le solde restant ($${advanceSaleModal.balanceRemainingUsd.toFixed(2)}).`
      );
      return;
    }

    try {
      const updatedSale = store.addSaleAdvance(advanceSaleModal.id, {
        date: newAdvanceDate.trim() || 'Aujourd’hui',
        label: newAdvanceLabel.trim() || 'Acompte complémentaire',
        amountUsd: amountNum,
        currency: 'USD',
        note: `Acompte sur solde vente ${advanceSaleModal.reference}`,
      }, {
        clientName: advanceClientName.trim(),
        clientReference: advanceSaleModal.clientReference,
        clientPhone: advanceClientPhone.trim(),
        clientCity: advanceClientCity.trim(),
        clientEmail: advanceClientEmail.trim(),
        clientBankName: advanceClientBank.trim(),
        clientBankAccountNumber: advanceClientBankAccount.trim(),
      });

      setSuccessBanner(
        `Acompte de $${amountNum.toFixed(2)} ajouté au stock USD pour la vente ${advanceSaleModal.reference}.`
      );
      setViewingSale(updatedSale);
      setAdvanceSaleModal(null);
      setNewAdvanceAmountUsd('');
      setTimeout(() => setSuccessBanner(null), 6000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Total KPIs in history
  const totalSalesRevenueUsd = store.saleRecords.reduce((acc, s) => acc + s.grossRevenueUsd, 0);
  const totalSalesAdvancesUsd = store.saleRecords.reduce((acc, s) => acc + s.totalAdvancesUsd, 0);
  const totalRemainingBalanceUsd = store.saleRecords.reduce(
    (acc, s) => acc + s.balanceRemainingUsd,
    0
  );
  const totalStockFineOunces = calculateFineGoldStockOunces(store.stockMovements);
  const isNewSaleTab = () => activeTab === 'new_sale';

  return (
    <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-6">
      <PageHeading
        eyebrow="Export International & Comptoirs"
        title="Ventes d'Or & Bordereaux de Règlement"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={printPurchaseTable}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFD27A] hover:bg-[#f4c45f] text-[#192A24] text-xs font-bold cursor-pointer shadow-2xs"
            >
              <Receipt size={15} />
              <span>FACTURE</span>
            </button>
            <button
              type="button"
              onClick={transferMeltValuesToBordereau}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E8D8BE] hover:bg-gray-50 text-[#192A24] text-xs font-bold cursor-pointer shadow-2xs"
            >
              <LogOut size={15} />
              <span>SORTIR</span>
            </button>
            <button
              onClick={refreshLivePrice}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E8D8BE] hover:bg-gray-50 text-xs font-bold text-[#192A24] cursor-pointer shadow-2xs"
            >
              <RefreshCw size={14} className={isRefreshingQuote ? 'animate-spin' : ''} />
              <span>Cours or : ${liveGoldUsd.toFixed(2)} / oz</span>
            </button>
          </div>
        }
      />

      {/* Success / Error Banners */}
      {successBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 text-[11px] font-bold cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {errorBanner && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-300 text-xs font-bold text-red-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-red-700 hover:text-red-950 text-[11px] font-bold cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Main Mode Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E8D8BE] pb-2">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'purchases'
              ? 'bg-[#192A24] text-white shadow-xs'
              : 'text-[#7D8176] hover:bg-[#F6F0E5]'
          }`}
        >
          <ShoppingBag size={16} />
          <span>Achats enregistrés ({visiblePurchases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#192A24] text-white shadow-xs'
              : 'text-[#7D8176] hover:bg-[#F6F0E5]'
          }`}
        >
          <History size={16} />
          <span>Historique des Ventes & Acomptes ({store.saleRecords.length})</span>
        </button>
      </div>

      {activeTab === 'purchases' && (
        (() => {
          const purchases = [...visiblePurchases].sort(
            (a, b) => a.purchasedAt.localeCompare(b.purchasedAt)
          );
          const purchaseRows = Math.max(17, purchases.length);
          const totals = purchases.reduce((sum, purchase) => {
            const netWeight = purchase.netWeightGrams ??
              Math.max(0, (purchase.grossWeightGrams ?? 0) - (purchase.nonGoldWeightGrams ?? 0));
            const karat = purchase.karat ? goldKaratValue(purchase.karat) ?? 0 : 24;
            const pricePerGram = purchase.referencePricePerGram ?? 0;
            return {
              caratWeighted: sum.caratWeighted + karat * netWeight,
              netWeight: sum.netWeight + netWeight,
              amount: sum.amount + purchase.amount,
              fineWeight: sum.fineWeight + netWeight * karat / 24,
              priceWeighted: sum.priceWeighted + pricePerGram * netWeight,
            };
          }, {
            caratWeighted: 0,
            netWeight: 0,
            amount: 0,
            fineWeight: 0,
            priceWeighted: 0,
          });
          const averageCarat = totals.netWeight > 0 ? totals.caratWeighted / totals.netWeight : 0;
          const averagePrice = totals.netWeight > 0 ? totals.priceWeighted / totals.netWeight : 0;

          return (
            <div className="sales-purchase-print overflow-x-auto">
              <table className="w-full min-w-[900px] table-fixed border-collapse border border-black bg-white text-center text-xs">
                <colgroup>
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[17%]" />
                  <col className="w-[17%]" />
                </colgroup>
                <thead>
                  <tr className="h-9 border-b-2 border-black bg-white font-bold text-black">
                    <th className="border-r-2 border-black px-2">Dates</th>
                    <th className="border-r-2 border-black px-2">N°</th>
                    <th className="border-r-2 border-black px-2">Carat</th>
                    <th className="border-r-2 border-black px-2">PoidsNet</th>
                    <th className="border-r-2 border-black px-2">Prix / Gramme<br />- FCFA</th>
                    <th className="border-r-2 border-black px-2">Buying Montant<br />- FCFA</th>
                    <th className="px-2">PoidsNet 24k</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[11px]">
                  {Array.from({ length: purchaseRows }, (_, index) => {
                    const purchase = purchases[index];
                    if (!purchase) {
                      return (
                        <tr key={`empty-${index}`} className="h-[21px] border-b border-black">
                          <td className="border-r-2 border-black bg-[#DDEBF7]"></td>
                          <td className="border-r-2 border-black bg-[#DDEBF7]"></td>
                          <td className="border-r-2 border-black bg-[#DDEBF7]"></td>
                          <td className="border-r-2 border-black bg-[#DDEBF7]"></td>
                          <td className="border-r-2 border-black text-right">- FCFA</td>
                          <td className="border-r-2 border-black text-right">- FCFA</td>
                          <td className="text-right">0</td>
                        </tr>
                      );
                    }

                    const netWeight = purchase.netWeightGrams ??
                      Math.max(0, (purchase.grossWeightGrams ?? 0) - (purchase.nonGoldWeightGrams ?? 0));
                    const karat = purchase.karat ? goldKaratValue(purchase.karat) ?? 0 : 24;
                    const pricePerGram = purchase.referencePricePerGram ?? 0;
                    const base = purchase.goldPricePerTroyOunceUsd && purchase.usdToXafRate
                      ? purchase.goldPricePerTroyOunceUsd * purchase.usdToXafRate / TROY_OUNCE_IN_GRAMS
                      : pricePerGram;

                    return (
                      <tr key={purchase.id} className="h-[21px] border-b border-black">
                        <td className="border-r-2 border-black bg-[#DDEBF7]">{formatDate(purchase.purchasedAt)}</td>
                        <td className="border-r-2 border-black bg-[#DDEBF7]">{purchase.reference}</td>
                        <td className="border-r-2 border-black bg-[#DDEBF7]">{formatNumber(karat, 2)}</td>
                        <td className="border-r-2 border-black bg-[#DDEBF7]">{formatNumber(netWeight, 2)}</td>
                        <td className="border-r-2 border-black text-right">{formatMoney(pricePerGram)} FCFA</td>
                        <td className="border-r-2 border-black text-right">{formatMoney(purchase.amount)} FCFA</td>
                        <td className="text-right">{formatNumber(netWeight * karat / 24, 2)}</td>
                      </tr>
                    );
                  })}
                  <tr className="h-7 border-y-2 border-black font-bold">
                    <td className="border-r-2 border-black" colSpan={2}>Totals General</td>
                    <td className="border-r-2 border-black">{formatNumber(averageCarat, 2)}</td>
                    <td className="border-r-2 border-black">{formatNumber(totals.netWeight, 2)}</td>
                    <td className="border-r-2 border-black">{formatMoney(averagePrice)} FCFA</td>
                    <td className="border-r-2 border-black">{formatMoney(totals.amount)} FCFA</td>
                    <td>{formatNumber(totals.fineWeight, 2)}</td>
                  </tr>
                  <tr className="h-5">
                    <td colSpan={7}></td>
                  </tr>
                  <tr className="h-7 border-y-2 border-black font-bold">
                    <td colSpan={2}>PoidsNet Apres Fonte</td>
                    <td colSpan={2} className="border-2 border-black bg-[#DDEBF7]">
                      <input
                        aria-label="Poids net après fonte"
                        inputMode="decimal"
                        value={postMeltWeight}
                        onChange={(event) => setPostMeltWeight(event.target.value)}
                        className="w-full bg-transparent text-center font-mono font-normal focus:outline-hidden"
                      />
                    </td>
                    <td></td>
                    <td className="border-2 border-black bg-[#C6E0B4]">Total Ounce</td>
                    <td className="border-2 border-black bg-[#C6E0B4]">
                      {formatNumber(totals.fineWeight / 31.1035, 3)}
                    </td>
                  </tr>
                  <tr className="h-7 border-y-2 border-black font-bold">
                    <td colSpan={2}>Carat Apres Fonte</td>
                    <td colSpan={2} className="border-2 border-black bg-[#DDEBF7]">
                      <input
                        aria-label="Carat après fonte"
                        inputMode="decimal"
                        value={postMeltCarat}
                        onChange={(event) => setPostMeltCarat(event.target.value)}
                        className="w-full bg-transparent text-center font-mono font-normal focus:outline-hidden"
                      />
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()
      )}

      {/* ======================================================== */}
      {/* TAB 1: NOUVEAU BORDEREAU DE VENTE (LE TABLEAU OFFICIEL)   */}
      {/* ======================================================== */}
      {isNewSaleTab() && (
        <form onSubmit={handleSaveSaleRecord} className="space-y-6">
          <AppPanel className="bg-gradient-to-r from-[#FFE1A3] via-[#FFD27A] to-[#FFE1A3] border-[#E7AD35] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#9E731B]">
                Quantité vendue · or fin
              </div>
              <div className="text-2xl font-black text-[#192A24]">
                {formatNumber(totalPureOz, 3)} oz
              </div>
            </div>
            <div className="text-sm font-bold text-[#192A24]">
              Calcul du montant basé sur le cours par once : ${formatNumber(fixingPriceNum, 2)} / oz
            </div>
          </AppPanel>
          {/* General Metadata Inputs */}
          <AppPanel className="bg-white border-[#E8D8BE] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#192A24] mb-1">
                  Client / Négociant Dubaï *
                </label>
                <select
                  value={selectedClientReference}
                  onChange={(event) => setSelectedClientReference(event.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-black text-[#192A24]"
                >
                  <option value="__manual__">Saisie manuelle</option>
                  {clientContacts.map((contact) => (
                    <option key={contact.reference} value={contact.reference}>
                      {contact.name} · {contact.reference}
                    </option>
                  ))}
                </select>
                {selectedSettlementClient ? (
                  <div className="mt-1 text-[10px] text-gray-600">
                    {[selectedSettlementClient.phone, selectedSettlementClient.city, selectedSettlementClient.email]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nom du client"
                    className="mt-1 w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-black text-[#192A24]"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#192A24] mb-1">
                  Date du bordereau *
                </label>
                <input
                  type="text"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  placeholder="JJ/MM/AAAA"
                  className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-mono font-bold"
                />
              </div>

              <div className="flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                Tout acompte reçu est ajouté au stock de devises, pas à la caisse.
              </div>

              <div>
                <label className="block text-xs font-bold text-[#192A24] mb-1">
                  Taux de conversion (USD → AED / XAF)
                </label>
                <div className="flex gap-2">
                  <span className="text-[11px] font-mono font-bold bg-gray-100 px-2 py-1.5 rounded-lg text-gray-700">
                    {usdToAedRate > 0 ? `1$ = ${usdToAedRate.toFixed(2)} AED` : 'Cours AED indisponible'}
                  </span>
                  <span className="text-[11px] font-mono font-bold bg-gray-100 px-2 py-1.5 rounded-lg text-gray-700">
                    {usdToXafRate > 0 ? `1$ = ${usdToXafRate.toFixed(0)} XAF` : 'Cours XAF indisponible'}
                  </span>
                </div>
              </div>
            </div>
          </AppPanel>

          {/* =================================================== */}
          {/* THE EXACT 3 TABLES FROM THE USER'S EXCEL IMAGE       */}
          {/* =================================================== */}
          <div className="bg-[#FAF7EE] border-2 border-[#2B3D41] rounded-xl shadow-md overflow-hidden text-[#111827]">
            {/* Top Sheet Header */}
            <div className="bg-[#204B57] text-white px-4 py-2.5 flex items-center justify-between font-mono font-bold gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="text"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Nom du client"
                  className="w-full max-w-md bg-white/10 text-white placeholder:text-white/60 border border-white/20 rounded-md px-2 py-1 text-sm font-black tracking-wider uppercase focus:outline-hidden"
                />
                <span className="text-xs text-amber-300 font-normal whitespace-nowrap">· DUBAI ACCOUNT SALE</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span>DATE</span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-amber-200">{saleDate}</span>
              </div>
            </div>

            {/* TABLE 1: BARS & ASSAY BREAKDOWN */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#2B3D41] uppercase tracking-wider font-mono">
                  1. Détail des Barres & Titrage (Bars & Assay)
                </span>
                <button
                  type="button"
                  onClick={handleAddBar}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D39725] hover:bg-[#c2871b] text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus size={13} strokeWidth={3} />
                  <span>Ajouter une barre / lingot</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse border border-[#2B3D41] text-[11px] font-mono">
                  <thead>
                    <tr className="bg-[#2B3D41] text-white font-black text-[11px] tracking-wide">
                      <th className="border border-[#4B5E63] py-2 px-2 w-14">SR NO</th>
                      <th className="border border-[#4B5E63] py-2 px-2 w-28">BAR REF</th>
                      <th className="border border-[#4B5E63] py-2 px-2 bg-[#36494D] w-32">
                        BAR WEIGHT (g)
                      </th>
                      <th className="border border-[#4B5E63] py-2 px-2 w-28">SAMPLE (g)</th>
                      <th className="border border-[#4B5E63] py-2 px-2 bg-[#36494D] w-32">
                        GOLD (AU %)
                      </th>
                      <th className="border border-[#4B5E63] py-2 px-2 w-24">CARAT</th>
                      <th className="border border-[#4B5E63] py-2 px-2 bg-[#36494D] w-36">
                        PURE WEIGHT 24K (g)
                      </th>
                      <th className="border border-[#4B5E63] py-2 px-2 w-28">PURE OZ SOLD</th>
                      <th className="border border-[#4B5E63] py-2 px-1 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bars.map((bar, idx) => (
                      <tr key={bar.id} className="hover:bg-amber-100/30">
                        <td className="border border-[#C2BCA8] p-1 bg-white font-semibold">
                          <input
                            type="text"
                            value={bar.srNo}
                            onChange={(e) => handleUpdateBar(idx, 'srNo', e.target.value)}
                            className="w-full text-center font-mono font-bold bg-transparent focus:outline-hidden"
                          />
                        </td>
                        <td className="border border-[#C2BCA8] p-1 bg-[#F6EDD6]">
                          <input
                            type="text"
                            value={bar.barRef}
                            onChange={(e) => handleUpdateBar(idx, 'barRef', e.target.value)}
                            placeholder="Référence de la barre"
                            className="w-full text-center font-mono font-black text-[#192A24] bg-transparent focus:outline-hidden uppercase"
                          />
                        </td>
                        <td className="border border-[#C2BCA8] p-1 bg-white">
                          <input
                            type="text"
                            value={bar.barWeight || ''}
                            onChange={(e) => handleUpdateBar(idx, 'barWeight', e.target.value)}
                            placeholder="Poids en grammes"
                            className="w-full text-right pr-2 font-mono font-bold bg-transparent focus:outline-hidden"
                          />
                        </td>
                        <td className="border border-[#C2BCA8] p-1 bg-white">
                          <input
                            type="text"
                            value={bar.sampleWeight || ''}
                            onChange={(e) => handleUpdateBar(idx, 'sampleWeight', e.target.value)}
                            placeholder="2.820"
                            className="w-full text-right pr-2 font-mono text-gray-600 bg-transparent focus:outline-hidden"
                          />
                        </td>
                        <td className="border border-[#C2BCA8] p-1 bg-[#F6EDD6]">
                          <input
                            type="text"
                            value={bar.goldPurity ? bar.goldPurity.toString() : ''}
                            onChange={(e) => handleUpdateBar(idx, 'goldPurity', e.target.value)}
                            placeholder="0.7070"
                            className="w-full text-right pr-2 font-mono font-black text-amber-950 bg-transparent focus:outline-hidden"
                          />
                        </td>
                        <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white font-mono font-bold text-right pr-2 text-gray-700">
                          {formatNumber(bar.carat, 2)}
                        </td>
                        <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white font-mono font-black text-[#192A24] text-right pr-2">
                          {formatNumber(bar.pureWeightGrams, 3)}
                        </td>
                        <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white font-mono font-black text-amber-900 text-right pr-2">
                          {formatNumber(bar.ounces, 2)}
                        </td>
                        <td className="border border-[#C2BCA8] p-1 bg-white">
                          {bars.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBar(idx)}
                              className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                              title="Supprimer cette ligne"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Table 1 Total Row */}
                    <tr className="bg-[#2B3D41] text-white font-mono font-black text-xs">
                      <td className="border border-[#4B5E63] py-2 px-2" colSpan={2}>
                        TOTAL GÉNÉRAL
                      </td>
                      <td className="border border-[#4B5E63] py-2 px-2 text-right pr-2 text-amber-200">
                        {formatNumber(totalBarWeight, 3)}
                      </td>
                      <td className="border border-[#4B5E63] py-2 px-2 text-right pr-2 text-gray-300">
                        {formatNumber(totalSampleWeight, 3)}
                      </td>
                      <td className="border border-[#4B5E63] py-2 px-2 text-right pr-2 text-amber-200">
                        {averagePurity.toFixed(4)}
                      </td>
                      <td className="border border-[#4B5E63] py-2 px-2 text-right pr-2 text-gray-200">
                        {formatNumber(averageCarat, 2)}
                      </td>
                      <td className="border border-[#4B5E63] py-2 px-2 text-right pr-2 text-amber-300">
                        {formatNumber(totalPureWeight24k, 3)}
                      </td>
                      <td className="border border-[#4B5E63] py-2 px-2 text-right pr-2 text-white">
                        {formatNumber(totalPureOz, 2)}
                      </td>
                      <td className="border border-[#4B5E63]"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLE 2: FIXINGS */}
            <div className="p-3 bg-[#FAF7EE] border-t-2 border-[#2B3D41]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-[#2B3D41] uppercase tracking-wider font-mono">
                  2. Fixings du Cours de l'Or (Vente)
                </span>
                <span className="text-[11px] font-mono text-gray-600">
                  Total brut : <strong>${formatNumber(grossRevenueUsd, 2)}</strong> (≈{' '}
                  <strong>{formatMoney(grossRevenueXaf)} FCFA</strong>)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse border border-[#2B3D41] text-[11px] font-mono">
                  <thead>
                    <tr className="bg-[#2B3D41] text-white font-black text-[11px]">
                      <th className="border border-[#4B5E63] py-1.5 px-3 w-36">DATE / FIXING</th>
                      <th className="border border-[#4B5E63] py-1.5 px-3">POIDS PUR 24K (g)</th>
                      <th className="border border-[#4B5E63] py-1.5 px-3">ONCES PURES VENDUES</th>
                      <th className="border border-[#4B5E63] py-1.5 px-3">PRICE ($ / OZ)</th>
                      <th className="border border-[#4B5E63] py-1.5 px-3 bg-[#36494D]">TOTAL $</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-[#C2BCA8] p-1 bg-[#F59E0B]">
                        <input
                          type="text"
                          value={fixingDate}
                          onChange={(e) => setFixingDate(e.target.value)}
                          placeholder="PENDING"
                          className="w-full text-center font-mono font-black text-amber-950 bg-transparent focus:outline-hidden uppercase"
                        />
                      </td>
                      <td className="border border-[#C2BCA8] py-1.5 px-3 bg-white font-bold text-right pr-4">
                        {formatNumber(totalPureWeight24k, 3)}
                      </td>
                      <td className="border border-[#C2BCA8] py-1.5 px-3 bg-[#F6EDD6] font-bold text-right pr-4">
                        {formatNumber(totalPureOz, 2)}
                      </td>
                      <td className="border border-[#C2BCA8] p-1 bg-white">
                        <div className="flex items-center justify-end">
                          <span className="text-gray-400 mr-1">$</span>
                          <input
                            type="text"
                            value={fixingPriceUsd}
                            onChange={(e) => setFixingPriceUsd(e.target.value)}
                            placeholder="Cours actuel USD/oz"
                            className="w-28 text-right pr-2 font-mono font-black bg-transparent focus:outline-hidden"
                          />
                        </div>
                      </td>
                      <td className="border border-[#C2BCA8] py-1.5 px-3 bg-[#F59E0B] text-amber-950 font-black text-right pr-4">
                        ${formatNumber(grossRevenueUsd, 2)}
                      </td>
                    </tr>

                    {/* Table 2 Total Row */}
                    <tr className="bg-[#2B3D41] text-white font-black">
                      <td className="border border-[#4B5E63] py-1.5 px-3">TOTAL FIXING</td>
                      <td className="border border-[#4B5E63] py-1.5 px-3 text-right pr-4 text-amber-200">
                        {formatNumber(totalPureWeight24k, 2)}
                      </td>
                      <td className="border border-[#4B5E63] py-1.5 px-3 text-right pr-4 text-white">
                        {formatNumber(totalPureOz, 2)}
                      </td>
                      <td className="border border-[#4B5E63] py-1.5 px-3 text-right pr-4 text-gray-200">
                        ${formatNumber(fixingPriceNum, 2)}
                      </td>
                      <td className="border border-[#4B5E63] py-1.5 px-3 text-right pr-4 text-amber-300">
                        ${formatNumber(grossRevenueUsd, 2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLE 3: CHARGES, ADVANCES & BALANCE */}
            <div className="p-3 bg-[#FAF7EE] border-t-2 border-[#2B3D41]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#2B3D41] uppercase tracking-wider font-mono">
                  3. Frais, Acomptes & Règlement Final (Charges & Withdraw)
                </span>
                <button
                  type="button"
                  onClick={handleAddAdvanceRow}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus size={13} strokeWidth={3} />
                  <span>+ Ajouter un acompte client</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-[#2B3D41] text-[11px] font-mono">
                  <thead>
                    <tr className="bg-[#2B3D41] text-white font-black text-[11px]">
                      <th className="border border-[#4B5E63] py-1.5 px-3 w-28">DATE</th>
                      <th className="border border-[#4B5E63] py-1.5 px-3">DESCRIPTION / INTITULÉ</th>
                      <th className="border border-[#4B5E63] py-1.5 px-3 w-40">PARAMÈTRE / DÉTAIL</th>
                      <th className="border border-[#4B5E63] py-1.5 px-3 text-right pr-4 w-36">
                        TOTAL AED
                      </th>
                      <th className="border border-[#4B5E63] py-1.5 px-3 text-right pr-4 w-36 bg-[#36494D]">
                        TOTAL $
                      </th>
                      <th className="border border-[#4B5E63] w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C2BCA8]">
                    <tr className="hover:bg-amber-100/30">
                      <td className="border border-[#C2BCA8] p-1 bg-white pl-3 text-gray-700">
                        {saleDate}
                      </td>
                      <td className="border border-[#C2BCA8] p-1 bg-white font-bold text-gray-900">
                        FRAIS / DÉPENSES
                      </td>
                      <td className="border border-[#C2BCA8] p-1 bg-white/70">
                        <div className="flex items-center gap-1">
                          <span>FCFA</span>
                          <input
                            type="text"
                            value={expensesXaf}
                            onChange={(event) => setExpensesXaf(event.target.value)}
                            placeholder="Montant total"
                            className="w-full min-w-20 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-right font-mono font-bold"
                          />
                        </div>
                      </td>
                      <td className="border border-[#C2BCA8] py-1.5 px-3 bg-white text-right pr-4 font-mono">
                        AED {formatNumber(expensesAedNum, 2)}
                      </td>
                      <td className="border border-[#C2BCA8] py-1.5 px-3 bg-[#F6EDD6] text-right pr-4 font-mono font-bold text-gray-900">
                        ${formatNumber(expensesUsdNum, 2)}
                      </td>
                      <td className="border border-[#C2BCA8] bg-white"></td>
                    </tr>

                    {/* 6. ADVANCES / ACOMPTES REÇUS */}
                    {advances.map((adv, aIdx) => (
                      <tr key={adv.id} className="bg-[#F59E0B]/20 font-bold">
                        <td className="border border-[#C2BCA8] p-1 text-amber-950 font-black">
                          <input
                            type="text"
                            value={adv.date}
                            onChange={(e) => handleUpdateAdvance(aIdx, 'date', e.target.value)}
                            className="w-full text-center bg-transparent focus:outline-hidden"
                          />
                        </td>
                        <td className="border border-[#C2BCA8] p-1 text-amber-950 font-black">
                          <input
                            type="text"
                            value={adv.label}
                            onChange={(e) => handleUpdateAdvance(aIdx, 'label', e.target.value)}
                              placeholder="Libellé de l’acompte"
                            className="w-full uppercase bg-transparent focus:outline-hidden text-amber-950 font-black"
                          />
                        </td>
                        <td className="border border-[#C2BCA8] p-1 text-amber-800 text-[10px]">
                          <span className="px-2 font-bold">Stock {adv.currency || 'USD'}</span>
                        </td>
                        <td className="border border-[#C2BCA8] p-1 text-right pr-4 font-mono font-black text-amber-950">
                          <div className="flex items-center justify-end gap-1">
                            <span>AED</span>
                            <input
                              type="text"
                              value={adv.amountAed || ''}
                              onChange={(e) => handleUpdateAdvance(aIdx, 'amountAed', e.target.value)}
                              placeholder="130000"
                              className="w-28 text-right font-mono font-black bg-transparent focus:outline-hidden text-amber-950"
                            />
                          </div>
                        </td>
                        <td className="border border-[#C2BCA8] p-1 bg-[#F59E0B]/40 text-right pr-4 font-mono font-black text-amber-950">
                          <div className="flex items-center justify-end gap-1">
                            <span>$</span>
                            <input
                              type="text"
                              value={adv.amountUsd || ''}
                              onChange={(e) => handleUpdateAdvance(aIdx, 'amountUsd', e.target.value)}
                              placeholder="Montant reçu"
                              className="w-24 text-right font-mono font-black bg-transparent focus:outline-hidden text-amber-950"
                            />
                          </div>
                        </td>
                        <td className="border border-[#C2BCA8] p-1 text-center bg-[#F59E0B]/20">
                          <button
                            type="button"
                            onClick={() => handleRemoveAdvance(aIdx)}
                            className="text-amber-800 hover:text-red-700 cursor-pointer p-1"
                            title="Supprimer cet acompte"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* TOTAL WITHDRAW */}
                    <tr className="bg-[#2B3D41] text-white font-black text-xs">
                      <td className="border border-[#4B5E63] py-2 px-3 text-right pr-4" colSpan={3}>
                        TOTAL WITHDRAW (Frais + Acomptes)
                      </td>
                      <td className="border border-[#4B5E63] py-2 px-3 text-right pr-4 text-amber-200">
                        AED {formatNumber(totalWithdrawAed, 2)}
                      </td>
                      <td className="border border-[#4B5E63] py-2 px-3 text-right pr-4 text-amber-300">
                        ${formatNumber(totalWithdrawUsd, 2)}
                      </td>
                      <td className="border border-[#4B5E63]"></td>
                    </tr>

                    {/* FINAL BALANCE (SOLDE RESTANT DÛ) */}
                    <tr className="bg-[#204B57] text-white font-black text-sm tracking-wide">
                      <td className="border border-[#204B57] py-2.5 px-3" colSpan={3}>
                        <div className="flex items-center justify-between">
                          <span className="uppercase text-amber-300 font-black">
                            BALANCE (SOLDE RESTANT DÛ)
                          </span>
                          <span className="text-xs text-gray-200 font-normal">
                            ≈ {formatMoney(balanceRemainingXaf)} FCFA
                          </span>
                        </div>
                      </td>
                      <td className="border border-[#204B57] py-2.5 px-3 text-right pr-4 text-amber-200 font-black text-sm">
                        AED {formatNumber(balanceRemainingAed, 2)}
                      </td>
                      <td className="border border-[#204B57] py-2.5 px-3 text-right pr-4 text-white text-base font-black bg-[#163842]">
                        ${formatNumber(balanceRemainingUsd, 2)}
                      </td>
                      <td className="border border-[#204B57] bg-[#204B57]"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-[#E8D8BE] shadow-xs">
            <div className="text-xs text-gray-600">
              <span className="font-bold text-[#192A24]">Validation de la vente : </span>
              Déduit automatiquement <strong>{formatNumber(totalPureWeight24k, 2)} g (24K)</strong> du stock
              et ajoute les acomptes reçus au stock de devises ({formatNumber(totalAdvancesUsd, 2)} USD équivalent).
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBars([]);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-50 text-gray-600 cursor-pointer"
              >
                Réinitialiser
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-black shadow-xs cursor-pointer transition-colors"
              >
                Enregistrer la vente & Déduire le stock
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 2: HISTORIQUE DES VENTES & GESTION DES ACOMPTES       */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <AppPanel className="bg-gradient-to-br from-[#192A24] to-[#253D34] text-white">
              <span className="text-[11px] uppercase tracking-wider text-gray-300 font-bold">
                Chiffre d'Affaires Brut (Ventes)
              </span>
              <div className="text-2xl font-black text-amber-300 mt-1 font-mono">
                ${formatNumber(totalSalesRevenueUsd, 2)}
              </div>
              <div className="text-[11px] text-gray-300 mt-1">
                ≈ {formatMoney(Math.round(totalSalesRevenueUsd * usdToXafRate))} FCFA
              </div>
            </AppPanel>

            <AppPanel className="bg-emerald-50/60 border-emerald-200">
              <span className="text-[11px] uppercase tracking-wider text-emerald-800 font-bold">
                Acomptes & Avances Encaissés
              </span>
              <div className="text-2xl font-black text-emerald-900 mt-1 font-mono">
                ${formatNumber(totalSalesAdvancesUsd, 2)}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1">
                ≈ {formatMoney(Math.round(totalSalesAdvancesUsd * usdToXafRate))} FCFA encaissés
              </div>
            </AppPanel>

            <AppPanel className="bg-amber-50/60 border-amber-200">
              <span className="text-[11px] uppercase tracking-wider text-amber-900 font-bold">
                Soldes Restants Dûs (Balances)
              </span>
              <div className="text-2xl font-black text-amber-950 mt-1 font-mono">
                ${formatNumber(totalRemainingBalanceUsd, 2)}
              </div>
              <div className="text-[11px] text-amber-800 mt-1 font-semibold">
                ≈ {formatMoney(Math.round(totalRemainingBalanceUsd * usdToXafRate))} FCFA en attente
              </div>
            </AppPanel>
          </div>

          {/* Sales List Table */}
          <AppPanel padding="p-0" className="overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#E8D8BE] bg-[#FAF8F3] flex items-center justify-between">
              <div>
                <SectionHeading title="Toutes les ventes et bordereaux d'export" />
                <span className="text-xs text-gray-500">
                  Cliquez sur un bordereau pour afficher la feuille complète de règlement ou ajouter un acompte.
                </span>
              </div>
              <button
                onClick={() => setActiveTab('new_sale')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-bold shadow-2xs"
              >
                <Plus size={14} />
                <span>Nouveau bordereau</span>
              </button>
            </div>

            {store.saleRecords.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-500 space-y-2">
                <FileSpreadsheet size={32} className="mx-auto text-gray-300" />
                <div className="font-bold text-gray-700">Aucun bordereau de vente enregistré.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F3] border-b border-[#E8D8BE] text-[11px] font-bold text-[#7D8176] uppercase tracking-wider">
        
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">N°</th>
                      <th className="py-3 px-4">Poids Brut / Pur (24K)</th>
                      <th className="py-3 px-4">Total Fixé ($)</th>
                      <th className="py-3 px-4">Acomptes Reçus</th>
                      <th className="py-3 px-4">Solde Dû (Balance)</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {store.saleRecords.map((sale) => (
                      <tr key={sale.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-black text-[#D39725]">{sale.reference}</td>
                        <td className="py-3.5 px-4 text-gray-600 font-normal">{sale.date}</td>
                        <td className="py-3.5 px-4 font-bold text-[#192A24] font-sans">
                          {sale.clientName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold">{formatNumber(sale.totalGeneralWeightGrams, 1)} g brut</span>
                          <span className="text-[10px] text-gray-500 block">
                            {formatNumber(sale.totalPureWeight24kGrams, 2)} g pur ({formatNumber(sale.totalPureOunces, 2)} oz)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-black text-gray-900">
                          ${formatNumber(sale.grossRevenueUsd, 2)}
                        </td>
                        <td className="py-3.5 px-4 text-emerald-700 font-bold">
                          ${formatNumber(sale.totalAdvancesUsd, 2)}
                          <span className="text-[10px] text-emerald-600 block">
                            {formatMoney(sale.advances.reduce((sum, advance) => sum + (advance.amountXaf || 0), 0))} FCFA · {sale.advances.length} acompte{sale.advances.length > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-black">
                          {sale.balanceRemainingUsd > 0.01 ? (
                            <span className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              ${formatNumber(sale.balanceRemainingUsd, 2)}
                              <span className="text-[10px] text-amber-800 block">
                                {formatMoney(sale.balanceRemainingXaf ?? Math.round(sale.balanceRemainingUsd * (sale.usdToXafRate ?? 0)))} FCFA
                              </span>
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold">$0.00</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sale.status === 'settled' || sale.balanceRemainingUsd <= 0.01
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {sale.status === 'settled' || sale.balanceRemainingUsd <= 0.01
                              ? 'Soldé'
                              : 'Solde restant'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans space-x-1.5 whitespace-nowrap">
                          {sale.balanceRemainingUsd > 0.01 && (
                            <button
                              onClick={() => {
                                openAdvanceModal(sale);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold cursor-pointer"
                            >
                              + Acompte
                            </button>
                          )}
                          <button
                            onClick={() => setViewingSale(sale)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye size={12} />
                            <span>Bordereau</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AppPanel>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: VIEW FULL SETTLEMENT SHEET                      */}
      {/* ======================================================== */}
      {viewingSale && (
        <Modal
          isOpen={Boolean(viewingSale)}
          onClose={() => setViewingSale(null)}
          title={`Bordereau Officiel de Vente & Règlement · ${viewingSale.reference}`}
          maxWidth="max-w-4xl"
        >
          <DubaiSettlementSheet
            sale={viewingSale}
            onSaveBars={(saleId, bars) => {
              const updatedSale = store.updateSaleRecordBars(saleId, bars);
              setViewingSale(updatedSale);
              return updatedSale;
            }}
            onSaveFixings={(saleId, fixings) => {
              const updatedSale = store.updateSaleFixings(saleId, fixings);
              setViewingSale(updatedSale);
              return updatedSale;
            }}
            onAddAdvance={(sale) => {
              setViewingSale(null);
              openAdvanceModal(sale);
            }}
          />
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD ADVANCE (ACOMPTE) ON EXISTING SALE          */}
      {/* ======================================================== */}
      {advanceSaleModal && (
        <Modal
          isOpen={Boolean(advanceSaleModal)}
          onClose={() => setAdvanceSaleModal(null)}
          title={`Enregistrer un Acompte · ${advanceSaleModal.reference}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleExecuteAddAdvance} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-[#192A24]">Client :</span>
                <span className="font-black text-[#192A24]">{advanceSaleModal.clientName}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">Total brut fixé :</span>
                <span className="font-mono font-bold">${formatNumber(advanceSaleModal.grossRevenueUsd, 2)}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">Déjà versé :</span>
                <span className="font-mono font-bold text-emerald-700">
                  ${formatNumber(advanceSaleModal.totalAdvancesUsd, 2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-amber-200">
                <span className="font-bold text-amber-950">Solde restant dû :</span>
                <span className="font-mono font-black text-amber-900 text-sm">
                  ${formatNumber(advanceSaleModal.balanceRemainingUsd, 2)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE] space-y-3">
              <div className="font-bold text-[#192A24]">Coordonnées à afficher sur le bordereau</div>
              {advanceSaleModal.clientReference && (
                <div className="text-[11px] text-gray-500">Référence client : {advanceSaleModal.clientReference}</div>
              )}
              <label className="block">
                Nom du client
                <input required value={advanceClientName} onChange={(event) => setAdvanceClientName(event.target.value)} className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE]" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  Téléphone
                  <input value={advanceClientPhone} onChange={(event) => setAdvanceClientPhone(event.target.value)} className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE]" />
                </label>
                <label>
                  Ville
                  <input value={advanceClientCity} onChange={(event) => setAdvanceClientCity(event.target.value)} className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE]" />
                </label>
                <label>
                  E-mail
                  <input type="email" value={advanceClientEmail} onChange={(event) => setAdvanceClientEmail(event.target.value)} className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE]" />
                </label>
                <label>
                  Banque du client
                  <input value={advanceClientBank} onChange={(event) => setAdvanceClientBank(event.target.value)} className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE]" />
                </label>
                <label className="col-span-2">
                  Compte bancaire du client
                  <input value={advanceClientBankAccount} onChange={(event) => setAdvanceClientBankAccount(event.target.value)} className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE]" />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">
                Libellé de l'acompte *
              </label>
              <input
                type="text"
                required
                value={newAdvanceLabel}
                onChange={(e) => setNewAdvanceLabel(e.target.value)}
                placeholder="ex: Transfer from Lot 2 / Acompte espèces"
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold text-[#192A24]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#192A24] mb-1">
                  Montant de l'acompte (USD $) *
                </label>
                <input
                  type="text"
                  required
                  value={newAdvanceAmountUsd}
                  onChange={(e) => setNewAdvanceAmountUsd(e.target.value)}
                  placeholder="ex: 3866.03"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-400 font-mono font-black text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#192A24] mb-1">
                  Date de versement *
                </label>
                <input
                  type="text"
                  required
                  value={newAdvanceDate}
                  onChange={(e) => setNewAdvanceDate(e.target.value)}
                  placeholder="28/10/2026"
                  className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-mono"
                />
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
              Acompte ajouté au stock USD :{' '}
              {formatNumber(parseFloat(newAdvanceAmountUsd.replace(',', '.') || '0'), 2)} USD
            </div>

            {parseFloat(newAdvanceAmountUsd.replace(',', '.') || '0') > 0 && (
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-900 text-[11px] font-semibold">
                Contre-valeur indicative :{' '}
                <strong>
                  {formatMoney(
                    Math.round(
                      parseFloat(newAdvanceAmountUsd.replace(',', '.') || '0') *
                        (advanceSaleModal.usdToXafRate ?? 0)
                    )
                  )}{' '}
                  FCFA
                </strong>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setAdvanceSaleModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
              >
                Valider l'acompte
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
