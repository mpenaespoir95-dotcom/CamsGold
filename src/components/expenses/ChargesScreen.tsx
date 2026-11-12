import React, { useMemo, useState } from 'react';
import { Receipt, Plus, Wallet, Calendar, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { AppPanel, PageHeading, SectionHeading } from '../common/UIComponents';
import { formatMoney } from '../../utils/goldMath';

const CHARGE_CATEGORIES = [
  'Salaires',
  'Loyer',
  'Eau et Électricité',
  'Marketing',
  'Fournitures de bureau',
  'Assurances',
  'Autres frais administratifs',
] as const;

export const ChargesScreen: React.FC = () => {
  const store = useAppStore();

  const [category, setCategory] = useState<string>('Salaires');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash / Caisse' | 'Banque / Virement'>('Cash / Caisse');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterCat, setFilterCat] = useState<string>('ALL');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const chargeOperations = useMemo(() => {
    return store.operations.filter(
      (op) =>
        !op.isIncome &&
        !op.isTransfer &&
        !op.title.toLowerCase().includes('achat') &&
        !op.title.toLowerCase().includes('perte')
    );
  }, [store.operations]);

  const filteredCharges = useMemo(() => {
    if (filterCat === 'ALL') return chargeOperations;
    return chargeOperations.filter((op) => op.title.toLowerCase().includes(filterCat.toLowerCase()));
  }, [chargeOperations, filterCat]);

  const totalOpex = useMemo(
    () => chargeOperations.reduce((sum, op) => sum + op.amount, 0),
    [chargeOperations]
  );

  const totalsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    CHARGE_CATEGORIES.forEach((c) => map.set(c, 0));
    chargeOperations.forEach((op) => {
      const matched = CHARGE_CATEGORIES.find((c) => op.title.toLowerCase().includes(c.toLowerCase()));
      const key = matched || 'Autres frais administratifs';
      map.set(key, (map.get(key) || 0) + op.amount);
    });
    return map;
  }, [chargeOperations]);

  const handleAddCharge = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number.parseFloat(amount.replace(/\s+/g, '').replace(',', '.'));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;

    store.addExpense({
      account: paymentMode === 'Cash / Caisse' ? 'Caisse (espèces)' : 'Banque',
      amount: Math.round(numericAmount),
      description: `Charge · ${category}${description.trim() ? ` - ${description.trim()}` : ''}`,
      date: date || new Date().toLocaleDateString('fr-FR'),
    });

    setDescription('');
    setAmount('');
    setSuccessMsg(`Charge "${category}" de ${formatMoney(Math.round(numericAmount))} FCFA enregistrée.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-6">
      <PageHeading
        eyebrow="Gestion · OPEX"
        title="Gestion des Charges"
      />

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-800 uppercase tracking-wider mb-1">
            <Wallet size={15} className="text-rose-600" />
            <span>Total OPEX (Charges)</span>
          </div>
          <div className="text-2xl font-black text-rose-700">{formatMoney(totalOpex)} FCFA</div>
          <div className="text-[11px] text-rose-600 mt-1">{chargeOperations.length} charge(s) enregistrée(s)</div>
        </div>

        {(['Salaires', 'Loyer', 'Eau et Électricité'] as const).map((cat) => (
          <div key={cat} className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE]">
            <div className="text-xs font-bold text-[#7D8176] uppercase tracking-wider mb-1">{cat}</div>
            <div className="text-xl font-black text-[#192A24]">
              {formatMoney(totalsByCategory.get(cat) || 0)} FCFA
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Cumul enregistré</div>
          </div>
        ))}
      </div>

      {/* Add Charge Form */}
      <AppPanel className="space-y-4">
        <SectionHeading title="Enregistrer une nouvelle charge" icon={<Plus size={18} />} />
        <form onSubmit={handleAddCharge} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold text-[#7D8176] mb-1">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] text-xs font-semibold text-[#192A24]"
            >
              {CHARGE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#7D8176] mb-1">Description / Libellé</label>
            <input
              type="text"
              placeholder="Ex: Loyer bureau novembre"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] text-xs font-semibold text-[#192A24]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#7D8176] mb-1">Montant (FCFA)</label>
            <input
              type="number"
              required
              min="1"
              placeholder="Ex: 150000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] text-xs font-semibold text-[#192A24]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#7D8176] mb-1">Mode de paiement</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as 'Cash / Caisse' | 'Banque / Virement')}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] text-xs font-semibold text-[#192A24]"
            >
              <option value="Cash / Caisse">Cash / Caisse</option>
              <option value="Banque / Virement">Banque / Virement</option>
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-[#7D8176] mb-1 flex items-center gap-1">
                <Calendar size={11} /> Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-2.5 rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] text-xs font-semibold text-[#192A24]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#192A24] hover:bg-[#253D34] text-white text-xs font-bold cursor-pointer self-end"
            >
              Ajouter
            </button>
          </div>
        </form>
      </AppPanel>

      {/* Charges List */}
      <AppPanel padding="p-0" className="overflow-hidden">
        <div className="p-5 border-b border-[#E8D8BE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SectionHeading title="Historique des charges (OPEX)" icon={<Receipt size={18} />} />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E8D8BE] bg-[#FAF8F3] text-xs font-semibold text-[#192A24]"
          >
            <option value="ALL">Toutes les catégories</option>
            {CHARGE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-[#E8D8BE] text-[11px] font-bold text-[#7D8176] uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Détails / Mode de paiement</th>
                <th className="py-3 px-4 text-right">Montant (FCFA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCharges.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    Aucune charge enregistrée pour le moment.
                  </td>
                </tr>
              ) : (
                filteredCharges.map((op) => (
                  <tr key={op.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4 text-gray-500">{op.date}</td>
                    <td className="py-3 px-4 font-bold text-[#192A24]">{op.title}</td>
                    <td className="py-3 px-4 text-gray-600">{op.subtitle}</td>
                    <td className="py-3 px-4 text-right font-black text-rose-700">
                      - {formatMoney(op.amount)} FCFA
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AppPanel>
    </div>
  );
};
