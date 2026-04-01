/**
 * Stock API Service
 * Primary:  Finnhub (no CORS, 60 calls/min free tier)
 * Fallback: Yahoo Finance via CORS proxies
 * Final:    Seeded deterministic mock data (never empty)
 */
import { STOCK_UNIVERSE, getYahooSymbol } from '../data/stockUniverse';

// ─── Build fallback table from universe ───────────────────────────────────────
const FALLBACK_STOCK_DATA: Record<string, {
  price: number; change: number; changePercent: number; volume: number;
}> = {};

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

// ─── CORS proxy options for Yahoo Finance fallback ────────────────────────────
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Symbol format helpers ────────────────────────────────────────────────────
function toFinnhubSymbol(symbol: string): string {
  const meta = STOCK_UNIVERSE.find(s => s.symbol === symbol);
  if (!meta) return `NSE:${symbol}`;
  if (meta.market === 'BSE') {
    const base = symbol.replace('.B', '');
    return `BSE:${base}`;
  }
  return `NSE:${symbol}`;
}

// ─── Fallback indices ─────────────────────────────────────────────────────────
const FALLBACK_INDICES: MarketIndex[] = [
  { name: 'NIFTY 50',   value: 22500.00, change:  120.00, changePercent:  0.54 },
  { name: 'SENSEX',     value: 74200.00, change:  350.00, changePercent:  0.47 },
  { name: 'NIFTY IT',   value: 33800.00, change:  -85.00, changePercent: -0.25 },
  { name: 'BANK NIFTY', value: 48200.00, change:  280.00, changePercent:  0.58 },
];

// ─── Main service ─────────────────────────────────────────────────────────────
class StockApiService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 60_000; // 1 minute

  // Finnhub rate-limit tracker (60 calls/min free tier)
  private finnhubCallCount = 0;
  private finnhubWindowStart = Date.now();
  private readonly FINNHUB_LIMIT = 55; // stay a little under 60

  // ── Env keys ──────────────────────────────────────────────────────────────
  private get finnhubKey(): string {
    return import.meta.env.VITE_FINNHUB_API_KEY || '';
  }

  // ── Cache helpers ─────────────────────────────────────────────────────────
  private getCached(key: string): any | null {
    const c = this.cache.get(key);
    return c && Date.now() - c.timestamp < this.CACHE_DURATION ? c.data : null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // ── Finnhub rate limiter ──────────────────────────────────────────────────
  private canUseFinnhub(): boolean {
    if (!this.finnhubKey) return false;
    const now = Date.now();
    if (now - this.finnhubWindowStart >= 60_000) {
      this.finnhubCallCount = 0;
      this.finnhubWindowStart = now;
    }
    return this.finnhubCallCount < this.FINNHUB_LIMIT;
  }

  private recordFinnhubCall(): void {
    this.finnhubCallCount++;
  }

  // ── Market hours (IST) ────────────────────────────────────────────────────
  private isMarketOpen(): boolean {
    const now = new Date();
    const istTime = new Date(now.getTime() + 5.5 * 3_600_000);
    const h = istTime.getUTCHours();
    const m = istTime.getUTCMinutes();
    const t = h * 60 + m;
    const dow = istTime.getUTCDay();
    return dow >= 1 && dow <= 5 && t >= 9 * 60 + 15 && t < 15 * 60 + 30;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOURCE 1 — Finnhub (direct, no CORS)
  // ─────────────────────────────────────────────────────────────────────────
  private async fetchFinnhub(symbol: string): Promise<StockQuote | null> {
    if (!this.canUseFinnhub()) return null;

    const finnSym = toFinnhubSymbol(symbol);
    try {
      this.recordFinnhubCall();
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnSym)}&token=${this.finnhubKey}`,
        { signal: AbortSignal.timeout(6_000) }
      );
      if (!res.ok) return null;

      const d = await res.json();
      // Finnhub: c=current, d=change, dp=change%, v=volume, pc=prev close
      if (!d || !d.c || d.c === 0) return null;

      return {
        symbol,
        price:         Math.round(d.c  * 100) / 100,
        change:        Math.round(d.d  * 100) / 100,
        changePercent: Math.round(d.dp * 100) / 100,
        volume:        d.v || 0,
        lastUpdated:   new Date().toISOString(),
        isLive:        true,
      };
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOURCE 2 — Yahoo Finance via CORS proxies
  // ─────────────────────────────────────────────────────────────────────────
  private async fetchViaProxy(url: string): Promise<any> {
    for (const makeProxy of CORS_PROXIES) {
      try {
        const res = await fetch(makeProxy(url), {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(7_000),
        });
        if (!res.ok) continue;
        const raw = await res.json();
        if (typeof raw?.contents === 'string') return JSON.parse(raw.contents);
        if (raw && typeof raw === 'object') return raw;
      } catch {
        // try next proxy
      }
    }
    throw new Error('All CORS proxies failed');
  }

  private async fetchYahoo(symbol: string): Promise<StockQuote | null> {
    const ySym = getYahooSymbol(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ySym}?interval=1d&range=2d`;
    try {
      const data = await this.fetchViaProxy(url);
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;

      const price: number   = meta.regularMarketPrice ?? meta.previousClose;
      const prevClose: number = meta.chartPreviousClose ?? meta.previousClose;
      if (!price || price === 0) return null;

      const change        = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

      return {
        symbol,
        price:         Math.round(price         * 100) / 100,
        change:        Math.round(change         * 100) / 100,
        changePercent: Math.round(changePercent  * 100) / 100,
        volume:        meta.regularMarketVolume ?? 0,
        lastUpdated:   new Date().toISOString(),
        isLive:        true,
      };
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOURCE 3 — Deterministic seeded mock (always succeeds)
  // ─────────────────────────────────────────────────────────────────────────
  private getFallback(symbol: string): StockQuote {
    const f    = FALLBACK_STOCK_DATA[symbol];
    const meta = STOCK_UNIVERSE.find(s => s.symbol === symbol);
    const basePrice = meta?.basePrice ?? 1000;

    if (!f) {
      return {
        symbol, price: basePrice, change: 0, changePercent: 0,
        volume: 500_000, lastUpdated: new Date().toISOString(), isLive: false,
      };
    }

    // Vary slightly by hour/day so it doesn't look completely static
    const seed  = new Date().getDate() * 7 + new Date().getHours();
    const noise = ((seed % 20) - 10) / 1000;
    const price = Math.round(f.price * (1 + noise) * 100) / 100;

    return {
      symbol, price,
      change:        Math.round((price - f.price + f.change)                      * 100) / 100,
      changePercent: Math.round(((price - f.price) / f.price * 100 + f.changePercent) * 100) / 100,
      volume:        f.volume,
      lastUpdated:   new Date().toISOString(),
      isLive:        false,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public: single quote  (Finnhub → Yahoo → Mock)
  // ─────────────────────────────────────────────────────────────────────────
  async getStockQuote(symbol: string): Promise<StockQuote> {
    const cached = this.getCached(`q_${symbol}`);
    if (cached) return cached;

    // 1. Finnhub (fastest, no CORS)
    const finnhubQuote = await this.fetchFinnhub(symbol);
    if (finnhubQuote) {
      this.setCache(`q_${symbol}`, finnhubQuote);
      return finnhubQuote;
    }

    // 2. Yahoo Finance via proxy
    const yahooQuote = await this.fetchYahoo(symbol);
    if (yahooQuote) {
      this.setCache(`q_${symbol}`, yahooQuote);
      return yahooQuote;
    }

    // 3. Deterministic mock
    return this.getFallback(symbol);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public: batch quotes
  // Finnhub supports concurrent calls; batch size 5 with 150 ms gaps
  // keeps us well within the 60 calls/min limit even for 100+ symbols.
  // ─────────────────────────────────────────────────────────────────────────
  async getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
    const BATCH = 5;
    const results: StockQuote[] = [];

    for (let i = 0; i < symbols.length; i += BATCH) {
      const batch = symbols.slice(i, i + BATCH);
      const batchResults = await Promise.all(
        batch.map(s => this.getStockQuote(s).catch(() => this.getFallback(s)))
      );
      results.push(...batchResults);
      if (i + BATCH < symbols.length) {
        await new Promise(r => setTimeout(r, 150));
      }
    }
    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public: market indices  (Finnhub → Yahoo proxy → hardcoded fallback)
  // ─────────────────────────────────────────────────────────────────────────
  async getMarketIndices(): Promise<MarketIndex[]> {
    const cached = this.getCached('indices');
    if (cached) return cached;

    const targets = [
      { finnhub: 'NSE:NIFTY50',    yahoo: '%5ENSEI',  name: 'NIFTY 50'   },
      { finnhub: 'BSE:SENSEX',     yahoo: '%5EBSESN', name: 'SENSEX'     },
      { finnhub: 'NSE:NIFTYIT',    yahoo: '%5ENIT',   name: 'NIFTY IT'   },
      { finnhub: 'NSE:BANKNIFTY',  yahoo: '%5EBANK',  name: 'BANK NIFTY' },
    ];

    const indices: MarketIndex[] = [];

    for (const t of targets) {
      // Try Finnhub first
      if (this.finnhubKey && this.canUseFinnhub()) {
        try {
          this.recordFinnhubCall();
          const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(t.finnhub)}&token=${this.finnhubKey}`,
            { signal: AbortSignal.timeout(5_000) }
          );
          if (res.ok) {
            const d = await res.json();
            if (d && d.c && d.c !== 0) {
              indices.push({
                name:          t.name,
                value:         Math.round(d.c  * 100) / 100,
                change:        Math.round(d.d  * 100) / 100,
                changePercent: Math.round(d.dp * 100) / 100,
              });
              continue; // got it, skip Yahoo for this index
            }
          }
        } catch { /* fall through */ }
      }

      // Fallback to Yahoo proxy
      try {
        const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${t.yahoo}?interval=1d&range=2d`;
        const data = await this.fetchViaProxy(url);
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) continue;

        const price: number     = meta.regularMarketPrice  ?? meta.previousClose;
        const prevClose: number = meta.chartPreviousClose  ?? meta.previousClose;
        const change            = price - prevClose;

        indices.push({
          name:          t.name,
          value:         Math.round(price * 100) / 100,
          change:        Math.round(change * 100) / 100,
          changePercent: Math.round((prevClose > 0 ? (change / prevClose) * 100 : 0) * 100) / 100,
        });
      } catch { /* skip this index entirely */ }
    }

    const result = indices.length > 0 ? indices : FALLBACK_INDICES;
    this.setCache('indices', result);
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public: market status
  // ─────────────────────────────────────────────────────────────────────────
  getMarketStatus(): { isOpen: boolean; nextChange: string } {
    const open    = this.isMarketOpen();
    const now     = new Date();
    const istTime = new Date(now.getTime() + 5.5 * 3_600_000);
    const t       = istTime.getUTCHours() * 60 + istTime.getUTCMinutes();
    const dow     = istTime.getUTCDay();

    if (open) {
      const mins = (15 * 60 + 30) - t;
      return { isOpen: true, nextChange: `Market closes in ${Math.floor(mins / 60)}h ${mins % 60}m` };
    }

    let minsToOpen = t < 9 * 60 + 15
      ? (9 * 60 + 15) - t
      : (24 * 60) - t + (9 * 60 + 15);
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
}

export const stockApi = new StockApiService();
