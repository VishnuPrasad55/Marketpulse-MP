import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Save, RotateCcw, ChevronDown, Code2, Terminal,
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2,
  BookOpen, Lightbulb, Copy, Trash2, Clock, Zap, BarChart2,
  ChevronRight, Info,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  AlgoExecutor, AlgoRunResult, ALGO_TEMPLATES,
} from '../services/algoExecutor';

// ─── Minimal code editor with line numbers ────────────────────────────────────
const CodeEditor: React.FC<{
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
}> = ({ value, onChange, error }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const lines = value.split('\n');

  const syncScroll = () => {
    if (textareaRef.current && lineNumRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newVal = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  return (
    <div className={`relative flex rounded-xl overflow-hidden border font-mono text-sm ${
      error ? 'border-red-500/50' : 'border-gray-700/50'
    } bg-gray-950`} style={{ height: '480px' }}>
      {/* Line numbers */}
      <div
        ref={lineNumRef}
        className="select-none overflow-hidden flex-shrink-0 bg-gray-900/80 border-r border-gray-800/60 text-right px-3 pt-3"
        style={{ width: '48px', overflowY: 'hidden' }}
      >
        {lines.map((_, i) => (
          <div key={i} className="text-gray-600 leading-6 text-xs">{i + 1}</div>
        ))}
      </div>

      {/* Editor textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className="flex-1 bg-transparent text-gray-100 leading-6 p-3 resize-none focus:outline-none overflow-auto"
        style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          fontSize: '13px',
          tabSize: 2,
          caretColor: '#10b981',
        }}
      />
    </div>
  );
};

// ─── Result badge ─────────────────────────────────────────────────────────────
const SignalBadge: React.FC<{ signal: 'BUY' | 'SELL' | 'HOLD' }> = ({ signal }) => {
  const cfg = {
    BUY:  { cls: 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30', icon: <TrendingUp size={12} /> },
    SELL: { cls: 'bg-red-900/40 text-red-400 border-red-500/30',             icon: <TrendingDown size={12} /> },
    HOLD: { cls: 'bg-amber-900/40 text-amber-400 border-amber-500/30',       icon: <Minus size={12} /> },
  }[signal];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg.cls}`}>
      {cfg.icon}{signal}
    </span>
  );
};

// ─── Docs panel ───────────────────────────────────────────────────────────────
const DocsPanel: React.FC = () => (
  <div className="space-y-4 text-xs text-gray-400 overflow-y-auto max-h-[480px] custom-scrollbar pr-1">
    <div>
      <p className="text-emerald-400 font-semibold mb-1 text-sm">Strategy Structure</p>
      <pre className="bg-gray-900/80 rounded-lg p-3 text-gray-300 text-xs leading-5 overflow-x-auto">{`function strategy(ctx) {
  const { prices, dates,
          volumes, symbol,
          currentPrice } = ctx;

  // Your logic here...

  signal('BUY');           // required
  predict(price,           // optional
    'UP', confidence);
}`}</pre>
    </div>

    <div>
      <p className="text-emerald-400 font-semibold mb-1">Indicator Functions</p>
      <div className="space-y-1.5">
        {[
          ['sma(prices, period)', '→ number[] — Simple Moving Average'],
          ['ema(prices, period)', '→ number[] — Exponential Moving Average'],
          ['rsi(prices, period)', '→ number[] — RSI (default period=14)'],
          ['macd(prices, f, s, sig)', '→ { macd, signal, histogram }'],
          ['bollingerBands(prices, p, std)', '→ { upper, middle, lower }'],
          ['atr(highs, lows, closes, p)', '→ number[] — Average True Range'],
          ['stdDev(prices)', '→ number — Standard deviation'],
          ['highest(prices, period)', '→ number[] — Rolling max'],
          ['lowest(prices, period)', '→ number[] — Rolling min'],
          ['crossover(a, b)', '→ boolean — Did a cross above b?'],
          ['crossunder(a, b)', '→ boolean — Did a cross below b?'],
        ].map(([fn, desc]) => (
          <div key={fn as string} className="bg-gray-900/60 rounded-lg p-2">
            <code className="text-emerald-300">{fn as string}</code>
            <p className="text-gray-500 mt-0.5">{desc as string}</p>
          </div>
        ))}
      </div>
    </div>

    <div>
      <p className="text-emerald-400 font-semibold mb-1">Output Functions</p>
      <div className="space-y-1.5">
        <div className="bg-gray-900/60 rounded-lg p-2">
          <code className="text-emerald-300">signal('BUY' | 'SELL' | 'HOLD')</code>
          <p className="text-gray-500 mt-0.5">Required. Sets the trade signal.</p>
        </div>
        <div className="bg-gray-900/60 rounded-lg p-2">
          <code className="text-emerald-300">predict(price, direction, confidence)</code>
          <p className="text-gray-500 mt-0.5">Optional. Set your price target (0–100 confidence).</p>
        </div>
        <div className="bg-gray-900/60 rounded-lg p-2">
          <code className="text-emerald-300">console.log(...)</code>
          <p className="text-gray-500 mt-0.5">Output to the console panel below.</p>
        </div>
      </div>
    </div>

    <div className="rounded-lg bg-blue-900/20 border border-blue-500/20 p-3">
      <div className="flex gap-2">
        <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-blue-300 leading-relaxed">
          Your strategy runs against 6 months of historical data. The <strong>last signal</strong> generated becomes the trading recommendation.
          Use <code className="text-blue-200">predict()</code> to also set a price target which will appear on the Predictions page.
        </p>
      </div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AlgoEditorPage: React.FC = () => {
  const { selectedStocks, isDarkMode } = useAppContext();

  const [code, setCode] = useState(ALGO_TEMPLATES.maCrossover.code);
  const [savedStrategies, setSavedStrategies] = useState<{ name: string; code: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('mp_strategies') ?? '[]'); } catch { return []; }
  });
  const [strategyName, setStrategyName] = useState('My Strategy');
  const [selectedTemplate, setSelectedTemplate] = useState('maCrossover');
  const [activeTab, setActiveTab] = useState<'editor' | 'docs'>('editor');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [runResults, setRunResults] = useState<Map<string, AlgoRunResult>>(new Map());
  const [running, setRunning] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeStock, setActiveStock] = useState<string | null>(null);

  // Validate on code change
  useEffect(() => {
    const { valid, error } = AlgoExecutor.validate(code);
    setValidationError(valid ? null : (error ?? null));
  }, [code]);

  const runOnAll = useCallback(async () => {
    if (selectedStocks.length === 0) return;
    const { valid, error } = AlgoExecutor.validate(code);
    if (!valid) { setValidationError(error ?? 'Invalid code'); return; }

    setRunning(true);
    const newResults = new Map<string, AlgoRunResult>();

    for (const stock of selectedStocks) {
      try {
        const result = await AlgoExecutor.run(code, stock.symbol, stock.price);
        newResults.set(stock.symbol, result);
      } catch (e: any) {
        newResults.set(stock.symbol, {
          signals: [], predictedPrice: stock.price, predictedDirection: 'NEUTRAL',
          confidence: 0, finalSignal: 'HOLD', error: e?.message ?? 'Unknown error',
          executionTime: 0, logs: [],
        });
      }
    }

    setRunResults(newResults);
    setActiveStock(selectedStocks[0]?.symbol ?? null);
    setRunning(false);
  }, [code, selectedStocks]);

  const saveStrategy = () => {
    const updated = [...savedStrategies.filter(s => s.name !== strategyName), { name: strategyName, code }];
    setSavedStrategies(updated);
    localStorage.setItem('mp_strategies', JSON.stringify(updated));
  };

  const loadTemplate = (key: string) => {
    setCode(ALGO_TEMPLATES[key].code);
    setSelectedTemplate(key);
    setShowTemplates(false);
    setRunResults(new Map());
  };

  const loadSaved = (s: { name: string; code: string }) => {
    setCode(s.code);
    setStrategyName(s.name);
    setShowSaved(false);
    setRunResults(new Map());
  };

  const deleteSaved = (name: string) => {
    const updated = savedStrategies.filter(s => s.name !== name);
    setSavedStrategies(updated);
    localStorage.setItem('mp_strategies', JSON.stringify(updated));
  };

  const activeResult = activeStock ? runResults.get(activeStock) : null;

  return (
    <div className="max-w-screen-2xl mx-auto space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
            Algorithm Editor
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Write custom trading strategies in JavaScript — run them against live historical data
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Template picker */}
          <div className="relative">
            <button
              onClick={() => { setShowTemplates(v => !v); setShowSaved(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700/50 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <BookOpen size={15} /> Templates <ChevronDown size={13} />
            </button>
            {showTemplates && (
              <div className="absolute right-0 mt-1.5 w-64 bg-gray-800 border border-gray-700/60 rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-up">
                {Object.entries(ALGO_TEMPLATES).map(([key, tmpl]) => (
                  <button
                    key={key}
                    onClick={() => loadTemplate(key)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-700/60 transition-colors ${selectedTemplate === key ? 'bg-emerald-900/20' : ''}`}
                  >
                    <p className="text-sm text-white font-medium">{tmpl.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tmpl.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Saved strategies */}
          {savedStrategies.length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setShowSaved(v => !v); setShowTemplates(false); }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700/50 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <Code2 size={15} /> Saved ({savedStrategies.length}) <ChevronDown size={13} />
              </button>
              {showSaved && (
                <div className="absolute right-0 mt-1.5 w-64 bg-gray-800 border border-gray-700/60 rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-up">
                  {savedStrategies.map(s => (
                    <div key={s.name} className="flex items-center gap-2 px-4 py-3 hover:bg-gray-700/40 transition-colors">
                      <button onClick={() => loadSaved(s)} className="flex-1 text-left">
                        <p className="text-sm text-white font-medium">{s.name}</p>
                      </button>
                      <button onClick={() => deleteSaved(s.name)} className="text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save button */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={strategyName}
              onChange={e => setStrategyName(e.target.value)}
              className="px-3 py-2 rounded-l-xl bg-gray-800/60 border border-gray-700/50 border-r-0 text-sm text-white focus:outline-none focus:border-emerald-500/50 w-36"
              placeholder="Strategy name"
            />
            <button
              onClick={saveStrategy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-r-xl bg-gray-800 border border-gray-700/50 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <Save size={14} /> Save
            </button>
          </div>

          {/* Run button */}
          <button
            onClick={runOnAll}
            disabled={running || selectedStocks.length === 0 || !!validationError}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
              running || selectedStocks.length === 0 || validationError
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
            }`}
          >
            {running ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Running…</>
            ) : (
              <><Play size={15} /> Run on Selected Stocks</>
            )}
          </button>
        </div>
      </div>

      {/* No stocks selected warning */}
      {selectedStocks.length === 0 && (
        <div className="rounded-xl bg-amber-900/20 border border-amber-500/20 p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">
            Select stocks from the <strong>Stocks</strong> page first, then run your strategy against them.
          </p>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Editor column */}
        <div className="xl:col-span-2 space-y-4">
          {/* Tab bar */}
          <div className="flex items-center gap-2">
            {(['editor', 'docs'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'editor' ? <Code2 size={14} /> : <BookOpen size={14} />}
                {tab === 'editor' ? 'Code Editor' : 'API Reference'}
              </button>
            ))}

            {/* Validation status */}
            <div className="ml-auto">
              {validationError ? (
                <div className="flex items-center gap-1.5 text-red-400 text-xs">
                  <AlertTriangle size={12} /> {validationError}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                  <CheckCircle2 size={12} /> Syntax OK
                </div>
              )}
            </div>
          </div>

          {activeTab === 'editor' ? (
            <>
              <CodeEditor value={code} onChange={setCode} error={validationError} />

              {/* Console output */}
              <div className="rounded-xl bg-gray-900 border border-gray-800/60 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800/60 bg-gray-900/60">
                  <Terminal size={14} className="text-gray-500" />
                  <span className="text-xs font-semibold text-gray-400">Console Output</span>
                  {activeResult && (
                    <span className="ml-auto text-xs text-gray-600">
                      {activeResult.executionTime}ms
                    </span>
                  )}
                </div>
                <div className="p-3 min-h-[80px] max-h-48 overflow-y-auto custom-scrollbar font-mono text-xs">
                  {!activeResult && (
                    <p className="text-gray-600">Run your strategy to see console output…</p>
                  )}
                  {activeResult?.error && (
                    <p className="text-red-400">❌ {activeResult.error}</p>
                  )}
                  {activeResult?.logs.map((log, i) => (
                    <p key={i} className="text-gray-400 leading-5">{log}</p>
                  ))}
                  {activeResult && !activeResult.error && activeResult.logs.length === 0 && (
                    <p className="text-gray-600">No console output. Use console.log() to debug.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5">
              <DocsPanel />
            </div>
          )}
        </div>

        {/* Results column */}
        <div className="space-y-4">
          {/* Stock selector tabs */}
          {runResults.size > 0 && (
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700/50">
                <h3 className="text-sm font-semibold text-white">Results by Stock</h3>
              </div>
              <div className="p-2 space-y-1">
                {selectedStocks.map(stock => {
                  const res = runResults.get(stock.symbol);
                  if (!res) return null;
                  const isActive = activeStock === stock.symbol;
                  return (
                    <button
                      key={stock.symbol}
                      onClick={() => setActiveStock(stock.symbol)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-left ${
                        isActive ? 'bg-emerald-900/20 border border-emerald-500/20' : 'hover:bg-gray-700/40'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{stock.symbol}</p>
                        <p className="text-xs text-gray-500">{stock.name.substring(0, 25)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {res.error && <AlertTriangle size={12} className="text-red-400" />}
                        <SignalBadge signal={res.finalSignal} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active stock detail */}
          {activeResult && activeStock && (
            <>
              {/* Signal card */}
              <div className={`rounded-xl border p-5 ${
                activeResult.finalSignal === 'BUY'
                  ? 'bg-emerald-900/20 border-emerald-500/30'
                  : activeResult.finalSignal === 'SELL'
                  ? 'bg-red-900/20 border-red-500/30'
                  : 'bg-amber-900/20 border-amber-500/30'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-400 font-medium">FINAL SIGNAL</p>
                  <SignalBadge signal={activeResult.finalSignal} />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-gray-900/40 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Predicted Price</p>
                    <p className="text-lg font-bold text-white font-mono mt-1">
                      ₹{activeResult.predictedPrice?.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-900/40 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Confidence</p>
                    <p className="text-lg font-bold text-white mt-1">{activeResult.confidence}%</p>
                    <div className="h-1 bg-gray-700 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${activeResult.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    activeResult.predictedDirection === 'UP' ? 'bg-emerald-900/40 text-emerald-400' :
                    activeResult.predictedDirection === 'DOWN' ? 'bg-red-900/40 text-red-400' :
                    'bg-amber-900/40 text-amber-400'
                  }`}>{activeResult.predictedDirection}</span>
                  <span className="text-xs text-gray-500">{activeResult.signals.length} signals generated</span>
                  {activeResult.executionTime > 0 && (
                    <span className="ml-auto text-xs text-gray-600 flex items-center gap-1">
                      <Clock size={10} /> {activeResult.executionTime}ms
                    </span>
                  )}
                </div>
              </div>

              {/* Signal history */}
              {activeResult.signals.length > 0 && (
                <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-700/50">
                    <h3 className="text-sm font-semibold text-white">Signal History</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Last {Math.min(activeResult.signals.length, 8)} signals</p>
                  </div>
                  <div className="divide-y divide-gray-700/30 max-h-60 overflow-y-auto custom-scrollbar">
                    {[...activeResult.signals].reverse().slice(0, 8).map((sig, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-xs text-gray-400">{sig.date}</p>
                          <p className="text-sm font-mono text-white">₹{sig.price.toFixed(2)}</p>
                        </div>
                        <SignalBadge signal={sig.signal} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty state */}
          {runResults.size === 0 && (
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-10 text-center">
              <Zap size={40} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400 text-sm">Results will appear here after you run your strategy</p>
              <p className="text-gray-600 text-xs mt-1">Select stocks and click Run</p>
            </div>
          )}

          {/* Summary across all stocks */}
          {runResults.size > 1 && (
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Portfolio Summary</h3>
              <div className="grid grid-cols-3 gap-2">
                {(['BUY', 'HOLD', 'SELL'] as const).map(sig => {
                  const count = [...runResults.values()].filter(r => r.finalSignal === sig).length;
                  return (
                    <div key={sig} className={`p-2.5 rounded-lg text-center ${
                      sig === 'BUY' ? 'bg-emerald-900/30' : sig === 'SELL' ? 'bg-red-900/30' : 'bg-amber-900/30'
                    }`}>
                      <p className={`text-xl font-bold ${
                        sig === 'BUY' ? 'text-emerald-400' : sig === 'SELL' ? 'text-red-400' : 'text-amber-400'
                      }`}>{count}</p>
                      <p className={`text-[10px] font-semibold ${
                        sig === 'BUY' ? 'text-emerald-500' : sig === 'SELL' ? 'text-red-500' : 'text-amber-500'
                      }`}>{sig}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">
                Avg confidence: {Math.round([...runResults.values()].reduce((s, r) => s + r.confidence, 0) / runResults.size)}%
              </p>
            </div>
          )}

          {/* Tip */}
          <div className="rounded-xl bg-gray-800/40 border border-gray-700/30 p-4 flex gap-2">
            <Lightbulb size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">
              After running, go to <strong className="text-gray-300">Predictions</strong> — your custom strategy signals will be used alongside the AI model to generate forecasts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
