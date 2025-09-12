import Papa from 'papaparse';

export interface HistoricalDataPoint {
  date: string;
  price: number;
  volume?: number;
}

export interface StockHistoricalData {
  symbol: string;
  data: HistoricalDataPoint[];
}

class HistoricalDataService {
  private historicalData: Map<string, HistoricalDataPoint[]> = new Map();
  private isLoaded = false;

  async loadHistoricalData(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const response = await fetch('/historicalStockData.csv');
      const csvText = await response.text();
      
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
      });

      const data = parsed.data as any[];
      
      // Process each stock symbol
      const symbols = Object.keys(data[0]).filter(key => key !== 'Date');
      
      symbols.forEach(symbol => {
        const stockData: HistoricalDataPoint[] = [];
        
        data.forEach(row => {
          if (row.Date && row[symbol]) {
            stockData.push({
              date: row.Date,
              price: parseFloat(row[symbol]),
              volume: Math.floor(Math.random() * 1000000) + 500000 // Generate realistic volume
            });
          }
        });
        
        this.historicalData.set(symbol, stockData);
      });

      this.isLoaded = true;
      console.log('✅ Historical data loaded for', symbols.length, 'stocks');
    } catch (error) {
      console.error('❌ Failed to load historical data:', error);
      this.generateFallbackData();
    }
  }

  private generateFallbackData(): void {
    const symbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY', 'TATASTEEL', 'SBIN', 'BAJAJAUTO', 'HINDUNILVR', 'LT'];
    const startDate = new Date('2000-01-01');
    const endDate = new Date();
    
    symbols.forEach(symbol => {
      const data: HistoricalDataPoint[] = [];
      let currentPrice = 100 + Math.random() * 500;
      
      for (let date = new Date(startDate); date <= endDate; date.setMonth(date.getMonth() + 1)) {
        const dailyReturn = (Math.random() - 0.5) * 0.1; // ±5% monthly change
        currentPrice *= (1 + dailyReturn);
        
        data.push({
          date: date.toISOString().split('T')[0],
          price: currentPrice,
          volume: Math.floor(Math.random() * 1000000) + 500000
        });
      }
      
      this.historicalData.set(symbol, data);
    });
    
    this.isLoaded = true;
  }

  async getHistoricalData(symbol: string, startDate?: string, endDate?: string): Promise<HistoricalDataPoint[]> {
    await this.loadHistoricalData();
    
    let data = this.historicalData.get(symbol) || [];
    
    // Generate daily data from monthly data for better backtesting
    if (data.length > 0) {
      data = this.interpolateDailyData(data);
    }
    
    if (startDate || endDate) {
      data = data.filter(point => {
        const pointDate = new Date(point.date);
        const start = startDate ? new Date(startDate) : new Date('1900-01-01');
        const end = endDate ? new Date(endDate) : new Date();
        return pointDate >= start && pointDate <= end;
      });
    }
    
    return data;
  }

  // Interpolate daily data from monthly data points
  private interpolateDailyData(monthlyData: HistoricalDataPoint[]): HistoricalDataPoint[] {
    const dailyData: HistoricalDataPoint[] = [];
    
    for (let i = 0; i < monthlyData.length - 1; i++) {
      const currentPoint = monthlyData[i];
      const nextPoint = monthlyData[i + 1];
      
      const startDate = new Date(currentPoint.date);
      const endDate = new Date(nextPoint.date);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const priceStep = (nextPoint.price - currentPoint.price) / daysDiff;
      
      for (let day = 0; day < daysDiff; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + day);
        
        // Skip weekends for more realistic trading data
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          const interpolatedPrice = currentPoint.price + (priceStep * day);
          const dailyVolatility = (Math.random() - 0.5) * 0.02; // ±1% daily volatility
          
          dailyData.push({
            date: currentDate.toISOString().split('T')[0],
            price: interpolatedPrice * (1 + dailyVolatility),
            volume: Math.floor(Math.random() * 500000) + 500000
          });
        }
      }
    }
    
    // Add the last data point
    if (monthlyData.length > 0) {
      dailyData.push(monthlyData[monthlyData.length - 1]);
    }
    
    return dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

  // Calculate technical indicators from historical data
  calculateSMA(data: HistoricalDataPoint[], period: number): number[] {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, point) => acc + point.price, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  calculateRSI(data: HistoricalDataPoint[], period: number = 14): number[] {
    const prices = data.map(d => d.price);
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const rsi = [];
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    
    return rsi;
  }
}

export const historicalDataService = new HistoricalDataService();