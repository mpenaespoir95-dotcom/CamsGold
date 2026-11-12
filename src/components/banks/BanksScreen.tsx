import React, { useState } from 'react';
import {
  Landmark,
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  Printer,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { AppPanel, Modal, PageHeading, SectionHeading } from '../common/UIComponents';
import { formatMoney } from '../../utils/goldMath';
import { LedgerEntry } from '../../types';
import { OfficialBankDepositSlipModal } from './OfficialBankDepositSlipModal';
import { BankDepositForm } from './BankDepositForm';

export const BanksScreen: React.FC = () => {
  const store = useAppStore();
  const [selectedBank, setSelectedBank] = useState<string>(() =>
    Object.keys(store.bankBalances).find((account) => !account.toLowerCase().includes('caisse')) ||
      'Caisse (espèces)'
  );
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankBalance, setNewBankBalance] = useState('');
  const [bankToDelete, setBankToDelete] = useState<string | null>(null);
  const [deleteBankError, setDeleteBankError] = useState<string | null>(null);
  const [addBankError, setAddBankError] = useState<string | null>(null);

  // Movement Form
  const [movementAmount, setMovementAmount] = useState('');
  const [movementLabel, setMovementLabel] = useState('');
  const [isDeposit, setIsDeposit] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals for Virement Client, Appro and Versement
  const [showClientTransferModal, setShowClientTransferModal] = useState(false);
  const [showApproModal, setShowApproModal] = useState(false);
  const [showVersementModal, setShowVersementModal] = useState(false);

  // Versement Caisse -> Banque state
  const cashAccountKey =
    Object.keys(store.bankBalances).find((k) => k.toLowerCase().includes('caisse')) || 'Caisse (espèces)';
  const cashBalance = store.bankBalances[cashAccountKey] ?? 0;
  const [versementAmount, setVersementAmount] = useState('');
  const [versementSlip, setVersementSlip] = useState('');
  const [versementDepositor, setVersementDepositor] = useState(store.userName || '');
  const [versementNote, setVersementNote] = useState('');
  const [versementSuccess, setVersementSuccess] = useState<string | null>(null);
  const [versementError, setVersementError] = useState<string | null>(null);

  // Virement Client state
  const [virementContactRef, setVirementContactRef] = useState('');
  const [virementCustomName, setVirementCustomName] = useState('');
  const [virementBank, setVirementBank] = useState('');
  const [virementAccount, setVirementAccount] = useState('');
  const [virementAmount, setVirementAmount] = useState('');
  const [virementFee, setVirementFee] = useState('');
  const [virementReason, setVirementReason] = useState('');
  const [virementSuccess, setVirementSuccess] = useState<string | null>(null);
  const [virementError, setVirementError] = useState<string | null>(null);

  // Appro state
  const [approToAccount, setApproToAccount] = useState('Caisse (espèces)');
  const [approAmount, setApproAmount] = useState('');
  const [approLabel, setApproLabel] = useState('');
  const [approSuccess, setApproSuccess] = useState<string | null>(null);
  const [approError, setApproError] = useState<string | null>(null);

  // Printable bank slip modal state
  const [printableBankSlipOp, setPrintableBankSlipOp] = useState<LedgerEntry | null>(null);
  const [showManualBankSlipModal, setShowManualBankSlipModal] = useState(false);
  const [manualSlipBank, setManualSlipBank] = useState<string>(selectedBank || 'Ecobank');
  const [manualSlipAmount, setManualSlipAmount] = useState('');
  const [manualSlipDepositor, setManualSlipDepositor] = useState(store.userName || '');
  const [manualSlipRef, setManualSlipRef] = useState(`BORD-${Date.now().toString().slice(-6)}`);
  const [manualSlipReason, setManualSlipReason] = useState('Versement d\'espèces de caisse');

  const handleExecuteVersement = (e: React.FormEvent) => {
    e.preventDefault();
    setVersementSuccess(null);
    setVersementError(null);
    const amt = parseFloat(versementAmount.replace(',', '.') || '0');
    if (amt <= 0 || !Number.isFinite(amt)) {
      setVersementError('Le montant du versement doit être supérieur à zéro.');
      return;
    }
    if (cashBalance < amt) {
      setVersementError(`Solde insuffisant en caisse (${formatMoney(cashBalance)} FCFA disponible).`);
      return;
    }
    const target = selectedBank === cashAccountKey ? 'Ecobank' : selectedBank;
    try {
      store.addCashToBankDeposit({
        targetBank: target,
        amount: amt,
        slipNumber: versementSlip.trim(),
        depositedBy: versementDepositor.trim(),
        note: versementNote.trim() || `Versement d'espèces Caisse → ${target}`,
      });
      setVersementSuccess(`Versement de ${formatMoney(amt)} FCFA vers ${target} validé avec succès.`);
      setVersementAmount('');
      setVersementSlip('');
      setVersementNote('');
      setTimeout(() => setShowVersementModal(false), 1400);
    } catch (err: unknown) {
      setVersementError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    setAddBankError(null);
    if (!newBankName.trim()) {
      setAddBankError('Le nom de la banque est requis.');
      return;
    }
    const balance = parseFloat(newBankBalance.replace(',', '.') || '0');
    try {
      store.addBank(newBankName, balance);
      setSelectedBank(newBankName.trim());
      setShowAddBankModal(false);
      setNewBankName('');
      setNewBankBalance('');
    } catch (err: unknown) {
      setAddBankError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteBank = () => {
    if (!bankToDelete) return;
    setDeleteBankError(null);
    try {
      store.deleteBank(bankToDelete);
      if (selectedBank === bankToDelete) {
        const remainingAccounts = Object.keys(store.bankBalances).filter((account) => account !== bankToDelete);
        setSelectedBank(remainingAccounts[0] || cashAccountKey);
      }
      setBankToDelete(null);
    } catch (err: unknown) {
      setDeleteBankError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleExecuteClientTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setVirementSuccess(null);
    setVirementError(null);
    const clientName = (virementContactRef
      ? store.contacts.find((c) => c.reference === virementContactRef)?.name || virementCustomName
      : virementCustomName
    ).trim();

    if (!clientName) {
      setVirementError('Veuillez spécifier le nom du client.');
      return;
    }
    const amt = parseFloat(virementAmount.replace(',', '.') || '0');
    if (amt <= 0) {
      setVirementError('Le montant du virement doit être positif.');
      return;
    }
    const fee = virementFee.trim() ? parseFloat(virementFee.replace(',', '.') || '0') : 0;

    try {
      store.transferToClient({
        fromAccount: selectedBank,
        clientName,
        clientBank: virementBank.trim(),
        clientAccountNumber: virementAccount.trim(),
        amount: amt,
        feeAmount: fee,
        reason: virementReason.trim() || 'Règlement client',
      });
      setVirementSuccess(`Virement de ${formatMoney(amt)} FCFA effectué avec succès depuis ${selectedBank}.`);
      setVirementAmount('');
      setVirementFee('');
      setVirementReason('');
      setTimeout(() => setShowClientTransferModal(false), 1200);
    } catch (err: unknown) {
      setVirementError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleExecuteAppro = (e: React.FormEvent) => {
    e.preventDefault();
    setApproSuccess(null);
    setApproError(null);
    const amt = parseFloat(approAmount.replace(',', '.') || '0');
    if (amt <= 0) {
      setApproError("Le montant de l'appro doit être positif.");
      return;
    }
    try {
      store.transferFunds({
        fromAccount: selectedBank,
        toAccount: approToAccount,
        amount: amt,
        label: approLabel.trim() || `Appro depuis ${selectedBank}`,
      });
      setApproSuccess(`Approvisionnement de ${formatMoney(amt)} FCFA validé.`);
      setApproAmount('');
      setApproLabel('');
      setTimeout(() => setShowApproModal(false), 1200);
    } catch (err: unknown) {
      setApproError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    const amount = parseFloat(movementAmount.replace(',', '.') || '0');
    if (amount <= 0) {
      setErrorMsg('Le montant doit être supérieur à zéro.');
      return;
    }
    if (!movementLabel.trim()) {
      setErrorMsg('Le libellé de l’opération est requis.');
      return;
    }
    try {
      store.addMovement(selectedBank, amount, isDeposit, movementLabel.trim());
      setSuccessMsg(`Mouvement de ${formatMoney(amount)} FCFA enregistré sur ${selectedBank}.`);
      setMovementAmount('');
      setMovementLabel('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const bankOperations = store.operations.filter((op) => {
    const matchesBank = op.subtitle.toLowerCase().includes(selectedBank.toLowerCase());
    if (!matchesBank) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return op.title.toLowerCase().includes(q) || op.subtitle.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-6">
      <PageHeading
        eyebrow="Trésorerie · Banques"
        title="Banques & Versements"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setVersementSuccess(null);
                setVersementError(null);
                setShowVersementModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-black cursor-pointer shadow-xs transition-colors"
            >
              <ArrowDownLeft size={15} />
              <span>Versement Caisse → Banque</span>
            </button>
            <button
              onClick={() => {
                setVirementSuccess(null);
                setVirementError(null);
                setShowClientTransferModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#008B62] hover:bg-[#007452] text-white text-xs font-black cursor-pointer shadow-xs transition-colors"
            >
              <Send size={15} />
              <span>Virement client</span>
            </button>
            <button
              onClick={() => {
                setApproSuccess(null);
                setApproError(null);
                setShowApproModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#192A24] hover:bg-[#253D34] text-white text-xs font-bold cursor-pointer shadow-xs transition-colors"
            >
              <ArrowLeftRight size={15} />
              <span>Nouvel Appro</span>
            </button>
            <button
              onClick={() => {
                setManualSlipBank(selectedBank);
                setShowManualBankSlipModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 text-[#192A24] border border-[#E8D8BE] text-xs font-black cursor-pointer shadow-xs transition-colors"
            >
              <Printer size={15} className="text-[#D39725]" />
              <span>Imprimer Bordereau Banque</span>
            </button>
            <button
              onClick={() => setShowAddBankModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 text-[#192A24] border border-[#E8D8BE] text-xs font-bold cursor-pointer shadow-xs transition-colors"
            >
              <Plus size={15} />
              <span>Ajouter une banque</span>
            </button>
          </div>
        }
      />

      {/* Total Treasury Banner */}
      <AppPanel className="bg-gradient-to-r from-[#192A24] to-[#253D34] text-white border-0 shadow-lg">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#F2BD45]">
          Trésorerie Totale Disponible
        </span>
        <div className="text-3xl sm:text-4xl font-black text-white mt-1">
          {formatMoney(store.totalTreasury)} <span className="text-xl font-bold text-white/70">FCFA</span>
        </div>
        <p className="text-xs text-white/60 mt-1">
          Cumul des soldes bancaires et de la caisse espèces
        </p>
      </AppPanel>

      {/* Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(store.bankBalances).map(([accountName, balance]) => {
          const isSelected = selectedBank === accountName;
          const isCash = accountName.toLowerCase().includes('caisse');
          return (
            <div
              key={accountName}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white border-[#D39725] shadow-md ring-2 ring-[#D39725]/30'
                  : 'bg-[#FFFDFA] border-[#E8D8BE] hover:bg-white hover:shadow-xs'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedBank(accountName)}
                className="w-full text-left cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isCash ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isCash ? <Wallet size={18} /> : <Landmark size={18} />}
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#D39725]/15 text-[#9E731B]">
                      Actif
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-[#7D8176] truncate">{accountName}</div>
                <div className="text-lg font-black text-[#192A24] mt-0.5">{formatMoney(balance)} FCFA</div>
              </button>
              {!isCash && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteBankError(null);
                    setBankToDelete(accountName);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
                  title={`Supprimer ${accountName}`}
                >
                  <Trash2 size={13} />
                  <span>Supprimer la banque</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Main workspace for selected bank */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New movement form */}
        <AppPanel className="lg:col-span-1">
          <SectionHeading title={`Mouvement sur ${selectedBank}`} icon={<Landmark size={18} />} />

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAddMovement} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Sens de l'opération</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeposit(true)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    isDeposit
                      ? 'bg-[#FFD27A] text-[#192A24] border-[#E7AD35]'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <ArrowDownLeft size={15} />
                  <span>Dépôt (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeposit(false)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    !isDeposit
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <ArrowUpRight size={15} />
                  <span>Retrait (-)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Montant (FCFA)</label>
              <input
                type="text"
                required
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                placeholder="ex: 500000"
                className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Libellé du mouvement</label>
              <input
                type="text"
                required
                value={movementLabel}
                onChange={(e) => setMovementLabel(e.target.value)}
                placeholder="ex: Versement espèces client / Règlements"
                className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#192A24] hover:bg-[#253D34] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Enregistrer le mouvement
            </button>
          </form>
        </AppPanel>

        {/* Selected bank statement history */}
        <AppPanel className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8D8BE] pb-3 mb-4">
            <SectionHeading title={`Relevé d'opérations · ${selectedBank}`} />
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer ce relevé..."
                className="pl-8 pr-3 py-1.5 bg-white rounded-lg border border-[#E8D8BE] text-xs"
              />
            </div>
          </div>

          {bankOperations.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">
              Aucun mouvement spécifique à {selectedBank} enregistré.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {bankOperations.map((op) => (
                <div key={op.id} className="py-2.5 px-2 flex items-center justify-between text-xs hover:bg-gray-50/80 rounded-lg transition-colors">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="font-bold text-[#192A24] truncate">{op.title}</div>
                    <div className="text-[11px] text-[#7D8176] truncate">
                      {op.subtitle} · {op.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-black whitespace-nowrap ${
                        op.isIncome ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {op.isIncome ? '+' : '-'} {formatMoney(op.amount)} FCFA
                    </span>
                    <button
                      type="button"
                      onClick={() => setPrintableBankSlipOp(op)}
                      title="Imprimer bordereau de banque"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-[#D39725] hover:bg-amber-50 cursor-pointer transition-colors"
                    >
                      <Printer size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppPanel>
      </div>

      {/* Modal Add Bank */}
      <Modal
        isOpen={showAddBankModal}
        onClose={() => setShowAddBankModal(false)}
        title="Ajouter un compte bancaire"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddBank} className="space-y-4">
          {addBankError && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
              {addBankError}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Nom de l'établissement</label>
            <input
              type="text"
              required
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              placeholder="ex: BOA Mali / Coris Bank / BDM"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Solde d'ouverture (FCFA)</label>
            <input
              type="text"
              value={newBankBalance}
              onChange={(e) => setNewBankBalance(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddBankModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200"
            >
              Annuler
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D39725] text-white">
              Créer le compte
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(bankToDelete)}
        onClose={() => {
          setBankToDelete(null);
          setDeleteBankError(null);
        }}
        title="Supprimer un compte bancaire"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Confirmer la suppression du compte <strong>{bankToDelete}</strong> ? Cette action retire
            le compte des comptes disponibles, sans effacer l’historique des opérations.
          </p>
          <p className="text-xs text-gray-500">Seuls les comptes avec un solde nul peuvent être supprimés.</p>
          {deleteBankError && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
              {deleteBankError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setBankToDelete(null);
                setDeleteBankError(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDeleteBank}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Virement Client */}
      <Modal
        isOpen={showClientTransferModal}
        onClose={() => setShowClientTransferModal(false)}
        title={`Virement bancaire vers client (Débit : ${selectedBank})`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleExecuteClientTransfer} className="space-y-4">
          {virementSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{virementSuccess}</span>
            </div>
          )}

          {virementError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{virementError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Client bénéficiaire</label>
            <select
              value={virementContactRef}
              onChange={(e) => {
                setVirementContactRef(e.target.value);
                const found = store.contacts.find((c) => c.reference === e.target.value);
                if (found) {
                  setVirementCustomName(found.name);
                  if (found.bankName) setVirementBank(found.bankName);
                  if (found.bankAccountNumber) setVirementAccount(found.bankAccountNumber);
                }
              }}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold text-[#192A24]"
            >
              <option value="">-- Choisir dans la liste des clients --</option>
              {store.contacts.map((c) => (
                <option key={c.reference} value={c.reference}>
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>

          {!virementContactRef && (
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Ou saisir un nouveau client</label>
              <input
                type="text"
                value={virementCustomName}
                onChange={(e) => setVirementCustomName(e.target.value)}
                placeholder="Nom complet du client bénéficiaire"
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Banque du client</label>
              <input
                type="text"
                required
                value={virementBank}
                onChange={(e) => setVirementBank(e.target.value)}
                placeholder="ex: Ecobank, UBA, Wave..."
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">N° Compte / RIB client</label>
              <input
                type="text"
                required
                value={virementAccount}
                onChange={(e) => setVirementAccount(e.target.value)}
                placeholder="Numéro de compte / RIB"
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Montant à virer (FCFA)</label>
              <input
                type="text"
                required
                value={virementAmount}
                onChange={(e) => setVirementAmount(e.target.value)}
                placeholder="Saisir le montant"
                className="w-full px-3 py-2 bg-emerald-50/50 rounded-xl border border-emerald-300 text-xs font-black text-[#192A24]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Frais bancaires (FCFA)</label>
              <input
                type="text"
                value={virementFee}
                onChange={(e) => setVirementFee(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Motif / Référence</label>
            <input
              type="text"
              required
              value={virementReason}
              onChange={(e) => setVirementReason(e.target.value)}
              placeholder="ex: Règlement achat or lot ACH-..."
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowClientTransferModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-black bg-[#008B62] hover:bg-[#007452] text-white shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Send size={14} />
              <span>Valider le virement au client</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Appro (Approvisionnement interne) */}
      <Modal
        isOpen={showApproModal}
        onClose={() => setShowApproModal(false)}
        title={`Nouvel Appro (Approvisionnement depuis ${selectedBank})`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleExecuteAppro} className="space-y-4">
          {approSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{approSuccess}</span>
            </div>
          )}

          {approError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{approError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Compte Cible (Crédité)</label>
            <select
              value={approToAccount}
              onChange={(e) => setApproToAccount(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold text-[#192A24]"
            >
              {Object.entries(store.bankBalances)
                .filter(([b]) => b !== selectedBank)
                .map(([b, bal]) => (
                  <option key={b} value={b}>
                    {b} (Solde : {formatMoney(bal)} F)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Montant de l'appro (FCFA)</label>
            <input
              type="text"
              required
              value={approAmount}
              onChange={(e) => setApproAmount(e.target.value)}
              placeholder="ex: 1000000"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Libellé / Motif</label>
            <input
              type="text"
              required
              value={approLabel}
              onChange={(e) => setApproLabel(e.target.value)}
              placeholder={`ex: Approvisionnement vers ${approToAccount}`}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowApproModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#192A24] hover:bg-[#253D34] text-white shadow-xs cursor-pointer"
            >
              Valider l'appro
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Versement Caisse -> Banque */}
      {/* Modal Versement Caisse -> Banque */}
      <Modal
        isOpen={showVersementModal}
        onClose={() => setShowVersementModal(false)}
        title={`Versement d'espèces : Caisse → ${selectedBank === cashAccountKey ? 'Banque' : selectedBank}`}
        maxWidth="max-w-4xl"
      >
        <div className="max-h-[82vh] overflow-y-auto pr-1">
          <BankDepositForm
            defaultBank={selectedBank === cashAccountKey ? undefined : selectedBank}
            onSuccess={(newOp) => {
              setShowVersementModal(false);
              setPrintableBankSlipOp(newOp);
            }}
            onOpenSlipPreview={(tempOp) => {
              setPrintableBankSlipOp(tempOp as LedgerEntry);
            }}
          />
        </div>
      </Modal>

      {/* Modal Impression Bordereau Bancaire Officiel (Photo de référence Crédit du Congo & Multi-banques) */}
      <OfficialBankDepositSlipModal
        isOpen={Boolean(printableBankSlipOp) || showManualBankSlipModal}
        onClose={() => {
          setPrintableBankSlipOp(null);
          setShowManualBankSlipModal(false);
        }}
        initialBank={printableBankSlipOp?.depositDetails?.targetBank || selectedBank || 'Crédit du Congo'}
        initialAmount={
          printableBankSlipOp
            ? printableBankSlipOp.amount
            : parseFloat(manualSlipAmount.replace(',', '.') || '0') || 0
        }
        initialDepositor={
          printableBankSlipOp?.depositDetails?.depositedBy ||
          printableBankSlipOp?.depositor ||
          manualSlipDepositor ||
          store.userName
        }
        initialDate={printableBankSlipOp?.date}
        initialSlipRef={printableBankSlipOp?.depositDetails?.slipNumber || manualSlipRef}
        initialProvenance={
          printableBankSlipOp?.depositDetails?.note ||
          printableBankSlipOp?.subtitle ||
          manualSlipReason
        }
        operation={printableBankSlipOp}
      />
    </div>
  );
};
