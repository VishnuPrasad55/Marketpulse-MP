import React, { useState, useEffect } from 'react';
import { Search, Filter, TrendingUp, TrendingDown, ChevronRight, Clock, Lock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Stock, Market } from '../types';
import { useNavigate } from 'react-router-dom';
import { stockApi } from '../services/stockApi';

const getMarketStatus = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const marketOpen = 9 * 60; // 9:00 AM
  const marketClose = 15 * 60 + 30; // 3:30 PM
  
  return {
    isOpen: currentTime >= marketOpen && currentTime < marketClose,
    openTime: marketOpen,
    closeTime: marketClose,
    currentTime
  };
};

export const StockSelectionPage: React.FC = () => {
  const { stocks, selectedStocks, selectStock, unselectStock, isDarkMode, isLoading } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [marketFilter, setMarketFilter] = useState<Market | 'ALL'>('ALL');
  const [sectorFilter, setSectorFilter] = useState<string | 'ALL'>('ALL');
  const [marketIndices, setMarketIndices] = useState<any[]>([]);
  const navigate = useNavigate();
  
  const marketStatus = stockApi.getMarketStatus();

  // Load market indices
  useEffect(() => {
    const loadMarketIndices = async () => {
      try {
        const indices = await stockApi.getMarketIndices();
        setMarketIndices(indices);
      } catch (error) {
        console.error('Failed to load market indices:', error);
      }
    };
    
    loadMarketIndices();
  }, []);
  // Get unique sectors for filtering
  const sectors = ['ALL', ...new Set(stocks.map(stock => stock.sector).filter(Boolean))];

  // Enhanced search functionality
  const filteredStocks = stocks.filter(stock => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      stock.symbol.toLowerCase().includes(searchLower) || 
      stock.name.toLowerCase().includes(searchLower) ||
      (stock.sector && stock.sector.toLowerCase().includes(searchLower));
    
    const matchesMarket = marketFilter === 'ALL' || stock.market === marketFilter;
    const matchesSector = sectorFilter === 'ALL' || stock.sector === sectorFilter;
    
    return matchesSearch && matchesMarket && matchesSector;
  });

  const isSelected = (symbol: string) => selectedStocks.some(stock => stock.symbol === symbol);

  const handleSelectStock = (stock: Stock) => {
    if (isSelected(stock.symbol)) {
      unselectStock(stock.symbol);
    } else {
      selectStock(stock);
    }
  };

  const handleContinue = () => {
    if (selectedStocks.length > 0) {
      navigate('/strategies');
    }
  };

  // Search suggestions based on current stocks
  const getSearchSuggestions = () => {
    if (searchTerm.length === 0) return [];
    
    const suggestions = [];
    const searchLower = searchTerm.toLowerCase();
    
    // Add matching symbols
    const matchingSymbols = stocks
      .filter(stock => stock.symbol.toLowerCase().includes(searchLower))
      .slice(0, 3)
      .map(stock => ({ type: 'symbol', value: stock.symbol, label: `${stock.symbol} - ${stock.name}` }));
    
    // Add matching sectors
    const matchingSectors = sectors
      .filter(sector => sector !== 'ALL' && sector.toLowerCase().includes(searchLower))
      .slice(0, 2)
      .map(sector => ({ type: 'sector', value: sector, label: `${sector} sector` }));
    
    return [...matchingSymbols, ...matchingSectors];
  };

  const searchSuggestions = getSearchSuggestions();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Stock Selection
            </h1>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Choose stocks from NSE and BSE to analyze and trade.
            </p>
          </div>
          <div className={`flex items-center px-4 py-2 rounded-md ${
            marketStatus.isOpen 
              ? isDarkMode ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
              : isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-700'
          }`}>
            {marketStatus.isOpen ? (
              <Clock size={20} className="mr-2" />
            ) : (
              <Lock size={20} className="mr-2" />
            )}
            <span className="font-medium">
              {marketStatus.isOpen ? 'Market Open' : 'Market Closed'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                className={`py-2.5 pl-10 pr-4 block w-full border-none rounded-md focus:ring-2 focus:ring-emerald-500 ${
                  isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
                }`}
                placeholder="Search by ticker (RELIANCE), company (Tata Motors), or sector (Banking)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              {/* Search Suggestions */}
              {searchTerm.length > 0 && searchSuggestions.length > 0 && (
                <div className={`absolute top-full left-0 right-0 mt-1 rounded-md shadow-lg z-50 ${
                  isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}>
                  <div className="p-2">
                    {searchSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className={`px-3 py-2 cursor-pointer rounded-md ${
                          isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                        onClick={() => {
                          if (suggestion.type === 'symbol') {
                            setSearchTerm(suggestion.value);
                          } else if (suggestion.type === 'sector') {
                            setSectorFilter(suggestion.value);
                            setSearchTerm('');
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <Search size={14} className="mr-2 text-gray-400" />
                          <span className="text-sm">{suggestion.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <select
                className={`py-2.5 pl-3 pr-10 border-none rounded-md focus:ring-2 focus:ring-emerald-500 ${
                  isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
                }`}
                value={marketFilter}
                onChange={(e) => setMarketFilter(e.target.value as Market | 'ALL')}
              >
                <option value="ALL">All Markets</option>
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
              </select>
              <select
                className={`py-2.5 pl-3 pr-10 border-none rounded-md focus:ring-2 focus:ring-emerald-500 ${
                  isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
                }`}
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
              >
                {sectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector === 'ALL' ? 'All Sectors' : sector}
                  </option>
                ))}
              </select>
              <button
                className={`p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Filter size={18} />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className={`p-12 rounded-lg flex justify-center items-center ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow'}`}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow'}`}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300 uppercase tracking-wider' : 'text-gray-500 uppercase tracking-wider'}`}>
                        Symbol
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300 uppercase tracking-wider' : 'text-gray-500 uppercase tracking-wider'}`}>
                        Name
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300 uppercase tracking-wider' : 'text-gray-500 uppercase tracking-wider'}`}>
                        Price
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300 uppercase tracking-wider' : 'text-gray-500 uppercase tracking-wider'}`}>
                        Change
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300 uppercase tracking-wider' : 'text-gray-500 uppercase tracking-wider'}`}>
                        Market
                      </th>
                      <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300 uppercase tracking-wider' : 'text-gray-500 uppercase tracking-wider'}`}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {filteredStocks.map((stock) => (
                      <tr key={stock.symbol} className={`
                        ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} 
                        transition-colors
                        ${isSelected(stock.symbol) ? (isDarkMode ? 'bg-gray-700' : 'bg-emerald-50') : ''}
                      `}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {stock.symbol}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {stock.name}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          ₹{stock.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            {stock.change >= 0 ? (
                              <TrendingUp size={16} className="mr-1 text-emerald-500" />
                            ) : (
                              <TrendingDown size={16} className="mr-1 text-red-500" />
                            )}
                            <span className={stock.change >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                              {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                            </span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {stock.market}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleSelectStock(stock)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              isSelected(stock.symbol)
                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                            }`}
                          >
                            {isSelected(stock.symbol) ? 'Remove' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow'} mb-6`}>
            <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Selected Stocks ({selectedStocks.length})
              </h2>
            </div>
            <div className="p-4">
              {selectedStocks.length === 0 ? (
                <div className={`text-center py-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p>No stocks selected</p>
                  <p className="mt-2 text-sm">
                    Select stocks from the list to add them here.
                  </p>
                </div>
              ) : (
                <div className={`space-y-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {selectedStocks.map((stock) => (
                    <div
                      key={stock.symbol}
                      className={`flex items-center justify-between p-3 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                    >
                      <div>
                        <div className="font-medium">{stock.symbol}</div>
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stock.name}</div>
                        <div className={`text-xs ${stock.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          ₹{stock.price.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                        </div>
                      </div>
                      <button
                        onClick={() => unselectStock(stock.symbol)}
                        className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <button
                className={`px-4 py-2 rounded text-sm font-medium ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                onClick={() => selectedStocks.forEach(stock => unselectStock(stock.symbol))}
                disabled={selectedStocks.length === 0}
              >
                Clear All
              </button>
              <button
                onClick={handleContinue}
                className={`px-4 py-2 rounded-md flex items-center ${
                  selectedStocks.length > 0
                    ? `${isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`
                    : `${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} cursor-not-allowed ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`
                }`}
                disabled={selectedStocks.length === 0}
              >
                Continue
                <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
          </div>

          <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow'}`}>
            <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Market Information
              </h2>
            </div>
            <div className="p-4">
              <div className={`space-y-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                <div>
                  <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>NSE</h3>
                  {marketIndices.filter(index => index.name.includes('NIFTY')).map((index, i) => (
                    <div key={i} className="flex justify-between mt-1">
                      <span>{index.name}</span>
                      <span className={index.change >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                        {index.value.toLocaleString()} ({index.change >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>BSE</h3>
                  {marketIndices.filter(index => index.name.includes('SENSEX')).map((index, i) => (
                    <div key={i} className="flex justify-between mt-1">
                      <span>{index.name}</span>
                      <span className={index.change >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                        {index.value.toLocaleString()} ({index.change >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Market Status</h3>
                  <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex items-center">
                      <div className={`h-2.5 w-2.5 rounded-full mr-2 ${
                        marketStatus.isOpen ? 'bg-emerald-500' : 'bg-red-500'
                      }`}></div>
                      <span>{marketStatus.isOpen ? 'Market Open' : 'Market Closed'}</span>
                    </div>
                    <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {marketStatus.nextChange}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};