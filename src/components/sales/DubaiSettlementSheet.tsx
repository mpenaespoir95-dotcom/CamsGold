import React, { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Printer, Trash2, X } from 'lucide-react';
import { SaleBarItem, SaleFixingItem, SaleRecord } from '../../types';
import { formatNumber, formatMoney, TROY_OUNCE_IN_GRAMS } from '../../utils/goldMath';

type EditableSaleBar = Omit<SaleBarItem, 'barWeight' | 'sampleWeight' | 'goldPurity'> & {
  barWeight: string;
  sampleWeight: string;
  goldPurity: string;
};

type EditableSaleBarField = 'srNo' | 'barRef' | 'barWeight' | 'sampleWeight' | 'goldPurity';

const toEditableBar = (bar: SaleBarItem): EditableSaleBar => ({
  ...bar,
  barWeight: String(bar.barWeight || ''),
  sampleWeight: String(bar.sampleWeight || ''),
  goldPurity: String(bar.goldPurity || ''),
});

const parseCellNumber = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value.trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePurity = (value: number): number => value > 1 ? value / 100 : value;

type EditableSaleFixing = Omit<
  SaleFixingItem,
  'quantityGrams' | 'ounces' | 'pricePerOunceUsd'
> & {
  quantityGrams: string;
  ounces: string;
  pricePerOunceUsd: string;
};

const getSaleFixings = (sale: SaleRecord): SaleFixingItem[] =>
  sale.fixings?.length
    ? sale.fixings
    : [{
        id: `fixing-${sale.id}`,
        date: sale.fixingDate || sale.date,
        quantityGrams: sale.totalPureWeight24kGrams,
        ounces: sale.totalPureOunces,
        pricePerOunceUsd: sale.fixingPricePerOunceUsd,
      }];

const toEditableFixing = (fixing: SaleFixingItem): EditableSaleFixing => ({
  ...fixing,
  quantityGrams: String(fixing.quantityGrams),
  ounces: String(fixing.ounces),
  pricePerOunceUsd: String(fixing.pricePerOunceUsd),
});

interface DubaiSettlementSheetProps {
  sale: SaleRecord;
  onPrint?: () => void;
  onAddAdvance?: (sale: SaleRecord) => void;
  onSaveBars?: (saleId: string, bars: SaleBarItem[]) => SaleRecord;
  onSaveFixings?: (saleId: string, fixings: SaleFixingItem[]) => SaleRecord;
  showPrintButton?: boolean;
}

export const DubaiSettlementSheet: React.FC<DubaiSettlementSheetProps> = ({
  sale,
  onPrint,
  onAddAdvance,
  onSaveBars,
  onSaveFixings,
  showPrintButton = true,
}) => {
  const [isEditingBars, setIsEditingBars] = useState(false);
  const [isEditingFixings, setIsEditingFixings] = useState(false);
  const [editableBars, setEditableBars] = useState<EditableSaleBar[]>(() =>
    sale.bars.map(toEditableBar)
  );
  const [editableFixings, setEditableFixings] = useState<EditableSaleFixing[]>(() =>
    getSaleFixings(sale).map(toEditableFixing)
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  useEffect(() => {
    setEditableBars(sale.bars.map(toEditableBar));
  }, [sale.id, sale.bars]);

  useEffect(() => {
    setEditableFixings(getSaleFixings(sale).map(toEditableFixing));
  }, [sale.id, sale.fixings, sale.fixingDate, sale.fixingPricePerOunceUsd]);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const aedRate = sale.usdToAedRate || 3.6725;
  const xafRate = sale.usdToXafRate || 0;
  const parsedBars = editableBars.map((bar) => {
    const barWeight = parseCellNumber(bar.barWeight) ?? 0;
    const sampleWeight = parseCellNumber(bar.sampleWeight) ?? 0;
    const rawPurity = parseCellNumber(bar.goldPurity) ?? 0;
    const goldPurity = normalizePurity(rawPurity);
    const pureWeightGrams = parseFloat((barWeight * goldPurity).toFixed(3));
    return {
      ...bar,
      barWeight,
      sampleWeight,
      goldPurity,
      carat: parseFloat((goldPurity * 24).toFixed(2)),
      pureWeightGrams,
      ounces: parseFloat((pureWeightGrams / TROY_OUNCE_IN_GRAMS).toFixed(2)),
    } satisfies SaleBarItem;
  });
  const displayedBars = isEditingBars ? parsedBars : sale.bars;
  const displayedTotalWeight = displayedBars.reduce((sum, bar) => sum + bar.barWeight, 0);
  const displayedSampleWeight = displayedBars.reduce((sum, bar) => sum + bar.sampleWeight, 0);
  const displayedPureWeight = displayedBars.reduce((sum, bar) => sum + bar.pureWeightGrams, 0);
  const displayedPureOunces = displayedPureWeight / TROY_OUNCE_IN_GRAMS;
  const parsedFixings = editableFixings.map((fixing) => ({
    ...fixing,
    quantityGrams: parseCellNumber(fixing.quantityGrams) ?? 0,
    ounces: parseCellNumber(fixing.ounces) ?? 0,
    pricePerOunceUsd: parseCellNumber(fixing.pricePerOunceUsd) ?? 0,
  }));
  const displayedFixings = isEditingFixings ? parsedFixings : getSaleFixings(sale);
  const displayedRevenueUsd = isEditingFixings
    ? parseFloat(displayedFixings.reduce(
        (total, fixing) => total + fixing.ounces * fixing.pricePerOunceUsd,
        0
      ).toFixed(2))
    : isEditingBars && !sale.fixings?.length
      ? parseFloat((displayedPureOunces * sale.fixingPricePerOunceUsd).toFixed(2))
      : sale.grossRevenueUsd;
  const totalFixingGrams = displayedFixings.reduce((total, fixing) => total + fixing.quantityGrams, 0);
  const totalFixingOunces = displayedFixings.reduce((total, fixing) => total + fixing.ounces, 0);
  const averageFixingPrice = totalFixingOunces > 0
    ? displayedRevenueUsd / totalFixingOunces
    : sale.fixingPricePerOunceUsd;
  const displayedWithdrawUsd = sale.totalChargesUsd + sale.totalAdvancesUsd;
  const displayedBalanceUsd = Math.max(0, displayedRevenueUsd - displayedWithdrawUsd);
  const displayedSale = isEditingBars || isEditingFixings
    ? {
        ...sale,
        totalGeneralWeightGrams: displayedTotalWeight,
        totalSampleWeightGrams: displayedSampleWeight,
        totalPureWeight24kGrams: displayedPureWeight,
        totalPureOunces: displayedPureOunces,
        fixingPricePerOunceUsd: averageFixingPrice,
        grossRevenueUsd: displayedRevenueUsd,
        grossRevenueAed: parseFloat((displayedRevenueUsd * aedRate).toFixed(2)),
        totalWithdrawUsd: displayedWithdrawUsd,
        totalWithdrawAed: parseFloat((displayedWithdrawUsd * aedRate).toFixed(2)),
        balanceRemainingUsd: displayedBalanceUsd,
        balanceRemainingAed: parseFloat((displayedBalanceUsd * aedRate).toFixed(2)),
      }
    : sale;

  const updateEditableBar = (
    index: number,
    field: EditableSaleBarField,
    value: string
  ) => {
    setEditableBars((current) =>
      current.map((bar, rowIndex) =>
        rowIndex === index ? { ...bar, [field]: value } : bar
      )
    );
  };

  const handleAddBar = () => {
    const nextSrNo = String(editableBars.length + 1).padStart(3, '0');
    setEditableBars((current) => [
      ...current,
      {
        id: `bar-${Date.now()}-${Math.random()}`,
        srNo: nextSrNo,
        barRef: '',
        barWeight: '',
        sampleWeight: '',
        goldPurity: '',
        carat: 0,
        pureWeightGrams: 0,
        ounces: 0,
      },
    ]);
  };

  const handleSaveBars = () => {
    if (!onSaveBars) return;
    setEditError(null);
    setEditSuccess(null);
    const hasInvalidCell = editableBars.some((bar) => {
      const weight = parseCellNumber(bar.barWeight);
      const sample = parseCellNumber(bar.sampleWeight);
      const purity = parseCellNumber(bar.goldPurity);
      const normalizedPurity = purity === null ? null : normalizePurity(purity);
      return weight === null || weight <= 0 ||
        (sample !== null && sample < 0) ||
        normalizedPurity === null || normalizedPurity <= 0 || normalizedPurity > 1;
    });
    if (hasInvalidCell) {
      setEditError('Chaque ligne doit avoir un poids positif, un échantillon valide et une pureté entre 0 et 1 (ou en %).');
      return;
    }

    try {
      const bars = parsedBars.map((bar) => ({
        ...bar,
        srNo: bar.srNo.trim(),
        barRef: bar.barRef.trim(),
      }));
      onSaveBars(sale.id, bars);
      setIsEditingBars(false);
      setEditError(null);
      setEditSuccess('Les modifications du bordereau ont été enregistrées.');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCancelEdit = () => {
    setEditableBars(sale.bars.map(toEditableBar));
    setIsEditingBars(false);
    setEditError(null);
    setEditSuccess(null);
  };

  const updateEditableFixing = (
    index: number,
    field: keyof EditableSaleFixing,
    value: string
  ) => {
    setEditableFixings((current) =>
      current.map((fixing, rowIndex) =>
        rowIndex === index ? { ...fixing, [field]: value } : fixing
      )
    );
  };

  const handleAddFixing = () => {
    setEditableFixings((current) => [
      ...current,
      {
        id: `fixing-${Date.now()}-${Math.random()}`,
        date: sale.date,
        quantityGrams: '',
        ounces: '',
        pricePerOunceUsd: String(sale.fixingPricePerOunceUsd || ''),
      },
    ]);
  };

  const handleSaveFixings = () => {
    if (!onSaveFixings) return;
    setEditError(null);
    setEditSuccess(null);
    const hasInvalidCell = editableFixings.some((fixing) => {
      const quantityGrams = parseCellNumber(fixing.quantityGrams);
      const ounces = parseCellNumber(fixing.ounces);
      const price = parseCellNumber(fixing.pricePerOunceUsd);
      return !fixing.date.trim() ||
        quantityGrams === null || quantityGrams < 0 ||
        ounces === null || ounces < 0 ||
        price === null || price <= 0;
    });
    if (editableFixings.length === 0 || hasInvalidCell) {
      setEditError('Chaque ligne doit avoir une date, des quantités valides et un prix par once supérieur à zéro.');
      return;
    }

    try {
      const fixings = parsedFixings.map((fixing) => ({
        ...fixing,
        date: fixing.date.trim(),
      }));
      onSaveFixings(sale.id, fixings);
      setIsEditingFixings(false);
      setEditSuccess('Les lignes de fixing ont été enregistrées.');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCancelFixingsEdit = () => {
    setEditableFixings(getSaleFixings(sale).map(toEditableFixing));
    setIsEditingFixings(false);
    setEditError(null);
    setEditSuccess(null);
  };

  return (
    <div className="space-y-4 font-sans text-xs print:p-0 print:m-0">
      {/* Action Header in view mode */}
      {showPrintButton && (
        <div className="flex items-center justify-between no-print bg-[#FAF8F3] p-3 rounded-xl border border-[#E8D8BE]">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-sm text-[#192A24]">
              {sale.reference}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                sale.status === 'settled'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              {sale.status === 'settled' ? 'Soldé' : 'Acompte versé / Solde dû'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onAddAdvance && sale.balanceRemainingUsd > 0.01 && (
              <button
                type="button"
                onClick={() => onAddAdvance(sale)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                <Plus size={14} />
                <span>Enregistrer un acompte</span>
              </button>
            )}
            {onSaveBars && (isEditingBars ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-800 text-xs font-bold border border-gray-300 cursor-pointer"
                >
                  <X size={14} />
                  <span>Annuler</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveBars}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                >
                  <Check size={14} />
                  <span>Enregistrer les modifications</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditableBars(sale.bars.map(toEditableBar));
                  setEditError(null);
                  setEditSuccess(null);
                  setIsEditingBars(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-bold cursor-pointer"
              >
                <Pencil size={14} />
                <span>Modifier le tableau</span>
              </button>
            ))}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#192A24] hover:bg-[#253D34] text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
            >
              <Printer size={14} />
              <span>Imprimer le bordereau</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* THE OFFICIAL EXPORT SETTLEMENT SHEET (EXCEL DUBAI STYLE) */}
      {/* ======================================================== */}
      <div className="bg-[#FAF7EE] border-2 border-[#2B3D41] rounded-lg shadow-sm overflow-hidden text-[#111827]">
        {/* Top Banner (Client & Date) */}
        <div className="bg-[#204B57] text-white px-4 py-2.5 flex items-center justify-between font-mono font-bold tracking-wider">
          <div className="min-w-0">
            <div className="text-sm font-black flex items-center gap-2">
              <span>{sale.clientName}</span>
              <span className="text-xs text-amber-300 font-normal">({sale.reference})</span>
            </div>
            {(sale.clientReference || sale.clientPhone || sale.clientCity || sale.clientEmail ||
              sale.clientBankName || sale.clientBankAccountNumber) && (
              <div className="mt-1 text-[10px] font-normal tracking-normal text-white/80">
                {[sale.clientReference, sale.clientPhone, sale.clientCity, sale.clientEmail]
                  .filter(Boolean)
                  .join(' · ')}
                {(sale.clientBankName || sale.clientBankAccountNumber) && (
                  <span>
                    {sale.clientReference || sale.clientPhone || sale.clientCity || sale.clientEmail ? ' · ' : ''}
                    Banque : {[sale.clientBankName, sale.clientBankAccountNumber].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>DATE</span>
            <span className="bg-white/10 px-2 py-0.5 rounded text-amber-200">{sale.date}</span>
          </div>
        </div>

        {/* 1. TABLE 1: BARS & ASSAY BREAKDOWN */}
        <div className="flex items-center justify-between p-3 pb-0">
          <span className="text-xs font-black text-[#2B3D41] uppercase tracking-wider font-mono">
            Détail des barres & titrage
          </span>
          {isEditingBars && (
            <button
              type="button"
              onClick={handleAddBar}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D39725] hover:bg-[#c2871b] text-white text-[11px] font-bold cursor-pointer"
            >
              <Plus size={13} />
              Ajouter une ligne
            </button>
          )}
        </div>
        {editError && (
          <p role="alert" className="mx-3 mt-2 text-xs font-semibold text-red-700">
            {editError}
          </p>
        )}
        {editSuccess && (
          <p role="status" className="mx-3 mt-2 text-xs font-semibold text-emerald-800">
            {editSuccess}
          </p>
        )}
        {isEditingBars && (
          <p className="mx-3 mt-2 text-[10px] text-gray-600">
            Saisissez les valeurs directement dans les cellules. Carat, poids pur et onces sont recalculés automatiquement.
          </p>
        )}
        <div className="overflow-x-auto p-3">
          <table className="w-full text-center border-collapse border border-[#2B3D41] text-[11px] font-mono">
            <thead>
              <tr className="bg-[#2B3D41] text-white font-black text-[11px] tracking-wide">
                <th className="border border-[#4B5E63] py-2 px-2 w-16">SR NO</th>
                <th className="border border-[#4B5E63] py-2 px-2">BAR REF</th>
                <th className="border border-[#4B5E63] py-2 px-2 bg-[#36494D]">BAR WEIGHT</th>
                <th className="border border-[#4B5E63] py-2 px-2">SAMPLE WEIGHT</th>
                <th className="border border-[#4B5E63] py-2 px-2 bg-[#36494D]">GOLD (AU %)</th>
                <th className="border border-[#4B5E63] py-2 px-2">CARAT</th>
                <th className="border border-[#4B5E63] py-2 px-2 bg-[#36494D]">PURE WEIGHT</th>
                <th className="border border-[#4B5E63] py-2 px-2">OZ</th>
                {isEditingBars && <th className="border border-[#4B5E63] py-2 px-1 w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {displayedBars.map((b, index) => (
                <tr key={b.id || b.srNo} className="hover:bg-amber-100/30 transition-colors">
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white/70 font-semibold text-gray-700">
                    {isEditingBars ? (
                      <input
                        aria-label={`Ligne ${index + 1}, numéro`}
                        value={editableBars[index].srNo}
                        onChange={(event) => updateEditableBar(index, 'srNo', event.target.value)}
                        className="w-full bg-transparent text-center focus:bg-amber-50 focus:outline-hidden"
                      />
                    ) : b.srNo}
                  </td>
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-[#F6EDD6] font-bold text-[#192A24]">
                    {isEditingBars ? (
                      <input
                        aria-label={`Ligne ${index + 1}, référence`}
                        value={editableBars[index].barRef}
                        onChange={(event) => updateEditableBar(index, 'barRef', event.target.value)}
                        className="w-full bg-transparent text-center font-bold uppercase focus:bg-amber-50 focus:outline-hidden"
                      />
                    ) : b.barRef}
                  </td>
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white/90 font-mono font-bold text-right pr-3">
                    {isEditingBars ? (
                      <input
                        aria-label={`Ligne ${index + 1}, poids de la barre en grammes`}
                        inputMode="decimal"
                        value={editableBars[index].barWeight}
                        onChange={(event) => updateEditableBar(index, 'barWeight', event.target.value)}
                        className="w-full bg-transparent text-right focus:bg-amber-50 focus:outline-hidden"
                      />
                    ) : formatNumber(b.barWeight, 3)}
                  </td>
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white/70 font-mono text-right pr-3 text-gray-600">
                    {isEditingBars ? (
                      <input
                        aria-label={`Ligne ${index + 1}, poids de l’échantillon en grammes`}
                        inputMode="decimal"
                        value={editableBars[index].sampleWeight}
                        onChange={(event) => updateEditableBar(index, 'sampleWeight', event.target.value)}
                        className="w-full bg-transparent text-right focus:bg-amber-50 focus:outline-hidden"
                      />
                    ) : formatNumber(b.sampleWeight, 3)}
                  </td>
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-[#F6EDD6] font-mono font-bold text-amber-950 text-right pr-3">
                    {isEditingBars ? (
                      <input
                        aria-label={`Ligne ${index + 1}, pureté de l’or`}
                        inputMode="decimal"
                        value={editableBars[index].goldPurity}
                        onChange={(event) => updateEditableBar(index, 'goldPurity', event.target.value)}
                        className="w-full bg-transparent text-right focus:bg-amber-50 focus:outline-hidden"
                      />
                    ) : b.goldPurity.toFixed(4)}
                  </td>
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white/70 font-mono font-bold text-right pr-3">
                    {formatNumber(b.carat, 2)}
                  </td>
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white/90 font-mono font-black text-[#192A24] text-right pr-3">
                    {formatNumber(b.pureWeightGrams, 3)}
                  </td>
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white/70 font-mono font-black text-amber-900 text-right pr-3">
                    {formatNumber(b.ounces, 2)}
                  </td>
                  {isEditingBars && (
                    <td className="border border-[#C2BCA8] py-1 px-2 bg-white">
                      <button
                        type="button"
                        onClick={() => setEditableBars((current) =>
                          current.filter((_, rowIndex) => rowIndex !== index)
                        )}
                        className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                        title="Supprimer cette ligne"
                        aria-label={`Supprimer la ligne ${index + 1}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {/* Blank rows matching Excel look if few bars */}
              {!isEditingBars && Array.from({ length: Math.max(0, 3 - displayedBars.length) }).map((_, i) => (
                <tr key={`blank-${i}`} className="text-gray-300">
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white/40">-</td>
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-[#F6EDD6]/40">-</td>
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white/40">-</td>
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white/40">-</td>
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-[#F6EDD6]/40">-</td>
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white/40">-</td>
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white/40">-</td>
                  <td className="border border-[#C2BCA8] py-1.5 px-2 bg-white/40">-</td>
                </tr>
              ))}

              {/* Table 1 Total Row */}
              <tr className="bg-[#2B3D41] text-white font-mono font-black text-xs">
                <td className="border border-[#4B5E63] py-2 px-2" colSpan={2}>
                  TOTAL GÉNÉRAL
                </td>
                <td className="border border-[#4B5E63] py-2 px-2 text-right pr-3 text-amber-200">
                  {formatNumber(displayedSale.totalGeneralWeightGrams, 3)}
                </td>
                <td className="border border-[#4B5E63] py-2 px-2 text-right pr-3 text-gray-300">
                  {formatNumber(displayedSale.totalSampleWeightGrams, 3)}
                </td>
                <td className="border border-[#4B5E63] py-2 px-2 text-right pr-3 text-amber-200">
                  {(displayedSale.totalGeneralWeightGrams > 0
                    ? displayedSale.totalPureWeight24kGrams / displayedSale.totalGeneralWeightGrams
                    : 0).toFixed(4)}
                </td>
                <td className="border border-[#4B5E63] py-2 px-2 text-right pr-3 text-gray-200">
                  {formatNumber(
                    displayedSale.totalGeneralWeightGrams > 0
                      ? (displayedSale.totalPureWeight24kGrams / displayedSale.totalGeneralWeightGrams) * 24
                      : 0,
                    2
                  )}
                </td>
                <td className="border border-[#4B5E63] py-2 px-2 text-right pr-3 text-amber-300">
                  {formatNumber(displayedSale.totalPureWeight24kGrams, 3)}
                </td>
                <td className="border border-[#4B5E63] py-2 px-2 text-right pr-3 text-white">
                  {formatNumber(displayedSale.totalPureOunces, 2)}
                </td>
                {isEditingBars && <td className="border border-[#4B5E63]"></td>}
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. TABLE 2: FIXINGS */}
        <div className="p-3 bg-[#FAF7EE] border-t-2 border-[#2B3D41]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[11px] font-black text-[#2B3D41] uppercase tracking-wider font-mono">
              Fixings
            </div>
            {onSaveFixings && (
              <div className="flex items-center gap-1.5 no-print">
                {isEditingFixings ? (
                  <>
                    <button
                      type="button"
                      onClick={handleAddFixing}
                      className="flex items-center gap-1 rounded-lg bg-[#D39725] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#c2871b] cursor-pointer"
                    >
                      <Plus size={13} />
                      Ajouter une ligne
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelFixingsEdit}
                      className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-800 hover:bg-gray-100 cursor-pointer"
                    >
                      <X size={13} />
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveFixings}
                      className="flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-800 cursor-pointer"
                    >
                      <Check size={13} />
                      Enregistrer
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditableFixings(getSaleFixings(sale).map(toEditableFixing));
                      setIsEditingFixings(true);
                      setEditError(null);
                      setEditSuccess(null);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-[#D39725] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#c2871b] cursor-pointer"
                  >
                    <Pencil size={13} />
                    Modifier les lignes
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse border border-[#2B3D41] text-[11px] font-mono">
              <thead>
                <tr className="bg-[#2B3D41] text-white font-black text-[11px]">
                  <th className="border border-[#4B5E63] py-1.5 px-3">DATE</th>
                  <th className="border border-[#4B5E63] py-1.5 px-3">QTY (GRM)</th>
                  <th className="border border-[#4B5E63] py-1.5 px-3">OZ</th>
                  <th className="border border-[#4B5E63] py-1.5 px-3">PRICE ($/oz)</th>
                  <th className="border border-[#4B5E63] py-1.5 px-3 bg-[#36494D]">TOTAL $</th>
                  {isEditingFixings && (
                    <th className="border border-[#4B5E63] py-1.5 px-1 w-10"></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayedFixings.map((fixing, index) => {
                  const rowTotalUsd = fixing.ounces * fixing.pricePerOunceUsd;
                  return (
                    <tr
                      key={fixing.id}
                      onClick={() => {
                        if (!isEditingFixings && onSaveFixings) {
                          setEditableFixings(getSaleFixings(sale).map(toEditableFixing));
                          setIsEditingFixings(true);
                          setEditError(null);
                          setEditSuccess(null);
                        }
                      }}
                      className={`hover:bg-amber-100/30 ${!isEditingFixings && onSaveFixings ? 'cursor-text' : ''}`}
                    >
                      <td className="border border-[#C2BCA8] py-1 px-2 bg-[#F59E0B] text-amber-950 font-black">
                        {isEditingFixings ? (
                          <input
                            aria-label={`Fixing ${index + 1}, date`}
                            value={editableFixings[index]?.date ?? ''}
                            onChange={(event) => updateEditableFixing(index, 'date', event.target.value)}
                            className="w-full min-w-24 bg-transparent text-center focus:bg-amber-50 focus:outline-hidden"
                          />
                        ) : fixing.date || 'PENDING'}
                      </td>
                      <td className="border border-[#C2BCA8] py-1 px-2 bg-white font-bold text-right pr-3">
                        {isEditingFixings ? (
                          <input
                            aria-label={`Fixing ${index + 1}, quantité en grammes`}
                            inputMode="decimal"
                            value={editableFixings[index]?.quantityGrams ?? ''}
                            onChange={(event) => updateEditableFixing(index, 'quantityGrams', event.target.value)}
                            className="w-full min-w-16 bg-transparent text-right focus:bg-amber-50 focus:outline-hidden"
                          />
                        ) : formatNumber(fixing.quantityGrams, 3)}
                      </td>
                      <td className="border border-[#C2BCA8] py-1 px-2 bg-[#F6EDD6] font-bold text-right pr-3">
                        {isEditingFixings ?
                        //Facture
                        //if table is empty then the input should be empty
                        //La fature d'imprime tout le tableau
                        (
                          <input
                            aria-label={`Fixing ${index + 1}, quantité en onces`}
                            inputMode="decimal"
                            value={editableFixings[index]?.ounces ?? ''}
                            onChange={(event) => updateEditableFixing(index, 'ounces', event.target.value)}
                            className="w-full min-w-14 bg-transparent text-right focus:bg-amber-50 focus:outline-hidden"
                          />
                        ) : formatNumber(fixing.ounces, 3)}
                      </td>
                      <td className="border border-[#C2BCA8] py-1 px-2 bg-white font-black text-right pr-3">
                        {isEditingFixings ? (
                          <input
                            aria-label={`Fixing ${index + 1}, prix par once en dollars`}
                            inputMode="decimal"
                            value={editableFixings[index]?.pricePerOunceUsd ?? ''}
                            onChange={(event) => updateEditableFixing(index, 'pricePerOunceUsd', event.target.value)}
                            className="w-full min-w-20 bg-transparent text-right focus:bg-amber-50 focus:outline-hidden"
                          />
                        ) : formatNumber(fixing.pricePerOunceUsd, 2)}
                      </td>
                      <td className="border border-[#C2BCA8] py-1 px-3 bg-[#F59E0B] text-amber-950 font-black text-right pr-4">
                        ${formatNumber(rowTotalUsd, 2)}
                      </td>
                      {isEditingFixings && (
                        <td className="border border-[#C2BCA8] py-1 px-1 bg-white">
                          <button
                            type="button"
                            onClick={() => setEditableFixings((current) =>
                              current.filter((_, rowIndex) => rowIndex !== index)
                            )}
                            className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                            title="Supprimer cette ligne"
                            aria-label={`Supprimer le fixing ${index + 1}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {/* Fixing Total Row */}
                <tr className="bg-[#2B3D41] text-white font-black">
                  <td className="border border-[#4B5E63] py-1.5 px-3">
                    TOTAL FIXING
                  </td>
                  <td className="border border-[#4B5E63] py-1.5 px-3 text-right pr-4 text-amber-200">
                    {formatNumber(totalFixingGrams, 3)}
                  </td>
                  <td className="border border-[#4B5E63] py-1.5 px-3 text-right pr-4 text-white">
                    {formatNumber(totalFixingOunces, 3)}
                  </td>
                  <td className="border border-[#4B5E63] py-1.5 px-3 text-right pr-4 text-gray-200">
                    ${formatNumber(averageFixingPrice, 2)}
                  </td>
                  <td className="border border-[#4B5E63] py-1.5 px-3 text-right pr-4 text-amber-300">
                    ${formatNumber(displayedSale.grossRevenueUsd, 2)}
                  </td>
                  {isEditingFixings && <td className="border border-[#4B5E63]"></td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. TABLE 3: CHARGES, ADVANCES & BALANCE */}
        <div className="p-3 bg-[#FAF7EE] border-t-2 border-[#2B3D41]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-[#2B3D41] text-[11px] font-mono">
              <thead>
                <tr className="bg-[#2B3D41] text-white font-black text-[11px]">
                  <th className="border border-[#4B5E63] py-1.5 px-3 w-28">DATE</th>
                  <th className="border border-[#4B5E63] py-1.5 px-3">DESCRIPTION / INTITULÉ</th>
                  <th className="border border-[#4B5E63] py-1.5 px-3 w-32">DÉTAILS / TAUX</th>
                  <th className="border border-[#4B5E63] py-1.5 px-3 text-right pr-4 w-36">TOTAL AED</th>
                  <th className="border border-[#4B5E63] py-1.5 px-3 text-right pr-4 w-36 bg-[#36494D]">
                    TOTAL $
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C2BCA8]">
                {/* Charges */}
                {sale.charges.map((c) => {
                  const aed = c.amountAed !== undefined ? c.amountAed : c.amountUsd * aedRate;
                  return (
                    <tr key={c.id} className="hover:bg-amber-100/30">
                      <td className="border border-[#C2BCA8] py-1 px-3 bg-white text-gray-700">
                        {c.date || sale.date}
                      </td>
                      <td className="border border-[#C2BCA8] py-1 px-3 bg-white font-bold text-gray-900 uppercase">
                        {c.label}
                      </td>
                      <td className="border border-[#C2BCA8] py-1 px-3 bg-white/70 text-gray-600">
                        {c.rateOrDetails || '—'}
                      </td>
                      <td className="border border-[#C2BCA8] py-1 px-3 bg-white text-right pr-4 font-mono">
                        AED {formatNumber(aed, 2)}
                      </td>
                      <td className="border border-[#C2BCA8] py-1 px-3 bg-[#F6EDD6] text-right pr-4 font-mono font-bold text-gray-900">
                        ${formatNumber(c.amountUsd, 2)}
                      </td>
                    </tr>
                  );
                })}

                {/* Advances / Acomptes reçus */}
                {sale.advances.map((adv) => {
                  const aed = adv.amountAed !== undefined ? adv.amountAed : adv.amountUsd * aedRate;
                  return (
                    <tr key={adv.id} className="bg-[#F59E0B]/20 font-bold">
                      <td className="border border-[#C2BCA8] py-1.5 px-3 text-amber-950 font-black">
                        {adv.date || sale.date}
                      </td>
                      <td className="border border-[#C2BCA8] py-1.5 px-3 text-amber-950 font-black uppercase">
                        {adv.label}
                      </td>
                      <td className="border border-[#C2BCA8] py-1.5 px-3 text-amber-800 text-[10px]">
                        {adv.currency
                          ? `Stock devise ${adv.currency}`
                          : adv.account
                            ? `Encaissé via ${adv.account}`
                            : 'Acompte reçu'}
                      </td>
                      <td className="border border-[#C2BCA8] py-1.5 px-3 text-right pr-4 font-mono font-black text-amber-950">
                        AED {formatNumber(aed, 2)}
                      </td>
                      <td className="border border-[#C2BCA8] py-1.5 px-3 bg-[#F59E0B]/40 text-right pr-4 font-mono font-black text-amber-950">
                        ${formatNumber(adv.amountUsd, 2)}
                      </td>
                    </tr>
                  );
                })}

                {/* TOTAL WITHDRAW */}
                <tr className="bg-[#2B3D41] text-white font-black text-xs">
                  <td className="border border-[#4B5E63] py-2 px-3 text-right pr-4" colSpan={3}>
                    TOTAL WITHDRAW (Frais & Acomptes)
                  </td>
                  <td className="border border-[#4B5E63] py-2 px-3 text-right pr-4 text-amber-200">
                    AED {formatNumber(displayedSale.totalWithdrawAed || displayedSale.totalWithdrawUsd * aedRate, 2)}
                  </td>
                  <td className="border border-[#4B5E63] py-2 px-3 text-right pr-4 text-amber-300">
                    ${formatNumber(displayedSale.totalWithdrawUsd, 2)}
                  </td>
                </tr>

                {/* FINAL BALANCE ROW */}
                <tr className="bg-[#204B57] text-white font-black text-sm tracking-wide">
                  <td className="border border-[#204B57] py-2.5 px-3" colSpan={3}>
                    <div className="flex items-center justify-between">
                      <span className="uppercase text-amber-300">BALANCE (SOLDE RESTANT DÛ)</span>
                      <span className="text-[11px] text-gray-300 font-normal">
                        ≈ {formatMoney(Math.round(displayedSale.balanceRemainingUsd * xafRate))} FCFA
                      </span>
                    </div>
                  </td>
                  <td className="border border-[#204B57] py-2.5 px-3 text-right pr-4 text-amber-200 text-sm">
                    AED {formatNumber(displayedSale.balanceRemainingAed || displayedSale.balanceRemainingUsd * aedRate, 2)}
                  </td>
                  <td className="border border-[#204B57] py-2.5 px-3 text-right pr-4 text-white text-base font-black bg-[#163842]">
                    ${formatNumber(displayedSale.balanceRemainingUsd, 2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Sheet Footer Notes */}
        <div className="p-3 bg-[#FAF7EE] border-t border-[#C2BCA8] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-600 gap-2 font-mono">
          <div>
            Taux de change appliqués : 1 USD = <strong>{aedRate.toFixed(4)} AED</strong> · 1 USD ={' '}
            <strong>{xafRate.toFixed(2)} FCFA</strong>
          </div>
          <div className="font-bold text-[#192A24]">
            Comptoir CAMSGOLD International · Dubai Export Settlement
          </div>
        </div>
      </div>
    </div>
  );
};
