/**
 * AI Prediction Engine — Transparent & Explainable
 *
 * METHOD (in plain English):
 * ─────────────────────────────────────────────────
 * 1. TREND (Linear Regression on last 60 days)
 *    → Fits a straight line to recent closing prices.
 *    → If slope > 0 → uptrend. Slope magnitude = momentum.
 *
 * 2. MOMENTUM (RSI — Relative Strength Index, 14-day)
 *    → RSI < 35 → oversold → likely bounce UP
 *    → RSI > 65 → overbought → likely pullback DOWN
 *    → RSI 45-55 → neutral
 *
 * 3. MACD (12-26-9 EMA crossover)
 *    → MACD line > Signal line → bullish momentum
 *    → MACD line < Signal line → bearish momentum
 *    → Histogram widening = strengthening signal
 *
 * 4. VOLATILITY (20-day rolling std dev)
 *    → Used to set prediction bands (±1σ, ±2σ)
 *    → High volatility → wider bands, lower confidence
 *
 * 5. BACKTEST FACTOR (optional)
 *    → If a strategy returned > 10% in backtest → +10% confidence boost
 *    → Rationalise: a strategy that worked historically is a signal
 *
 * OUTPUT:
 *    - predictedPrice = currentPrice * (1 + weightedExpectedReturn)
 *    - weightedExpectedReturn comes from trend + momentum + MACD, each weighted
 *    - confidence = 50 + (|signal strength| * 40) capped at 88%
 *    - direction = sign of combined signal
 *
 * IMPORTANT: This is a technical analysis model, NOT a financial advisor.
 * Past performance does not guarantee future results.
 */

import { Stock, Prediction } from '../types';
import { historicalDataService, HistoricalDataPoint } from './historicalDataService';

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

// ─── Technical indicator helpers ─────────────────────────────────────────────

function sma(prices: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = period - 1; i < prices.length; i++) {
    out.push(prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period);
  }
  return out;
}

function ema(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    out.push(prices[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

function rsi(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const ch = prices[i] - prices[i - 1];
    if (ch > 0) gains += ch; else losses -= ch;
  }
  const ag = gains / period, al = losses / period;
  if (al === 0) return 100;
  return 100 - 100 / (1 + ag / al);
}

function linearRegression(prices: number[]): { slope: number; r2: number } {
  const n = prices.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = prices.reduce((a, b) => a + b) / n;
  let ssXY = 0, ssXX = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (xs[i] - xMean) * (prices[i] - yMean);
    ssXX += (xs[i] - xMean) ** 2;
    ssTot += (prices[i] - yMean) ** 2;
  }
  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const ssRes = prices.reduce((sum, p, i) => sum + (p - (yMean + slope * (i - xMean))) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, r2 };
}

function stdDev(prices: number[]): number {
  const mean = prices.reduce((a, b) => a + b) / prices.length;
  return Math.sqrt(prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length);
}

// ─── Main engine ─────────────────────────────────────────────────────────────

export class PredictionEngine {
  static async generatePrediction(
    stock: Stock,
    config: PredictionConfig,
    backtestResult?: { totalReturn: number; sharpeRatio: number; trades?: any[] } | null,
  ): Promise<DetailedPrediction> {

    const endDate   = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10); // 6 months

    const rawData = await historicalDataService.getHistoricalData(stock.symbol, startDate, endDate);

    if (rawData.length < 30) {
      return this.fallback(stock, config, backtestResult);
    }

    const prices  = rawData.map(d => d.close || d.price);
    const current = prices[prices.length - 1];

    // ── 1. TREND ──────────────────────────────────────────────────────────────
    const recent60  = prices.slice(-60);
    const { slope, r2 } = linearRegression(recent60);
    const dailyTrendReturn = slope / current; // daily return implied by regression
    const trendStrength    = Math.min(Math.abs(dailyTrendReturn) * 100, 1); // 0-1
    const trendDir         = slope > 0.001 * current ? 'UP' : slope < -0.001 * current ? 'DOWN' : 'NEUTRAL';

    // ── 2. RSI ────────────────────────────────────────────────────────────────
    const rsiVal     = rsi(prices, 14);
    let rsiDir: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    let rsiStrength  = 0;
    if (rsiVal < 35)      { rsiDir = 'UP';   rsiStrength = (35 - rsiVal) / 35; }
    else if (rsiVal > 65) { rsiDir = 'DOWN'; rsiStrength = (rsiVal - 65) / 35; }
    else if (rsiVal > 55) { rsiDir = 'UP';   rsiStrength = (rsiVal - 50) / 30; }
    else if (rsiVal < 45) { rsiDir = 'DOWN'; rsiStrength = (50 - rsiVal) / 30; }
    rsiStrength = Math.min(rsiStrength, 1);

    // ── 3. MACD ───────────────────────────────────────────────────────────────
    const fast12 = ema(prices, 12);
    const slow26 = ema(prices, 26);
    const macdLine = fast12.map((v, i) => v - slow26[i]).slice(slow26.length - fast12.length);
    const macdSlice = macdLine.slice(-35);
    const signalLine = ema(macdSlice, 9);

    const macdNow   = macdSlice[macdSlice.length - 1];
    const sigNow    = signalLine[signalLine.length - 1];
    const macdPrev  = macdSlice[macdSlice.length - 2];
    const sigPrev   = signalLine[signalLine.length - 2];

    let macdDir: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    let macdStrength = 0;
    if (macdNow > sigNow) {
      macdDir = 'UP';
      // Crossover recently? Stronger signal
      macdStrength = macdPrev <= sigPrev ? 0.8 : 0.4;
    } else if (macdNow < sigNow) {
      macdDir = 'DOWN';
      macdStrength = macdPrev >= sigPrev ? 0.8 : 0.4;
    }

    // ── 4. VOLATILITY (for price bands) ──────────────────────────────────────
    const vol20 = stdDev(prices.slice(-20)) / current;

    // ── 5. COMBINED SIGNAL ────────────────────────────────────────────────────
    // Weights: Trend 30%, RSI 35%, MACD 35%
    const w = { trend: 0.30, rsi: 0.35, macd: 0.35 };

    const score =
      w.trend * (trendDir === 'UP' ? trendStrength : trendDir === 'DOWN' ? -trendStrength : 0) +
      w.rsi   * (rsiDir   === 'UP' ? rsiStrength   : rsiDir   === 'DOWN' ? -rsiStrength   : 0) +
      w.macd  * (macdDir  === 'UP' ? macdStrength  : macdDir  === 'DOWN' ? -macdStrength  : 0);

    // Backtest booster
    let backtestBoost = 0;
    let backtestInfluence = 'No backtest data available — prediction based on technicals only.';
    if (backtestResult) {
      const ret = backtestResult.totalReturn ?? 0;
      if (ret > 15) {
        backtestBoost = 0.12;
        backtestInfluence = `Backtest returned +${ret.toFixed(1)}% → +12% confidence boost applied.`;
      } else if (ret > 5) {
        backtestBoost = 0.06;
        backtestInfluence = `Backtest returned +${ret.toFixed(1)}% → +6% confidence boost applied.`;
      } else if (ret < -10) {
        backtestBoost = -0.08;
        backtestInfluence = `Backtest returned ${ret.toFixed(1)}% → -8% confidence penalty applied.`;
      } else {
        backtestInfluence = `Backtest returned ${ret.toFixed(1)}% — neutral influence on prediction.`;
      }
    }

    // ── 6. DIRECTION & PREDICTED PRICE ───────────────────────────────────────
    const finalDir: 'UP' | 'DOWN' | 'NEUTRAL' =
      score > 0.05 ? 'UP' : score < -0.05 ? 'DOWN' : 'NEUTRAL';

    // Expected daily return from combined signal
    const dailyExpectedReturn = score * 0.003 + dailyTrendReturn * 0.5;
    const totalExpectedReturn = dailyExpectedReturn * config.days;
    const predictedPrice = Math.max(
      current * (1 + totalExpectedReturn + backtestBoost * Math.sign(score) * 0.01),
      current * 0.5,
    );

    // ── 7. CONFIDENCE ─────────────────────────────────────────────────────────
    const signalAgreement =
      [trendDir, rsiDir, macdDir].filter(d => d === finalDir).length; // 0-3
    const volPenalty = Math.min(vol20 * 5, 0.15); // high vol → lower confidence
    let confidence = 40 + signalAgreement * 12 + Math.abs(score) * 25 - volPenalty * 100;
    if (backtestBoost > 0) confidence += 5;
    if (backtestBoost < 0) confidence -= 5;
    confidence = Math.min(Math.max(Math.round(confidence), 38), 88);

    // ── 8. PRICE BANDS ───────────────────────────────────────────────────────
    const projectedVol = vol20 * Math.sqrt(config.days);
    const priceLow  = Math.round(predictedPrice * (1 - projectedVol * 1.5) * 100) / 100;
    const priceHigh = Math.round(predictedPrice * (1 + projectedVol * 1.5) * 100) / 100;

    return {
      stockSymbol:      stock.symbol,
      date:             new Date().toISOString().slice(0, 10),
      predictedPrice:   Math.round(predictedPrice * 100) / 100,
      predictedDirection: finalDir,
      confidence,
      signals: {
        trend: {
          direction:   trendDir,
          strength:    trendStrength,
          description: `60-day linear regression: slope ${slope > 0 ? '+' : ''}${(slope).toFixed(2)}/day, R²=${r2.toFixed(2)}`,
        },
        rsi: {
          direction:   rsiDir,
          strength:    rsiStrength,
          value:       Math.round(rsiVal * 10) / 10,
          description: rsiVal < 35
            ? `RSI ${rsiVal.toFixed(1)} — oversold territory, mean-reversion likely`
            : rsiVal > 65
            ? `RSI ${rsiVal.toFixed(1)} — overbought, potential pullback`
            : `RSI ${rsiVal.toFixed(1)} — neutral zone`,
        },
        macd: {
          direction:   macdDir,
          strength:    macdStrength,
          description: `MACD ${macdNow > sigNow ? 'above' : 'below'} signal line ${macdPrev <= sigPrev && macdNow > sigNow ? '(fresh bullish crossover)' : macdPrev >= sigPrev && macdNow < sigNow ? '(fresh bearish crossover)' : ''}`,
        },
      },
      priceRange: { low: priceLow, high: priceHigh },
      methodology: `Technical analysis over 6 months of price history (${rawData.length} trading days). Trend (30%) + RSI (35%) + MACD (35%). 20-day volatility: ${(vol20 * 100).toFixed(2)}%/day → projected ${config.days}-day band ±${(projectedVol * 100).toFixed(1)}%.`,
      backtestInfluence,
    };
  }

  static fallback(
    stock: Stock,
    config: PredictionConfig,
    backtestResult?: { totalReturn: number; sharpeRatio: number } | null,
  ): DetailedPrediction {
    const dir: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    return {
      stockSymbol: stock.symbol,
      date: new Date().toISOString().slice(0, 10),
      predictedPrice: stock.price,
      predictedDirection: dir,
      confidence: 45,
      signals: {
        trend: { direction: 'NEUTRAL', strength: 0, description: 'Insufficient data for trend analysis' },
        rsi:   { direction: 'NEUTRAL', strength: 0, description: 'Insufficient data for RSI', value: 50 },
        macd:  { direction: 'NEUTRAL', strength: 0, description: 'Insufficient data for MACD' },
      },
      priceRange: { low: stock.price * 0.95, high: stock.price * 1.05 },
      methodology: 'Insufficient historical data — returning neutral prediction.',
      backtestInfluence: 'No backtest data.',
    };
  }
}
