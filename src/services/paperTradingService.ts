/**
 * Paper Trading Service
 * Full trade simulation with portfolio tracking, P&L, and trade history.
 * All data persisted in localStorage so it survives page refreshes.
 */

export interface PaperPosition {
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  trades: PaperTrade[];
}

export interface PaperTrade {
  id: string;
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  commission: number;
  timestamp: string;
  realizedPnL?: number;
}

export interface PaperPortfolio {
  cash: number;
  initialCash: number;
  positions: Record<string, PaperPosition>;
  tradeHistory: PaperTrade[];
  createdAt: string;
  lastUpdated: string;
}

export interface PaperPortfolioSummary {
  cash: number;
  investedValue: number;
  totalValue: number;
  totalPnL: number;
  totalPnLPct: number;
  dayPnL: number;
  tradeCount: number;
  winRate: number;
  bestTrade: PaperTrade | null;
  worstTrade: PaperTrade | null;
}

const STORAGE_KEY = 'mp_paper_portfolio';
const DEFAULT_CASH = 1_000_000; // ₹10 lakhs starting capital
const COMMISSION = 20; // ₹20 per trade (flat)

class PaperTradingService {
  private portfolio: PaperPortfolio;

  constructor() {
    this.portfolio = this.load();
  }

  private load(): PaperPortfolio {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return this.defaultPortfolio();
  }

  private defaultPortfolio(): PaperPortfolio {
    return {
      cash: DEFAULT_CASH,
      initialCash: DEFAULT_CASH,
      positions: {},
      tradeHistory: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
  }

  private save(): void {
    this.portfolio.lastUpdated = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.portfolio));
    } catch { /* storage full */ }
  }

  // ─── Buy ──────────────────────────────────────────────────────────────────
  buy(symbol: string, name: string, price: number, quantity: number): { success: boolean; message: string; trade?: PaperTrade } {
    const total = price * quantity;
    const totalWithCommission = total + COMMISSION;

    if (totalWithCommission > this.portfolio.cash) {
      return { success: false, message: `Insufficient funds. Need ₹${totalWithCommission.toLocaleString('en-IN')} but have ₹${this.portfolio.cash.toLocaleString('en-IN')}` };
    }

    if (quantity <= 0) {
      return { success: false, message: 'Quantity must be greater than 0' };
    }

    const trade: PaperTrade = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      symbol, name,
      type: 'BUY',
      quantity, price,
      total,
      commission: COMMISSION,
      timestamp: new Date().toISOString(),
    };

    // Update position
    const existing = this.portfolio.positions[symbol];
    if (existing) {
      const newQty = existing.quantity + quantity;
      const newTotalCost = existing.totalCost + total;
      this.portfolio.positions[symbol] = {
        ...existing,
        quantity: newQty,
        avgBuyPrice: newTotalCost / newQty,
        totalCost: newTotalCost,
        currentPrice: price,
        currentValue: newQty * price,
        unrealizedPnL: newQty * price - newTotalCost,
        unrealizedPnLPct: ((newQty * price - newTotalCost) / newTotalCost) * 100,
        trades: [...existing.trades, trade],
      };
    } else {
      this.portfolio.positions[symbol] = {
        symbol, name,
        quantity,
        avgBuyPrice: price,
        currentPrice: price,
        totalCost: total,
        currentValue: total,
        unrealizedPnL: 0,
        unrealizedPnLPct: 0,
        trades: [trade],
      };
    }

    this.portfolio.cash -= totalWithCommission;
    this.portfolio.tradeHistory.unshift(trade);
    this.save();

    return { success: true, message: `Bought ${quantity} shares of ${symbol} at ₹${price.toFixed(2)}`, trade };
  }

  // ─── Sell ─────────────────────────────────────────────────────────────────
  sell(symbol: string, name: string, price: number, quantity: number): { success: boolean; message: string; trade?: PaperTrade } {
    const existing = this.portfolio.positions[symbol];

    if (!existing || existing.quantity < quantity) {
      return { success: false, message: `Cannot sell ${quantity} shares — you only hold ${existing?.quantity ?? 0}` };
    }

    if (quantity <= 0) {
      return { success: false, message: 'Quantity must be greater than 0' };
    }

    const total = price * quantity;
    const costBasis = existing.avgBuyPrice * quantity;
    const realizedPnL = total - costBasis - COMMISSION;

    const trade: PaperTrade = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      symbol, name,
      type: 'SELL',
      quantity, price,
      total,
      commission: COMMISSION,
      timestamp: new Date().toISOString(),
      realizedPnL,
    };

    const newQty = existing.quantity - quantity;
    if (newQty === 0) {
      delete this.portfolio.positions[symbol];
    } else {
      const newTotalCost = existing.totalCost - costBasis;
      this.portfolio.positions[symbol] = {
        ...existing,
        quantity: newQty,
        totalCost: newTotalCost,
        currentPrice: price,
        currentValue: newQty * price,
        unrealizedPnL: newQty * price - newTotalCost,
        unrealizedPnLPct: newTotalCost > 0 ? ((newQty * price - newTotalCost) / newTotalCost) * 100 : 0,
        trades: [...existing.trades, trade],
      };
    }

    this.portfolio.cash += total - COMMISSION;
    this.portfolio.tradeHistory.unshift(trade);
    this.save();

    return { success: true, message: `Sold ${quantity} shares of ${symbol} at ₹${price.toFixed(2)}. P&L: ₹${realizedPnL.toFixed(2)}`, trade };
  }

  // ─── Update prices ────────────────────────────────────────────────────────
  updatePrices(prices: Record<string, number>): void {
    let changed = false;
    for (const [symbol, price] of Object.entries(prices)) {
      if (this.portfolio.positions[symbol] && price > 0) {
        const pos = this.portfolio.positions[symbol];
        pos.currentPrice = price;
        pos.currentValue = pos.quantity * price;
        pos.unrealizedPnL = pos.currentValue - pos.totalCost;
        pos.unrealizedPnLPct = pos.totalCost > 0 ? (pos.unrealizedPnL / pos.totalCost) * 100 : 0;
        changed = true;
      }
    }
    if (changed) this.save();
  }

  // ─── Getters ──────────────────────────────────────────────────────────────
  getPortfolio(): PaperPortfolio {
    return { ...this.portfolio };
  }

  getPositions(): PaperPosition[] {
    return Object.values(this.portfolio.positions);
  }

  getPosition(symbol: string): PaperPosition | null {
    return this.portfolio.positions[symbol] ?? null;
  }

  getTradeHistory(limit = 50): PaperTrade[] {
    return this.portfolio.tradeHistory.slice(0, limit);
  }

  getSummary(): PaperPortfolioSummary {
    const positions = this.getPositions();
    const investedValue = positions.reduce((s, p) => s + p.currentValue, 0);
    const totalValue = this.portfolio.cash + investedValue;
    const totalPnL = totalValue - this.portfolio.initialCash;
    const totalPnLPct = ((totalValue - this.portfolio.initialCash) / this.portfolio.initialCash) * 100;

    const sells = this.portfolio.tradeHistory.filter(t => t.type === 'SELL' && t.realizedPnL !== undefined);
    const wins = sells.filter(t => (t.realizedPnL ?? 0) > 0);
    const winRate = sells.length > 0 ? (wins.length / sells.length) * 100 : 0;

    const sorted = [...sells].sort((a, b) => (b.realizedPnL ?? 0) - (a.realizedPnL ?? 0));
    const bestTrade = sorted[0] ?? null;
    const worstTrade = sorted[sorted.length - 1] ?? null;

    // Mock day P&L (in real app this would compare to yesterday's close)
    const dayPnL = positions.reduce((s, p) => s + p.unrealizedPnL * 0.1, 0);

    return {
      cash: this.portfolio.cash,
      investedValue,
      totalValue,
      totalPnL,
      totalPnLPct,
      dayPnL,
      tradeCount: this.portfolio.tradeHistory.length,
      winRate,
      bestTrade,
      worstTrade,
    };
  }

  // ─── Reset ────────────────────────────────────────────────────────────────
  reset(newCapital = DEFAULT_CASH): void {
    this.portfolio = this.defaultPortfolio();
    this.portfolio.cash = newCapital;
    this.portfolio.initialCash = newCapital;
    this.save();
  }

  getEquityCurve(): { date: string; value: number }[] {
    if (this.portfolio.tradeHistory.length === 0) {
      return [{ date: this.portfolio.createdAt.slice(0, 10), value: this.portfolio.initialCash }];
    }

    // Build curve from trade history
    const curve: { date: string; value: number }[] = [];
    let cash = this.portfolio.initialCash;

    const trades = [...this.portfolio.tradeHistory].reverse();
    for (const trade of trades) {
      if (trade.type === 'BUY') cash -= trade.total + trade.commission;
      else cash += trade.total - trade.commission;
      curve.push({ date: trade.timestamp.slice(0, 10), value: cash });
    }

    return curve;
  }
}

export const paperTradingService = new PaperTradingService();
