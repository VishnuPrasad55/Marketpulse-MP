/**
 * AI Prediction Engine — Fixed & Improved
 *
 * Fixes:
 * 1. Proper Wilder's RSI (matches standard charting tools ±1-2 points)
 * 2. MACD uses full price history, not just last 35 bars
 * 3. Confidence formula never goes below 35 or above 88
 * 4. Linear regression normalisation is correct
 * 5. Signal agreement scoring is more granular
 * 6. Backtests with 0 trades no longer crash
 */

import { Stock, Prediction } from '../types';
import { historicalDataService } from './historicalDataService';

export interface PredictionConfig {
  days: number;
  confidence: number;
  useML: boolean;
}

export interface DetailedPrediction extends Prediction {
  signals: {
    trend: { direction: 'UP' | 'DOWN' | 'NEUTRAL'; strength: number; description: string };
    rsi:   { direction: 'UP' | 'DOWN' | 'NEUTRAL'; strength: number; description: string; value: number };
    macd:  { direction: 'UP' | 'DOWN' | 'NEUTRAL'; strength: number; description: string };
  };
  priceRange: { low: number; high: number };
  methodology: string;
  backtestInfluence: string;
}

// ─── Technical Helpers ────────────────────────────────────────────────────────

function ema(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    out.push(prices[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

/** Wilder's RSI — matches TradingView, Zerodha Kite, etc. */
function wilderRsi(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;

  // Initial average gain/loss over first `period` changes
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = prices[i] - prices[i - 1];
    if (ch > 0) avgGain += ch; else avgLoss -= ch;
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder's smoothing for remaining bars
  for (let i = period + 1; i < prices.length; i++) {
    const ch = prices[i] - prices[i - 1];
    const gain = ch > 0 ? ch : 0;
    const loss = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function linearRegression(prices: number[]): { slope: number; r2: number; intercept: number } {
  const n = prices.length;
  if (n < 2) return { slope: 0, r2: 0, intercept: prices[0] ?? 0 };

  const xMean = (n - 1) / 2;
  const yMean = prices.reduce((a, b) => a + b) / n;
  let ssXY = 0, ssXX = 0, ssTot = 0;

  for (let i = 0; i < n; i++) {
    const dx = i - xMean;
    const dy = prices[i] - yMean;
    ssXY += dx * dy;
    ssXX += dx * dx;
    ssTot += dy * dy;
  }

  if (ssXX === 0) return { slope: 0, r2: 0, intercept: yMean };

  const slope = ssXY / ssXX;
  const intercept = yMean - slope * xMean;
  const ssRes = prices.reduce((sum, p, i) => {
    const fitted = intercept + slope * i;
    return sum + (p - fitted) ** 2;
  }, 0);
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { slope, r2, intercept };
}

function rollingStdDev(prices: number[], window = 20): number {
  const slice = prices.slice(-window);
  if (slice.length < 2) return prices[prices.length - 1] * 0.02;
  const mean = slice.reduce((a, b) => a + b) / slice.length;
  const variance = slice.reduce((s, p) => s + (p - mean) ** 2, 0) / slice.length;
  return Math.sqrt(variance);
}

// ─── Main Engine ─────────────────────────────────────────────────────────────
export class PredictionEngine {
  static async generatePrediction(
    stock: Stock,
    config: PredictionConfig,
    backtestResult?: { totalReturn: number; sharpeRatio: number; trades?: any[] } | null,
  ): Promise<DetailedPrediction> {

    const endDate   = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);

    const rawData = await historicalDataService.getHistoricalData(stock.symbol, startDate, endDate);

    if (rawData.length < 30) {
      return this.fallback(stock, config, backtestResult);
    }

    const prices  = rawData.map(d => d.close || d.price);
    const current = prices[prices.length - 1];
    if (!current || current <= 0) return this.fallback(stock, config, backtestResult);

    // ── 1. TREND (linear regression on last 60 bars) ──────────────────────────
    const trend60 = prices.slice(-60);
    const { slope, r2 } = linearRegression(trend60);

    // Normalised: how much does price move per day as fraction of current price?
    const dailyTrendPct = slope / current;
    // Strength: how steep is the trend, capped at 1.0
    const trendStrength = Math.min(Math.abs(dailyTrendPct) * 200, 1.0);
    const trendDir: 'UP' | 'DOWN' | 'NEUTRAL' =
      dailyTrendPct > 0.0003 ? 'UP' :
      dailyTrendPct < -0.0003 ? 'DOWN' : 'NEUTRAL';

    const trendDesc = (() => {
      const annualised = (dailyTrendPct * 252 * 100).toFixed(1);
      const r2Str = (r2 * 100).toFixed(0);
      if (trendDir === 'UP')   return `Uptrend: +${annualised}%/yr implied, R²=${r2Str}%`;
      if (trendDir === 'DOWN') return `Downtrend: ${annualised}%/yr implied, R²=${r2Str}%`;
      return `Sideways: near-flat regression, R²=${r2Str}%`;
    })();

    // ── 2. RSI (Wilder's method, 14-period) ───────────────────────────────────
    const rsiVal = wilderRsi(prices, 14);
    let rsiDir: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    let rsiStrength = 0;

    if (rsiVal < 30) {
      rsiDir = 'UP';
      rsiStrength = Math.min((30 - rsiVal) / 30, 1);
    } else if (rsiVal < 40) {
      rsiDir = 'UP';
      rsiStrength = (40 - rsiVal) / 40 * 0.5;
    } else if (rsiVal > 70) {
      rsiDir = 'DOWN';
      rsiStrength = Math.min((rsiVal - 70) / 30, 1);
    } else if (rsiVal > 60) {
      rsiDir = 'DOWN';
      rsiStrength = (rsiVal - 60) / 40 * 0.5;
    } else {
      // 40-60: neutral zone, slight bias
      rsiDir = rsiVal > 50 ? 'UP' : rsiVal < 50 ? 'DOWN' : 'NEUTRAL';
      rsiStrength = Math.abs(rsiVal - 50) / 50 * 0.3;
    }

    const rsiDesc = (() => {
      if (rsiVal < 30)  return `RSI ${rsiVal.toFixed(1)} — deeply oversold, strong mean-reversion signal`;
      if (rsiVal < 40)  return `RSI ${rsiVal.toFixed(1)} — approaching oversold, mild bullish signal`;
      if (rsiVal > 70)  return `RSI ${rsiVal.toFixed(1)} — deeply overbought, pullback likely`;
      if (rsiVal > 60)  return `RSI ${rsiVal.toFixed(1)} — approaching overbought, mild bearish signal`;
      return `RSI ${rsiVal.toFixed(1)} — neutral zone (40-60), no strong momentum signal`;
    })();

    // ── 3. MACD (12-26-9 on full history) ────────────────────────────────────
    const fast12 = ema(prices, 12);
    const slow26 = ema(prices, 26);

    // Both arrays have same length as prices (EMA starts from index 0)
    const macdLine = fast12.map((v, i) => v - slow26[i]);

    // Signal line: EMA(9) of MACD
    const signalLine = ema(macdLine, 9);

    const n = prices.length;
    const macdNow  = macdLine[n - 1];
    const macdPrev = macdLine[n - 2];
    const sigNow   = signalLine[n - 1];
    const sigPrev  = signalLine[n - 2];

    // Histogram trend (are we accelerating or decelerating?)
    const histNow  = macdNow - sigNow;
    const histPrev = macdPrev - sigPrev;

    let macdDir: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    let macdStrength = 0;

    const freshCrossoverUp   = macdPrev <= sigPrev && macdNow > sigNow;
    const freshCrossoverDown = macdPrev >= sigPrev && macdNow < sigNow;

    if (freshCrossoverUp) {
      macdDir = 'UP'; macdStrength = 0.85;
    } else if (freshCrossoverDown) {
      macdDir = 'DOWN'; macdStrength = 0.85;
    } else if (macdNow > sigNow) {
      // Above signal — how strongly?
      const separation = Math.abs(histNow) / (Math.abs(macdNow) + 0.001);
      macdDir = 'UP';
      macdStrength = Math.min(separation * 5 + (histNow > histPrev ? 0.1 : -0.1), 0.7);
    } else if (macdNow < sigNow) {
      const separation = Math.abs(histNow) / (Math.abs(macdNow) + 0.001);
      macdDir = 'DOWN';
      macdStrength = Math.min(separation * 5 + (histNow < histPrev ? 0.1 : -0.1), 0.7);
    }
    macdStrength = Math.max(0, Math.min(macdStrength, 1));

    const macdDesc = (() => {
      if (freshCrossoverUp)   return 'Fresh bullish crossover — MACD crossed above signal line';
      if (freshCrossoverDown) return 'Fresh bearish crossover — MACD crossed below signal line';
      if (macdDir === 'UP')   return `MACD above signal (${histNow > histPrev ? 'momentum building' : 'momentum fading'})`;
      if (macdDir === 'DOWN') return `MACD below signal (${histNow < histPrev ? 'momentum building' : 'momentum fading'})`;
      return 'MACD at crossover point — indeterminate';
    })();

    // ── 4. VOLATILITY ─────────────────────────────────────────────────────────
    const vol20 = rollingStdDev(prices, 20);
    const dailyVolPct = vol20 / current; // daily vol as % of price

    // ── 5. COMBINED SCORE (weights: trend 30%, RSI 35%, MACD 35%) ─────────────
    const dirToNum = (d: 'UP' | 'DOWN' | 'NEUTRAL', s: number) =>
      d === 'UP' ? s : d === 'DOWN' ? -s : 0;

    const score =
      0.30 * dirToNum(trendDir, trendStrength) +
      0.35 * dirToNum(rsiDir,   rsiStrength)   +
      0.35 * dirToNum(macdDir,  macdStrength);

    // ── 6. DIRECTION ──────────────────────────────────────────────────────────
    const finalDir: 'UP' | 'DOWN' | 'NEUTRAL' =
      score >  0.08 ? 'UP'   :
      score < -0.08 ? 'DOWN' : 'NEUTRAL';

    // ── 7. PREDICTED PRICE ────────────────────────────────────────────────────
    // Expected return = score * base_sensitivity + trend contribution
    const sensitivity = 0.004; // each unit of score → 0.4% daily expected return
    const dailyExpected = score * sensitivity + dailyTrendPct * 0.4;
    const totalExpected = dailyExpected * config.days;
    const predictedPrice = Math.max(
      current * (1 + totalExpected),
      current * 0.5
    );

    // ── 8. BACKTEST INFLUENCE ─────────────────────────────────────────────────
    let backtestBoost = 0;
    let backtestInfluence = 'No backtest data — prediction based on technicals only.';

    if (backtestResult && typeof backtestResult.totalReturn === 'number') {
      const ret = backtestResult.totalReturn;
      const sr  = backtestResult.sharpeRatio ?? 0;

      if (ret > 20 && sr > 1) {
        backtestBoost = 0.15;
        backtestInfluence = `Strong backtest: +${ret.toFixed(1)}% return, Sharpe ${sr.toFixed(2)} → +15% confidence.`;
      } else if (ret > 10) {
        backtestBoost = 0.08;
        backtestInfluence = `Good backtest: +${ret.toFixed(1)}% return → +8% confidence.`;
      } else if (ret > 0) {
        backtestBoost = 0.03;
        backtestInfluence = `Positive backtest: +${ret.toFixed(1)}% return → +3% confidence.`;
      } else if (ret < -15) {
        backtestBoost = -0.10;
        backtestInfluence = `Poor backtest: ${ret.toFixed(1)}% return → -10% confidence penalty.`;
      } else if (ret < 0) {
        backtestBoost = -0.04;
        backtestInfluence = `Negative backtest: ${ret.toFixed(1)}% return → -4% confidence penalty.`;
      } else {
        backtestInfluence = `Breakeven backtest (${ret.toFixed(1)}%) — neutral influence.`;
      }
    }

    // ── 9. CONFIDENCE ─────────────────────────────────────────────────────────
    // Base: 50. Add for signal agreement, subtract for volatility, add for R²
    const agreingSignals = [trendDir, rsiDir, macdDir].filter(d => d === finalDir && d !== 'NEUTRAL').length;
    const opposingSignals = [trendDir, rsiDir, macdDir].filter(d =>
      d !== finalDir && d !== 'NEUTRAL'
    ).length;

    let confidence = 50;
    confidence += agreingSignals * 10;             // +10 per agreeing signal (max +30)
    confidence -= opposingSignals * 8;             // -8 per opposing signal
    confidence += Math.abs(score) * 20;            // stronger signal → higher conf
    confidence -= dailyVolPct * 300;               // high volatility → lower conf
    confidence += r2 * 10;                         // good trend fit → higher conf
    confidence += backtestBoost * 100;             // backtest bonus/penalty

    // Hard clamp 35-88
    confidence = Math.max(35, Math.min(88, Math.round(confidence)));

    // ── 10. PRICE RANGE (volatility-based) ───────────────────────────────────
    const projectedVol = dailyVolPct * Math.sqrt(config.days);
    const bandMult = 1.5 + (1 - confidence / 100); // wider bands for lower confidence

    const priceLow  = Math.round(predictedPrice * (1 - projectedVol * bandMult) * 100) / 100;
    const priceHigh = Math.round(predictedPrice * (1 + projectedVol * bandMult) * 100) / 100;

    return {
      stockSymbol:        stock.symbol,
      date:               new Date().toISOString().slice(0, 10),
      predictedPrice:     Math.round(predictedPrice * 100) / 100,
      predictedDirection: finalDir,
      confidence,
      signals: {
        trend: { direction: trendDir, strength: trendStrength, description: trendDesc },
        rsi:   { direction: rsiDir,   strength: rsiStrength,   description: rsiDesc,  value: Math.round(rsiVal * 10) / 10 },
        macd:  { direction: macdDir,  strength: macdStrength,  description: macdDesc },
      },
      priceRange: {
        low:  Math.max(priceLow,  current * 0.5),
        high: Math.min(priceHigh, current * 2.0),
      },
      methodology: [
        `6-month history (${rawData.length} trading days).`,
        `Trend (30%): linear regression R²=${(r2 * 100).toFixed(0)}%.`,
        `RSI (35%): Wilder's 14-period = ${rsiVal.toFixed(1)}.`,
        `MACD (35%): 12-26-9 EMA. Daily vol: ${(dailyVolPct * 100).toFixed(2)}%.`,
        `${config.days}-day projection band: ±${(projectedVol * 100 * bandMult).toFixed(1)}%.`,
      ].join(' '),
      backtestInfluence,
    };
  }

  static fallback(
    stock: Stock,
    config: PredictionConfig,
    backtestResult?: { totalReturn: number; sharpeRatio: number } | null,
  ): DetailedPrediction {
    return {
      stockSymbol:        stock.symbol,
      date:               new Date().toISOString().slice(0, 10),
      predictedPrice:     stock.price,
      predictedDirection: 'NEUTRAL',
      confidence:         42,
      signals: {
        trend: { direction: 'NEUTRAL', strength: 0, description: 'Insufficient data (< 30 days)' },
        rsi:   { direction: 'NEUTRAL', strength: 0, description: 'Insufficient data for RSI', value: 50 },
        macd:  { direction: 'NEUTRAL', strength: 0, description: 'Insufficient data for MACD' },
      },
      priceRange: { low: stock.price * 0.95, high: stock.price * 1.05 },
      methodology: 'Insufficient historical data — returning neutral prediction with 5% bands.',
      backtestInfluence: backtestResult ? `Backtest: ${backtestResult.totalReturn.toFixed(1)}%` : 'No backtest data.',
    };
  }
}
