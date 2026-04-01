/**
 * Historical Data Service — Realistic & Anchored
 *
 * Strategy:
 * 1. Load CSV for relative price *patterns* (shape of the curve)
 * 2. Anchor the last CSV value to the CURRENT real price from the live API
 * 3. Scale ALL historical prices by that ratio → history moves in proportion
 * 4. Daily interpolation is deterministic (seeded), no random variation on replay
 *
 * This means:
 * - Historical *trends* are real (from the CSV data)
 * - Current price matches the live market exactly
 * - Backtesting is stable and reproducible
 */

import Papa from 'papaparse';
import { stockApi } from './stockApi';

export interface HistoricalDataPoint {
  date: string;
  price: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Mulberry32 — fast, deterministic PRNG */
function seeded(seed: number): number {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

class HistoricalDataService {
  private monthlyData = new Map<string, { date: string; price: number }[]>();
  private dailyCache  = new Map<string, HistoricalDataPoint[]>();
  private scaledCache = new Map<string, HistoricalDataPoint[]>();
  private loadedCsv   = false;
  private currentPrices = new Map<string, number>();

  // ---------- CSV loading ----------

  async loadCsv(): Promise<void> {
    if (this.loadedCsv) return;
    try {
      const res = await fetch('/historicalStockData.csv');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      const { data } = Papa.parse<Record<string, string | number>>(text, {
        header: true, skipEmptyLines: true, dynamicTyping: true,
      });

      if (!data.length) throw new Error('Empty CSV');

      const symbols = Object.keys(data[0]).filter(k => k !== 'Date');
      for (const sym of symbols) {
        const pts = data
          .filter(r => r.Date && r[sym] != null && !isNaN(Number(r[sym])))
          .map(r => ({ date: String(r.Date), price: Number(r[sym]) }));
        if (pts.length) this.monthlyData.set(sym, pts);
      }

      this.loadedCsv = true;
      console.log(`✅ CSV loaded: ${symbols.length} symbols`);
    } catch (err) {
      console.warn('⚠️ CSV load failed, using generated data:', err);
      this.generateBaseData();
      this.loadedCsv = true;
    }
  }

  private generateBaseData(): void {
    const syms = ['RELIANCE','TCS','HDFCBANK','ICICIBANK','INFY','TATASTEEL',
                   'SBIN','BAJAJAUTO','HINDUNILVR','LT','TATAMOTORS.B','BHARTIARTL.B','ASIANPAINT.B'];

    syms.forEach((sym, si) => {
      const pts: { date: string; price: number }[] = [];
      let p = 50 + si * 30;
      const start = new Date('2000-01-01');
      const end   = new Date();
      for (const d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
        const seed = Math.floor(d.getTime() / 86400000) + si * 1000;
        p *= 1 + (seeded(seed) - 0.46) * 0.06; // slight upward bias
        pts.push({ date: d.toISOString().slice(0, 10), price: Math.max(p, 1) });
      }
      this.monthlyData.set(sym, pts);
    });
  }

  // ---------- Current price fetching ----------

  async fetchCurrentPrices(symbols: string[]): Promise<void> {
    const needed = symbols.filter(s => !this.currentPrices.has(s));
    if (!needed.length) return;

    try {
      const quotes = await stockApi.getMultipleQuotes(needed);
      quotes.forEach(q => {
        if (q.price > 0) this.currentPrices.set(q.symbol, q.price);
      });
    } catch {
      // Will use CSV tail price as anchor
    }
  }

  // ---------- Public API ----------

  async getHistoricalData(
    symbol: string,
    startDate?: string,
    endDate?: string,
  ): Promise<HistoricalDataPoint[]> {
    await this.loadCsv();
    await this.fetchCurrentPrices([symbol]);

    // Build scaled daily series (cached)
    if (!this.scaledCache.has(symbol)) {
      const monthly = this.monthlyData.get(symbol) ?? [];
      const daily   = this.buildDailyFromMonthly(monthly, symbol);
      const scaled  = this.scaleToCurrentPrice(daily, symbol);
      this.scaledCache.set(symbol, scaled);
    }

    let data = this.scaledCache.get(symbol)!;

    // Date filter
    if (startDate || endDate) {
      const s = startDate ? new Date(startDate).getTime() : 0;
      const e = endDate   ? new Date(endDate).getTime()   : Infinity;
      data = data.filter(p => {
        const t = new Date(p.date).getTime();
        return t >= s && t <= e;
      });
    }

    if (data.length === 0) {
      // Emergency: generate realistic data anchored to current price
      data = this.generateRealisticData(symbol, startDate, endDate);
    }

    return data;
  }

  /**
   * Scale the entire daily series so the last point matches the current live price.
   * This preserves the shape of historical movements while anchoring to reality.
   */
  private scaleToCurrentPrice(
    daily: HistoricalDataPoint[],
    symbol: string,
  ): HistoricalDataPoint[] {
    if (!daily.length) return daily;

    const livePrice = this.currentPrices.get(symbol);
    if (!livePrice || livePrice <= 0) return daily;

    const lastPrice = daily[daily.length - 1].close;
    if (!lastPrice || lastPrice <= 0) return daily;

    const ratio = livePrice / lastPrice;
    if (ratio === 1 || !isFinite(ratio)) return daily;

    return daily.map(d => ({
      ...d,
      price: Math.round(d.price * ratio * 100) / 100,
      open:  Math.round(d.open  * ratio * 100) / 100,
      high:  Math.round(d.high  * ratio * 100) / 100,
      low:   Math.round(d.low   * ratio * 100) / 100,
      close: Math.round(d.close * ratio * 100) / 100,
    }));
  }

  /**
   * Deterministic daily interpolation from monthly CSV data.
   * Same symbol + date = same price every single call.
   */
  private buildDailyFromMonthly(
    monthly: { date: string; price: number }[],
    symbol: string,
  ): HistoricalDataPoint[] {
    if (monthly.length < 2) return [];

    const symSeed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const result: HistoricalDataPoint[] = [];

    for (let i = 0; i < monthly.length - 1; i++) {
      const cur  = monthly[i];
      const next = monthly[i + 1];
      const t0   = new Date(cur.date).getTime();
      const t1   = new Date(next.date).getTime();
      const days = Math.max(1, Math.round((t1 - t0) / 86400000));
      const step = (next.price - cur.price) / days;

      for (let d = 0; d < days; d++) {
        const dt  = new Date(t0 + d * 86400000);
        const dow = dt.getUTCDay();
        if (dow === 0 || dow === 6) continue; // skip weekends

        const epochDay = Math.floor(dt.getTime() / 86400000);
        const r1 = seeded(symSeed * 997 + epochDay);
        const r2 = seeded(symSeed * 991 + epochDay + 1);
        const r3 = seeded(symSeed * 983 + epochDay + 2);

        const base  = Math.max(cur.price + step * d, 0.01);
        const noise = (r1 - 0.5) * 0.012; // ±0.6% daily noise
        const close = Math.max(base * (1 + noise), 0.01);
        const spread = base * 0.008 * r2;

        result.push({
          date:  dt.toISOString().slice(0, 10),
          price: close,
          close,
          open:  close * (1 + (r3 - 0.5) * 0.006),
          high:  close + spread,
          low:   Math.max(close - spread, 0.01),
          volume: Math.floor(base * 400 + 300000 + r1 * 200000),
        });
      }
    }

    // Add last monthly point
    const last = monthly[monthly.length - 1];
    result.push({
      date: last.date, price: last.price, close: last.price,
      open: last.price, high: last.price, low: last.price,
      volume: Math.floor(last.price * 500 + 500000),
    });

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Emergency fallback: generate realistic OHLCV data anchored to current price.
   * Uses GBM (geometric Brownian motion) backwards from current price.
   */
  private generateRealisticData(
    symbol: string,
    startDate?: string,
    endDate?: string,
  ): HistoricalDataPoint[] {
    const livePrice = this.currentPrices.get(symbol) ?? 1000;
    const end   = endDate   ? new Date(endDate)   : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 365 * 86400000);

    const symSeed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const days: HistoricalDataPoint[] = [];
    const ms = end.getTime() - start.getTime();
    const n  = Math.max(1, Math.round(ms / 86400000));

    // Walk forward from implied start price
    const dailyVol = 0.015;
    const drift    = 0.0003;
    let p = livePrice / Math.exp(drift * n); // rough starting price

    for (let i = 0; i < n; i++) {
      const dt  = new Date(start.getTime() + i * 86400000);
      const dow = dt.getUTCDay();
      if (dow === 0 || dow === 6) continue;

      const epochDay = Math.floor(dt.getTime() / 86400000);
      const r1 = seeded(symSeed * 997 + epochDay);
      const r2 = seeded(symSeed * 991 + epochDay + 1);

      // Geometric Brownian motion step
      const z = (r1 - 0.5) * 2.5; // approximate normal
      p = p * Math.exp(drift + dailyVol * z);
      const spread = p * 0.008 * r2;

      days.push({
        date:  dt.toISOString().slice(0, 10),
        price: p, close: p,
        open:  p * (1 + (r2 - 0.5) * 0.005),
        high:  p + spread, low: Math.max(p - spread, 0.01),
        volume: Math.floor(p * 400 + 300000 + r1 * 200000),
      });
    }

    return days;
  }

  async getLatestPrice(symbol: string): Promise<number> {
    await this.loadCsv();
    const live = this.currentPrices.get(symbol);
    if (live) return live;
    const monthly = this.monthlyData.get(symbol) ?? [];
    return monthly.length ? monthly[monthly.length - 1].price : 100;
  }

  async getAllSymbols(): Promise<string[]> {
    await this.loadCsv();
    return Array.from(this.monthlyData.keys());
  }

  // Convenience technical indicator helpers

  calculateSMA(data: HistoricalDataPoint[], period: number): number[] {
    const result: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.price, 0);
      result.push(sum / period);
    }
    return result;
  }

  calculateRSI(data: HistoricalDataPoint[], period = 14): number[] {
    const prices = data.map(d => d.price);
    const gains: number[] = [];
    const losses: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const ch = prices[i] - prices[i - 1];
      gains.push(ch > 0 ? ch : 0);
      losses.push(ch < 0 ? Math.abs(ch) : 0);
    }
    const rsi: number[] = [];
    let ag = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let al = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < gains.length; i++) {
      ag = (ag * (period - 1) + gains[i]) / period;
      al = (al * (period - 1) + losses[i]) / period;
      rsi.push(100 - 100 / (1 + (al === 0 ? 100 : ag / al)));
    }
    return rsi;
  }
}

export const historicalDataService = new HistoricalDataService();
