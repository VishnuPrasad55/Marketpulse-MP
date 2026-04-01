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
  commission: number;
  days: number;
}

// ─── Technical Indicators ─────────────────────────────────────────────────────
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
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    ema[0] = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema[i] = prices[i] * multiplier + ema[i - 1] * (1 - multiplier);
    }
    return ema;
  }

  static rsi(prices: number[], period: number = 14): number[] {
    const gains: number[] = [];
    const losses: number[] = [];
    const rsi: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
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

  static bollinger(prices: number[], period: number = 20, deviation: number = 2): {
    middle: number[]; upper: number[]; lower: number[];
  } {
    const middle = this.sma(prices, period);
    const upper: number[] = [];
    const lower: number[] = [];
    for (let i = 0; i < middle.length; i++) {
      const slice = prices.slice(i, i + period);
      const mean = middle[i];
      const variance = slice.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      upper.push(mean + stdDev * deviation);
      lower.push(mean - stdDev * deviation);
    }
    return { middle, upper, lower };
  }

  static macd(prices: number[], fast = 12, slow = 26, signal = 9): {
    macd: number[]; signal: number[]; histogram: number[];
  } {
    const fastEMA = this.ema(prices, fast);
    const slowEMA = this.ema(prices, slow);
    const macd = fastEMA.map((v, i) => v - slowEMA[i]);
    const signalLine = this.ema(macd, signal);
    const histogram = macd.map((v, i) => v - signalLine[i]);
    return { macd, signal: signalLine, histogram };
  }
}

// ─── Strategy Implementations ─────────────────────────────────────────────────
export class StrategyImplementations {
  /**
   * Adapt long period to the available data so short backtests (1W/1M) still produce signals.
   * We never go below 2, which keeps all strategies valid.
   */
  private static adaptPeriod(desired: number, dataLen: number, fraction = 0.4): number {
    const max = Math.max(2, Math.floor(dataLen * fraction));
    return Math.min(desired, max);
  }

  static movingAverageCrossover(
    prices: number[], dates: string[], parameters: StrategyParameters
  ): { signals: ('BUY' | 'SELL' | 'HOLD')[]; indicators: any } {
    const rawShort = parameters['short-ma'] as number || 10;
    const rawLong  = parameters['long-ma']  as number || 50;
    const shortPeriod = this.adaptPeriod(rawShort, prices.length, 0.2);
    const longPeriod  = this.adaptPeriod(rawLong,  prices.length, 0.4);

    const signals: ('BUY' | 'SELL' | 'HOLD')[] = new Array(prices.length).fill('HOLD');
    const shortMA = TechnicalIndicators.sma(prices, shortPeriod);
    const longMA  = TechnicalIndicators.sma(prices, longPeriod);
    let position: 'LONG' | 'NONE' = 'NONE';
    const offset = longPeriod - 1;

    for (let i = 1; i < Math.min(shortMA.length, longMA.length); i++) {
      const idx = offset + i;
      if (idx >= signals.length) break;
      if (shortMA[i - 1] <= longMA[i - 1] && shortMA[i] > longMA[i] && position !== 'LONG') {
        signals[idx] = 'BUY';
        position = 'LONG';
      } else if (shortMA[i - 1] >= longMA[i - 1] && shortMA[i] < longMA[i] && position === 'LONG') {
        signals[idx] = 'SELL';
        position = 'NONE';
      }
    }
    return { signals, indicators: { shortMA, longMA } };
  }

  static rsiStrategy(
    prices: number[], dates: string[], parameters: StrategyParameters
  ): { signals: ('BUY' | 'SELL' | 'HOLD')[]; indicators: any } {
    const rawPeriod = parameters['rsi-period'] as number || 14;
    const period    = this.adaptPeriod(rawPeriod, prices.length, 0.4);
    const oversold  = parameters['oversold-threshold']  as number || 30;
    const overbought= parameters['overbought-threshold'] as number || 70;

    const rsiVals = TechnicalIndicators.rsi(prices, period);
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = new Array(prices.length).fill('HOLD');
    let position: 'LONG' | 'SHORT' | 'NONE' = 'NONE';

    for (let i = 0; i < rsiVals.length; i++) {
      const idx = period + 1 + i;
      if (idx >= signals.length) break;
      if (rsiVals[i] < oversold && position !== 'LONG') {
        signals[idx] = 'BUY'; position = 'LONG';
      } else if (rsiVals[i] > overbought && position !== 'SHORT') {
        signals[idx] = 'SELL'; position = 'SHORT';
      }
    }
    return { signals, indicators: { rsi: rsiVals, oversold, overbought } };
  }

  static bollingerBands(
    prices: number[], dates: string[], parameters: StrategyParameters
  ): { signals: ('BUY' | 'SELL' | 'HOLD')[]; indicators: any } {
    const rawPeriod = parameters['period']    as number || 20;
    const deviation = parameters['deviation'] as number || 2;
    const period    = this.adaptPeriod(rawPeriod, prices.length, 0.4);

    const bb = TechnicalIndicators.bollinger(prices, period, deviation);
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = new Array(prices.length).fill('HOLD');
    let position: 'LONG' | 'SHORT' | 'NONE' = 'NONE';

    for (let i = 0; i < bb.middle.length; i++) {
      const idx   = period - 1 + i;
      if (idx >= signals.length) break;
      const price = prices[idx];
      if (price > bb.upper[i] && position !== 'LONG') {
        signals[idx] = 'BUY'; position = 'LONG';
      } else if (price < bb.lower[i] && position !== 'SHORT') {
        signals[idx] = 'SELL'; position = 'SHORT';
      } else if (position !== 'NONE' && Math.abs(price - bb.middle[i]) < (bb.upper[i] - bb.middle[i]) * 0.1) {
        signals[idx] = position === 'LONG' ? 'SELL' : 'BUY'; position = 'NONE';
      }
    }
    return { signals, indicators: bb };
  }

  static macdStrategy(
    prices: number[], dates: string[], parameters: StrategyParameters
  ): { signals: ('BUY' | 'SELL' | 'HOLD')[]; indicators: any } {
    const rawFast   = parameters['fast-period']   as number || 12;
    const rawSlow   = parameters['slow-period']   as number || 26;
    const rawSignal = parameters['signal-period'] as number || 9;
    const fast   = this.adaptPeriod(rawFast,   prices.length, 0.15);
    const slow   = this.adaptPeriod(rawSlow,   prices.length, 0.3);
    const signal = this.adaptPeriod(rawSignal, prices.length, 0.12);

    const macdData = TechnicalIndicators.macd(prices, fast, slow, signal);
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = new Array(prices.length).fill('HOLD');
    let prevSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    const offset = slow + signal;

    for (let i = 1; i < macdData.signal.length; i++) {
      const idx = offset + i;
      if (idx >= signals.length) break;
      const curM = macdData.macd[i], curS = macdData.signal[i];
      const preM = macdData.macd[i - 1], preS = macdData.signal[i - 1];
      if (preM <= preS && curM > curS && prevSignal !== 'BUY') {
        signals[idx] = 'BUY'; prevSignal = 'BUY';
      } else if (preM >= preS && curM < curS && prevSignal !== 'SELL') {
        signals[idx] = 'SELL'; prevSignal = 'SELL';
      }
    }
    return { signals, indicators: macdData };
  }

  static meanReversion(
    prices: number[], dates: string[], parameters: StrategyParameters
  ): { signals: ('BUY' | 'SELL' | 'HOLD')[]; indicators: any } {
    const rawLookback = parameters['lookback-period'] as number || 50;
    const entryThr    = parameters['entry-threshold'] as number || 2;
    const exitThr     = parameters['exit-threshold']  as number || 0.5;
    const lookback    = this.adaptPeriod(rawLookback, prices.length, 0.4);

    const signals: ('BUY' | 'SELL' | 'HOLD')[] = new Array(prices.length).fill('HOLD');
    let position: 'LONG' | 'SHORT' | 'NONE' = 'NONE';

    for (let i = lookback; i < prices.length; i++) {
      const slice = prices.slice(i - lookback, i);
      const mean  = slice.reduce((a, b) => a + b, 0) / lookback;
      const stdDev = Math.sqrt(slice.reduce((s, p) => s + (p - mean) ** 2, 0) / lookback);
      if (stdDev === 0) continue;
      const zScore = (prices[i] - mean) / stdDev;

      if (zScore < -entryThr && position !== 'LONG') {
        signals[i] = 'BUY'; position = 'LONG';
      } else if (zScore > entryThr && position !== 'SHORT') {
        signals[i] = 'SELL'; position = 'SHORT';
      } else if (position === 'LONG' && zScore > -exitThr) {
        signals[i] = 'SELL'; position = 'NONE';
      } else if (position === 'SHORT' && zScore < exitThr) {
        signals[i] = 'BUY'; position = 'NONE';
      }
    }
    return { signals, indicators: {} };
  }
}

// ─── Main Backtesting Engine ──────────────────────────────────────────────────
export class BacktestingEngine {
  static async getHistoricalData(
    stock: Stock, startDate: string, endDate: string
  ): Promise<{ prices: number[]; dates: string[]; volumes: number[] }> {
    const data = await historicalDataService.getHistoricalData(stock.symbol, startDate, endDate);
    if (data.length === 0) return this.generateFallbackData(stock, startDate, endDate);

    return {
      prices:  data.map(d => d.close || d.price),
      dates:   data.map(d => d.date),
      volumes: data.map(d => d.volume || 1_000_000),
    };
  }

  static generateFallbackData(
    stock: Stock, startDate: string, endDate: string
  ): { prices: number[]; dates: string[]; volumes: number[] } {
    const start = new Date(startDate);
    const end   = new Date(endDate);
    const days  = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);

    const prices: number[] = [];
    const dates:  string[] = [];
    const volumes: number[] = [];
    let current = stock.price;

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue; // skip weekends
      dates.push(d.toISOString().split('T')[0]);
      const dailyReturn = (Math.random() - 0.5) * 0.04;
      current *= 1 + dailyReturn;
      prices.push(Math.max(current, 1));
      volumes.push(Math.floor(Math.random() * 1_000_000) + 500_000);
    }
    return { prices, dates, volumes };
  }

  // ── FIX: return type is now correctly Promise<BacktestResult> ─────────────
  static async runBacktest(
    stock: Stock,
    strategy: Strategy,
    parameters: StrategyParameters,
    config: BacktestConfig
  ): Promise<BacktestResult> {
    const { prices, dates } = await this.getHistoricalData(stock, config.startDate, config.endDate);

    if (prices.length === 0) {
      throw new Error(`No historical data available for ${stock.symbol}`);
    }

    // Choose strategy implementation
    let strategyResult: { signals: ('BUY' | 'SELL' | 'HOLD')[]; indicators: any };
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
    const trades: Trade[] = [];
    const equityCurve: EquityPoint[] = [];

    let cash    = config.initialCapital;
    let shares  = 0;
    let position: 'LONG' | 'NONE' = 'NONE';

    for (let i = 0; i < Math.min(signals.length, prices.length); i++) {
      const signal = signals[i];
      const price  = prices[i];
      const date   = dates[i];
      if (!price || !date) continue;

      if (signal === 'BUY' && cash > price + config.commission && position !== 'LONG') {
        const qty = Math.floor((cash - config.commission) / price);
        if (qty > 0) {
          shares += qty;
          cash   -= qty * price + config.commission;
          position = 'LONG';
          trades.push({ date, type: 'BUY', price, quantity: qty, value: qty * price });
        }
      } else if (signal === 'SELL' && shares > 0 && position === 'LONG') {
        const sellValue = shares * price;
        cash += sellValue - config.commission;
        const lastBuy = [...trades].reverse().find(t => t.type === 'BUY');
        const pnl = lastBuy ? sellValue - shares * lastBuy.price : 0;
        trades.push({ date, type: 'SELL', price, quantity: shares, value: sellValue, pnl });
        shares = 0;
        position = 'NONE';
      }

      equityCurve.push({ date, value: cash + shares * price });
    }

    // ── Close any open position at last known price ────────────────────────
    if (shares > 0 && prices.length > 0) {
      const lastPrice = prices[prices.length - 1];
      const lastDate  = dates[dates.length - 1];
      cash += shares * lastPrice - config.commission;
      const lastBuy = [...trades].reverse().find(t => t.type === 'BUY');
      const pnl = lastBuy ? shares * lastPrice - shares * lastBuy.price : 0;
      trades.push({ date: lastDate, type: 'SELL', price: lastPrice, quantity: shares, value: shares * lastPrice, pnl });
      equityCurve.push({ date: lastDate, value: cash });
      shares = 0;
    }

    const finalValue   = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].value : config.initialCapital;
    const totalReturn  = ((finalValue - config.initialCapital) / config.initialCapital) * 100;
    const annualReturn = totalReturn * (365 / Math.max(config.days, 1));

    // Max drawdown
    let peak = config.initialCapital;
    let maxDrawdown = 0;
    for (const p of equityCurve) {
      if (p.value > peak) peak = p.value;
      const dd = ((peak - p.value) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Sharpe ratio
    const returns = equityCurve
      .map((p, i) => i > 0 ? (p.value - equityCurve[i - 1].value) / equityCurve[i - 1].value : 0)
      .slice(1);
    const avgRet = returns.reduce((a, b) => a + b, 0) / Math.max(returns.length, 1);
    const stdDev = Math.sqrt(
      returns.reduce((s, r) => s + (r - avgRet) ** 2, 0) / Math.max(returns.length, 1)
    );
    const sharpeRatio = stdDev > 0 ? (avgRet / stdDev) * Math.sqrt(252) : 0;

    return {
      strategyId:        strategy.id,
      stockSymbol:       stock.symbol,
      startDate:         config.startDate,
      endDate:           config.endDate,
      initialInvestment: config.initialCapital,
      finalValue,
      totalReturn,
      annualizedReturn:  annualReturn,
      maxDrawdown,
      sharpeRatio,
      trades,
      equityCurve,
    };
  }
}
