import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BacktestingEngine, StrategyImplementations } from '../services/backtestingEngine';
import { BacktestResult } from '../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Activity, DollarSign,
  BarChart2, ArrowRight, Download, Info, AlertTriangle,
} from 'lucide-react';

const PERIOD_CONFIG = [
  { label: '1W', days: 7,   description: '1 Week',   note: 'Very short — momentum signals only' },
  { label: '1M', days: 30,  description: '1 Month',  note: 'Short-term signal testing' },
  { label: '3M', days: 90,  description: '3 Months', note: 'Good for RSI/BB strategies' },
  { label: '6M', days: 180, description: '6 Months', note: 'Recommended minimum' },
  { label: '1Y', days: 365, description: '1 Year',   note: 'Best for MA crossover / MACD' },
];

const MetricBox: React.FC<{
  label: string; value: string; positive?: boolean; negative?: boolean; sub?: string
}> = ({ label, value, positive, negative, sub }) => (
  <div className="text-center">
    <p className="text-xs text-gray-400 mb-1">{label}</p>
    <p className={`text-xl font-bold font-mono ${positive ? 'text-emerald-400' : negative ? 'text-red-400' : 'text-white'}`}>
      {value}
    </p>
    {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
  </div>
);

export function BacktestingPage() {
  const { selectedStocks, selectedStrategy, isDarkMode, setBacktestResults } = useAppContext();
  const [selectedPeriod, setSelectedPeriod] = useState('6M');
  const [backtestResults, setLocalBacktestResults] = useState<BacktestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeResult, setActiveResult] = useState<string | null>(null);
  const navigate = useNavigate();

  const runBacktest = async () => {
    if (!selectedStrategy || selectedStocks.length === 0) return;
    setIsRunning(true);
    setLocalBacktestResults([]);
    setProgress(0);

    const periodCfg = PERIOD_CONFIG.find(p => p.label === selectedPeriod) ?? PERIOD_CONFIG[3];
    const endDate   = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - periodCfg.days * 86400000).toISOString().split('T')[0];

    const results: BacktestResult[] = [];
    for (let i = 0; i < selectedStocks.length; i++) {
      const stock = selectedStocks[i];
      try {
        const parameters: Record<string, any> = {};
        selectedStrategy.parameters.forEach(p => { parameters[p.id] = p.defaultValue; });

        const result = await BacktestingEngine.runBacktest(stock, selectedStrategy, parameters, {
          initialCapital: 100000,
          startDate, endDate,
          commission: 10,
          days: periodCfg.days,
        });
        results.push(result);
        if (results.length === 1) setActiveResult(result.stockSymbol);
      } catch (err) {
        console.error(`Backtest failed for ${stock.symbol}:`, err);
      }
      setProgress(Math.round(((i + 1) / selectedStocks.length) * 100));
    }

    setLocalBacktestResults(results);
    if (results.length > 0) setBacktestResults(results[0]);
    setIsRunning(false);
  };

  const exportCSV = () => {
    if (!backtestResults.length) return;
    const rows = [
      ['Symbol', 'Strategy', 'Period', 'Total Return %', 'Annualised %', 'Max Drawdown %', 'Sharpe', 'Trades', 'Final Value'],
      ...backtestResults.map(r => [
        r.stockSymbol, r.strategyId, selectedPeriod,
        r.totalReturn.toFixed(2), r.annualizedReturn.toFixed(2),
        r.maxDrawdown.toFixed(2), r.sharpeRatio.toFixed(2),
        r.trades.length, r.finalValue.toFixed(2),
      ]),
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `backtest-${selectedPeriod}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Aggregate metrics
  const aggregate = backtestResults.length > 0 ? {
    avgReturn:    backtestResults.reduce((s, r) => s + r.totalReturn, 0) / backtestResults.length,
    winRate:      (backtestResults.filter(r => r.totalReturn > 0).length / backtestResults.length) * 100,
    maxDrawdown:  Math.max(...backtestResults.map(r => r.maxDrawdown)),
    avgSharpe:    backtestResults.reduce((s, r) => s + r.sharpeRatio, 0) / backtestResults.length,
    totalTrades:  backtestResults.reduce((s, r) => s + r.trades.length, 0),
  } : null;

  const displayResult = backtestResults.find(r => r.stockSymbol === activeResult) ?? backtestResults[0];

  const periodCfg = PERIOD_CONFIG.find(p => p.label === selectedPeriod);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
            Strategy Backtesting
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Test your strategies against historical NSE/BSE data
          </p>
        </div>
        {backtestResults.length > 0 && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/60 border border-gray-700/50 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <Download size={15} /> Export CSV
          </button>
        )}
      </div>

      {selectedStocks.length === 0 ? (
        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-16 text-center">
          <BarChart2 size={48} className="mx-auto mb-4 text-gray-600" />
          <h2 className="text-xl font-semibold text-white mb-2">No Stocks Selected</h2>
          <p className="text-gray-400 text-sm">Select stocks and a strategy first.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Controls */}
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5 space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-sm font-semibold text-white mb-3">Backtest Period</h2>
                <div className="flex gap-2 flex-wrap">
                  {PERIOD_CONFIG.map(p => (
                    <button
                      key={p.label}
                      onClick={() => setSelectedPeriod(p.label)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                        selectedPeriod === p.label
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-700/60 text-gray-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {periodCfg && (
                  <p className="text-xs text-gray-500 mt-2">
                    <Info size={11} className="inline mr-1" />
                    {periodCfg.note}
                  </p>
                )}
              </div>
              <button
                onClick={runBacktest}
                disabled={!selectedStrategy || isRunning}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  !selectedStrategy || isRunning
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                }`}
              >
                {isRunning ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Running… {progress}%</>
                ) : (
                  <><BarChart2 size={15} /> Run Backtest</>
                )}
              </button>
            </div>

            {selectedStrategy && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-700/30 border border-gray-600/30">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{selectedStrategy.name}</p>
                  <p className="text-xs text-gray-400">{selectedStrategy.description}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  selectedStrategy.riskLevel === 'Low' ? 'bg-emerald-900/40 text-emerald-400' :
                  selectedStrategy.riskLevel === 'Medium' ? 'bg-amber-900/40 text-amber-400' :
                  'bg-red-900/40 text-red-400'
                }`}>{selectedStrategy.riskLevel} Risk</span>
              </div>
            )}

            {/* Period warning for short tests */}
            {(selectedPeriod === '1W' || selectedPeriod === '1M') && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-900/20 border border-amber-500/20">
                <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  <strong>Short period warning:</strong> {selectedPeriod === '1W' ? '1-week' : '1-month'} backtests have limited data.
                  Strategies with long moving average periods (e.g. 50-day MA) will use shorter adapted periods.
                  Results may not be statistically significant. Use 3M–1Y for reliable analysis.
                </p>
              </div>
            )}

            {/* Progress bar */}
            {isRunning && (
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Backtesting {selectedStocks.length} stocks…</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Aggregate metrics */}
          {aggregate && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Avg Return', value: `${aggregate.avgReturn >= 0 ? '+' : ''}${aggregate.avgReturn.toFixed(2)}%`, positive: aggregate.avgReturn >= 0, negative: aggregate.avgReturn < 0 },
                { label: 'Win Rate', value: `${aggregate.winRate.toFixed(1)}%`, positive: aggregate.winRate >= 50 },
                { label: 'Max Drawdown', value: `-${aggregate.maxDrawdown.toFixed(2)}%`, negative: aggregate.maxDrawdown > 10 },
                { label: 'Avg Sharpe', value: aggregate.avgSharpe.toFixed(2), positive: aggregate.avgSharpe > 1 },
                { label: 'Total Trades', value: aggregate.totalTrades.toString(), sub: `${backtestResults.length} stocks` },
              ].map(m => (
                <div key={m.label} className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">{m.label}</p>
                  <p className={`text-xl font-bold font-mono ${m.positive ? 'text-emerald-400' : m.negative ? 'text-red-400' : 'text-white'}`}>
                    {m.value}
                  </p>
                  {m.sub && <p className="text-xs text-gray-500 mt-0.5">{m.sub}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Main charts area */}
          {backtestResults.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              {/* Stock selector */}
              <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700/50">
                  <h3 className="text-sm font-semibold text-white">Results</h3>
                </div>
                <div className="p-2 space-y-1">
                  {backtestResults.map(r => (
                    <button
                      key={r.stockSymbol}
                      onClick={() => setActiveResult(r.stockSymbol)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                        activeResult === r.stockSymbol
                          ? 'bg-emerald-900/20 border border-emerald-500/20'
                          : 'hover:bg-gray-700/40'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{r.stockSymbol}</p>
                        <p className="text-xs text-gray-500">{r.trades.length} trades</p>
                      </div>
                      <span className={`text-xs font-bold ${r.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {r.totalReturn >= 0 ? '+' : ''}{r.totalReturn.toFixed(2)}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Equity curve + metrics */}
              <div className="lg:col-span-3 space-y-4">
                {displayResult && (
                  <>
                    {/* Metrics row */}
                    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white">{displayResult.stockSymbol} — {selectedPeriod}</h3>
                        <span className="text-xs text-gray-500">Initial: ₹1,00,000</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                        <MetricBox
                          label="Total Return"
                          value={`${displayResult.totalReturn >= 0 ? '+' : ''}${displayResult.totalReturn.toFixed(2)}%`}
                          positive={displayResult.totalReturn >= 0}
                          negative={displayResult.totalReturn < 0}
                        />
                        <MetricBox
                          label="Annualised"
                          value={`${displayResult.annualizedReturn >= 0 ? '+' : ''}${displayResult.annualizedReturn.toFixed(1)}%`}
                          positive={displayResult.annualizedReturn >= 0}
                          negative={displayResult.annualizedReturn < 0}
                        />
                        <MetricBox
                          label="Final Value"
                          value={`₹${Math.round(displayResult.finalValue / 1000)}k`}
                          positive={displayResult.finalValue > displayResult.initialInvestment}
                        />
                        <MetricBox
                          label="Max Drawdown"
                          value={`-${displayResult.maxDrawdown.toFixed(1)}%`}
                          negative={displayResult.maxDrawdown > 10}
                        />
                        <MetricBox
                          label="Sharpe"
                          value={displayResult.sharpeRatio.toFixed(2)}
                          positive={displayResult.sharpeRatio > 1}
                          negative={displayResult.sharpeRatio < 0}
                        />
                        <MetricBox
                          label="Trades"
                          value={String(displayResult.trades.length)}
                          sub={`${displayResult.trades.filter(t => t.type === 'BUY').length} buy`}
                        />
                      </div>
                    </div>

                    {/* Equity Curve */}
                    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5">
                      <h3 className="text-sm font-semibold text-white mb-4">Equity Curve</h3>
                      {displayResult.equityCurve.length >= 2 ? (
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={displayResult.equityCurve}>
                              <defs>
                                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%"  stopColor={displayResult.totalReturn >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.25} />
                                  <stop offset="95%" stopColor={displayResult.totalReturn >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                              <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} domain={['auto', 'auto']} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
                                formatter={(v: number) => [`₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Portfolio']}
                              />
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke={displayResult.totalReturn >= 0 ? '#10b981' : '#ef4444'}
                                fill="url(#eqGrad)"
                                strokeWidth={2}
                                dot={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-52 flex items-center justify-center text-gray-500 text-sm">
                          Not enough data points to render equity curve for this period.
                          Try a longer period (3M+).
                        </div>
                      )}
                    </div>

                    {/* Trade Log */}
                    {displayResult.trades.length > 0 && (
                      <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-700/50">
                          <h3 className="text-sm font-semibold text-white">Trade Log ({displayResult.trades.length} trades)</h3>
                        </div>
                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                          <table className="min-w-full">
                            <thead className="bg-gray-800/40 sticky top-0">
                              <tr>
                                {['Date', 'Type', 'Price', 'Qty', 'Value', 'P&L'].map(h => (
                                  <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-400">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/30">
                              {displayResult.trades.map((t, i) => (
                                <tr key={i} className="hover:bg-gray-700/20">
                                  <td className="px-4 py-2 text-xs text-gray-400">{t.date.slice(5)}</td>
                                  <td className="px-4 py-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                      t.type === 'BUY' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'
                                    }`}>{t.type}</span>
                                  </td>
                                  <td className="px-4 py-2 text-xs text-white font-mono">₹{t.price.toFixed(2)}</td>
                                  <td className="px-4 py-2 text-xs text-gray-300">{t.quantity}</td>
                                  <td className="px-4 py-2 text-xs text-gray-300 font-mono">₹{t.value.toFixed(0)}</td>
                                  <td className="px-4 py-2 text-xs font-mono">
                                    {t.pnl !== undefined ? (
                                      <span className={t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                        {t.pnl >= 0 ? '+' : ''}₹{t.pnl.toFixed(0)}
                                      </span>
                                    ) : <span className="text-gray-600">—</span>}
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
              </div>
            </div>
          )}

          {/* All stocks summary table */}
          {backtestResults.length > 1 && (
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700/50">
                <h2 className="text-sm font-semibold text-white">All Stocks Summary</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-700/50 bg-gray-800/40">
                      {['Stock', 'Return', 'Annualised', 'Max Drawdown', 'Sharpe', 'Trades', 'Final Value'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {backtestResults.map(r => (
                      <tr key={r.stockSymbol}
                        className={`hover:bg-gray-700/20 transition-colors cursor-pointer ${activeResult === r.stockSymbol ? 'bg-emerald-900/10' : ''}`}
                        onClick={() => setActiveResult(r.stockSymbol)}
                      >
                        <td className="px-4 py-3 text-sm font-bold text-white">{r.stockSymbol}</td>
                        <td className={`px-4 py-3 text-sm font-bold ${r.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {r.totalReturn >= 0 ? '+' : ''}{r.totalReturn.toFixed(2)}%
                        </td>
                        <td className={`px-4 py-3 text-sm ${r.annualizedReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {r.annualizedReturn >= 0 ? '+' : ''}{r.annualizedReturn.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-red-400">-{r.maxDrawdown.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{r.sharpeRatio.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{r.trades.length}</td>
                        <td className="px-4 py-3 text-sm text-white font-mono">₹{Math.round(r.finalValue).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Proceed to predictions */}
          {backtestResults.length > 0 && (
            <div className="rounded-xl bg-emerald-900/20 border border-emerald-500/20 p-5 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-300">Backtesting Complete!</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Your results will be used to boost AI prediction confidence.
                </p>
              </div>
              <button
                onClick={() => navigate('/predictions')}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
              >
                Go to AI Predictions <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
