import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, TrendingUp, TrendingDown, ChevronRight,
  Activity, Lock, ChevronLeft, ChevronDown,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Stock, Market } from '../types';
import { useNavigate } from 'react-router-dom';
import { stockApi } from '../services/stockApi';
import { NewsSentimentPanel } from '../components/NewsSentimentPanel';
import { ALL_SECTORS } from '../data/stockUniverse';

const PAGE_SIZE = 20;

export const StockSelectionPage: React.FC = () => {
  const { stocks, selectedStocks, selectStock, unselectStock, isDarkMode, isLoading } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [marketFilter, setMarketFilter] = useState<Market | 'ALL'>('ALL');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [marketIndices, setMarketIndices] = useState<any[]>([]);
  const navigate = useNavigate();
  const marketStatus = stockApi.getMarketStatus();

  useEffect(() => {
    stockApi.getMarketIndices().then(setMarketIndices).catch(console.error);
  }, []);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [searchTerm, marketFilter, sectorFilter]);

  const filteredStocks = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return stocks.filter(stock =>
      (stock.symbol.toLowerCase().includes(q) ||
        stock.name.toLowerCase().includes(q) ||
        (stock.sector?.toLowerCase().includes(q) ?? false)) &&
      (marketFilter === 'ALL' || stock.market === marketFilter) &&
      (sectorFilter === 'ALL' || stock.sector === sectorFilter)
    );
  }, [stocks, searchTerm, marketFilter, sectorFilter]);

  const totalPages = Math.ceil(filteredStocks.length / PAGE_SIZE);
  const pagedStocks = filteredStocks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isSelected = (symbol: string) => selectedStocks.some(s => s.symbol === symbol);

  const sectorOptions = ALL_SECTORS;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
            Stock Selection
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {stocks.length} stocks across NSE & BSE — choose up to any number to analyse and trade.
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
        {/* Stock table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2.5 bg-gray-800/60 border border-gray-700/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:bg-gray-800 transition-all"
                placeholder="Search symbol, company, or sector…"
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
              {sectorOptions.map(s => (
                <option key={s} value={s}>{s === 'ALL' ? 'All Sectors' : s}</option>
              ))}
            </select>
          </div>

          {/* Count + bulk */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{filteredStocks.length} stocks found · page {page}/{Math.max(totalPages, 1)}</span>
            {filteredStocks.length > 0 && (
              <button
                onClick={() => pagedStocks.filter(s => !isSelected(s.symbol)).forEach(selectStock)}
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Select this page
              </button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="spinner" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-700/50 bg-gray-800/40">
                        {['Symbol', 'Company', 'Price', '% Change', 'Sector', 'Market', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/30">
                      {pagedStocks.map(stock => {
                        const sel = isSelected(stock.symbol);
                        return (
                          <tr key={stock.symbol} className={`tr-hover transition-colors ${sel ? 'bg-emerald-900/10' : ''}`}>
                            <td className="px-4 py-3">
                              <span className="text-sm font-bold text-white font-mono">{stock.symbol}</span>
                            </td>
                            <td className="px-4 py-3 max-w-[160px]">
                              <p className="text-sm text-gray-200 truncate">{stock.name}</p>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-semibold text-white font-mono">
                                ₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className={`flex items-center gap-1 text-sm font-medium ${
                                stock.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {stock.change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-gray-400">{stock.sector}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-1 rounded-lg bg-gray-700/60 text-gray-300 font-medium">{stock.market}</span>
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
                      {pagedStocks.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-gray-500 text-sm">
                            No stocks match your filters
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-700/50 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors"
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        const pg = totalPages <= 7
                          ? i + 1
                          : page <= 4
                          ? i + 1
                          : page >= totalPages - 3
                          ? totalPages - 6 + i
                          : page - 3 + i;
                        return (
                          <button
                            key={pg}
                            onClick={() => setPage(pg)}
                            className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                              pg === page ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/60'
                            }`}
                          >
                            {pg}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-700/50 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Selected stocks */}
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
              <h2 className="text-sm font-semibold text-white">Selected ({selectedStocks.length})</h2>
              {selectedStocks.length > 0 && (
                <button
                  onClick={() => selectedStocks.forEach(s => unselectStock(s.symbol))}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="p-3 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {selectedStocks.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">
                  Click "Select" on any stock to add it here
                </p>
              ) : (
                selectedStocks.map(stock => (
                  <div key={stock.symbol} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-700/40 hover:bg-gray-700/60 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-white">{stock.symbol}</p>
                      <p className="text-xs text-gray-400">₹{stock.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${stock.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                      <button onClick={() => unselectStock(stock.symbol)} className="text-gray-500 hover:text-red-400 transition-colors text-lg leading-none">×</button>
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
                  selectedStocks.length > 0 ? 'btn-primary' : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue to Strategies <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Market indices */}
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Market Indices</h3>
            {(marketIndices.length > 0 ? marketIndices : [
              { name: 'NIFTY 50', value: 19425, change: 156, changePercent: 0.81 },
              { name: 'SENSEX',   value: 64718, change: 445, changePercent: 0.69 },
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
