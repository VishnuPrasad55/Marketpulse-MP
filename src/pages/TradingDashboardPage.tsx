import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { stockApi } from '../services/stockApi';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  PieChart as PieChartIcon,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  ShoppingCart,
  Plus
} from 'lucide-react';

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6'];

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

export function TradingDashboardPage() {
  const { isDarkMode, selectedStocks, userPortfolio, userPredictions, buyStock, sellStock, refreshUserData } = useAppContext();
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedHolding, setSelectedHolding] = useState(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [sellQuantity, setSellQuantity] = useState(1);
  const marketStatus = stockApi.getMarketStatus();

  // Only show data for selected stocks and user portfolio
  const hasSelectedStocks = selectedStocks.length > 0;
  const hasPortfolio = userPortfolio.length > 0;

  // Generate portfolio data only for user's actual holdings
  const portfolioAllocation = hasPortfolio 
    ? userPortfolio.map((holding, index) => ({
        name: holding.stock_symbol,
        value: (holding.quantity * holding.current_price),
        color: COLORS[index % COLORS.length]
      }))
    : [];

  // Generate recent trades only for user's portfolio
  const recentTrades = hasPortfolio 
    ? userPortfolio.slice(0, 5).map((holding, index) => ({
        symbol: holding.stock_symbol,
        type: 'BUY',
        quantity: holding.quantity,
        price: holding.purchase_price,
        timestamp: new Date(holding.purchase_date).toLocaleString(),
        pnl: (holding.current_price - holding.purchase_price) * holding.quantity
      }))
    : [];

  // Calculate portfolio metrics based on user's actual holdings
  const portfolioValue = hasPortfolio 
    ? userPortfolio.reduce((total, holding) => total + (holding.current_price * holding.quantity), 0)
    : 0;
  
  const todaysPnL = hasPortfolio 
    ? userPortfolio.reduce((total, holding) => {
        const dailyChange = Math.random() * 10 - 5; // Mock daily change
        return total + (dailyChange * holding.quantity);
      }, 0)
    : 0;

  const totalPnL = hasPortfolio 
    ? userPortfolio.reduce((total, holding) => {
        return total + ((holding.current_price - holding.purchase_price) * holding.quantity);
      }, 0)
    : 0;

  const winRate = hasPortfolio ? Math.floor(Math.random() * 30) + 60 : 0; // 60-90%

  // Performance data based on user's portfolio
  const performanceData = hasPortfolio 
    ? Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: portfolioValue * (0.8 + Math.random() * 0.4), // ±20% variation
      }))
    : [];

  const handleBuyStock = async (stock) => {
    setSelectedStock(stock);
    setShowBuyModal(true);
  };

  const confirmBuyStock = async () => {
    if (selectedStock && buyQuantity > 0) {
      await buyStock(selectedStock, buyQuantity);
      await refreshUserData(); // Refresh to show updated portfolio
      setShowBuyModal(false);
      setSelectedStock(null);
      setBuyQuantity(1);
    }
  };

  const handleSellStock = (holding) => {
    setSelectedHolding(holding);
    setSellQuantity(Math.min(1, holding.quantity));
    setShowSellModal(true);
  };

  const confirmSellStock = async () => {
    if (selectedHolding && sellQuantity > 0) {
      await sellStock(selectedHolding.stock_symbol, sellQuantity);
      await refreshUserData();
      setShowSellModal(false);
      setSelectedHolding(null);
      setSellQuantity(1);
    }
  };
  if (!hasSelectedStocks && !hasPortfolio) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Trading Dashboard
          </h1>
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Monitor your portfolio performance and trading activities
          </p>
        </div>

        <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-12 text-center`}>
          <div className="flex justify-center mb-6">
            <BarChart2 size={64} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
          </div>
          <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            No Portfolio Data
          </h2>
          <p className={`text-lg mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Your dashboard will display portfolio data once you select stocks and make purchases.
          </p>
          <div className={`inline-flex items-center px-4 py-2 rounded-md ${
            isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-700'
          }`}>
            <Activity size={20} className="mr-2" />
            <span>Start by selecting stocks and making predictions</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Trading Dashboard
            </h1>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Monitor your portfolio performance and trading activities
            </p>
          </div>
          <div className={`flex items-center px-4 py-2 rounded-md ${
            marketStatus.isOpen 
              ? isDarkMode ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
              : isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-700'
          }`}>
            {marketStatus.isOpen ? (
              <Activity size={20} className="mr-2" />
            ) : (
              <Lock size={20} className="mr-2" />
            )}
            <span className="font-medium">
              {marketStatus.isOpen ? 'Market Open' : 'Market Closed'}
            </span>
          </div>
        </div>
      </div>

      {!marketStatus.isOpen && (
        <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-center">
            <Clock size={20} className={`mr-3 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`}>
                Live trading is currently disabled
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                Market hours: 9:00 AM - 3:30 PM ET. You can still analyze stocks and run backtests.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Portfolio Value</p>
              <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                ₹{portfolioValue.toLocaleString()}
              </h3>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {hasPortfolio ? `${userPortfolio.length} holdings` : 'No holdings'}
              </p>
            </div>
            <div className={`p-3 rounded-full ${isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-100'}`}>
              <DollarSign size={24} className="text-emerald-500" />
            </div>
          </div>
        </div>

        <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Today's P&L</p>
              <h3 className={`text-2xl font-bold ${todaysPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {todaysPnL >= 0 ? '+' : ''}₹{todaysPnL.toFixed(2)}
              </h3>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {portfolioValue > 0 ? ((todaysPnL / portfolioValue) * 100).toFixed(2) : '0.00'}% of portfolio
              </p>
            </div>
            <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-100'}`}>
              <Activity size={24} className="text-blue-500" />
            </div>
          </div>
        </div>

        <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total P&L</p>
              <h3 className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toFixed(2)}
              </h3>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Since inception
              </p>
            </div>
            <div className={`p-3 rounded-full ${isDarkMode ? 'bg-purple-900/20' : 'bg-purple-100'}`}>
              <BarChart2 size={24} className="text-purple-500" />
            </div>
          </div>
        </div>

        <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Win Rate</p>
              <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {winRate}%
              </h3>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Successful trades
              </p>
            </div>
            <div className={`p-3 rounded-full ${isDarkMode ? 'bg-amber-900/20' : 'bg-amber-100'}`}>
              <PieChartIcon size={24} className="text-amber-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
          <h2 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Portfolio Performance
          </h2>
          {hasPortfolio ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
                  <XAxis
                    dataKey="date"
                    stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                    tick={{ fill: isDarkMode ? '#9CA3AF' : '#6B7280' }}
                  />
                  <YAxis
                    stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                    tick={{ fill: isDarkMode ? '#9CA3AF' : '#6B7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                      border: 'none',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10B981"
                    fill="url(#colorValue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <BarChart2 size={48} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No portfolio data available
                </p>
              </div>
            </div>
          )}
        </div>

        <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
          <h2 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Portfolio Allocation
          </h2>
          {hasPortfolio ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portfolioAllocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {portfolioAllocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <PieChartIcon size={48} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No holdings to display
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
          <h2 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Recent Trades
          </h2>
          {hasPortfolio ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                      <th className="text-left py-2">Symbol</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-right py-2">Quantity</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">P&L</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {recentTrades.map((trade, index) => (
                      <tr key={index}>
                        <td className={`py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {trade.symbol}
                        </td>
                        <td>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            trade.type === 'BUY'
                              ? isDarkMode ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                              : isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className={`text-right ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {trade.quantity}
                        </td>
                        <td className={`text-right ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          ₹{trade.price.toFixed(2)}
                        </td>
                        <td className={`text-right ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Portfolio Holdings */}
              {hasPortfolio && (
                <div className="mt-6">
                  <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Current Holdings
                  </h3>
                  <div className="space-y-3">
                    {userPortfolio.map((holding, index) => (
                      <div
                        key={holding.id}
                        className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {holding.stock_symbol}
                            </p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {holding.quantity} shares @ ₹{holding.purchase_price.toFixed(2)}
                            </p>
                            <p className={`text-xs ${
                              (holding.current_price - holding.purchase_price) >= 0 ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                              P&L: {((holding.current_price - holding.purchase_price) >= 0 ? '+' : '')}₹{((holding.current_price - holding.purchase_price) * holding.quantity).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-right">
                              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                ₹{holding.current_price.toFixed(2)}
                              </p>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Current
                              </p>
                            </div>
                            <button
                              onClick={() => handleSellStock(holding)}
                              disabled={!marketStatus.isOpen}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                !marketStatus.isOpen
                                  ? isDarkMode 
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : isDarkMode
                                  ? 'bg-red-600 hover:bg-red-500 text-white'
                                  : 'bg-red-600 hover:bg-red-700 text-white'
                              }`}
                            >
                              {!marketStatus.isOpen ? 'Market Closed' : 'Sell'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Activity size={48} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
              <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No trades yet
              </p>
            </div>
          )}
        </div>

        <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
          <h2 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Available Stocks
          </h2>
          <div className="space-y-4">
            {selectedStocks.map((stock, index) => (
              <div
                key={stock.symbol}
                className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <div>
                      <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {stock.symbol}
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {stock.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        ₹{stock.price.toFixed(2)}
                      </p>
                      <div className={`flex items-center text-sm ${
                        stock.change >= 0 ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {stock.change >= 0 ? (
                          <TrendingUp size={14} className="mr-1" />
                        ) : (
                          <TrendingDown size={14} className="mr-1" />
                        )}
                        {stock.changePercent.toFixed(2)}%
                      </div>
                    </div>
                    <button
                      onClick={() => handleBuyStock(stock)}
                      disabled={!marketStatus.isOpen}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center ${
                        !marketStatus.isOpen
                          ? isDarkMode 
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : isDarkMode
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <ShoppingCart size={14} className="mr-1" />
                      {!marketStatus.isOpen ? 'Market Closed' : 'Buy'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Buy Stock Modal */}
      {showBuyModal && selectedStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Buy {selectedStock.symbol}
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={buyQuantity}
                  onChange={(e) => setBuyQuantity(parseInt(e.target.value) || 1)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div className={`p-3 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex justify-between">
                  <span>Price per share:</span>
                  <span>₹{selectedStock.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>₹{(selectedStock.price * buyQuantity).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBuyModal(false)}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBuyStock}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sell Stock Modal */}
      {showSellModal && selectedHolding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Sell {selectedHolding.stock_symbol}
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Quantity (Available: {selectedHolding.quantity})
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedHolding.quantity}
                  value={sellQuantity}
                  onChange={(e) => setSellQuantity(Math.min(parseInt(e.target.value) || 1, selectedHolding.quantity))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div className={`p-3 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex justify-between">
                  <span>Current price per share:</span>
                  <span>₹{selectedHolding.current_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Purchase price per share:</span>
                  <span>₹{selectedHolding.purchase_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total proceeds:</span>
                  <span>₹{(selectedHolding.current_price * sellQuantity).toFixed(2)}</span>
                </div>
                <div className={`flex justify-between font-semibold ${
                  ((selectedHolding.current_price - selectedHolding.purchase_price) * sellQuantity) >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}>
                  <span>P&L:</span>
                  <span>{((selectedHolding.current_price - selectedHolding.purchase_price) * sellQuantity) >= 0 ? '+' : ''}₹{((selectedHolding.current_price - selectedHolding.purchase_price) * sellQuantity).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSellModal(false)}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSellStock}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    isDarkMode ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  Sell Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}