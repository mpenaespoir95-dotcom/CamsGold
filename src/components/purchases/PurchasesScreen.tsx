import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, setDoc } from 'firebase/firestore';
import {
  Plus,
  Search,
  Filter,
  DollarSign,
  Printer,
  XCircle,
  AlertTriangle,
  CreditCard,
  Building2,
  RefreshCw,
  Scale,
  BarChart2,
  Pencil,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { AppPanel, Modal, SectionHeading } from '../common/UIComponents';
import {
  computeComptoirGoldPurchasePrice,
  calculateCrudeGoldPricePerKaratGramXaf,
  formatPriceCard,
  formatMoney,
  formatNumber,
  formatDate,
  formatDateTime,
  goldKaratValue,
} from '../../utils/goldMath';
import { GoldPriceService } from '../../services/goldPriceService';
import { ExchangeRateService } from '../../services/exchangeRateService';
import { GoldCategory, PurchaseRecord, GoldPriceQuote } from '../../types';
import { db, firebaseApp } from '../../firebase/config';

const sendPurchaseSlipToWhatsApp = httpsCallable<
  { purchaseId: string },
  { sent: boolean; alreadySent?: boolean }
>(getFunctions(firebaseApp, 'us-central1'), 'sendGoldPurchaseSlip');

const removeUndefinedValues = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedValues);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, fieldValue]) => fieldValue !== undefined)
        .map(([key, fieldValue]) => [key, removeUndefinedValues(fieldValue)])
    );
  }
  return value;
};

const getWhatsAppErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') return String(error);

  const callableError = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    customData?: { details?: unknown };
  };
  const message =
    typeof callableError.message === 'string' ? callableError.message.trim() : '';
  const details =
    typeof callableError.details === 'string'
      ? callableError.details
      : typeof callableError.customData?.details === 'string'
        ? callableError.customData.details
        : '';

  if (details) return details;
  if (message && !/^internal(?:\s*\[\d+\])?$/i.test(message)) return message;
  if (callableError.code === 'functions/internal') {
    return 'La fonction WhatsApp déployée ne fournit pas le diagnostic détaillé. Redéployez la fonction Firebase, puis réessayez. Commande : firebase deploy --only functions:sendGoldPurchaseSlip';
  }
  return message || 'Erreur inconnue pendant l’envoi WhatsApp.';
};

interface PurchaseLine {
  id: number;
  weight: string;
  nonGoldWeight: string;
  karat: string;
  goldCategory: GoldCategory;
  manualPricePerGram: string;
}

const createPurchaseLine = (id: number): PurchaseLine => ({
  id,
  weight: '',
  nonGoldWeight: '0',
  karat: '22',
  goldCategory: 'Or brut',
  manualPricePerGram: '',
});

export const PurchasesScreen: React.FC<{
  onFormVisibilityChanged?: (isOpen: boolean) => void;
}> = ({ onFormVisibilityChanged }) => {
  const store = useAppStore();
  const isAdmin = store.currentRole === 'ADMIN';

  const [showingForm, setShowingForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseRecord | null>(null);
  const [filter, setFilter] = useState<'Tous' | 'En cours' | 'Soldés' | 'Annulés'>('Tous');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [seller, setSeller] = useState('');
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([createPurchaseLine(1)]);
  const [paymentAccount, setPaymentAccount] = useState<string>('Caisse (espèces)');
  const [initialPayment, setInitialPayment] = useState('');
  const [notes, setNotes] = useState('');
  const [goldPriceOunce, setGoldPriceOunce] = useState('');
  const [silverPriceOunce, setSilverPriceOunce] = useState('');
  const [usdRate, setUsdRate] = useState('');
  const [useParallelRate, setUseParallelRate] = useState<boolean>(() => {
    return Boolean(store.purchaseFormulaConfig.useParallelRateInPurchases);
  });

  // Live market quote states
  const [liveGoldQuote, setLiveGoldQuote] = useState<GoldPriceQuote | null>(null);
  const [liveSilverQuote, setLiveSilverQuote] = useState<GoldPriceQuote | null>(null);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  const [lastRatesUpdated, setLastRatesUpdated] = useState<string | null>(null);
  const [ratesSource, setRatesSource] = useState<string>('API Marché direct');

  // Modals
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);
  const [cancellingPurchase, setCancellingPurchase] = useState<PurchaseRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [paymentPurchase, setPaymentPurchase] = useState<PurchaseRecord | null>(null);
  const [additionalPaymentAmount, setAdditionalPaymentAmount] = useState('');
  const [additionalPaymentAccount, setAdditionalPaymentAccount] = useState('Caisse (espèces)');
  const [additionalPaymentNote, setAdditionalPaymentNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [whatsappNotice, setWhatsappNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [whatsappRetryPurchases, setWhatsappRetryPurchases] = useState<PurchaseRecord[]>([]);

  const toggleForm = (open: boolean) => {
    setShowingForm(open);
    onFormVisibilityChanged?.(open);
  };

  const refreshLiveMarketRates = async () => {
    setIsRefreshingRates(true);
    try {
      const [metals, fx] = await Promise.all([
        GoldPriceService.fetchLiveMetals(),
        ExchangeRateService.fetchRates(),
      ]);

      if (metals.gold) {
        setLiveGoldQuote(metals.gold);
        setGoldPriceOunce(metals.gold.pricePerTroyOunceUsd.toFixed(2));
      }
      if (metals.silver) {
        setLiveSilverQuote(metals.silver);
        setSilverPriceOunce(metals.silver.pricePerTroyOunceUsd.toFixed(2));
      }
      if (fx.usdRates && fx.usdRates['XAF']) {
        setUsdRate(fx.usdRates['XAF'].toFixed(2));
      }
      setRatesSource(`${metals.source} · ${fx.source || 'open.er-api.com'}`);
      setLastRatesUpdated(new Date().toISOString());
    } catch (err) {
      console.warn('Live rates refresh failed:', err);
    } finally {
      setIsRefreshingRates(false);
    }
  };

  useEffect(() => {
    refreshLiveMarketRates();
  }, []);

  const ounceNum = parseFloat(goldPriceOunce.replace(',', '.') || '0');
  const usdRateNum = parseFloat(usdRate.replace(',', '.') || '0');

  const getPurchaseLineCalculations = (line: PurchaseLine) => {
    const grossWeightNum = parseFloat(line.weight.replace(',', '.') || '0');
    const nonGoldWeightNum = parseFloat(line.nonGoldWeight.replace(',', '.') || '0');
    const netWeightNum = Math.max(0, grossWeightNum - nonGoldWeightNum);
    const karatNum = goldKaratValue(line.karat) || 22;
    const formulaResult = computeComptoirGoldPurchasePrice({
      pricePerTroyOunceUsd: ounceNum,
      usdToXafRate: usdRateNum,
      karat: karatNum,
      category: line.goldCategory,
      config: store.purchaseFormulaConfig,
    });
    const formulaCalculatedPrice = useParallelRate
      ? formulaResult.parallelPricePerGram
      : formulaResult.pricePerGram;
    const effectivePricePerGram = line.manualPricePerGram.trim()
      ? parseFloat(line.manualPricePerGram.replace(',', '.'))
      : formulaCalculatedPrice;
    return {
      grossWeightNum,
      nonGoldWeightNum,
      netWeightNum,
      karatNum,
      formulaCalculatedPrice,
      effectivePricePerGram,
      totalPurchasePrice: Math.round(netWeightNum * effectivePricePerGram),
    };
  };

  const totalPurchasePrice = purchaseLines.reduce(
    (total, line) => total + getPurchaseLineCalculations(line).totalPurchasePrice,
    0
  );
  const updatePurchaseLine = (id: number, updates: Partial<PurchaseLine>) => {
    setPurchaseLines((lines) =>
      lines.map((line) => (line.id === id ? { ...line, ...updates } : line))
    );
  };

  const getPurchaseSupplier = (purchase: PurchaseRecord) => {
    const supplier = purchase.supplier?.trim();
    if (supplier) return supplier;

    const descriptionParts = purchase.description.split(' · ');
    return descriptionParts.length > 2 && descriptionParts[1].trim()
      ? descriptionParts[1].trim()
      : 'Fournisseur inconnu';
  };

  const handleEditPurchase = (purchase: PurchaseRecord) => {
    const grossWeight = purchase.grossWeightGrams ?? purchase.netWeightGrams ?? 0;
    const netWeight = purchase.netWeightGrams ?? grossWeight;
    const karat = parseFloat(purchase.karat || '') || 22;
    const pricePerGram =
      purchase.referencePricePerGram ??
      (netWeight > 0 ? purchase.amount / netWeight : 0);

    setEditingPurchase(purchase);
    setSeller(getPurchaseSupplier(purchase));
    setPurchaseLines([
      {
        id: 1,
        weight: String(grossWeight),
        nonGoldWeight: String(purchase.nonGoldWeightGrams ?? Math.max(0, grossWeight - netWeight)),
        karat: String(karat),
        goldCategory: purchase.goldCategory,
        manualPricePerGram: String(pricePerGram),
      },
    ]);
    setInitialPayment('');
    setGoldPriceOunce(String(purchase.goldPricePerTroyOunceUsd ?? ''));
    setUsdRate(String(purchase.usdToXafRate ?? ''));
    setErrorMessage(null);
    setSelectedPurchase(null);
    toggleForm(true);
  };

  const sendPurchaseSlips = async (purchases: PurchaseRecord[]) => {
    await Promise.all(
      purchases.map((purchase) => {
        const purchaseData = removeUndefinedValues(purchase);
        if (!purchaseData || typeof purchaseData !== 'object' || Array.isArray(purchaseData)) {
          throw new Error(`Les données de l’achat ${purchase.reference} sont invalides.`);
        }
        return setDoc(doc(db, 'purchases', purchase.id), {
          ...purchaseData,
          updatedAt: new Date().toISOString(),
        });
      })
    );
    const results = await Promise.allSettled(
      purchases.map((purchase) => sendPurchaseSlipToWhatsApp({ purchaseId: purchase.id }))
    );
    const failedResults = results.filter((result) => result.status === 'rejected');
    const failedPurchases = purchases.filter((_, index) => results[index].status === 'rejected');
    const firstError =
      failedResults[0]?.status === 'rejected'
        ? getWhatsAppErrorMessage(failedResults[0].reason)
        : '';
    setWhatsappRetryPurchases(failedPurchases);
    setWhatsappNotice(
      failedPurchases.length === 0
        ? {
            type: 'success',
            message: `Bordereau${purchases.length > 1 ? 'x' : ''} envoyé${purchases.length > 1 ? 's' : ''} automatiquement sur WhatsApp.`,
          }
        : {
            type: 'error',
            message: `Achat enregistré, mais l’envoi WhatsApp a échoué pour ${failedPurchases.length} bordereau(x). ${firstError}`,
          }
    );
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const supplier = seller.trim();
    if (!supplier) {
      setErrorMessage('Veuillez sélectionner un fournisseur ou vendeur.');
      return;
    }
    const initPay = initialPayment.trim() ? parseFloat(initialPayment.replace(',', '.')) : 0;
    if (!Number.isFinite(initPay) || initPay < 0 || initPay > totalPurchasePrice) {
      setErrorMessage('Le montant réglé doit être compris entre zéro et le total des achats.');
      return;
    }

    const lineCalculations = purchaseLines.map((line) => ({
      line,
      ...getPurchaseLineCalculations(line),
    }));
    for (const { line, grossWeightNum, netWeightNum, effectivePricePerGram } of lineCalculations) {
      if (grossWeightNum <= 0) {
        setErrorMessage(`Le poids brut de la ligne ${line.id} doit être supérieur à zéro.`);
        return;
      }
      if (netWeightNum <= 0) {
        setErrorMessage(`Le poids net de la ligne ${line.id} doit être supérieur à zéro.`);
        return;
      }
      if (!Number.isFinite(effectivePricePerGram) || effectivePricePerGram <= 0) {
        setErrorMessage(`Le prix d’achat par gramme de la ligne ${line.id} doit être supérieur à zéro.`);
        return;
      }
    }

    let newlyCreatedPurchases: PurchaseRecord[] = [];
    try {
      if (editingPurchase) {
        const {
          line,
          grossWeightNum,
          nonGoldWeightNum,
          netWeightNum,
          karatNum,
          effectivePricePerGram,
          totalPurchasePrice: lineTotal,
        } = lineCalculations[0];
        store.updatePurchase(editingPurchase.id, {
          description: `${formatDate(new Date(editingPurchase.purchasedAt))} · ${supplier} · ${line.goldCategory} · ${netWeightNum.toFixed(2)} g net · ${karatNum}K · ${formatMoney(lineTotal)} FCFA`,
          price: lineTotal,
          supplier,
          grossWeightGrams: grossWeightNum,
          nonGoldWeightGrams: nonGoldWeightNum,
          karat: `${karatNum}K`,
          goldCategory: line.goldCategory,
          purityPercent: (karatNum / 24) * 100,
          referencePricePerGram: effectivePricePerGram,
          goldPricePerTroyOunceUsd: ounceNum,
          usdToXafRate: usdRateNum,
        });
      } else {
        let paymentRemaining = initPay;
        newlyCreatedPurchases = store.addPurchases(
          lineCalculations.map(({
            line,
            grossWeightNum,
            nonGoldWeightNum,
            netWeightNum,
            karatNum,
            effectivePricePerGram,
            totalPurchasePrice: lineTotal,
          }) => {
            const linePayment = Math.min(lineTotal, paymentRemaining);
            paymentRemaining -= linePayment;
            return {
              description: `${formatDate(new Date())} · ${supplier} · ${line.goldCategory} · ${netWeightNum.toFixed(2)} g net · ${karatNum}K · ${formatMoney(lineTotal)} FCFA`,
              price: lineTotal,
              paymentAccount: linePayment > 0 ? paymentAccount : undefined,
              initialPaymentAmount: linePayment,
              supplier,
              grossWeightGrams: grossWeightNum,
              nonGoldWeightGrams: nonGoldWeightNum,
              karat: `${karatNum}K`,
              goldCategory: line.goldCategory,
              purityPercent: (karatNum / 24) * 100,
              referencePricePerGram: effectivePricePerGram,
              goldPricePerTroyOunceUsd: ounceNum,
              usdToXafRate: usdRateNum,
            };
          })
        );
      }

      // Reset form
      setPurchaseLines([createPurchaseLine(1)]);
      setInitialPayment('');
      setNotes('');
      setSeller('');
      setEditingPurchase(null);
      toggleForm(false);
      setWhatsappNotice(null);
      setWhatsappRetryPurchases([]);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      return;
    }

    if (newlyCreatedPurchases.length > 0) {
      try {
        await sendPurchaseSlips(newlyCreatedPurchases);
      } catch (err: unknown) {
        setWhatsappRetryPurchases(newlyCreatedPurchases);
        setWhatsappNotice({
          type: 'error',
          message: `Achat enregistré, mais le bordereau n’a pas pu être envoyé sur WhatsApp. ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
  };

  const handleConfirmCancel = () => {
    if (!isAdmin) {
      setErrorMessage('Seul un administrateur peut annuler un achat enregistré.');
      setCancellingPurchase(null);
      return;
    }
    if (!cancellingPurchase) return;
    if (!cancelReason.trim()) {
      alert('Veuillez indiquer un motif d’annulation.');
      return;
    }
    try {
      store.cancelPurchase(cancellingPurchase.id, cancelReason);
      setCancellingPurchase(null);
      setCancelReason('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentPurchase) return;
    const amount = parseFloat(additionalPaymentAmount.replace(',', '.') || '0');
    if (amount <= 0) {
      alert('Le montant du règlement doit être positif.');
      return;
    }
    try {
      store.addPurchasePayment(paymentPurchase.id, {
        amount,
        method: 'Règlement solde',
        account: additionalPaymentAccount,
        note: additionalPaymentNote,
      });
      setPaymentPurchase(null);
      setAdditionalPaymentAmount('');
      setAdditionalPaymentNote('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Filtered purchases
  const filteredPurchases = store.purchases.filter((p) => {
    if (filter === 'Annulés' && !p.cancelledAt) return false;
    if (filter === 'Soldés') {
      const paid = p.payments.reduce((sum, pay) => sum + pay.amount, 0);
      if (p.cancelledAt || paid < p.amount) return false;
    }
    if (filter === 'En cours') {
      const paid = p.payments.reduce((sum, pay) => sum + pay.amount, 0);
      if (p.cancelledAt || paid >= p.amount) return false;
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        p.reference.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        (p.supplier && p.supplier.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const selectedPurchasePaid =
    selectedPurchase?.payments.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  const selectedPurchaseBalance = selectedPurchase
    ? selectedPurchase.amount - selectedPurchasePaid
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#192A24]">Achats d’Or brut & Bijoux</h2>
          <p className="text-xs text-[#7D8176] mt-0.5">
            Formules comptoir (Brut, Fondu, Bijoux), taux parallèle marché noir et enregistrement des paiements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (showingForm) {
                setEditingPurchase(null);
                setErrorMessage(null);
                toggleForm(false);
              } else {
                setEditingPurchase(null);
                setErrorMessage(null);
                setPurchaseLines([createPurchaseLine(1)]);
                setSeller('');
                setInitialPayment('');
                toggleForm(true);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              showingForm
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-[#D39725] hover:bg-[#c2871b] text-white shadow-xs'
            }`}
          >
            {showingForm ? 'Masquer formulaire' : '+ Nouvel achat d’or'}
          </button>
        </div>
      </div>

      {whatsappNotice && (
        <div
          role="status"
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border text-xs font-semibold ${
            whatsappNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{whatsappNotice.message}</span>
          {whatsappRetryPurchases.length > 0 && (
            <button
              type="button"
              onClick={() => void sendPurchaseSlips(whatsappRetryPurchases)}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-current font-bold hover:bg-gray-50 cursor-pointer"
            >
              Réessayer l’envoi
            </button>
          )}
        </div>
      )}

      {/* New Purchase Form Accordion */}
      {showingForm && (
        <AppPanel className="border-[#D39725]/40 bg-white shadow-md animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-[#E8D8BE] pb-3 mb-5">
            <div className="flex items-center gap-2 font-black text-sm text-[#192A24]">
              <Scale size={18} className="text-[#D39725]" />
              <span>{editingPurchase ? `Modifier l’achat ${editingPurchase.reference}` : 'Saisie d’un achat d’or comptoir'}</span>
            </div>
            <button
              onClick={() => {
                setEditingPurchase(null);
                setErrorMessage(null);
                toggleForm(false);
              }}
              className="text-xs text-gray-400 hover:text-gray-700 font-bold"
            >
              Fermer
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreatePurchase} className="space-y-5">
            <div>
              <div>
                <label className="block text-xs font-bold text-[#192A24] mb-1.5">
                  Fournisseur / Vendeur
                </label>
                <select
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold text-[#192A24] focus:outline-hidden focus:border-[#D39725]"
                >
                  <option value="" disabled hidden />
                  {seller && !store.contacts.some((contact) => contact.name === seller) && (
                    <option value={seller}>{seller}</option>
                  )}
                  {store.contacts
                    .filter((contact) =>
                      contact.roles.some((role) => {
                        const normalizedRole = role.toLowerCase();
                        return normalizedRole.includes('fournisseur') || normalizedRole.includes('client');
                      })
                    )
                    .map((contact) => (
                      <option key={contact.reference} value={contact.name}>
                        {contact.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {purchaseLines.map((line, index) => {
              const calculations = getPurchaseLineCalculations(line);
              return (
                <div key={line.id} className="space-y-4 rounded-2xl border border-[#E8D8BE] p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-[#192A24] mb-1.5">
                        Catégorie d’or · Ligne {index + 1}
                      </label>
                      <select
                        value={line.goldCategory}
                        onChange={(e) =>
                          updatePurchaseLine(line.id, { goldCategory: e.target.value as GoldCategory })
                        }
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold text-[#192A24] focus:outline-hidden focus:border-[#D39725]"
                      >
                        <option value="Or brut">Or brut</option>
                        <option value="Or fondu">Or fondu</option>
                        <option value="Bijoux">Bijoux</option>
                      </select>
                    </div>
                    {!editingPurchase && purchaseLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPurchaseLines((lines) => lines.filter((item) => item.id !== line.id))
                        }
                        className="px-3 py-2.5 rounded-lg border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#192A24] mb-1.5">
                  Poids brut total (grammes)
                </label>
                <input
                  type="text"
                  required
                  value={line.weight}
                  onChange={(e) => updatePurchaseLine(line.id, { weight: e.target.value })}
                  placeholder="ex: 12.5"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold text-[#192A24] focus:outline-hidden focus:border-[#D39725]"
                />
              </div>

              {/* Exact replica of User Screenshot 1 */}
              <div>
                <label className="block text-xs font-bold text-[#0D629E] mb-1.5">
                  Poids non-or (pierres, crasse)
                </label>
                <input
                  type="text"
                  value={line.nonGoldWeight}
                  onChange={(e) => updatePurchaseLine(line.id, { nonGoldWeight: e.target.value })}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 bg-[#FAF5EE] rounded-2xl border border-[#E0D0B5] text-xs font-bold text-[#192A24] focus:outline-hidden focus:border-[#0D629E] shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#192A24] mb-1.5">
                  Titre / Carat
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    step="any"
                    required
                    value={line.karat}
                    onChange={(e) => updatePurchaseLine(line.id, { karat: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold text-[#192A24] focus:outline-hidden focus:border-[#D39725]"
                  />
                  <div className="flex gap-1">
                    {['24', '22', '21', '18'].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => updatePurchaseLine(line.id, { karat: k })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                          line.karat === k
                            ? 'bg-[#D39725] text-white border-[#D39725]'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {k}K
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Net weight summary */}
              <div className="sm:col-span-3 flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs">
                <div className="text-gray-700">
                  Poids brut pesé : <strong>{formatNumber(calculations.grossWeightNum, 2)} g</strong> · Impuretés déduites :{' '}
                  <strong className="text-red-600">-{formatNumber(calculations.nonGoldWeightNum, 2)} g</strong>
                </div>
                <div className="font-extrabold text-[#D39725] text-sm">
                  Poids net or calculé : {formatNumber(calculations.netWeightNum, 2)} g
                </div>
              </div>

              <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE]">
                <label className="block text-xs font-bold text-[#192A24]">
                  Modifier le prix d’achat par gramme (FCFA / g)
                  <input
                    type="text"
                    value={line.manualPricePerGram}
                    onChange={(e) =>
                      updatePurchaseLine(line.id, { manualPricePerGram: e.target.value })
                    }
                    placeholder={`Automatique : ${formatPriceCard(calculations.formulaCalculatedPrice, 2)} FCFA / g`}
                    className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE] text-xs font-bold text-[#192A24] focus:outline-hidden focus:border-[#D39725]"
                  />
                  <span className="mt-1 block text-[10px] font-medium text-[#7D8176]">
                    Laissez vide pour utiliser le cours automatique. Le total est calculé avec le poids net.
                  </span>
                </label>
                <div className="flex flex-col justify-center sm:items-end">
                  <span className="text-[11px] text-[#7D8176]">
                    Prix d’achat : {formatPriceCard(calculations.effectivePricePerGram, 2)} FCFA / g
                  </span>
                  <strong className="mt-1 text-base text-[#008B62]">
                    Total ligne : {formatMoney(calculations.totalPurchasePrice)} FCFA
                  </strong>
                </div>
              </div>
                </div>
              </div>
              );
            })}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {!editingPurchase && (
                <button
                  type="button"
                  aria-label="Ajouter une autre catégorie d’or"
                  title="Ajouter une autre catégorie d’or"
                  onClick={() =>
                    setPurchaseLines((lines) => [
                      ...lines,
                      createPurchaseLine(Math.max(...lines.map((line) => line.id)) + 1),
                    ])
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D39725] text-white hover:bg-[#c2871b] cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              )}
              <strong className="text-base text-[#008B62]">
                Total de l’achat : {formatMoney(totalPurchasePrice)} FCFA
              </strong>
            </div>

            {editingPurchase ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Paiements déjà enregistrés :{' '}
                <strong>
                  {formatMoney(
                    editingPurchase.payments.reduce((sum, payment) => sum + payment.amount, 0)
                  )}{' '}
                  FCFA
                </strong>
                . Ils sont conservés sans modification.
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-[#192A24] mb-1.5">
                  Montant réglé immédiatement (FCFA)
                </label>
                <input
                  type="text"
                  value={initialPayment}
                  onChange={(e) => setInitialPayment(e.target.value)}
                  placeholder={`Totalité (${formatMoney(totalPurchasePrice)} F)`}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs text-[#192A24] focus:outline-hidden focus:border-[#D39725]"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingPurchase(null);
                  setErrorMessage(null);
                  toggleForm(false);
                }}
                className="px-4 py-2.5 rounded-xl border border-[#E8D8BE] text-xs font-bold text-[#7D8176] hover:bg-gray-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#008B62] hover:bg-[#007452] text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                {editingPurchase ? 'Enregistrer les modifications' : "Enregistrer l'achat & valider le bon"}
              </button>
            </div>
          </form>
        </AppPanel>
      )}

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par référence, fournisseur..."
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-[#E8D8BE] text-xs focus:outline-hidden focus:border-[#D39725]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['Tous', 'En cours', 'Soldés', 'Annulés'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                filter === tab
                  ? 'bg-[#192A24] text-white shadow-2xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Purchases List */}
      <div className="space-y-3">
        {filteredPurchases.length === 0 ? (
          <AppPanel className="text-center py-10">
            <p className="text-xs text-gray-500">Aucun achat ne correspond aux critères.</p>
          </AppPanel>
        ) : (
          filteredPurchases.map((purchase) => {
            const totalPaid = purchase.payments.reduce((acc, p) => acc + p.amount, 0);
            const remaining = Math.max(0, purchase.amount - totalPaid);
            const isSettled = !purchase.cancelledAt && remaining === 0;

            return (
              <AppPanel
                key={purchase.id}
                padding="p-4 sm:p-5"
                onClick={() => setSelectedPurchase(purchase)}
                className={`cursor-pointer transition-all hover:border-[#D39725]/50 ${
                  purchase.cancelledAt ? 'opacity-70 bg-gray-50' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        purchase.cancelledAt
                          ? 'bg-red-100 text-red-600'
                          : isSettled
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {purchase.karat || 'OR'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-[#D39725]">
                          {purchase.reference}
                        </span>
                        <span className="text-xs font-bold text-[#192A24]">
                          {getPurchaseSupplier(purchase)}
                        </span>
                        {purchase.cancelledAt ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold">
                            Annulé
                          </span>
                        ) : isSettled ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                            Soldé
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                            Reste: {formatMoney(remaining)} F
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[#7D8176] mt-1">
                        {formatDateTime(purchase.purchasedAt)} · {purchase.goldCategory} ·{' '}
                        {purchase.netWeightGrams || purchase.grossWeightGrams} g
                      </div>

                      {purchase.cancelledAt && (
                        <div className="text-[11px] text-red-600 mt-1 font-medium">
                          Motif annulation : {purchase.cancellationReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-left md:text-right">
                      <div className="text-base font-black text-[#192A24]">
                        {formatMoney(purchase.amount)} FCFA
                      </div>
                      <div className="text-[11px] text-[#7D8176]">
                        Payé : {formatMoney(totalPaid)} FCFA
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!purchase.cancelledAt && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditPurchase(purchase);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#D39725]/40 text-xs font-semibold text-[#9E731B] hover:bg-amber-50 cursor-pointer"
                          title="Modifier l'achat"
                        >
                          <Pencil size={13} />
                          Modifier
                        </button>
                      )}
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedPurchase(purchase);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 cursor-pointer"
                        title="Détails du bon d'achat"
                      >
                        Détails
                      </button>

                      {!purchase.cancelledAt && remaining > 0 && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setPaymentPurchase(purchase);
                            setAdditionalPaymentAmount(String(remaining));
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#008B62] hover:bg-[#007452] text-white text-xs font-bold cursor-pointer"
                        >
                          Régler solde
                        </button>
                      )}

                      {!purchase.cancelledAt && isAdmin && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setCancellingPurchase(purchase);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          title="Annuler l'achat"
                        >
                          <XCircle size={17} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </AppPanel>
            );
          })
        )}
      </div>

      {/* Modal Details / Print Invoice */}
      <Modal
        isOpen={Boolean(selectedPurchase)}
        onClose={() => setSelectedPurchase(null)}
        title={`Bordereau de Bon d'Achat d'Or · ${selectedPurchase?.reference || ''}`}
        maxWidth="max-w-3xl"
        printMode
      >
        {selectedPurchase && (
          <div className="purchase-slip-print space-y-6 print:p-0">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between no-print border-b border-gray-100 pb-3">
              <span className="text-xs text-gray-500 font-semibold">
                Bordereau prêt pour impression officielle
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#192A24] hover:bg-[#253D34] text-white text-xs font-black cursor-pointer shadow-md transition-colors"
              >
                <Printer size={15} />
                <span>Imprimer le Bon d'Achat</span>
              </button>
            </div>

            {/* Official Printable Sheet Container */}
            <div className="p-6 sm:p-8 bg-white border-2 border-[#192A24] rounded-2xl space-y-6 print:border-none print:p-0 shadow-sm">
              {/* Slip Official Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-[#192A24] pb-4 gap-4">
                <div>
                  <div className="text-xl font-black text-[#192A24] tracking-tight">
                    CAMS GOLD COMPTOIR
                  </div>
                  <div className="text-xs font-bold text-[#D39725] uppercase tracking-wider">
                    Achat · Analyse · Exportation d'Or & Métaux Précieux
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    Bordereau Officiel de Pesée & Règlement au Comptoir
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="inline-block px-3 py-1 rounded bg-[#192A24] text-white font-mono font-black text-xs uppercase tracking-wide">
                    BON D'ACHAT N° {selectedPurchase.reference}
                  </div>
                  <div className="text-xs text-gray-600 font-medium mt-1.5">
                    Date d'opération : <strong>{formatDate(selectedPurchase.purchasedAt)}</strong>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Opérateur : <strong>{store.userName}</strong> (Comptoir CAMS GOLD)
                  </div>
                </div>
              </div>

              {/* Vendor & Category Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="print-card p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                    Fournisseur / Vendeur
                  </span>
                  <div className="text-sm font-black text-[#192A24]">
                    {getPurchaseSupplier(selectedPurchase)}
                  </div>
                  <div className="text-[11px] text-gray-600">
                    Catégorie d'or : <strong className="text-[#D39725]">{selectedPurchase.goldCategory}</strong>
                  </div>
                </div>
              </div>

              {/* Technical Analysis & Weight Table */}
              <div className="print-card rounded-xl border border-gray-200 overflow-hidden text-xs">
                <div className="bg-[#FAF8F3] px-4 py-2 border-b border-[#E8D8BE] font-bold text-[#192A24] text-[11px] uppercase tracking-wider">
                  Détail de l'analyse physique & pesée certifiée
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-bold text-gray-500 uppercase">
                      <th className="py-2.5 px-3">Poids Brut</th>
                      <th className="py-2.5 px-3">Tare / Déchets</th>
                      <th className="py-2.5 px-3 font-bold text-gray-900">Poids Net</th>
                      <th className="py-2.5 px-3">Titre Carat</th>
                      <th className="py-2.5 px-3">Poids Fin 24K</th>
                      <th className="py-2.5 px-3 text-right">Prix Net / g</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono text-xs">
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-gray-700">
                        {formatNumber(selectedPurchase.grossWeightGrams || 0, 2)} g
                      </td>
                      <td className="py-2.5 px-3 text-gray-500">
                        {formatNumber(selectedPurchase.nonGoldWeightGrams || 0, 2)} g
                      </td>
                      <td className="py-2.5 px-3 font-black text-[#192A24]">
                        {formatNumber(selectedPurchase.netWeightGrams || selectedPurchase.grossWeightGrams || 0, 2)} g
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#D39725]">
                        {selectedPurchase.karat || '24K'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#192A24]">
                        {formatNumber(
                          ((selectedPurchase.netWeightGrams || selectedPurchase.grossWeightGrams || 0) *
                            (selectedPurchase.karat ? parseFloat(selectedPurchase.karat) || 24 : 24)) /
                            24,
                          3
                        )}{' '}
                        g
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-[#008B62]">
                        {formatMoney(selectedPurchase.referencePricePerGram)} FCFA
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Purchase payment status */}
              <div className="print-card p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Situation du règlement
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Montant total de l'achat</div>
                    <div className="font-bold text-gray-900">{formatMoney(selectedPurchase.amount)} FCFA</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Déjà réglé au fournisseur</div>
                    <div className="font-bold text-gray-900">{formatMoney(selectedPurchasePaid)} FCFA</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">
                      {selectedPurchaseBalance > 0
                        ? 'Reste à payer'
                        : selectedPurchaseBalance < 0
                        ? 'Trop-perçu'
                        : 'Solde'}
                    </div>
                    <div className="font-bold text-gray-900">
                      {formatMoney(Math.abs(selectedPurchaseBalance))} FCFA
                    </div>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {selectedPurchase.cancelledAt
                    ? `Achat annulé${selectedPurchase.cancellationReason ? ` : ${selectedPurchase.cancellationReason}` : '.'}`
                    : selectedPurchaseBalance > 0
                    ? `Nous devons ${formatMoney(selectedPurchaseBalance)} FCFA au fournisseur.`
                    : selectedPurchaseBalance < 0
                    ? `Le fournisseur nous doit ${formatMoney(Math.abs(selectedPurchaseBalance))} FCFA.`
                    : 'Aucun solde restant : le fournisseur a été entièrement payé.'}
                </p>
              </div>

              {/* Payments breakdown */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Modalités & Justificatifs de règlement
                </h4>
                {selectedPurchase.payments.length === 0 ? (
                  <div className="print-card text-xs text-gray-500 italic p-3 bg-gray-50 rounded-xl border border-gray-100">
                    Aucun règlement n’a encore été enregistré pour cet achat.
                  </div>
                ) : (
                  <div className="print-card divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden text-xs">
                    {selectedPurchase.payments.map((p, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between bg-white">
                        <div>
                          <div className="font-bold text-[#192A24]">{p.method}</div>
                          <div className="text-[11px] text-gray-500">
                            {formatDateTime(p.paidAt)} · Compte débité : <strong>{p.account || 'Caisse (espèces)'}</strong>
                            {p.note ? ` · ${p.note}` : ''}
                          </div>
                        </div>
                        <span className="font-black text-emerald-700">
                          {formatMoney(p.amount)} FCFA
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Legal Note & Signatures */}
              <div className="text-[10px] text-gray-500 leading-relaxed border-t border-gray-200 pt-3">
                * Le vendeur certifie sur l'honneur être le propriétaire légitime du lot d'or présenté et que ce dernier est exempt de tout gage ou litige. Ce bordereau tient lieu d'acte officiel d'achat et de décharge comptable conformément à la réglementation relative au commerce de l'or.
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4 border-t-2 border-dashed border-gray-300 text-xs">
                <div className="text-center space-y-12">
                  <span className="font-bold text-gray-700 block">
                    Signature & Empreinte du Vendeur / Fournisseur
                  </span>
                  <div className="border-t border-gray-400 w-3/4 mx-auto pt-1 text-[10px] text-gray-400">
                    Précédée de la mention "Lu et approuvé, bon pour accord"
                  </div>
                </div>

                <div className="text-center space-y-12">
                  <span className="font-bold text-gray-700 block">
                    Visa, Cachet & Signature du Comptoir CAMS GOLD
                  </span>
                  <div className="border-t border-gray-400 w-3/4 mx-auto pt-1 text-[10px] text-gray-400">
                    Le Peseur / Caissier habilité
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-3 no-print pt-2">
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#008B62] hover:bg-[#007452] text-white text-xs font-black cursor-pointer shadow-md"
              >
                <Printer size={15} />
                <span>Imprimer la fiche officielle</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Additional Payment */}
      <Modal
        isOpen={Boolean(paymentPurchase)}
        onClose={() => setPaymentPurchase(null)}
        title="Règlement de solde d'achat"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddPayment} className="space-y-4">
          <p className="text-xs text-gray-600">
            Achat : <strong>{paymentPurchase?.reference}</strong> ({paymentPurchase?.supplier})
          </p>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Montant à verser (FCFA)</label>
            <input
              type="text"
              required
              value={additionalPaymentAmount}
              onChange={(e) => setAdditionalPaymentAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Compte source</label>
            <select
              value={additionalPaymentAccount}
              onChange={(e) => setAdditionalPaymentAccount(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
            >
              {Object.entries(store.bankBalances).map(([b, bal]) => (
                <option key={b} value={b}>
                  {b} ({formatMoney(bal)} F)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Note / Réf reçu</label>
            <input
              type="text"
              value={additionalPaymentNote}
              onChange={(e) => setAdditionalPaymentNote(e.target.value)}
              placeholder="ex: Versement final solde"
              className="w-full px-3.5 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPaymentPurchase(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 border border-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#008B62] text-white"
            >
              Enregistrer le paiement
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Cancel Purchase */}
      <Modal
        isOpen={Boolean(cancellingPurchase)}
        onClose={() => setCancellingPurchase(null)}
        title="Annuler l'achat d'or"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Êtes-vous sûr de vouloir annuler l'achat{' '}
            <strong className="text-red-600">{cancellingPurchase?.reference}</strong> ? Les montants
            payés seront recrédités sur vos comptes de trésorerie et le stock déduit.
          </p>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Motif d'annulation obligatoire</label>
            <textarea
              required
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="ex: Erreur de pesée / Refus après coupellation..."
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs text-[#192A24]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCancellingPurchase(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 border border-gray-200"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 text-white"
            >
              Confirmer l'annulation
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
