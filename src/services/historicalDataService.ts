import Papa from 'papaparse';

export interface HistoricalDataPoint {
  date: string;
  price: number;
  volume?: number;
}

/**
 * Simple deterministic pseudo-random using a seed.
 * Same seed always produces the same sequence — this is the key fix
 * for reproducible backtesting results.
 */
function seededRandom(seed: number): number {
  // Mulberry32 PRNG — fast, deterministic, good distribution
  seed = seed + 0x6D2B79F5;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

class HistoricalDataService {
  private historicalData: Map<string, HistoricalDataPoint[]> = new Map();
  private dailyCache: Map<string, HistoricalDataPoint[]> = new Map();
  private isLoaded = false;

  async loadHistoricalData(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const response = await fetch('/historicalStockData.csv');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const csvText = await response.text();

      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });

      const data = parsed.data as any[];
      if (!data || data.length === 0) throw new Error('Empty CSV');

      const symbols = Object.keys(data[0]).filter(key => key !== 'Date');

      symbols.forEach(symbol => {
        const stockData: HistoricalDataPoint[] = [];
        data.forEach(row => {
          if (row.Date && row[symbol] != null) {
            stockData.push({
              date: String(row.Date),
              price: parseFloat(row[symbol]),
              // Volume based on price — deterministic, not random
              volume: Math.floor(parseFloat(row[symbol]) * 500 + 500000),
            });
          }
        });
        this.historicalData.set(symbol, stockData);
      });

      this.isLoaded = true;
      console.log(`✅ Historical data loaded for ${symbols.length} stocks`);
    } catch (error) {
      console.error('❌ Failed to load historical data CSV:', error);
      this.generateFallbackData();
    }
  }

  private generateFallbackData(): void {
    const symbols = [
      'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY',
      'TATASTEEL', 'SBIN', 'BAJAJAUTO', 'HINDUNILVR', 'LT',
      'TATAMOTORS.B', 'BHARTIARTL.B', 'ASIANPAINT.B',
    ];

    const startDate = new Date('2000-01-01');
    const endDate = new Date();

    symbols.forEach((symbol, symbolIdx) => {
      const data: HistoricalDataPoint[] = [];
      // Deterministic starting price based on symbol index
      let currentPrice = 50 + symbolIdx * 40;

      for (
        let date = new Date(startDate);
        date <= endDate;
        date.setMonth(date.getMonth() + 1)
      ) {
        const dateKey = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
        const rand = seededRandom(dateKey + symbolIdx * 1000);
        const monthlyReturn = (rand - 0.5) * 0.08;
        currentPrice *= (1 + monthlyReturn);

        data.push({
          date: date.toISOString().split('T')[0],
          price: Math.max(currentPrice, 1),
          volume: Math.floor(currentPrice * 500 + 500000),
        });
      }

      this.historicalData.set(symbol, data);
    });

    this.isLoaded = true;
  }

  async getHistoricalData(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<HistoricalDataPoint[]> {
    await this.loadHistoricalData();

    // Build daily cache key
    const cacheKey = `${symbol}_daily`;
    if (!this.dailyCache.has(cacheKey)) {
      const monthly = this.historicalData.get(symbol) || [];
      const daily = this.interpolateDailyData(monthly, symbol);
      this.dailyCache.set(cacheKey, daily);
    }

    let data = this.dailyCache.get(cacheKey) || [];

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date('1900-01-01');
      const end = endDate ? new Date(endDate) : new Date();

      data = data.filter(point => {
        const d = new Date(point.date);
        return d >= start && d <= end;
      });
    }

    return data;
  }

  /**
   * Deterministic daily interpolation.
   * Uses a seed derived from the date + symbol so the same call always
   * produces the same prices — fixing the random backtesting issue.
   */
  private interpolateDailyData(
    monthlyData: HistoricalDataPoint[],
    symbol: string
  ): HistoricalDataPoint[] {
    if (monthlyData.length < 2) return monthlyData;

    // Create a symbol-specific base seed
    const symbolSeed = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const dailyData: HistoricalDataPoint[] = [];

    for (let i = 0; i < monthlyData.length - 1; i++) {
      const current = monthlyData[i];
      const next = monthlyData[i + 1];

      const startDate = new Date(current.date);
      const endDate = new Date(next.date);
      const daysDiff = Math.max(
        1,
        Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      const priceStep = (next.price - current.price) / daysDiff;

      for (let day = 0; day < daysDiff; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + day);
        const dow = currentDate.getDay();

        // Skip weekends
        if (dow === 0 || dow === 6) continue;

        const dateEpochDay = Math.floor(currentDate.getTime() / (1000 * 60 * 60 * 24));
        // Deterministic seed: symbol + date
        const seed = symbolSeed * 1000 + dateEpochDay;
        const rand = seededRandom(seed);

        // Small daily noise ±0.8% — same value every time for same date/symbol
        const dailyNoise = (rand - 0.5) * 0.016;
        const interpolatedPrice = Math.max(
          (current.price + priceStep * day) * (1 + dailyNoise),
          0.01
        );

        dailyData.push({
          date: currentDate.toISOString().split('T')[0],
          price: interpolatedPrice,
          // Volume also deterministic
          volume: Math.floor(interpolatedPrice * 400 + 300000 + (rand * 200000)),
        });
      }
    }

    // Add the last monthly point
    const last = monthlyData[monthlyData.length - 1];
    dailyData.push(last);

    return dailyData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  async getLatestPrice(symbol: string): Promise<number> {
    await this.loadHistoricalData();
    const data = this.historicalData.get(symbol) || [];
    return data.length > 0 ? data[data.length - 1].price : 100;
  }

  async getAllSymbols(): Promise<string[]> {
    await this.loadHistoricalData();
    return Array.from(this.historicalData.keys());
  }

  calculateSMA(data: HistoricalDataPoint[], period: number): number[] {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data
        .slice(i - period + 1, i + 1)
        .reduce((acc, p) => acc + p.price, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  calculateRSI(data: HistoricalDataPoint[], period = 14): number[] {
    const prices = data.map(d => d.price);
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const rsi: number[] = [];
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }

    return rsi;
  }
}

export const historicalDataService = new HistoricalDataService();
