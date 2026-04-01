# MarketPulse - Algorithmic Trading Platform

**MarketPulse** is a comprehensive algorithmic trading platform for the Indian stock market (NSE/BSE). Build, backtest, and deploy trading strategies with real-time market sentiment analysis, AI-powered price predictions, and live broker integration.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running Locally](#running-locally)
- [API Integrations](#api-integrations)
- [Project Structure](#project-structure)
- [Core Services](#core-services)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

MarketPulse is a **full-stack algorithmic trading dashboard** that empowers traders to:

- 📊 **Analyze Market Data** - Real-time stock quotes, technical indicators, and historical analysis
- 🤖 **Create Custom Algorithms** - Write trading strategies in JavaScript with visual code editor
- 🧪 **Backtest Strategies** - Test strategies on 6+ months of historical data with detailed metrics
- 🔮 **AI Predictions** - Hybrid ML model combining Trend, RSI, MACD, and Volatility analysis
- 📰 **Sentiment Analysis** - News-based market sentiment scoring using keyword analysis
- 💰 **Live Trading** - Zerodha Kite broker integration for real-world trade execution
- 👤 **User Management** - Personalized watchlists, portfolios, and trading parameters
- 🌙 **Dark Mode** - Beautiful, responsive UI with full mobile support

### Why MarketPulse?

- **No Experience Needed:** Pre-built strategies for beginners
- **Advanced Controls:** Full algorithm customization for professionals
- **Fast Backtesting:** Client-side execution for instant strategy testing
- **Real Data:** Live market data from Yahoo Finance + NewsData.io
- **Secure:** Authentication with Supabase + row-level security

---

## Features

### Real-Time Market Data
- Live NSE/BSE stock quotes with 1-minute update frequency
- Market hours detection (9:15 AM - 3:30 PM IST)
- Support for 50+ Indian stocks (Nifty 50 universe)
- Intelligent fallback to mock data if APIs unavailable
- Volume, change, and percentage change tracking

### Technical Indicators
- **SMA** (Simple Moving Average)
- **EMA** (Exponential Moving Average)
- **RSI** (Relative Strength Index, 14-period)
- **MACD** (12-26-9 momentum indicator)
- **Bollinger Bands** (20-period with 2 std dev)
- Custom indicator calculations in algorithms

### Strategy Backtesting
- Test strategies on historical OHLCV data
- Multiple timeframes: 1W, 1M, 3M, 6M, 1Y
- Realistic commission modeling (₹10 per trade default)
- 7 key performance metrics:
  - **Total Return %**
  - **Annualized Return %**
  - **Max Drawdown %**
  - **Sharpe Ratio**
  - **Trade Count**
  - **Win Rate %**
  - **Equity Curve Visualization**

### AI Price Prediction Engine
Uses a **4-factor hybrid model**:
1. **Linear Regression Trend** (60-day slope analysis)
2. **RSI Momentum** (oversold/overbought detection)
3. **MACD Crossover** (momentum confirmation)
4. **Volatility Bands** (confidence adjustment)

**Output:**
- Predicted price (next trading day)
- Direction: UP/DOWN/NEUTRAL
- Confidence Score: 50-88%
- Price range (volatility-adjusted)

### News Sentiment Analysis
- Real-time financial news from NewsData.io
- Keyword-weighted sentiment scoring (-1 to +1)
- 40+ bullish keywords (surge, profit, growth, etc.)
- 40+ bearish keywords (fall, loss, fraud, etc.)
- Strong signal detection (2x weight for major events)
- Article-level sentiment breakdown
- Confidence scoring and aggregated summary

### Custom Algorithm Editor
- Visual code editor with Monaco Editor integration
- Syntax highlighting and line numbers
- 8 built-in helper functions:
  - `sma()`, `ema()`, `rsi()`, `macd()`
  - `stdDev()`, `highest()`, `lowest()`
  - `crossover()`, `crossunder()`
- Signal generation: `signal('BUY'|'SELL'|'HOLD')`
- Price predictions: `predict(price, direction, confidence)`
- Full execution logs and error reporting

### Portfolio Management
- Track holdings with purchase price and quantity
- Real-time P&L calculation
- Position sizing and risk controls
- Customizable trading parameters:
  - Initial capital
  - Position size (%)
  - Max open positions
  - Stop loss and take profit levels
  - Trailing stop toggle
  - Auto-rebalance toggle

### Live Trading (Zerodha Kite)
- OAuth 2.0 integration with Zerodha
- Place orders: MARKET, LIMIT, SL, SL-M
- View positions and holdings
- Order status tracking
- Support for CNC (delivery), NRML, and MIS (intraday)

### User Authentication
- Supabase Auth integration
- Row-level security on all tables
- User profiles with risk tolerance and experience level
- Secure token management

### Interactive Dashboards
- Real-time ticker with live price updates
- Powerful Recharts visualizations (line, area, bar, candlestick)
- Responsive layout for desktop and mobile
- Search and filter capabilities

---

## Tech Stack

### Frontend
| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | React | 18.3.1 |
| **Language** | TypeScript | 5.5.3 |
| **Build Tool** | Vite | 5.4.2 |
| **Routing** | React Router DOM | 6.22.3 |
| **Styling** | Tailwind CSS | 3.4.1 |
| **Charts** | Recharts | 2.12.3 |
| **Code Editor** | Monaco Editor | 4.7.0 |
| **Icons** | Lucide React | 0.344.0 |
| **CSV Parsing** | PapaParse | 5.5.3 |
| **Linting** | ESLint | 9.9.1 |

### Backend & Database
| Layer | Technology |
|-------|-----------|
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **SDK** | Supabase JS | 2.53.0 |
| **ORM** | Native SQL (migrations) |

### External APIs
| Service | Purpose | Type |
|---------|---------|------|
| **Yahoo Finance** | Real-time stock quotes | REST (CORS) |
| **NewsData.io** | Financial news & sentiment | REST |
| **Zerodha Kite** | Broker integration | OAuth 2.0 |

### Development Tools
- **Package Manager:** npm
- **Code Quality:** ESLint + TypeScript ESLint
- **CSS Processing:** PostCSS + Autoprefixer

---

## Getting Started

### Prerequisites

```bash
# Required
- Node.js >= 18.0.0
- npm >= 9.0.0 or yarn >= 3.0
- Git

# Optional (for live trading)
- Zerodha account (https://kite.zerodha.com)
- NewsData.io API key (free tier available)
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/VishnuPrasad55/Marketpulse-MP.git
   cd Marketpulse-MP/project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify installation**
   ```bash
   npm run build
   ```

### Environment Configuration

Create a `.env.local` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# (Optional) Zerodha Kite Integration
VITE_KITE_API_KEY=your_kite_api_key
VITE_BACKEND_URL=http://localhost:3001

# (Optional) NewsData.io for Sentiment Analysis
VITE_NEWSDATA_API_KEY=your_newsdata_api_key
```

#### Getting API Keys:

**Supabase:**
1. Create account at https://supabase.com
2. Create new project
3. Go to Settings → API Keys
4. Copy `SUPABASE_URL` and `anon` key

**NewsData.io (Free 200 requests/day):**
1. Register at https://newsdata.io
2. Copy your API key from dashboard

**Zerodha Kite:**
1. Register at https://developers.kite.trade
2. Create an app
3. Set redirect URL: `http://localhost:5173/kite-callback`
4. Copy API key and secret

### Running Locally

```bash
# Development server (hot reload)
npm run dev
# Runs on http://localhost:5173

# Production build
npm run build

# Preview production build
npm run preview

# Linting
npm run lint
```

---

## API Integrations

### Yahoo Finance (Stock Quotes)
- **Endpoint:** `query1.finance.yahoo.com/v8/finance/chart/{symbol}`
- **Fallback:** 3 CORS proxy options (allorigins.win, corsproxy.io, codetabs.com)
- **Cache:** 1 minute
- **Rate Limit:** ~300 requests/hour (via proxies)

### NewsData.io (News & Sentiment)
- **Endpoint:** `api.newsdata.io/v1/latest`
- **Free Tier:** 200 requests/day
- **Parameters:** Query (stock symbol), language (en-IN)
- **Response:** Top 10 articles per query

### Zerodha Kite (Live Trading)
- **OAuth Flow:** 3-legged OAuth 2.0
- **Endpoints:**
  - `https://kite.zerodha.com/connect/login` (user login)
  - `/api/profile` (user info)
  - `/api/positions` (open positions)
  - `/api/holdings` (portfolio holdings)
  - `/api/orders` (place/view orders)
- **Security Note:** API secret must be handled server-side only

---

## Project Structure

```
marketpulse-mp/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx          # Login & authentication UI
│   │   ├── Navbar.tsx                 # Top navigation bar
│   │   ├── Sidebar.tsx                # Left navigation sidebar
│   │   ├── LiveTicker.tsx             # Real-time stock ticker
│   │   ├── NewsSentimentPanel.tsx     # Sentiment analysis display
│   │   ├── ZerodhaPanel.tsx           # Broker integration UI
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── HomePage.tsx               # Landing page
│   │   ├── StockSelectionPage.tsx     # Stock picker & watchlist
│   │   ├── TradingDashboardPage.tsx   # Main trading view
│   │   ├── AlgoEditorPage.tsx         # Custom algorithm editor
│   │   ├── StrategyPage.tsx           # Pre-built strategies
│   │   ├── BacktestingPage.tsx        # Backtest runner & results
│   │   ├── PredictionsPage.tsx        # AI predictions display
│   │   └── SettingsPage.tsx           # User settings
│   │
│   ├── services/
│   │   ├── stockApi.ts                # Yahoo Finance integration
│   │   ├── historicalDataService.ts   # Historical data fetching
│   │   ├── backtestingEngine.ts       # Strategy backtesting logic
│   │   ├── predictionEngine.ts        # AI price prediction model
│   │   ├── algoExecutor.ts            # Custom algorithm runner
│   │   ├── newsSentimentService.ts    # News & sentiment analysis
│   │   ├── kiteService.ts             # Zerodha Kite integration
│   │   └── ...
│   │
│   ├── context/
│   │   └── AppContext.tsx             # Global app state (React Context)
│   │
│   ├── hooks/
│   │   └── useAuth.ts                 # Authentication hook
│   │
│   ├── layouts/
│   │   └── AppLayout.tsx              # Main app layout wrapper
│   │
│   ├── lib/
│   │   └── supabase.ts                # Supabase client & DB queries
│   │
│   ├── types/
│   │   └── index.ts                   # TypeScript type definitions
│   │
│   ├── data/
│   │   ├── mockStocks.ts              # Mock stock data
│   │   ├── mockStrategies.ts          # Pre-built strategy templates
│   │   ├── historicalStockData.csv    # Historical OHLCV data
│   │   └── stockUniverse.ts           # List of 50+ Indian stocks
│   │
│   ├── App.tsx                        # Root component & routing
│   ├── main.tsx                       # Entry point
│   └── index.css                      # Global styles
│
├── supabase/
│   └── migrations/
│       ├── 20250615084823_damp_canyon.sql        # User management schema
│       └── 20250804173004_royal_delta.sql        # Additional tables
│
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
└── README.md
```

---

## Core Services

- **Stock API** (`stockApi.ts`) - Yahoo Finance integration with CORS proxy fallback and 1-minute caching
- **Backtesting Engine** (`backtestingEngine.ts`) - Strategy simulation with technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands)
- **Prediction Engine** (`predictionEngine.ts`) - 4-factor hybrid AI model (Trend, RSI, MACD, Volatility)
- **News Sentiment** (`newsSentimentService.ts`) - Keyword-weighted sentiment analysis from financial news
- **Algorithm Executor** (`algoExecutor.ts`) - Sandboxed JavaScript execution with helper functions
- **Kite Service** (`kiteService.ts`) - Zerodha broker OAuth 2.0 integration

---

## Database Schema

**Tables:**

| Table | Purpose |
|-------|---------|
| `user_profiles` | User account info (name, risk tolerance, experience) |
| `user_stocks` | User's watchlist/selected stocks |
| `user_strategies` | Saved strategies with parameters |
| `user_predictions` | Historical predictions |
| `user_portfolio` | Holdings (bought stocks) |
| `trading_parameters` | Risk settings (capital, position size, stops) |

**Security:** All tables use Row-Level Security (RLS); users can only access their own data.

---



## Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
# Follow prompts, add env variables in Vercel dashboard
```

### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### Docker
```bash
# Build Docker image
docker build -t marketpulse:latest .

# Run container
docker run -p 80:5173 marketpulse:latest
```

### Environment Variables for Production
Set these in your deployment platform's env settings:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_KITE_API_KEY=...
VITE_BACKEND_URL=...
VITE_NEWSDATA_API_KEY=...
```

---



## License

MIT License - see LICENSE file for details
