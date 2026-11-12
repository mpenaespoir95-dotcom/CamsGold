import React, { useState, useEffect } from 'react';
import { Printer, X, Building2, Landmark, Check, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { formatMoney, formatNumber } from '../../utils/goldMath';
import { numberToWordsFr } from '../../utils/numberToWordsFr';
import { LedgerEntry } from '../../types';
import { BankDepositSlipLayouts, BankSlipLayout } from './BankDepositSlipLayouts';

export interface BankTemplateInfo {
  id: string;
  name: string;
  aliases?: string[];
  groupName?: string;
  accountNumber?: string;
  primaryColor?: string;
  layout?: BankSlipLayout;
}

export const BANK_TEMPLATES: BankTemplateInfo[] = [
  {
    id: 'credit_du_congo',
    name: 'Crédit du Congo',
    groupName: 'Groupe Attijariwafa bank',
    primaryColor: '#000000',
  },
  {
    id: 'ecobank',
    name: 'Ecobank',
    aliases: ['Eco Bank'],
    groupName: 'The Pan African Bank',
    primaryColor: '#005A9C',
    layout: 'ecobank',
  },
  {
    id: 'boa',
    name: 'Bank of Africa',
    aliases: ['BOA', 'BOA Congo', 'BMCE'],
    groupName: 'BMCE Group',
    primaryColor: '#174579',
    layout: 'boa',
  },
  {
    id: 'bsca',
    name: 'BSCA Bank',
    aliases: ['BSCA', 'Banque Sino-Congolaise pour l’Afrique'],
    groupName: 'Banque Sino-Congolaise pour l’Afrique',
    primaryColor: '#8B3A2D',
    layout: 'bsca',
  },
  {
    id: 'bgfibank',
    name: 'BGFIBank',
    groupName: 'Votre partenaire pour l\'avenir',
    primaryColor: '#003366',
  },
  {
    id: 'uba',
    name: 'UBA Congo',
    aliases: ['UBA', 'United Bank for Africa'],
    groupName: 'United Bank for Africa',
    primaryColor: '#D32F2F',
    layout: 'uba',
  },
  {
    id: 'lcb',
    name: 'La Congolaise de Banque (LCB)',
    groupName: 'Banque & Développement',
    primaryColor: '#006633',
  },
];

const normalizeBankName = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const findBankTemplate = (bankName: string) => {
  const normalizedBankName = normalizeBankName(bankName);
  if (!normalizedBankName) return undefined;
  return BANK_TEMPLATES.find((template) =>
    [template.name, ...(template.aliases || [])].some((alias) => {
      const normalizedAlias = normalizeBankName(alias);
      return normalizedBankName === normalizedAlias ||
        (normalizedBankName.length > 3 && normalizedBankName.includes(normalizedAlias)) ||
        (normalizedAlias.length > 3 && normalizedAlias.includes(normalizedBankName));
    })
  );
};

interface OfficialBankDepositSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBank?: string;
  initialAmount?: number;
  initialDepositor?: string;
  initialAccountNumber?: string;
  initialDate?: string;
  initialSlipRef?: string;
  initialProvenance?: string;
  operation?: LedgerEntry | null;
}

export const OfficialBankDepositSlipModal: React.FC<OfficialBankDepositSlipModalProps> = ({
  isOpen,
  onClose,
  initialBank = 'Crédit du Congo',
  initialAmount = 0,
  initialDepositor = '',
  initialAccountNumber = '',
  initialDate,
  initialSlipRef,
  initialProvenance = 'Recettes ventes d\'or brut comptoir',
  operation,
}) => {
  // Find initial template
  const matchedTemplate = BANK_TEMPLATES.find(
    (b) => b.id === findBankTemplate(initialBank)?.id
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    matchedTemplate ? matchedTemplate.id : 'credit_du_congo'
  );

  // Form states
  const [bankName, setBankName] = useState(matchedTemplate?.name || 'Crédit du Congo');
  const [bankGroupName, setBankGroupName] = useState(matchedTemplate?.groupName || 'Groupe Attijariwafa bank');
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber || matchedTemplate?.accountNumber || '');
  const [accountHolder, setAccountHolder] = useState('CAMS GOLD COMPTOIR SARL');
  const [accountAddress, setAccountAddress] = useState('');
  
  const [depositorName, setDepositorName] = useState(
    operation?.depositDetails?.depositedBy || operation?.depositor || initialDepositor || ''
  );
  const [depositorAddress, setDepositorAddress] = useState('');
  const [depositorPhone, setDepositorPhone] = useState('');
  const [depositorEmail, setDepositorEmail] = useState('');
  const [orderOf, setOrderOf] = useState('CAMS GOLD COMPTOIR');
  const [forAccountOf, setForAccountOf] = useState('CAMS GOLD COMPTOIR SARL');

  const [amount, setAmount] = useState<number>(
    operation ? operation.amount : initialAmount
  );
  const [amountInput, setAmountInput] = useState<string>(String(amount));

  const [dateStr, setDateStr] = useState<string>(
    operation?.date || initialDate || new Date().toLocaleDateString('fr-FR')
  );
  const [slipNumber, setSlipNumber] = useState(initialSlipRef || '');
  const [provenanceFonds, setProvenanceFonds] = useState<string>(
    operation?.depositDetails?.note || initialProvenance || 'Recettes de vente d\'or et trésorerie'
  );

  const [shiftPeriod, setShiftPeriod] = useState<'Matin' | 'Soir'>('Matin');
  const [monnaieRendue, setMonnaieRendue] = useState<number>(0);

  // Denominations breakdown (exact match of Crédit du Congo document)
  const [billets10000, setBillets10000] = useState<number>(0);
  const [billets5000, setBillets5000] = useState<number>(0);
  const [billets2000, setBillets2000] = useState<number>(0);
  const [billets1000, setBillets1000] = useState<number>(0);
  const [billets500, setBillets500] = useState<number>(0);

  const [pieces100, setPieces100] = useState<number>(0);
  const [pieces500, setPieces500] = useState<number>(0);
  const [pieces200, setPieces200] = useState<number>(0);
  const [pieces50, setPieces50] = useState<number>(0);
  const [pieces25, setPieces25] = useState<number>(0);
  const [pieces10, setPieces10] = useState<number>(0);
  const [pieces5, setPieces5] = useState<number>(0);
  const [pieces2, setPieces2] = useState<number>(0);
  const [pieces1, setPieces1] = useState<number>(0);

  // Auto-decompose denominations when amount changes
  const autoCalculateDenominations = (targetAmount: number) => {
    let rem = targetAmount;
    
    // 10 000 F billets (70-80% of cash deposits)
    const b10k = Math.floor((rem * 0.8) / 10000);
    const used10k = b10k * 10000;
    rem -= used10k;

    // 5 000 F billets
    const b5k = Math.floor((rem * 0.7) / 5000);
    const used5k = b5k * 5000;
    rem -= used5k;

    // 2 000 F billets
    const b2k = Math.floor((rem * 0.6) / 2000);
    const used2k = b2k * 2000;
    rem -= used2k;

    // 1 000 F billets
    const b1k = Math.floor(rem / 1000);
    const used1k = b1k * 1000;
    rem -= used1k;

    // 500 F billets
    const b500 = Math.floor(rem / 500);
    const used500 = b500 * 500;
    rem -= used500;

    // Pieces
    const p100 = Math.floor(rem / 100);
    rem -= p100 * 100;

    const p50 = Math.floor(rem / 50);
    rem -= p50 * 50;

    const p25 = Math.floor(rem / 25);
    rem -= p25 * 25;

    const p10 = Math.floor(rem / 10);
    rem -= p10 * 10;

    const p5 = Math.floor(rem / 5);
    rem -= p5 * 5;

    const p2 = Math.floor(rem / 2);
    rem -= p2 * 2;

    const p1 = Math.floor(rem / 1);

    setBillets10000(b10k);
    setBillets5000(b5k);
    setBillets2000(b2k);
    setBillets1000(b1k);
    setBillets500(b500);
    setPieces100(p100);
    setPieces500(0);
    setPieces200(0);
    setPieces50(p50);
    setPieces25(p25);
    setPieces10(p10);
    setPieces5(p5);
    setPieces2(p2);
    setPieces1(p1);
  };

  useEffect(() => {
    if (isOpen) {
      if (operation?.depositDetails) {
        const det = operation.depositDetails;
        if (det.targetBank) {
          setBankName(det.targetBank);
          const t = findBankTemplate(det.targetBank);
          if (t) setSelectedTemplateId(t.id);
        }
        if (det.bankGroupName) setBankGroupName(det.bankGroupName);
        if (det.accountNumber) setAccountNumber(det.accountNumber);
        if (det.accountHolder) setAccountHolder(det.accountHolder);
        if (det.accountAddress) setAccountAddress(det.accountAddress);
        if (det.depositedBy) setDepositorName(det.depositedBy);
        if (det.depositorAddress) setDepositorAddress(det.depositorAddress);
        if (det.depositorPhone) setDepositorPhone(det.depositorPhone);
        if (det.depositorEmail) setDepositorEmail(det.depositorEmail);
        if (det.orderOf) setOrderOf(det.orderOf);
        if (det.forAccountOf) setForAccountOf(det.forAccountOf);
        if (det.provenanceFonds || det.note) setProvenanceFonds(det.provenanceFonds || det.note || '');
        if (det.shiftPeriod) setShiftPeriod(det.shiftPeriod);
        if (det.amount) {
          setAmount(det.amount);
          setAmountInput(String(det.amount));
        }
        if (det.slipNumber) setSlipNumber(det.slipNumber);
        if (det.date) setDateStr(det.date);

        if (det.denominations) {
          const d = det.denominations;
          setBillets10000(d.b10000 ?? 0);
          setBillets5000(d.b5000 ?? 0);
          setBillets2000(d.b2000 ?? 0);
          setBillets1000(d.b1000 ?? 0);
          setBillets500(d.b500 ?? 0);
          setPieces100(d.p100 ?? 0);
          setPieces500(d.p500 ?? 0);
          setPieces200(d.p200 ?? 0);
          setPieces50(d.p50 ?? 0);
          setPieces25(d.p25 ?? 0);
          setPieces10(d.p10 ?? 0);
          setPieces5(d.p5 ?? 0);
          setPieces2(d.p2 ?? 0);
          setPieces1(d.p1 ?? 0);
          setMonnaieRendue(d.monnaieRendue ?? 0);
          return;
        }
      }

      const parsed = parseFloat(amountInput.replace(',', '.') || '0');
      if (parsed > 0) {
        autoCalculateDenominations(parsed);
      }
    }
  }, [isOpen, operation]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const t = BANK_TEMPLATES.find((b) => b.id === templateId);
    if (t) {
      setBankName(t.name);
      setBankGroupName(t.groupName || '');
      setAccountNumber(t.accountNumber || '');
    }
  };

  const handleAmountChange = (newValStr: string) => {
    setAmountInput(newValStr);
    const parsed = parseFloat(newValStr.replace(',', '.') || '0');
    if (parsed >= 0 && Number.isFinite(parsed)) {
      setAmount(parsed);
      autoCalculateDenominations(parsed);
    }
  };

  // Sum of denominations
  const totalBilletAmount =
    billets10000 * 10000 +
    billets5000 * 5000 +
    billets2000 * 2000 +
    billets1000 * 1000 +
    billets500 * 500;

  const totalPieceAmount =
    pieces500 * 500 +
    pieces200 * 200 +
    pieces100 * 100 +
    pieces50 * 50 +
    pieces25 * 25 +
    pieces10 * 10 +
    pieces5 * 5 +
    pieces2 * 2 +
    pieces1 * 1;

  const totalDepose = totalBilletAmount + totalPieceAmount;
  const selectedTemplate = BANK_TEMPLATES.find((template) => template.id === selectedTemplateId);

  if (!isOpen) return null;

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="print-modal-container bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-[#192A24] text-white flex flex-wrap items-center justify-between gap-3 border-b border-gray-700 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D39725] text-white flex items-center justify-center shadow-md">
              <Landmark size={17} />
            </div>
            <div>
              <div className="text-sm font-black tracking-wide">Bordereau de versement espèces</div>
              <div className="text-[11px] text-gray-300">Modèles inspirés des documents de référence fournis</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bank Template Selector */}
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-xl border border-gray-700">
              <span className="text-[11px] text-gray-300 font-bold">Modèle Banque :</span>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="bg-transparent text-xs font-black text-amber-400 focus:outline-hidden cursor-pointer"
              >
                {BANK_TEMPLATES.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id} className="text-[#192A24] bg-white font-bold">
                    {tmpl.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => autoCalculateDenominations(amount)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition-colors cursor-pointer"
              title="Recalculer automatiquement les billets"
            >
              <RefreshCw size={13} className="text-amber-400" />
              <span>Ajuster billets</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-black transition-colors shadow-md cursor-pointer"
            >
              <Printer size={15} />
              <span>Imprimer</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick parameters edit ribbon (Hidden when printing) */}
        <div className="p-3 bg-[#FAF8F3] border-b border-[#E8D8BE] grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs print:hidden">
          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Montant du versement (FCFA)</label>
            <input
              type="text"
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-[#D5C2A5] font-black text-[#192A24]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">N° Compte Bancaire</label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-[#D5C2A5] font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Nom du Déposant</label>
            <input
              type="text"
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-[#D5C2A5]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Provenance des fonds</label>
            <input
              type="text"
              value={provenanceFonds}
              onChange={(e) => setProvenanceFonds(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-[#D5C2A5]"
            />
          </div>
        </div>

        {/* OFFICIAL BORDEREAU DE VERSEMENT ESPECES (EXACT PAPER REPRODUCTION) */}
        <div className="print-modal-content overflow-y-auto p-4 sm:p-6 bg-gray-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {selectedTemplate?.layout ? (
            <BankDepositSlipLayouts
              layout={selectedTemplate.layout}
              bankName={bankName}
              slipNumber={slipNumber}
              date={dateStr}
              accountNumber={accountNumber}
              accountHolder={accountHolder}
              accountAddress={accountAddress}
              depositorName={depositorName}
              depositorAddress={depositorAddress}
              depositorPhone={depositorPhone}
              amount={amount}
              provenance={provenanceFonds}
              denominations={{
                b10000: billets10000,
                b5000: billets5000,
                b2000: billets2000,
                b1000: billets1000,
                b500: billets500,
                p500: pieces500,
                p200: pieces200,
                p100: pieces100,
                p50: pieces50,
                p25: pieces25,
                p10: pieces10,
                p5: pieces5,
                p2: pieces2,
                p1: pieces1,
              }}
            />
          ) : (
          <div
            id="official-bank-slip-container"
            className="w-full max-w-[820px] bg-white border-2 border-black p-4 sm:p-6 text-black font-sans shadow-md print:shadow-none print:border-black print:m-0 print:p-4 text-[11px] leading-tight"
            style={{ minHeight: '620px' }}
          >
            {/* Header: Bank Brand Logo & Centered Title */}
            <div className="flex items-start justify-between pb-3">
              {/* Bank Logo & Group Name */}
              <div className="flex items-center gap-3">
                {/* Styled Attijariwafa / Bank Logo */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <svg viewBox="0 0 48 36" className="w-10 h-7" fill="currentColor">
                      <polygon points="0,28 12,12 24,28 36,12 48,28 36,36 12,36" fill="#000000" />
                      <polygon points="12,12 24,0 36,12 24,24" fill="#D39725" opacity="0.9" />
                    </svg>
                    <div>
                      <div className="text-base sm:text-lg font-black tracking-tight text-black leading-none uppercase font-sans">
                        {bankName}
                      </div>
                      {bankGroupName && (
                        <div className="text-[10px] text-gray-700 font-semibold tracking-normal mt-0.5">
                          {bankGroupName}
                        </div>
                      )}
                    </div>
                  </div>
                      </div>
                    </div>

              {/* Title centered */}
              <div className="flex-1 text-center pr-12">
                <h1 className="text-sm sm:text-base font-black tracking-wider uppercase text-black font-sans">
                  BORDEREAU DE VERSEMENT ESPECES
                </h1>
              </div>
            </div>

            {/* Split Columns (Left: Account & Depositor Info / Right: Valeurs déposées) */}
            <div className="grid grid-cols-12 gap-0 border-t border-black pt-3">
              {/* LEFT COLUMN (~65% width = 8 cols) */}
              <div className="col-span-12 md:col-span-8 pr-0 md:pr-4 md:border-r md:border-dashed md:border-black space-y-3">
                {/* Box 1: A porter au CREDIT du compte N° */}
                <div className="border border-black p-2.5 rounded-none space-y-1 bg-white">
                  <div className="flex items-center justify-between font-bold">
                    <span className="font-bold">A porter au CREDIT du compte N°</span>
                    <span className="font-mono font-black text-sm tracking-widest px-2 py-0.5 bg-gray-50 border border-gray-400">
                      {accountNumber}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 pt-0.5">
                    <span className="font-bold whitespace-nowrap">de M.</span>
                    <span className="font-black text-sm uppercase flex-1 border-b border-black pb-0.5">
                      {accountHolder}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 italic">
                    Ecrire très lisiblement les noms, prénoms et adresse
                  </div>
                  <div className="border-b border-black pt-1 pb-0.5 font-semibold text-gray-800">
                    {accountAddress}
                  </div>
                  <div className="border-b border-black pt-1 pb-0.5 text-gray-700">
                    RCCM : RC/BZV-2024-B-1120 · Comptoir Agréé d'Or
                  </div>
                </div>

                {/* Person details */}
                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold whitespace-nowrap">effectué par M.</span>
                    <span className="font-black flex-1 border-b border-black pb-0.5 text-black">
                      {depositorName}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="font-bold whitespace-nowrap">demeurant à (adresse) :</span>
                    <span className="flex-1 border-b border-black pb-0.5 text-black">
                      {depositorAddress}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold whitespace-nowrap">Tél. :</span>
                      <span className="flex-1 border-b border-black pb-0.5 font-mono">
                        {depositorPhone}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold whitespace-nowrap">E-mail :</span>
                      <span className="flex-1 border-b border-black pb-0.5 font-mono text-[10px]">
                        {depositorEmail}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="font-bold whitespace-nowrap">d'ordre de :</span>
                    <span className="flex-1 border-b border-black pb-0.5 text-black">
                      {orderOf}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-baseline gap-1.5 flex-1">
                      <span className="font-bold whitespace-nowrap">pour compte de :</span>
                      <span className="flex-1 border-b border-black pb-0.5 font-semibold text-black">
                        {forAccountOf}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className="font-bold text-[11px] whitespace-nowrap">la somme de FCFA</span>
                      <div className="border-2 border-black px-2.5 py-1 font-mono font-black text-base text-black bg-white">
                        {formatMoney(amount)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount in words */}
                <div className="pt-1.5">
                  <div className="text-[10px] font-bold text-gray-700">
                    (somme en lettre) suivie des mots "Francs CFA"
                  </div>
                  <div className="border-b border-black py-1 font-serif italic text-xs font-bold text-black min-h-[22px]">
                    {numberToWordsFr(amount)} Francs CFA
                  </div>
                </div>

                {/* Bottom 3-box table */}
                <div className="pt-2">
                  <table className="w-full border-collapse border border-black text-center text-xs">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-[10px] font-black uppercase">
                        <th className="border-r border-black p-1.5 w-1/4">Date</th>
                        <th className="border-r border-black p-1.5 w-1/2">Nom et Signature</th>
                        <th className="p-1.5 w-1/3">Provenance des fonds*</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="h-16">
                        <td className="border-r border-black p-2 font-mono font-bold align-middle">
                          {dateStr}
                        </td>
                        <td className="border-r border-black p-2 text-left align-top">
                          <div className="font-bold text-[10px]">{depositorName}</div>
                          <div className="text-[9px] text-gray-500 mt-0.5">Signature du déposant :</div>
                        </td>
                        <td className="p-2 text-left align-top text-[10px]">
                          <div className="font-medium">{provenanceFonds}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="text-[9px] text-gray-600 italic pt-1">
                    * A partir de 10 millions de francs CFA
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (~35% width = 4 cols) - Détail des valeurs déposées */}
              <div className="col-span-12 md:col-span-4 pl-0 md:pl-3 pt-4 md:pt-0 space-y-2">
                <div className="border border-black">
                  {/* Title Box */}
                  <div className="bg-gray-100 border-b border-black text-center py-1 font-black text-[11px] uppercase tracking-wide">
                    Détail des valeurs déposées
                  </div>

                  {/* Denominations Table */}
                  <table className="w-full text-center text-[10px] border-collapse">
                    <thead>
                      <tr className="border-b border-black bg-gray-50 font-bold text-[9px]">
                        <th className="border-r border-black p-1 w-12">Nbre</th>
                        <th className="border-r border-black p-1">Valeur exprimée en FCFA</th>
                        <th className="p-1 text-right pr-2">Sommes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300 font-mono">
                      {/* BILLETS group */}
                      <tr className="border-t border-black bg-gray-50/50">
                        <td colSpan={3} className="text-left font-black px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                          BILLETS
                        </td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-1">
                          <input
                            type="number"
                            min="0"
                            value={billets10000 || ''}
                            onChange={(e) => setBillets10000(parseInt(e.target.value, 10) || 0)}
                            className="w-full text-center font-bold bg-transparent focus:bg-amber-50"
                          />
                        </td>
                        <td className="border-r border-black p-1 font-bold">10.000</td>
                        <td className="p-1 text-right pr-2 font-bold">{formatMoney(billets10000 * 10000)}</td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-1">
                          <input
                            type="number"
                            min="0"
                            value={billets5000 || ''}
                            onChange={(e) => setBillets5000(parseInt(e.target.value, 10) || 0)}
                            className="w-full text-center font-bold bg-transparent focus:bg-amber-50"
                          />
                        </td>
                        <td className="border-r border-black p-1 font-bold">5.000</td>
                        <td className="p-1 text-right pr-2 font-bold">{formatMoney(billets5000 * 5000)}</td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-1">
                          <input
                            type="number"
                            min="0"
                            value={billets2000 || ''}
                            onChange={(e) => setBillets2000(parseInt(e.target.value, 10) || 0)}
                            className="w-full text-center font-bold bg-transparent focus:bg-amber-50"
                          />
                        </td>
                        <td className="border-r border-black p-1 font-bold">2.000</td>
                        <td className="p-1 text-right pr-2 font-bold">{formatMoney(billets2000 * 2000)}</td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-1">
                          <input
                            type="number"
                            min="0"
                            value={billets1000 || ''}
                            onChange={(e) => setBillets1000(parseInt(e.target.value, 10) || 0)}
                            className="w-full text-center font-bold bg-transparent focus:bg-amber-50"
                          />
                        </td>
                        <td className="border-r border-black p-1 font-bold">1.000</td>
                        <td className="p-1 text-right pr-2 font-bold">{formatMoney(billets1000 * 1000)}</td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-1">
                          <input
                            type="number"
                            min="0"
                            value={billets500 || ''}
                            onChange={(e) => setBillets500(parseInt(e.target.value, 10) || 0)}
                            className="w-full text-center font-bold bg-transparent focus:bg-amber-50"
                          />
                        </td>
                        <td className="border-r border-black p-1 font-bold">500</td>
                        <td className="p-1 text-right pr-2 font-bold">{formatMoney(billets500 * 500)}</td>
                      </tr>

                      {/* PIECES group */}
                      <tr className="border-t border-black bg-gray-50/50">
                        <td colSpan={3} className="text-left font-black px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                          PIECES
                        </td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-0.5">
                          <input
                            type="number"
                            min="0"
                            value={pieces100 || ''}
                            onChange={(e) => setPieces100(parseInt(e.target.value, 10) || 0)}
                            className="w-full text-center bg-transparent focus:bg-amber-50"
                          />
                        </td>
                        <td className="border-r border-black p-0.5">100</td>
                        <td className="p-0.5 text-right pr-2">{formatMoney(pieces100 * 100)}</td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-0.5">
                          <input
                            type="number"
                            min="0"
                            value={pieces50 || ''}
                            onChange={(e) => setPieces50(parseInt(e.target.value, 10) || 0)}
                            className="w-full text-center bg-transparent focus:bg-amber-50"
                          />
                        </td>
                        <td className="border-r border-black p-0.5">50</td>
                        <td className="p-0.5 text-right pr-2">{formatMoney(pieces50 * 50)}</td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-0.5">
                          <input
                            type="number"
                            min="0"
                            value={pieces25 || ''}
                            onChange={(e) => setPieces25(parseInt(e.target.value, 10) || 0)}
                            className="w-full text-center bg-transparent focus:bg-amber-50"
                          />
                        </td>
                        <td className="border-r border-black p-0.5">25</td>
                        <td className="p-0.5 text-right pr-2">{formatMoney(pieces25 * 25)}</td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-0.5">
                          <input
                            type="number"
                            min="0"
                            value={pieces10 || ''}
                            onChange={(e) => setPieces10(parseInt(e.target.value, 10) || 0)}
                            className="w-full text-center bg-transparent focus:bg-amber-50"
                          />
                        </td>
                        <td className="border-r border-black p-0.5">10</td>
                        <td className="p-0.5 text-right pr-2">{formatMoney(pieces10 * 10)}</td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-0.5">
                          <input
                            type="number"
                            min="0"
                            value={pieces5 || ''}
                            onChange={(e) => setPieces5(parseInt(e.target.value, 10) || 0)}
                            className="w-full text-center bg-transparent focus:bg-amber-50"
                          />
                        </td>
                        <td className="border-r border-black p-0.5">5</td>
                        <td className="p-0.5 text-right pr-2">{formatMoney(pieces5 * 5)}</td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-0.5">
                          <input
                            type="number"
                            min="0"
                            value={pieces2 || ''}
                            onChange={(e) => setPieces2(parseInt(e.target.value, 10) || 0)}
                            className="w-full text-center bg-transparent focus:bg-amber-50"
                          />
                        </td>
                        <td className="border-r border-black p-0.5">2</td>
                        <td className="p-0.5 text-right pr-2">{formatMoney(pieces2 * 2)}</td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-0.5">
                          <input
                            type="number"
                            min="0"
                            value={pieces1 || ''}
                            onChange={(e) => setPieces1(parseInt(e.target.value, 10) || 0)}
                            className="w-full text-center bg-transparent focus:bg-amber-50"
                          />
                        </td>
                        <td className="border-r border-black p-0.5">1</td>
                        <td className="p-0.5 text-right pr-2">{formatMoney(pieces1 * 1)}</td>
                      </tr>

                      {/* TOTAL row */}
                      <tr className="border-t-2 border-black bg-gray-100 font-black">
                        <td colSpan={2} className="border-r border-black p-1 text-right pr-2 uppercase">
                          TOTAL
                        </td>
                        <td className="p-1 text-right pr-2 text-black text-xs">
                          {formatMoney(totalDepose)}
                        </td>
                      </tr>

                      {/* Monnaie rendue */}
                      <tr className="border-t border-black text-[10px]">
                        <td colSpan={2} className="border-r border-black p-1 text-right pr-2 italic">
                          Monnaie rendue
                        </td>
                        <td className="p-1 text-right pr-2">
                          {formatMoney(monnaieRendue)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Matin / Soir shift toggles */}
                <div className="flex items-center justify-center gap-6 py-1 border border-black text-xs font-bold bg-white">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="shiftPeriod"
                      checked={shiftPeriod === 'Matin'}
                      onChange={() => setShiftPeriod('Matin')}
                      className="w-3.5 h-3.5 text-black"
                    />
                    <span>Matin</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="shiftPeriod"
                      checked={shiftPeriod === 'Soir'}
                      onChange={() => setShiftPeriod('Soir')}
                      className="w-3.5 h-3.5 text-black"
                    />
                    <span>Soir</span>
                  </label>
                </div>

                {/* AVIS IMPORTANT Box */}
                <div className="border-2 border-black p-2 text-center bg-white space-y-0.5">
                  <div className="font-black text-[10px] uppercase tracking-wider text-black">
                    AVIS IMPORTANT
                  </div>
                  <div className="text-[10px] font-bold text-gray-800">
                    Exiger le reçu de versement
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Modal Footer (Hidden when printing) */}
        <div className="p-3 bg-white border-t border-gray-200 flex items-center justify-between print:hidden">
          <div className="text-xs text-gray-500 font-medium">
            Modèle de bordereau inspiré du document de référence fourni.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 border border-gray-300 cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-[#192A24] hover:bg-[#253D34] text-white shadow-md cursor-pointer"
            >
              <Printer size={15} />
              <span>Imprimer le bordereau</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
