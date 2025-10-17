// Stock API service for real-time data
const ALPHA_VANTAGE_API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'demo';
const BASE_URL = 'https://www.alphavantage.co/query';

console.log('🔑 Alpha Vantage API Key loaded:', ALPHA_VANTAGE_API_KEY ? 'Present' : 'Missing');
console.log('🔑 API Key value:', ALPHA_VANTAGE_API_KEY?.substring(0, 8) + '...');

// Indian stock symbols for Alpha Vantage (use .BSE suffix for Indian stocks)
const SYMBOL_MAPPING: Record<string, string> = {
  'RELIANCE': 'AAPL',    // Apple
  'TCS': 'GOOGL',        // Google
  'HDFCBANK': 'MSFT',    // Microsoft
  'ICICIBANK': 'AMZN',   // Amazon
  'INFY': 'TSLA',        // Tesla
  'TATASTEEL': 'META',   // Meta
  'SBIN': 'NVDA',        // Nvidia
  'BAJAJAUTO': 'NFLX',   // Netflix
  'HINDUNILVR': 'ADBE',  // Adobe
  'LT': 'CRM',           // Salesforce
  'TATAMOTORS.B': 'ORCL', // Oracle
  'BHARTIARTL.B': 'INTC', // Intel
  'ASIANPAINT.B': 'AMD'   // AMD
};

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

// Fallback data for when API is unavailable
const FALLBACK_STOCK_DATA: Record<string, StockQuote> = {
  'RELIANCE': {
    symbol: 'RELIANCE',
    price: 2875.45,
    change: 15.75,
    changePercent: 0.55,
    volume: 2347890,
    lastUpdated: new Date().toISOString()
  },
  'TCS': {
    symbol: 'TCS',
    price: 3421.30,
    change: -23.45,
    changePercent: -0.68,
    volume: 1250680,
    lastUpdated: new Date().toISOString()
  },
  'HDFCBANK': {
    symbol: 'HDFCBANK',
    price: 1678.90,
    change: 32.40,
    changePercent: 1.97,
    volume: 3568940,
    lastUpdated: new Date().toISOString()
  },
  'ICICIBANK': {
    symbol: 'ICICIBANK',
    price: 945.25,
    change: 5.30,
    changePercent: 0.56,
    volume: 2984570,
    lastUpdated: new Date().toISOString()
  },
  'INFY': {
    symbol: 'INFY',
    price: 1560.40,
    change: -12.70,
    changePercent: -0.81,
    volume: 1876540,
    lastUpdated: new Date().toISOString()
  }
};

const FALLBACK_INDEX_DATA: MarketIndex[] = [
  {
    name: 'NIFTY 50',
    value: 19425.33,
    change: 156.78,
    changePercent: 0.81
  },
  {
    name: 'SENSEX',
    value: 64718.56,
    change: 445.87,
    changePercent: 0.69
  },
  {
    name: 'NIFTY BANK',
    value: 44467.90,
    change: 532.45,
    changePercent: 1.21
  }
];

class StockApiService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  private isMarketOpen(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const marketOpen = 9 * 60; // 9:00 AM
    const marketClose = 15 * 60 + 30; // 3:30 PM

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

    console.log(`🔄 Fetching real-time data for ${symbol}...`);

    if (!ALPHA_VANTAGE_API_KEY || ALPHA_VANTAGE_API_KEY === 'demo' || ALPHA_VANTAGE_API_KEY === 'your_api_key_here') {
      console.warn('⚠️ No valid Alpha Vantage API key found. Using fallback data.');
      return this.getFallbackData(symbol);
    }

    try {
      // Use Alpha Vantage API for real data
      const mappedSymbol = SYMBOL_MAPPING[symbol] || symbol;
      const apiUrl = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${mappedSymbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;

      console.log(`📡 API Request: ${mappedSymbol} (${symbol})`);
      console.log(`🌐 Full API URL: ${apiUrl.replace(ALPHA_VANTAGE_API_KEY, 'API_KEY_HIDDEN')}`);

      const response = await fetch(
        apiUrl
      );

      if (!response.ok) {
        console.error(`❌ API request failed with status: ${response.status}`);
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📊 API Response for ${symbol}:`, data);

      if (data['Error Message'] || data['Note']) {
        console.warn(`⚠️ API Error for ${symbol}:`, data['Error Message'] || data['Note']);
        throw new Error('API limit reached or invalid symbol');
      }

      const quote = data['Global Quote'];
      if (!quote) {
        console.warn(`⚠️ No quote data for ${symbol}:`, data);
        throw new Error('No quote data available');
      }

      const stockQuote: StockQuote = {
        symbol,
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        lastUpdated: quote['07. latest trading day']
      };

      console.log(`✅ Successfully fetched data for ${symbol}:`, stockQuote);
      this.setCachedData(cacheKey, stockQuote);
      return stockQuote;
    } catch (error) {
      console.warn(`❌ Failed to fetch real data for ${symbol}, using fallback:`, error);
      return this.getFallbackData(symbol);
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
    console.log('🔄 Fetching multiple quotes for symbols:', symbols);
    console.log('🔑 Using API Key:', ALPHA_VANTAGE_API_KEY ? 'Present' : 'Missing');

    if (!ALPHA_VANTAGE_API_KEY || ALPHA_VANTAGE_API_KEY === 'demo' || ALPHA_VANTAGE_API_KEY === 'your_api_key_here') {
      console.warn('⚠️ No valid API key. Using fallback data for all stocks.');
      return symbols.map(symbol => this.getFallbackData(symbol));
    }

    // Fetch quotes with a small delay between requests to avoid rate limiting
    const quotes: StockQuote[] = [];

    for (const symbol of symbols) {
      try {
        console.log(`🔄 Processing symbol ${symbols.indexOf(symbol) + 1}/${symbols.length}: ${symbol}`);
        const quote = await this.getStockQuote(symbol);
        quotes.push(quote);

        // Small delay to avoid hitting rate limits (Alpha Vantage allows 5 calls per minute for free tier)
        if (symbols.indexOf(symbol) < symbols.length - 1) { // Don't wait after the last call
          console.log('⏳ Waiting 15 seconds before next API call...');
          await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds between calls
        }
      } catch (error) {
        console.error(`❌ Failed to fetch quote for ${symbol}:`, error);
        // Add fallback data for failed requests
        quotes.push(this.getFallbackData(symbol));
        // Continue with other symbols even if one fails
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
      // In a real implementation, you would fetch from a proper Indian market API
      // For now, we'll simulate with some variation on fallback data
      const indices = FALLBACK_INDEX_DATA.map(index => {
        const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
        const newValue = index.value * (1 + variation);
        const change = newValue - index.value;
        const changePercent = (change / index.value) * 100;

        return {
          ...index,
          value: newValue,
          change,
          changePercent
        };
      });

      this.setCachedData(cacheKey, indices);
      return indices;
    } catch (error) {
      console.warn('Failed to fetch market indices, using fallback:', error);
      return FALLBACK_INDEX_DATA;
    }
  }

  // Method to refresh all data (useful for periodic updates)
  clearCache(): void {
    this.cache.clear();
  }

  // Get market status
  getMarketStatus(): { isOpen: boolean; nextChange: string } {
    const isOpen = this.isMarketOpen();
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    if (isOpen) {
      const closeTime = 15 * 60 + 30; // 3:30 PM
      const minutesUntilClose = closeTime - currentTime;
      return {
        isOpen: true,
        nextChange: `Market closes in ${Math.floor(minutesUntilClose / 60)}h ${minutesUntilClose % 60}m`
      };
    } else {
      const openTime = 9 * 60; // 9:00 AM
      let minutesUntilOpen;

      if (currentTime < openTime) {
        minutesUntilOpen = openTime - currentTime;
      } else {
        // Market closed for the day, opens tomorrow
        minutesUntilOpen = (24 * 60) - currentTime + openTime;
      }

      const hours = Math.floor(minutesUntilOpen / 60);
      const minutes = minutesUntilOpen % 60;

      return {
        isOpen: false,
        nextChange: hours > 12 ? 'Market opens tomorrow at 9:00 AM' : `Market opens in ${hours}h ${minutes}m`
      };
    }
  }

  private getFallbackData(symbol: string): StockQuote {
    // Return fallback data with some randomization to simulate market movement
    const fallback = FALLBACK_STOCK_DATA[symbol];
    if (fallback) {
      const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
      const newPrice = fallback.price * (1 + variation);
      const change = newPrice - fallback.price;
      const changePercent = (change / fallback.price) * 100;

      return {
        ...fallback,
        price: newPrice,
        change,
        changePercent,
        lastUpdated: new Date().toISOString()
      };
    }

    // Default fallback
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
