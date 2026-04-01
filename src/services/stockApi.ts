// Stock API Service - Uses Yahoo Finance with CORS proxies and intelligent fallback
import { STOCK_UNIVERSE, getYahooSymbol } from '../data/stockUniverse';

// Build fallback from universe
const FALLBACK_STOCK_DATA: Record<string, { price: number; change: number; changePercent: number; volume: number }> = {};
STOCK_UNIVERSE.forEach(s => {
  const seed = s.symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const chPct = ((seed % 30) - 15) / 10;
  FALLBACK_STOCK_DATA[s.symbol] = {
    price: s.basePrice,
    change: Math.round(s.basePrice * chPct / 100 * 100) / 100,
    changePercent: chPct,
    volume: 500_000 + (seed % 2_000_000),
  };
});

// CORS proxy options — tried in order
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: string;
  isLive: boolean;
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

class StockApiService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 60_000; // 1 minute

  private isMarketOpen(): boolean {
    const now = new Date();
    const istTime = new Date(now.getTime() + 5.5 * 3600_000);
    const h = istTime.getUTCHours();
    const m = istTime.getUTCMinutes();
    const t = h * 60 + m;
    const dow = istTime.getUTCDay();
    return dow >= 1 && dow <= 5 && t >= 9 * 60 + 15 && t < 15 * 60 + 30;
  }

  private getCached(key: string): any | null {
    const c = this.cache.get(key);
    return c && Date.now() - c.timestamp < this.CACHE_DURATION ? c.data : null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async fetchViaProxy(url: string): Promise<any> {
    const proxyNames = ['allorigins.win', 'corsproxy.io', 'codetabs.com'];
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const makeProxy = CORS_PROXIES[i];
      const proxyName = proxyNames[i];
      try {
        const proxyUrl = makeProxy(url);
        console.debug(`🌐 [stockApi] Trying proxy ${proxyName} for ${url.slice(0, 60)}...`);
        const res = await fetch(proxyUrl, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(7000),
        });
        if (!res.ok) {
          console.warn(`⚠️ [stockApi] Proxy ${proxyName} returned HTTP ${res.status} — trying next`);
          continue;
        }
        const raw = await res.json();
        if (typeof raw?.contents === 'string') return JSON.parse(raw.contents);
        if (raw && typeof raw === 'object') return raw;
        console.warn(`⚠️ [stockApi] Proxy ${proxyName} returned unexpected shape — trying next`);
      } catch (err) {
        console.warn(`⚠️ [stockApi] Proxy ${proxyName} failed:`, err instanceof Error ? err.message : err);
      }
    }
    throw new Error('All CORS proxies failed');
  }

  async getStockQuote(symbol: string): Promise<StockQuote> {
    const cached = this.getCached(`q_${symbol}`);
    if (cached) return cached;

    const ySym = getYahooSymbol(symbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ySym}?interval=1d&range=2d`;

    try {
      const data = await this.fetchViaProxy(yahooUrl);
      const result = data?.chart?.result?.[0];
      if (!result?.meta) throw new Error('No chart result');

      const meta = result.meta;
      const price: number = meta.regularMarketPrice ?? meta.previousClose;
      const prevClose: number = meta.chartPreviousClose ?? meta.previousClose;
      const change = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

      const quote: StockQuote = {
        symbol,
        price: Math.round(price * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: meta.regularMarketVolume ?? 0,
        lastUpdated: new Date().toISOString(),
        isLive: true,
      };

      this.setCache(`q_${symbol}`, quote);
      return quote;
    } catch (err) {
      console.warn(`⚠️ [stockApi] Live fetch failed for ${symbol}, using seeded fallback:`, err instanceof Error ? err.message : err);
      return this.getFallback(symbol);
    }
  }

  /** Fetch multiple quotes in batches of 3 to avoid rate limits */
  async getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
    const BATCH = 3;
    const results: StockQuote[] = [];
    for (let i = 0; i < symbols.length; i += BATCH) {
      const batch = symbols.slice(i, i + BATCH);
      const batchResults = await Promise.all(
        batch.map(s => this.getStockQuote(s).catch((err) => {
          console.warn(`⚠️ [stockApi] Falling back to seeded data for ${s}:`, err instanceof Error ? err.message : err);
          return this.getFallback(s);
        }))
      );
      results.push(...batchResults);
      if (i + BATCH < symbols.length) await new Promise(r => setTimeout(r, 300));
    }
    const liveCount = results.filter(r => r.isLive).length;
    console.log(`📊 [stockApi] getMultipleQuotes complete: ${liveCount}/${results.length} live, ${results.length - liveCount} seeded`);
    return results;
  }

  async getMarketIndices(): Promise<MarketIndex[]> {
    const cached = this.getCached('indices');
    if (cached) return cached;

    const targets = [
      { yahoo: '%5ENSEI',  name: 'NIFTY 50'   },
      { yahoo: '%5EBSESN', name: 'SENSEX'      },
      { yahoo: '%5ENIT',   name: 'NIFTY IT'   },
      { yahoo: '%5EBANK',  name: 'BANK NIFTY'  },
    ];

    const indices: MarketIndex[] = [];

    for (const t of targets) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${t.yahoo}?interval=1d&range=2d`;
        const data = await this.fetchViaProxy(url);
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) continue;

        const price: number = meta.regularMarketPrice ?? meta.previousClose;
        const prevClose: number = meta.chartPreviousClose ?? meta.previousClose;
        const change = price - prevClose;

        indices.push({
          name: t.name,
          value: Math.round(price * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round((prevClose > 0 ? (change / prevClose) * 100 : 0) * 100) / 100,
        });
      } catch {
        /* skip failed index */
      }
    }

    const result = indices.length > 0 ? indices : FALLBACK_INDICES;
    this.setCache('indices', result);
    return result;
  }

  getMarketStatus(): { isOpen: boolean; nextChange: string } {
    const open = this.isMarketOpen();
    const now = new Date();
    const istTime = new Date(now.getTime() + 5.5 * 3600_000);
    const t = istTime.getUTCHours() * 60 + istTime.getUTCMinutes();
    const dow = istTime.getUTCDay();

    if (open) {
      const mins = (15 * 60 + 30) - t;
      return { isOpen: true, nextChange: `Market closes in ${Math.floor(mins / 60)}h ${mins % 60}m` };
    }

    let minsToOpen = t < 9 * 60 + 15 ? (9 * 60 + 15) - t : (24 * 60) - t + (9 * 60 + 15);
    if (dow === 6) minsToOpen += 2 * 24 * 60;
    if (dow === 0) minsToOpen += 24 * 60;

    const h = Math.floor(minsToOpen / 60);
    const m = minsToOpen % 60;
    return {
      isOpen: false,
      nextChange: h > 20
        ? 'Market opens next trading day at 9:15 AM IST'
        : `Market opens in ${h}h ${m}m`,
    };
  }

  clearCache(): void { this.cache.clear(); }

  private getFallback(symbol: string): StockQuote {
    const f = FALLBACK_STOCK_DATA[symbol];
    const meta = STOCK_UNIVERSE.find(s => s.symbol === symbol);
    const basePrice = meta?.basePrice ?? 1000;

    if (!f) {
      return { symbol, price: basePrice, change: 0, changePercent: 0, volume: 500_000, lastUpdated: new Date().toISOString(), isLive: false };
    }
    const seed = new Date().getDate() * 7 + new Date().getHours();
    const noise = ((seed % 20) - 10) / 1000;
    const price = Math.round(f.price * (1 + noise) * 100) / 100;
    return {
      symbol, price,
      change: Math.round((price - f.price + f.change) * 100) / 100,
      changePercent: Math.round(((price - f.price) / f.price * 100 + f.changePercent) * 100) / 100,
      volume: f.volume,
      lastUpdated: new Date().toISOString(),
      isLive: false,
    };
  }
}

const FALLBACK_INDICES: MarketIndex[] = [
  { name: 'NIFTY 50',   value: 22500.00, change: 120.00, changePercent: 0.54 },
  { name: 'SENSEX',     value: 74200.00, change: 350.00, changePercent: 0.47 },
  { name: 'NIFTY IT',   value: 33800.00, change: -85.00, changePercent: -0.25 },
  { name: 'BANK NIFTY', value: 48200.00, change: 280.00, changePercent: 0.58 },
];

export const stockApi = new StockApiService();
