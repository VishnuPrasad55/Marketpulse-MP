import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Info, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Strategy, StrategyParameter } from '../types';

export const StrategyPage: React.FC = () => {
  const { strategies, selectedStrategy, selectStrategy, isDarkMode } = useAppContext();
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleStrategyClick = (strategyId: string) => {
    if (expandedStrategy === strategyId) {
      setExpandedStrategy(null);
    } else {
      setExpandedStrategy(strategyId);
    }
  };

  const handleSelectStrategy = (strategy: Strategy) => {
    selectStrategy(strategy);
  };

  const handleContinue = () => {
    if (selectedStrategy) {
      navigate('/backtesting');
    }
  };

  const getRiskBadgeClasses = (riskLevel: 'Low' | 'Medium' | 'High') => {
    const baseClasses = 'px-2 py-1 rounded-md text-xs font-medium';
    
    if (isDarkMode) {
      switch (riskLevel) {
        case 'Low':
          return `${baseClasses} bg-green-900 text-green-300`;
        case 'Medium':
          return `${baseClasses} bg-yellow-900 text-yellow-300`;
        case 'High':
          return `${baseClasses} bg-red-900 text-red-300`;
        default:
          return baseClasses;
      }
    } else {
      switch (riskLevel) {
        case 'Low':
          return `${baseClasses} bg-green-100 text-green-800`;
        case 'Medium':
          return `${baseClasses} bg-yellow-100 text-yellow-800`;
        case 'High':
          return `${baseClasses} bg-red-100 text-red-800`;
        default:
          return baseClasses;
      }
    }
  };

  const renderParameterControl = (param: StrategyParameter) => {
    switch (param.type) {
      case 'number':
        return (
          <div className="flex items-center">
            <input
              type="range"
              min={param.minValue}
              max={param.maxValue}
              step={param.step}
              defaultValue={param.defaultValue}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <span className={`ml-3 w-12 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {param.defaultValue}
            </span>
          </div>
        );
      case 'boolean':
        return (
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked={param.defaultValue} className="sr-only peer" />
            <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        );
      case 'select':
        return (
          <select
            defaultValue={param.defaultValue}
            className={`block w-full py-2 pl-3 pr-10 text-base border-none rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm ${
              isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
            }`}
          >
            {param.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Trading Strategies
        </h1>
        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Choose a trading strategy to backtest and implement.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className={`rounded-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow'}`}
              >
                <div
                  className={`flex items-center justify-between px-6 py-4 cursor-pointer transition-colors ${
                    expandedStrategy === strategy.id
                      ? isDarkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-50'
                      : ''
                  }`}
                  onClick={() => handleStrategyClick(strategy.id)}
                >
                  <div>
                    <h2 className={`text-xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {strategy.name}
                    </h2>
                    <div className="flex items-center mt-1">
                      <span className={getRiskBadgeClasses(strategy.riskLevel)}>
                        {strategy.riskLevel} Risk
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
                        selectedStrategy?.id === strategy.id
                          ? isDarkMode
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-100 text-emerald-800'
                          : isDarkMode
                          ? 'bg-gray-700 hover:bg-emerald-700 text-white'
                          : 'bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-600'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStrategy(strategy);
                      }}
                    >
                      {selectedStrategy?.id === strategy.id ? 'Selected' : 'Select'}
                    </button>
                    <div
                      className={`transform transition-transform ${
                        expandedStrategy === strategy.id ? 'rotate-90' : ''
                      }`}
                    >
                      <ArrowRight size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                    </div>
                  </div>
                </div>
                
                {expandedStrategy === strategy.id && (
                  <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <p className={`mb-4 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {strategy.description}
                    </p>
                    
                    <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Parameters
                    </h3>
                    <div className="space-y-4">
                      {strategy.parameters.map((param) => (
                        <div key={param.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                          <div>
                            <label 
                              className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                            >
                              {param.name}
                            </label>
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {param.description}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            {renderParameterControl(param)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow'} mb-6`}>
            <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Selected Strategy
              </h2>
            </div>
            <div className="p-4">
              {!selectedStrategy ? (
                <div className={`text-center py-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p>No strategy selected</p>
                  <p className="mt-2 text-sm">Select a strategy from the list to continue.</p>
                </div>
              ) : (
                <div>
                  <div className={`p-4 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedStrategy.name}
                    </h3>
                    <div className="flex items-center mt-1">
                      <span className={getRiskBadgeClasses(selectedStrategy.riskLevel)}>
                        {selectedStrategy.riskLevel} Risk
                      </span>
                    </div>
                    <p className={`mt-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {selectedStrategy.description}
                    </p>
                  </div>
                  
                  <button
                    onClick={handleContinue}
                    className={`mt-4 w-full px-4 py-2 rounded-md flex items-center justify-center font-medium transition-colors ${
                      isDarkMode
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    Continue to Backtesting
                    <ArrowRight size={16} className="ml-2" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow'}`}>
            <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Strategy Information
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div className={`p-4 rounded-md flex items-start space-x-3 ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                <div className="flex-shrink-0">
                  <Info size={20} className={isDarkMode ? 'text-blue-400' : 'text-blue-500'} />
                </div>
                <div>
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-800'}`}>
                    Strategy Analysis Available 24/7
                  </h3>
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    Strategy selection and backtesting work anytime. Only live trading is restricted to market hours.
                  </p>
                </div>
              </div>
              
              <div className={`p-4 rounded-md flex items-start space-x-3 ${isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
                <div className="flex-shrink-0">
                  <AlertTriangle size={20} className={isDarkMode ? 'text-amber-400' : 'text-amber-500'} />
                </div>
                <div>
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`}>
                    Risk Warning
                  </h3>
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                    Past performance does not guarantee future results. Always conduct thorough backtesting
                    before deploying any trading strategy with real capital.
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Popular Strategies
                </h3>
                <ul className={`space-y-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2"></div>
                    Moving Average Crossover
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2"></div>
                    RSI Overbought/Oversold
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2"></div>
                    Bollinger Bands Breakout
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};