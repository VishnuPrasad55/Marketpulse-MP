import { Stock } from '../types';
import { stockApi } from '../services/stockApi';

const STOCK_METADATA = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries',
    market: 'NSE',
    sector: 'Oil & Gas',
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    market: 'NSE',
    sector: 'IT',
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank',
    market: 'NSE',
    sector: 'Banking',
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank',
    market: 'NSE',
    sector: 'Banking',
  },
  {
    symbol: 'INFY',
    name: 'Infosys',
    market: 'NSE',
    sector: 'IT',
  },
  {
    symbol: 'TATASTEEL',
    name: 'Tata Steel',
    market: 'NSE',
    sector: 'Metal',
  },
  {
    symbol: 'SBIN',
    name: 'State Bank of India',
    market: 'NSE',
    sector: 'Banking',
  },
  {
    symbol: 'BAJAJAUTO',
    name: 'Bajaj Auto',
    market: 'NSE',
    sector: 'Automobile',
  },
  {
    symbol: 'HINDUNILVR',
    name: 'Hindustan Unilever',
    market: 'NSE',
    sector: 'FMCG',
  },
  {
    symbol: 'LT',
    name: 'Larsen & Toubro',
    market: 'NSE',
    sector: 'Construction',
  },
  // BSE stocks
  {
    symbol: 'TATAMOTORS.B',
    name: 'Tata Motors',
    market: 'BSE',
    sector: 'Automobile',
  },
  {
    symbol: 'BHARTIARTL.B',
    name: 'Bharti Airtel',
    market: 'BSE',
    sector: 'Telecom',
  },
  {
    symbol: 'ASIANPAINT.B',
    name: 'Asian Paints',
    market: 'BSE',
    sector: 'Paints',
  }
];

export const getStocksWithRealTimeData = async (): Promise<Stock[]> => {
  console.log('🚀 Loading stocks with real-time data...');
  console.log('🔧 Environment check:', {
    nodeEnv: import.meta.env.MODE,
    hasApiKey: !!import.meta.env.VITE_ALPHA_VANTAGE_API_KEY,
    apiKeyPreview: import.meta.env.VITE_ALPHA_VANTAGE_API_KEY?.substring(0, 8) + '...'
  });
  
  try {
    const symbols = STOCK_METADATA.map(stock => stock.symbol);
    console.log('📋 Symbols to fetch:', symbols);
    
    // Fetch all stocks but with rate limiting built into the API service
    console.log('🔄 Fetching real-time data for all stocks...');
    
    const realTimeQuotes = await stockApi.getMultipleQuotes(symbols);
    console.log('📊 Received real-time quotes:', realTimeQuotes);
    
    // Create a map for quick lookup
    const quoteMap = new Map();
    realTimeQuotes.forEach(quote => {
      quoteMap.set(quote.symbol, quote);
    });
    
    const finalStocks = STOCK_METADATA.map(stock => {
      const realTimeQuote = quoteMap.get(stock.symbol);
      
      if (realTimeQuote) {
        console.log(`✅ Using real-time data for ${stock.symbol}`);
        return {
          symbol: stock.symbol,
          name: stock.name,
          price: realTimeQuote.price,
          change: realTimeQuote.change,
          changePercent: realTimeQuote.changePercent,
          volume: realTimeQuote.volume,
          market: stock.market,
          sector: stock.sector
        };
      } else {
        console.log(`⚠️ Using fallback data for ${stock.symbol}`);
        // Generate realistic fallback data
        const basePrice = Math.random() * 1000 + 100;
        const change = (Math.random() - 0.5) * 20;
        const changePercent = (change / basePrice) * 100;
        
        return {
          symbol: stock.symbol,
          name: stock.name,
          price: basePrice,
          change: change,
          changePercent: changePercent,
          volume: Math.floor(Math.random() * 1000000) + 500000,
          market: stock.market,
          sector: stock.sector
        };
      }
    });
    
    console.log('🎯 Final stocks data:', finalStocks);
    return finalStocks;
  } catch (error) {
    console.error('❌ Error fetching real-time stock data:', error);
    
    // Return fallback data with simulated prices
    console.log('⚠️ Using complete fallback data for all stocks');
    return STOCK_METADATA.map(stock => {
      const basePrice = Math.random() * 1000 + 100;
      const change = (Math.random() - 0.5) * 20;
      const changePercent = (change / basePrice) * 100;
      
      return {
        symbol: stock.symbol,
        name: stock.name,
        price: basePrice,
        change: change,
        changePercent: changePercent,
        volume: Math.floor(Math.random() * 1000000) + 500000,
        market: stock.market,
        sector: stock.sector
      };
    });
  }
};