import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface TickerItem {
  symbol: string;
  price: number;
  changePercent: number;
  isLive?: boolean;
}

// Hardcoded ticker with major indices + selected stocks
const DEFAULT_TICKERS: TickerItem[] = [
  { symbol: 'NIFTY 50', price: 19425.33, changePercent: 0.81 },
  { symbol: 'SENSEX', price: 64718.56, changePercent: 0.69 },
  { symbol: 'BANKNIFTY', price: 44467.90, changePercent: 1.21 },
  { symbol: 'NIFTY IT', price: 33120.45, changePercent: -0.34 },
  { symbol: 'GOLD', price: 62340.00, changePercent: 0.22 },
];

export const LiveTicker: React.FC = () => {
  const { stocks, selectedStocks } = useAppContext();

  // Merge default tickers + selected stock data
  const tickerItems: TickerItem[] = [
    ...DEFAULT_TICKERS,
    ...selectedStocks.map(s => ({
      symbol: s.symbol,
      price: s.price,
      changePercent: s.changePercent,
    })),
    // Fill with all stocks if we have few selected
    ...(selectedStocks.length < 3
      ? stocks.slice(0, 6).map(s => ({
          symbol: s.symbol,
          price: s.price,
          changePercent: s.changePercent,
        }))
      : []),
  ];

  // Deduplicate
  const seen = new Set<string>();
  const uniqueTickers = tickerItems.filter(t => {
    if (seen.has(t.symbol)) return false;
    seen.add(t.symbol);
    return true;
  });

  // Double the list for seamless loop
  const doubled = [...uniqueTickers, ...uniqueTickers];

  return (
    <div className="ticker-bar bg-gray-900/80 border-b border-gray-800/80 py-2 backdrop-blur-sm">
      <div className="ticker-inner gap-0">
        {doubled.map((item, i) => (
          <TickerChip key={`${item.symbol}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
};

const TickerChip: React.FC<{ item: TickerItem }> = ({ item }) => {
  const [flash, setFlash] = useState('');
  const [prevPrice, setPrevPrice] = useState(item.price);

  useEffect(() => {
    if (item.price !== prevPrice) {
      setFlash(item.price > prevPrice ? 'flash-green' : 'flash-red');
      setPrevPrice(item.price);
      const t = setTimeout(() => setFlash(''), 600);
      return () => clearTimeout(t);
    }
  }, [item.price]);

  const isUp = item.changePercent >= 0;

  return (
    <span
      className={`inline-flex items-center gap-2 px-4 border-r border-gray-800/60 text-xs whitespace-nowrap ${flash}`}
    >
      <span className="text-gray-400 font-medium">{item.symbol}</span>
      <span className="text-white font-semibold font-mono">
        ₹{item.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </span>
      <span
        className={`flex items-center gap-0.5 font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}
      >
        {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {isUp ? '+' : ''}{item.changePercent.toFixed(2)}%
      </span>
    </span>
  );
};

export default LiveTicker;
