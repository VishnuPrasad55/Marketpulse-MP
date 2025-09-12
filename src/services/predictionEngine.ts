// AI-Powered Prediction Engine
import { Stock, Prediction } from '../types';
import { TechnicalIndicators } from './backtestingEngine';
import { historicalDataService } from './historicalDataService';

export interface PredictionConfig {
  days: number;
  confidence: number;
  useML: boolean;
}

export class PredictionEngine {
  // Simple Linear Regression for trend prediction
  static linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const r2 = 1 - (ssRes / ssTot);

    return { slope, intercept, r2 };
  }

  // Moving Average Convergence Divergence prediction
  static macdPrediction(prices: number[]): { direction: 'UP' | 'DOWN' | 'NEUTRAL'; strength: number } {
    const macdData = TechnicalIndicators.macd(prices);
    const latestMACD = macdData.macd[macdData.macd.length - 1];
    const latestSignal = macdData.signal[macdData.signal.length - 1];
    const latestHistogram = macdData.histogram[macdData.histogram.length - 1];

    let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    let strength = 0;

    if (latestMACD > latestSignal && latestHistogram > 0) {
      direction = 'UP';
      strength = Math.min(Math.abs(latestHistogram) * 10, 1);
    } else if (latestMACD < latestSignal && latestHistogram < 0) {
      direction = 'DOWN';
      strength = Math.min(Math.abs(latestHistogram) * 10, 1);
    }

    return { direction, strength };
  }

  // RSI-based momentum prediction
  static rsiMomentum(prices: number[]): { direction: 'UP' | 'DOWN' | 'NEUTRAL'; strength: number } {
    const rsi = TechnicalIndicators.rsi(prices);
    const latestRSI = rsi[rsi.length - 1];
    const prevRSI = rsi[rsi.length - 2];

    let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    let strength = 0;

    if (latestRSI < 30 && latestRSI > prevRSI) {
      // Oversold and recovering
      direction = 'UP';
      strength = (30 - latestRSI) / 30;
    } else if (latestRSI > 70 && latestRSI < prevRSI) {
      // Overbought and declining
      direction = 'DOWN';
      strength = (latestRSI - 70) / 30;
    } else if (latestRSI > 50 && latestRSI > prevRSI) {
      // Bullish momentum
      direction = 'UP';
      strength = Math.min((latestRSI - 50) / 50, 0.7);
    } else if (latestRSI < 50 && latestRSI < prevRSI) {
      // Bearish momentum
      direction = 'DOWN';
      strength = Math.min((50 - latestRSI) / 50, 0.7);
    }

    return { direction, strength };
  }

  // Bollinger Bands squeeze prediction
  static bollingerSqueeze(prices: number[]): { direction: 'UP' | 'DOWN' | 'NEUTRAL'; strength: number } {
    const bollinger = TechnicalIndicators.bollinger(prices, 20, 2);
    const latestPrice = prices[prices.length - 1];
    const latestUpper = bollinger.upper[bollinger.upper.length - 1];
    const latestLower = bollinger.lower[bollinger.lower.length - 1];
    const latestMiddle = bollinger.middle[bollinger.middle.length - 1];

    const bandWidth = (latestUpper - latestLower) / latestMiddle;
    const pricePosition = (latestPrice - latestLower) / (latestUpper - latestLower);

    let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    let strength = 0;

    if (bandWidth < 0.1) { // Squeeze condition
      if (pricePosition > 0.6) {
        direction = 'UP';
        strength = 0.8;
      } else if (pricePosition < 0.4) {
        direction = 'DOWN';
        strength = 0.8;
      }
    } else {
      if (latestPrice > latestUpper) {
        direction = 'UP';
        strength = Math.min((latestPrice - latestUpper) / latestUpper, 0.6);
      } else if (latestPrice < latestLower) {
        direction = 'DOWN';
        strength = Math.min((latestLower - latestPrice) / latestLower, 0.6);
      }
    }

    return { direction, strength };
  }

  // Volume-Price Trend analysis
  static volumePriceTrend(prices: number[], volumes: number[]): { direction: 'UP' | 'DOWN' | 'NEUTRAL'; strength: number } {
    if (prices.length < 10 || volumes.length < 10) {
      return { direction: 'NEUTRAL', strength: 0 };
    }

    const recentPrices = prices.slice(-10);
    const recentVolumes = volumes.slice(-10);
    
    let upVolume = 0;
    let downVolume = 0;

    for (let i = 1; i < recentPrices.length; i++) {
      if (recentPrices[i] > recentPrices[i - 1]) {
        upVolume += recentVolumes[i];
      } else if (recentPrices[i] < recentPrices[i - 1]) {
        downVolume += recentVolumes[i];
      }
    }

    const totalVolume = upVolume + downVolume;
    if (totalVolume === 0) return { direction: 'NEUTRAL', strength: 0 };

    const upRatio = upVolume / totalVolume;
    let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    let strength = 0;

    if (upRatio > 0.6) {
      direction = 'UP';
      strength = (upRatio - 0.5) * 2;
    } else if (upRatio < 0.4) {
      direction = 'DOWN';
      strength = (0.5 - upRatio) * 2;
    }

    return { direction, strength };
  }

  // Main prediction function
  static async generatePrediction(stock: Stock, config: PredictionConfig, backtestResult?: any): Promise<Prediction> {
    // Get real historical data for analysis
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 year of data
    
    const historicalData = await historicalDataService.getHistoricalData(stock.symbol, startDate, endDate);
    
    if (historicalData.length < 50) {
      console.warn(`Insufficient historical data for ${stock.symbol}, using fallback prediction`);
      return this.generateFallbackPrediction(stock, config);
    }
    
    const prices = historicalData.map(d => d.price);
    const volumes = historicalData.map(d => d.volume || 1000000);

    // Apply multiple prediction models
    const trendAnalysis = this.linearRegression(
      Array.from({ length: prices.length }, (_, i) => i),
      prices
    );

    const macdPred = this.macdPrediction(prices);
    const rsiPred = this.rsiMomentum(prices);
    const bollingerPred = this.bollingerSqueeze(prices);
    const volumePred = this.volumePriceTrend(prices, volumes);

    // Combine predictions with weights
    const predictions = [
      { ...macdPred, weight: 0.25 },
      { ...rsiPred, weight: 0.25 },
      { ...bollingerPred, weight: 0.25 },
      { ...volumePred, weight: 0.25 }
    ];

    let upScore = 0;
    let downScore = 0;

    predictions.forEach(pred => {
      if (pred.direction === 'UP') {
        upScore += pred.strength * pred.weight;
      } else if (pred.direction === 'DOWN') {
        downScore += pred.strength * pred.weight;
      }
    });

    // Determine final direction
    let finalDirection: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    let confidence = 50;

    if (upScore > downScore && upScore > 0.3) {
      // Boost confidence if backtest results support the prediction
      if (backtestResult && backtestResult.totalReturn > 5) {
        upScore *= 1.2; // 20% boost for good backtest performance
      }
      finalDirection = 'UP';
      confidence = Math.min(50 + (upScore * 100), 95);
    } else if (downScore > upScore && downScore > 0.3) {
      // Boost confidence if backtest results support the prediction
      if (backtestResult && backtestResult.totalReturn > 5) {
        downScore *= 1.2;
      }
      finalDirection = 'DOWN';
      confidence = Math.min(50 + (downScore * 100), 95);
    } else {
      confidence = 40 + Math.random() * 20; // 40-60% for neutral
    }

    // Calculate predicted price based on trend and direction
    const trendFactor = trendAnalysis.slope * config.days;
    const directionFactor = finalDirection === 'UP' ? 0.05 : finalDirection === 'DOWN' ? -0.05 : 0;
    const volatilityFactor = (Math.random() - 0.5) * 0.02; // ±1% random factor

    const predictedPrice = stock.price * (1 + trendFactor + directionFactor + volatilityFactor);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + config.days);

    return {
      stockSymbol: stock.symbol,
      date: new Date().toISOString().split('T')[0],
      predictedPrice: Math.max(predictedPrice, stock.price * 0.5), // Minimum 50% of current price
      predictedDirection: finalDirection,
      confidence: Math.floor(confidence)
    };
  }

  // Generate multiple predictions for different time horizons
  static generateMultiplePredictions(stock: Stock): Prediction[] {
    const timeHorizons = [1, 7, 30]; // 1 day, 1 week, 1 month
    const predictions: Prediction[] = [];

    timeHorizons.forEach(days => {
      const config: PredictionConfig = {
        days,
        confidence: 80,
        useML: true
      };

      const prediction = this.generatePrediction(stock, config);
      predictions.push(prediction);
    });

    return predictions;
  }

  // Fallback prediction when no historical data is available
  static generateFallbackPrediction(stock: Stock, config: PredictionConfig): Prediction {
    const direction: 'UP' | 'DOWN' | 'NEUTRAL' = Math.random() > 0.5 ? 'UP' : 'DOWN';
    const priceChange = (Math.random() - 0.5) * 0.1; // ±5% change
    const predictedPrice = stock.price * (1 + priceChange);
    
    return {
      stockSymbol: stock.symbol,
      date: new Date().toISOString().split('T')[0],
      predictedPrice: Math.max(predictedPrice, stock.price * 0.5),
      predictedDirection: direction,
      confidence: Math.floor(Math.random() * 30) + 50 // 50-80% confidence
    };
  }
}