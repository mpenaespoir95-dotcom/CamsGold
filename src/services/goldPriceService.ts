import { GoldPriceQuote, PreciousMetalsSnapshot } from '../types';

export class GoldPriceService {
  private static STORAGE_KEY_GOLD = 'camsgold_quote_gold_v2';
  private static STORAGE_KEY_SILVER = 'camsgold_quote_silver_v2';
  private static STORAGE_KEY_API_KEY = 'camsgold_goldapi_key';

  private static defaultGoldQuote: GoldPriceQuote = {
    pricePerTroyOunceUsd: 0,
    updatedAt: '',
    source: 'Aucune donnée disponible',
    isLive: false,
  };

  private static defaultSilverQuote: GoldPriceQuote = {
    pricePerTroyOunceUsd: 0,
    updatedAt: '',
    source: 'Aucune donnée disponible',
    isLive: false,
  };

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
      console.warn('Could not save API key:', e);
    }
  }

  private static getCachedQuote(key: string, fallback: GoldPriceQuote): GoldPriceQuote {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.pricePerTroyOunceUsd === 'number') {
          return parsed;
        }
      }
    } catch {
      // Ignore cache parse error
    }
    return fallback;
  }

  private static saveCachedQuote(key: string, quote: GoldPriceQuote): void {
    try {
      localStorage.setItem(key, JSON.stringify(quote));
    } catch {
      // Ignore storage error
    }
  }

  static async fetchGoldApiComQuote(symbol: 'XAU' | 'XAG' = 'XAU'): Promise<GoldPriceQuote> {
    const cacheKey = symbol === 'XAU' ? this.STORAGE_KEY_GOLD : this.STORAGE_KEY_SILVER;
    const response = await fetch(`https://api.gold-api.com/price/${symbol}/USD`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`gold-api.com a répondu HTTP ${response.status}.`);
    }

    const payload = await response.json();
    if (payload?.symbol !== symbol || typeof payload.price !== 'number' || !Number.isFinite(payload.price)) {
      throw new Error(`gold-api.com n’a pas renvoyé de prix valide pour ${symbol}/USD.`);
    }

    const updatedAt = typeof payload.updatedAt === 'string' && !Number.isNaN(Date.parse(payload.updatedAt))
      ? payload.updatedAt
      : new Date().toISOString();
    const quote: GoldPriceQuote = {
      pricePerTroyOunceUsd: payload.price,
      updatedAt,
      source: 'gold-api.com (Live)',
      isLive: true,
    };
    this.saveCachedQuote(cacheKey, quote);
    return quote;
  }

  static async fetchGoldApiQuote(apiKey: string): Promise<GoldPriceQuote> {
    const key = apiKey.trim();
    if (!key) throw new Error('Saisissez une clé GoldAPI avant le test.');

    const response = await fetch('https://www.goldapi.io/api/price/XAU/USD', {
      headers: {
        'x-access-token': key,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GoldAPI a répondu HTTP ${response.status}. Vérifiez la clé et le quota de votre compte.`);
    }

    const payload = await response.json();
    if (!payload || typeof payload.price !== 'number' || !Number.isFinite(payload.price)) {
      throw new Error('GoldAPI n’a pas renvoyé de prix XAU/USD valide.');
    }

    const price = parseFloat(payload.price.toFixed(2));
    const previousClose = typeof payload.prev_close_price === 'number' ? payload.prev_close_price : undefined;
    const changeUsd = previousClose !== undefined ? parseFloat((price - previousClose).toFixed(2)) : undefined;
    const changePercent = typeof payload.change_percent === 'number'
      ? parseFloat(payload.change_percent.toFixed(2))
      : previousClose && previousClose > 0 && changeUsd !== undefined
        ? parseFloat(((changeUsd / previousClose) * 100).toFixed(2))
        : undefined;

    const quote: GoldPriceQuote = {
      pricePerTroyOunceUsd: price,
      updatedAt: new Date(payload.timestamp ? payload.timestamp * 1000 : Date.now()).toISOString(),
      previousCloseUsd: previousClose,
      changePercent,
      changeUsd,
      source: 'GoldAPI.io (Live)',
      isLive: true,
    };
    this.saveCachedQuote(this.STORAGE_KEY_GOLD, quote);
    return quote;
  }

  /**
   * Fetch live spot price of Gold (XAU/USD per troy ounce)
   * Priority:
   * 1. Private GoldAPI.io if key provided
   * 2. Live CDN currency-api mirror: https://latest.currency-api.pages.dev/v1/currencies/xau.json
   * 3. Fallback jsDelivr CDN mirror: https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json
   * 4. Cached / Baseline quote
   */
  static async fetchGoldUsd(apiKey?: string): Promise<GoldPriceQuote> {
    try {
      return await this.fetchGoldApiComQuote('XAU');
    } catch (err) {
      console.warn('gold-api.com indisponible, essai des sources de secours:', err);
    }

    const key = (apiKey || this.getSavedApiKey()).trim();

    // 1. Try custom GoldAPI if configured
    if (key) {
      try {
        return await this.fetchGoldApiQuote(key);
      } catch (err) {
        console.warn('GoldAPI private key request failed, falling back to open live feed:', err);
      }
    }

    // 2. Kitco Spot / Open Live Endpoints (no key needed, CORS-friendly, updated continually)
    const openEndpoints = [
      { url: 'https://latest.currency-api.pages.dev/v1/currencies/xau.json', source: 'Kitco / Marché Spot Live' },
      { url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json', source: 'Kitco Gold Live Feed' },
    ];

    for (const ep of openEndpoints) {
      try {
        const response = await fetch(ep.url, { cache: 'no-cache' });
        if (response.ok) {
          const payload = await response.json();
          if (payload && payload.xau && typeof payload.xau.usd === 'number') {
            const price = parseFloat(payload.xau.usd.toFixed(2));
            const quote: GoldPriceQuote = {
              pricePerTroyOunceUsd: price,
              updatedAt: new Date().toISOString(),
              source: ep.source || 'Kitco API (Live Spot)',
              isLive: true,
            };
            this.saveCachedQuote(this.STORAGE_KEY_GOLD, quote);
            return quote;
          }
        }
      } catch (err) {
        console.warn(`Gold feed ${ep.url} attempt failed:`, err);
      }
    }

    // 3. Fallback to a previously fetched quote or an empty result
    const cached = this.getCachedQuote(this.STORAGE_KEY_GOLD, this.defaultGoldQuote);
    return {
      ...cached,
      source: cached.pricePerTroyOunceUsd > 0
        ? `Dernier cours en cache (${cached.source || 'GoldAPI'})`
        : 'Aucune donnée disponible',
      updatedAt: cached.updatedAt || '',
      isLive: false,
    };
  }

  /**
   * Fetch live spot price of Silver (XAG/USD per troy ounce)
   */
  static async fetchSilverUsd(apiKey?: string): Promise<GoldPriceQuote> {
    try {
      return await this.fetchGoldApiComQuote('XAG');
    } catch (err) {
      console.warn('gold-api.com indisponible pour l’argent, essai des sources de secours:', err);
    }

    const key = (apiKey || this.getSavedApiKey()).trim();

    if (key) {
      try {
        const response = await fetch('https://www.goldapi.io/api/price/XAG/USD', {
          headers: {
            'x-access-token': key,
            'Accept': 'application/json',
          },
        });
        if (response.ok) {
          const payload = await response.json();
          if (payload && typeof payload.price === 'number') {
            const price = parseFloat(payload.price.toFixed(2));
            const prevClose = typeof payload.prev_close_price === 'number' ? payload.prev_close_price : undefined;
            const changeUsd = prevClose !== undefined ? parseFloat((price - prevClose).toFixed(2)) : undefined;
            const changePercent = typeof payload.change_percent === 'number'
              ? parseFloat(payload.change_percent.toFixed(2))
              : prevClose && prevClose > 0 && changeUsd !== undefined
                ? parseFloat(((changeUsd / prevClose) * 100).toFixed(2))
                : undefined;
            const quote: GoldPriceQuote = {
              pricePerTroyOunceUsd: price,
              updatedAt: new Date(payload.timestamp ? payload.timestamp * 1000 : Date.now()).toISOString(),
              previousCloseUsd: prevClose,
              changePercent,
              changeUsd,
              source: 'GoldAPI.io (Live)',
              isLive: true,
            };
            this.saveCachedQuote(this.STORAGE_KEY_SILVER, quote);
            return quote;
          }
        }
      } catch (err) {
        console.warn('Silver private key request failed, falling back:', err);
      }
    }

    const openEndpoints = [
      'https://latest.currency-api.pages.dev/v1/currencies/xag.json',
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xag.json',
    ];

    for (const url of openEndpoints) {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (response.ok) {
          const payload = await response.json();
          if (payload && payload.xag && typeof payload.xag.usd === 'number') {
            const price = parseFloat(payload.xag.usd.toFixed(2));
            const quote: GoldPriceQuote = {
              pricePerTroyOunceUsd: price,
              updatedAt: new Date().toISOString(),
              source: 'Cours direct (API Marché Live)',
              isLive: true,
            };
            this.saveCachedQuote(this.STORAGE_KEY_SILVER, quote);
            return quote;
          }
        }
      } catch (err) {
        console.warn(`Silver feed ${url} attempt failed:`, err);
      }
    }

    const cached = this.getCachedQuote(this.STORAGE_KEY_SILVER, this.defaultSilverQuote);
    return {
      ...cached,
      source: cached.pricePerTroyOunceUsd > 0
        ? `Dernier cours en cache (${cached.source || 'GoldAPI'})`
        : 'Aucune donnée disponible',
      updatedAt: cached.updatedAt || '',
      isLive: false,
    };
  }

  /**
   * Fetch both Gold and Silver spot prices together
   */
  static async fetchLiveMetals(goldApiKey?: string): Promise<PreciousMetalsSnapshot> {
    const [gold, silver] = await Promise.all([
      this.fetchGoldUsd(goldApiKey),
      this.fetchSilverUsd(goldApiKey),
    ]);

    return {
      gold,
      silver,
      updatedAt: gold.updatedAt || silver.updatedAt || '',
      source: gold.source || silver.source || 'Aucune source disponible',
      isLive: Boolean(gold.isLive || silver.isLive),
    };
  }
}
