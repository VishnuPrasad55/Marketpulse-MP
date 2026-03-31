import React, { useState, useEffect } from 'react';
import {
  Search, Filter, TrendingUp, TrendingDown, ChevronRight,
  Clock, Lock, Activity, Wifi, WifiOff,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Stock, Market } from '../types';
import { useNavigate } from 'react-router-dom';
import { stockApi } from '../services/stockApi';
import { NewsSentimentPanel } from '../components/NewsSentimentPanel';

export const StockSelectionPage: React.FC = () => {
  const { stocks, selectedStocks, selectStock, unselectStock, isDarkMode, isLoading } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [marketFilter, setMarketFilter] = useState<Market | 'ALL'>('ALL');
  const [sectorFilter, setSectorFilter] = useState<string | 'ALL'>('ALL');
  const [marketIndices, setMarketIndices] = useState<any[]>([]);
  const navigate = useNavigate();
  const marketStatus = stockApi.getMarketStatus();

  useEffect(() => {
    stockApi.getMarketIndices().then(setMarketIndices).catch(console.error);
  }, []);

  const sectors = ['ALL', ...new Set(stocks.map(s => s.sector).filter(Boolean))];

  const filteredStocks = stocks.filter(stock => {
    const q = searchTerm.toLowerCase();
    return (
      (stock.symbol.toLowerCase().includes(q) ||
        stock.name.toLowerCase().includes(q) ||
        (stock.sector?.toLowerCase().includes(q) ?? false)) &&
      (marketFilter === 'ALL' || stock.market === marketFilter) &&
      (sectorFilter === 'ALL' || stock.sector === sectorFilter)
    );
  });

  const isSelected = (symbol: string) => selectedStocks.some(s => s.symbol === symbol);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
            Stock Selection
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Choose NSE & BSE stocks to analyse and trade.
          </p>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border ${
          marketStatus.isOpen
            ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/20'
            : 'bg-gray-800/60 text-gray-400 border-gray-700/50'
        }`}>
          {marketStatus.isOpen ? (
            <><Activity size={13} className="animate-pulse" /> Market Live</>
          ) : (
            <><Lock size={13} /> Market Closed</>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Stock table ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2.5 bg-gray-800/60 border border-gray-700/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:bg-gray-800 transition-all"
                placeholder="Search by ticker, company, or sector…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2.5 bg-gray-800/60 border border-gray-700/50 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 transition-all"
              value={marketFilter}
              onChange={e => setMarketFilter(e.target.value as Market | 'ALL')}
            >
              <option value="ALL">All Markets</option>
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </select>
            <select
              className="px-3 py-2.5 bg-gray-800/60 border border-gray-700/50 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 transition-all"
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
            >
              {sectors.map(s => (
                <option key={s} value={s}>{s === 'ALL' ? 'All Sectors' : s}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="spinner" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-700/50 bg-gray-800/40">
                      {['Symbol', 'Company', 'Price', '% Change', 'Market', ''].map(h => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {filteredStocks.map(stock => {
                      const sel = isSelected(stock.symbol);
                      return (
                        <tr
                          key={stock.symbol}
                          className={`tr-hover transition-colors ${sel ? 'bg-emerald-900/10' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <span className="text-sm font-bold text-white font-mono">
                              {stock.symbol}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm text-gray-200">{stock.name}</p>
                              {stock.sector && (
                                <p className="text-xs text-gray-500">{stock.sector}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-white font-mono">
                              ₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`flex items-center gap-1 text-sm font-medium ${
                              stock.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {stock.change >= 0
                                ? <TrendingUp size={13} />
                                : <TrendingDown size={13} />
                              }
                              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 rounded-lg bg-gray-700/60 text-gray-300 font-medium">
                              {stock.market}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => sel ? unselectStock(stock.symbol) : selectStock(stock)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                sel
                                  ? 'bg-red-900/30 text-red-400 border border-red-500/30 hover:bg-red-900/50'
                                  : 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/50'
                              }`}
                            >
                              {sel ? 'Remove' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredStocks.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-gray-500 text-sm">
                          No stocks match your filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* Selected stocks */}
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
              <h2 className="text-sm font-semibold text-white">
                Selected ({selectedStocks.length})
              </h2>
              {selectedStocks.length > 0 && (
                <button
                  onClick={() => selectedStocks.forEach(s => unselectStock(s.symbol))}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="p-3 space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
              {selectedStocks.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">
                  Click "Select" on any stock to add it here
                </p>
              ) : (
                selectedStocks.map(stock => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-gray-700/40 hover:bg-gray-700/60 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{stock.symbol}</p>
                      <p className="text-xs text-gray-400">₹{stock.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${
                        stock.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                      <button
                        onClick={() => unselectStock(stock.symbol)}
                        className="text-gray-500 hover:text-red-400 transition-colors text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-gray-700/50">
              <button
                onClick={() => navigate('/strategies')}
                disabled={selectedStocks.length === 0}
                className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 ${
                  selectedStocks.length > 0
                    ? 'btn-primary'
                    : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue to Strategies
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Market info */}
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Market Indices
            </h3>
            {(marketIndices.length > 0 ? marketIndices : [
              { name: 'NIFTY 50', value: 19425, change: 156, changePercent: 0.81 },
              { name: 'SENSEX', value: 64718, change: 445, changePercent: 0.69 },
            ]).map(idx => (
              <div key={idx.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{idx.name}</span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white font-mono">
                    {idx.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                  <p className={`text-xs ${idx.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-gray-700/40">
              <div className="flex items-center gap-2">
                <span className={`live-dot ${!marketStatus.isOpen ? 'bg-gray-500' : ''}`}
                  style={marketStatus.isOpen ? {} : { background: '#6b7280' }}
                />
                <span className="text-xs text-gray-400">{marketStatus.nextChange}</span>
              </div>
            </div>
          </div>

          {/* News Sentiment */}
          <NewsSentimentPanel />
        </div>
      </div>
    </div>
  );
};
