import { Strategy } from '../types';

export const mockStrategies: Strategy[] = [
  {
    id: 'moving-average-crossover',
    name: 'Moving Average Crossover',
    description: 'A strategy that generates buy signals when a shorter-term moving average crosses above a longer-term moving average, and sell signals when the shorter-term moving average crosses below the longer-term moving average.',
    riskLevel: 'Medium',
    parameters: [
      {
        id: 'short-ma',
        name: 'Short Moving Average Period',
        description: 'The period for the short-term moving average',
        type: 'number',
        defaultValue: 10,
        minValue: 2,
        maxValue: 50,
        step: 1
      },
      {
        id: 'long-ma',
        name: 'Long Moving Average Period',
        description: 'The period for the long-term moving average',
        type: 'number',
        defaultValue: 50,
        minValue: 10,
        maxValue: 200,
        step: 1
      }
    ]
  },
  {
    id: 'rsi-strategy',
    name: 'RSI Overbought/Oversold',
    description: 'This strategy uses the Relative Strength Index (RSI) to identify potential reversal points when a security becomes overbought or oversold.',
    riskLevel: 'Medium',
    parameters: [
      {
        id: 'rsi-period',
        name: 'RSI Period',
        description: 'The number of periods to calculate RSI',
        type: 'number',
        defaultValue: 14,
        minValue: 2,
        maxValue: 30,
        step: 1
      },
      {
        id: 'oversold-threshold',
        name: 'Oversold Threshold',
        description: 'The RSI value below which a security is considered oversold',
        type: 'number',
        defaultValue: 30,
        minValue: 10,
        maxValue: 40,
        step: 1
      },
      {
        id: 'overbought-threshold',
        name: 'Overbought Threshold',
        description: 'The RSI value above which a security is considered overbought',
        type: 'number',
        defaultValue: 70,
        minValue: 60,
        maxValue: 90,
        step: 1
      }
    ]
  },
  {
    id: 'bollinger-bands',
    name: 'Bollinger Bands Breakout',
    description: 'A strategy that generates signals when price breaks out of the Bollinger Bands, indicating potential trend continuation or reversal.',
    riskLevel: 'High',
    parameters: [
      {
        id: 'period',
        name: 'Moving Average Period',
        description: 'The period for the middle band (moving average)',
        type: 'number',
        defaultValue: 20,
        minValue: 5,
        maxValue: 50,
        step: 1
      },
      {
        id: 'deviation',
        name: 'Standard Deviation Multiplier',
        description: 'The number of standard deviations for the upper and lower bands',
        type: 'number',
        defaultValue: 2,
        minValue: 1,
        maxValue: 4,
        step: 0.1
      }
    ]
  },
  {
    id: 'macd-strategy',
    name: 'MACD Crossover',
    description: 'A momentum strategy that uses the Moving Average Convergence Divergence (MACD) indicator to identify potential trend changes.',
    riskLevel: 'Medium',
    parameters: [
      {
        id: 'fast-period',
        name: 'Fast EMA Period',
        description: 'The period for the fast exponential moving average',
        type: 'number',
        defaultValue: 12,
        minValue: 5,
        maxValue: 30,
        step: 1
      },
      {
        id: 'slow-period',
        name: 'Slow EMA Period',
        description: 'The period for the slow exponential moving average',
        type: 'number',
        defaultValue: 26,
        minValue: 10,
        maxValue: 50,
        step: 1
      },
      {
        id: 'signal-period',
        name: 'Signal Period',
        description: 'The period for the signal line',
        type: 'number',
        defaultValue: 9,
        minValue: 3,
        maxValue: 20,
        step: 1
      }
    ]
  },
  {
    id: 'mean-reversion',
    name: 'Mean Reversion',
    description: 'A strategy that assumes asset prices will revert to their mean over time. It buys when prices are significantly below their average and sells when they are above.',
    riskLevel: 'Medium',
    parameters: [
      {
        id: 'lookback-period',
        name: 'Lookback Period',
        description: 'The number of periods to calculate the mean',
        type: 'number',
        defaultValue: 50,
        minValue: 10,
        maxValue: 200,
        step: 1
      },
      {
        id: 'entry-threshold',
        name: 'Entry Threshold',
        description: 'The number of standard deviations from the mean to trigger an entry',
        type: 'number',
        defaultValue: 2,
        minValue: 0.5,
        maxValue: 4,
        step: 0.1
      },
      {
        id: 'exit-threshold',
        name: 'Exit Threshold',
        description: 'The number of standard deviations from the mean to trigger an exit',
        type: 'number',
        defaultValue: 0.5,
        minValue: 0.1,
        maxValue: 2,
        step: 0.1
      }
    ]
  }
];