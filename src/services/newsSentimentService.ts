/**
 * News Sentiment Service
 *
 * Uses NewsData.io (free tier: 200 requests/day) to fetch news for selected stocks,
 * then performs local sentiment analysis using a keyword-weighted scoring model.
 *
 * SETUP:
 * 1. Go to https://newsdata.io/register and create a free account
 * 2. Copy your API key from the dashboard
 * 3. Add to .env:  VITE_NEWSDATA_API_KEY=pub_xxxxxxxxxxxxxxxxxxxxxxxx
 *
 * The 401 error you were seeing means the API key is invalid or expired.
 * Free tier allows 200 requests/day — the service caches for 10 minutes
 * so you'll use at most ~144 requests/day for 1 stock refreshed every 10min.
 *
 * Falls back to realistic mock news if no API key is set or if the API fails.
 */

export type SentimentColor = 'green' | 'yellow' | 'red';

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: SentimentColor;
  sentimentScore: number; // -1 to +1
}

export interface StockNewsSentiment {
  symbol: string;
  companyName: string;
  overallSentiment: SentimentColor;
  confidenceScore: number;       // 0-100
  bullishPercent: number;
  bearishPercent: number;
  neutralPercent: number;
  articles: NewsArticle[];
  summary: string;
  lastUpdated: string;
  isMock?: boolean; // true when using demo data
}

// ─── Sentiment keyword dictionaries ──────────────────────────────────────────

const BULLISH_KEYWORDS = [
  'surge', 'soar', 'jump', 'gain', 'rise', 'rally', 'boom', 'record',
  'profit', 'revenue', 'growth', 'expansion', 'strong', 'beat', 'exceed',
  'outperform', 'upgrade', 'buy', 'bullish', 'positive', 'opportunity',
  'acquisition', 'deal', 'partnership', 'launch', 'win', 'award',
  'dividend', 'buyback', 'invest', 'breakthrough', 'innovation', 'upside',
  'recovery', 'improve', 'momentum', 'targets', 'guidance raised',
  'higher', 'top', 'leading', 'best', 'advance', 'robust',
];

const BEARISH_KEYWORDS = [
  'fall', 'drop', 'decline', 'crash', 'plunge', 'loss', 'deficit',
  'miss', 'disappoint', 'downgrade', 'sell', 'bearish', 'negative',
  'risk', 'concern', 'worry', 'trouble', 'fraud', 'investigation',
  'lawsuit', 'fine', 'penalty', 'cut', 'layoff', 'restructure',
  'bankruptcy', 'debt', 'default', 'underperform', 'downside', 'warn',
  'volatile', 'uncertainty', 'regulatory', 'probe', 'resign', 'retire',
  'guidance cut', 'guidance lowered', 'weak', 'lower', 'slump', 'drag',
];

const STRONG_BULLISH = ['record high', 'all-time high', 'strong buy', 'massive gain', 'stellar results'];
const STRONG_BEARISH = ['fraud', 'bankrupt', 'massive loss', 'regulatory action', 'sebi notice', 'cbi probe'];

// ─── Scoring ─────────────────────────────────────────────────────────────────

function scoreText(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;

  STRONG_BULLISH.forEach(kw => { if (lower.includes(kw)) score += 2; });
  STRONG_BEARISH.forEach(kw => { if (lower.includes(kw)) score -= 2; });
  BULLISH_KEYWORDS.forEach(kw => { if (lower.includes(kw)) score += 1; });
  BEARISH_KEYWORDS.forEach(kw => { if (lower.includes(kw)) score -= 1; });

  return Math.max(-1, Math.min(1, score / 5));
}

function colorFromScore(score: number): SentimentColor {
  if (score > 0.1) return 'green';
  if (score < -0.1) return 'red';
  return 'yellow';
}

// ─── Company name → search query mapping ────────────────────────────────────

const COMPANY_QUERIES: Record<string, string> = {
  'RELIANCE':    'Reliance Industries stock India',
  'TCS':         'TCS Tata Consultancy Services earnings',
  'HDFCBANK':    'HDFC Bank India stock',
  'ICICIBANK':   'ICICI Bank India stock',
  'INFY':        'Infosys earnings India',
  'TATASTEEL':   'Tata Steel India',
  'SBIN':        'SBI State Bank India',
  'BAJAJAUTO':   'Bajaj Auto India',
  'HINDUNILVR':  'HUL Hindustan Unilever India',
  'LT':          'Larsen Toubro India',
  'TATAMOTORS.B':'Tata Motors India',
  'BHARTIARTL.B':'Airtel Bharti India telecom',
  'ASIANPAINT.B':'Asian Paints India',
  'ITC':         'ITC India FMCG',
  'WIPRO':       'Wipro IT India',
  'HCLTECH':     'HCL Technologies India',
  'AXISBANK':    'Axis Bank India',
  'KOTAKBANK':   'Kotak Mahindra Bank India',
  'MARUTI':      'Maruti Suzuki India automobile',
  'SUNPHARMA':   'Sun Pharma India pharmaceutical',
  'TITAN':       'Titan Company India',
  'ADANIENT':    'Adani Enterprises India',
};

// ─── Realistic mock data generator ──────────────────────────────────────────

function generateMockNews(symbol: string, companyName: string): StockNewsSentiment {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = (n: number) => {
    const x = Math.sin(seed + n) * 10000;
    return x - Math.floor(x);
  };

  const today = new Date();
  const daysAgo = (d: number) => new Date(today.getTime() - d * 86400000).toISOString();

  const mockArticles: NewsArticle[] = [
    {
      title: `${companyName} reports strong quarterly earnings, beats estimates`,
      description: `${companyName} posted better-than-expected revenue growth driven by expansion in core segments. Management raised FY guidance.`,
      url: `https://economictimes.indiatimes.com/markets/stocks/news`,
      source: 'Economic Times',
      publishedAt: daysAgo(Math.floor(rand(1) * 2)),
      sentiment: 'green',
      sentimentScore: 0.6 + rand(2) * 0.3,
    },
    {
      title: `Analysts upgrade ${companyName} to 'Buy' with raised target price`,
      description: `Multiple brokerages have revised their outlook positively following recent operational updates and strong demand signals.`,
      url: `https://www.moneycontrol.com/news/business/stocks/`,
      source: 'Moneycontrol',
      publishedAt: daysAgo(2 + Math.floor(rand(3) * 2)),
      sentiment: 'green',
      sentimentScore: 0.5 + rand(4) * 0.2,
    },
    {
      title: `${companyName} faces regulatory scrutiny over compliance norms`,
      description: `Regulators have sought clarifications on certain business practices. The company says it is fully cooperating and expects resolution shortly.`,
      url: `https://www.business-standard.com/markets`,
      source: 'Business Standard',
      publishedAt: daysAgo(4 + Math.floor(rand(5) * 3)),
      sentiment: rand(6) > 0.5 ? 'yellow' : 'red',
      sentimentScore: -(0.1 + rand(7) * 0.3),
    },
    {
      title: `${companyName} announces strategic partnership to accelerate growth`,
      description: `The company signed a key collaboration agreement expected to add significant revenue over the coming quarters.`,
      url: `https://www.financialexpress.com/market/`,
      source: 'Financial Express',
      publishedAt: daysAgo(6 + Math.floor(rand(8) * 2)),
      sentiment: 'green',
      sentimentScore: 0.4 + rand(9) * 0.4,
    },
    {
      title: `Market volatility weighs on ${companyName} share price`,
      description: `Broader market headwinds and sector-specific concerns have kept investor sentiment cautious despite strong fundamentals.`,
      url: `https://www.mint.com/market/stock-market-news`,
      source: 'Mint',
      publishedAt: daysAgo(8 + Math.floor(rand(10) * 3)),
      sentiment: 'yellow',
      sentimentScore: -0.05 + (rand(11) - 0.5) * 0.1,
    },
  ];

  const avgScore = mockArticles.reduce((sum, a) => sum + a.sentimentScore, 0) / mockArticles.length;
  const bullish  = mockArticles.filter(a => a.sentiment === 'green').length;
  const bearish  = mockArticles.filter(a => a.sentiment === 'red').length;
  const neutral  = mockArticles.filter(a => a.sentiment === 'yellow').length;
  const total    = mockArticles.length;

  return {
    symbol,
    companyName,
    overallSentiment:  colorFromScore(avgScore),
    confidenceScore:   Math.round(50 + Math.abs(avgScore) * 40),
    bullishPercent:    Math.round((bullish / total) * 100),
    bearishPercent:    Math.round((bearish / total) * 100),
    neutralPercent:    Math.round((neutral / total) * 100),
    articles:          mockArticles,
    summary:
      avgScore > 0.1
        ? `Overall sentiment for ${companyName} is positive. Recent earnings and analyst upgrades are driving confidence.`
        : avgScore < -0.1
        ? `Market sentiment for ${companyName} is cautious. Regulatory concerns and macro headwinds are creating uncertainty.`
        : `Sentiment for ${companyName} is mixed. Positive fundamentals are balanced by macro uncertainty.`,
    lastUpdated: new Date().toISOString(),
    isMock: true,
  };
}

// ─── Main Service ─────────────────────────────────────────────────────────────

class NewsSentimentService {
  private cache = new Map<string, { data: StockNewsSentiment; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private apiKeyInvalid = false; // set to true after a 401 so we stop retrying

  private getCached(key: string): StockNewsSentiment | null {
    const c = this.cache.get(key);
    if (c && Date.now() - c.timestamp < this.CACHE_DURATION) return c.data;
    return null;
  }

  /**
   * Validate that an API key looks like a real NewsData.io key.
   * Keys start with "pub_" and are at least 20 characters.
   */
  private isValidApiKey(key: string): boolean {
    return key.startsWith('pub_') && key.length >= 20;
  }

  async getStockNewsSentiment(
    symbol: string,
    companyName: string
  ): Promise<StockNewsSentiment> {
    const cached = this.getCached(symbol);
    if (cached) return cached;

    const apiKey = import.meta.env.VITE_NEWSDATA_API_KEY?.trim() ?? '';

    // Use mock data if: no key, key looks invalid, or key already returned 401
    if (!apiKey || !this.isValidApiKey(apiKey) || this.apiKeyInvalid) {
      if (!apiKey) {
        console.info(`[NewsSentiment] No API key set — using demo data for ${symbol}. Add VITE_NEWSDATA_API_KEY to .env`);
      }
      const mock = generateMockNews(symbol, companyName);
      this.cache.set(symbol, { data: mock, timestamp: Date.now() });
      return mock;
    }

    try {
      const query  = COMPANY_QUERIES[symbol] ?? `${companyName} stock India`;
      // NewsData.io v1 latest endpoint
      const url    = `https://newsdata.io/api/1/latest?apikey=${apiKey}&q=${encodeURIComponent(query)}&language=en&category=business&size=10`;
      const res    = await fetch(url, { signal: AbortSignal.timeout(10_000) });

      if (res.status === 401 || res.status === 403) {
        console.error(`[NewsSentiment] API key rejected (${res.status}). Check your VITE_NEWSDATA_API_KEY. Using demo data.`);
        this.apiKeyInvalid = true; // stop hitting the API with a bad key
        const mock = generateMockNews(symbol, companyName);
        this.cache.set(symbol, { data: mock, timestamp: Date.now() });
        return mock;
      }

      if (res.status === 429) {
        console.warn(`[NewsSentiment] Rate limit reached for NewsData.io. Using demo data.`);
        const mock = generateMockNews(symbol, companyName);
        this.cache.set(symbol, { data: mock, timestamp: Date.now() });
        return mock;
      }

      if (!res.ok) throw new Error(`NewsData HTTP ${res.status}`);

      const json = await res.json();

      if (json.status !== 'success' || !json.results?.length) {
        console.warn(`[NewsSentiment] No articles for ${symbol}, using demo data`);
        const mock = generateMockNews(symbol, companyName);
        this.cache.set(symbol, { data: mock, timestamp: Date.now() });
        return mock;
      }

      const articles: NewsArticle[] = json.results.map((item: any) => {
        const text  = `${item.title ?? ''} ${item.description ?? ''}`;
        const score = scoreText(text);
        return {
          title:       item.title      ?? 'Untitled',
          description: item.description ?? null,
          url:         item.link       ?? '#',
          source:      item.source_id  ?? 'Unknown',
          publishedAt: item.pubDate    ?? new Date().toISOString(),
          sentiment:   colorFromScore(score),
          sentimentScore: score,
        } as NewsArticle;
      });

      const avgScore = articles.reduce((s, a) => s + a.sentimentScore, 0) / articles.length;
      const bullish  = articles.filter(a => a.sentiment === 'green').length;
      const bearish  = articles.filter(a => a.sentiment === 'red').length;
      const neutral  = articles.filter(a => a.sentiment === 'yellow').length;
      const total    = articles.length;

      const result: StockNewsSentiment = {
        symbol,
        companyName,
        overallSentiment:  colorFromScore(avgScore),
        confidenceScore:   Math.round(Math.min(95, 50 + Math.abs(avgScore) * 45)),
        bullishPercent:    Math.round((bullish / total) * 100),
        bearishPercent:    Math.round((bearish / total) * 100),
        neutralPercent:    Math.round((neutral / total) * 100),
        articles,
        summary:
          avgScore > 0.1
            ? `News flow for ${companyName} is predominantly positive, with bullish signals from recent coverage.`
            : avgScore < -0.1
            ? `News sentiment for ${companyName} is cautious-to-negative; watch for further developments.`
            : `News sentiment for ${companyName} is balanced; no strong directional signal from recent coverage.`,
        lastUpdated: new Date().toISOString(),
        isMock: false,
      };

      this.cache.set(symbol, { data: result, timestamp: Date.now() });
      return result;

    } catch (error) {
      console.warn(`[NewsSentiment] Fetch failed for ${symbol}:`, error);
      const mock = generateMockNews(symbol, companyName);
      this.cache.set(symbol, { data: mock, timestamp: Date.now() });
      return mock;
    }
  }

  async getMultipleStocksSentiment(
    stocks: Array<{ symbol: string; name: string }>
  ): Promise<StockNewsSentiment[]> {
    const results: StockNewsSentiment[] = [];
    for (const stock of stocks) {
      const result = await this.getStockNewsSentiment(stock.symbol, stock.name);
      results.push(result);
      // Small delay to avoid hammering the API (free tier: 200 req/day)
      await new Promise(r => setTimeout(r, 400));
    }
    return results;
  }

  clearCache(): void { this.cache.clear(); }

  /** Reset the invalid-key flag (useful after the user updates their key in settings) */
  resetApiKeyState(): void { this.apiKeyInvalid = false; }
}

export const newsSentimentService = new NewsSentimentService();
