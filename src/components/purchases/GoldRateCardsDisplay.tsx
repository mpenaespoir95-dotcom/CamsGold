import React, { useState } from 'react';
import {
  Star,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  Settings2,
  Sparkles,
  Layers,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  Info,
  RefreshCw,
  Radio,
  Activity,
  Globe,
} from 'lucide-react';
import { GoldCategory } from '../../types';
import { useAppStore } from '../../context/AppContext';
import {
  computeComptoirGoldPurchasePrice,
  calculateParallelRate,
  formatPriceCard,
  formatMoney,
  formatNumber,
} from '../../utils/goldMath';

interface GoldRateCardsDisplayProps {
  goldPriceOunce: number;
  silverPriceOunce?: number;
  officialUsdRate: number;
  selectedCategory: GoldCategory;
  onSelectCategory: (cat: GoldCategory) => void;
  selectedKarat: string;
  onSelectKarat: (karat: string, calculatedPrice: number) => void;
  onOpenFormulaModal: () => void;
  useParallelRate: boolean;
  onToggleUseParallelRate: (val: boolean) => void;
  compact?: boolean;
  // Live API status props
  isLiveRates?: boolean;
  ratesSource?: string;
  lastUpdated?: string;
  isRefreshing?: boolean;
  onRefreshRates?: () => void;
  goldChangePercent?: number;
  goldChangeUsd?: number;
  silverChangePercent?: number;
  silverChangeUsd?: number;
}

export const GoldRateCardsDisplay: React.FC<GoldRateCardsDisplayProps> = ({
  goldPriceOunce,
  silverPriceOunce = 0,
  officialUsdRate,
  selectedCategory,
  onSelectCategory,
  selectedKarat,
  onSelectKarat,
  onOpenFormulaModal,
  useParallelRate,
  onToggleUseParallelRate,
  compact = false,
  isLiveRates = false,
  ratesSource = '',
  lastUpdated,
  isRefreshing = false,
  onRefreshRates,
  goldChangePercent,
  goldChangeUsd,
  silverChangePercent,
  silverChangeUsd,
}) => {
  const store = useAppStore();
  const config = store.purchaseFormulaConfig;

  const blackMarketRate = config.blackMarketUsdRate || 0;
  const officialRate = officialUsdRate > 0 ? officialUsdRate : config.officialUsdRate || 0;

  const { premiumPercent, parallelRate } = calculateParallelRate({
    officialRate,
    blackMarketRate,
  });

  const availableCarats = [24, 22, 21, 18, 14, 9];

  // Helper to compute prices for any carat and category
  const getKaratCardData = (k: number, cat: GoldCategory) => {
    return computeComptoirGoldPurchasePrice({
      pricePerTroyOunceUsd: goldPriceOunce,
      usdToXafRate: officialRate,
      karat: k,
      category: cat,
      config,
    });
  };

  // Evolution simulation for selected evolution karat

  return (
    <div
      className={`bg-[#0F1216] text-white rounded-2xl shadow-xl border border-gray-800 transition-all ${
        compact ? 'p-3 sm:p-4.5 space-y-3' : 'p-4 sm:p-6 space-y-6 rounded-3xl'
      }`}
    >
      {/* 0. Live Market API Status Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-2.5 border-b border-gray-800/80 ${compact ? 'pb-2 text-[11px]' : 'pb-3 text-xs'}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>
              {isLiveRates
                ? 'Cours en direct'
                : goldPriceOunce > 0
                  ? 'Dernier cours en cache'
                  : 'Cours indisponible'}
            </span>
          </div>
          <div className="text-gray-400 text-[11px] hidden sm:flex items-center gap-1.5">
            <Globe size={12} className="text-amber-400" />
            <span>
              <strong className="text-gray-200">Source :</strong> {ratesSource || 'Aucune source disponible'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-gray-500 text-[10px] font-mono">
              Mis à jour : {new Date(lastUpdated).toLocaleTimeString('fr-FR')}
            </span>
          )}
          {onRefreshRates && (
            <button
              type="button"
              onClick={onRefreshRates}
              disabled={isRefreshing}
              className={`flex items-center gap-1.5 rounded-lg bg-gray-800/90 hover:bg-gray-700 text-gray-200 font-bold border border-gray-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs ${
                compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
              }`}
              title="Rafraîchir les cours en direct depuis les API"
            >
              <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-amber-400' : 'text-amber-400'} />
              <span>{isRefreshing ? 'Actualisation...' : 'Actualiser les cours'}</span>
            </button>
          )}
        </div>
      </div>
      {/* 1. Top Ticker Cards (OR XAU/USD & Silver XAG/USD) */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? 'gap-2.5 sm:gap-3' : 'gap-4'}`}>
        {/* Gold Ticker Card */}
        <div
          className={`bg-[#181C23] border border-gray-800 hover:border-amber-500/40 transition-all relative overflow-hidden group ${
            compact ? 'p-3 rounded-xl' : 'p-4 rounded-2xl'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div
                className={`rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 flex items-center justify-center shadow-md ${
                  compact ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-base'
                }`}
              >
                <span>🟡</span>
              </div>
              <div>
                <div className="text-xs font-black tracking-wider text-white">OR</div>
                <div className="text-[10px] text-gray-400 font-mono">XAU/USD · Once Troy</div>
              </div>
            </div>
            {goldChangePercent !== undefined && (
            <div
              className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1 ${
                goldChangePercent >= 0
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
              }`}
            >
              {goldChangePercent >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              <span>{goldChangePercent >= 0 ? `+${goldChangePercent.toFixed(2)}` : goldChangePercent.toFixed(2)}%</span>
              {goldChangeUsd !== undefined && (
                <span className="font-mono">
                  {goldChangeUsd >= 0 ? `+$${goldChangeUsd.toFixed(2)}` : `-$${Math.abs(goldChangeUsd).toFixed(2)}`}
                </span>
              )}
            </div>
            )}
          </div>

          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div
                className={`font-black text-[#F5B800] tracking-tight font-mono ${
                  compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
                }`}
              >
                {goldPriceOunce > 0 ? `$${formatPriceCard(goldPriceOunce, 2)}` : 'Indisponible'}
              </div>
              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                {goldPriceOunce > 0 && officialRate > 0
                  ? `≈ ${formatPriceCard(goldPriceOunce * officialRate, 0)} FCFA / once`
                  : 'Cours de conversion indisponible'}
              </div>
            </div>
          </div>
        </div>

        {/* Silver Ticker Card */}
        <div
          className={`bg-[#181C23] border border-gray-800 hover:border-gray-600 transition-all relative overflow-hidden group ${
            compact ? 'p-3 rounded-xl' : 'p-4 rounded-2xl'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div
                className={`rounded-full bg-gradient-to-tr from-gray-500 to-slate-200 flex items-center justify-center shadow-md ${
                  compact ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-base'
                }`}
              >
                <span>⚪</span>
              </div>
              <div>
                <div className="text-xs font-black tracking-wider text-white">ARGENT</div>
                <div className="text-[10px] text-gray-400 font-mono">XAG/USD · Once Troy</div>
              </div>
            </div>
            {silverChangePercent !== undefined && (
            <div
              className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1 ${
                silverChangePercent >= 0
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
              }`}
            >
              {silverChangePercent >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              <span>{silverChangePercent >= 0 ? `+${silverChangePercent.toFixed(2)}` : silverChangePercent.toFixed(2)}%</span>
              {silverChangeUsd !== undefined && (
                <span className="font-mono">
                  {silverChangeUsd >= 0 ? `+$${silverChangeUsd.toFixed(2)}` : `-$${Math.abs(silverChangeUsd).toFixed(2)}`}
                </span>
              )}
            </div>
            )}
          </div>

          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div
                className={`font-black text-slate-100 tracking-tight font-mono ${
                  compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
                }`}
              >
                {silverPriceOunce > 0 ? `$${formatPriceCard(silverPriceOunce, 2)}` : 'Indisponible'}
              </div>
              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                {silverPriceOunce > 0 && officialRate > 0
                  ? `≈ ${formatPriceCard(silverPriceOunce * officialRate, 0)} FCFA / once`
                  : 'Cours de conversion indisponible'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Parallel Rate & Formula Banner */}
      <div
        className={`bg-[#151920] border border-gray-800 flex flex-col lg:flex-row lg:items-center justify-between ${
          compact ? 'p-2.5 sm:p-3 rounded-xl gap-2.5' : 'p-4 rounded-2xl gap-4'
        }`}
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 size={14} />
              <span>Formule Taux Parallèle & Marché Noir</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
              {officialRate > 0 && blackMarketRate > 0
                ? `Premium : ${premiumPercent >= 0 ? '+' : ''}${premiumPercent.toFixed(2)} %`
                : 'Cours USD/XAF indisponible'}
            </span>
          </div>
          <p className="text-xs text-gray-300 font-mono">
            {officialRate > 0 && blackMarketRate > 0 ? (
              <>
                Taux parallèle = {formatNumber(officialRate, 2)} × (1 + {premiumPercent.toFixed(2)}%) ={' '}
                <strong className="text-white font-bold">{formatPriceCard(parallelRate, 2)} FCFA / $</strong>
              </>
            ) : (
              'Renseignez les deux taux pour calculer le taux parallèle.'
            )}
          </p>
          <p className="text-[10px] text-gray-400">
            {officialRate > 0 && blackMarketRate > 0
              ? `Marché noir : ${formatNumber(blackMarketRate, 2)} F · Dollar international : ${formatNumber(officialRate, 2)} F`
              : 'Aucun taux de marché configuré.'}
          </p>
        </div>

        {/* Toggle switch between official and parallel rate in purchase pricing */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#0B0D11] p-0.5 rounded-lg border border-gray-800">
            <button
              type="button"
              onClick={() => onToggleUseParallelRate(false)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                !useParallelRate
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Taux Officiel ({formatNumber(officialRate, 0)} F)
            </button>
            <button
              type="button"
              onClick={() => onToggleUseParallelRate(true)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                useParallelRate
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Taux Parallèle ({formatNumber(parallelRate, 0)} F)
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenFormulaModal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-[11px] font-bold text-gray-200 border border-gray-700 transition-colors cursor-pointer"
          >
            <Settings2 size={12} className="text-amber-400" />
            <span>Modifier formules</span>
          </button>
        </div>
      </div>

      {/* 3. Category Selector Tabs (Or brut / Or fondu / Bijoux) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5">
            <span className="text-amber-400">🏅</span>
            <span>Prix de l'or</span>
          </span>
          <span className="text-[11px] text-gray-400 font-semibold">Par carat</span>
        </div>

        {/* Category switcher */}
        <div className="flex items-center gap-1 bg-[#151920] p-0.5 rounded-lg border border-gray-800">
          {(['Or brut', 'Or fondu', 'Bijoux'] as GoldCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
          <div className="pl-2 pr-1 text-[10px] text-gray-500 font-medium border-l border-gray-800 hidden sm:block">
            Unité: Gramme
          </div>
        </div>
      </div>

      {/* 4. Carat Cards Grid (Exact screenshot design) */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 ${compact ? 'gap-2 sm:gap-2.5' : 'gap-3.5'}`}>
        {availableCarats.map((k) => {
          const res = getKaratCardData(k, selectedCategory);
          const isSelected = selectedKarat === `${k}` || selectedKarat === `${k}K`;
          const displayPrice = useParallelRate ? res.parallelPricePerGram : res.pricePerGram;
          const canCalculatePrice = goldPriceOunce > 0 && officialRate > 0 && (!useParallelRate || blackMarketRate > 0);

          return (
            <div
              key={k}
              onClick={() => onSelectKarat(String(k), displayPrice)}
              className={`transition-all cursor-pointer border flex flex-col justify-between relative group ${
                compact ? 'p-2.5 rounded-xl' : 'p-3.5 rounded-2xl'
              } ${
                isSelected
                  ? 'bg-[#181B22] border-amber-400 ring-2 ring-amber-400/20 shadow-lg shadow-amber-500/10'
                  : 'bg-[#14171E] border-gray-800 hover:border-gray-700 hover:bg-[#181B22]'
              }`}
            >
              {/* Star + Carat Title */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Star
                    size={13}
                    className={isSelected ? 'fill-amber-400 text-amber-400' : 'text-gray-500 group-hover:text-amber-400'}
                  />
                  <span className={`text-xs sm:text-sm font-black tracking-wide ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                    {k}K
                  </span>
                </div>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                )}
              </div>

              {/* Main Big Price */}
              <div className="my-1 space-y-0.5">
                <div
                  className={`font-black text-white tracking-tight font-mono ${
                    compact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'
                  }`}
                >
                  {canCalculatePrice ? formatPriceCard(displayPrice, 2) : 'Indisponible'}
                </div>
                <div className="text-[9px] text-gray-400 font-semibold tracking-wider uppercase">
                  XAF / Gramme
                </div>
              </div>

              {/* Sub-rows: $ USD and Parallèle */}
              <div className="pt-1.5 mt-1 border-t border-gray-800/80 space-y-1 text-[10px] font-mono">
                <div className="flex items-center justify-between text-gray-400">
                  <div className="flex items-center gap-0.5 text-amber-400/90 font-bold">
                    <span>$</span>
                    <span className="text-[9px] uppercase font-sans text-gray-400">USD</span>
                  </div>
                  <span className="text-gray-200 font-semibold">
                    {goldPriceOunce <= 0
                      ? 'Cours or indisponible'
                      : officialRate > 0
                        ? `$${formatPriceCard(res.pricePerGramUsd, 2)}`
                        : 'Cours USD/XAF requis'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-gray-400">
                  <div className="flex items-center gap-0.5 text-amber-400/90 font-bold">
                    <BarChart2 size={11} className="text-amber-400" />
                    <span className="text-[9px] uppercase font-sans text-gray-400">Parallèle</span>
                  </div>
                  <span className="text-gray-200 font-semibold">
                    {goldPriceOunce > 0 && officialRate > 0 && blackMarketRate > 0
                      ? formatPriceCard(res.parallelPricePerGram, 2)
                      : 'Indisponible'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Optional Comparaison des prix - Collapsible in compact mode */}
      {!compact && (
        <div className="pt-3 border-t border-gray-800 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-amber-500/10 text-amber-400">
              <Layers size={14} />
            </div>
            <div>
              <div className="text-xs font-black text-white">Historique des prix</div>
              <div className="text-[10px] text-gray-400">Aucune donnée historique réelle disponible.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
