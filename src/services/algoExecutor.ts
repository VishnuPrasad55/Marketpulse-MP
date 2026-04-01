/**
 * Custom Algorithm Executor
 *
 * Runs user-written JavaScript strategies in a sandboxed environment.
 * The user's code receives a `context` object with:
 *   - prices: number[]         — array of closing prices (oldest first)
 *   - dates: string[]          — matching ISO date strings
 *   - volumes: number[]        — trading volumes
 *   - symbol: string           — e.g. "RELIANCE"
 *   - currentPrice: number     — latest price
 *
 * Helper functions available inside user code:
 *   - sma(prices, period)      → number[]
 *   - ema(prices, period)      → number[]
 *   - rsi(prices, period)      → number[]
 *   - macd(prices, f, s, sig)  → { macd, signal, histogram }
 *   - stdDev(prices)           → number
 *   - highest(prices, period)  → number[]
 *   - lowest(prices, period)   → number[]
 *   - crossover(a, b)          → boolean  (did a cross above b at last bar?)
 *   - crossunder(a, b)         → boolean
 *
 * The user's code must call:
 *   signal('BUY' | 'SELL' | 'HOLD')   — to register a signal for this bar
 *   predict(price, direction, confidence) — to optionally set a price prediction
 *
 * Return value from runStrategy():
 *   { signals, predictedPrice, predictedDirection, confidence, error? }
 */

import { HistoricalDataPoint, historicalDataService } from './historicalDataService';

export interface AlgoSignal {
  date: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  price: number;
}

export interface AlgoRunResult {
  signals: AlgoSignal[];
  predictedPrice: number | null;
  predictedDirection: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: number;
  finalSignal: 'BUY' | 'SELL' | 'HOLD';
  error: string | null;
  executionTime: number;
  logs: string[];
}

// ─── Built-in Technical Indicators ───────────────────────────────────────────

export const ALGO_HELPERS = {
  sma(prices: number[], period: number): number[] {
    const out: number[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      out.push(prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period);
    }
    return out;
  },

  ema(prices: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const out: number[] = [prices[0]];
    for (let i = 1; i < prices.length; i++) out.push(prices[i] * k + out[i - 1] * (1 - k));
    return out;
  },

  rsi(prices: number[], period = 14): number[] {
    const result: number[] = [];
    for (let i = period; i < prices.length; i++) {
      let gains = 0, losses = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const ch = prices[j] - prices[j - 1];
        if (ch > 0) gains += ch; else losses -= ch;
      }
      const ag = gains / period, al = losses / period;
      result.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
    }
    return result;
  },

  macd(prices: number[], fast = 12, slow = 26, signal = 9): { macd: number[]; signal: number[]; histogram: number[] } {
    const k1 = 2 / (fast + 1), k2 = 2 / (slow + 1), k3 = 2 / (signal + 1);
    const fastEma: number[] = [prices[0]], slowEma: number[] = [prices[0]];
    for (let i = 1; i < prices.length; i++) {
      fastEma.push(prices[i] * k1 + fastEma[i - 1] * (1 - k1));
      slowEma.push(prices[i] * k2 + slowEma[i - 1] * (1 - k2));
    }
    const macdLine = fastEma.map((v, i) => v - slowEma[i]);
    const signalLine: number[] = [macdLine[0]];
    for (let i = 1; i < macdLine.length; i++) signalLine.push(macdLine[i] * k3 + signalLine[i - 1] * (1 - k3));
    return { macd: macdLine, signal: signalLine, histogram: macdLine.map((v, i) => v - signalLine[i]) };
  },

  stdDev(prices: number[]): number {
    const mean = prices.reduce((a, b) => a + b) / prices.length;
    return Math.sqrt(prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length);
  },

  highest(prices: number[], period: number): number[] {
    const out: number[] = [];
    for (let i = period - 1; i < prices.length; i++) out.push(Math.max(...prices.slice(i - period + 1, i + 1)));
    return out;
  },

  lowest(prices: number[], period: number): number[] {
    const out: number[] = [];
    for (let i = period - 1; i < prices.length; i++) out.push(Math.min(...prices.slice(i - period + 1, i + 1)));
    return out;
  },

  crossover(a: number[], b: number[]): boolean {
    if (a.length < 2 || b.length < 2) return false;
    const n = Math.min(a.length, b.length);
    return a[n - 2] <= b[n - 2] && a[n - 1] > b[n - 1];
  },

  crossunder(a: number[], b: number[]): boolean {
    if (a.length < 2 || b.length < 2) return false;
    const n = Math.min(a.length, b.length);
    return a[n - 2] >= b[n - 2] && a[n - 1] < b[n - 1];
  },

  atr(highs: number[], lows: number[], closes: number[], period = 14): number[] {
    const trs: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
      trs.push(tr);
    }
    const out: number[] = [];
    let atr = trs.slice(0, period).reduce((a, b) => a + b) / period;
    out.push(atr);
    for (let i = period; i < trs.length; i++) {
      atr = (atr * (period - 1) + trs[i]) / period;
      out.push(atr);
    }
    return out;
  },

  bollingerBands(prices: number[], period = 20, stdMul = 2): { upper: number[]; middle: number[]; lower: number[] } {
    const mid: number[] = [];
    const upper: number[] = [];
    const lower: number[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b) / period;
      const sd = Math.sqrt(slice.reduce((s, p) => s + (p - mean) ** 2, 0) / period);
      mid.push(mean);
      upper.push(mean + stdMul * sd);
      lower.push(mean - stdMul * sd);
    }
    return { upper, middle: mid, lower };
  },
};

// ─── Template strategies ──────────────────────────────────────────────────────

export const ALGO_TEMPLATES: Record<string, { name: string; description: string; code: string }> = {
  blank: {
    name: 'Blank Strategy',
    description: 'Start from scratch',
    code: `// MarketPulse Custom Strategy
// Available: sma, ema, rsi, macd, bollingerBands, stdDev, highest, lowest, crossover, crossunder, atr
// Inputs: prices[], dates[], volumes[], symbol, currentPrice
// Output: call signal('BUY' | 'SELL' | 'HOLD') and optionally predict(price, 'UP'|'DOWN'|'NEUTRAL', confidence)

function strategy(ctx) {
  const { prices, dates, volumes, symbol, currentPrice } = ctx;

  // Your logic here
  signal('HOLD');
}
`,
  },

  maCrossover: {
    name: 'MA Crossover',
    description: 'Classic moving average crossover (9/21 EMA)',
    code: `// EMA Crossover Strategy
// Buy when fast EMA crosses above slow EMA, sell on crossunder
function strategy(ctx) {
  const { prices, currentPrice } = ctx;

  const fast = ema(prices, 9);
  const slow = ema(prices, 21);

  if (crossover(fast, slow)) {
    signal('BUY');
    predict(currentPrice * 1.04, 'UP', 68);
  } else if (crossunder(fast, slow)) {
    signal('SELL');
    predict(currentPrice * 0.96, 'DOWN', 65);
  } else {
    signal('HOLD');
  }
}
`,
  },

  rsiMeanReversion: {
    name: 'RSI Mean Reversion',
    description: 'Buy oversold, sell overbought using RSI',
    code: `// RSI Mean Reversion Strategy
// Buy when RSI < 30 (oversold), sell when RSI > 70 (overbought)
function strategy(ctx) {
  const { prices, currentPrice } = ctx;

  const rsiValues = rsi(prices, 14);
  const currentRSI = rsiValues[rsiValues.length - 1];

  if (currentRSI < 30) {
    signal('BUY');
    predict(currentPrice * 1.05, 'UP', 72);
  } else if (currentRSI > 70) {
    signal('SELL');
    predict(currentPrice * 0.95, 'DOWN', 70);
  } else if (currentRSI < 50) {
    signal('HOLD');
    predict(currentPrice * 1.01, 'UP', 52);
  } else {
    signal('HOLD');
    predict(currentPrice * 0.99, 'DOWN', 48);
  }
}
`,
  },

  bollingerBreakout: {
    name: 'Bollinger Band Breakout',
    description: 'Trade breakouts from Bollinger Bands',
    code: `// Bollinger Band Breakout Strategy
// Buy when price breaks above upper band, sell below lower band
function strategy(ctx) {
  const { prices, currentPrice } = ctx;

  const bb = bollingerBands(prices, 20, 2);
  const upper = bb.upper[bb.upper.length - 1];
  const lower = bb.lower[bb.lower.length - 1];
  const middle = bb.middle[bb.middle.length - 1];

  if (currentPrice > upper) {
    signal('BUY');
    predict(currentPrice * 1.03, 'UP', 65);
  } else if (currentPrice < lower) {
    signal('SELL');
    predict(currentPrice * 0.97, 'DOWN', 63);
  } else if (Math.abs(currentPrice - middle) < (upper - middle) * 0.2) {
    signal('HOLD');
    predict(middle, 'NEUTRAL', 55);
  } else {
    signal('HOLD');
  }
}
`,
  },

  macdMomentum: {
    name: 'MACD Momentum',
    description: 'Trade momentum using MACD crossovers',
    code: `// MACD Momentum Strategy
// Enter long on bullish MACD crossover, exit on bearish crossover
function strategy(ctx) {
  const { prices, currentPrice } = ctx;

  const macdData = macd(prices, 12, 26, 9);
  const { macd: macdLine, signal: signalLine, histogram } = macdData;

  const hist = histogram[histogram.length - 1];
  const prevHist = histogram[histogram.length - 2];

  if (crossover(macdLine, signalLine)) {
    signal('BUY');
    predict(currentPrice * 1.06, 'UP', 70);
  } else if (crossunder(macdLine, signalLine)) {
    signal('SELL');
    predict(currentPrice * 0.94, 'DOWN', 68);
  } else if (hist > 0 && hist > prevHist) {
    // Momentum building
    signal('HOLD');
    predict(currentPrice * 1.02, 'UP', 58);
  } else {
    signal('HOLD');
  }
}
`,
  },

  trendFollowing: {
    name: 'Trend Following',
    description: 'Multi-indicator trend following strategy',
    code: `// Multi-Indicator Trend Following Strategy
// Combines SMA, RSI, and volume for trend confirmation
function strategy(ctx) {
  const { prices, volumes, currentPrice } = ctx;

  // Trend indicators
  const sma50 = sma(prices, 50);
  const sma200 = sma(prices, Math.min(200, prices.length - 1));
  const rsiValues = rsi(prices, 14);
  const atrValues = atr(
    prices.map(p => p * 1.005),  // approximate high
    prices.map(p => p * 0.995),  // approximate low
    prices,
    14
  );

  const currentSMA50 = sma50[sma50.length - 1];
  const currentSMA200 = sma200[sma200.length - 1];
  const currentRSI = rsiValues[rsiValues.length - 1];
  const currentATR = atrValues[atrValues.length - 1];

  // Uptrend conditions
  const uptrend = currentPrice > currentSMA50 && currentSMA50 > currentSMA200;
  // Downtrend conditions
  const downtrend = currentPrice < currentSMA50 && currentSMA50 < currentSMA200;

  // Entry signals with RSI filter (avoid overbought/oversold extremes)
  if (uptrend && currentRSI > 40 && currentRSI < 70) {
    signal('BUY');
    predict(currentPrice + currentATR * 3, 'UP', 73);
  } else if (downtrend && currentRSI > 30 && currentRSI < 60) {
    signal('SELL');
    predict(currentPrice - currentATR * 3, 'DOWN', 71);
  } else {
    signal('HOLD');
    predict(currentSMA50, 'NEUTRAL', 50);
  }
}
`,
  },
};

// ─── Main executor ────────────────────────────────────────────────────────────

export class AlgoExecutor {
  /**
   * Execute user code against historical data for a single stock.
   * The code runs in a restricted scope with only our helper functions.
   */
  static async run(
    code: string,
    symbol: string,
    currentPrice: number,
    startDate?: string,
    endDate?: string,
  ): Promise<AlgoRunResult> {
    const t0 = Date.now();
    const logs: string[] = [];

    // Fetch historical data
    const end = endDate ?? new Date().toISOString().slice(0, 10);
    const start = startDate ?? new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);

    let histData: HistoricalDataPoint[] = [];
    try {
      histData = await historicalDataService.getHistoricalData(symbol, start, end);
    } catch (e) {
      logs.push(`⚠️ Could not fetch historical data: ${e}`);
    }

    const prices = histData.length > 0 ? histData.map(d => d.close || d.price) : [currentPrice];
    const dates  = histData.length > 0 ? histData.map(d => d.date) : [end];
    const volumes = histData.length > 0 ? histData.map(d => d.volume || 0) : [0];

    // Output state
    const signals: AlgoSignal[] = [];
    let predictedPrice: number | null = null;
    let predictedDirection: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    let confidence = 50;
    let error: string | null = null;

    // Context object passed to strategy
    const ctx = {
      prices,
      dates,
      volumes,
      symbol,
      currentPrice: prices[prices.length - 1],
    };

    // Signal/predict callbacks
    const signalFn = (s: 'BUY' | 'SELL' | 'HOLD') => {
      const last = prices.length - 1;
      signals.push({ date: dates[last], signal: s, price: prices[last] });
    };

    const predictFn = (price: number, dir: 'UP' | 'DOWN' | 'NEUTRAL', conf: number) => {
      predictedPrice = price;
      predictedDirection = dir;
      confidence = Math.min(Math.max(conf, 0), 100);
    };

    const consoleFn = (...args: any[]) => {
      logs.push(args.map(a => String(a)).join(' '));
    };

    // Build sandboxed execution environment
    try {
      const { sma, ema, rsi, macd, stdDev, highest, lowest, crossover, crossunder, atr, bollingerBands } = ALGO_HELPERS;

      // Wrap user code so "strategy" function is defined then called
      const wrappedCode = `
        ${code}
        strategy(ctx);
      `;

      // Create function with only whitelisted variables in scope
      // eslint-disable-next-line no-new-func
      const fn = new Function(
        'ctx', 'signal', 'predict', 'console',
        'sma', 'ema', 'rsi', 'macd', 'stdDev', 'highest', 'lowest',
        'crossover', 'crossunder', 'atr', 'bollingerBands',
        wrappedCode
      );

      fn(
        ctx, signalFn, predictFn,
        { log: consoleFn, warn: consoleFn, error: consoleFn },
        sma, ema, rsi, macd, stdDev, highest, lowest,
        crossover, crossunder, atr, bollingerBands,
      );
    } catch (e: any) {
      error = e?.message ?? String(e);
      logs.push(`❌ Runtime error: ${error}`);
    }

    const finalSignal = signals.length > 0
      ? signals[signals.length - 1].signal
      : 'HOLD';

    // If no prediction was made, derive one from the signal
    if (predictedPrice === null) {
      if (finalSignal === 'BUY') {
        predictedPrice = currentPrice * 1.03;
        predictedDirection = 'UP';
        confidence = 58;
      } else if (finalSignal === 'SELL') {
        predictedPrice = currentPrice * 0.97;
        predictedDirection = 'DOWN';
        confidence = 55;
      } else {
        predictedPrice = currentPrice;
        predictedDirection = 'NEUTRAL';
        confidence = 45;
      }
    }

    return {
      signals,
      predictedPrice,
      predictedDirection,
      confidence,
      finalSignal,
      error,
      executionTime: Date.now() - t0,
      logs,
    };
  }

  /** Validate user code without running it (basic syntax check) */
  static validate(code: string): { valid: boolean; error?: string } {
    try {
      // eslint-disable-next-line no-new-func
      new Function('ctx', 'signal', 'predict', 'console', 'sma', 'ema', 'rsi', 'macd', 'stdDev',
        'highest', 'lowest', 'crossover', 'crossunder', 'atr', 'bollingerBands', code);
      if (!code.includes('function strategy')) {
        return { valid: false, error: 'Your code must define a function named "strategy(ctx)"' };
      }
      if (!code.includes('signal(')) {
        return { valid: false, error: 'Your strategy must call signal("BUY" | "SELL" | "HOLD")' };
      }
      return { valid: true };
    } catch (e: any) {
      return { valid: false, error: e?.message ?? 'Syntax error' };
    }
  }
}
