// Common types used throughout the application

export type Market = 'NSE' | 'BSE';

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: Market;
  sector?: string;
  volume?: number;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  parameters: StrategyParameter[];
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface StrategyParameter {
  id: string;
  name: string;
  description: string;
  type: 'number' | 'boolean' | 'select';
  defaultValue: any;
  minValue?: number;
  maxValue?: number;
  step?: number;
  options?: string[];
}

export interface BacktestResult {
  strategyId: string;
  stockSymbol: string;
  startDate: string;
  endDate: string;
  initialInvestment: number;
  finalValue: number;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: Trade[];
  equityCurve: EquityPoint[];
}

export interface EquityPoint {
  date: string;
  value: number;
}

export interface Trade {
  date: string;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  value: number;
  pnl?: number;
}

export interface Prediction {
  stockSymbol: string;
  date: string;
  predictedPrice: number;
  predictedDirection: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: number;
}

export interface TradingParameters {
  initialCapital: number;
  positionSize: number;
  maxOpenPositions: number;
  stopLoss: number;
  takeProfit: number;
  trailingStop: boolean;
  autoRebalance: boolean;
}