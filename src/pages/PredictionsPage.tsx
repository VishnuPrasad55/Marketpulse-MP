import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { PredictionEngine } from '../services/predictionEngine';
import { Prediction } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Brain, ArrowRight, BarChart2 } from 'lucide-react';

export function PredictionsPage() {
  const { isDarkMode, selectedStocks, savePrediction, backtestResults } = useAppContext();
  const [predictionDays, setPredictionDays] = useState(7);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  const generatePredictions = async () => {
    if (selectedStocks.length === 0) return;

    setIsGenerating(true);
    const newPredictions = [];

    for (const stock of selectedStocks) {
      try {
        // Find corresponding backtest result for this stock
        const stockBacktestResult = Array.isArray(backtestResults) 
          ? backtestResults.find(result => result.stockSymbol === stock.symbol)
          : (backtestResults?.stockSymbol === stock.symbol ? backtestResults : null);
        
        console.log(`🧠 Generating prediction for ${stock.symbol} with backtest data:`, stockBacktestResult);
        
        // Generate AI-powered prediction using backtest results
        const prediction = await PredictionEngine.generatePrediction(stock, {
          days: predictionDays,
          confidence: 80,
          useML: true
        }, stockBacktestResult);

        // Generate prediction chart data
        const chartData = [];
        const priceStep = (prediction.predictedPrice - stock.price) / predictionDays;
        
        for (let i = 0; i <= predictionDays; i++) {
          const date = new Date();
          date.setDate(date.getDate() + i);
          
          const predictedPrice = stock.price + (priceStep * i);
          const confidence = Math.max(prediction.confidence - (i * 2), 40); // Confidence decreases over time
          
          chartData.push({
            date: date.toISOString().split('T')[0],
            actual: i === 0 ? stock.price : null,
            predicted: predictedPrice,
            confidence: confidence,
          });
        }

        newPredictions.push({
          ...stock,
          predictions: chartData,
          direction: prediction.predictedDirection,
          confidence: prediction.confidence,
          aiPrediction: prediction
        });
      } catch (error) {
        console.error(`Failed to generate prediction for ${stock.symbol}:`, error);
        // Add fallback prediction
        newPredictions.push({
          ...stock,
          predictions: [],
          direction: 'NEUTRAL',
          confidence: 50,
          aiPrediction: null
        });
      }
    }

    setPredictions(newPredictions);
    setIsGenerating(false);
  };

  const handleSavePredictions = async () => {
    // Save predictions to database
    for (const stock of predictions) {
      const finalPrediction = stock.predictions[stock.predictions.length - 1];
      await savePrediction({
        stock_symbol: stock.symbol,
        predicted_price: finalPrediction?.predicted || stock.price,
        predicted_direction: stock.direction,
        confidence: stock.confidence,
        target_date: finalPrediction?.date || new Date(Date.now() + predictionDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
  };

  const handleGoToDashboard = async () => {
    await handleSavePredictions();
    navigate('/dashboard');
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Market Predictions
            </h1>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              AI-powered price predictions and market analysis for your selected stocks.
            </p>
          </div>
          {selectedStocks.length > 0 && predictions.length > 0 && (
            <button
              onClick={handleGoToDashboard}
              className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center ${
                isDarkMode
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              Go to Dashboard
              <ArrowRight size={16} className="ml-2" />
            </button>
          )}
        </div>
      </div>

      {selectedStocks.length === 0 ? (
        <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-8 text-center`}>
          <div className="flex justify-center mb-4">
            <Brain size={48} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
          </div>
          <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            No Stocks Selected
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please select stocks to view AI-powered predictions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Market Status Info */}
          <div className="lg:col-span-3">
            <div className={`rounded-lg ${isDarkMode ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'} p-4 mb-6`}>
              <div className="flex items-center">
                <Brain size={20} className={`mr-3 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                <div>
                  <p className={`font-medium ${isDarkMode ? 'text-purple-400' : 'text-purple-800'}`}>
                    AI Predictions Available Anytime
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    Generate market predictions and analysis regardless of trading hours.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Prediction Controls */}
          <div className="lg:col-span-3">
            <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 mb-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    AI Prediction Engine
                  </h2>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Generate AI-powered predictions using technical analysis and machine learning
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Prediction Period:
                    </label>
                    <select
                      value={predictionDays}
                      onChange={(e) => setPredictionDays(parseInt(e.target.value))}
                      className={`px-3 py-1 rounded-md border-none focus:ring-2 focus:ring-emerald-500 ${
                        isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
                      }`}
                    >
                      <option value={1}>1 Day</option>
                      <option value={7}>1 Week</option>
                      <option value={30}>1 Month</option>
                      <option value={90}>3 Months</option>
                    </select>
                  </div>
                  <button
                    onClick={generatePredictions}
                    disabled={isGenerating}
                    className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center ${
                      isGenerating
                        ? isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-300 text-gray-500'
                        : isDarkMode
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Brain size={16} className="mr-2" />
                        Generate Predictions
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {predictions.length === 0 ? (
              <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-12 text-center`}>
                <Brain size={64} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Ready to Generate Predictions
                </h3>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Click "Generate Predictions" to analyze your selected stocks using AI-powered algorithms
                </p>
                <div className={`mt-4 inline-flex items-center px-4 py-2 rounded-md ${
                  isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                }`}>
                  <Brain size={20} className="mr-2" />
                  <span>{selectedStocks.length} stocks ready for analysis</span>
                </div>
              </div>
            ) : (
              predictions.map((stock) => (
              <div
                key={stock.symbol}
                className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {stock.name} ({stock.symbol})
                    </h2>
                    <div className="flex items-center mt-1">
                      {stock.direction === 'UP' ? (
                        <TrendingUp size={16} className="text-emerald-500 mr-1" />
                      ) : (
                        <TrendingDown size={16} className="text-red-500 mr-1" />
                      )}
                      <span className={stock.direction === 'UP' ? 'text-emerald-500' : 'text-red-500'}>
                        Predicted {stock.direction.toLowerCase()}trend
                      </span>
                    </div>
                  </div>
                  <div className={`text-right ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <div className="text-2xl font-bold">₹{stock.price.toFixed(2)}</div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Current Price (₹)
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-md mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {predictionDays}-Day Forecast (₹)
                      </div>
                      <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        ₹{stock.predictions[stock.predictions.length - 1]?.predicted?.toFixed(2) || stock.price.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Expected Return (%)
                      </div>
                      <div className={`font-medium ${
                        (stock.predictions[stock.predictions.length - 1]?.predicted || stock.price) > stock.price ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {(((stock.predictions[stock.predictions.length - 1]?.predicted || stock.price) - stock.price) / stock.price * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Confidence
                      </div>
                      <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {stock.confidence}%
                      </div>
                    </div>
                  </div>
                </div>

                {stock.predictions.length > 0 && (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stock.predictions}>
                        <defs>
                          <linearGradient id={`gradientPredicted-${stock.symbol}`} x1="0" y1="0" x2="0" y2="1">
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
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="actual"
                          stroke="#6366F1"
                          fill="url(#gradient-actual)"
                          name="Current Price"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="predicted"
                          stroke="#10B981"
                          fill={`url(#gradientPredicted-${stock.symbol})`}
                          name="AI Prediction"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              ))
            )}
          </div>

          <div className="lg:col-span-1">
            <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} mb-6`}>
              <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Market Analysis
                </h2>
              </div>
              <div className="p-4 space-y-4">
                <div className={`p-4 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Market Sentiment
                  </h3>
                  {predictions.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Bullish Signals</span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${(predictions.filter(p => p.direction === 'UP').length / predictions.length) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-emerald-500">
                          {Math.round((predictions.filter(p => p.direction === 'UP').length / predictions.length) * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Avg Confidence</span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-blue-500">
                          {Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length)}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Generate predictions to see market sentiment analysis
                    </p>
                  )}
                </div>

                <div className={`p-4 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    AI Analysis Summary
                  </h3>
                  {predictions.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Stocks Analyzed</span>
                        <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{predictions.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Bullish Predictions</span>
                        <span className="text-emerald-500">{predictions.filter(p => p.direction === 'UP').length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Bearish Predictions</span>
                        <span className="text-red-500">{predictions.filter(p => p.direction === 'DOWN').length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Neutral Predictions</span>
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{predictions.filter(p => p.direction === 'NEUTRAL').length}</span>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      AI analysis will appear here after generating predictions
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Disclaimer
                </h2>
              </div>
              <div className="p-4">
                <div className={`p-4 rounded-md flex items-start space-x-3 ${isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
                  <div className="flex-shrink-0">
                    <AlertTriangle size={20} className={isDarkMode ? 'text-amber-400' : 'text-amber-500'} />
                  </div>
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                      Predictions are based on historical data and market analysis. Past performance does not guarantee future results. Always conduct your own research before making investment decisions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}