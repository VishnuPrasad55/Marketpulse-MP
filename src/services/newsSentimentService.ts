/**
 * News Sentiment Service
 *
 * Uses NewsData.io (free tier: 200 requests/day) to fetch news for selected stocks,
 * then performs local sentiment analysis using a keyword-weighted scoring model.
 *
 * Setup: Add VITE_NEWSDATA_API_KEY to your .env file
 * Get a free key at https://newsdata.io (200 requests/day free)
 *
 * Falls back to mock news if no API key is set.
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
}

// ─── Sentiment keyword dictionaries ──────────────────────────────────────────

const BULLISH_KEYWORDS = [
  'surge', 'soar', 'jump', 'gain', 'rise', 'rally', 'boom', 'record',
  'profit', 'revenue', 'growth', 'expansion', 'strong', 'beat', 'exceed',
  'outperform', 'upgrade', 'buy', 'bullish', 'positive', 'opportunity',
  'acquisition', 'deal', 'partnership', 'launch', 'win', 'award',
  'dividend', 'buyback', 'invest', 'breakthrough', 'innovation', 'upside',
  'recovery', 'improve', 'momentum', 'targets', 'guidance raised',
];

const BEARISH_KEYWORDS = [
  'fall', 'drop', 'decline', 'crash', 'plunge', 'loss', 'deficit',
  'miss', 'disappoint', 'downgrade', 'sell', 'bearish', 'negative',
  'risk', 'concern', 'worry', 'trouble', 'fraud', 'investigation',
  'lawsuit', 'fine', 'penalty', 'cut', 'layoff', 'restructure',
  'bankruptcy', 'debt', 'default', 'underperform', 'downside', 'warn',
  'volatile', 'uncertainty', 'regulatory', 'probe', 'resign', 'retire',
  'guidance cut', 'guidance lowered',
];

const STRONG_BULLISH = ['record high', 'all-time high', 'strong buy', 'massive gain', 'stellar results'];
const STRONG_BEARISH = ['fraud', 'bankrupt', 'massive loss', 'regulatory action', 'sebi notice', 'cbi probe'];

// ─── Scoring ─────────────────────────────────────────────────────────────────

function scoreText(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;

  // Strong signals carry 2x weight
  STRONG_BULLISH.forEach(kw => { if (lower.includes(kw)) score += 2; });
  STRONG_BEARISH.forEach(kw => { if (lower.includes(kw)) score -= 2; });

  BULLISH_KEYWORDS.forEach(kw => { if (lower.includes(kw)) score += 1; });
  BEARISH_KEYWORDS.forEach(kw => { if (lower.includes(kw)) score -= 1; });

  // Normalise to -1 … +1
  return Math.max(-1, Math.min(1, score / 5));
}

function colorFromScore(score: number): SentimentColor {
  if (score > 0.1) return 'green';
  if (score < -0.1) return 'red';
  return 'yellow';
}

// ─── Company name → search query mapping ────────────────────────────────────

const COMPANY_QUERIES: Record<string, string> = {
  'RELIANCE':    'Reliance Industries stock',
  'TCS':         'Tata Consultancy Services TCS stock',
  'HDFCBANK':    'HDFC Bank stock India',
  'ICICIBANK':   'ICICI Bank stock India',
  'INFY':        'Infosys stock',
  'TATASTEEL':   'Tata Steel stock',
  'SBIN':        'State Bank of India SBI stock',
  'BAJAJAUTO':   'Bajaj Auto stock',
  'HINDUNILVR':  'Hindustan Unilever HUL stock',
  'LT':          'Larsen Toubro L&T stock',
  'TATAMOTORS.B':'Tata Motors stock',
  'BHARTIARTL.B':'Bharti Airtel stock',
  'ASIANPAINT.B':'Asian Paints stock',
};

// ─── Mock data (used when no API key is set) ─────────────────────────────────

function generateMockNews(symbol: string, companyName: string): StockNewsSentiment {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = (n: number) => {
    let x = Math.sin(seed + n) * 10000;
    return x - Math.floor(x);
  };

  const mockArticles: NewsArticle[] = [
    {
      title: `${companyName} reports strong quarterly earnings, beats estimates`,
      description: `${companyName} posted better-than-expected revenue growth driven by expansion in core segments.`,
      url: '#',
      source: 'Economic Times',
      publishedAt: new Date(Date.now() - rand(1) * 86400000 * 2).toISOString(),
      sentiment: 'green',
      sentimentScore: 0.6 + rand(2) * 0.3,
    },
    {
      title: `Analysts upgrade ${companyName} to 'Buy' with raised target price`,
      description: `Multiple brokerages have revised their outlook positively following recent operational updates.`,
      url: '#',
      source: 'Mint',
      publishedAt: new Date(Date.now() - rand(3) * 86400000 * 3).toISOString(),
      sentiment: 'green',
      sentimentScore: 0.5 + rand(4) * 0.2,
    },
    {
      title: `${companyName} faces regulatory scrutiny over compliance norms`,
      description: `Regulators have sought clarifications on certain business practices; company says it is cooperating fully.`,
      url: '#',
      source: 'Business Standard',
      publishedAt: new Date(Date.now() - rand(5) * 86400000 * 5).toISOString(),
      sentiment: rand(6) > 0.5 ? 'yellow' : 'red',
      sentimentScore: -(0.1 + rand(7) * 0.3),
    },
    {
      title: `${companyName} announces strategic partnership to boost growth`,
      description: `The company signed a key deal expected to add significant revenue in the coming quarters.`,
      url: '#',
      source: 'Financial Express',
      publishedAt: new Date(Date.now() - rand(8) * 86400000 * 7).toISOString(),
      sentiment: 'green',
      sentimentScore: 0.4 + rand(9) * 0.4,
    },
    {
      title: `Market volatility weighs on ${companyName} share price`,
      description: `Broader market headwinds and sector-specific concerns have kept investor sentiment cautious.`,
      url: '#',
      source: 'Moneycontrol',
      publishedAt: new Date(Date.now() - rand(10) * 86400000 * 9).toISOString(),
      sentiment: 'yellow',
      sentimentScore: -0.05 + (rand(11) - 0.5) * 0.1,
    },
  ];

  const avgScore = mockArticles.reduce((sum, a) => sum + a.sentimentScore, 0) / mockArticles.length;
  const bullish = mockArticles.filter(a => a.sentiment === 'green').length;
  const bearish = mockArticles.filter(a => a.sentiment === 'red').length;
  const neutral = mockArticles.filter(a => a.sentiment === 'yellow').length;

  return {
    symbol,
    companyName,
    overallSentiment: colorFromScore(avgScore),
    confidenceScore: Math.round(50 + Math.abs(avgScore) * 50),
    bullishPercent: Math.round((bullish / mockArticles.length) * 100),
    bearishPercent: Math.round((bearish / mockArticles.length) * 100),
    neutralPercent: Math.round((neutral / mockArticles.length) * 100),
    articles: mockArticles,
    summary: avgScore > 0.1
      ? `Overall sentiment for ${companyName} is positive. Recent earnings and analyst upgrades are driving confidence.`
      : avgScore < -0.1
      ? `Market sentiment for ${companyName} is cautious. Regulatory concerns and broader headwinds are creating uncertainty.`
      : `Sentiment for ${companyName} is mixed. Positive fundamentals are balanced by macro uncertainty.`,
    lastUpdated: new Date().toISOString(),
  };
}

// ─── Main Service ─────────────────────────────────────────────────────────────

class NewsSentimentService {
  private cache = new Map<string, { data: StockNewsSentiment; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  private getCached(key: string): StockNewsSentiment | null {
    const c = this.cache.get(key);
    if (c && Date.now() - c.timestamp < this.CACHE_DURATION) return c.data;
    return null;
  }

  async getStockNewsSentiment(
    symbol: string,
    companyName: string
  ): Promise<StockNewsSentiment> {
    const cached = this.getCached(symbol);
    if (cached) return cached;

    const apiKey = import.meta.env.VITE_NEWSDATA_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ VITE_NEWSDATA_API_KEY not set — using mock news data');
      const mock = generateMockNews(symbol, companyName);
      this.cache.set(symbol, { data: mock, timestamp: Date.now() });
      return mock;
    }

    try {
      const query = COMPANY_QUERIES[symbol] || `${companyName} stock`;
      // NewsData.io free endpoint
      const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&q=${encodeURIComponent(query)}&language=en&category=business&size=10`;

      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

      if (!response.ok) throw new Error(`NewsData HTTP ${response.status}`);

      const json = await response.json();

      if (json.status !== 'success' || !json.results?.length) {
        throw new Error('No articles returned');
      }

      const articles: NewsArticle[] = json.results.map((item: any) => {
        const text = `${item.title ?? ''} ${item.description ?? ''}`;
        const score = scoreText(text);
        return {
          title: item.title ?? 'Untitled',
          description: item.description ?? null,
          url: item.link ?? '#',
          source: item.source_id ?? 'Unknown',
          publishedAt: item.pubDate ?? new Date().toISOString(),
          sentiment: colorFromScore(score),
          sentimentScore: score,
        } as NewsArticle;
      });

      const avgScore = articles.reduce((s, a) => s + a.sentimentScore, 0) / articles.length;
      const bullish = articles.filter(a => a.sentiment === 'green').length;
      const bearish = articles.filter(a => a.sentiment === 'red').length;
      const neutral = articles.filter(a => a.sentiment === 'yellow').length;
      const total = articles.length;

      const result: StockNewsSentiment = {
        symbol,
        companyName,
        overallSentiment: colorFromScore(avgScore),
        confidenceScore: Math.round(Math.min(95, 50 + Math.abs(avgScore) * 50)),
        bullishPercent: Math.round((bullish / total) * 100),
        bearishPercent: Math.round((bearish / total) * 100),
        neutralPercent: Math.round((neutral / total) * 100),
        articles,
        summary:
          avgScore > 0.1
            ? `News flow for ${companyName} is predominantly positive, with bullish signals from recent coverage.`
            : avgScore < -0.1
            ? `News sentiment for ${companyName} is cautious-to-negative; watch for further developments.`
            : `News sentiment for ${companyName} is balanced; no strong directional signal from recent coverage.`,
        lastUpdated: new Date().toISOString(),
      };

      this.cache.set(symbol, { data: result, timestamp: Date.now() });
      return result;

    } catch (error) {
      console.warn(`⚠️ News fetch failed for ${symbol}:`, error);
      const mock = generateMockNews(symbol, companyName);
      this.cache.set(symbol, { data: mock, timestamp: Date.now() });
      return mock;
    }
  }

  async getMultipleStocksSentiment(
    stocks: Array<{ symbol: string; name: string }>
  ): Promise<StockNewsSentiment[]> {
    // Fetch with a small delay between requests to avoid rate limiting
    const results: StockNewsSentiment[] = [];
    for (const stock of stocks) {
      const result = await this.getStockNewsSentiment(stock.symbol, stock.name);
      results.push(result);
      await new Promise(r => setTimeout(r, 300));
    }
    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const newsSentimentService = new NewsSentimentService();
