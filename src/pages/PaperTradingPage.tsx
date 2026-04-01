import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Activity, BarChart2,
  Plus, Minus, RefreshCw, Trash2, Bell, BellOff, AlertTriangle,
  CheckCircle2, Clock, ShoppingCart, Package, ArrowUpRight,
  ArrowDownRight, Info, X, ChevronDown, ChevronUp, Settings,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { paperTradingService, PaperTrade, PaperPosition } from '../services/paperTradingService';
import { alertsService, PriceAlert, AlertCondition } from '../services/alertsService';
import { historicalDataService } from '../services/historicalDataService';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TradeModalState {
  symbol: string;
  name: string;
  price: number;
  type: 'BUY' | 'SELL';
  maxQty?: number;
}

interface AlertModalState {
  symbol: string;
  name: string;
  currentPrice: number;
}

interface ChartDataPoint {
  date: string;
  price: number;
  buyMarker?: number;
  sellMarker?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number, decimals = 2) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const pctColor = (n: number) => n >= 0 ? 'text-emerald-400' : 'text-red-400';
const pctSign  = (n: number) => n >= 0 ? '+' : '';

// ─── Sub-components ───────────────────────────────────────────────────────────

const MetricCard: React.FC<{ label: string; value: string; sub?: string; positive?: boolean; negative?: boolean }> =
  ({ label, value, sub, positive, negative }) => (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${positive ? 'text-emerald-400' : negative ? 'text-red-400' : 'text-white'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );

// ─── Trade Modal ──────────────────────────────────────────────────────────────
const TradeModal: React.FC<{
  state: TradeModalState;
  onClose: () => void;
  onConfirm: (qty: number) => void;
  cash: number;
}> = ({ state, onClose, onConfirm, cash }) => {
  const [qty, setQty] = useState(1);
  const total = qty * state.price;
  const canAfford = state.type === 'BUY' ? total + 20 <= cash : qty <= (state.maxQty ?? 0);
  const maxBuyable = Math.floor((cash - 20) / state.price);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg">
            {state.type === 'BUY' ? '🟢' : '🔴'} {state.type} {state.symbol}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
            <span className="text-gray-400 text-sm">Market Price</span>
            <span className="text-white font-mono font-semibold">{fmt(state.price)}</span>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-2">
              Quantity {state.type === 'BUY' ? `(max ${maxBuyable})` : `(max ${state.maxQty})`}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-lg bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700 transition-colors"
              ><Minus size={14} /></button>
              <input
                type="number"
                min={1}
                max={state.type === 'BUY' ? maxBuyable : state.maxQty}
                value={qty}
                onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => setQty(q => Math.min(state.type === 'BUY' ? maxBuyable : (state.maxQty ?? 1), q + 1))}
                className="w-9 h-9 rounded-lg bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700 transition-colors"
              ><Plus size={14} /></button>
            </div>
            {state.type === 'BUY' && (
              <button
                onClick={() => setQty(maxBuyable)}
                className="text-xs text-emerald-400 hover:text-emerald-300 mt-1 transition-colors"
              >
                Buy max
              </button>
            )}
          </div>

          <div className="bg-gray-800/60 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span className="text-white font-mono">{fmt(total)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Commission</span><span className="text-white font-mono">{fmt(20)}</span></div>
            <div className="flex justify-between border-t border-gray-700 pt-2 font-semibold">
              <span className="text-white">Total</span>
              <span className={`font-mono ${canAfford ? 'text-white' : 'text-red-400'}`}>{fmt(total + 20)}</span>
            </div>
            {state.type === 'BUY' && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Cash after</span>
                <span className={`font-mono ${canAfford ? 'text-gray-300' : 'text-red-400'}`}>
                  {fmt(Math.max(0, cash - total - 20))}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
            >Cancel</button>
            <button
              onClick={() => canAfford && onConfirm(qty)}
              disabled={!canAfford}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${
                !canAfford
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : state.type === 'BUY'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {state.type === 'BUY' ? 'Buy Now' : 'Sell Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Alert Modal ──────────────────────────────────────────────────────────────
const AlertModal: React.FC<{
  state: AlertModalState;
  onClose: () => void;
  onAdd: (condition: AlertCondition, value: number, note: string) => void;
}> = ({ state, onClose, onAdd }) => {
  const [condition, setCondition] = useState<AlertCondition>('above');
  const [value, setValue] = useState(state.currentPrice * 1.05);
  const [note, setNote] = useState('');

  const conditionOptions: { value: AlertCondition; label: string; placeholder: string }[] = [
    { value: 'above',           label: 'Price rises above',   placeholder: `e.g. ${(state.currentPrice * 1.05).toFixed(2)}` },
    { value: 'below',           label: 'Price falls below',   placeholder: `e.g. ${(state.currentPrice * 0.95).toFixed(2)}` },
    { value: 'change_pct_up',   label: '% gain in a day',     placeholder: 'e.g. 3' },
    { value: 'change_pct_down', label: '% drop in a day',     placeholder: 'e.g. 2' },
  ];

  const isPct = condition === 'change_pct_up' || condition === 'change_pct_down';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-amber-400" />
            <h3 className="text-white font-bold text-lg">Set Alert — {state.symbol}</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-gray-400">Current price: <span className="text-white font-mono">{fmt(state.currentPrice)}</span></p>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Condition</label>
            <select
              value={condition}
              onChange={e => setCondition(e.target.value as AlertCondition)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {conditionOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">
              {isPct ? 'Threshold (%)' : 'Target Price (₹)'}
            </label>
            <input
              type="number"
              step={isPct ? '0.1' : '1'}
              min={isPct ? '0.1' : '1'}
              value={value}
              onChange={e => setValue(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder={conditionOptions.find(o => o.value === condition)?.placeholder}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Support level"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors">Cancel</button>
            <button
              onClick={() => onAdd(condition, value, note)}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Bell size={14} /> Set Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Historical Chart with Trade Markers ──────────────────────────────────────
const StockChart: React.FC<{ symbol: string; name: string; currentPrice: number; trades: PaperTrade[] }> = ({
  symbol, name, currentPrice, trades,
}) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'1M' | '3M' | '6M'>('1M');

  useEffect(() => {
    setLoading(true);
    const days = period === '1M' ? 30 : period === '3M' ? 90 : 180;
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    historicalDataService.getHistoricalData(symbol, start, end).then(data => {
      // Build chart data with trade markers
      const tradeMap: Record<string, { buy?: number; sell?: number }> = {};
      trades.forEach(t => {
        const d = t.timestamp.slice(0, 10);
        if (!tradeMap[d]) tradeMap[d] = {};
        if (t.type === 'BUY') tradeMap[d].buy = t.price;
        else tradeMap[d].sell = t.price;
      });

      const pts: ChartDataPoint[] = data.map(d => ({
        date: d.date,
        price: d.close || d.price,
        ...(tradeMap[d.date]?.buy  ? { buyMarker: tradeMap[d.date].buy }   : {}),
        ...(tradeMap[d.date]?.sell ? { sellMarker: tradeMap[d.date].sell } : {}),
      }));

      setChartData(pts);
      setLoading(false);
    });
  }, [symbol, period, trades.length]);

  const minP = chartData.length ? Math.min(...chartData.map(d => d.price)) * 0.99 : 0;
  const maxP = chartData.length ? Math.max(...chartData.map(d => d.price)) * 1.01 : 0;
  const first = chartData[0]?.price ?? 0;
  const isUp = currentPrice >= first;

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.buyMarker)  return <circle cx={cx} cy={cy} r={6} fill="#10b981" stroke="#fff" strokeWidth={2} />;
    if (payload.sellMarker) return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
    return null;
  };

  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">{name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 mr-1 align-middle" />Buy
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 ml-3 mr-1 align-middle" />Sell
          </p>
        </div>
        <div className="flex gap-1">
          {(['1M', '3M', '6M'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                period === p ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >{p}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-52 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} domain={[minP, maxP]} tickFormatter={v => `₹${Math.round(v)}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#f3f4f6' }}
                formatter={(value: number, name: string) => {
                  if (name === 'buyMarker')  return [`₹${value.toFixed(2)}`, '🟢 Buy'];
                  if (name === 'sellMarker') return [`₹${value.toFixed(2)}`, '🔴 Sell'];
                  return [`₹${value.toFixed(2)}`, 'Price'];
                }}
              />
              <ReferenceLine y={currentPrice} stroke="#6b7280" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isUp ? '#10b981' : '#ef4444'}
                fill={`url(#grad-${symbol})`}
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 4, fill: isUp ? '#10b981' : '#ef4444' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const PaperTradingPage: React.FC = () => {
  const { selectedStocks, isDarkMode } = useAppContext();
  const [portfolio, setPortfolio] = useState(paperTradingService.getPortfolio());
  const [summary, setSummary] = useState(paperTradingService.getSummary());
  const [tradeModal, setTradeModal] = useState<TradeModalState | null>(null);
  const [alertModal, setAlertModal] = useState<AlertModalState | null>(null);
  const [alerts, setAlerts] = useState<PriceAlert[]>(alertsService.getAlerts());
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'trade' | 'positions' | 'history' | 'alerts'>('trade');
  const [selectedChartSymbol, setSelectedChartSymbol] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetCapital, setResetCapital] = useState(1_000_000);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const refresh = useCallback(() => {
    setPortfolio(paperTradingService.getPortfolio());
    setSummary(paperTradingService.getSummary());
  }, []);

  // Update prices every 60 seconds
  useEffect(() => {
    const priceMap: Record<string, number> = {};
    selectedStocks.forEach(s => { priceMap[s.symbol] = s.price; });
    paperTradingService.updatePrices(priceMap);
    refresh();

    // Also check alerts
    const quoteMap: Record<string, { price: number; changePercent: number }> = {};
    selectedStocks.forEach(s => { quoteMap[s.symbol] = { price: s.price, changePercent: s.changePercent }; });
    const triggered = alertsService.checkPrices(quoteMap);
    if (triggered.length) {
      setAlerts(alertsService.getAlerts());
      triggered.forEach(a => showToast(`🔔 Alert: ${a.symbol} — ${alertsService.conditionLabel(a.condition)}`, 'success'));
    }
  }, [selectedStocks, refresh, showToast]);

  // Subscribe to alert changes
  useEffect(() => {
    return alertsService.subscribe(a => setAlerts([...a]));
  }, []);

  const handleBuy = (symbol: string, name: string, price: number) => {
    setTradeModal({ symbol, name, price, type: 'BUY' });
  };

  const handleSell = (pos: PaperPosition) => {
    setTradeModal({ symbol: pos.symbol, name: pos.name, price: pos.currentPrice, type: 'SELL', maxQty: pos.quantity });
  };

  const confirmTrade = (qty: number) => {
    if (!tradeModal) return;
    const result = tradeModal.type === 'BUY'
      ? paperTradingService.buy(tradeModal.symbol, tradeModal.name, tradeModal.price, qty)
      : paperTradingService.sell(tradeModal.symbol, tradeModal.name, tradeModal.price, qty);

    if (result.success) {
      showToast(result.message, 'success');
      refresh();
    } else {
      showToast(result.message, 'error');
    }
    setTradeModal(null);
  };

  const addAlert = (condition: AlertCondition, value: number, note: string) => {
    if (!alertModal) return;
    alertsService.addAlert({
      symbol: alertModal.symbol,
      name: alertModal.name,
      condition,
      targetValue: value,
      note: note || undefined,
    });
    setAlerts(alertsService.getAlerts());
    showToast(`Alert set for ${alertModal.symbol}`, 'success');
    setAlertModal(null);
  };

  const positions = paperTradingService.getPositions();
  const tradeHistory = paperTradingService.getTradeHistory(100);
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const triggeredAlerts = alerts.filter(a => a.status === 'triggered');

  return (
    <div className="max-w-screen-2xl mx-auto space-y-5 animate-fadeIn">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border flex items-center gap-2 ${
          toast.type === 'success'
            ? 'bg-gray-800 border-emerald-500/50 text-emerald-400'
            : 'bg-gray-800 border-red-500/50 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
            Paper Trading Simulator
          </h1>
          <p className="text-gray-400 text-sm mt-1">Practice trading with virtual ₹{(summary.totalValue / 100000).toFixed(1)}L — no real money at risk</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-2 rounded-xl bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-white transition-colors"
          ><RefreshCw size={16} /></button>
          <button
            onClick={() => setShowReset(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-white text-sm transition-colors"
          ><Settings size={15} /> Reset</button>
        </div>
      </div>

      {/* Reset confirmation */}
      {showReset && (
        <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-300 text-sm font-medium">Reset all paper trading data?</p>
              <div className="flex items-center gap-2 mt-1">
                <label className="text-xs text-gray-400">Starting capital:</label>
                <select
                  value={resetCapital}
                  onChange={e => setResetCapital(Number(e.target.value))}
                  className="bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-600"
                >
                  {[500_000, 1_000_000, 2_000_000, 5_000_000].map(v => (
                    <option key={v} value={v}>₹{(v / 100000).toFixed(0)}L</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowReset(false)} className="px-4 py-1.5 rounded-lg bg-gray-700 text-gray-300 text-sm transition-colors hover:bg-gray-600">Cancel</button>
            <button
              onClick={() => { paperTradingService.reset(resetCapital); refresh(); setShowReset(false); showToast('Portfolio reset!'); }}
              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm transition-colors"
            >Reset Now</button>
          </div>
        </div>
      )}

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Total Portfolio"
          value={fmt(summary.totalValue)}
          sub={`Started at ${fmt(portfolio.initialCash)}`}
        />
        <MetricCard
          label="Total P&L"
          value={`${pctSign(summary.totalPnL)}${fmt(summary.totalPnL)}`}
          sub={`${pctSign(summary.totalPnLPct)}${summary.totalPnLPct.toFixed(2)}%`}
          positive={summary.totalPnL >= 0}
          negative={summary.totalPnL < 0}
        />
        <MetricCard
          label="Available Cash"
          value={fmt(summary.cash)}
          sub={`${positions.length} position${positions.length !== 1 ? 's' : ''} open`}
        />
        <MetricCard
          label="Win Rate"
          value={`${summary.winRate.toFixed(1)}%`}
          sub={`${summary.tradeCount} trades total`}
          positive={summary.winRate >= 50}
        />
      </div>

      {/* Triggered alert banner */}
      {triggeredAlerts.length > 0 && (
        <div className="rounded-xl bg-amber-900/20 border border-amber-500/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell size={16} className="text-amber-400" />
            <p className="text-amber-300 font-medium text-sm">{triggeredAlerts.length} Alert{triggeredAlerts.length > 1 ? 's' : ''} Triggered</p>
          </div>
          <div className="space-y-1">
            {triggeredAlerts.map(a => (
              <div key={a.id} className="flex items-center justify-between text-xs">
                <span className="text-amber-200">{a.symbol}: {alertsService.conditionLabel(a.condition)} {a.targetValue}</span>
                <button onClick={() => { alertsService.dismissAlert(a.id); setAlerts(alertsService.getAlerts()); }} className="text-gray-500 hover:text-gray-300">Dismiss</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-800/40 p-1 rounded-xl w-fit">
        {([
          { id: 'trade', label: 'Trade', icon: ShoppingCart },
          { id: 'positions', label: `Positions${positions.length ? ` (${positions.length})` : ''}`, icon: Package },
          { id: 'history', label: 'History', icon: Clock },
          { id: 'alerts', label: `Alerts${activeAlerts.length ? ` (${activeAlerts.length})` : ''}`, icon: Bell },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── TAB: TRADE ─────────────────────────────────────────────────────── */}
      {activeTab === 'trade' && (
        <div className="space-y-4">
          {selectedStocks.length === 0 ? (
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-12 text-center">
              <ShoppingCart size={48} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">Select stocks from the Stocks page to start trading</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {selectedStocks.map(stock => {
                const pos = paperTradingService.getPosition(stock.symbol);
                return (
                  <div key={stock.symbol} className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white font-mono">{stock.symbol}</p>
                            <span className="text-xs text-gray-500">{stock.market}</span>
                          </div>
                          <p className="text-xs text-gray-400">{stock.name}</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white font-mono">{fmt(stock.price)}</p>
                          <p className={`text-xs font-medium flex items-center gap-0.5 ${pctColor(stock.changePercent)}`}>
                            {stock.changePercent >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {pctSign(stock.changePercent)}{stock.changePercent.toFixed(2)}%
                          </p>
                        </div>
                        {pos && (
                          <div className="text-xs pl-4 border-l border-gray-700">
                            <p className="text-gray-400">Holding: <span className="text-white">{pos.quantity} shares</span></p>
                            <p className={pctColor(pos.unrealizedPnL)}>
                              {pctSign(pos.unrealizedPnL)}{fmt(pos.unrealizedPnL)} ({pctSign(pos.unrealizedPnLPct)}{pos.unrealizedPnLPct.toFixed(2)}%)
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedChartSymbol(selectedChartSymbol === stock.symbol ? null : stock.symbol)}
                          className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:text-white text-xs transition-colors"
                        >
                          {selectedChartSymbol === stock.symbol ? '↑ Chart' : '↓ Chart'}
                        </button>
                        <button
                          onClick={() => setAlertModal({ symbol: stock.symbol, name: stock.name, currentPrice: stock.price })}
                          className="p-1.5 rounded-lg bg-amber-900/30 border border-amber-500/20 text-amber-400 hover:bg-amber-900/50 transition-colors"
                        ><Bell size={14} /></button>
                        {pos && (
                          <button
                            onClick={() => handleSell(pos)}
                            className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
                          >Sell</button>
                        )}
                        <button
                          onClick={() => handleBuy(stock.symbol, stock.name, stock.price)}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
                        >Buy</button>
                      </div>
                    </div>

                    {/* Inline chart */}
                    {selectedChartSymbol === stock.symbol && (
                      <div className="mt-4">
                        <StockChart
                          symbol={stock.symbol}
                          name={stock.name}
                          currentPrice={stock.price}
                          trades={tradeHistory.filter(t => t.symbol === stock.symbol)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: POSITIONS ─────────────────────────────────────────────────── */}
      {activeTab === 'positions' && (
        <div className="space-y-3">
          {positions.length === 0 ? (
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-12 text-center">
              <Package size={48} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No open positions — start by buying a stock in the Trade tab</p>
            </div>
          ) : positions.map(pos => (
            <div key={pos.symbol} className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white font-mono text-lg">{pos.symbol}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      pos.unrealizedPnL >= 0 ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'
                    }`}>
                      {pctSign(pos.unrealizedPnL)}{pos.unrealizedPnLPct.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{pos.name}</p>
                </div>

                <div className="grid grid-cols-4 gap-6 text-right text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Qty</p>
                    <p className="text-white font-bold">{pos.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Avg Price</p>
                    <p className="text-white font-mono">{fmt(pos.avgBuyPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">LTP</p>
                    <p className="text-white font-mono">{fmt(pos.currentPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">P&L</p>
                    <p className={`font-mono font-bold ${pctColor(pos.unrealizedPnL)}`}>
                      {pctSign(pos.unrealizedPnL)}{fmt(pos.unrealizedPnL)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>Invested: <span className="text-gray-300">{fmt(pos.totalCost)}</span></span>
                  <span>Value: <span className="text-gray-300">{fmt(pos.currentValue)}</span></span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedChartSymbol(selectedChartSymbol === pos.symbol ? null : pos.symbol)}
                    className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 hover:text-white text-xs transition-colors"
                  >Chart</button>
                  <button
                    onClick={() => handleSell(pos)}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors"
                  >Sell</button>
                </div>
              </div>

              {selectedChartSymbol === pos.symbol && (
                <div className="mt-4">
                  <StockChart symbol={pos.symbol} name={pos.name} currentPrice={pos.currentPrice} trades={tradeHistory.filter(t => t.symbol === pos.symbol)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: HISTORY ───────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
          {tradeHistory.length === 0 ? (
            <div className="p-12 text-center">
              <Clock size={48} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No trades yet</p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-700/50 bg-gray-800/40">
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase">Symbol</th>
                  <th className="px-4 py-3 text-center text-xs text-gray-400 font-semibold uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-400 font-semibold uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-400 font-semibold uppercase">Price</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-400 font-semibold uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs text-gray-400 font-semibold uppercase">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {tradeHistory.map(trade => (
                  <tr key={trade.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(trade.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-white">{trade.symbol}</p>
                      <p className="text-xs text-gray-500">{trade.name.slice(0, 20)}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        trade.type === 'BUY'
                          ? 'bg-emerald-900/40 text-emerald-400'
                          : 'bg-red-900/40 text-red-400'
                      }`}>{trade.type}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-white">{trade.quantity}</td>
                    <td className="px-4 py-3 text-right text-sm text-white font-mono">{fmt(trade.price)}</td>
                    <td className="px-4 py-3 text-right text-sm text-white font-mono">{fmt(trade.total)}</td>
                    <td className="px-4 py-3 text-right text-sm font-mono font-bold">
                      {trade.realizedPnL !== undefined ? (
                        <span className={pctColor(trade.realizedPnL)}>
                          {pctSign(trade.realizedPnL)}{fmt(trade.realizedPnL)}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── TAB: ALERTS ────────────────────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Quick add alert */}
          {selectedStocks.length > 0 && (
            <div className="rounded-xl bg-amber-900/20 border border-amber-500/20 p-4">
              <p className="text-xs text-amber-300 mb-3 font-medium">Set alert for selected stocks:</p>
              <div className="flex flex-wrap gap-2">
                {selectedStocks.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => setAlertModal({ symbol: s.symbol, name: s.name, currentPrice: s.price })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/40 border border-amber-500/30 text-amber-300 hover:bg-amber-900/60 text-xs font-medium transition-colors"
                  >
                    <Bell size={11} /> {s.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}

          {alerts.length === 0 ? (
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-12 text-center">
              <BellOff size={48} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No alerts set. Select a stock and click the 🔔 button to add alerts.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
              <div className="divide-y divide-gray-700/30">
                {alerts.map(alert => (
                  <div key={alert.id} className={`flex items-center justify-between px-5 py-4 ${
                    alert.status === 'triggered' ? 'bg-amber-900/10' : ''
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        alert.status === 'active' ? 'bg-emerald-400 animate-pulse' :
                        alert.status === 'triggered' ? 'bg-amber-400' : 'bg-gray-600'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{alert.symbol}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            alert.status === 'active' ? 'bg-emerald-900/40 text-emerald-400' :
                            alert.status === 'triggered' ? 'bg-amber-900/40 text-amber-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>{alert.status}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {alertsService.conditionLabel(alert.condition)}{' '}
                          <span className="text-white font-mono">
                            {alert.condition.includes('pct') ? `${alert.targetValue}%` : fmt(alert.targetValue)}
                          </span>
                          {alert.note && <span className="text-gray-500"> · {alert.note}</span>}
                        </p>
                        {alert.triggeredAt && (
                          <p className="text-xs text-amber-400 mt-0.5">
                            Triggered {new Date(alert.triggeredAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {alert.status === 'triggered' && (
                        <button
                          onClick={() => { alertsService.reactivateAlert(alert.id); setAlerts(alertsService.getAlerts()); }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-gray-700 text-gray-300 hover:text-white transition-colors"
                        >Reset</button>
                      )}
                      <button
                        onClick={() => { alertsService.deleteAlert(alert.id); setAlerts(alertsService.getAlerts()); }}
                        className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                      ><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {tradeModal && (
        <TradeModal
          state={tradeModal}
          onClose={() => setTradeModal(null)}
          onConfirm={confirmTrade}
          cash={summary.cash}
        />
      )}
      {alertModal && (
        <AlertModal
          state={alertModal}
          onClose={() => setAlertModal(null)}
          onAdd={addAlert}
        />
      )}
    </div>
  );
};
