import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  RefreshCw,
  Newspaper,
  AlertCircle,
  BarChart2,
} from 'lucide-react';
import { newsSentimentService, StockNewsSentiment, SentimentColor } from '../services/newsSentimentService';
import { useAppContext } from '../context/AppContext';

// ─── Color helpers ────────────────────────────────────────────────────────────

const SENTIMENT_CONFIG: Record<
  SentimentColor,
  { bg: string; border: string; text: string; icon: React.ReactNode; label: string }
> = {
  green: {
    bg: 'bg-emerald-900/30',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    icon: <TrendingUp size={16} />,
    label: 'Bullish',
  },
  yellow: {
    bg: 'bg-amber-900/30',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    icon: <Minus size={16} />,
    label: 'Neutral',
  },
  red: {
    bg: 'bg-red-900/30',
    border: 'border-red-500/40',
    text: 'text-red-400',
    icon: <TrendingDown size={16} />,
    label: 'Bearish',
  },
};

// ─── Circular Confidence Gauge ────────────────────────────────────────────────

const ConfidenceGauge: React.FC<{ score: number; sentiment: SentimentColor }> = ({
  score,
  sentiment,
}) => {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = sentiment === 'green' ? '#10b981' : sentiment === 'red' ? '#ef4444' : '#f59e0b';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} stroke="#374151" strokeWidth="5" fill="none" />
        <circle
          cx="36"
          cy="36"
          r={r}
          stroke={color}
          strokeWidth="5"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <span className="absolute text-sm font-bold text-white">{score}%</span>
    </div>
  );
};

// ─── Single stock sentiment card ──────────────────────────────────────────────

const SentimentCard: React.FC<{ data: StockNewsSentiment; isDarkMode: boolean }> = ({
  data,
  isDarkMode,
}) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = SENTIMENT_CONFIG[data.overallSentiment];

  return (
    <div
      className={`rounded-xl border transition-all duration-300 ${cfg.bg} ${cfg.border} hover:shadow-lg hover:shadow-black/20`}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConfidenceGauge score={data.confidenceScore} sentiment={data.overallSentiment} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{data.symbol}</span>
                <span
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}
                >
                  {cfg.icon}
                  {cfg.label}
                </span>
              </div>
              <span className="text-xs text-gray-400">{data.companyName}</span>
            </div>
          </div>

          {/* Bar distribution */}
          <div className="hidden sm:flex flex-col gap-1 text-xs w-32">
            <div className="flex items-center gap-1">
              <span className="text-emerald-400 w-12">Bullish</span>
              <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${data.bullishPercent}%`, transition: 'width 0.8s ease' }}
                />
              </div>
              <span className="text-gray-400 w-8 text-right">{data.bullishPercent}%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-amber-400 w-12">Neutral</span>
              <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-amber-500 h-1.5 rounded-full"
                  style={{ width: `${data.neutralPercent}%`, transition: 'width 0.8s ease' }}
                />
              </div>
              <span className="text-gray-400 w-8 text-right">{data.neutralPercent}%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-red-400 w-12">Bearish</span>
              <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-red-500 h-1.5 rounded-full"
                  style={{ width: `${data.bearishPercent}%`, transition: 'width 0.8s ease' }}
                />
              </div>
              <span className="text-gray-400 w-8 text-right">{data.bearishPercent}%</span>
            </div>
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-300 leading-relaxed">{data.summary}</p>
      </div>

      {/* Article list */}
      {expanded && (
        <div className="border-t border-gray-700/50 divide-y divide-gray-700/30">
          {data.articles.map((article, idx) => {
            const ac = SENTIMENT_CONFIG[article.sentiment];
            return (
              <div
                key={idx}
                className="px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors"
              >
                <span
                  className={`mt-0.5 flex-shrink-0 p-1 rounded-full ${ac.bg} ${ac.text}`}
                >
                  {ac.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-200 hover:text-white line-clamp-2 font-medium flex items-start gap-1"
                    onClick={e => e.stopPropagation()}
                  >
                    {article.title}
                    <ExternalLink size={10} className="flex-shrink-0 mt-1" />
                  </a>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>{article.source}</span>
                    <span>·</span>
                    <span>
                      {new Date(article.publishedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span
                      className={`ml-auto px-1.5 py-0.5 rounded text-xs font-medium ${ac.bg} ${ac.text}`}
                    >
                      {(article.sentimentScore * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface NewsSentimentPanelProps {
  className?: string;
}

export const NewsSentimentPanel: React.FC<NewsSentimentPanelProps> = ({ className = '' }) => {
  const { selectedStocks, isDarkMode } = useAppContext();
  const [sentiments, setSentiments] = useState<StockNewsSentiment[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchSentiments = async () => {
    if (selectedStocks.length === 0) return;
    setLoading(true);
    try {
      const results = await newsSentimentService.getMultipleStocksSentiment(
        selectedStocks.map(s => ({ symbol: s.symbol, name: s.name }))
      );
      setSentiments(results);
      setLastFetched(new Date());
    } catch (err) {
      console.error('Failed to fetch sentiments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when selected stocks change
  useEffect(() => {
    if (selectedStocks.length > 0) fetchSentiments();
    else setSentiments([]);
  }, [selectedStocks.map(s => s.symbol).join(',')]);

  if (selectedStocks.length === 0) {
    return (
      <div className={`rounded-xl bg-gray-800/60 border border-gray-700/50 p-8 text-center ${className}`}>
        <Newspaper size={40} className="mx-auto mb-3 text-gray-500" />
        <p className="text-gray-400 text-sm">Select stocks to see news sentiment analysis</p>
      </div>
    );
  }

  // Aggregate overview for the header
  const greenCount = sentiments.filter(s => s.overallSentiment === 'green').length;
  const redCount = sentiments.filter(s => s.overallSentiment === 'red').length;
  const yellowCount = sentiments.filter(s => s.overallSentiment === 'yellow').length;

  return (
    <div className={`rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden ${className}`}>
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Newspaper size={18} className="text-emerald-400" />
          <h3 className="text-white font-semibold text-sm">News Sentiment</h3>
          {!import.meta.env.VITE_NEWSDATA_API_KEY && (
            <span className="text-xs px-2 py-0.5 bg-amber-900/30 text-amber-400 border border-amber-500/30 rounded-full">
              Demo mode
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {lastFetched && (
            <span className="text-xs text-gray-500">
              Updated {lastFetched.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchSentiments}
            disabled={loading}
            className="p-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overview pills */}
      {sentiments.length > 0 && (
        <div className="flex gap-2 px-5 py-3 border-b border-gray-700/30">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-500/30">
            <TrendingUp size={12} className="text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">{greenCount} Bullish</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/30 border border-amber-500/30">
            <Minus size={12} className="text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">{yellowCount} Neutral</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-900/30 border border-red-500/30">
            <TrendingDown size={12} className="text-red-400" />
            <span className="text-xs text-red-400 font-medium">{redCount} Bearish</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-gray-600 rounded-full" />
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
            </div>
            <p className="text-gray-400 text-sm">Scanning news for your stocks...</p>
          </div>
        ) : sentiments.length > 0 ? (
          sentiments.map(s => (
            <SentimentCard key={s.symbol} data={s} isDarkMode={isDarkMode} />
          ))
        ) : (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
            <AlertCircle size={16} />
            <span>No sentiment data available</span>
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="px-5 py-3 border-t border-gray-700/30 bg-gray-900/30">
        <p className="text-xs text-gray-500">
          💡 Add <code className="text-emerald-400">VITE_NEWSDATA_API_KEY</code> to .env for live news.{' '}
          <a
            href="https://newsdata.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline"
          >
            Get free key →
          </a>
        </p>
      </div>
    </div>
  );
};

export default NewsSentimentPanel;
