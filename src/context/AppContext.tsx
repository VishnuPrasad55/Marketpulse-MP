import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Stock, Strategy, BacktestResult, TradingParameters } from '../types';
import { getStocksWithRealTimeData } from '../data/mockStocks';
import { mockStrategies } from '../data/mockStrategies';
import { useAuth } from '../hooks/useAuth';
import { supabase, UserProfile, UserStock, UserStrategy, UserPrediction, UserPortfolio, TradingParametersDB } from '../lib/supabase';
import { stockApi } from '../services/stockApi';

interface AppContextType {
  // User data
  userProfile: UserProfile | null;
  
  // Stocks
  stocks: Stock[];
  selectedStocks: Stock[];
  userPortfolio: UserPortfolio[];
  
  // Strategies
  strategies: Strategy[];
  selectedStrategy: Strategy | null;
  
  // Predictions
  userPredictions: UserPrediction[];
  
  // Other state
  backtestResults: BacktestResult | null;
  tradingParameters: TradingParameters;
  isDarkMode: boolean;
  isLoading: boolean;
  
  // Actions
  selectStock: (stock: Stock) => Promise<void>;
  unselectStock: (symbol: string) => Promise<void>;
  selectStrategy: (strategy: Strategy) => Promise<void>;
  savePrediction: (prediction: Omit<UserPrediction, 'id' | 'user_id' | 'prediction_date'>) => Promise<void>;
  buyStock: (stock: Stock, quantity: number) => Promise<void>;
  sellStock: (stockSymbol: string, quantity: number) => Promise<void>;
  setBacktestResults: (results: BacktestResult) => void;
  updateTradingParameters: (params: Partial<TradingParameters>) => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  toggleDarkMode: () => void;
  refreshUserData: () => Promise<void>;
}

const defaultTradingParameters: TradingParameters = {
  initialCapital: 100000,
  positionSize: 10,
  maxOpenPositions: 5,
  stopLoss: 5,
  takeProfit: 15,
  trailingStop: false,
  autoRebalance: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<Stock[]>([]);
  const [userPortfolio, setUserPortfolio] = useState<UserPortfolio[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [userPredictions, setUserPredictions] = useState<UserPrediction[]>([]);
  const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(null);
  const [tradingParameters, setTradingParameters] = useState<TradingParameters>(defaultTradingParameters);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      refreshUserData();
    } else {
      // Clear user data when logged out
      setUserProfile(null);
      setSelectedStocks([]);
      setUserPortfolio([]);
      setSelectedStrategy(null);
      setUserPredictions([]);
      setTradingParameters(defaultTradingParameters);
    }
  }, [user]);

  // Load stocks and strategies
  useEffect(() => {
    setIsLoading(true);
    
    const loadStocks = async () => {
      try {
        const stocksData = await getStocksWithRealTimeData();
        setStocks(stocksData);
      } catch (error) {
        console.error('Failed to load stocks:', error);
        setStocks([]);
      }
      setStrategies(mockStrategies);
      setIsLoading(false);
    };
    
    loadStocks();
    
    // Set up periodic refresh for stock data during market hours
    const interval = setInterval(async () => {
      const marketStatus = stockApi.getMarketStatus();
      if (marketStatus.isOpen) {
        try {
          const stocksData = await getStocksWithRealTimeData();
          setStocks(stocksData);
        } catch (error) {
          console.error('Failed to refresh stock data:', error);
        }
      }
    }, 60000); // Refresh every minute during market hours
    
    return () => clearInterval(interval);
  }, []);

  const refreshUserData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Load user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserProfile(profile);
      }

      // Load selected stocks
      const { data: userStocks } = await supabase
        .from('user_stocks')
        .select('*')
        .eq('user_id', user.id)
        .order('selected_at', { ascending: false });

      if (userStocks) {
        const stocksData = userStocks.map(us => ({
          symbol: us.symbol,
          name: us.name,
          price: us.price,
          change: Math.random() * 10 - 5, // Mock real-time data
          changePercent: Math.random() * 2 - 1,
          market: us.market as 'NSE' | 'BSE',
          sector: us.sector || undefined,
          volume: Math.floor(Math.random() * 1000000)
        }));
        setSelectedStocks(stocksData);
      }

      // Load user portfolio
      const { data: portfolio } = await supabase
        .from('user_portfolio')
        .select('*')
        .eq('user_id', user.id)
        .order('purchase_date', { ascending: false });

      if (portfolio) {
        setUserPortfolio(portfolio);
      }

      // Load selected strategy
      const { data: userStrategy } = await supabase
        .from('user_strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('selected_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userStrategy) {
        const strategy = mockStrategies.find(s => s.id === userStrategy.strategy_id);
        if (strategy) {
          setSelectedStrategy(strategy);
        }
      }

      // Load predictions
      const { data: predictions } = await supabase
        .from('user_predictions')
        .select('*')
        .eq('user_id', user.id)
        .order('prediction_date', { ascending: false });

      if (predictions) {
        setUserPredictions(predictions);
      }

      // Load trading parameters
      const { data: params } = await supabase
        .from('trading_parameters')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (params) {
        setTradingParameters({
          initialCapital: params.initial_capital,
          positionSize: params.position_size,
          maxOpenPositions: params.max_open_positions,
          stopLoss: params.stop_loss,
          takeProfit: params.take_profit,
          trailingStop: params.trailing_stop,
          autoRebalance: params.auto_rebalance,
        });
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectStock = async (stock: Stock) => {
    if (!user) return;

    try {
      // Check if already selected
      const isAlreadySelected = selectedStocks.some(s => s.symbol === stock.symbol);
      if (isAlreadySelected) return;

      // Save to database
      const { error } = await supabase
        .from('user_stocks')
        .insert({
          user_id: user.id,
          symbol: stock.symbol,
          name: stock.name,
          price: stock.price,
          market: stock.market,
          sector: stock.sector
        });

      if (error) throw error;

      // Update local state
      setSelectedStocks([...selectedStocks, stock]);
    } catch (error) {
      console.error('Error selecting stock:', error);
    }
  };

  const unselectStock = async (symbol: string) => {
    if (!user) return;

    try {
      // Remove from database
      const { error } = await supabase
        .from('user_stocks')
        .delete()
        .eq('user_id', user.id)
        .eq('symbol', symbol);

      if (error) throw error;

      // Update local state
      setSelectedStocks(selectedStocks.filter(stock => stock.symbol !== symbol));
    } catch (error) {
      console.error('Error unselecting stock:', error);
    }
  };

  const selectStrategy = async (strategy: Strategy) => {
    if (!user) return;

    try {
      // Save to database
      const { error } = await supabase
        .from('user_strategies')
        .insert({
          user_id: user.id,
          strategy_id: strategy.id,
          strategy_name: strategy.name,
          parameters: {}
        });

      if (error) throw error;

      // Update local state
      setSelectedStrategy(strategy);
    } catch (error) {
      console.error('Error selecting strategy:', error);
    }
  };

  const savePrediction = async (prediction: Omit<UserPrediction, 'id' | 'user_id' | 'prediction_date'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_predictions')
        .insert({
          user_id: user.id,
          ...prediction
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setUserPredictions([data, ...userPredictions]);
    } catch (error) {
      console.error('Error saving prediction:', error);
    }
  };

  const buyStock = async (stock: Stock, quantity: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_portfolio')
        .insert({
          user_id: user.id,
          stock_symbol: stock.symbol,
          stock_name: stock.name,
          quantity,
          purchase_price: stock.price,
          current_price: stock.price
        });

      if (error) throw error;

      // Refresh portfolio data
      await refreshUserData();
    } catch (error) {
      console.error('Error buying stock:', error);
    }
  };

  const sellStock = async (stockSymbol: string, quantity: number) => {
    if (!user) return;

    try {
      // Find the holding to sell
      const holding = userPortfolio.find(h => h.stock_symbol === stockSymbol);
      if (!holding) throw new Error('Holding not found');

      if (holding.quantity === quantity) {
        // Sell all shares - delete the holding
        const { error } = await supabase
          .from('user_portfolio')
          .delete()
          .eq('id', holding.id);

        if (error) throw error;
      } else {
        // Partial sell - update quantity
        const { error } = await supabase
          .from('user_portfolio')
          .update({
            quantity: holding.quantity - quantity
          })
          .eq('id', holding.id);

        if (error) throw error;
      }

      // Refresh portfolio data
      await refreshUserData();
    } catch (error) {
      console.error('Error selling stock:', error);
    }
  };
  const updateTradingParameters = async (params: Partial<TradingParameters>) => {
    if (!user) return;

    try {
      const updatedParams = { ...tradingParameters, ...params };
      
      const { error } = await supabase
        .from('trading_parameters')
        .upsert({
          user_id: user.id,
          initial_capital: updatedParams.initialCapital,
          position_size: updatedParams.positionSize,
          max_open_positions: updatedParams.maxOpenPositions,
          stop_loss: updatedParams.stopLoss,
          take_profit: updatedParams.takeProfit,
          trailing_stop: updatedParams.trailingStop,
          auto_rebalance: updatedParams.autoRebalance
        });

      if (error) throw error;

      setTradingParameters(updatedParams);
    } catch (error) {
      console.error('Error updating trading parameters:', error);
    }
  };

  const updateUserProfile = async (profile: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(profile)
        .eq('id', user.id);

      if (error) throw error;

      setUserProfile(prev => prev ? { ...prev, ...profile } : null);
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <AppContext.Provider
      value={{
        userProfile,
        stocks,
        selectedStocks,
        userPortfolio,
        strategies,
        selectedStrategy,
        userPredictions,
        backtestResults,
        tradingParameters,
        isDarkMode,
        isLoading,
        selectStock,
        unselectStock,
        selectStrategy,
        savePrediction,
        buyStock,
        sellStock,
        setBacktestResults,
        updateTradingParameters,
        updateUserProfile,
        toggleDarkMode,
        refreshUserData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};