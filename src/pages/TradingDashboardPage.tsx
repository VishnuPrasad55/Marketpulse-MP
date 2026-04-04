import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { stockApi } from '../services/stockApi';
import { ZerodhaPanel } from '../components/ZerodhaPanel';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, BarChart2,
  PieChart as PieChartIcon, Activity, Clock, Lock,
  ShoppingCart, Minus, X,
} from 'lucide-react';
import { Stock } from '../types';

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'];

// ─── Buy Modal ────────────────────────────────────────────────────────────────
const BuyModal: React.FC<{
  stock: Stock;
  onClose: () => void;
  onConfirm: (qty: number) => void;
}> = ({ stock, onClose, onConfirm }) => {
  const [qty, setQty] = useState(1);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg">🟢 Buy {stock.symbol}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between text-sm border-b border-gray-700/50 pb-3">
            <span className="text-gray-400">Market price</span>
            <span className="text-white font-mono font-semibold">₹{stock.price.toFixed(2)}</span>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Quantity</label>
            <input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="bg-gray-800/60 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-400">Total</span><span className="text-white font-mono">₹{(stock.price * qty).toFixed(2)}</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors">Cancel</button>
            <button onClick={() => onConfirm(qty)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors">Buy now</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sell Modal ───────────────────────────────────────────────────────────────
const SellModal: React.FC<{
  holding: any;
  onClose: () => void;
  onConfirm: (qty: number) => void;
}> = ({ holding, onClose, onConfirm }) => {
  const [qty, setQty] = useState(holding.quantity);
  const pnl = (holding.current_price - holding.purchase_price) * qty;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg">🔴 Sell {holding.stock_symbol}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Quantity (available: {holding.quantity})</label>
            <input type="number" min={1} max={holding.quantity} value={qty}
              onChange={e => setQty(Math.min(holding.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div className="bg-gray-800/60 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-400">Proceeds</span><span className="text-white font-mono">₹{(holding.current_price * qty).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">P&L</span>
              <span className={`font-mono font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors">Cancel</button>
            <button onClick={() => onConfirm(qty)} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors">Sell now</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Metric card ──────────────────────────────────────────────────────────────
const MetricCard: React.FC<{
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string;
  positive?: boolean; negative?: boolean;
}> = ({ label, value, sub, icon, color, positive, negative }) => (
  <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5">
    <div className="flex items-start justify-between mb-3">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
    </div>
    <p className={`text-2xl font-bold font-mono ${positive ? 'text-emerald-400' : negative ? 'text-red-400' : 'text-white'}`}>{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
export function TradingDashboardPage() {
  const { isDarkMode, selectedStocks, userPortfolio, userPredictions, buyStock, sellStock, refreshUserData } = useAppContext();
  const [buyModalStock, setBuyModalStock] = useState<Stock | null>(null);
  const [sellModalHolding, setSellModalHolding] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'live'>('overview');
  const marketStatus = stockApi.getMarketStatus();

  const hasSelectedStocks = selectedStocks.length > 0;
  const hasPortfolio = userPortfolio.length > 0;

  // Portfolio metrics
  const portfolioValue = userPortfolio.reduce((t, h) => t + h.current_price * h.quantity, 0);
  const totalCost      = userPortfolio.reduce((t, h) => t + h.purchase_price * h.quantity, 0);
  const totalPnL       = portfolioValue - totalCost;
  const totalPnLPct    = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  // Allocation pie data
  const pieData = userPortfolio.map((h, i) => ({
    name: h.stock_symbol,
    value: Math.round(h.current_price * h.quantity * 100) / 100,
    color: COLORS[i % COLORS.length],
  }));

  // Simulated equity curve (deterministic based on portfolio value)
  const equityCurve = hasPortfolio
    ? Array.from({ length: 30 }, (_, i) => {
        const base = portfolioValue;
        const seed = Math.sin(i * 2.7) * 0.03;
        return {
          date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
          value: Math.round(base * (0.9 + seed + i * 0.003) * 100) / 100,
        };
      })
    : [];

  // Buy/sell handlers
  const handleBuyConfirm = async (qty: number) => {
    if (!buyModalStock) return;
    await buyStock(buyModalStock, qty);
    await refreshUserData();
    setBuyModalStock(null);
  };

  const handleSellConfirm = async (qty: number) => {
    if (!sellModalHolding) return;
    await sellStock(sellModalHolding.stock_symbol, qty);
    await refreshUserData();
    setSellModalHolding(null);
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!hasSelectedStocks && !hasPortfolio) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>Trading Dashboard</h1>
        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-16 text-center">
          <BarChart2 size={56} className="mx-auto mb-4 text-gray-600" />
          <h2 className="text-xl font-semibold text-white mb-2">No portfolio data yet</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Select stocks from the Stocks page and run predictions to build your watchlist.
            Your portfolio data will appear here after you make your first purchase.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>Trading Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Portfolio performance and live market data</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border ${
            marketStatus.isOpen
              ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/20'
              : 'bg-gray-800/60 text-gray-400 border-gray-700/50'
          }`}>
            {marketStatus.isOpen ? <Activity size={12} className="animate-pulse" /> : <Lock size={12} />}
            {marketStatus.isOpen ? 'Market Live' : 'Market Closed'}
          </div>
        </div>
      </div>

      {/* Market closed banner */}
      {!marketStatus.isOpen && (
        <div className="rounded-xl bg-amber-900/20 border border-amber-500/20 p-4 flex items-center gap-3">
          <Clock size={16} className="text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">{marketStatus.nextChange}. Paper trading is always available.</p>
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-800/40 p-1 rounded-xl w-fit">
        {([['overview', 'Portfolio Overview'], ['live', 'Live Trading (Zerodha)']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Portfolio value" value={`₹${portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              sub={`${userPortfolio.length} holding${userPortfolio.length !== 1 ? 's' : ''}`}
              icon={<DollarSign size={16} className="text-emerald-400" />} color="bg-emerald-900/20" />
            <MetricCard label="Total P&L" value={`${totalPnL >= 0 ? '+' : ''}₹${Math.abs(totalPnL).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              sub={`${totalPnLPct >= 0 ? '+' : ''}${totalPnLPct.toFixed(2)}% all time`}
              icon={totalPnL >= 0 ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-red-400" />}
              color={totalPnL >= 0 ? 'bg-emerald-900/20' : 'bg-red-900/20'}
              positive={totalPnL >= 0} negative={totalPnL < 0} />
            <MetricCard label="Watchlist" value={`${selectedStocks.length}`}
              sub={`${selectedStocks.filter(s => s.changePercent > 0).length} up today`}
              icon={<Activity size={16} className="text-blue-400" />} color="bg-blue-900/20" />
            <MetricCard label="AI predictions" value={`${userPredictions.length}`}
              sub={`${userPredictions.filter(p => p.predicted_direction === 'UP').length} bullish`}
              icon={<BarChart2 size={16} className="text-violet-400" />} color="bg-violet-900/20" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Equity curve */}
            <div className="lg:col-span-2 rounded-xl bg-gray-800/60 border border-gray-700/50 p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Portfolio equity curve (30 days)</h2>
              {hasPortfolio ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurve}>
                      <defs>
                        <linearGradient id="ev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                      <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Value']} />
                      <Area type="monotone" dataKey="value" stroke="#10B981" fill="url(#ev)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                  Buy stocks to see your equity curve
                </div>
              )}
            </div>

            {/* Allocation pie */}
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Portfolio allocation</h2>
              {hasPortfolio ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Value']}
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                  No holdings to display
                </div>
              )}
            </div>
          </div>

          {/* Holdings + watchlist row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Holdings */}
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700/50">
                <h2 className="text-sm font-semibold text-white">Current holdings</h2>
              </div>
              {hasPortfolio ? (
                <div className="divide-y divide-gray-700/30">
                  {userPortfolio.map(h => {
                    const pnl = (h.current_price - h.purchase_price) * h.quantity;
                    const pnlPct = ((h.current_price - h.purchase_price) / h.purchase_price) * 100;
                    return (
                      <div key={h.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-sm font-bold text-white">{h.stock_symbol}</p>
                          <p className="text-xs text-gray-400">{h.quantity} shares @ ₹{h.purchase_price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm text-white font-mono">₹{h.current_price.toFixed(2)}</p>
                            <p className={`text-xs font-medium ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {pnl >= 0 ? '+' : ''}₹{Math.abs(pnl).toFixed(0)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                            </p>
                          </div>
                          <button onClick={() => setSellModalHolding(h)}
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors">
                            Sell
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-gray-500 text-sm">No holdings yet — buy stocks from your watchlist</div>
              )}
            </div>

            {/* Watchlist / quick buy */}
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700/50">
                <h2 className="text-sm font-semibold text-white">Watchlist — quick trade</h2>
              </div>
              {hasSelectedStocks ? (
                <div className="divide-y divide-gray-700/30">
                  {selectedStocks.slice(0, 8).map((stock, i) => (
                    <div key={stock.symbol} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <div>
                          <p className="text-sm font-bold text-white">{stock.symbol}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[120px]">{stock.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-white font-mono">₹{stock.price.toFixed(2)}</p>
                          <div className={`flex items-center gap-0.5 text-xs font-medium justify-end ${stock.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {stock.changePercent >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </div>
                        </div>
                        <button onClick={() => setBuyModalStock(stock)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors">
                          <ShoppingCart size={11} /> Buy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-12 text-center text-gray-500 text-sm">No stocks selected. Go to Stocks to add some.</div>
              )}
            </div>
          </div>

          {/* AI Predictions summary */}
          {userPredictions.length > 0 && (
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700/50">
                <h2 className="text-sm font-semibold text-white">Recent AI predictions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-700/50 bg-gray-800/40">
                      {['Symbol', 'Target date', 'Predicted price', 'Direction', 'Confidence'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {userPredictions.slice(0, 6).map(p => (
                      <tr key={p.id} className="hover:bg-gray-700/20 transition-colors">
                        <td className="px-4 py-3 text-sm font-bold text-white">{p.stock_symbol}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{new Date(p.target_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                        <td className="px-4 py-3 text-sm text-white font-mono">₹{p.predicted_price.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full w-fit ${
                            p.predicted_direction === 'UP' ? 'bg-emerald-900/40 text-emerald-400' :
                            p.predicted_direction === 'DOWN' ? 'bg-red-900/40 text-red-400' :
                            'bg-amber-900/40 text-amber-400'
                          }`}>
                            {p.predicted_direction === 'UP' ? <TrendingUp size={10} /> : p.predicted_direction === 'DOWN' ? <TrendingDown size={10} /> : <Minus size={10} />}
                            {p.predicted_direction}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.confidence}%` }} />
                            </div>
                            <span className="text-xs text-gray-300">{p.confidence}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── LIVE TRADING TAB ───────────────────────────────────────────────── */}
      {activeTab === 'live' && (
        <ZerodhaPanel className="max-w-3xl" />
      )}

      {/* Modals */}
      {buyModalStock && <BuyModal stock={buyModalStock} onClose={() => setBuyModalStock(null)} onConfirm={handleBuyConfirm} />}
      {sellModalHolding && <SellModal holding={sellModalHolding} onClose={() => setSellModalHolding(null)} onConfirm={handleSellConfirm} />}
    </div>
  );
}
