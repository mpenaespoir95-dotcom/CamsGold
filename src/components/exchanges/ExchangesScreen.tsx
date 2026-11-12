import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  LineChart,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { AppPanel, PageHeading, SectionHeading } from '../common/UIComponents';
import { formatMoney, formatNumber } from '../../utils/goldMath';
import { ExchangeRateService } from '../../services/exchangeRateService';
import { ExchangeRateSnapshot } from '../../types';

export const ExchangesScreen: React.FC = () => {
  const store = useAppStore();
  const [activeTab, setActiveTab] = useState<'exchange' | 'chart'>('exchange');

  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('XAF');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [feePercent, setFeePercent] = useState('0');
  const [premiumPercent, setPremiumPercent] = useState('0');
  const [useParallelRate, setUseParallelRate] = useState(false);
  const [contact, setContact] = useState('');
  const [ratesSnapshot, setRatesSnapshot] = useState<ExchangeRateSnapshot | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Chart states
  const [chartPair, setChartPair] = useState<'USD/XAF' | 'EUR/XAF' | 'USD/EUR'>('USD/XAF');
  const [chartPeriod, setChartPeriod] = useState<'24 heures' | '7 jours' | '30 jours' | '1 an'>('7 jours');

  const currencies = ['USD', 'EUR', 'XAF', 'XOF', 'AED', 'CNY'];

  const loadRates = async () => {
    setIsRefreshing(true);
    try {
      const snap = await ExchangeRateService.fetchRates();
      setRatesSnapshot(snap);
      updateCalculatedRate(fromCurrency, toCurrency, snap, useParallelRate, premiumPercent);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateCalculatedRate = (
    from: string,
    to: string,
    snap: ExchangeRateSnapshot | null,
    parallel: boolean,
    prem: string
  ) => {
    if (!snap) return;
    const official = ExchangeRateService.getRate(snap, from, to);
    if (official !== null) {
      if (parallel) {
        const pNum = parseFloat(prem.replace(',', '.') || '0');
        const par = official * (1 + pNum / 100);
        setRate(par.toFixed(3));
      } else {
        setRate(official.toFixed(3));
      }
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const handleCurrencyChange = (newFrom: string, newTo: string) => {
    setFromCurrency(newFrom);
    setToCurrency(newTo);
    updateCalculatedRate(newFrom, newTo, ratesSnapshot, useParallelRate, premiumPercent);
  };

  // Calculations
  const amountNum = parseFloat(amount.replace(',', '.') || '0');
  const rateNum = parseFloat(rate.replace(',', '.') || '0');
  const feesNum = parseFloat(feePercent.replace(',', '.') || '0');

  const grossDelivered = amountNum * rateNum;
  const feesAmount = (grossDelivered * feesNum) / 100;
  const netDelivered = grossDelivered - feesAmount;

  const availableDeliveredCurrency = store.currencyBalances[toCurrency] ?? 0;

  const handleSwapCurrencies = () => {
    handleCurrencyChange(toCurrency, fromCurrency);
  };

  const handleExecuteExchange = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (amountNum <= 0) {
      setErrorMsg('Veuillez saisir un montant positif.');
      return;
    }
    if (availableDeliveredCurrency < netDelivered) {
      setErrorMsg(
        `Stock insuffisant en ${toCurrency} (${formatNumber(availableDeliveredCurrency, 2)} disponible(s)).`
      );
      return;
    }

    try {
      const clientLabel = contact || 'Client comptoir';
      const description = `${formatNumber(amountNum, 2)} ${fromCurrency} → ${formatNumber(
        netDelivered,
        2
      )} ${toCurrency} · ${clientLabel}`;

      store.addExchange({
        description,
        receivedCurrency: fromCurrency,
        receivedAmount: amountNum,
        deliveredCurrency: toCurrency,
        deliveredAmount: netDelivered,
      });

      setSuccessMsg(`Échange validé avec succès : ${description}`);
      setAmount('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const chartPoints: { label: string; rate: number }[] = [];

  return (
    <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-6">
      <PageHeading eyebrow="Comptoir · Devises" title="Échanges" />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8D8BE] pb-2">
        <button
          onClick={() => setActiveTab('exchange')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'exchange'
              ? 'bg-[#192A24] text-white shadow-xs'
              : 'text-[#7D8176] hover:bg-[#F6F0E5]'
          }`}
        >
          <ArrowLeftRight size={16} />
          <span>Opération de change</span>
        </button>

        <button
          onClick={() => setActiveTab('chart')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'chart'
              ? 'bg-[#192A24] text-white shadow-xs'
              : 'text-[#7D8176] hover:bg-[#F6F0E5]'
          }`}
        >
          <LineChart size={16} />
          <span>Courbe & Historique des taux</span>
        </button>
      </div>

      {activeTab === 'exchange' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AppPanel className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between border-b border-[#E8D8BE] pb-3 mb-5 gap-3">
              <div className="flex items-center gap-3">
                <SectionHeading title="Convertisseur & Saisie d'échange" icon={<ArrowLeftRight size={18} />} />
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  API Devises Live
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                {ratesSnapshot?.updatedAt && (
                  <span className="text-[11px] text-[#7D8176] font-mono hidden sm:inline">
                    {ratesSnapshot.source || 'open.er-api.com'} · {new Date(ratesSnapshot.updatedAt).toLocaleTimeString('fr-FR')}
                  </span>
                )}
                <button
                  onClick={loadRates}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8D8BE] text-xs font-semibold text-[#192A24] hover:bg-[#FAF8F3] cursor-pointer"
                  title="Rafraîchir les cours de change en direct"
                >
                  <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#D39725]' : ''} />
                  <span>{isRefreshing ? 'Actualisation...' : 'Actualiser les cours'}</span>
                </button>
              </div>
            </div>

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

            <form onSubmit={handleExecuteExchange} className="space-y-4">
              {/* Currency selection row with swap button */}
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 items-end">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-[#192A24] mb-1">
                    Devise Reçue (Client donne)
                  </label>
                  <select
                    value={fromCurrency}
                    onChange={(e) => handleCurrencyChange(e.target.value, toCurrency)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold text-[#192A24]"
                  >
                    {currencies.map((c) => (
                      <option key={c} value={c}>
                        {c} (Stock : {formatNumber(store.currencyBalances[c] || 0, 2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1 flex justify-center pb-1">
                  <button
                    type="button"
                    onClick={handleSwapCurrencies}
                    className="p-2.5 rounded-xl border border-[#E8D8BE] bg-white hover:bg-gray-50 text-[#D39725] cursor-pointer shadow-2xs"
                    title="Inverser les devises"
                  >
                    <ArrowLeftRight size={16} />
                  </button>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-[#192A24] mb-1">
                    Devise Remise (Comptoir livre)
                  </label>
                  <select
                    value={toCurrency}
                    onChange={(e) => handleCurrencyChange(fromCurrency, e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold text-[#192A24]"
                  >
                    {currencies.map((c) => (
                      <option key={c} value={c}>
                        {c} (Stock dispo : {formatNumber(store.currencyBalances[c] || 0, 2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount and Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#192A24] mb-1">
                    Montant remis par le client ({fromCurrency})
                  </label>
                  <input
                    type="text"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1000"
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#192A24] mb-1">
                    Taux appliqué (1 {fromCurrency} = X {toCurrency})
                  </label>
                  <input
                    type="text"
                    required
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
                  />
                </div>
              </div>

              {/* Parallel market & commission controls */}
              <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#192A24]">
                    <input
                      type="checkbox"
                      checked={useParallelRate}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseParallelRate(checked);
                        updateCalculatedRate(fromCurrency, toCurrency, ratesSnapshot, checked, premiumPercent);
                      }}
                      className="rounded border-gray-300 text-[#D39725] focus:ring-[#D39725]"
                    />
                    <span>Appliquer une marge / cours parallèle</span>
                  </label>
                  {useParallelRate && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#7D8176]">Surcote :</span>
                      <input
                        type="text"
                        value={premiumPercent}
                        onChange={(e) => {
                          setPremiumPercent(e.target.value);
                          updateCalculatedRate(fromCurrency, toCurrency, ratesSnapshot, true, e.target.value);
                        }}
                        className="w-16 px-2 py-1 bg-white border border-[#E8D8BE] rounded-lg text-xs font-bold text-center"
                      />
                      <span className="text-xs font-bold">%</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <div className="flex-1">
                    <label className="block text-[11px] text-[#7D8176] font-semibold mb-1">
                      Commission de change retenue (%)
                    </label>
                    <input
                      type="text"
                      value={feePercent}
                      onChange={(e) => setFeePercent(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 bg-white rounded-lg border border-[#E8D8BE] text-xs"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-[11px] text-[#7D8176] font-semibold mb-1">
                      Client ou contrepartie
                    </label>
                    <select
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white rounded-lg border border-[#E8D8BE] text-xs"
                    >
                      <option value="">Client comptoir anonyme</option>
                      {store.contacts.map((c) => (
                        <option key={c.reference} value={c.name}>
                          {c.name} ({c.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Conversion Result Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#192A24] to-[#2B463C] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div>
                  <div className="text-xs text-white/70 uppercase font-semibold">Montant net à débourser</div>
                  <div className="text-2xl font-black text-[#F2BD45]">
                    {formatNumber(netDelivered, 2)} {toCurrency}
                  </div>
                  {feesAmount > 0 && (
                    <div className="text-[11px] text-white/60">
                      Frais déduits : {formatNumber(feesAmount, 2)} {toCurrency} ({feePercent}%)
                    </div>
                  )}
                </div>
                <div className="sm:text-right text-xs text-white/80">
                  Stock disponible :{' '}
                  <strong
                    className={
                      availableDeliveredCurrency >= netDelivered ? 'text-emerald-300 font-bold' : 'text-red-300 font-bold'
                    }
                  >
                    {formatNumber(availableDeliveredCurrency, 2)} {toCurrency}
                  </strong>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#008B62] hover:bg-[#007452] text-white text-xs font-extrabold shadow-xs cursor-pointer transition-colors"
              >
                Valider l'échange et actualiser les stocks de devises
              </button>
            </form>
          </AppPanel>

          {/* Exchanges list */}
          <AppPanel>
            <SectionHeading title="Échanges récents" icon={<ArrowLeftRight size={18} />} />
            {store.exchanges.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">Aucun échange enregistré.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {store.exchanges.map((ex, idx) => (
                  <div key={idx} className="py-2.5 text-xs">
                    <div className="font-bold text-[#192A24]">{ex}</div>
                    <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={12} />
                      <span>Change effectué</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AppPanel>
        </div>
      )}

      {/* Tab 2: Rate Chart */}
      {activeTab === 'chart' && (
        <AppPanel className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8D8BE] pb-4">
            <div>
              <h3 className="font-extrabold text-base text-[#192A24]">Évolution historique des parités</h3>
              <p className="text-xs text-[#7D8176]">Analyse graphique des taux interbancaires</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-[#E8D8BE] p-0.5 bg-white">
                {(['USD/XAF', 'EUR/XAF', 'USD/EUR'] as const).map((pair) => (
                  <button
                    key={pair}
                    onClick={() => setChartPair(pair)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                      chartPair === pair ? 'bg-[#192A24] text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pair}
                  </button>
                ))}
              </div>

              <div className="flex rounded-lg border border-[#E8D8BE] p-0.5 bg-white">
                {(['24 heures', '7 jours', '30 jours', '1 an'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                      chartPeriod === period ? 'bg-[#D39725] text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="py-16 text-center text-sm text-gray-500">
            Aucun historique réel de taux disponible.
          </div>
        </AppPanel>
      )}
    </div>
  );
};
