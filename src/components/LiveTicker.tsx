import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Wifi, WifiOff } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { stockApi, MarketIndex } from '../services/stockApi';

interface TickerItem {
  symbol: string;
  price: number;
  changePercent: number;
  isLive?: boolean;
}

// Default symbols to always show in the ticker (indices + some blue-chips)
const INDEX_SYMBOLS_YAHOO = [
  { symbol: 'NIFTY 50',   name: 'NIFTY 50'   },
  { symbol: 'SENSEX',     name: 'SENSEX'      },
  { symbol: 'BANK NIFTY', name: 'BANK NIFTY'  },
  { symbol: 'NIFTY IT',   name: 'NIFTY IT'   },
];

// Gold via a separate fallback (Yahoo: GC=F)
const GOLD_FALLBACK: TickerItem = { symbol: 'GOLD', price: 62340, changePercent: 0.22 };

export const LiveTicker: React.FC = () => {
  const { stocks, selectedStocks } = useAppContext();

  const [indexItems, setIndexItems] = useState<TickerItem[]>(INDEX_SYMBOLS_YAHOO.map(i => ({
    symbol: i.symbol, price: 0, changePercent: 0,
  })));
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const fetchingRef = useRef(false);

  const fetchIndices = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const indices = await stockApi.getMarketIndices();
      if (indices.length > 0) {
        const items: TickerItem[] = indices.map(idx => ({
          symbol: idx.name,
          price: idx.value,
          changePercent: idx.changePercent,
          isLive: true,
        }));
        setIndexItems(items);
        setIsLive(true);
        setLastUpdate(new Date());
      }
    } catch {
      setIsLive(false);
    } finally {
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchIndices();
    // Refresh every 90 seconds — respects Yahoo rate limits
    const t = setInterval(fetchIndices, 90_000);
    return () => clearInterval(t);
  }, []);

  // Build the full ticker list: indices + selected stocks + gold
  const stockItems: TickerItem[] = selectedStocks.length > 0
    ? selectedStocks.map(s => ({ symbol: s.symbol, price: s.price, changePercent: s.changePercent, isLive: false }))
    : stocks.slice(0, 5).map(s => ({ symbol: s.symbol, price: s.price, changePercent: s.changePercent, isLive: false }));

  const allItems: TickerItem[] = [
    ...indexItems.filter(i => i.price > 0),
    GOLD_FALLBACK,
    ...stockItems,
  ];

  // Deduplicate
  const seen = new Set<string>();
  const unique = allItems.filter(t => {
    if (seen.has(t.symbol)) return false;
    seen.add(t.symbol);
    return true;
  });

  // Double for seamless marquee loop
  const doubled = [...unique, ...unique];

  return (
    <div className="ticker-bar bg-gray-900/80 border-b border-gray-800/80 py-1.5 backdrop-blur-sm relative">
      {/* Live/Offline badge */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-900/90 border border-gray-700/50">
        {isLive ? (
          <>
            <Wifi size={10} className="text-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-medium">
              LIVE {lastUpdate ? lastUpdate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </>
        ) : (
          <>
            <WifiOff size={10} className="text-amber-400" />
            <span className="text-[10px] text-amber-400 font-medium">DELAYED</span>
          </>
        )}
      </div>

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
  const prevPrice = useRef(item.price);

  useEffect(() => {
    if (item.price !== 0 && item.price !== prevPrice.current) {
      setFlash(item.price > prevPrice.current ? 'flash-green' : 'flash-red');
      prevPrice.current = item.price;
      const t = setTimeout(() => setFlash(''), 600);
      return () => clearTimeout(t);
    }
  }, [item.price]);

  const isUp = item.changePercent >= 0;

  if (item.price === 0) return null;

  return (
    <span className={`inline-flex items-center gap-2 px-4 border-r border-gray-800/60 text-xs whitespace-nowrap ${flash}`}>
      <span className="text-gray-400 font-medium">{item.symbol}</span>
      <span className="text-white font-semibold font-mono">
        {item.symbol === 'GOLD' ? '₹' : item.symbol.includes('NIFTY') || item.symbol === 'SENSEX' || item.symbol === 'BANK NIFTY' ? '' : '₹'}
        {item.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </span>
      <span className={`flex items-center gap-0.5 font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
        {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {isUp ? '+' : ''}{item.changePercent.toFixed(2)}%
      </span>
    </span>
  );
};

export default LiveTicker;
