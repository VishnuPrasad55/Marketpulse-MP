/**
 * AI Trading Assistant — Powered by Claude
 * Context-aware chat assistant that knows about your portfolio,
 * selected stocks, predictions, and trading parameters.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, TrendingUp, RefreshCw, Sparkles,
  BookOpen, BarChart2, AlertTriangle, Copy, CheckCheck,
  ChevronDown, Lightbulb,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
}

// ─── Prompt suggestions ───────────────────────────────────────────────────────
const PROMPT_SUGGESTIONS = [
  { icon: BarChart2,  label: 'Analyse my portfolio',     prompt: 'Analyse my current portfolio holdings. What are the strengths and risks? What improvements would you suggest?' },
  { icon: TrendingUp, label: 'Stock recommendation',      prompt: 'Based on my selected stocks and predictions, which ones look most promising for the next 30 days? Give specific reasoning.' },
  { icon: AlertTriangle, label: 'Risk assessment',        prompt: 'What are the main risks in my current portfolio? How can I hedge against them?' },
  { icon: BookOpen,   label: 'Explain Sharpe ratio',      prompt: 'Explain the Sharpe ratio in simple terms. How should I interpret my portfolio\'s Sharpe ratio?' },
  { icon: Sparkles,   label: 'Strategy recommendation',   prompt: 'Given my risk tolerance and portfolio, which backtesting strategy (MA Crossover, RSI, Bollinger, MACD) would suit me best and why?' },
  { icon: Lightbulb,  label: 'Diversification tips',      prompt: 'How well diversified is my portfolio across sectors? What sectors am I missing that could reduce risk?' },
];

// ─── Build context string from app state ─────────────────────────────────────
function buildContext(
  portfolio: any[], stocks: any[], predictions: any[], tradingParams: any, userProfile: any
): string {
  const lines: string[] = ['=== MarketPulse User Context ===\n'];

  if (userProfile) {
    lines.push(`User: ${userProfile.full_name || 'Trader'}`);
    lines.push(`Experience: ${userProfile.experience_level || 'Beginner'}`);
    lines.push(`Risk tolerance: ${userProfile.risk_tolerance || 'Medium'}\n`);
  }

  lines.push(`Trading capital: ₹${tradingParams.initialCapital?.toLocaleString('en-IN') ?? '1,00,000'}`);
  lines.push(`Position size: ${tradingParams.positionSize ?? 10}%`);
  lines.push(`Max positions: ${tradingParams.maxOpenPositions ?? 5}`);
  lines.push(`Stop loss: ${tradingParams.stopLoss ?? 5}%, Take profit: ${tradingParams.takeProfit ?? 15}%\n`);

  if (portfolio.length > 0) {
    const totalValue = portfolio.reduce((s: number, h: any) => s + h.current_price * h.quantity, 0);
    const totalCost  = portfolio.reduce((s: number, h: any) => s + h.purchase_price * h.quantity, 0);
    const totalPnL   = totalValue - totalCost;
    lines.push(`=== Portfolio (${portfolio.length} holdings) ===`);
    lines.push(`Total value: ₹${totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`);
    lines.push(`Total P&L: ₹${totalPnL.toFixed(0)} (${((totalPnL/totalCost)*100).toFixed(2)}%)`);
    portfolio.slice(0, 8).forEach((h: any) => {
      const pnlPct = ((h.current_price - h.purchase_price) / h.purchase_price * 100).toFixed(2);
      lines.push(`  ${h.stock_symbol}: ${h.quantity} shares @ ₹${h.purchase_price} → ₹${h.current_price} (${pnlPct}%)`);
    });
  } else {
    lines.push('Portfolio: Empty (no holdings)');
  }

  if (stocks.length > 0) {
    lines.push(`\n=== Watchlist (${stocks.length} stocks) ===`);
    stocks.slice(0, 10).forEach((s: any) => {
      lines.push(`  ${s.symbol} (${s.sector ?? 'N/A'}): ₹${s.price} (${s.changePercent >= 0 ? '+' : ''}${s.changePercent?.toFixed(2)}%)`);
    });
  }

  if (predictions.length > 0) {
    lines.push(`\n=== AI Predictions (${predictions.length}) ===`);
    predictions.slice(0, 6).forEach((p: any) => {
      lines.push(`  ${p.stock_symbol}: ${p.predicted_direction} → ₹${p.predicted_price} (${p.confidence}% confidence)`);
    });
  }

  lines.push('\n=== End of Context ===');
  return lines.join('\n');
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble: React.FC<{ msg: Message }> = ({ msg }) => {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';

  const copyText = () => {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Very basic markdown-to-HTML (bold, bullets, numbered lists, code)
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith('###')) {
        elements.push(<h4 key={i} className="text-white font-bold text-sm mt-3 mb-1">{line.replace(/^###\s*/, '')}</h4>);
      } else if (line.startsWith('##')) {
        elements.push(<h3 key={i} className="text-white font-bold text-base mt-3 mb-1">{line.replace(/^##\s*/, '')}</h3>);
      } else if (line.match(/^[-*]\s/)) {
        elements.push(
          <div key={i} className="flex gap-2 text-sm text-gray-200 my-0.5">
            <span className="text-emerald-400 flex-shrink-0 mt-0.5">•</span>
            <span dangerouslySetInnerHTML={{ __html: line.replace(/^[-*]\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        );
      } else if (line.match(/^\d+\.\s/)) {
        elements.push(
          <div key={i} className="flex gap-2 text-sm text-gray-200 my-0.5">
            <span className="text-emerald-400 flex-shrink-0 font-mono">{line.match(/^(\d+)\./)?.[1]}.</span>
            <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        );
      } else if (line.startsWith('```')) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        elements.push(
          <pre key={i} className="bg-gray-900 rounded-lg p-3 text-xs text-emerald-300 font-mono overflow-x-auto my-2">
            {codeLines.join('\n')}
          </pre>
        );
      } else if (line.trim() === '') {
        if (elements.length > 0) elements.push(<div key={i} className="h-2" />);
      } else {
        elements.push(
          <p key={i} className="text-sm text-gray-200 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 rounded text-emerald-300 font-mono text-xs">$1</code>') }} />
        );
      }
      i++;
    }
    return elements;
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} group`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isUser ? 'bg-emerald-600' : 'bg-violet-700'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-2xl ${isUser
          ? 'bg-emerald-600/20 border border-emerald-500/20 rounded-tr-sm'
          : 'bg-gray-800/80 border border-gray-700/50 rounded-tl-sm'
        }`}>
          {msg.loading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span className="text-xs text-gray-400">Thinking…</span>
            </div>
          ) : (
            <div className="space-y-0.5">{renderContent(msg.content)}</div>
          )}
        </div>

        <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-gray-600">
            {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!msg.loading && !isUser && (
            <button
              onClick={copyText}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-gray-400"
            >
              {copied ? <CheckCheck size={11} className="text-emerald-400" /> : <Copy size={11} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AIAssistantPage: React.FC = () => {
  const { userPortfolio, selectedStocks, userPredictions, tradingParameters, userProfile } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your AI trading assistant powered by Claude. I have full context about your MarketPulse portfolio, watchlist, and predictions.\n\n**I can help you with:**\n- Portfolio analysis and risk assessment\n- Strategy recommendations based on your holdings\n- Explaining technical indicators and backtesting results\n- Answering questions about the Indian stock market\n- Interpreting AI predictions and signals\n\n⚠️ **Disclaimer:** I provide educational insights only — not financial advice. Always do your own research before trading.\n\nWhat would you like to explore today?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const contextStr = buildContext(
    userPortfolio, selectedStocks, userPredictions, tradingParameters, userProfile
  );

  const sendMessage = useCallback(async (text: string) => {
    const userText = text.trim();
    if (!userText || loading) return;

    setInput('');
    setShowSuggestions(false);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };

    const loadingMsg: Message = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      // Build conversation history for the API (exclude loading messages, keep last 8 turns)
      const history = messages
        .filter(m => !m.loading && m.content.trim() !== '')
        .slice(-8)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const systemPrompt = `You are an expert AI trading assistant for MarketPulse, an algorithmic trading platform for Indian stocks (NSE/BSE).

You have access to real-time context about the user's portfolio. Use this context to give personalised, specific advice.

CONTEXT:
${contextStr}

GUIDELINES:
- Always be specific and reference actual holdings/stocks when relevant
- Use Indian market conventions (NSE/BSE, ₹ for rupees, Nifty/Sensex references)
- Explain technical concepts clearly but acknowledge the user's experience level
- ALWAYS include risk warnings for investment advice
- Format responses with **bold** for important terms, bullet points for lists
- Keep responses focused and actionable (200-400 words optimal)
- Never recommend specific buy/sell actions as "financial advice" — frame as "educational analysis"
- If asked about current prices or events after your training, acknowledge the limitation`;

      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY ?? '';
      if (!apiKey) {
        throw new Error('VITE_ANTHROPIC_API_KEY is not set in your .env file. Get a key from https://console.anthropic.com/settings/keys');
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            ...history,
            { role: 'user', content: userText },
          ],
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(`API error ${response.status}: ${errBody?.error?.message ?? response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.content
        ?.filter((c: any) => c.type === 'text')
        ?.map((c: any) => c.text)
        ?.join('') ?? 'Sorry, I could not generate a response. Please try again.';

      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
        }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `I encountered an error: ${err?.message ?? 'Unknown error'}. Please check your connection and try again.`,
          timestamp: new Date(),
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, loading, contextStr]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: 'Chat cleared. How can I help you with your portfolio?',
      timestamp: new Date(),
    }]);
    setShowSuggestions(true);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-180px)] flex flex-col gap-0 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-700 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
              AI Trading Assistant
            </h1>
            <p className="text-xs text-gray-400">Powered by Claude · Knows your portfolio</p>
          </div>
          {/* Live context indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-900/20 border border-emerald-500/20 ml-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">
              {userPortfolio.length} holdings · {selectedStocks.length} watchlist
            </span>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="p-2 rounded-lg bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-white transition-colors"
          title="Clear chat"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Chat area */}
      <div className="flex-1 rounded-2xl bg-gray-900/50 border border-gray-700/50 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {/* Prompt suggestions */}
          {showSuggestions && messages.length <= 2 && (
            <div>
              <p className="text-xs text-gray-500 mb-3 text-center">Quick prompts to get started:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROMPT_SUGGESTIONS.map(s => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.label}
                      onClick={() => sendMessage(s.prompt)}
                      disabled={loading}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/50 text-left hover:bg-gray-700/60 hover:border-violet-500/30 transition-all disabled:opacity-50 group"
                    >
                      <Icon size={15} className="text-violet-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-700/50 bg-gray-900/30">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask about your portfolio, strategies, or market analysis… (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 px-4 py-3 bg-gray-800/60 border border-gray-700/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 resize-none custom-scrollbar transition-all"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 w-11 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white flex items-center justify-center transition-all"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                : <Send size={16} />
              }
            </button>
          </div>
          <p className="text-[10px] text-gray-600 mt-2 text-center">
            AI responses are for educational purposes only — not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
};
