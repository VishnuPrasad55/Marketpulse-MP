import { Stock } from '../types';
import { stockApi } from '../services/stockApi';
import { STOCK_UNIVERSE, StockMeta } from './stockUniverse';

/**
 * Generate deterministic seeded fallback data for a stock.
 * Uses the symbol characters as a seed so prices are stable across reloads
 * but vary realistically between stocks.
 */
export const buildSeededStock = (meta: StockMeta): Stock => {
  const seed = meta.symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const noise = ((seed % 40) - 20) / 1000;
  const price = Math.round(meta.basePrice * (1 + noise) * 100) / 100;
  const changePercent = ((seed % 30) - 15) / 10;
  const change = Math.round(price * changePercent / 100 * 100) / 100;
  return {
    symbol: meta.symbol,
    name: meta.name,
    price,
    change,
    changePercent,
    volume: Math.floor(500_000 + (seed % 2_000_000)),
    market: meta.market,
    sector: meta.sector,
  };
};

/**
 * Returns all stocks from STOCK_UNIVERSE with either live Yahoo Finance prices
 * (when proxies succeed) or deterministic seeded fallback prices.
 * This function NEVER returns an empty array — worst case every stock gets
 * seeded data with isLive: false.
 */
export const getStocksWithRealTimeData = async (): Promise<Stock[]> => {
  console.log(`🚀 Loading ${STOCK_UNIVERSE.length} stocks with real-time data...`);

  try {
    const symbols = STOCK_UNIVERSE.map(s => s.symbol);

    // Fetch in batches — stockApi handles rate limiting and per-symbol fallback internally
    const realTimeQuotes = await stockApi.getMultipleQuotes(symbols);
    const quoteMap = new Map(realTimeQuotes.map(q => [q.symbol, q]));

    const stocks = STOCK_UNIVERSE.map(meta => {
      const quote = quoteMap.get(meta.symbol);
      if (quote && quote.price > 0) {
        return {
          symbol: meta.symbol,
          name: meta.name,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          volume: quote.volume,
          market: meta.market,
          sector: meta.sector,
        } as Stock;
      }
      // Individual quote failed — use seeded fallback for this stock
      return buildSeededStock(meta);
    });

    const liveCount = stocks.filter((_, i) => {
      const q = quoteMap.get(STOCK_UNIVERSE[i].symbol);
      return q && q.isLive && q.price > 0;
    }).length;
    console.log(`✅ mockStocks: ${liveCount} live prices, ${stocks.length - liveCount} seeded — total ${stocks.length} stocks`);

    return stocks;
  } catch (error) {
    console.error('❌ mockStocks: getMultipleQuotes threw unexpectedly, using full seeded fallback:', error);
    // Complete seeded fallback — guarantees stocks are never empty
    return buildAllSeededStocks();
  }
};

/**
 * Synchronous seeded fallback for all stocks in STOCK_UNIVERSE.
 * Used when the async fetch path fails entirely.
 */
export const buildAllSeededStocks = (): Stock[] => {
  console.log(`🌱 mockStocks: Building seeded fallback for all ${STOCK_UNIVERSE.length} stocks`);
  return STOCK_UNIVERSE.map(buildSeededStock);
};
