import React, { useMemo, useState } from 'react';
import {
  FileBarChart,
  Printer,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Filter,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { AppPanel, PageHeading, SectionHeading } from '../common/UIComponents';
import { formatMoney } from '../../utils/goldMath';

type ReportTab = 'analytics' | 'breakdown' | 'receivables' | 'rankings' | 'ledger';
type OperationTypeFilter = 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'PURCHASE' | 'SALE' | 'EXCHANGE';
type PaymentModeFilter = 'ALL' | 'CASH' | 'BANK';

function parseDateValue(raw?: string): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00`);
  }
  const frMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (frMatch) {
    return new Date(`${frMatch[3]}-${frMatch[2]}-${frMatch[1]}T00:00:00`);
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export const ReportsScreen: React.FC = () => {
  const store = useAppStore();

  const [activeTab, setActiveTab] = useState<ReportTab>('analytics');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [opType, setOpType] = useState<OperationTypeFilter>('ALL');
  const [selectedContactId, setSelectedContactId] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paymentMode, setPaymentMode] = useState<PaymentModeFilter>('ALL');
  const [autoWhatsAppNotify, setAutoWhatsAppNotify] = useState(true);
  const [lastNotifiedOpId, setLastNotifiedOpId] = useState<string | null>(null);

  const selectedContact = useMemo(
    () => store.contacts.find((c) => c.id === selectedContactId) || null,
    [store.contacts, selectedContactId]
  );

  const matchesDateRange = (rawDate?: string) => {
    if (!startDate && !endDate) return true;
    const d = parseDateValue(rawDate);
    if (!d) return true;
    if (startDate) {
      const s = new Date(`${startDate}T00:00:00`);
      if (d < s) return false;
    }
    if (endDate) {
      const e = new Date(`${endDate}T23:59:59`);
      if (d > e) return false;
    }
    return true;
  };

  const matchesContact = (text?: string) => {
    if (selectedContactId === 'ALL' || !selectedContact) return true;
    const target = (text || '').toLowerCase();
    return target.includes(selectedContact.name.toLowerCase());
  };

  const matchesPaymentMode = (text?: string) => {
    if (paymentMode === 'ALL') return true;
    const t = (text || '').toLowerCase();
    const isBank = t.includes('banque') || t.includes('virement') || t.includes('bank') || t.includes('ecobank') || t.includes('uba') || t.includes('bicec') || t.includes('afriland') || t.includes('sgbc');
    if (paymentMode === 'BANK') return isBank;
    return !isBank;
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    store.operations.forEach((op) => {
      if (op.title) set.add(op.title);
    });
    return Array.from(set).sort();
  }, [store.operations]);

  const filteredOperations = useMemo(() => {
    return store.operations.filter((op) => {
      if (!matchesDateRange(op.date)) return false;
      if (!matchesContact(`${op.title} ${op.subtitle}`)) return false;
      if (!matchesPaymentMode(`${op.title} ${op.subtitle}`)) return false;
      if (categoryFilter !== 'ALL' && op.title !== categoryFilter) return false;
      if (opType === 'INCOME' && (!op.isIncome || op.isTransfer)) return false;
      if (opType === 'EXPENSE' && (op.isIncome || op.isTransfer)) return false;
      if (opType === 'TRANSFER' && !op.isTransfer) return false;
      if (opType === 'PURCHASE' && !op.title.toLowerCase().includes('achat')) return false;
      if (opType === 'SALE' && !op.title.toLowerCase().includes('vente')) return false;
      if (opType === 'EXCHANGE' && !op.title.toLowerCase().includes('change') && !op.title.toLowerCase().includes('devise')) return false;
      return true;
    });
  }, [store.operations, startDate, endDate, selectedContactId, selectedContact, paymentMode, categoryFilter, opType]);

  const filteredPurchases = useMemo(() => {
    return store.purchases.filter((p) => {
      if (!matchesDateRange(p.purchasedAt)) return false;
      if (!matchesContact(p.supplier)) return false;
      return true;
    });
  }, [store.purchases, startDate, endDate, selectedContactId, selectedContact]);

  const filteredSales = useMemo(() => {
    return store.saleRecords.filter((s) => {
      if (!matchesDateRange(s.date)) return false;
      if (!matchesContact(s.clientName)) return false;
      return true;
    });
  }, [store.saleRecords, startDate, endDate, selectedContactId, selectedContact]);

  const filteredExchanges = useMemo(() => {
    return store.currencyStockMovements.filter((m) => {
      if (!matchesDateRange(m.date)) return false;
      if (!matchesContact(m.label)) return false;
      return true;
    });
  }, [store.currencyStockMovements, startDate, endDate, selectedContactId, selectedContact]);

  const incomeTotal = useMemo(
    () => filteredOperations.filter((op) => op.isIncome && !op.isTransfer).reduce((sum, op) => sum + op.amount, 0),
    [filteredOperations]
  );

  const expensesTotal = useMemo(
    () => filteredOperations.filter((op) => !op.isIncome && !op.isTransfer).reduce((sum, op) => sum + op.amount, 0),
    [filteredOperations]
  );

  const transfersTotal = useMemo(
    () => filteredOperations.filter((op) => op.isTransfer).reduce((sum, op) => sum + op.amount, 0),
    [filteredOperations]
  );

  const totalPurchasesAmount = useMemo(
    () => filteredPurchases.reduce((sum, p) => sum + p.amount, 0),
    [filteredPurchases]
  );

  const totalSalesAmount = useMemo(
    () => filteredSales.reduce((sum, s) => sum + (s.grossRevenueXaf ?? s.grossRevenueUsd * (s.usdToXafRate ?? 600)), 0),
    [filteredSales]
  );

  const lossesTotal = useMemo(
    () =>
      filteredOperations
        .filter((op) => !op.isIncome && (op.title.toLowerCase().includes('perte') || op.title.toLowerCase().includes('écart') || op.title.toLowerCase().includes('manquant')))
        .reduce((sum, op) => sum + op.amount, 0),
    [filteredOperations]
  );

  const operatingExpensesTotal = useMemo(
    () =>
      filteredOperations
        .filter(
          (op) =>
            !op.isIncome &&
            !op.isTransfer &&
            !op.title.toLowerCase().includes('achat') &&
            !op.title.toLowerCase().includes('perte')
        )
        .reduce((sum, op) => sum + op.amount, 0),
    [filteredOperations]
  );

  // Entrées à recevoir & Sorties à payer
  const pendingReceivables = useMemo(
    () => filteredOperations.filter((op) => !op.isProcessed && op.isIncome && !op.isTransfer),
    [filteredOperations]
  );
  const pendingPayables = useMemo(
    () => filteredOperations.filter((op) => !op.isProcessed && !op.isIncome && !op.isTransfer),
    [filteredOperations]
  );

  const totalReceivables = useMemo(
    () => pendingReceivables.reduce((sum, op) => sum + op.amount, 0),
    [pendingReceivables]
  );
  const totalPayables = useMemo(
    () => pendingPayables.reduce((sum, op) => sum + op.amount, 0),
    [pendingPayables]
  );

  // Classement Meilleurs Fournisseurs & Clients (Or et Devises)
  const topSuppliersGold = useMemo(() => {
    const map = new Map<string, { name: string; totalFcfa: number; grams: number; count: number }>();
    filteredPurchases.forEach((p) => {
      const key = p.supplier || 'Fournisseur divers';
      const prev = map.get(key) || { name: key, totalFcfa: 0, grams: 0, count: 0 };
      prev.totalFcfa += p.amount;
      prev.grams += p.netWeightGrams ?? p.grossWeightGrams ?? 0;
      prev.count += 1;
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.totalFcfa - a.totalFcfa).slice(0, 10);
  }, [filteredPurchases]);

  const topClientsGold = useMemo(() => {
    const map = new Map<string, { name: string; totalFcfa: number; grams: number; count: number }>();
    filteredSales.forEach((s) => {
      const key = s.clientName || 'Client divers';
      const prev = map.get(key) || { name: key, totalFcfa: 0, grams: 0, count: 0 };
      prev.totalFcfa += s.grossRevenueXaf ?? s.grossRevenueUsd * (s.usdToXafRate ?? 600);
      prev.grams += s.totalGeneralWeightGrams;
      prev.count += 1;
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.totalFcfa - a.totalFcfa).slice(0, 10);
  }, [filteredSales]);

  const topClientsCurrency = useMemo(() => {
    const map = new Map<string, { name: string; totalFcfa: number; count: number }>();
    filteredExchanges.forEach((ex) => {
      const key = ex.label || 'Client Change';
      const prev = map.get(key) || { name: key, totalFcfa: 0, count: 0 };
      prev.totalFcfa += ex.totalXaf ?? 0;
      prev.count += 1;
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.totalFcfa - a.totalFcfa).slice(0, 10);
  }, [filteredExchanges]);

  const findContactForOperation = (title: string, subtitle: string) => {
    const haystack = `${title} ${subtitle}`.toLowerCase();
    return store.contacts.find((c) => c.phone && haystack.includes(c.name.toLowerCase())) || null;
  };

  const handleSendWhatsApp = (opId: string, contactName: string, phone: string, title: string, amount: number, date: string, isIncome: boolean) => {
    const msg = `Bonjour ${contactName}, CAMS GOLD vous informe de l'opération suivante : ${title} (${isIncome ? '+' : ''}${formatMoney(amount)} FCFA) enregistrée le ${date}. Merci pour votre confiance.`;
    const url = buildWhatsAppUrl(phone, msg);
    setLastNotifiedOpId(opId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setOpType('ALL');
    setSelectedContactId('ALL');
    setCategoryFilter('ALL');
    setPaymentMode('ALL');
  };

  return (
    <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-6">
      <div className="no-print">
        <PageHeading
          eyebrow="Gestion · Synthèse & Analytique"
          title="Rapports d'Activité"
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoWhatsAppNotify((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                  autoWhatsAppNotify
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
                title="Notification WhatsApp automatique pour les opérations liées à un contact"
              >
                <MessageCircle size={14} />
                <span>WhatsApp Auto : {autoWhatsAppNotify ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#192A24] hover:bg-[#253D34] text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                <Printer size={15} />
                <span>Imprimer le rapport</span>
              </button>
            </div>
          }
        />
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black">CAMS GOLD COMPTOIR</h1>
            <p className="text-sm">Rapport analytique financier et opérationnel</p>
          </div>
          <div className="text-right text-xs">
            <div>Édité le {new Date().toLocaleDateString('fr-FR')}</div>
            <div>Opérateur : {store.userName}</div>
            {(startDate || endDate) && (
              <div>Période : {startDate || '...'} au {endDate || '...'}</div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-criteria Filter Bar */}
      <AppPanel className="no-print space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#192A24]">
            <Filter size={15} className="text-[#D39725]" />
            <span>Filtres de génération du rapport</span>
          </div>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs font-bold text-[#7D8176] hover:text-[#192A24] cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Réinitialiser</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#7D8176] mb-1">Date début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] text-xs font-semibold text-[#192A24]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#7D8176] mb-1">Date fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] text-xs font-semibold text-[#192A24]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#7D8176] mb-1">Type d'opération</label>
            <select
              value={opType}
              onChange={(e) => setOpType(e.target.value as OperationTypeFilter)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] text-xs font-semibold text-[#192A24]"
            >
              <option value="ALL">Toutes les opérations</option>
              <option value="INCOME">Entrées / Crédits</option>
              <option value="EXPENSE">Sorties / Dépenses</option>
              <option value="PURCHASE">Achats</option>
              <option value="SALE">Ventes</option>
              <option value="EXCHANGE">Change / Devises</option>
              <option value="TRANSFER">Approvisionnements</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#7D8176] mb-1">Contact (Client / Fournisseur)</label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] text-xs font-semibold text-[#192A24]"
            >
              <option value="ALL">Tous les contacts</option>
              {store.contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.roles.join(', ') || 'Contact'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#7D8176] mb-1">Catégorie / Libellé</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] text-xs font-semibold text-[#192A24]"
            >
              <option value="ALL">Toutes catégories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#7D8176] mb-1">Mode de paiement</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentModeFilter)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] text-xs font-semibold text-[#192A24]"
            >
              <option value="ALL">Tous (Cash & Banque)</option>
              <option value="CASH">Cash / Caisse</option>
              <option value="BANK">Banque / Virement</option>
            </select>
          </div>
        </div>
      </AppPanel>

      {/* Navigation Tabs */}
      <div className="no-print flex flex-wrap gap-2">
        {[
          { id: 'analytics', label: 'Analytique Financier' },
          { id: 'breakdown', label: 'Ventes, Achats, Pertes & Dépenses' },
          { id: 'receivables', label: 'Entrées à recevoir & Sorties à payer' },
          { id: 'rankings', label: 'Meilleurs Fournisseurs & Clients' },
          { id: 'ledger', label: `Grand Livre & WhatsApp (${filteredOperations.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ReportTab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              activeTab === tab.id
                ? 'bg-[#192A24] text-[#F2BD45] shadow-xs'
                : 'bg-white border border-[#E8D8BE] text-[#192A24] hover:bg-[#FAF8F3]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ANALYTICS */}
      {activeTab === 'analytics' && (
        <AppPanel className="space-y-6">
          <SectionHeading
            title="Rapport analytique financier détaillé"
            icon={<FileBarChart size={20} />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const revenue = totalSalesAmount > 0 ? totalSalesAmount : incomeTotal;
              const cogs = totalPurchasesAmount;
              const grossProfit = revenue - cogs;
              const grossMarginPct = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : '0.0';
              const opex = operatingExpensesTotal;
              const netIncome = grossProfit - opex - lossesTotal;
              const cashFlows = incomeTotal - expensesTotal;
              const endingCash = store.totalTreasury;

              return (
                <>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                      Revenue (Revenus)
                    </div>
                    <div className="text-xl font-black text-emerald-700">
                      {formatMoney(revenue)} FCFA
                    </div>
                    <div className="text-[11px] text-emerald-600 mt-1">Ventes & entrées</div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                      COGS (Coût d'achat)
                    </div>
                    <div className="text-xl font-black text-amber-700">
                      {formatMoney(cogs)} FCFA
                    </div>
                    <div className="text-[11px] text-amber-600 mt-1">Coût des achats d'or</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE]">
                    <div className="text-xs font-bold text-[#7D8176] uppercase tracking-wider mb-1">
                      Gross Profit (Marge Brute)
                    </div>
                    <div className={`text-xl font-black ${grossProfit >= 0 ? 'text-[#192A24]' : 'text-red-700'}`}>
                      {formatMoney(grossProfit)} FCFA
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">Revenue - COGS</div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">
                      Gross Margin %
                    </div>
                    <div className="text-xl font-black text-blue-700">
                      {grossMarginPct}%
                    </div>
                    <div className="text-[11px] text-blue-600 mt-1">(Revenue - COGS) / Revenue</div>
                  </div>

                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                    <div className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-1">
                      Opex (Charges)
                    </div>
                    <div className="text-xl font-black text-rose-700">
                      {formatMoney(opex)} FCFA
                    </div>
                    <div className="text-[11px] text-rose-600 mt-1">Salaires, loyer, eau/élec, admin...</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Net Income (Résultat Net)
                    </div>
                    <div className={`text-xl font-black ${netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatMoney(netIncome)} FCFA
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Gross Profit - Opex - Pertes</div>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                    <div className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">
                      Cash Flows (Flux)
                    </div>
                    <div className={`text-xl font-black ${cashFlows >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                      {formatMoney(cashFlows)} FCFA
                    </div>
                    <div className="text-[11px] text-indigo-600 mt-1">Entrées - Sorties période</div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#7D8176] uppercase tracking-wider mb-1">
                      <Wallet size={14} className="text-[#D39725]" />
                      <span>Ending Cash (Trésorerie)</span>
                    </div>
                    <div className="text-xl font-black text-[#192A24]">
                      {formatMoney(endingCash)} FCFA
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">Caisse + comptes bancaires</div>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#192A24] to-[#253D34] text-white space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#F2BD45] flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-[#F2BD45]" />
                  <span>Rapport de Rentabilité · Bénéfices Nets Réalisés</span>
                </div>
                <h3 className="text-lg font-black text-white mt-0.5">
                  Total Bénéfice d'Or et de Devises
                </h3>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/70">Résultat net d'exploitation</div>
                <div className="text-2xl font-black text-[#F2BD45]">
                  {formatMoney(store.totalProfit)} FCFA
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/10 border border-white/15">
                <div className="text-[11px] font-bold text-[#F2BD45] uppercase tracking-wider">
                  Bénéfice d'Or (Ventes & Dubaï)
                </div>
                <div className="text-xl font-black text-white mt-1">
                  {formatMoney(store.goldProfit)} <span className="text-xs font-normal">FCFA</span>
                </div>
                <div className="text-[11px] text-white/60 mt-1">
                  Sur {store.saleRecords.length} lot(s) Dubaï & {filteredSales.length} ventes
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/10 border border-white/15">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Bénéfice Devises (Change & Spread)
                </div>
                <div className="text-xl font-black text-white mt-1">
                  {formatMoney(store.currencyProfit)} <span className="text-xs font-normal">FCFA</span>
                </div>
                <div className="text-[11px] text-white/60 mt-1">
                  Sur {store.currencyStockMovements.filter((m) => m.type === 'Vente devise').length} vente(s) de devises
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/15 border border-[#F2BD45]/40">
                <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                  Approvisionnements inter-comptes
                </div>
                <div className="text-xl font-black text-[#F2BD45] mt-1">
                  {formatMoney(transfersTotal)} <span className="text-xs font-normal text-white">FCFA</span>
                </div>
                <div className="text-[11px] text-white/70 mt-1">
                  Neutres sur résultat net
                </div>
              </div>
            </div>
          </div>
        </AppPanel>
      )}

      {/* TAB 2: VENTES, ACHATS, PERTES, DÉPENSES */}
      {activeTab === 'breakdown' && (
        <AppPanel className="space-y-5">
          <SectionHeading
            title="Rapport détaillé : Ventes, Achats, Pertes & Dépenses"
            icon={<TrendingDown size={20} />}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-xs font-bold text-emerald-800 uppercase">Ventes Or</div>
              <div className="text-xl font-black text-emerald-700 mt-1">{formatMoney(totalSalesAmount)} FCFA</div>
              <div className="text-[11px] text-emerald-600 mt-1">{filteredSales.length} transaction(s)</div>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-xs font-bold text-amber-800 uppercase">Achats Or</div>
              <div className="text-xl font-black text-amber-700 mt-1">{formatMoney(totalPurchasesAmount)} FCFA</div>
              <div className="text-[11px] text-amber-600 mt-1">{filteredPurchases.length} transaction(s)</div>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <div className="text-xs font-bold text-rose-800 uppercase">Pertes / Écarts</div>
              <div className="text-xl font-black text-rose-700 mt-1">{formatMoney(lossesTotal)} FCFA</div>
              <div className="text-[11px] text-rose-600 mt-1">Fonte, manquant, écart</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-slate-700 uppercase">Dépenses / Charges</div>
              <div className="text-xl font-black text-slate-800 mt-1">{formatMoney(operatingExpensesTotal)} FCFA</div>
              <div className="text-[11px] text-slate-500 mt-1">Frais généraux & fonctionnement</div>
            </div>
          </div>
        </AppPanel>
      )}

      {/* TAB 3: ENTRÉES À RECEVOIR & SORTIES À PAYER */}
      {activeTab === 'receivables' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AppPanel className="space-y-4">
            <SectionHeading
              title={`Entrées à recevoir (${formatMoney(totalReceivables)} FCFA)`}
              icon={<Clock size={18} className="text-emerald-600" />}
            />
            {pendingReceivables.length === 0 ? (
              <p className="text-xs text-gray-500">Aucune entrée en attente pour les filtres sélectionnés.</p>
            ) : (
              <div className="space-y-2">
                {pendingReceivables.map((op) => (
                  <div key={op.id} className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#192A24]">{op.title}</div>
                      <div className="text-gray-500">{op.subtitle} · {op.date}</div>
                    </div>
                    <div className="font-black text-emerald-700">+ {formatMoney(op.amount)} FCFA</div>
                  </div>
                ))}
              </div>
            )}
          </AppPanel>

          <AppPanel className="space-y-4">
            <SectionHeading
              title={`Sorties à payer (${formatMoney(totalPayables)} FCFA)`}
              icon={<Clock size={18} className="text-red-600" />}
            />
            {pendingPayables.length === 0 ? (
              <p className="text-xs text-gray-500">Aucune sortie à payer pour les filtres sélectionnés.</p>
            ) : (
              <div className="space-y-2">
                {pendingPayables.map((op) => (
                  <div key={op.id} className="p-3 rounded-xl bg-red-50/60 border border-red-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#192A24]">{op.title}</div>
                      <div className="text-gray-500">{op.subtitle} · {op.date}</div>
                    </div>
                    <div className="font-black text-red-700">- {formatMoney(op.amount)} FCFA</div>
                  </div>
                ))}
              </div>
            )}
          </AppPanel>
        </div>
      )}

      {/* TAB 4: MEILLEURS FOURNISSEURS & CLIENTS */}
      {activeTab === 'rankings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AppPanel className="space-y-3">
            <SectionHeading title="Top Fournisseurs (Or)" icon={<Users size={18} />} />
            {topSuppliersGold.length === 0 ? (
              <p className="text-xs text-gray-500">Aucune donnée fournisseur.</p>
            ) : (
              <div className="space-y-2">
                {topSuppliersGold.map((item, idx) => (
                  <div key={item.name} className="p-3 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#192A24]">{idx + 1}. {item.name}</div>
                      <div className="text-gray-500">{item.grams.toFixed(2)} g · {item.count} achat(s)</div>
                    </div>
                    <div className="font-black text-[#192A24]">{formatMoney(item.totalFcfa)} FCFA</div>
                  </div>
                ))}
              </div>
            )}
          </AppPanel>

          <AppPanel className="space-y-3">
            <SectionHeading title="Top Clients (Or)" icon={<Users size={18} />} />
            {topClientsGold.length === 0 ? (
              <p className="text-xs text-gray-500">Aucune donnée client Or.</p>
            ) : (
              <div className="space-y-2">
                {topClientsGold.map((item, idx) => (
                  <div key={item.name} className="p-3 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#192A24]">{idx + 1}. {item.name}</div>
                      <div className="text-gray-500">{item.grams.toFixed(2)} g · {item.count} vente(s)</div>
                    </div>
                    <div className="font-black text-emerald-700">{formatMoney(item.totalFcfa)} FCFA</div>
                  </div>
                ))}
              </div>
            )}
          </AppPanel>

          <AppPanel className="space-y-3">
            <SectionHeading title="Top Clients (Devises)" icon={<Users size={18} />} />
            {topClientsCurrency.length === 0 ? (
              <p className="text-xs text-gray-500">Aucune donnée client Devises.</p>
            ) : (
              <div className="space-y-2">
                {topClientsCurrency.map((item, idx) => (
                  <div key={item.name} className="p-3 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#192A24]">{idx + 1}. {item.name}</div>
                      <div className="text-gray-500">{item.count} opération(s) de change</div>
                    </div>
                    <div className="font-black text-blue-700">{formatMoney(item.totalFcfa)} FCFA</div>
                  </div>
                ))}
              </div>
            )}
          </AppPanel>
        </div>
      )}

      {/* TAB 5: GRAND LIVRE + WHATSAPP */}
      {activeTab === 'ledger' && (
        <AppPanel padding="p-0" className="overflow-hidden">
          <div className="p-5 border-b border-[#E8D8BE] flex items-center justify-between">
            <SectionHeading title="Grand livre des opérations" />
            <span className="text-xs text-gray-500 font-bold">
              {filteredOperations.length} écritures filtrées
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF8F3] border-b border-[#E8D8BE] text-[11px] font-bold text-[#7D8176] uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Libellé / Nature</th>
                  <th className="py-3 px-4">Tiers / Compte</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Montant (FCFA)</th>
                  <th className="py-3 px-4 text-right">Statut</th>
                  <th className="py-3 px-4 text-right no-print">Notification WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOperations.map((op) => {
                  const matchedContact = findContactForOperation(op.title, op.subtitle);
                  return (
                    <tr key={op.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 text-gray-500">{op.date}</td>
                      <td className="py-3 px-4 font-bold text-[#192A24]">{op.title}</td>
                      <td className="py-3 px-4 text-gray-600">{op.subtitle}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            op.isIncome
                              ? 'bg-emerald-100 text-emerald-800'
                              : op.isClientTransfer
                              ? 'bg-emerald-100 text-[#008B62] border border-emerald-300'
                              : op.isTransfer
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {op.isIncome
                            ? 'Crédit'
                            : op.isClientTransfer
                            ? 'Virement client'
                            : op.isTransfer
                            ? 'Appro'
                            : 'Débit'}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-black ${
                          op.isIncome
                            ? 'text-emerald-600'
                            : op.isTransfer
                            ? 'text-blue-600'
                            : 'text-[#192A24]'
                        }`}
                      >
                        {op.isIncome ? '+ ' : ''}
                        {formatMoney(op.amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-400">
                        {op.isProcessed ? 'Validé' : 'En attente'}
                      </td>
                      <td className="py-3 px-4 text-right no-print">
                        {matchedContact ? (
                          <button
                            onClick={() =>
                              handleSendWhatsApp(
                                op.id,
                                matchedContact.name,
                                matchedContact.phone,
                                op.title,
                                op.amount,
                                op.date,
                                Boolean(op.isIncome)
                              )
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                              lastNotifiedOpId === op.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            <MessageCircle size={12} />
                            <span>{lastNotifiedOpId === op.id ? 'Notifié' : 'WhatsApp'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AppPanel>
      )}
    </div>
  );
};
