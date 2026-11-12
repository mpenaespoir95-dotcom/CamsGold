import React, { useState } from 'react';
import {
  Handshake,
  Users,
  Coins,
  FileText,
  Plus,
  Flame,
  Scale,
  Calendar,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { AppPanel, Modal, PageHeading, SectionHeading } from '../common/UIComponents';
import { formatMoney, formatNumber, formatDate, formatDateTime } from '../../utils/goldMath';
import {
  Partnership,
  Partner,
  PartnershipScenario,
  PartnershipStatus,
  PartnershipCashMovementType,
  RemunerationMethod,
  PartnershipLoanDirection,
  PARTNERSHIP_SCENARIO_LABELS,
  PARTNERSHIP_STATUS_LABELS,
  REMUNERATION_METHOD_LABELS,
  PARTNERSHIP_LOAN_DIRECTION_LABELS,
} from '../../types';

export const PartnershipsScreen: React.FC = () => {
  const store = useAppStore();
  const [activeTab, setActiveTab] = useState<'contracts' | 'partners' | 'loans' | 'cash'>('contracts');

  // New Contract Modal
  const [showNewContractModal, setShowNewContractModal] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<PartnershipScenario>('financialPurchase');
  const [selectedRemuneration, setSelectedRemuneration] = useState<RemunerationMethod>('contractualProfitShares');
  const [remunerationVal, setRemunerationVal] = useState('40');
  const [contractNote, setContractNote] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState(store.partners[0]?.id || '');
  const [financialContrib, setFinancialContrib] = useState('');

  // New Loan Modal
  const [showNewLoanModal, setShowNewLoanModal] = useState(false);
  const [loanPartnerId, setLoanPartnerId] = useState(store.partners[0]?.id || '');
  const [loanDirection, setLoanDirection] = useState<PartnershipLoanDirection>('companyBorrows');
  const [loanPrincipal, setLoanPrincipal] = useState('');
  const [loanDueDate, setLoanDueDate] = useState('');
  const [loanNote, setLoanNote] = useState('');

  // New Partner Modal
  const [showNewPartnerModal, setShowNewPartnerModal] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerCity, setPartnerCity] = useState('');
  const [partnerType, setPartnerType] = useState('Investisseur');

  // Repayment Modal
  const [repayingLoanId, setRepayingLoanId] = useState<string | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentNote, setRepaymentNote] = useState('');

  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [cashMovementType, setCashMovementType] = useState<PartnershipCashMovementType>('contribution');
  const [cashContributor, setCashContributor] = useState<'CAMS GOLD' | 'partner'>('CAMS GOLD');
  const [cashPartnerId, setCashPartnerId] = useState(store.partners.find((partner) => partner.isActive)?.id || '');
  const [cashAmount, setCashAmount] = useState('');
  const [cashDescription, setCashDescription] = useState('');
  const [cashWeight, setCashWeight] = useState('');
  const [cashKarat, setCashKarat] = useState('24');
  const [cashMovementError, setCashMovementError] = useState<string | null>(null);

  const partnershipCashBalance = store.partnershipCashMovements.reduce(
    (balance, movement) =>
      balance + (movement.type === 'goldPurchase' ? -movement.amountXaf : movement.amountXaf),
    0
  );
  const partnershipCashTotals = store.partnershipCashMovements.reduce(
    (totals, movement) => ({
      contributions: totals.contributions + (movement.type === 'contribution' ? movement.amountXaf : 0),
      purchases: totals.purchases + (movement.type === 'goldPurchase' ? movement.amountXaf : 0),
      sales: totals.sales + (movement.type === 'goldSale' ? movement.amountXaf : 0),
    }),
    { contributions: 0, purchases: 0, sales: 0 }
  );
  const partnershipGoldStockGrams = store.partnershipCashMovements.reduce(
    (weight, movement) => {
      if (movement.type === 'contribution') return weight;
      const fineWeight = ((movement.weightGrams || 0) * (movement.karat || 0)) / 24;
      return weight + (movement.type === 'goldPurchase' ? fineWeight : -fineWeight);
    },
    0
  );

  const handleCreateCashMovement = (event: React.FormEvent) => {
    event.preventDefault();
    setCashMovementError(null);
    const amountXaf = Number.parseFloat(cashAmount.replace(',', '.'));
    const weightGrams = Number.parseFloat(cashWeight.replace(',', '.'));
    const karat = Number.parseFloat(cashKarat.replace(',', '.'));
    const partner = store.partners.find((item) => item.id === cashPartnerId && item.isActive);
    const requiresPartner = cashMovementType !== 'contribution' || cashContributor === 'partner';

    if (!Number.isFinite(amountXaf) || amountXaf <= 0) {
      setCashMovementError('Saisissez un montant supérieur à zéro.');
      return;
    }
    if (requiresPartner && !partner) {
      setCashMovementError('Sélectionnez un partenaire actif.');
      return;
    }
    if (
      cashMovementType !== 'contribution' &&
      (!Number.isFinite(weightGrams) || weightGrams <= 0 || !Number.isFinite(karat) || karat < 1 || karat > 24)
    ) {
      setCashMovementError('Pour une opération sur l’or, saisissez un poids positif et un carat entre 1 et 24.');
      return;
    }

    const defaultDescriptions: Record<PartnershipCashMovementType, string> = {
      contribution: 'Apport à la caisse de partenariat',
      goldPurchase: 'Achat d’or pour le partenariat',
      goldSale: 'Vente d’or du partenariat',
    };

    try {
      store.addPartnershipCashMovement({
        type: cashMovementType,
        amountXaf,
        description: cashDescription.trim() || defaultDescriptions[cashMovementType],
        partnerId: partner?.id,
        partnerName: partner?.name,
        contributor: cashMovementType === 'contribution' ? cashContributor : undefined,
        weightGrams: cashMovementType === 'contribution' ? undefined : weightGrams,
        karat: cashMovementType === 'contribution' ? undefined : karat,
      });
      setShowCashMovementModal(false);
      setCashAmount('');
      setCashDescription('');
      setCashWeight('');
      setCashKarat('24');
    } catch (error: unknown) {
      setCashMovementError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    const partner = store.partners.find((p) => p.id === selectedPartnerId);
    const partnerNameStr = partner ? partner.name : 'Partenaire';
    const contribNum = parseFloat(financialContrib.replace(',', '.') || '0');

    store.addPartnership({
      scenario: selectedScenario,
      status: 'contractApproved',
      remunerationMethod: selectedRemuneration,
      remunerationValue: parseFloat(remunerationVal.replace(',', '.') || '0'),
      note: contractNote || 'Convention de partenariat commercial',
      members: [
        {
          partnerId: selectedPartnerId,
          name: partnerNameStr,
          role: 'Partenaire co-contractant',
          profitSharePercent: parseFloat(remunerationVal || '50'),
          contributions: contribNum > 0 ? [
            {
              kind: 'financial',
              isValidated: true,
              amountXaf: contribNum,
              purityIsProvisional: false,
            },
          ] : [],
        },
        {
          name: 'Cams Gold',
          role: 'Comptoir opérateur',
          isCompany: true,
          profitSharePercent: 100 - parseFloat(remunerationVal || '50'),
          contributions: [],
        },
      ],
    });

    setShowNewContractModal(false);
    setContractNote('');
    setFinancialContrib('');
  };

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const partner = store.partners.find((p) => p.id === loanPartnerId);
    const pAmount = parseFloat(loanPrincipal.replace(',', '.') || '0');

    store.addLoan({
      partnerName: partner?.name || 'Partenaire',
      partnerId: loanPartnerId,
      direction: loanDirection,
      principalXaf: pAmount,
      dueAt: loanDueDate ? new Date(loanDueDate).toISOString() : new Date().toISOString(),
      note: loanNote || 'Avance de trésorerie',
      createdBy: store.userName,
    });

    setShowNewLoanModal(false);
    setLoanPrincipal('');
    setLoanNote('');
  };

  const handleCreatePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) return;
    store.addPartner({
      name: partnerName,
      phone: partnerPhone,
      city: partnerCity,
      email: '',
      isActive: true,
      type: partnerType,
    });
    setShowNewPartnerModal(false);
    setPartnerName('');
    setPartnerPhone('');
    setPartnerCity('');
  };

  const handleConfirmRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayingLoanId) return;
    const amount = parseFloat(repaymentAmount.replace(',', '.') || '0');
    store.addLoanRepayment(repayingLoanId, {
      amountXaf: amount,
      note: repaymentNote || 'Remboursement partiel',
      createdBy: store.userName,
    });
    setRepayingLoanId(null);
    setRepaymentAmount('');
    setRepaymentNote('');
  };

  return (
    <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-6">
      <PageHeading
        eyebrow="Comptoir · Partenaires"
        title="Partenariats & Avances"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewContractModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-bold cursor-pointer shadow-xs"
            >
              <Plus size={15} />
              <span>Nouveau contrat</span>
            </button>
            <button
              onClick={() => setShowNewLoanModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#192A24] hover:bg-[#253D34] text-white text-xs font-bold cursor-pointer"
            >
              <DollarSign size={15} />
              <span>Nouveau prêt / avance</span>
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8D8BE] pb-2">
        <button
          onClick={() => setActiveTab('contracts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'contracts'
              ? 'bg-[#192A24] text-white shadow-xs'
              : 'text-[#7D8176] hover:bg-[#F6F0E5]'
          }`}
        >
          <Handshake size={16} />
          <span>Contrats & Opérations ({store.partnerships.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'loans'
              ? 'bg-[#192A24] text-white shadow-xs'
              : 'text-[#7D8176] hover:bg-[#F6F0E5]'
          }`}
        >
          <Coins size={16} />
          <span>Registre des prêts ({store.loans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cash')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'cash'
              ? 'bg-[#192A24] text-white shadow-xs'
              : 'text-[#7D8176] hover:bg-[#F6F0E5]'
          }`}
        >
          <Wallet size={16} />
          <span>Caisse partenariat</span>
        </button>

        <button
          onClick={() => setActiveTab('partners')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'partners'
              ? 'bg-[#192A24] text-white shadow-xs'
              : 'text-[#7D8176] hover:bg-[#F6F0E5]'
          }`}
        >
          <Users size={16} />
          <span>Annuaire partenaires ({store.partners.length})</span>
        </button>
      </div>

      {activeTab === 'cash' && (
        <div className="space-y-4">
          <AppPanel className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[#192A24]">Caisse CAMS GOLD · Partenariat or</h2>
                <p className="mt-1 text-xs text-[#7D8176]">
                  Caisse séparée de la trésorerie générale : enregistrez les apports des deux associés, les achats d’or et le retour des ventes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCashMovementError(null);
                  setShowCashMovementModal(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-bold cursor-pointer"
              >
                <Plus size={15} />
                <span>Nouvelle opération</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-[11px] font-bold text-emerald-800">Solde de la caisse</div>
                <div className="mt-1 text-xl font-black text-emerald-900">{formatMoney(partnershipCashBalance)} FCFA</div>
              </div>
              <div className="rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] p-4">
                <div className="text-[11px] font-bold text-[#7D8176]">Apports enregistrés</div>
                <div className="mt-1 text-lg font-black text-[#192A24]">{formatMoney(partnershipCashTotals.contributions)} FCFA</div>
              </div>
              <div className="rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] p-4">
                <div className="text-[11px] font-bold text-[#7D8176]">Achats d’or</div>
                <div className="mt-1 text-lg font-black text-[#192A24]">{formatMoney(partnershipCashTotals.purchases)} FCFA</div>
              </div>
              <div className="rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] p-4">
                <div className="text-[11px] font-bold text-[#7D8176]">Ventes reversées</div>
                <div className="mt-1 text-lg font-black text-[#192A24]">{formatMoney(partnershipCashTotals.sales)} FCFA</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-[11px] font-bold text-amber-800">Stock d’or fin disponible</div>
                <div className="mt-1 text-lg font-black text-amber-950">{formatNumber(partnershipGoldStockGrams, 3)} g</div>
              </div>
            </div>
          </AppPanel>

          <AppPanel>
            <SectionHeading title={`Historique de la caisse (${store.partnershipCashMovements.length})`} icon={<Wallet size={18} />} />
            {store.partnershipCashMovements.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500">
                Aucun mouvement. Enregistrez un apport de CAMS GOLD et/ou du partenaire pour démarrer une opération.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E8D8BE] text-[#7D8176]">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Mouvement</th>
                      <th className="py-2 px-3">Détail / Partenaire</th>
                      <th className="py-2 px-3 text-right">Entrée</th>
                      <th className="py-2 px-3 text-right">Sortie</th>
                      <th className="py-2 px-3 text-right">Solde après mouvement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...store.partnershipCashMovements]
                      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                      .reduce<Array<{ movement: (typeof store.partnershipCashMovements)[number]; balance: number }>>(
                        (rows, movement) => {
                          const previousBalance = rows.length > 0 ? rows[rows.length - 1].balance : 0;
                          const balance = previousBalance + (movement.type === 'goldPurchase' ? -movement.amountXaf : movement.amountXaf);
                          rows.push({ movement, balance });
                          return rows;
                        },
                        []
                      )
                      .reverse()
                      .map(({ movement, balance }) => {
                        const movementLabels: Record<PartnershipCashMovementType, string> = {
                          contribution: 'Apport',
                          goldPurchase: 'Achat d’or',
                          goldSale: 'Vente d’or',
                        };
                        const owner = movement.contributor === 'CAMS GOLD'
                          ? 'CAMS GOLD'
                          : movement.partnerName || 'Partenaire';
                        return (
                          <tr key={movement.id} className="border-b border-gray-100">
                            <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTime(movement.createdAt)}</td>
                            <td className="py-2.5 px-3 font-bold">{movementLabels[movement.type]}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-[#192A24]">{movement.description}</div>
                              <div className="mt-0.5 text-[10px] text-[#7D8176]">
                                {movement.type === 'contribution' ? `Apporteur : ${owner}` : `Partenaire : ${movement.partnerName || 'Non précisé'}`}
                                {movement.weightGrams !== undefined && ` · ${formatNumber(movement.weightGrams, 3)} g · ${formatNumber(movement.karat || 0, 2)} K`}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                              {movement.type !== 'goldPurchase' ? `+ ${formatMoney(movement.amountXaf)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-red-700">
                              {movement.type === 'goldPurchase' ? `− ${formatMoney(movement.amountXaf)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black">{formatMoney(balance)} FCFA</td>
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

      {/* Tab 1: Contracts */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          {store.partnerships.length === 0 ? (
            <AppPanel className="text-center py-10">
              <p className="text-xs text-gray-500">Aucun contrat de partenariat enregistré.</p>
            </AppPanel>
          ) : (
            store.partnerships.map((p) => {
              const totalFinContrib = p.members.reduce(
                (sum, m) =>
                  sum +
                  m.contributions
                    .filter((c) => c.kind === 'financial')
                    .reduce((cSum, c) => cSum + (c.amountXaf || 0), 0),
                0
              );

              const meltDiff =
                p.analysisBefore && p.analysisAfter
                  ? p.analysisBefore.netWeightGrams - p.analysisAfter.netWeightGrams
                  : null;

              return (
                <AppPanel key={p.id} className="space-y-4 hover:border-[#D39725]/50 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8D8BE] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#D39725]/15 text-[#D39725] flex items-center justify-center font-bold">
                        <Handshake size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-[#D39725]">{p.reference}</span>
                          <span className="font-bold text-sm text-[#192A24]">
                            {PARTNERSHIP_SCENARIO_LABELS[p.scenario]}
                          </span>
                        </div>
                        <span className="text-xs text-[#7D8176]">
                          Créé le {formatDate(p.createdAt)} · {p.note}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                        {PARTNERSHIP_STATUS_LABELS[p.status] || p.status}
                      </span>
                    </div>
                  </div>

                  {/* Members & Contributions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {p.members.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE]">
                        <div className="font-bold text-xs text-[#192A24]">{m.name}</div>
                        <div className="text-[11px] text-[#7D8176]">{m.role}</div>
                        {m.profitSharePercent !== undefined && (
                          <div className="text-[11px] font-bold text-[#D39725] mt-1">
                            Part aux bénéfices : {m.profitSharePercent}%
                          </div>
                        )}
                        {m.contributions.map((c, cIdx) => (
                          <div key={cIdx} className="text-[11px] text-gray-600 mt-1">
                            {c.kind === 'financial' && `Apport financier : ${formatMoney(c.amountXaf)} FCFA`}
                            {c.kind === 'metal' && `Apport métal : ${c.netWeightGrams} g (${c.purityPercent}%)`}
                            {c.kind === 'service' && `Prestation : ${c.serviceDescription}`}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Melt Analysis if present */}
                  {meltDiff !== null && (
                    <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between text-xs text-orange-900">
                      <div className="flex items-center gap-2">
                        <Flame size={16} className="text-orange-600" />
                        <span>
                          Contrôle de fonte : Avant {p.analysisBefore?.netWeightGrams} g ({p.analysisBefore?.purityPercent}%) → Après {p.analysisAfter?.netWeightGrams} g ({p.analysisAfter?.purityPercent}%)
                        </span>
                      </div>
                      <span className="font-bold">Perte fonte : {formatNumber(meltDiff, 2)} g</span>
                    </div>
                  )}
                </AppPanel>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Loans */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          {store.loans.length === 0 ? (
            <AppPanel className="text-center py-10">
              <p className="text-xs text-gray-500">Aucun prêt ou avance enregistré.</p>
            </AppPanel>
          ) : (
            store.loans.map((loan) => {
              const repaid = loan.repayments.reduce((sum, r) => sum + r.amountXaf, 0);
              const remaining = loan.principalXaf - repaid;
              const isFullyRepaid = remaining <= 0;

              return (
                <AppPanel key={loan.id} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8D8BE] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#192A24]/10 text-[#192A24] flex items-center justify-center font-bold">
                        <Coins size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-[#D39725]">{loan.reference}</span>
                          <span className="font-bold text-sm text-[#192A24]">{loan.partnerName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {PARTNERSHIP_LOAN_DIRECTION_LABELS[loan.direction]}
                          </span>
                        </div>
                        <div className="text-xs text-[#7D8176]">
                          Échéance : {formatDate(loan.dueAt)} · Note : {loan.note}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-black text-[#192A24]">
                          {formatMoney(loan.principalXaf)} FCFA
                        </div>
                        <div className="text-[11px] font-bold text-[#7D8176]">
                          Reste dû :{' '}
                          <span className={isFullyRepaid ? 'text-emerald-600' : 'text-amber-700'}>
                            {formatMoney(remaining)} FCFA
                          </span>
                        </div>
                      </div>

                      {!isFullyRepaid && (
                        <button
                          onClick={() => {
                            setRepayingLoanId(loan.id);
                            setRepaymentAmount(String(remaining));
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#008B62] hover:bg-[#007452] text-white text-xs font-bold cursor-pointer"
                        >
                          Rembourser
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Repayments log */}
                  {loan.repayments.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                        Règlements enregistrés ({loan.repayments.length})
                      </span>
                      <div className="divide-y divide-gray-100 bg-gray-50/50 rounded-xl p-2">
                        {loan.repayments.map((r, rIdx) => (
                          <div key={rIdx} className="py-1.5 flex items-center justify-between text-xs">
                            <span className="text-[#7D8176]">
                              {formatDateTime(r.paidAt)} · {r.note} ({r.createdBy})
                            </span>
                            <span className="font-bold text-emerald-700">
                              {formatMoney(r.amountXaf)} FCFA
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </AppPanel>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: Partners Directory */}
      {activeTab === 'partners' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowNewPartnerModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#008B62] hover:bg-[#007452] text-white text-xs font-bold cursor-pointer"
            >
              <Plus size={15} />
              <span>Ajouter un partenaire</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {store.partners.map((p) => (
              <AppPanel key={p.id} padding="p-4" className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#192A24]">{p.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                    {p.type}
                  </span>
                </div>
                <div className="text-xs text-[#7D8176]">
                  {p.city} · {p.phone}
                </div>
                {p.email && <div className="text-xs text-gray-500">{p.email}</div>}
              </AppPanel>
            ))}
          </div>
        </div>
      )}

      {/* Modal New Partnership Cash Movement */}
      <Modal
        isOpen={showCashMovementModal}
        onClose={() => setShowCashMovementModal(false)}
        title="Nouvelle opération · Caisse partenariat"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateCashMovement} className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs">
            <div className="font-bold text-emerald-900">Solde disponible : {formatMoney(partnershipCashBalance)} FCFA</div>
            <div className="mt-1 text-emerald-800">
              Les achats débitent uniquement cette caisse. Le montant d’une vente est reversé ici.
            </div>
          </div>

          <label className="block text-xs font-bold text-[#192A24]">
            Type d’opération
            <select
              value={cashMovementType}
              onChange={(event) => {
                setCashMovementType(event.target.value as PartnershipCashMovementType);
                setCashMovementError(null);
              }}
              className="mt-1 w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
            >
              <option value="contribution">Apport à la caisse</option>
              <option value="goldPurchase">Achat d’or avec la caisse</option>
              <option value="goldSale">Vente d’or · retour d’argent à la caisse</option>
            </select>
          </label>

          {cashMovementType === 'contribution' ? (
            <label className="block text-xs font-bold text-[#192A24]">
              Qui apporte les fonds ?
              <select
                value={cashContributor}
                onChange={(event) => setCashContributor(event.target.value as 'CAMS GOLD' | 'partner')}
                className="mt-1 w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
              >
                <option value="CAMS GOLD">CAMS GOLD</option>
                <option value="partner">Partenaire</option>
              </select>
            </label>
          ) : null}

          {(cashMovementType !== 'contribution' || cashContributor === 'partner') && (
            <label className="block text-xs font-bold text-[#192A24]">
              Partenaire concerné
              <select
                required
                value={cashPartnerId}
                onChange={(event) => setCashPartnerId(event.target.value)}
                className="mt-1 w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
              >
                <option value="">Sélectionner un partenaire</option>
                {store.partners.filter((partner) => partner.isActive).map((partner) => (
                  <option key={partner.id} value={partner.id}>{partner.name}</option>
                ))}
              </select>
              {store.partners.filter((partner) => partner.isActive).length === 0 && (
                <span className="mt-1 block font-medium text-amber-700">Créez d’abord un partenaire dans l’onglet Annuaire partenaires.</span>
              )}
            </label>
          )}

          <label className="block text-xs font-bold text-[#192A24]">
            Montant (FCFA)
            <input
              type="text"
              inputMode="decimal"
              required
              value={cashAmount}
              onChange={(event) => setCashAmount(event.target.value)}
              placeholder="Ex. 500000"
              className="mt-1 w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            />
          </label>

          {cashMovementType !== 'contribution' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-[#192A24]">
                Poids d’or (g)
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={cashWeight}
                  onChange={(event) => setCashWeight(event.target.value)}
                  placeholder="Ex. 25"
                  className="mt-1 w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
                />
              </label>
              <label className="block text-xs font-bold text-[#192A24]">
                Carat
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  min="1"
                  max="24"
                  value={cashKarat}
                  onChange={(event) => setCashKarat(event.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
                />
              </label>
            </div>
          )}

          <label className="block text-xs font-bold text-[#192A24]">
            Détail / référence (facultatif)
            <input
              type="text"
              value={cashDescription}
              onChange={(event) => setCashDescription(event.target.value)}
              placeholder="Ex. Achat lot d’or / retour de vente lot 1"
              className="mt-1 w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </label>

          {cashMovementError && (
            <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700">{cashMovementError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCashMovementModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200"
            >
              Annuler
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D39725] text-white">
              Enregistrer le mouvement
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal New Contract */}
      <Modal
        isOpen={showNewContractModal}
        onClose={() => setShowNewContractModal(false)}
        title="Nouveau contrat de partenariat"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateContract} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Partenaire co-contractant</label>
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
            >
              {store.partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type} - {p.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Scénario de partenariat</label>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value as PartnershipScenario)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            >
              {Object.entries(PARTNERSHIP_SCENARIO_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Partenaire (% bénéfice)</label>
              <input
                type="text"
                value={remunerationVal}
                onChange={(e) => setRemunerationVal(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Apport financier initial</label>
              <input
                type="text"
                value={financialContrib}
                onChange={(e) => setFinancialContrib(e.target.value)}
                placeholder="Montant en FCFA"
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Note / Description convention</label>
            <textarea
              rows={2}
              value={contractNote}
              onChange={(e) => setContractNote(e.target.value)}
              placeholder="ex: Financement achat lingots bruts..."
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewContractModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200"
            >
              Annuler
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D39725] text-white">
              Créer le contrat
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal New Loan */}
      <Modal
        isOpen={showNewLoanModal}
        onClose={() => setShowNewLoanModal(false)}
        title="Nouvelle avance ou prêt"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateLoan} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Direction de l'avance</label>
            <select
              value={loanDirection}
              onChange={(e) => setLoanDirection(e.target.value as PartnershipLoanDirection)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            >
              <option value="companyBorrows">L’entreprise emprunte (Partenaire prête)</option>
              <option value="companyLends">L’entreprise prête (Partenaire emprunte)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Partenaire concerné</label>
            <select
              value={loanPartnerId}
              onChange={(e) => setLoanPartnerId(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
            >
              {store.partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Montant principal (FCFA)</label>
            <input
              type="text"
              required
              value={loanPrincipal}
              onChange={(e) => setLoanPrincipal(e.target.value)}
              placeholder="ex: 10000000"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Date d'échéance prévue</label>
            <input
              type="date"
              value={loanDueDate}
              onChange={(e) => setLoanDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Motif / Objet</label>
            <input
              type="text"
              value={loanNote}
              onChange={(e) => setLoanNote(e.target.value)}
              placeholder="ex: Avance de campagne d'achat"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewLoanModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200"
            >
              Annuler
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-[#192A24] text-white">
              Enregistrer le prêt
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Repayment */}
      <Modal
        isOpen={Boolean(repayingLoanId)}
        onClose={() => setRepayingLoanId(null)}
        title="Enregistrer un remboursement"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmRepayment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Montant remboursé (FCFA)</label>
            <input
              type="text"
              required
              value={repaymentAmount}
              onChange={(e) => setRepaymentAmount(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Note de versement</label>
            <input
              type="text"
              value={repaymentNote}
              onChange={(e) => setRepaymentNote(e.target.value)}
              placeholder="ex: Virement bancaire / Espèces reçues"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRepayingLoanId(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200"
            >
              Annuler
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-[#008B62] text-white">
              Valider le remboursement
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Add Partner */}
      <Modal
        isOpen={showNewPartnerModal}
        onClose={() => setShowNewPartnerModal(false)}
        title="Nouveau partenaire"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreatePartner} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Nom complet / Société</label>
            <input
              type="text"
              required
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="ex: Fonderie du Mali"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Téléphone</label>
            <input
              type="text"
              value={partnerPhone}
              onChange={(e) => setPartnerPhone(e.target.value)}
              placeholder="+223 ..."
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Ville</label>
            <input
              type="text"
              value={partnerCity}
              onChange={(e) => setPartnerCity(e.target.value)}
              placeholder="Bamako"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Rôle / Type</label>
            <select
              value={partnerType}
              onChange={(e) => setPartnerType(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
            >
              <option value="Investisseur">Investisseur</option>
              <option value="Transformateur">Transformateur / Fondeur</option>
              <option value="Apporteur d’affaires">Apporteur d’affaires</option>
              <option value="Opérateur">Opérateur minier</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewPartnerModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200"
            >
              Annuler
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-[#008B62] text-white">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
