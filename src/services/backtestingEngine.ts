// Backtesting Engine with Real Strategy Implementations
import { Stock, Strategy, BacktestResult, Trade, EquityPoint } from '../types';
import { historicalDataService, HistoricalDataPoint } from './historicalDataService';

export interface StrategyParameters {
  [key: string]: number | boolean | string;
}

export interface BacktestConfig {
  initialCapital: number;
  startDate: string;
  endDate: string;
  commission: number; // Commission per trade
  days: number; // Number of days in the backtest period
}

// Technical Indicators
export class TechnicalIndicators {
  static sma(prices: number[], period: number): number[] {
    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  static ema(prices: number[], period: number): number[] {
    const ema = [];
    const multiplier = 2 / (period + 1);
    ema[0] = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
    }
    return ema;
  }

  static rsi(prices: number[], period: number = 14): number[] {
    const gains = [];
    const losses = [];
    const rsi = [];

    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate initial average gain and loss
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

  static bollinger(prices: number[], period: number = 20, deviation: number = 2): {
    middle: number[];
    upper: number[];
    lower: number[];
  } {
    const middle = this.sma(prices, period);
    const upper = [];
    const lower = [];

    for (let i = 0; i < middle.length; i++) {
      const slice = prices.slice(i, i + period);
      const mean = middle[i];
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      upper.push(mean + (stdDev * deviation));
      lower.push(mean - (stdDev * deviation));
    }

    return { middle, upper, lower };
  }

  static macd(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): {
    macd: number[];
    signal: number[];
    histogram: number[];
  } {
    const fastEMA = this.ema(prices, fastPeriod);
    const slowEMA = this.ema(prices, slowPeriod);
    
    const macd = [];
    for (let i = 0; i < Math.min(fastEMA.length, slowEMA.length); i++) {
      macd.push(fastEMA[i] - slowEMA[i]);
    }

    const signal = this.ema(macd, signalPeriod);
    const histogram = [];
    
    for (let i = 0; i < Math.min(macd.length, signal.length); i++) {
      histogram.push(macd[i] - signal[i]);
    }

    return { macd, signal, histogram };
  }
}

// Strategy Implementations
export class StrategyImplementations {
  static movingAverageCrossover(
    prices: number[],
    dates: string[],
    parameters: StrategyParameters
  ): { signals: ('BUY' | 'SELL' | 'HOLD')[]; indicators: any } {
    const shortPeriod = parameters['short-ma'] as number || 10;
    const longPeriod = parameters['long-ma'] as number || 50;

    console.log(`MA Crossover: ${prices.length} prices, short=${shortPeriod}, long=${longPeriod}`);
    
    if (prices.length < longPeriod + 10) {
      console.warn(`Not enough data for MA crossover: ${prices.length} < ${longPeriod + 10}`);
      // Generate simple buy-hold signals for insufficient data
      const signals = prices.map((_, i) => i === 0 ? 'BUY' : i === prices.length - 1 ? 'SELL' : 'HOLD') as ('BUY' | 'SELL' | 'HOLD')[];
      return { signals, indicators: { shortMA: [], longMA: [] } };
    }

    const shortMA = TechnicalIndicators.sma(prices, shortPeriod);
    const longMA = TechnicalIndicators.sma(prices, longPeriod);

    // Initialize signals array with correct length
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = new Array(prices.length).fill('HOLD');
    let position: 'LONG' | 'NONE' = 'NONE';

    // Start from where we have both MAs
    const startIndex = longPeriod - 1;
    
    for (let i = 1; i < Math.min(shortMA.length, longMA.length); i++) {
      const signalIndex = startIndex + i;
      if (signalIndex >= signals.length) break;

      const currentShort = shortMA[i];
      const currentLong = longMA[i];
      const prevShort = shortMA[i - 1];
      const prevLong = longMA[i - 1];

      // Crossover detection
      if (prevShort <= prevLong && currentShort > currentLong && position !== 'LONG') {
        signals[signalIndex] = 'BUY';
        position = 'LONG';
        console.log(`MA Crossover BUY signal at index ${signalIndex}, date: ${dates[signalIndex]}`);
      } else if (prevShort >= prevLong && currentShort < currentLong && position === 'LONG') {
        signals[signalIndex] = 'SELL';
        position = 'NONE';
        console.log(`MA Crossover SELL signal at index ${signalIndex}, date: ${dates[signalIndex]}`);
      }
    }

    console.log(`MA Crossover signals generated: ${signals.filter(s => s === 'BUY').length} BUY, ${signals.filter(s => s === 'SELL').length} SELL`);

    return {
      signals,
      indicators: { shortMA, longMA }
    };
  }

  static rsiStrategy(
    prices: number[],
    dates: string[],
    parameters: StrategyParameters
  ): { signals: ('BUY' | 'SELL' | 'HOLD')[]; indicators: any } {
    const rsiPeriod = parameters['rsi-period'] as number || 14;
    const oversoldThreshold = parameters['oversold-threshold'] as number || 30;
    const overboughtThreshold = parameters['overbought-threshold'] as number || 70;

    const rsi = TechnicalIndicators.rsi(prices, rsiPeriod);
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = [];
    let position: 'LONG' | 'SHORT' | 'NONE' = 'NONE';

    // Fill initial signals with HOLD
    for (let i = 0; i < rsiPeriod + 1; i++) {
      signals.push('HOLD');
    }

    for (let i = 0; i < rsi.length; i++) {
      const currentRSI = rsi[i];

      if (currentRSI < oversoldThreshold && position !== 'LONG') {
        signals.push('BUY');
        position = 'LONG';
      } else if (currentRSI > overboughtThreshold && position !== 'SHORT') {
        signals.push('SELL');
        position = 'SHORT';
      } else {
        signals.push('HOLD');
      }
    }

    return {
      signals,
      indicators: { rsi, oversoldThreshold, overboughtThreshold }
    };
  }

  static bollingerBands(
    prices: number[],
    dates: string[],
    parameters: StrategyParameters
  ): { signals: ('BUY' | 'SELL' | 'HOLD')[]; indicators: any } {
    const period = parameters['period'] as number || 20;
    const deviation = parameters['deviation'] as number || 2;

    const bollinger = TechnicalIndicators.bollinger(prices, period, deviation);
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = [];
    let position: 'LONG' | 'SHORT' | 'NONE' = 'NONE';

    // Fill initial signals with HOLD
    for (let i = 0; i < period; i++) {
      signals.push('HOLD');
    }

    for (let i = 0; i < bollinger.middle.length; i++) {
      const price = prices[i + period - 1];
      const upper = bollinger.upper[i];
      const lower = bollinger.lower[i];
      const middle = bollinger.middle[i];

      // Breakout strategy
      if (price > upper && position !== 'LONG') {
        signals.push('BUY');
        position = 'LONG';
      } else if (price < lower && position !== 'SHORT') {
        signals.push('SELL');
        position = 'SHORT';
      } else if (position !== 'NONE' && Math.abs(price - middle) < (upper - middle) * 0.1) {
        // Exit when price returns to middle
        signals.push(position === 'LONG' ? 'SELL' : 'BUY');
        position = 'NONE';
      } else {
        signals.push('HOLD');
      }
    }

    return {
      signals,
      indicators: bollinger
    };
  }

  static macdStrategy(
    prices: number[],
    dates: string[],
    parameters: StrategyParameters
  ): { signals: ('BUY' | 'SELL' | 'HOLD')[]; indicators: any } {
    const fastPeriod = parameters['fast-period'] as number || 12;
    const slowPeriod = parameters['slow-period'] as number || 26;
    const signalPeriod = parameters['signal-period'] as number || 9;

    const macdData = TechnicalIndicators.macd(prices, fastPeriod, slowPeriod, signalPeriod);
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = [];
    let previousSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

    // Fill initial signals with HOLD
    for (let i = 0; i < slowPeriod + signalPeriod; i++) {
      signals.push('HOLD');
    }

    for (let i = 1; i < macdData.signal.length; i++) {
      const currentMACD = macdData.macd[i];
      const currentSignal = macdData.signal[i];
      const prevMACD = macdData.macd[i - 1];
      const prevSignal = macdData.signal[i - 1];

      // MACD crossover
      if (prevMACD <= prevSignal && currentMACD > currentSignal && previousSignal !== 'BUY') {
        signals.push('BUY');
        previousSignal = 'BUY';
      } else if (prevMACD >= prevSignal && currentMACD < currentSignal && previousSignal !== 'SELL') {
        signals.push('SELL');
        previousSignal = 'SELL';
      } else {
        signals.push('HOLD');
      }
    }

    return {
      signals,
      indicators: macdData
    };
  }

  static meanReversion(
    prices: number[],
    dates: string[],
    parameters: StrategyParameters
  ): { signals: ('BUY' | 'SELL' | 'HOLD')[]; indicators: any } {
    const lookbackPeriod = parameters['lookback-period'] as number || 50;
    const entryThreshold = parameters['entry-threshold'] as number || 2;
    const exitThreshold = parameters['exit-threshold'] as number || 0.5;

    const signals: ('BUY' | 'SELL' | 'HOLD')[] = [];
    const means = [];
    const stdDevs = [];
    let position: 'LONG' | 'SHORT' | 'NONE' = 'NONE';

    // Fill initial signals with HOLD
    for (let i = 0; i < lookbackPeriod; i++) {
      signals.push('HOLD');
    }

    for (let i = lookbackPeriod; i < prices.length; i++) {
      const slice = prices.slice(i - lookbackPeriod, i);
      const mean = slice.reduce((a, b) => a + b, 0) / lookbackPeriod;
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / lookbackPeriod;
      const stdDev = Math.sqrt(variance);

      means.push(mean);
      stdDevs.push(stdDev);

      const currentPrice = prices[i];
      const zScore = (currentPrice - mean) / stdDev;

      if (zScore < -entryThreshold && position !== 'LONG') {
        // Price is significantly below mean, buy
        signals.push('BUY');
        position = 'LONG';
      } else if (zScore > entryThreshold && position !== 'SHORT') {
        // Price is significantly above mean, sell
        signals.push('SELL');
        position = 'SHORT';
      } else if (position === 'LONG' && zScore > -exitThreshold) {
        // Exit long position
        signals.push('SELL');
        position = 'NONE';
      } else if (position === 'SHORT' && zScore < exitThreshold) {
        // Exit short position
        signals.push('BUY');
        position = 'NONE';
      } else {
        signals.push('HOLD');
      }
    }

    return {
      signals,
      indicators: { means, stdDevs, entryThreshold, exitThreshold }
    };
  }
}

// Main Backtesting Engine
export class BacktestingEngine {
  static async getHistoricalData(stock: Stock, startDate: string, endDate: string): Promise<{ prices: number[]; dates: string[]; volumes: number[] }> {
    const historicalData = await historicalDataService.getHistoricalData(stock.symbol, startDate, endDate);
    
    if (historicalData.length === 0) {
      console.warn(`No historical data found for ${stock.symbol}, using fallback`);
      return this.generateFallbackData(stock, startDate, endDate);
    }
    
    console.log(`✅ Loaded ${historicalData.length} data points for ${stock.symbol} from ${startDate} to ${endDate}`);
    const prices = historicalData.map(d => d.price);
    const dates = historicalData.map(d => d.date);
    const volumes = historicalData.map(d => d.volume || 1000000);
    
    return { prices, dates, volumes };
  }

  static generateFallbackData(stock: Stock, startDate: string, endDate: string): { prices: number[]; dates: string[]; volumes: number[] } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const prices = [];
    const dates = [];
    const volumes = [];
    let currentPrice = stock.price;
    
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
      
      const dailyReturn = (Math.random() - 0.5) * 0.04; // ±2% daily change
      currentPrice *= (1 + dailyReturn);
      prices.push(currentPrice);
      volumes.push(Math.floor(Math.random() * 1000000) + 500000);
    }
    
    return { prices, dates, volumes };
  }

  static async runBacktest(
    stock: Stock,
    strategy: Strategy,
    parameters: StrategyParameters,
    config: BacktestConfig
  ): BacktestResult {
    // Get real historical data
    const { prices, dates, volumes } = await this.getHistoricalData(stock, config.startDate, config.endDate);
    
    if (prices.length === 0) {
      throw new Error(`No historical data available for ${stock.symbol}`);
    }

    // Get strategy signals
    let strategyResult;
    switch (strategy.id) {
      case 'moving-average-crossover':
        strategyResult = StrategyImplementations.movingAverageCrossover(prices, dates, parameters);
        break;
      case 'rsi-strategy':
        strategyResult = StrategyImplementations.rsiStrategy(prices, dates, parameters);
        break;
      case 'bollinger-bands':
        strategyResult = StrategyImplementations.bollingerBands(prices, dates, parameters);
        break;
      case 'macd-strategy':
        strategyResult = StrategyImplementations.macdStrategy(prices, dates, parameters);
        break;
      case 'mean-reversion':
        strategyResult = StrategyImplementations.meanReversion(prices, dates, parameters);
        break;
      default:
        throw new Error(`Strategy ${strategy.id} not implemented`);
    }

    const { signals } = strategyResult;

    // Execute trades based on signals
    const trades: Trade[] = [];
    const equityCurve: EquityPoint[] = [];
    let cash = config.initialCapital;
    let shares = 0;
    let totalValue = cash;
    let position: 'LONG' | 'NONE' = 'NONE';

    console.log(`Starting backtest execution: ${signals.length} signals, ${prices.length} prices`);
    
    for (let i = 0; i < Math.min(signals.length, prices.length); i++) {
      const signal = signals[i];
      const price = prices[i];
      const date = dates[i];
      
      if (!price || !date) continue;

      if (signal === 'BUY' && cash > price + config.commission && position !== 'LONG') {
        // Buy as many shares as possible
        const sharesToBuy = Math.floor((cash - config.commission) / price);
        if (sharesToBuy > 0) {
          shares += sharesToBuy;
          cash -= (sharesToBuy * price + config.commission);
          position = 'LONG';
          
          trades.push({
            date,
            type: 'BUY',
            price,
            quantity: sharesToBuy,
            value: sharesToBuy * price
          });
          
          console.log(`BUY: ${sharesToBuy} shares of ${stock.symbol} at ₹${price.toFixed(2)} on ${date}`);
        }
      } else if (signal === 'SELL' && shares > 0 && position === 'LONG') {
        // Sell all shares
        const sellValue = shares * price;
        cash += (shares * price - config.commission);
        position = 'NONE';
        
        // Find the last buy trade to calculate P&L
        const lastBuyTrade = [...trades].reverse().find(t => t.type === 'BUY');
        const pnl = lastBuyTrade ? sellValue - (shares * lastBuyTrade.price) : 0;
        
        trades.push({
          date,
          type: 'SELL',
          price,
          quantity: shares,
          value: sellValue,
          pnl
        });
        
        console.log(`SELL: ${shares} shares of ${stock.symbol} at ₹${price.toFixed(2)} on ${date}, P&L: ₹${pnl.toFixed(2)}`);
        shares = 0;
      }

      // Calculate total portfolio value
      totalValue = cash + (shares * price);
      equityCurve.push({
        date,
        value: totalValue
      });
    }
    
    console.log(`Backtest completed for ${stock.symbol}: ${trades.length} trades, Final value: ₹${totalValue.toFixed(2)}`);

    // Calculate performance metrics
    const finalValue = totalValue;
    const totalReturn = ((finalValue - config.initialCapital) / config.initialCapital) * 100;
    const annualizedReturn = totalReturn * (365 / config.days);
    
    // Calculate max drawdown
    let maxValue = config.initialCapital;
    let maxDrawdown = 0;
    for (const point of equityCurve) {
      if (point.value > maxValue) {
        maxValue = point.value;
      }
      const drawdown = ((maxValue - point.value) / maxValue) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate Sharpe ratio (simplified)
    const returns = equityCurve.map((point, i) => 
      i > 0 ? (point.value - equityCurve[i-1].value) / equityCurve[i-1].value : 0
    ).slice(1);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const returnStdDev = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = returnStdDev > 0 ? (avgReturn / returnStdDev) * Math.sqrt(252) : 0; // Annualized

    return {
      strategyId: strategy.id,
      stockSymbol: stock.symbol,
      startDate: config.startDate,
      endDate: config.endDate,
      initialInvestment: config.initialCapital,
      finalValue,
      totalReturn,
      annualizedReturn,
      maxDrawdown,
      sharpeRatio,
      trades,
      equityCurve
    };
  }
}