import { ExchangeRateSnapshot } from '../types';

export class ExchangeRateService {
  private static STORAGE_KEY_RATES = 'camsgold_exchange_rates_v2';
  private static STORAGE_KEY_API_KEY = 'camsgold_exchangerate_api_key';

  private static baseRates: Record<string, number> = { USD: 1 };

  private static completeCfaRates(rates: Record<string, number>): Record<string, number> {
    const cfaPerUsd = rates.XAF > 0 ? rates.XAF : rates.EUR > 0 ? rates.EUR * 655.957 : 0;
    return {
      ...rates,
      ...(rates.XAF > 0 || cfaPerUsd <= 0 ? {} : { XAF: cfaPerUsd }),
      ...(rates.XOF > 0 || cfaPerUsd <= 0 ? {} : { XOF: cfaPerUsd }),
    };
  }

  static getSavedApiKey(): string {
    try {
      return localStorage.getItem(this.STORAGE_KEY_API_KEY) || '';
    } catch {
      return '';
    }
  }

  static setSavedApiKey(key: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_API_KEY, key.trim());
    } catch (e) {
      console.warn('Could not save exchange rate API key:', e);
    }
  }

  private static getCachedSnapshot(): ExchangeRateSnapshot | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_RATES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.usdRates && typeof parsed.usdRates === 'object') {
          return parsed;
        }
      }
    } catch {
      // Ignore cache parse error
    }
    return null;
  }

  private static saveCachedSnapshot(snapshot: ExchangeRateSnapshot): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_RATES, JSON.stringify(snapshot));
    } catch {
      // Ignore storage error
    }
  }

  /**
   * Fetches real live exchange rates.
   * Priority:
   * 1. Private ExchangeRate-API key if provided
   * 2. Live open.er-api.com endpoint (free, no key, CORS enabled)
   * 3. Backup live CDN currency-api endpoint
   * 4. LocalStorage cached rates
  * 5. Empty result when no live or cached rate is available
   */
  static async fetchRates(apiKey?: string): Promise<ExchangeRateSnapshot> {
    const key = (apiKey || this.getSavedApiKey()).trim();

    // 1. Custom ExchangeRate-API key
    if (key) {
      try {
        const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/latest/USD`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.result === 'success' && data.rates && typeof data.rates === 'object') {
            const snap: ExchangeRateSnapshot = {
              usdRates: this.completeCfaRates({ ...this.baseRates, ...data.rates }),
              updatedAt: new Date(data.time_last_update_unix ? data.time_last_update_unix * 1000 : Date.now()).toISOString(),
              source: 'ExchangeRate-API (Clé Pro)',
              isLive: true,
            };
            this.saveCachedSnapshot(snap);
            return snap;
          }
        }
      } catch (err) {
        console.warn('Private ExchangeRate-API failed, falling back to open endpoint:', err);
      }
    }

    // 2. Open live endpoint: open.er-api.com
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-cache' });
      if (response.ok) {
        const data = await response.json();
        if (data && data.result === 'success' && data.rates && typeof data.rates === 'object') {
          const snap: ExchangeRateSnapshot = {
            usdRates: this.completeCfaRates({ ...this.baseRates, ...data.rates }),
            updatedAt: new Date(data.time_last_update_unix ? data.time_last_update_unix * 1000 : Date.now()).toISOString(),
            source: 'open.er-api.com (En direct)',
            isLive: true,
          };
          this.saveCachedSnapshot(snap);
          return snap;
        }
      }
    } catch (err) {
      console.warn('open.er-api.com failed, attempting backup feed:', err);
    }

    // 3. Backup open endpoint: latest.currency-api.pages.dev
    try {
      const backupRes = await fetch('https://latest.currency-api.pages.dev/v1/currencies/usd.json', { cache: 'no-cache' });
      if (backupRes.ok) {
        const data = await backupRes.json();
        if (data && data.usd && typeof data.usd === 'object') {
          const normalizedRates: Record<string, number> = { ...this.baseRates };
          for (const [curr, val] of Object.entries(data.usd)) {
            if (typeof val === 'number') {
              normalizedRates[curr.toUpperCase()] = val;
            }
          }
          const snap: ExchangeRateSnapshot = {
            usdRates: this.completeCfaRates(normalizedRates),
            updatedAt: new Date(data.date ? `${data.date}T00:00:00Z` : Date.now()).toISOString(),
            source: 'Currency-API Global Feed (En direct)',
            isLive: true,
          };
          this.saveCachedSnapshot(snap);
          return snap;
        }
      }
    } catch (err) {
      console.warn('Backup exchange rate feed failed:', err);
    }

    // 4. Fallback to cached or default
    const cached = this.getCachedSnapshot();
    if (cached) {
      return {
        ...cached,
        usdRates: this.completeCfaRates(cached.usdRates),
        isLive: false,
      };
    }

    return {
      usdRates: { ...this.baseRates },
      updatedAt: '',
      source: 'Aucun taux réel disponible',
      isLive: false,
    };
  }

  static getRate(snapshot: ExchangeRateSnapshot | null, from: string, to: string): number | null {
    if (!snapshot) return null;
    const fromRate = snapshot.usdRates[from.toUpperCase()];
    const toRate = snapshot.usdRates[to.toUpperCase()];
    if (!fromRate || !toRate || fromRate <= 0) return null;
    return toRate / fromRate;
  }

  static getParallelRate(
    snapshot: ExchangeRateSnapshot | null,
    from: string,
    to: string,
    premiumPercent: number
  ): number | null {
    const officialRate = this.getRate(snapshot, from, to);
    if (officialRate === null || !Number.isFinite(premiumPercent) || premiumPercent < 0) {
      return null;
    }
    return officialRate * (1 + premiumPercent / 100);
  }
}
