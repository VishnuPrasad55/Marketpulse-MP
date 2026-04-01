import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { PredictionEngine, DetailedPrediction } from '../services/predictionEngine';
import { AlgoExecutor, AlgoRunResult } from '../services/algoExecutor';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, AlertTriangle, Brain, ArrowRight,
  Info, ChevronDown, ChevronUp, Minus, Code2, Zap,
} from 'lucide-react';

type StockPrediction = {
  symbol: string;
  name: string;
  price: number;
  prediction: DetailedPrediction;
  chartData: { date: string; actual: number | null; predicted: number; low: number; high: number }[];
  algoResult?: AlgoRunResult | null;
};

const dirColor = (dir: string) =>
  dir === 'UP' ? 'text-emerald-400' : dir === 'DOWN' ? 'text-red-400' : 'text-amber-400';

const dirIcon = (dir: string, size = 16) =>
  dir === 'UP'
    ? <TrendingUp size={size} className="text-emerald-400" />
    : dir === 'DOWN'
    ? <TrendingDown size={size} className="text-red-400" />
    : <Minus size={size} className="text-amber-400" />;

const strengthBar = (strength: number, dir: string) => (
  <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-700 ${dir === 'UP' ? 'bg-emerald-500' : dir === 'DOWN' ? 'bg-red-500' : 'bg-amber-500'}`}
      style={{ width: `${Math.round(strength * 100)}%` }}
    />
  </div>
);

export function PredictionsPage() {
  const { isDarkMode, selectedStocks, savePrediction, backtestResults } = useAppContext();
  const [predDays, setPredDays] = useState(7);
  const [results, setResults] = useState<StockPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [useCustomAlgo, setUseCustomAlgo] = useState(false);
  const [customCode, setCustomCode] = useState<string | null>(() => {
    // Load saved strategy from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('mp_strategies') ?? '[]');
      return saved[0]?.code ?? null;
    } catch { return null; }
  });
  const [savedStrategies, setSavedStrategies] = useState<{ name: string; code: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('mp_strategies') ?? '[]'); } catch { return []; }
  });
  const navigate = useNavigate();

  const run = async () => {
    if (!selectedStocks.length) return;
    setLoading(true);
    const out: StockPrediction[] = [];

    for (const stock of selectedStocks) {
      const bt = Array.isArray(backtestResults)
        ? backtestResults.find(r => r.stockSymbol === stock.symbol)
        : backtestResults?.stockSymbol === stock.symbol ? backtestResults : null;

      // Run AI prediction
      const pred = await PredictionEngine.generatePrediction(
        stock, { days: predDays, confidence: 80, useML: true }, bt
      );

      // Run custom algo if enabled
      let algoResult: AlgoRunResult | null = null;
      if (useCustomAlgo && customCode) {
        try {
          algoResult = await AlgoExecutor.run(customCode, stock.symbol, stock.price);
        } catch { /* ignore */ }
      }

      // Blend algo result with AI prediction if custom algo is active
      let finalPred = pred;
      if (algoResult && !algoResult.error) {
        const algoWeight = 0.5; // 50/50 blend
        const aiPrice = pred.predictedPrice;
        const algoPrice = algoResult.predictedPrice ?? stock.price;
        const blendedPrice = aiPrice * (1 - algoWeight) + algoPrice * algoWeight;

        // Blend confidence
        const blendedConf = Math.round(pred.confidence * (1 - algoWeight) + algoResult.confidence * algoWeight);

        // Direction: prefer agreement, else use weighted
        let blendedDir = pred.predictedDirection;
        if (algoResult.predictedDirection === pred.predictedDirection) {
          blendedDir = pred.predictedDirection;
        } else if (algoResult.predictedDirection !== 'NEUTRAL') {
          // Custom algo has stronger signal: blend
          blendedDir = algoWeight >= 0.5 ? algoResult.predictedDirection : pred.predictedDirection;
        }

        finalPred = {
          ...pred,
          predictedPrice: Math.round(blendedPrice * 100) / 100,
          predictedDirection: blendedDir,
          confidence: blendedConf,
          priceRange: {
            low: Math.min(pred.priceRange.low, algoPrice * 0.97),
            high: Math.max(pred.priceRange.high, algoPrice * 1.03),
          },
        };
      }

      // Build chart
      const chartData = Array.from({ length: predDays + 1 }, (_, i) => {
        const dt = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
        const frac = i / predDays;
        const predicted = stock.price + (finalPred.predictedPrice - stock.price) * frac;
        const band = (finalPred.priceRange.high - finalPred.priceRange.low) / 2 * frac;
        return {
          date: dt,
          actual: i === 0 ? stock.price : null,
          predicted: Math.round(predicted * 100) / 100,
          low:  Math.round((predicted - band) * 100) / 100,
          high: Math.round((predicted + band) * 100) / 100,
        };
      });

      out.push({ symbol: stock.symbol, name: stock.name, price: stock.price, prediction: finalPred, chartData, algoResult });
    }

    setResults(out);
    setLoading(false);
  };

  const save = async () => {
    for (const r of results) {
      await savePrediction({
        stock_symbol: r.symbol,
        predicted_price: r.prediction.predictedPrice,
        predicted_direction: r.prediction.predictedDirection,
        confidence: r.prediction.confidence,
        target_date: new Date(Date.now() + predDays * 86400000).toISOString().slice(0, 10),
      });
    }
    navigate('/dashboard');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
            AI Predictions
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Technical analysis + optional custom algorithm forecasting
          </p>
        </div>
        {results.length > 0 && (
          <button
            onClick={save}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
          >
            Save & Go to Dashboard <ArrowRight size={15} />
          </button>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-xl bg-blue-900/20 border border-blue-500/20 p-4 flex gap-3">
        <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300 leading-relaxed space-y-1">
          <p className="font-semibold text-blue-200 text-sm">How predictions work</p>
          <p><strong className="text-blue-100">Trend (30%)</strong> — 60-day linear regression slope. Positive slope = uptrend.</p>
          <p><strong className="text-blue-100">RSI (35%)</strong> — 14-day RSI. Below 35 = oversold (buy). Above 65 = overbought (sell).</p>
          <p><strong className="text-blue-100">MACD (35%)</strong> — 12-26-9 EMA crossover. MACD above signal = bullish.</p>
          <p className="text-blue-400">⚠️ Technical signals only — not financial advice.</p>
        </div>
      </div>

      {selectedStocks.length === 0 ? (
        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-16 text-center">
          <Brain size={48} className="mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">Select stocks to generate predictions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: controls + results */}
          <div className="lg:col-span-2 space-y-5">
            {/* Controls */}
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm text-gray-300">Forecast horizon:</label>
                  <div className="flex gap-2">
                    {[1, 7, 30, 90].map(d => (
                      <button
                        key={d}
                        onClick={() => setPredDays(d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          predDays === d ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        {d === 1 ? '1D' : d === 7 ? '1W' : d === 30 ? '1M' : '3M'}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={run}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white text-sm font-semibold transition-colors"
                >
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analysing…</>
                    : <><Brain size={15} /> Generate Predictions</>
                  }
                </button>
              </div>

              {/* Custom algo toggle */}
              <div className="border-t border-gray-700/50 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 size={15} className="text-violet-400" />
                    <span className="text-sm text-gray-300 font-medium">Use Custom Algorithm</span>
                    {useCustomAlgo && customCode && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-400 border border-violet-500/20">
                        50% weight
                      </span>
                    )}
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomAlgo}
                      onChange={e => setUseCustomAlgo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-10 h-5 bg-gray-600 rounded-full peer peer-checked:bg-violet-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>

                {useCustomAlgo && (
                  <div className="mt-3">
                    {savedStrategies.length === 0 ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-900/20 border border-violet-500/20">
                        <AlertTriangle size={14} className="text-violet-400 flex-shrink-0" />
                        <p className="text-xs text-violet-300">
                          No saved strategies found.{' '}
                          <button onClick={() => navigate('/algo-editor')} className="underline hover:text-violet-200">
                            Go to Algo Editor
                          </button>{' '}
                          to write and save one.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">Select a saved strategy to blend with AI predictions:</p>
                        <div className="flex flex-wrap gap-2">
                          {savedStrategies.map(s => (
                            <button
                              key={s.name}
                              onClick={() => setCustomCode(s.code)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                customCode === s.code
                                  ? 'bg-violet-900/40 text-violet-400 border-violet-500/30'
                                  : 'bg-gray-700 text-gray-400 border-gray-600 hover:text-white'
                              }`}
                            >
                              {s.name}
                            </button>
                          ))}
                        </div>
                        {customCode && (
                          <p className="text-xs text-gray-500">
                            AI signals (50%) + your algorithm (50%) = blended prediction
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Result cards */}
            {results.length === 0 ? (
              <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-16 text-center">
                <Brain size={56} className="mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-sm">
                  {selectedStocks.length} stocks ready · Click <strong>Generate Predictions</strong> above
                </p>
              </div>
            ) : results.map(r => {
              const p = r.prediction;
              const exp = expanded === r.symbol;
              const pnl = p.predictedPrice - r.price;
              const pnlPct = (pnl / r.price) * 100;

              return (
                <div key={r.symbol} className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
                  {/* Card header */}
                  <div className="p-5 border-b border-gray-700/50">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white font-mono">{r.symbol}</span>
                          <span className={`flex items-center gap-1 text-sm font-semibold ${dirColor(p.predictedDirection)}`}>
                            {dirIcon(p.predictedDirection, 14)}
                            {p.predictedDirection}
                          </span>
                          {r.algoResult && !r.algoResult.error && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-900/30 text-violet-400 border border-violet-500/20 flex items-center gap-1">
                              <Zap size={9} /> AI+Algo blend
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{r.name}</p>
                      </div>

                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <p className="text-xs text-gray-500">Current</p>
                          <p className="text-base font-bold text-white font-mono">₹{r.price.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{predDays}d Forecast</p>
                          <p className="text-base font-bold text-white font-mono">₹{p.predictedPrice.toFixed(2)}</p>
                          <p className={`text-xs font-medium ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Confidence</p>
                          <p className="text-base font-bold text-white">{p.confidence}%</p>
                        </div>
                      </div>
                    </div>

                    {/* Confidence bar */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-20">Confidence</span>
                      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            p.confidence > 70 ? 'bg-emerald-500' : p.confidence > 55 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${p.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">{p.confidence}%</span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <span>Range:</span>
                      <span className="text-red-400 font-mono">₹{p.priceRange.low.toFixed(2)}</span>
                      <span>—</span>
                      <span className="text-emerald-400 font-mono">₹{p.priceRange.high.toFixed(2)}</span>
                      {r.algoResult && !r.algoResult.error && (
                        <>
                          <span className="ml-2 text-gray-600">·</span>
                          <span className="text-violet-400 flex items-center gap-1">
                            <Code2 size={10} /> Algo: {r.algoResult.finalSignal}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="p-4 h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={r.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`grad-${r.symbol}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={p.predictedDirection === 'UP' ? '#10b981' : '#ef4444'} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={p.predictedDirection === 'UP' ? '#10b981' : '#ef4444'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} />
                        <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 10 }} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#f3f4f6' }} />
                        <Area type="monotone" dataKey="high" stroke="transparent" fill={`url(#grad-${r.symbol})`} name="Upper band" />
                        <Area type="monotone" dataKey="predicted"
                          stroke={p.predictedDirection === 'UP' ? '#10b981' : p.predictedDirection === 'DOWN' ? '#ef4444' : '#f59e0b'}
                          fill="none" strokeWidth={2} strokeDasharray="5 3" name="Predicted"
                        />
                        <Area type="monotone" dataKey="actual" stroke="#6366f1" fill="none" strokeWidth={2} name="Current" />
                        <ReferenceLine y={r.price} stroke="#6b7280" strokeDasharray="3 3" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Signal breakdown toggle */}
                  <div className="border-t border-gray-700/50">
                    <button
                      onClick={() => setExpanded(exp ? null : r.symbol)}
                      className="w-full flex items-center justify-between px-5 py-3 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      <span className="font-medium">Signal Breakdown</span>
                      {exp ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    {exp && (
                      <div className="px-5 pb-5 space-y-4">
                        {/* Trend */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {dirIcon(p.signals.trend.direction, 13)}
                            <span className="text-xs font-semibold text-gray-300">TREND (30%)</span>
                            {strengthBar(p.signals.trend.strength, p.signals.trend.direction)}
                            <span className={`text-xs font-bold w-12 text-right ${dirColor(p.signals.trend.direction)}`}>
                              {Math.round(p.signals.trend.strength * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 ml-5">{p.signals.trend.description}</p>
                        </div>

                        {/* RSI */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {dirIcon(p.signals.rsi.direction, 13)}
                            <span className="text-xs font-semibold text-gray-300">RSI={p.signals.rsi.value} (35%)</span>
                            {strengthBar(p.signals.rsi.strength, p.signals.rsi.direction)}
                            <span className={`text-xs font-bold w-12 text-right ${dirColor(p.signals.rsi.direction)}`}>
                              {Math.round(p.signals.rsi.strength * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 ml-5">{p.signals.rsi.description}</p>
                        </div>

                        {/* MACD */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {dirIcon(p.signals.macd.direction, 13)}
                            <span className="text-xs font-semibold text-gray-300">MACD (35%)</span>
                            {strengthBar(p.signals.macd.strength, p.signals.macd.direction)}
                            <span className={`text-xs font-bold w-12 text-right ${dirColor(p.signals.macd.direction)}`}>
                              {Math.round(p.signals.macd.strength * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 ml-5">{p.signals.macd.description}</p>
                        </div>

                        {/* Custom algo signal */}
                        {r.algoResult && !r.algoResult.error && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Zap size={13} className="text-violet-400" />
                              <span className="text-xs font-semibold text-gray-300">CUSTOM ALGO (50% blend)</span>
                              <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                                r.algoResult.finalSignal === 'BUY' ? 'bg-emerald-900/40 text-emerald-400' :
                                r.algoResult.finalSignal === 'SELL' ? 'bg-red-900/40 text-red-400' :
                                'bg-amber-900/40 text-amber-400'
                              }`}>{r.algoResult.finalSignal}</span>
                            </div>
                            <p className="text-xs text-gray-500 ml-5">
                              Confidence: {r.algoResult.confidence}% · Predicted: ₹{r.algoResult.predictedPrice?.toFixed(2)}
                            </p>
                          </div>
                        )}

                        <div className="rounded-lg bg-gray-700/40 p-3 text-xs text-gray-400">
                          <span className="font-semibold text-gray-300">Backtest influence: </span>
                          {p.backtestInfluence}
                        </div>
                        <div className="rounded-lg bg-gray-700/40 p-3 text-xs text-gray-400">
                          <span className="font-semibold text-gray-300">Methodology: </span>
                          {p.methodology}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: summary panel */}
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700/50">
                <h3 className="text-sm font-semibold text-white">Market Summary</h3>
              </div>
              <div className="p-4 space-y-3">
                {results.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">Generate predictions to see summary</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {(['UP','NEUTRAL','DOWN'] as const).map(d => (
                        <div key={d} className={`p-2 rounded-lg text-center ${
                          d === 'UP' ? 'bg-emerald-900/30' : d === 'DOWN' ? 'bg-red-900/30' : 'bg-amber-900/30'
                        }`}>
                          <p className={`text-lg font-bold ${dirColor(d)}`}>
                            {results.filter(r => r.prediction.predictedDirection === d).length}
                          </p>
                          <p className={`text-[10px] font-medium ${dirColor(d)}`}>{d}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Avg Confidence</p>
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.round(results.reduce((s, r) => s + r.prediction.confidence, 0) / results.length)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-300 mt-1">
                        {Math.round(results.reduce((s, r) => s + r.prediction.confidence, 0) / results.length)}%
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Custom algo CTA */}
            <div className="rounded-xl bg-violet-900/20 border border-violet-500/20 p-4">
              <div className="flex items-start gap-2 mb-3">
                <Code2 size={15} className="text-violet-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-violet-300">Custom Algorithm</p>
                  <p className="text-xs text-violet-400/70 mt-0.5">
                    Write your own trading strategy and blend it with AI predictions
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/algo-editor')}
                className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
              >
                Open Algo Editor →
              </button>
            </div>

            <div className="rounded-xl bg-amber-900/20 border border-amber-500/20 p-4">
              <div className="flex gap-2">
                <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300 leading-relaxed">
                  Predictions are based on historical technical patterns. They do not account for earnings, macro events, or geopolitical risk. Always do your own research.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
