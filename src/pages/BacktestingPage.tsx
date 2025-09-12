import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BacktestingEngine, StrategyImplementations } from '../services/backtestingEngine';
import { BacktestResult } from '../types';
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
  BarChart,
  Bar
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart2, ArrowRight } from 'lucide-react';

export function BacktestingPage() {
  const { selectedStocks, selectedStrategy, isDarkMode, setBacktestResults } = useAppContext();
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [backtestResults, setLocalBacktestResults] = useState<BacktestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const navigate = useNavigate();

  const periods = [
    { label: '1W', days: 7, description: '1 Week' },
    { label: '1M', days: 30, description: '1 Month' },
    { label: '3M', days: 90, description: '3 Months' },
    { label: '6M', days: 180, description: '6 Months' },
    { label: '1Y', days: 365, description: '1 Year' },
  ];

  const runBacktest = async () => {
    if (!selectedStrategy || selectedStocks.length === 0) return;

    setIsRunning(true);
    const results: BacktestResult[] = [];

    const days = periods.find(p => p.label === selectedPeriod)?.days || 30;
    console.log(`🔄 Running backtest for ${selectedPeriod} (${days} days)`);
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const stock of selectedStocks) {
      try {
        // Get default parameters for the strategy
        const parameters: any = {};
        selectedStrategy.parameters.forEach(param => {
          parameters[param.id] = param.defaultValue;
        });

        const result = await BacktestingEngine.runBacktest(
          stock,
          selectedStrategy,
          parameters,
          {
            initialCapital: 100000,
            startDate,
            endDate,
            commission: 10,
            days
          }
        );

        console.log(`✅ Backtest completed for ${stock.symbol}:`, result);
        results.push(result);
      } catch (error) {
        console.error(`Failed to backtest ${stock.symbol}:`, error);
      }
    }

    setLocalBacktestResults(results);
    if (results.length > 0) {
      setBacktestResults(results[0]); // Set the first result as the main result
    }
    setIsRunning(false);
  };

  const handleProceedToPredictions = () => {
    navigate('/predictions');
  };

  // Calculate aggregate metrics
  const aggregateMetrics = backtestResults.length > 0 ? {
    totalReturn: backtestResults.reduce((sum, result) => sum + result.totalReturn, 0) / backtestResults.length,
    winRate: backtestResults.filter(result => result.totalReturn > 0).length / backtestResults.length * 100,
    maxDrawdown: Math.max(...backtestResults.map(result => result.maxDrawdown)),
    sharpeRatio: backtestResults.reduce((sum, result) => sum + result.sharpeRatio, 0) / backtestResults.length
  } : null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Backtesting Results
        </h1>
        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Historical performance analysis of selected stocks and strategy
        </p>
      </div>

      {selectedStocks.length === 0 ? (
        <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-8 text-center`}>
          <div className="flex justify-center mb-4">
            <BarChart2 size={48} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
          </div>
          <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            No Stocks Selected
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please select stocks and a strategy to view backtesting results.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Market Status Info */}
          <div className={`rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'} p-4`}>
            <div className="flex items-center">
              <BarChart2 size={20} className={`mr-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <div>
                <p className={`font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-800'}`}>
                  Backtesting Available 24/7
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Historical analysis and strategy testing work regardless of market hours.
                </p>
              </div>
            </div>
          </div>

          {/* Backtest Controls */}
          <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Backtest Configuration
              </h2>
              <div className="flex items-center space-x-4">
                <div className="flex space-x-2">
                  {periods.map((period) => (
                    <button
                      key={period.label}
                      onClick={() => setSelectedPeriod(period.label)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        selectedPeriod === period.label
                          ? isDarkMode
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-100 text-emerald-700'
                          : isDarkMode
                          ? 'text-gray-400 hover:text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={runBacktest}
                  disabled={!selectedStrategy || isRunning}
                  className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center ${
                    !selectedStrategy || isRunning
                      ? isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-300 text-gray-500'
                      : isDarkMode
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Running Backtest...
                    </>
                  ) : (
                    <>
                      <BarChart2 size={16} className="mr-2" />
                      Run Backtest
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {selectedStrategy && (
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Selected Strategy: {selectedStrategy.name}
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {selectedStrategy.description}
                </p>
                <div className="mt-2 flex items-center space-x-4">
                  <span className={`text-xs px-2 py-1 rounded ${
                    selectedStrategy.riskLevel === 'Low' 
                      ? 'bg-green-100 text-green-800'
                      : selectedStrategy.riskLevel === 'Medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedStrategy.riskLevel} Risk
                  </span>
                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Period: {selectedPeriod} • Initial Capital: ₹1,00,000
                  </span>
                </div>
              </div>
            )}
          </div>
          {/* Results Summary */}
          {backtestResults.length > 0 && aggregateMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Average Return
                  </span>
                  <Activity className={`${aggregateMetrics.totalReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`} size={20} />
                </div>
                <div className={`text-2xl font-bold ${aggregateMetrics.totalReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {aggregateMetrics.totalReturn >= 0 ? '+' : ''}{aggregateMetrics.totalReturn.toFixed(2)}%
                </div>
              </div>
              
              <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Win Rate
                  </span>
                  <Activity className="text-emerald-500" size={20} />
                </div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {aggregateMetrics.winRate.toFixed(1)}%
                </div>
              </div>
              
              <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Max Drawdown
                  </span>
                  <BarChart2 className="text-red-500" size={20} />
                </div>
                <div className="text-2xl font-bold text-red-500">
                  -{aggregateMetrics.maxDrawdown.toFixed(2)}%
                </div>
              </div>
              
              <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Sharpe Ratio
                  </span>
                  <TrendingUp className="text-blue-500" size={20} />
                </div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {aggregateMetrics.sharpeRatio.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Equity Curves */}
          {backtestResults.length > 0 && (
            <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
              <h2 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Portfolio Equity Curves
              </h2>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
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
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      labelStyle={{ color: isDarkMode ? '#F3F4F6' : '#111827' }}
                    />
                    <Legend />
                    {backtestResults.map((result, index) => (
                      <Line
                        key={result.stockSymbol}
                        type="monotone"
                        data={result.equityCurve}
                        dataKey="value"
                        name={result.stockSymbol}
                        stroke={['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Individual Stock Results */}
          {backtestResults.length > 0 && (
            <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
              <h2 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Individual Stock Results
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Stock</th>
                      <th className={`text-right py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total Return</th>
                      <th className={`text-right py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Trades</th>
                      <th className={`text-right py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Max Drawdown</th>
                      <th className={`text-right py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Sharpe Ratio</th>
                      <th className={`text-right py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Final Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backtestResults.map((result, index) => (
                      <tr key={result.stockSymbol} className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <td className={`py-3 px-4 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {result.stockSymbol}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          result.totalReturn >= 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {result.totalReturn >= 0 ? '+' : ''}{result.totalReturn.toFixed(2)}%
                        </td>
                        <td className={`py-3 px-4 text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {result.trades.length}
                        </td>
                        <td className="py-3 px-4 text-right text-red-500">
                          -{result.maxDrawdown.toFixed(2)}%
                        </td>
                        <td className={`py-3 px-4 text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {result.sharpeRatio.toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          ₹{Math.round(result.finalValue).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedStrategy && backtestResults.length === 0 && (
            <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Ready to Backtest
                </h2>
              </div>
              <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <BarChart2 size={48} className="mx-auto mb-4" />
                <p className="text-lg mb-2">Click "Run Backtest" to analyze your strategy</p>
                <p className="text-sm">
                  Strategy: {selectedStrategy.name} • Stocks: {selectedStocks.length} • Period: {periods.find(p => p.label === selectedPeriod)?.description}
                </p>
              </div>
            </div>
          )}

          {/* Proceed to Predictions Button */}
          {backtestResults.length > 0 && (
            <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 text-center`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Backtesting Complete!
              </h3>
              <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Your strategy has been tested on historical data. Now generate AI predictions based on these results.
              </p>
              <button
                onClick={handleProceedToPredictions}
                className={`px-8 py-3 rounded-md font-medium transition-colors flex items-center mx-auto ${
                  isDarkMode
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                Proceed to Predictions
                <ArrowRight size={20} className="ml-2" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}