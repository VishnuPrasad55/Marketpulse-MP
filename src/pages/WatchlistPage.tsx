/**
 * Watchlist Page
 * Dedicated real-time watchlist with price alerts, notes, and quick-add from universe.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, BellOff, Star, StarOff, TrendingUp, TrendingDown,
  RefreshCw, Search, Plus, X, ChevronUp, ChevronDown,
  Activity, Info, Wifi, WifiOff,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { stockApi, StockQuote } from '../services/stockApi';
import { alertsService, AlertCondition } from '../services/alertsService';
import { STOCK_UNIVERSE } from '../data/stockUniverse';

// ─── Types ────────────────────────────────────────────────────────────────────
interface WatchItem {
  symbol: string;
  name: string;
  quote: StockQuote | null;
  note: string;
  starred: boolean;
  addedAt: string;
}

const STORAGE_KEY = 'mp_watchlist_v2';

function loadWatchlist(): WatchItem[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveWatchlist(items: WatchItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ─── Alert quick-set modal ────────────────────────────────────────────────────
const AlertQuickModal: React.FC<{
  symbol: string; name: string; price: number;
  onClose: () => void; onSave: (cond: AlertCondition, val: number, note: string) => void;
}> = ({ symbol, name, price, onClose, onSave }) => {
  const [condition, setCondition] = useState<AlertCondition>('above');
  const [value, setValue] = useState(+(price * 1.05).toFixed(2));
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-amber-400" />
            <h3 className="text-white font-bold">Set alert — {symbol}</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <p className="text-xs text-gray-400">Current: <span className="text-white font-mono">₹{price.toFixed(2)}</span></p>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Condition</label>
            <select value={condition} onChange={e => setCondition(e.target.value as AlertCondition)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="above">Price rises above</option>
              <option value="below">Price falls below</option>
              <option value="change_pct_up">Day gain exceeds %</option>
              <option value="change_pct_down">Day loss exceeds %</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">
              {condition.includes('pct') ? 'Threshold (%)' : 'Target price (₹)'}
            </label>
            <input type="number" value={value} min={0} step={condition.includes('pct') ? 0.1 : 1}
              onChange={e => setValue(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Note (optional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Support level"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors">Cancel</button>
            <button onClick={() => { onSave(condition, value, note); onClose(); }}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <Bell size={14} /> Set alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Add stock modal ──────────────────────────────────────────────────────────
const AddStockModal: React.FC<{
  existing: string[];
  onClose: () => void;
  onAdd: (symbol: string, name: string) => void;
}> = ({ existing, onClose, onAdd }) => {
  const [q, setQ] = useState('');
  const filtered = STOCK_UNIVERSE.filter(s =>
    !existing.includes(s.symbol) &&
    (s.symbol.toLowerCase().includes(q.toLowerCase()) || s.name.toLowerCase().includes(q.toLowerCase()))
  ).slice(0, 12);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold">Add to watchlist</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search symbol or company…"
            className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1">
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No results</p>
          ) : filtered.map(s => (
            <button key={s.symbol} onClick={() => { onAdd(s.symbol, s.name); onClose(); }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors text-left">
              <div>
                <p className="text-sm font-bold text-white">{s.symbol}</p>
                <p className="text-xs text-gray-400">{s.name} · {s.sector}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-lg bg-gray-700 text-gray-300">{s.market}</span>
                <Plus size={14} className="text-emerald-400" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export const WatchlistPage: React.FC = () => {
  const { selectedStocks } = useAppContext();
  const [items, setItems] = useState<WatchItem[]>(loadWatchlist);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [alertModal, setAlertModal] = useState<WatchItem | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [editNote, setEditNote] = useState<string | null>(null);
  const [sort, setSort] = useState<'symbol' | 'change' | 'price'>('symbol');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [activeAlerts, setActiveAlerts] = useState(alertsService.getAlerts('active'));

  // Seed watchlist from selected stocks on first load
  useEffect(() => {
    const existing = new Set(items.map(i => i.symbol));
    const toAdd = selectedStocks.filter(s => !existing.has(s.symbol)).map(s => ({
      symbol: s.symbol, name: s.name,
      quote: { symbol: s.symbol, price: s.price, change: s.change, changePercent: s.changePercent, volume: s.volume ?? 0, lastUpdated: new Date().toISOString(), isLive: false },
      note: '', starred: false, addedAt: new Date().toISOString(),
    }));
    if (toAdd.length) {
      setItems(prev => { const next = [...prev, ...toAdd]; saveWatchlist(next); return next; });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to alerts
  useEffect(() => alertsService.subscribe(a => setActiveAlerts(a.filter(x => x.status === 'active'))), []);

  // Refresh quotes
  const refresh = useCallback(async () => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      const quotes = await stockApi.getMultipleQuotes(items.map(i => i.symbol));
      const quoteMap = new Map(quotes.map(q => [q.symbol, q]));
      setItems(prev => {
        const next = prev.map(item => ({ ...item, quote: quoteMap.get(item.symbol) ?? item.quote }));
        saveWatchlist(next);
        return next;
      });
      setIsLive(quotes.some(q => q.isLive));
      setLastUpdated(new Date());

      // Check alerts
      const priceMap: Record<string, { price: number; changePercent: number }> = {};
      quotes.forEach(q => { priceMap[q.symbol] = { price: q.price, changePercent: q.changePercent }; });
      alertsService.checkPrices(priceMap);
    } finally {
      setLoading(false);
    }
  }, [items]);

  // Auto-refresh every 90s
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 90_000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleStar = (symbol: string) => {
    setItems(prev => { const next = prev.map(i => i.symbol === symbol ? { ...i, starred: !i.starred } : i); saveWatchlist(next); return next; });
  };

  const removeItem = (symbol: string) => {
    setItems(prev => { const next = prev.filter(i => i.symbol !== symbol); saveWatchlist(next); return next; });
  };

  const addItem = (symbol: string, name: string) => {
    const meta = STOCK_UNIVERSE.find(s => s.symbol === symbol);
    const newItem: WatchItem = {
      symbol, name, quote: null, note: '', starred: false, addedAt: new Date().toISOString(),
    };
    setItems(prev => { const next = [...prev, newItem]; saveWatchlist(next); return next; });
    // Fetch quote immediately
    stockApi.getStockQuote(symbol).then(q => {
      setItems(prev => { const next = prev.map(i => i.symbol === symbol ? { ...i, quote: q } : i); saveWatchlist(next); return next; });
    });
  };

  const saveNote = (symbol: string, note: string) => {
    setItems(prev => { const next = prev.map(i => i.symbol === symbol ? { ...i, note } : i); saveWatchlist(next); return next; });
    setEditNote(null);
  };

  const setAlert = (symbol: string, name: string, cond: AlertCondition, val: number, note: string) => {
    alertsService.addAlert({ symbol, name, condition: cond, targetValue: val, note: note || undefined });
    setActiveAlerts(alertsService.getAlerts('active'));
  };

  // Sorting
  const sorted = [...items].sort((a, b) => {
    let av: number | string = a.symbol, bv: number | string = b.symbol;
    if (sort === 'change') { av = a.quote?.changePercent ?? 0; bv = b.quote?.changePercent ?? 0; }
    if (sort === 'price')  { av = a.quote?.price ?? 0; bv = b.quote?.price ?? 0; }
    if (a.starred !== b.starred) return a.starred ? -1 : 1; // starred first
    return sortDir === 'asc'
      ? (typeof av === 'string' ? av.localeCompare(bv as string) : av - (bv as number))
      : (typeof av === 'string' ? (bv as string).localeCompare(av) : (bv as number) - av);
  });

  const SortBtn: React.FC<{ col: typeof sort; label: string }> = ({ col, label }) => (
    <button onClick={() => { if (sort === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSort(col); setSortDir('asc'); } }}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${sort === col ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}>
      {label}
      {sort === col ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>Watchlist</h1>
          <p className="text-gray-400 text-sm mt-1">{items.length} stocks tracked · auto-refreshes every 90 seconds</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Live badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${isLive ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/20' : 'bg-gray-800/60 text-gray-400 border-gray-700/50'}`}>
            {isLive ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isLive ? `Live ${lastUpdated?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) ?? ''}` : 'Delayed'}
          </div>
          <button onClick={refresh} disabled={loading}
            className="p-2 rounded-xl bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-white transition-colors">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors">
            <Plus size={15} /> Add stock
          </button>
        </div>
      </div>

      {/* Active alerts banner */}
      {activeAlerts.length > 0 && (
        <div className="rounded-xl bg-amber-900/20 border border-amber-500/20 p-3 flex items-center gap-3">
          <Bell size={15} className="text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">{activeAlerts.length} price alert{activeAlerts.length > 1 ? 's' : ''} active — go to Paper Trading to manage them.</p>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-16 text-center">
          <Activity size={48} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400 text-sm mb-4">Your watchlist is empty. Add stocks to start tracking them.</p>
          <button onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors mx-auto">
            <Plus size={15} /> Add your first stock
          </button>
        </div>
      )}

      {/* Table */}
      {items.length > 0 && (
        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-700/50 bg-gray-800/40">
            <div className="w-5" /> {/* star col */}
            <div className="flex-1"><SortBtn col="symbol" label="Symbol" /></div>
            <div className="w-28 text-right"><SortBtn col="price" label="Price" /></div>
            <div className="w-24 text-right hidden sm:block"><SortBtn col="change" label="Change" /></div>
            <div className="w-24 text-right hidden md:block text-xs font-semibold uppercase text-gray-500">Volume</div>
            <div className="w-32 hidden lg:block text-xs font-semibold uppercase text-gray-500">Note</div>
            <div className="w-20 text-right text-xs font-semibold uppercase text-gray-500">Actions</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-700/30">
            {sorted.map(item => {
              const q = item.quote;
              const hasAlert = activeAlerts.some(a => a.symbol === item.symbol);
              return (
                <div key={item.symbol} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-700/20 transition-colors group">
                  {/* Star */}
                  <button onClick={() => toggleStar(item.symbol)} className="text-gray-600 hover:text-amber-400 transition-colors">
                    {item.starred ? <Star size={15} className="text-amber-400 fill-amber-400" /> : <Star size={15} />}
                  </button>

                  {/* Symbol + name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{item.symbol}</span>
                      {hasAlert && <Bell size={11} className="text-amber-400" />}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{item.name}</p>
                  </div>

                  {/* Price */}
                  <div className="w-28 text-right">
                    {q ? (
                      <span className="text-sm font-mono font-semibold text-white">
                        ₹{q.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">Loading…</span>
                    )}
                  </div>

                  {/* Change */}
                  <div className="w-24 text-right hidden sm:block">
                    {q && (
                      <div className={`flex items-center justify-end gap-0.5 text-xs font-medium ${q.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {q.changePercent >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {q.changePercent >= 0 ? '+' : ''}{q.changePercent.toFixed(2)}%
                      </div>
                    )}
                  </div>

                  {/* Volume */}
                  <div className="w-24 text-right hidden md:block">
                    {q && <span className="text-xs text-gray-400">{(q.volume / 100000).toFixed(1)}L</span>}
                  </div>

                  {/* Note */}
                  <div className="w-32 hidden lg:block">
                    {editNote === item.symbol ? (
                      <input autoFocus type="text" defaultValue={item.note}
                        className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded-lg text-xs text-white focus:outline-none"
                        onBlur={e => saveNote(item.symbol, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveNote(item.symbol, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditNote(null); }} />
                    ) : (
                      <button onClick={() => setEditNote(item.symbol)} className="text-left w-full">
                        <span className="text-xs text-gray-500 hover:text-gray-300 transition-colors truncate block">
                          {item.note || <span className="italic opacity-50">Add note…</span>}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="w-20 flex items-center justify-end gap-1">
                    <button onClick={() => setAlertModal(item)} title="Set price alert"
                      className={`p-1.5 rounded-lg transition-colors ${hasAlert ? 'text-amber-400 bg-amber-900/20' : 'text-gray-600 hover:text-amber-400 hover:bg-amber-900/20'}`}>
                      {hasAlert ? <Bell size={13} /> : <BellOff size={13} />}
                    </button>
                    <button onClick={() => removeItem(item.symbol)} title="Remove from watchlist"
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100">
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-gray-600">
        <Info size={12} className="flex-shrink-0 mt-0.5" />
        <span>Prices refresh automatically every 90 seconds. Click any note field to add personal comments. Stars sort starred items to the top.</span>
      </div>

      {/* Modals */}
      {alertModal && alertModal.quote && (
        <AlertQuickModal symbol={alertModal.symbol} name={alertModal.name} price={alertModal.quote.price}
          onClose={() => setAlertModal(null)}
          onSave={(cond, val, note) => setAlert(alertModal.symbol, alertModal.name, cond, val, note)} />
      )}
      {addModal && (
        <AddStockModal existing={items.map(i => i.symbol)}
          onClose={() => setAddModal(false)} onAdd={addItem} />
      )}
    </div>
  );
};
