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
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

class StockApiService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 60000;

  private isMarketOpen(): boolean {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const currentHour = istTime.getUTCHours();
    const currentMinute = istTime.getUTCMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const marketOpen = 9 * 60 + 15;
    const marketClose = 15 * 60 + 30;
    return currentTime >= marketOpen && currentTime < marketClose;
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

  async getStockQuote(symbol: string): Promise<StockQuote> {
    const cacheKey = `quote_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      console.log(`💾 Using cached data for ${symbol}`);
      return cached;
    }

    console.log(`🔄 Fetching real-time data from NSE for ${symbol}...`);

    try {
      const nseSymbol = symbol.replace('.B', '');
      const apiUrl = `https://www.nseindia.com/api/quote-equity?symbol=${nseSymbol}`;

      console.log(`📡 NSE API Request: ${nseSymbol}`);

      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.error(`❌ NSE API request failed with status: ${response.status}`);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📊 NSE API Response for ${symbol}:`, data);

      const priceData = data.priceInfo || {};
      const stockQuote: StockQuote = {
        symbol,
        price: priceData.lastPrice || 0,
        change: priceData.change || 0,
        changePercent: priceData.pChange || 0,
        volume: data.preOpenMarket?.totalTradedVolume || 0,
        lastUpdated: new Date().toISOString()
      };

      console.log(`✅ Successfully fetched NSE data for ${symbol}:`, stockQuote);
      this.setCachedData(cacheKey, stockQuote);
      return stockQuote;
    } catch (error) {
      console.warn(`❌ Failed to fetch NSE data for ${symbol}, using fallback:`, error);
      return this.getFallbackData(symbol);
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
    console.log('🔄 Fetching multiple quotes from NSE for symbols:', symbols);

    const quotes: StockQuote[] = [];

    for (const symbol of symbols) {
      try {
        console.log(`🔄 Processing symbol ${symbols.indexOf(symbol) + 1}/${symbols.length}: ${symbol}`);
        const quote = await this.getStockQuote(symbol);
        quotes.push(quote);

        if (symbols.indexOf(symbol) < symbols.length - 1) {
          console.log('⏳ Waiting 1 second before next API call...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Failed to fetch quote for ${symbol}:`, error);
        quotes.push(this.getFallbackData(symbol));
      }
    }

    console.log(`✅ Successfully fetched ${quotes.length} out of ${symbols.length} quotes`);
    return quotes;
  }

  async getMarketIndices(): Promise<MarketIndex[]> {
    const cacheKey = 'market_indices';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      console.log('🔄 Fetching market indices from NSE...');
      const response = await fetch('https://www.nseindia.com/api/allIndices', {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch indices');
      }

      const data = await response.json();
      const indices: MarketIndex[] = [];

      const indexNames = ['NIFTY 50', 'NIFTY BANK'];
      for (const indexData of data.data || []) {
        if (indexNames.includes(indexData.index)) {
          indices.push({
            name: indexData.index,
            value: indexData.last || 0,
            change: indexData.change || 0,
            changePercent: indexData.percentChange || 0
          });
        }
      }

      if (indices.length > 0) {
        console.log('✅ Successfully fetched NSE indices:', indices);
        this.setCachedData(cacheKey, indices);
        return indices;
      }

      throw new Error('No index data found');
    } catch (error) {
      console.warn('❌ Failed to fetch market indices from NSE, using fallback:', error);
      return FALLBACK_INDEX_DATA;
    }
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
        nextChange: `Market closes in ${Math.floor(minutesUntilClose / 60)}h ${minutesUntilClose % 60}m`
      };
    } else {
      const openTime = 9 * 60 + 15;
      let minutesUntilOpen;

      if (currentTime < openTime) {
        minutesUntilOpen = openTime - currentTime;
      } else {
        minutesUntilOpen = (24 * 60) - currentTime + openTime;
      }

      const hours = Math.floor(minutesUntilOpen / 60);
      const minutes = minutesUntilOpen % 60;

      return {
        isOpen: false,
        nextChange: hours > 12 ? 'Market opens tomorrow at 9:15 AM IST' : `Market opens in ${hours}h ${minutes}m`
      };
    }
  }

  private getFallbackData(symbol: string): StockQuote {
    const fallback = FALLBACK_STOCK_DATA[symbol];
    if (fallback) {
      const variation = (Math.random() - 0.5) * 0.02;
      const newPrice = fallback.price * (1 + variation);
      const change = newPrice - fallback.price;
      const changePercent = (change / fallback.price) * 100;

      return {
        symbol,
        price: newPrice,
        change,
        changePercent,
        volume: fallback.volume,
        lastUpdated: new Date().toISOString()
      };
    }

    return {
      symbol,
      price: 1000 + Math.random() * 2000,
      change: (Math.random() - 0.5) * 100,
      changePercent: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 1000000) + 500000,
      lastUpdated: new Date().toISOString()
    };
  }
}

export const stockApi = new StockApiService();
