/**
 * Portfolio Analytics Page
 * Advanced portfolio analysis: Sharpe ratio, drawdown, sector allocation,
 * risk metrics, correlation, and export to CSV.
 */
import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, BarChart2, PieChart as PieIcon,
  Activity, Shield, Download, RefreshCw, Info, AlertTriangle,
  Target, Zap, Award, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6',
                 '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6'];

// ─── Utility helpers ──────────────────────────────────────────────────────────
function fmt(n: number, dec = 2) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
}
function pctFmt(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`; }
function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

// ─── Metric Card ──────────────────────────────────────────────────────────────
const MetricCard: React.FC<{
  label: string; value: string; sub?: string; tooltip?: string;
  positive?: boolean; negative?: boolean; neutral?: boolean;
  icon: React.ReactNode; color: string;
}> = ({ label, value, sub, tooltip, positive, negative, icon, color }) => (
  <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5 group relative">
    {tooltip && (
      <div className="absolute top-full left-0 mt-1 w-64 p-2.5 rounded-lg bg-gray-900 border border-gray-700 text-xs text-gray-300 z-50 hidden group-hover:block shadow-xl">
        {tooltip}
      </div>
    )}
    <div className="flex items-start justify-between mb-3">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider flex items-center gap-1">
        {label}
        {tooltip && <Info size={11} className="text-gray-600" />}
      </p>
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
    </div>
    <p className={`text-2xl font-bold font-mono ${positive ? 'text-emerald-400' : negative ? 'text-red-400' : 'text-white'}`}>
      {value}
    </p>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export const PortfolioAnalyticsPage: React.FC = () => {
  const { userPortfolio, userPredictions, selectedStocks, tradingParameters } = useAppContext();
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'sector' | 'signals'>('overview');

  // ── Portfolio Calculations ──────────────────────────────────────────────────
  const analytics = useMemo(() => {
    if (userPortfolio.length === 0) return null;

    const holdings = userPortfolio.map(h => ({
      ...h,
      currentValue: h.current_price * h.quantity,
      costBasis:    h.purchase_price * h.quantity,
      pnl:          (h.current_price - h.purchase_price) * h.quantity,
      pnlPct:       ((h.current_price - h.purchase_price) / h.purchase_price) * 100,
      weight:       0, // filled below
    }));

    const totalValue   = holdings.reduce((s, h) => s + h.currentValue, 0);
    const totalCost    = holdings.reduce((s, h) => s + h.costBasis, 0);
    const totalPnL     = totalValue - totalCost;
    const totalPnLPct  = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    // Weights
    holdings.forEach(h => { h.weight = totalValue > 0 ? h.currentValue / totalValue : 0; });

    // Sector allocation from selected stocks
    const sectorMap: Record<string, number> = {};
    holdings.forEach(h => {
      const stock = selectedStocks.find(s => s.symbol === h.stock_symbol);
      const sector = stock?.sector ?? 'Unknown';
      sectorMap[sector] = (sectorMap[sector] ?? 0) + h.currentValue;
    });
    const sectorData = Object.entries(sectorMap)
      .map(([name, value]) => ({ name, value: Math.round(value), pct: totalValue > 0 ? (value / totalValue * 100) : 0 }))
      .sort((a, b) => b.value - a.value);

    // Concentration risk (Herfindahl-Hirschman Index, 0-10000)
    const hhi = holdings.reduce((s, h) => s + (h.weight * 100) ** 2, 0);
    const concentrationRisk = hhi > 5000 ? 'High' : hhi > 2500 ? 'Medium' : 'Low';

    // Simulated daily returns for Sharpe ratio (use pnl % as proxy)
    const dailyReturns = holdings.map(h => h.pnlPct / 252);
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance  = dailyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / dailyReturns.length;
    const stdDev    = Math.sqrt(variance);
    const sharpe    = stdDev > 0 ? ((avgReturn - 0.06 / 252) / stdDev) * Math.sqrt(252) : 0;

    // Best and worst positions
    const sortedByPnl = [...holdings].sort((a, b) => b.pnlPct - a.pnlPct);
    const best  = sortedByPnl[0];
    const worst = sortedByPnl[sortedByPnl.length - 1];

    // Simulated equity curve based on current holdings
    const equityCurve = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10);
      const factor = 0.85 + (i / 29) * (totalPnLPct / 100 + 0.15);
      const value = Math.round(totalCost * factor * 100) / 100;
      return { date, value };
    });

    // Simulated drawdown
    let peak = equityCurve[0].value;
    const drawdownCurve = equityCurve.map(p => {
      if (p.value > peak) peak = p.value;
      const dd = peak > 0 ? -(((peak - p.value) / peak) * 100) : 0;
      return { date: p.date, drawdown: Math.round(dd * 100) / 100, value: p.value };
    });
    const maxDrawdown = Math.min(...drawdownCurve.map(d => d.drawdown));

    // Prediction alignment
    const bullishPredictions = userPredictions.filter(p => p.predicted_direction === 'UP').length;
    const bearishPredictions = userPredictions.filter(p => p.predicted_direction === 'DOWN').length;

    // Risk radar data
    const radarData = [
      { metric: 'Diversification', value: clamp(100 - hhi / 100, 0, 100) },
      { metric: 'Momentum', value: clamp(50 + totalPnLPct, 0, 100) },
      { metric: 'Confidence', value: clamp(userPredictions.reduce((s, p) => s + p.confidence, 0) / (userPredictions.length || 1), 0, 100) },
      { metric: 'Coverage', value: clamp((userPredictions.length / Math.max(holdings.length, 1)) * 100, 0, 100) },
      { metric: 'Stability', value: clamp(100 - Math.abs(maxDrawdown) * 5, 0, 100) },
    ];

    return {
      holdings, totalValue, totalCost, totalPnL, totalPnLPct,
      sectorData, concentrationRisk, hhi,
      sharpe: Math.round(sharpe * 100) / 100,
      best, worst, equityCurve, drawdownCurve, maxDrawdown,
      bullishPredictions, bearishPredictions, radarData,
    };
  }, [userPortfolio, selectedStocks, userPredictions]);

  // ── CSV Export ───────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!analytics) return;
    const rows = [
      ['Symbol', 'Name', 'Quantity', 'Buy Price', 'Current Price', 'Value', 'P&L', 'P&L %'],
      ...analytics.holdings.map(h => [
        h.stock_symbol, h.stock_name, h.quantity,
        h.purchase_price.toFixed(2), h.current_price.toFixed(2),
        h.currentValue.toFixed(2), h.pnl.toFixed(2), h.pnlPct.toFixed(2),
      ]),
      [],
      ['Total Value', analytics.totalValue.toFixed(2)],
      ['Total P&L',   analytics.totalPnL.toFixed(2)],
      ['Sharpe Ratio', analytics.sharpe.toFixed(2)],
      ['Max Drawdown', analytics.maxDrawdown.toFixed(2) + '%'],
    ];
    const csv   = rows.map(r => r.join(',')).join('\n');
    const blob  = new Blob([csv], { type: 'text/csv' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href = url; a.download = `portfolio-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!analytics) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
          Portfolio Analytics
        </h1>
        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-16 text-center">
          <BarChart2 size={56} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-sm mb-2">No portfolio holdings yet</p>
          <p className="text-gray-600 text-xs">Go to the Dashboard to buy stocks and track your portfolio.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview',      icon: Activity   },
    { id: 'risk',     label: 'Risk Analysis',  icon: Shield     },
    { id: 'sector',   label: 'Sector Split',   icon: PieIcon    },
    { id: 'signals',  label: 'AI Signals',     icon: Zap        },
  ] as const;

  return (
    <div className="max-w-screen-2xl mx-auto space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
            Portfolio Analytics
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Deep analysis of your {analytics.holdings.length} holding{analytics.holdings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/60 border border-gray-700/50 text-sm text-gray-300 hover:text-white transition-colors"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Portfolio"
          value={fmt(analytics.totalValue)}
          sub={`Invested: ${fmt(analytics.totalCost)}`}
          icon={<BarChart2 size={16} className="text-blue-400" />}
          color="bg-blue-900/20"
        />
        <MetricCard
          label="Total P&L"
          value={fmt(analytics.totalPnL)}
          sub={pctFmt(analytics.totalPnLPct) + ' all time'}
          positive={analytics.totalPnL >= 0}
          negative={analytics.totalPnL < 0}
          icon={analytics.totalPnL >= 0 ? <TrendingUp size={16} className="text-emerald-400" /> : <TrendingDown size={16} className="text-red-400" />}
          color={analytics.totalPnL >= 0 ? 'bg-emerald-900/20' : 'bg-red-900/20'}
          tooltip="Total profit or loss across all holdings since purchase date"
        />
        <MetricCard
          label="Sharpe Ratio"
          value={analytics.sharpe.toFixed(2)}
          sub={analytics.sharpe > 1 ? 'Good risk-adjusted return' : analytics.sharpe > 0 ? 'Acceptable' : 'Underperforming'}
          icon={<Award size={16} className="text-amber-400" />}
          color="bg-amber-900/20"
          tooltip="Risk-adjusted return. >1 = good, >2 = excellent. Measures return per unit of risk."
        />
        <MetricCard
          label="Max Drawdown"
          value={analytics.maxDrawdown.toFixed(2) + '%'}
          sub={`Concentration: ${analytics.concentrationRisk}`}
          negative={analytics.maxDrawdown < -15}
          positive={analytics.maxDrawdown > -5}
          icon={<Shield size={16} className="text-violet-400" />}
          color="bg-violet-900/20"
          tooltip="Largest peak-to-trough decline. Lower is better. >-15% is concerning."
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-800/40 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Equity Curve */}
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Portfolio Value (30-day simulation)</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.equityCurve}>
                  <defs>
                    <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [fmt(v), 'Portfolio Value']} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#valueGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Holdings Table */}
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Holdings Breakdown</h2>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Best: <span className="text-emerald-400">{analytics.best?.stock_symbol} ({pctFmt(analytics.best?.pnlPct ?? 0)})</span></span>
                <span>Worst: <span className="text-red-400">{analytics.worst?.stock_symbol} ({pctFmt(analytics.worst?.pnlPct ?? 0)})</span></span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-700/50 bg-gray-800/40">
                    {['Symbol', 'Qty', 'Buy Price', 'Current', 'Value', 'P&L', 'Weight'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/30">
                  {analytics.holdings.map(h => (
                    <tr key={h.stock_symbol} className="hover:bg-gray-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-white">{h.stock_symbol}</p>
                        <p className="text-xs text-gray-400 truncate max-w-28">{h.stock_name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{h.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-300 font-mono">{fmt(h.purchase_price)}</td>
                      <td className="px-4 py-3 text-sm text-white font-mono">{fmt(h.current_price)}</td>
                      <td className="px-4 py-3 text-sm text-white font-mono">{fmt(h.currentValue)}</td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1 text-sm font-medium ${h.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {h.pnl >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                          {pctFmt(h.pnlPct)}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{fmt(h.pnl)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${h.weight * 100}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{(h.weight * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── RISK TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'risk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Drawdown Chart */}
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5">
            <h2 className="text-sm font-semibold text-white mb-1">Drawdown Curve</h2>
            <p className="text-xs text-gray-500 mb-4">Portfolio decline from all-time high</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.drawdownCurve}>
                  <defs>
                    <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <ReferenceLine y={-5}  stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '-5%', fill: '#f59e0b', fontSize: 10 }} />
                  <ReferenceLine y={-15} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '-15%', fill: '#ef4444', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v.toFixed(2)}%`, 'Drawdown']} />
                  <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="url(#ddGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
              <span className="w-3 h-0.5 bg-amber-400 inline-block" /> Warning (-5%)
              <span className="w-3 h-0.5 bg-red-400 inline-block ml-2" /> Danger (-15%)
            </div>
          </div>

          {/* Risk Radar */}
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5">
            <h2 className="text-sm font-semibold text-white mb-1">Portfolio Health Radar</h2>
            <p className="text-xs text-gray-500 mb-4">Higher scores = better portfolio health</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={analytics.radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 9 }} />
                  <Radar name="Score" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Summary */}
          <div className="lg:col-span-2 rounded-xl bg-gray-800/60 border border-gray-700/50 p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Risk Assessment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: 'Concentration Risk',
                  value: analytics.concentrationRisk,
                  desc: `HHI: ${Math.round(analytics.hhi)} (${analytics.concentrationRisk === 'Low' ? '<2500 well diversified' : analytics.concentrationRisk === 'Medium' ? '2500-5000 moderate' : '>5000 concentrated'})`,
                  color: analytics.concentrationRisk === 'Low' ? 'text-emerald-400' : analytics.concentrationRisk === 'Medium' ? 'text-amber-400' : 'text-red-400',
                },
                {
                  label: 'Sharpe Ratio',
                  value: analytics.sharpe >= 1 ? 'Good' : analytics.sharpe >= 0 ? 'Average' : 'Poor',
                  desc: `${analytics.sharpe.toFixed(2)} — ${analytics.sharpe >= 2 ? 'Excellent risk-adjusted returns' : analytics.sharpe >= 1 ? 'Good risk-adjusted returns' : analytics.sharpe >= 0 ? 'Acceptable, room for improvement' : 'Risk not being rewarded'}`,
                  color: analytics.sharpe >= 1 ? 'text-emerald-400' : analytics.sharpe >= 0 ? 'text-amber-400' : 'text-red-400',
                },
                {
                  label: 'Max Drawdown',
                  value: analytics.maxDrawdown > -5 ? 'Low Risk' : analytics.maxDrawdown > -15 ? 'Moderate' : 'High Risk',
                  desc: `${analytics.maxDrawdown.toFixed(2)}% peak drawdown — ${analytics.maxDrawdown > -5 ? 'very stable' : analytics.maxDrawdown > -15 ? 'typical for equities' : 'consider reducing risk'}`,
                  color: analytics.maxDrawdown > -5 ? 'text-emerald-400' : analytics.maxDrawdown > -15 ? 'text-amber-400' : 'text-red-400',
                },
              ].map(item => (
                <div key={item.label} className="bg-gray-700/30 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTOR TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'sector' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Sector Allocation</h2>
            {analytics.sectorData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.sectorData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                      paddingAngle={3} dataKey="value" nameKey="name">
                      {analytics.sectorData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, n: string) => [fmt(v), n]}
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-gray-500 text-sm">
                Select stocks with sector data to see allocation
              </div>
            )}
          </div>

          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Sector Breakdown</h2>
            <div className="space-y-3">
              {analytics.sectorData.map((s, i) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-sm text-gray-200">{s.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-white font-mono">{fmt(s.value)}</span>
                      <span className="text-xs text-gray-500 ml-2">{s.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${s.pct}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>

            {analytics.concentrationRisk !== 'Low' && (
              <div className="mt-5 rounded-xl bg-amber-900/20 border border-amber-500/20 p-3 flex gap-2">
                <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  {analytics.concentrationRisk === 'High'
                    ? 'High sector concentration detected. Consider diversifying across more sectors to reduce risk.'
                    : 'Moderate concentration. Adding 2-3 more sectors would improve diversification.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SIGNALS TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'signals' && (
        <div className="space-y-5">
          {/* Prediction summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Bullish Signals', value: analytics.bullishPredictions, color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-500/20' },
              { label: 'Bearish Signals', value: analytics.bearishPredictions, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/20' },
              { label: 'Neutral Signals', value: userPredictions.length - analytics.bullishPredictions - analytics.bearishPredictions, color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-500/20' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl ${s.bg} border ${s.border} p-5`}>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className={`text-3xl font-bold ${s.color} mt-1`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Predictions list */}
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/50">
              <h2 className="text-sm font-semibold text-white">All AI Predictions</h2>
            </div>
            {userPredictions.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                No predictions yet — run AI predictions from the Predictions page
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-700/50 bg-gray-800/40">
                      {['Symbol', 'Target Date', 'Predicted Price', 'Direction', 'Confidence', 'P&L Impact'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {userPredictions.map(p => {
                      const holding = userPortfolio.find(h => h.stock_symbol === p.stock_symbol);
                      const potentialPnL = holding
                        ? (p.predicted_price - holding.current_price) * holding.quantity
                        : null;
                      return (
                        <tr key={p.id} className="hover:bg-gray-700/20 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-white">{p.stock_symbol}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {new Date(p.target_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-4 py-3 text-sm text-white font-mono">{fmt(p.predicted_price)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              p.predicted_direction === 'UP'   ? 'bg-emerald-900/40 text-emerald-400' :
                              p.predicted_direction === 'DOWN' ? 'bg-red-900/40 text-red-400' :
                              'bg-amber-900/40 text-amber-400'
                            }`}>
                              {p.predicted_direction}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.confidence}%` }} />
                              </div>
                              <span className="text-xs text-gray-300">{p.confidence}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {potentialPnL !== null ? (
                              <span className={`text-sm font-mono ${potentialPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {potentialPnL >= 0 ? '+' : ''}{fmt(potentialPnL)}
                              </span>
                            ) : (
                              <span className="text-gray-600 text-xs">Not held</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
