import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, BarChart2, LineChart, Clock, Award } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const HomePage: React.FC = () => {
  const { isDarkMode } = useAppContext();
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h1 className={`text-4xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Welcome to <span className="text-emerald-500">MarketPulse</span>
        </h1>
        <p className={`text-xl max-w-3xl mx-auto ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Your platform for algorithmic trading in NSE and BSE markets with powerful 
          backtesting and predictive analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className={`p-8 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-md'}`}>
          <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Get Started
          </h2>
          <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Start your algorithmic trading journey in just a few simple steps.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-emerald-100'}`}>
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-emerald-700'}`}>1</span>
              </div>
              <div className="ml-4">
                <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Select Stocks
                </h3>
                <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Choose from a wide range of NSE and BSE listed stocks.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-emerald-100'}`}>
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-emerald-700'}`}>2</span>
              </div>
              <div className="ml-4">
                <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Choose Strategy
                </h3>
                <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Select from pre-built strategies or customize your own.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-emerald-100'}`}>
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-emerald-700'}`}>3</span>
              </div>
              <div className="ml-4">
                <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Backtest
                </h3>
                <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Test your strategy using historical market data.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-emerald-100'}`}>
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-emerald-700'}`}>4</span>
              </div>
              <div className="ml-4">
                <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Deploy
                </h3>
                <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Implement your strategy for real-time market trading.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/stocks')}
            className={`mt-8 px-6 py-3 rounded-md font-medium transition-colors ${
              isDarkMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            Start Trading
          </button>
        </div>

        <div className={`p-8 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-md'} relative overflow-hidden`}>
          <div className="relative z-10">
            <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Market Insights
            </h2>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Today's market overview and key insights.
            </p>
            <div className="space-y-4">
              <div className={`p-4 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>NIFTY 50</span>
                  <span className="text-emerald-500 font-medium">+1.2%</span>
                </div>
                <div className="h-10 w-full bg-gray-600 rounded-sm"></div>
              </div>
              <div className={`p-4 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>SENSEX</span>
                  <span className="text-emerald-500 font-medium">+0.9%</span>
                </div>
                <div className="h-10 w-full bg-gray-600 rounded-sm"></div>
              </div>
              <div className={`p-4 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Top Gainers</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>RELIANCE</span>
                    <span className="text-emerald-500">+2.3%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>TATASTEEL</span>
                    <span className="text-emerald-500">+1.8%</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className={`mt-6 px-6 py-3 rounded-md font-medium transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              View Full Dashboard
            </button>
          </div>
          <div className="absolute right-0 bottom-0 transform translate-x-1/4 translate-y-1/4 opacity-5">
            <TrendingUp size={240} />
          </div>
        </div>
      </div>

      <div className="mb-16">
        <h2 className={`text-2xl font-bold mb-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className={`p-6 rounded-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-md'}`}>
            <div className="flex justify-center mb-4">
              <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-900' : 'bg-blue-100'}`}>
                <TrendingUp size={24} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
              </div>
            </div>
            <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Advanced Stock Screening
            </h3>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Filter stocks based on various technical and fundamental parameters.
            </p>
          </div>
          <div className={`p-6 rounded-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-md'}`}>
            <div className="flex justify-center mb-4">
              <div className={`p-3 rounded-full ${isDarkMode ? 'bg-purple-900' : 'bg-purple-100'}`}>
                <BarChart2 size={24} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
              </div>
            </div>
            <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Comprehensive Backtesting
            </h3>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Test your strategies against historical data with detailed performance metrics.
            </p>
          </div>
          <div className={`p-6 rounded-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-md'}`}>
            <div className="flex justify-center mb-4">
              <div className={`p-3 rounded-full ${isDarkMode ? 'bg-green-900' : 'bg-green-100'}`}>
                <LineChart size={24} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
              </div>
            </div>
            <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Predictive Analytics
            </h3>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Get future price predictions based on advanced machine learning models.
            </p>
          </div>
          <div className={`p-6 rounded-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-md'}`}>
            <div className="flex justify-center mb-4">
              <div className={`p-3 rounded-full ${isDarkMode ? 'bg-amber-900' : 'bg-amber-100'}`}>
                <Clock size={24} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
              </div>
            </div>
            <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Automated Trading
            </h3>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Set up and deploy algorithmic trading strategies with customizable parameters.
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-lg p-8 mb-16 ${isDarkMode ? 'bg-gray-800' : 'bg-emerald-50'}`}>
        <div className="flex flex-col md:flex-row items-center">
          <div className="mb-6 md:mb-0 md:mr-8 flex-shrink-0">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-emerald-700' : 'bg-emerald-200'}`}>
              <Award size={32} className={isDarkMode ? 'text-emerald-300' : 'text-emerald-700'} />
            </div>
          </div>
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Ready to upgrade your trading strategy?
            </h2>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              MarketPulse provides you with the tools to make data-driven trading decisions.
              Get started today and experience the difference.
            </p>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => navigate('/stocks')}
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                Start Trading
              </button>
              <button
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'border border-emerald-600 text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};