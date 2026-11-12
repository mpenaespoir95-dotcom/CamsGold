import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Landmark,
  FileText,
  Printer,
  Coins,
  Banknote,
  Sparkles,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  ShieldCheck,
  Building,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowDownLeft,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { formatMoney } from '../../utils/goldMath';
import { numberToWordsFr } from '../../utils/numberToWordsFr';
import { DepositDenominations, BankDepositDetails, LedgerEntry } from '../../types';
import { findBankTemplate } from './OfficialBankDepositSlipModal';

interface BankDepositFormProps {
  defaultBank?: string;
  onSuccess?: (newOperation: LedgerEntry) => void;
  onOpenSlipPreview?: (tempOperation: Partial<LedgerEntry>) => void;
}

export const BankDepositForm: React.FC<BankDepositFormProps> = ({
  defaultBank,
  onSuccess,
  onOpenSlipPreview,
}) => {
  const store = useAppStore();

  // Find cash account and balance
  const cashAccountName =
    Object.keys(store.bankBalances).find((k) => k.toLowerCase().includes('caisse')) || 'Caisse (espèces)';
  const currentCashBalance = store.bankBalances[cashAccountName] ?? 0;

  // Available banks (excluding cash)
  const availableBanks = useMemo(() => {
    return Object.keys(store.bankBalances).filter((b) => b !== cashAccountName);
  }, [store.bankBalances, cashAccountName]);

  // Initial bank selection
  const [targetBank, setTargetBank] = useState<string>(() => {
    if (defaultBank && defaultBank !== cashAccountName && store.bankBalances[defaultBank] !== undefined) {
      return defaultBank;
    }
    return availableBanks[0] || '';
  });

  // Matched bank template
  const matchedTemplate = useMemo(() => {
    return (
      findBankTemplate(targetBank)
    );
  }, [targetBank]);

  // Bank coordinates
  const [bankGroupName, setBankGroupName] = useState<string>(
    matchedTemplate?.groupName || ''
  );
  const [accountNumber, setAccountNumber] = useState<string>(
    matchedTemplate?.accountNumber || ''
  );
  const [accountHolder, setAccountHolder] = useState<string>('CAMS GOLD COMPTOIR SARL');
  const [accountAddress, setAccountAddress] = useState<string>('');

  // Depositor / Mandataire fields
  const [depositedBy, setDepositedBy] = useState<string>(store.userName || '');
  const [depositorAddress, setDepositorAddress] = useState<string>('');
  const [depositorPhone, setDepositorPhone] = useState<string>('');
  const [depositorEmail, setDepositorEmail] = useState<string>('');
  const [orderOf, setOrderOf] = useState<string>('CAMS GOLD COMPTOIR');
  const [forAccountOf, setForAccountOf] = useState<string>('CAMS GOLD COMPTOIR SARL');

  // Metadata & Regulatory
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [shiftPeriod, setShiftPeriod] = useState<'Matin' | 'Soir'>('Matin');
  const [slipNumber, setSlipNumber] = useState<string>(() => `BORD-${Date.now().toString().slice(-6)}`);
  const [provenanceFonds, setProvenanceFonds] = useState<string>('');
  const [note, setNote] = useState<string>("Versement d'espèces de la Caisse vers la Banque");

  // Denominations: Billets
  const [b10000, setB10000] = useState<number>(0);
  const [b5000, setB5000] = useState<number>(0);
  const [b2000, setB2000] = useState<number>(0);
  const [b1000, setB1000] = useState<number>(0);
  const [b500, setB500] = useState<number>(0);

  // Denominations: Pièces
  const [p100, setP100] = useState<number>(0);
  const [p500, setP500] = useState<number>(0);
  const [p200, setP200] = useState<number>(0);
  const [p50, setP50] = useState<number>(0);
  const [p25, setP25] = useState<number>(0);
  const [p10, setP10] = useState<number>(0);
  const [p5, setP5] = useState<number>(0);
  const [p2, setP2] = useState<number>(0);
  const [p1, setP1] = useState<number>(0);

  const [monnaieRendue, setMonnaieRendue] = useState<number>(0);

  // Helper auto-ventilate lump sum modal/state
  const [lumpSumInput, setLumpSumInput] = useState<string>('');
  const [showAutoVentilatePrompt, setShowAutoVentilatePrompt] = useState<boolean>(false);

  // Status feedback
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Update bank defaults when bank changes
  const handleBankChange = (newBank: string) => {
    setTargetBank(newBank);
    const t = findBankTemplate(newBank);
    if (t) {
      setBankGroupName(t.groupName || '');
      setAccountNumber(t.accountNumber || '');
    }
  };

  // Subtotals
  const totalBillets = useMemo(() => {
    return (
      b10000 * 10000 +
      b5000 * 5000 +
      b2000 * 2000 +
      b1000 * 1000 +
      b500 * 500
    );
  }, [b10000, b5000, b2000, b1000, b500]);

  const totalPieces = useMemo(() => {
    return (
      p500 * 500 +
      p200 * 200 +
      p100 * 100 +
      p50 * 50 +
      p25 * 25 +
      p10 * 10 +
      p5 * 5 +
      p2 * 2 +
      p1 * 1
    );
  }, [p500, p200, p100, p50, p25, p10, p5, p2, p1]);

  const totalAmount = useMemo(() => {
    const net = totalBillets + totalPieces - monnaieRendue;
    return net > 0 ? net : 0;
  }, [totalBillets, totalPieces, monnaieRendue]);

  // Amount in French words
  const amountInWords = useMemo(() => {
    if (totalAmount <= 0) return 'Zéro Franc CFA';
    return `${numberToWordsFr(totalAmount)} Francs CFA`;
  }, [totalAmount]);

  // Auto-decompose a given amount into denominations
  const autoVentilateAmount = (targetVal: number) => {
    if (targetVal <= 0 || !Number.isFinite(targetVal)) return;

    let rem = targetVal;
    // 10 000 F billets (dominant for gold counter transactions)
    const count10k = Math.floor(rem / 10000);
    rem -= count10k * 10000;

    const count5k = Math.floor(rem / 5000);
    rem -= count5k * 5000;

    const count2k = Math.floor(rem / 2000);
    rem -= count2k * 2000;

    const count1k = Math.floor(rem / 1000);
    rem -= count1k * 1000;

    const count500 = Math.floor(rem / 500);
    rem -= count500 * 500;

    const count100 = Math.floor(rem / 100);
    rem -= count100 * 100;

    const count50 = Math.floor(rem / 50);
    rem -= count50 * 50;

    const count25 = Math.floor(rem / 25);
    rem -= count25 * 25;

    const count10 = Math.floor(rem / 10);
    rem -= count10 * 10;

    const count5 = Math.floor(rem / 5);
    rem -= count5 * 5;

    const count2 = Math.floor(rem / 2);
    rem -= count2 * 2;

    const count1 = Math.floor(rem);

    setB10000(count10k);
    setB5000(count5k);
    setB2000(count2k);
    setB1000(count1k);
    setB500(count500);
    setP500(0);
    setP200(0);
    setP100(count100);
    setP50(count50);
    setP25(count25);
    setP10(count10);
    setP5(count5);
    setP2(count2);
    setP1(count1);
    setMonnaieRendue(0);
    setShowAutoVentilatePrompt(false);
  };

  const handleResetCounts = () => {
    setB10000(0);
    setB5000(0);
    setB2000(0);
    setB1000(0);
    setB500(0);
    setP100(0);
    setP500(0);
    setP200(0);
    setP50(0);
    setP25(0);
    setP10(0);
    setP5(0);
    setP2(0);
    setP1(0);
    setMonnaieRendue(0);
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    setFeedbackSuccess(null);

    if (totalAmount <= 0) {
      setFeedbackError('Veuillez saisir au moins une coupure (billet ou pièce) pour définir le montant du versement.');
      return;
    }

    if (currentCashBalance < totalAmount) {
      setFeedbackError(
        `Solde insuffisant en caisse (${formatMoney(currentCashBalance)} FCFA disponible) pour effectuer un versement de ${formatMoney(totalAmount)} FCFA.`
      );
      return;
    }

    try {
      const denominationsData: DepositDenominations = {
        b10000,
        b5000,
        b2000,
        b1000,
        b500,
        p100,
        p500,
        p200,
        p50,
        p25,
        p10,
        p5,
        p2,
        p1,
        monnaieRendue,
      };

      store.addCashToBankDeposit({
        targetBank,
        amount: totalAmount,
        slipNumber: slipNumber.trim(),
        depositedBy: depositedBy.trim(),
        date,
        note: note.trim() || `Versement d'espèces de la Caisse vers ${targetBank}`,
        bankGroupName: bankGroupName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
        accountAddress: accountAddress.trim(),
        amountInWords,
        depositorAddress: depositorAddress.trim(),
        depositorPhone: depositorPhone.trim(),
        depositorEmail: depositorEmail.trim(),
        orderOf: orderOf.trim(),
        forAccountOf: forAccountOf.trim(),
        provenanceFonds: provenanceFonds.trim(),
        shiftPeriod,
        denominations: denominationsData,
      });

      setFeedbackSuccess(
        `Versement de ${formatMoney(totalAmount)} FCFA vers ${targetBank} enregistré avec succès ! Toutes les coupures ont été sauvegardées sur le bordereau officiel.`
      );

      // Find the newly added entry from store operations or synthesize it for immediate preview
      setTimeout(() => {
        const found = store.operations.find(
          (op: LedgerEntry) => op.isDeposit && op.depositDetails?.slipNumber === slipNumber.trim()
        );
        if (found && onSuccess) {
          onSuccess(found);
        } else if (onSuccess) {
          // Fallback constructed object
          const synth: LedgerEntry = {
            id: `op-dep-${Date.now()}`,
            title: `Versement bancaire · ${cashAccountName} → ${targetBank}`,
            subtitle: `Bordereau N° ${slipNumber} · Déposant : ${depositedBy}`,
            amount: totalAmount,
            date,
            isDeposit: true,
            depositDetails: {
              targetBank,
              bankGroupName,
              accountNumber,
              accountHolder,
              accountAddress,
              amount: totalAmount,
              amountInWords,
              slipNumber,
              depositedBy,
              depositorAddress,
              depositorPhone,
              depositorEmail,
              orderOf,
              forAccountOf,
              provenanceFonds,
              shiftPeriod,
              note,
              denominations: denominationsData,
            },
          };
          onSuccess(synth);
        }
      }, 100);

      // Refresh slip number for next operation
      setSlipNumber(`BORD-${Date.now().toString().slice(-6)}`);
    } catch (err: any) {
      setFeedbackError(err.message || "Erreur lors de l'enregistrement du versement.");
    }
  };

  const handlePreviewCurrentSlip = () => {
    if (!onOpenSlipPreview) return;
    const denominationsData: DepositDenominations = {
      b10000,
      b5000,
      b2000,
      b1000,
      b500,
      p100,
      p500,
      p200,
      p50,
      p25,
      p10,
      p5,
      p2,
      p1,
      monnaieRendue,
    };
    onOpenSlipPreview({
      title: `Versement bancaire · ${cashAccountName} → ${targetBank}`,
      subtitle: `Bordereau N° ${slipNumber} · ${depositedBy}`,
      amount: totalAmount,
      date,
      isDeposit: true,
      depositDetails: {
        targetBank,
        bankGroupName,
        accountNumber,
        accountHolder,
        accountAddress,
        amount: totalAmount,
        amountInWords,
        slipNumber,
        depositedBy,
        depositorAddress,
        depositorPhone,
        depositorEmail,
        orderOf,
        forAccountOf,
        provenanceFonds,
        shiftPeriod,
        note,
        denominations: denominationsData,
      },
    });
  };

  const destBalance = store.bankBalances[targetBank] ?? 0;
  const postCashBalance = currentCashBalance - totalAmount;
  const postDestBalance = destBalance + totalAmount;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Alert / Feedback */}
      {feedbackSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-start gap-3 shadow-xs animate-in fade-in">
          <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-600" />
          <div className="text-xs">
            <p className="font-bold text-emerald-800 text-sm">{feedbackSuccess}</p>
            <p className="mt-1 text-emerald-700">
              Le bordereau officiel est prêt pour impression ou archivage comptable.
            </p>
          </div>
        </div>
      )}

      {feedbackError && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl flex items-start gap-3 shadow-xs animate-in fade-in">
          <AlertCircle size={20} className="shrink-0 mt-0.5 text-rose-600" />
          <div className="text-xs">
            <p className="font-bold text-rose-800 text-sm">{feedbackError}</p>
          </div>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="p-4 bg-gradient-to-r from-[#FAF8F3] via-amber-50/40 to-[#FAF8F3] border border-[#E8D8BE] rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D39725]/15 border border-[#D39725]/30 flex items-center justify-center text-[#966308]">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#192A24] flex items-center gap-2">
                <span>Préparation du bordereau de versement d'espèces</span>
                <span className="px-2 py-0.5 text-[10px] bg-[#D39725]/20 text-[#825300] font-black rounded-md">
                  Modèle Référence
                </span>
              </h3>
              <p className="text-[11px] text-gray-600">
                Saisie complète de toutes les mentions du bordereau avec décomposition coupure par coupure (10K, 5K, etc.).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSlipPreview && (
              <button
                type="button"
                onClick={handlePreviewCurrentSlip}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white hover:bg-gray-50 text-[#192A24] border border-[#D39725]/40 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer size={15} className="text-[#D39725]" />
                <span>Aperçu Bordereau Imprimable</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: 2 columns for Bank Info & Depositor Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Column: Bank & Account Details */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <Landmark size={17} className="text-[#008B62]" />
              <h4 className="text-xs font-black text-[#192A24] uppercase tracking-wider">
                1. Banque & Compte à Créditer
              </h4>
            </div>
            <span className="text-[10px] font-bold text-gray-400">Section Banque</span>
          </div>

          {/* Cash Source info */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              Compte source débité (Caisse Espèces)
            </label>
            <div className="flex items-center justify-between px-3.5 py-2 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs">
              <div className="flex items-center gap-2 font-black text-[#192A24]">
                <Wallet size={15} className="text-[#966308]" />
                <span>{cashAccountName}</span>
              </div>
              <span className="font-mono font-black text-[#966308]">
                {formatMoney(currentCashBalance)} FCFA
              </span>
            </div>
          </div>

          {/* Target Bank */}
          <div>
            <label className="block text-[11px] font-bold text-[#192A24] mb-1">
              Banque bénéficiaire (Destination) *
            </label>
            <select
              value={targetBank}
              onChange={(e) => handleBankChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-black text-[#192A24] cursor-pointer"
            >
              {!availableBanks.length && <option value="">Aucune banque configurée</option>}
              {availableBanks.map((b) => (
                <option key={b} value={b}>
                  {b} (Solde actuel : {formatMoney(store.bankBalances[b] ?? 0)} FCFA)
                </option>
              ))}
            </select>
          </div>

          {/* Bank Group */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              Nom du Groupe / Filiale bancaire
            </label>
            <input
              type="text"
              value={bankGroupName}
              onChange={(e) => setBankGroupName(e.target.value)}
              placeholder="ex: Groupe Attijariwafa bank"
              className="w-full px-3 py-2 bg-gray-50/50 rounded-xl border border-gray-200 text-xs font-medium"
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-[11px] font-bold text-[#192A24] mb-1">
              N° de Compte à créditer *
            </label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Saisir le numéro de compte"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-mono font-black text-[#192A24]"
            />
          </div>

          {/* Account Holder */}
          <div>
            <label className="block text-[11px] font-bold text-[#192A24] mb-1">
              Titulaire du compte (M. / Entreprise) *
            </label>
            <input
              type="text"
              required
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="ex: CAMS GOLD COMPTOIR SARL"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            />
          </div>

          {/* Account Address */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              Adresse du titulaire / Agence
            </label>
            <input
              type="text"
              value={accountAddress}
              onChange={(e) => setAccountAddress(e.target.value)}
              placeholder="ex: Avenue Amilcar Cabral, Brazzaville"
              className="w-full px-3 py-2 bg-gray-50/50 rounded-xl border border-gray-200 text-xs"
            />
          </div>
        </div>

        {/* Right Column: Depositor & Mandataire Details */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <User size={17} className="text-[#D39725]" />
              <h4 className="text-xs font-black text-[#192A24] uppercase tracking-wider">
                2. Déposant, Mandataire & Modalités
              </h4>
            </div>
            <span className="text-[10px] font-bold text-gray-400">Mentions Légales</span>
          </div>

          {/* Deposited by */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#192A24] mb-1">
                Effectué par M. (Porteur / Déposant) *
              </label>
              <input
                type="text"
                required
                value={depositedBy}
                onChange={(e) => setDepositedBy(e.target.value)}
                placeholder="Nom du déposant"
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                Demeurant à (Adresse du porteur)
              </label>
              <input
                type="text"
                value={depositorAddress}
                onChange={(e) => setDepositorAddress(e.target.value)}
                placeholder="ex: Centre-ville, Brazzaville"
                className="w-full px-3 py-2 bg-gray-50/50 rounded-xl border border-gray-200 text-xs"
              />
            </div>
          </div>

          {/* Contact (Phone & Email) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                Téléphone du déposant
              </label>
              <input
                type="text"
                value={depositorPhone}
                onChange={(e) => setDepositorPhone(e.target.value)}
                placeholder="ex: +242 06 600 00 00"
                className="w-full px-3 py-2 bg-gray-50/50 rounded-xl border border-gray-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={depositorEmail}
                onChange={(e) => setDepositorEmail(e.target.value)}
                placeholder="ex: direction@camsgold.com"
                className="w-full px-3 py-2 bg-gray-50/50 rounded-xl border border-gray-200 text-xs"
              />
            </div>
          </div>

          {/* D'ordre de / Pour compte de */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                D'ordre de
              </label>
              <input
                type="text"
                value={orderOf}
                onChange={(e) => setOrderOf(e.target.value)}
                placeholder="ex: CAMS GOLD COMPTOIR"
                className="w-full px-3 py-2 bg-gray-50/50 rounded-xl border border-gray-200 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                Pour compte de
              </label>
              <input
                type="text"
                value={forAccountOf}
                onChange={(e) => setForAccountOf(e.target.value)}
                placeholder="ex: CAMS GOLD COMPTOIR SARL"
                className="w-full px-3 py-2 bg-gray-50/50 rounded-xl border border-gray-200 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Vacation (Matin / Soir) & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#192A24] mb-1">
                Vacation
              </label>
              <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setShiftPeriod('Matin')}
                  className={`py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    shiftPeriod === 'Matin'
                      ? 'bg-white text-[#966308] shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Matin
                </button>
                <button
                  type="button"
                  onClick={() => setShiftPeriod('Soir')}
                  className={`py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    shiftPeriod === 'Soir'
                      ? 'bg-white text-[#192A24] shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Soir
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#192A24] mb-1">
                Date de l'opération
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#192A24] mb-1">
                N° Bordereau / Reçu
              </label>
              <input
                type="text"
                value={slipNumber}
                onChange={(e) => setSlipNumber(e.target.value)}
                placeholder="ex: BORD-0842"
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-mono font-bold"
              />
            </div>
          </div>

          {/* Provenance des fonds */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              Provenance des fonds (Réglementaire CEMAC / BCEAO)
            </label>
            <input
              type="text"
              value={provenanceFonds}
              onChange={(e) => setProvenanceFonds(e.target.value)}
              placeholder="ex: Recettes de vente d'or brut comptoir"
              className="w-full px-3 py-2 bg-gray-50/50 rounded-xl border border-gray-200 text-xs"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: DENOMINATIONS BREAKDOWN (BILLETS & PIÈCES) */}
      <div className="p-5 bg-white rounded-2xl border-2 border-[#D39725]/30 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Banknote size={20} className="text-[#008B62]" />
              <h4 className="text-sm font-black text-[#192A24] uppercase tracking-wide">
                3. Détail des Espèces Versées (Coupures du Bordereau)
              </h4>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Remplissez le nombre de billets et de pièces exactement comme sur le bordereau papier de la banque.
            </p>
          </div>

          {/* Quick Helpers */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAutoVentilatePrompt(true)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-50 hover:bg-amber-100 text-[#966308] border border-amber-200 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Ventiler un montant global</span>
            </button>

            <button
              type="button"
              onClick={handleResetCounts}
              className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all cursor-pointer flex items-center gap-1"
            >
              <RotateCcw size={13} />
              <span>Vider</span>
            </button>
          </div>
        </div>

        {/* Modal / Prompt to Auto-ventilate a lump sum */}
        {showAutoVentilatePrompt && (
          <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="text-xs">
              <p className="font-bold text-[#192A24]">Ventilation automatique rapide :</p>
              <p className="text-gray-600 text-[11px]">
                Saisissez un montant global (ex: 15 000 000). Il sera décomposé automatiquement en coupures de 10K, 5K, etc.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={lumpSumInput}
                onChange={(e) => setLumpSumInput(e.target.value)}
                placeholder="Montant FCFA..."
                className="w-36 px-2.5 py-1.5 bg-white rounded-lg border border-amber-300 text-xs font-mono font-bold"
              />
              <button
                type="button"
                onClick={() => autoVentilateAmount(parseFloat(lumpSumInput || '0'))}
                className="px-3 py-1.5 bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
              >
                Appliquer
              </button>
              <button
                type="button"
                onClick={() => setShowAutoVentilatePrompt(false)}
                className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Billets & Pièces Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BILLETS TABLE */}
          <div className="bg-[#FAF8F3] p-4 rounded-xl border border-[#E8D8BE] space-y-3">
            <div className="flex items-center justify-between border-b border-[#E8D8BE] pb-2">
              <div className="flex items-center gap-2">
                <Banknote size={16} className="text-[#008B62]" />
                <span className="text-xs font-black text-[#192A24] uppercase tracking-wider">
                  Billets de Banque
                </span>
              </div>
              <span className="text-[11px] font-mono font-black text-[#008B62] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Total : {formatMoney(totalBillets)} F
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* 10 000 FCFA */}
              <div className="grid grid-cols-12 items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                <div className="col-span-4 font-black text-[#192A24] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>10 000 FCFA</span>
                </div>
                <div className="col-span-4">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">Nb :</span>
                    <input
                      type="number"
                      min="0"
                      value={b10000 || ''}
                      onChange={(e) => setB10000(Math.max(0, parseInt(e.target.value || '0', 10)))}
                      placeholder="0"
                      className="w-full px-2 py-1 bg-[#FAF8F3] border border-gray-300 rounded font-mono font-bold text-right"
                    />
                  </div>
                </div>
                <div className="col-span-4 text-right font-mono font-black text-[#192A24]">
                  {formatMoney(b10000 * 10000)} F
                </div>
              </div>

              {/* 5 000 FCFA */}
              <div className="grid grid-cols-12 items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                <div className="col-span-4 font-black text-[#192A24] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                  <span>5 000 FCFA</span>
                </div>
                <div className="col-span-4">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">Nb :</span>
                    <input
                      type="number"
                      min="0"
                      value={b5000 || ''}
                      onChange={(e) => setB5000(Math.max(0, parseInt(e.target.value || '0', 10)))}
                      placeholder="0"
                      className="w-full px-2 py-1 bg-[#FAF8F3] border border-gray-300 rounded font-mono font-bold text-right"
                    />
                  </div>
                </div>
                <div className="col-span-4 text-right font-mono font-black text-[#192A24]">
                  {formatMoney(b5000 * 5000)} F
                </div>
              </div>

              {/* 2 000 FCFA */}
              <div className="grid grid-cols-12 items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                <div className="col-span-4 font-black text-[#192A24] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                  <span>2 000 FCFA</span>
                </div>
                <div className="col-span-4">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">Nb :</span>
                    <input
                      type="number"
                      min="0"
                      value={b2000 || ''}
                      onChange={(e) => setB2000(Math.max(0, parseInt(e.target.value || '0', 10)))}
                      placeholder="0"
                      className="w-full px-2 py-1 bg-[#FAF8F3] border border-gray-300 rounded font-mono font-bold text-right"
                    />
                  </div>
                </div>
                <div className="col-span-4 text-right font-mono font-black text-[#192A24]">
                  {formatMoney(b2000 * 2000)} F
                </div>
              </div>

              {/* 1 000 FCFA */}
              <div className="grid grid-cols-12 items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                <div className="col-span-4 font-black text-[#192A24] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  <span>1 000 FCFA</span>
                </div>
                <div className="col-span-4">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">Nb :</span>
                    <input
                      type="number"
                      min="0"
                      value={b1000 || ''}
                      onChange={(e) => setB1000(Math.max(0, parseInt(e.target.value || '0', 10)))}
                      placeholder="0"
                      className="w-full px-2 py-1 bg-[#FAF8F3] border border-gray-300 rounded font-mono font-bold text-right"
                    />
                  </div>
                </div>
                <div className="col-span-4 text-right font-mono font-black text-[#192A24]">
                  {formatMoney(b1000 * 1000)} F
                </div>
              </div>

              {/* 500 FCFA */}
              <div className="grid grid-cols-12 items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                <div className="col-span-4 font-black text-[#192A24] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                  <span>500 FCFA</span>
                </div>
                <div className="col-span-4">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">Nb :</span>
                    <input
                      type="number"
                      min="0"
                      value={b500 || ''}
                      onChange={(e) => setB500(Math.max(0, parseInt(e.target.value || '0', 10)))}
                      placeholder="0"
                      className="w-full px-2 py-1 bg-[#FAF8F3] border border-gray-300 rounded font-mono font-bold text-right"
                    />
                  </div>
                </div>
                <div className="col-span-4 text-right font-mono font-black text-[#192A24]">
                  {formatMoney(b500 * 500)} F
                </div>
              </div>
            </div>
          </div>

          {/* PIÈCES TABLE */}
          <div className="bg-[#FAF8F3] p-4 rounded-xl border border-[#E8D8BE] space-y-3">
            <div className="flex items-center justify-between border-b border-[#E8D8BE] pb-2">
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-[#D39725]" />
                <span className="text-xs font-black text-[#192A24] uppercase tracking-wider">
                  Pièces de Monnaie
                </span>
              </div>
              <span className="text-[11px] font-mono font-black text-[#966308] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Total : {formatMoney(totalPieces)} F
              </span>
            </div>

            <div className="space-y-1.5 text-xs max-h-[260px] overflow-y-auto pr-1">
              {[
                { label: '500 FCFA', val: 500, count: p500, set: setP500 },
                { label: '200 FCFA', val: 200, count: p200, set: setP200 },
                { label: '100 FCFA', val: 100, count: p100, set: setP100 },
                { label: '50 FCFA', val: 50, count: p50, set: setP50 },
                { label: '25 FCFA', val: 25, count: p25, set: setP25 },
                { label: '10 FCFA', val: 10, count: p10, set: setP10 },
                { label: '5 FCFA', val: 5, count: p5, set: setP5 },
                { label: '2 FCFA', val: 2, count: p2, set: setP2 },
                { label: '1 FCFA', val: 1, count: p1, set: setP1 },
              ].map((item) => (
                <div
                  key={item.label}
                  className="grid grid-cols-12 items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200"
                >
                  <div className="col-span-4 font-bold text-[#192A24]">
                    {item.label}
                  </div>
                  <div className="col-span-4">
                    <input
                      type="number"
                      min="0"
                      value={item.count || ''}
                      onChange={(e) => item.set(Math.max(0, parseInt(e.target.value || '0', 10)))}
                      placeholder="0"
                      className="w-full px-2 py-0.5 bg-[#FAF8F3] border border-gray-300 rounded font-mono text-xs font-bold text-right"
                    />
                  </div>
                  <div className="col-span-4 text-right font-mono font-bold text-gray-700">
                    {formatMoney(item.count * item.val)} F
                  </div>
                </div>
              ))}
            </div>

            {/* Monnaie Rendue input */}
            <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-xs">
              <span className="font-bold text-gray-600">Monnaie rendue (-) :</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={monnaieRendue || ''}
                  onChange={(e) => setMonnaieRendue(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  placeholder="0"
                  className="w-28 px-2 py-1 bg-white border border-gray-300 rounded-lg font-mono text-xs font-bold text-right text-rose-600"
                />
                <span className="text-[10px] font-bold text-gray-400">FCFA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Financial Recap Card */}
        <div className="p-4 bg-gradient-to-br from-[#192A24] to-[#253D34] text-white rounded-2xl shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D39725]">
                Total Général Net du Versement
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-0.5">
                {formatMoney(totalAmount)}{' '}
                <span className="text-base font-normal text-amber-300">FCFA</span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-white/70 block">
                Impact Solde Caisse :
              </span>
              <span
                className={`text-xs font-mono font-bold ${
                  postCashBalance < 0 ? 'text-rose-400' : 'text-emerald-300'
                }`}
              >
                Reste en caisse : {formatMoney(postCashBalance)} FCFA
              </span>
            </div>
          </div>

          {/* Somme en toutes lettres */}
          <div className="bg-black/20 p-3 rounded-xl border border-white/10 text-xs">
            <span className="text-[10px] uppercase font-bold text-amber-200/80 block mb-0.5">
              Somme en toutes lettres (conforme au bordereau officiel) :
            </span>
            <p className="font-serif italic font-bold text-amber-100 leading-relaxed text-[13px]">
              « {amountInWords} »
            </p>
          </div>
        </div>
      </div>

      {/* Internal Note / Justification */}
      <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
        <label className="block text-xs font-bold text-[#192A24] mb-1">
          Motif interne de l'opération / Justification comptable
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ex: Versement de clôture de caisse après achats d'or brut"
          className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
        {onOpenSlipPreview && (
          <button
            type="button"
            onClick={handlePreviewCurrentSlip}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-gray-50 text-[#192A24] text-xs font-black border border-gray-300 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            <Printer size={16} className="text-[#D39725]" />
            <span>Aperçu Bordereau</span>
          </button>
        )}

        <button
          type="submit"
          className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
        >
          <ArrowDownLeft size={16} />
          <span>Enregistrer le versement & Générer le bordereau officiel</span>
        </button>
      </div>
    </form>
  );
};
