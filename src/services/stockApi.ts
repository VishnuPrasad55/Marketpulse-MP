// Fixed Stock API - uses Yahoo Finance via a CORS proxy (allorigins.win)
// This avoids direct NSE CORS blocks while still getting real market data

const FALLBACK_STOCK_DATA: Record<string, any> = {
  'RELIANCE': { price: 2875.45, change: 15.75, changePercent: 0.55, volume: 2347890 },
  'TCS': { price: 3421.30, change: -23.45, changePercent: -0.68, volume: 1250680 },
  'HDFCBANK': { price: 1678.90, change: 32.40, changePercent: 1.97, volume: 3568940 },
  'ICICIBANK': { price: 945.25, change: 5.30, changePercent: 0.56, volume: 2984570 },
  'INFY': { price: 1560.40, change: -12.70, changePercent: -0.81, volume: 1876540 },
  'TATASTEEL': { price: 145.75, change: 2.30, changePercent: 1.60, volume: 8934560 },
  'SBIN': { price: 625.50, change: -8.20, changePercent: -1.29, volume: 5678920 },
  'BAJAJAUTO': { price: 8234.60, change: 125.40, changePercent: 1.55, volume: 456780 },
  'HINDUNILVR': { price: 2456.80, change: -15.60, changePercent: -0.63, volume: 987650 },
  'LT': { price: 3245.90, change: 45.30, changePercent: 1.42, volume: 1234560 },
  'TATAMOTORS.B': { price: 876.45, change: 12.80, changePercent: 1.48, volume: 6789450 },
  'BHARTIARTL.B': { price: 1234.70, change: -18.90, changePercent: -1.51, volume: 2345670 },
  'ASIANPAINT.B': { price: 3012.35, change: 34.50, changePercent: 1.16, volume: 876540 }
};

// Yahoo Finance symbol mapping for Indian stocks
const YAHOO_SYMBOL_MAP: Record<string, string> = {
  'RELIANCE': 'RELIANCE.NS',
  'TCS': 'TCS.NS',
  'HDFCBANK': 'HDFCBANK.NS',
  'ICICIBANK': 'ICICIBANK.NS',
  'INFY': 'INFY.NS',
  'TATASTEEL': 'TATASTEEL.NS',
  'SBIN': 'SBIN.NS',
  'BAJAJAUTO': 'BAJAJAUTO.NS',
  'HINDUNILVR': 'HINDUNILVR.NS',
  'LT': 'LT.NS',
  'TATAMOTORS.B': 'TATAMOTORS.BO',
  'BHARTIARTL.B': 'BHARTIARTL.BO',
  'ASIANPAINT.B': 'ASIANPAINT.BO',
};

const FALLBACK_INDEX_DATA = [
  { name: 'NIFTY 50', value: 19425.33, change: 156.78, changePercent: 0.81 },
  { name: 'SENSEX', value: 64718.56, change: 445.87, changePercent: 0.69 },
  { name: 'NIFTY BANK', value: 44467.90, change: 532.45, changePercent: 1.21 }
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
  private readonly CACHE_DURATION = 30000; // 30 seconds for live data
  private readonly STALE_DURATION = 300000; // 5 minutes for stale fallback

  private isMarketOpen(): boolean {
    const now = new Date();
    // IST = UTC + 5:30
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const currentHour = istTime.getUTCHours();
    const currentMinute = istTime.getUTCMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const marketOpen = 9 * 60 + 15;   // 9:15 AM IST
    const marketClose = 15 * 60 + 30; // 3:30 PM IST
    const dayOfWeek = istTime.getUTCDay(); // 0=Sun, 6=Sat
    return dayOfWeek >= 1 && dayOfWeek <= 5 && currentTime >= marketOpen && currentTime < marketClose;
  }

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Fetch a single stock quote from Yahoo Finance via allorigins CORS proxy.
   * Yahoo Finance v8 quoteSummary endpoint returns price data reliably.
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    const cacheKey = `quote_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      console.log(`💾 Using cached data for ${symbol}`);
      return cached;
    }

    const yahooSymbol = YAHOO_SYMBOL_MAP[symbol] || `${symbol}.NS`;

    try {
      console.log(`📡 Fetching live quote for ${symbol} (${yahooSymbol}) from Yahoo Finance...`);

      // Yahoo Finance v8 quoteSummary — modules=price gives us what we need
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;

      const response = await fetch(proxyUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000), // 8 second timeout
      });

      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.status}`);
      }

      const proxyData = await response.json();

      if (!proxyData.contents) {
        throw new Error('Empty proxy response');
      }

      const data = JSON.parse(proxyData.contents);
      const result = data?.chart?.result?.[0];

      if (!result) {
        throw new Error('No chart result in Yahoo response');
      }

      const meta = result.meta;
      const price = meta.regularMarketPrice ?? meta.previousClose;
      const previousClose = meta.chartPreviousClose ?? meta.previousClose;
      const change = price - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
      const volume = meta.regularMarketVolume ?? 0;

      const quote: StockQuote = {
        symbol,
        price,
        change,
        changePercent,
        volume,
        lastUpdated: new Date().toISOString(),
        isLive: true,
      };

      console.log(`✅ Live data for ${symbol}: ₹${price.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
      this.setCachedData(cacheKey, quote);
      return quote;

    } catch (error) {
      console.warn(`⚠️ Live fetch failed for ${symbol}, using fallback:`, error);
      return this.getFallbackData(symbol);
    }
  }

  /**
   * Fetch multiple quotes with controlled concurrency (3 at a time).
   */
  async getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
    console.log(`🔄 Fetching live quotes for ${symbols.length} symbols...`);

    const BATCH_SIZE = 3;
    const results: StockQuote[] = [];

    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(symbol => this.getStockQuote(symbol).catch(() => this.getFallbackData(symbol)))
      );
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const liveCount = results.filter(q => q.isLive).length;
    console.log(`✅ Fetched ${results.length} quotes (${liveCount} live, ${results.length - liveCount} fallback)`);
    return results;
  }

  /**
   * Fetch market index data (Nifty 50 and Sensex) from Yahoo Finance.
   */
  async getMarketIndices(): Promise<MarketIndex[]> {
    const cacheKey = 'market_indices';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const indexSymbols = [
      { yahoo: '%5ENSEI', name: 'NIFTY 50' },
      { yahoo: '%5EBSESN', name: 'SENSEX' },
    ];

    const indices: MarketIndex[] = [];

    for (const idx of indexSymbols) {
      try {
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${idx.yahoo}?interval=1d&range=1d`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;

        const response = await fetch(proxyUrl, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(6000),
        });

        if (!response.ok) throw new Error(`Status ${response.status}`);

        const proxyData = await response.json();
        const data = JSON.parse(proxyData.contents);
        const meta = data?.chart?.result?.[0]?.meta;

        if (!meta) throw new Error('No meta in response');

        const price = meta.regularMarketPrice ?? meta.previousClose;
        const prevClose = meta.chartPreviousClose ?? meta.previousClose;
        const change = price - prevClose;

        indices.push({
          name: idx.name,
          value: price,
          change,
          changePercent: prevClose > 0 ? (change / prevClose) * 100 : 0,
        });
      } catch (err) {
        console.warn(`Failed to fetch index ${idx.name}:`, err);
      }
    }

    const result = indices.length > 0 ? indices : FALLBACK_INDEX_DATA;
    this.setCachedData(cacheKey, result);
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getMarketStatus(): { isOpen: boolean; nextChange: string } {
    const isOpen = this.isMarketOpen();
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const currentTime = istTime.getUTCHours() * 60 + istTime.getUTCMinutes();

    if (isOpen) {
      const closeTime = 15 * 60 + 30;
      const minutesUntilClose = closeTime - currentTime;
      return {
        isOpen: true,
        nextChange: `Market closes in ${Math.floor(minutesUntilClose / 60)}h ${minutesUntilClose % 60}m`,
      };
    } else {
      const openTime = 9 * 60 + 15;
      let minutesUntilOpen = currentTime < openTime
        ? openTime - currentTime
        : (24 * 60) - currentTime + openTime;

      const dayOfWeek = istTime.getUTCDay();
      if (dayOfWeek === 6) minutesUntilOpen += 2 * 24 * 60; // Saturday → Monday
      if (dayOfWeek === 0) minutesUntilOpen += 24 * 60;      // Sunday → Monday

      const hours = Math.floor(minutesUntilOpen / 60);
      const minutes = minutesUntilOpen % 60;

      return {
        isOpen: false,
        nextChange: hours > 20
          ? 'Market opens next trading day at 9:15 AM IST'
          : `Market opens in ${hours}h ${minutes}m`,
      };
    }
  }

  private getFallbackData(symbol: string): StockQuote {
    const fallback = FALLBACK_STOCK_DATA[symbol];
    if (fallback) {
      // Use a seeded-like deterministic variation based on date to avoid wild swings
      const seed = new Date().getDate() + new Date().getHours();
      const variation = ((seed % 10) - 5) / 1000; // Very small ±0.5%
      const newPrice = fallback.price * (1 + variation);
      const change = newPrice - fallback.price;
      return {
        symbol,
        price: newPrice,
        change,
        changePercent: (change / fallback.price) * 100,
        volume: fallback.volume,
        lastUpdated: new Date().toISOString(),
        isLive: false,
      };
    }
    return {
      symbol,
      price: 1000,
      change: 0,
      changePercent: 0,
      volume: 500000,
      lastUpdated: new Date().toISOString(),
      isLive: false,
    };
  }
}

export const stockApi = new StockApiService();
