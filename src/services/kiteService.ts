/**
 * Zerodha Kite Integration Service
 *
 * HOW IT WORKS:
 * Zerodha's Kite API uses OAuth 2.0. The flow is:
 *   1. User clicks "Connect Zerodha" → opens Kite login page
 *   2. After login, Kite redirects back with a `request_token`
 *   3. Your backend exchanges request_token + api_secret → access_token
 *   4. All subsequent API calls use the access_token
 *
 * BROWSER LIMITATION:
 * The api_secret must NEVER be exposed in frontend code.
 * Therefore, step 3 MUST happen on a server (Express/FastAPI/Supabase Edge Function).
 *
 * SETUP STEPS:
 * 1. Register at https://developers.kite.trade and create an app
 * 2. Set redirect URL to http://localhost:5173/kite-callback (dev) or your prod URL
 * 3. Add to .env:
 *      VITE_KITE_API_KEY=your_api_key_here
 * 4. Deploy the backend token exchange endpoint (see kiteBackendExample.ts)
 * 5. Add VITE_BACKEND_URL=http://localhost:3001 to .env
 *
 * This file handles the frontend side of the integration.
 */

export interface KitePosition {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  day_change: number;
  day_change_percentage: number;
}

export interface KiteHolding {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  collateral_quantity: number;
  t1_quantity: number;
}

export interface KiteOrder {
  order_id: string;
  tradingsymbol: string;
  transaction_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  status: string;
  order_type: string;
  placed_at: string;
}

export interface KiteProfile {
  user_id: string;
  user_name: string;
  email: string;
  user_type: string;
  broker: string;
}

export interface KitePlaceOrderParams {
  tradingsymbol: string;
  exchange: 'NSE' | 'BSE';
  transaction_type: 'BUY' | 'SELL';
  order_type: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
  quantity: number;
  price?: number;       // Required for LIMIT/SL orders
  trigger_price?: number; // Required for SL/SL-M orders
  product: 'CNC' | 'NRML' | 'MIS';
  validity?: 'DAY' | 'IOC';
}

class KiteService {
  private accessToken: string | null = null;
  private profile: KiteProfile | null = null;

  private get apiKey(): string {
    return import.meta.env.VITE_KITE_API_KEY || '';
  }

  private get backendUrl(): string {
    return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  }

  /**
   * Step 1: Redirect user to Kite login.
   * Kite will send back ?request_token=xxx to your redirect URL.
   */
  initiateLogin(): void {
    if (!this.apiKey) {
      console.error('❌ VITE_KITE_API_KEY is not set in .env');
      alert(
        'Zerodha API key not configured.\n\n' +
        'Add VITE_KITE_API_KEY to your .env file.\n' +
        'Get your key at https://developers.kite.trade'
      );
      return;
    }
    const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${this.apiKey}`;
    window.open(loginUrl, '_blank', 'width=600,height=700');
  }

  /**
   * Step 2 (frontend part): Read request_token from URL after Kite redirect,
   * then call your backend to exchange it for an access_token.
   */
  async handleCallback(requestToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/api/kite/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_token: requestToken }),
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);

      const data = await response.json();
      this.accessToken = data.access_token;

      // Persist in sessionStorage (cleared on tab close for security)
      sessionStorage.setItem('kite_access_token', data.access_token);
      console.log('✅ Zerodha authentication successful');
      return true;
    } catch (err) {
      console.error('❌ Kite token exchange failed:', err);
      return false;
    }
  }

  /**
   * Restore session from sessionStorage if available.
   */
  restoreSession(): boolean {
    const token = sessionStorage.getItem('kite_access_token');
    if (token) {
      this.accessToken = token;
      return true;
    }
    return false;
  }

  logout(): void {
    this.accessToken = null;
    this.profile = null;
    sessionStorage.removeItem('kite_access_token');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken || !!sessionStorage.getItem('kite_access_token');
  }

  private getToken(): string {
    return this.accessToken || sessionStorage.getItem('kite_access_token') || '';
  }

  /**
   * Proxy all Kite API calls through your backend to protect credentials.
   */
  private async kiteRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated with Zerodha');

    const response = await fetch(`${this.backendUrl}/api/kite${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Kite-Token': token,
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(err.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  async getProfile(): Promise<KiteProfile> {
    if (this.profile) return this.profile;
    const data = await this.kiteRequest('/profile');
    this.profile = data.data;
    return this.profile!;
  }

  async getPositions(): Promise<{ day: KitePosition[]; net: KitePosition[] }> {
    const data = await this.kiteRequest('/positions');
    return data.data;
  }

  async getHoldings(): Promise<KiteHolding[]> {
    const data = await this.kiteRequest('/holdings');
    return data.data;
  }

  async getOrders(): Promise<KiteOrder[]> {
    const data = await this.kiteRequest('/orders');
    return data.data;
  }

  /**
   * Place an order via Kite.
   * Market orders go through immediately; limit orders stay in book.
   */
  async placeOrder(params: KitePlaceOrderParams): Promise<string> {
    const data = await this.kiteRequest('/orders/regular', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    console.log(`✅ Order placed: ${params.transaction_type} ${params.quantity} ${params.tradingsymbol}`);
    return data.data?.order_id;
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.kiteRequest(`/orders/regular/${orderId}`, { method: 'DELETE' });
  }

  async getQuote(symbols: string[]): Promise<Record<string, any>> {
    const query = symbols.map(s => `i=${s}`).join('&');
    const data = await this.kiteRequest(`/quote?${query}`);
    return data.data;
  }

  async getFunds(): Promise<any> {
    const data = await this.kiteRequest('/margins');
    return data.data;
  }
}

export const kiteService = new KiteService();

// ─── Backend example (save as server/kiteBackend.ts and run separately) ──────
export const KITE_BACKEND_EXAMPLE_CODE = `
// server/kiteBackend.ts — Run with: npx ts-node server/kiteBackend.ts
// npm install express @zerodha-tech/kiteconnect cors dotenv

import express from 'express';
import { KiteConnect } from '@zerodha-tech/kiteconnect';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

const kite = new KiteConnect({
  api_key: process.env.KITE_API_KEY!,
});

// POST /api/kite/session — exchange request_token → access_token
app.post('/api/kite/session', async (req, res) => {
  try {
    const { request_token } = req.body;
    const session = await kite.generateSession(request_token, process.env.KITE_API_SECRET!);
    res.json({ access_token: session.access_token });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// Proxy all Kite API calls
app.all('/api/kite/*', async (req, res) => {
  const token = req.headers['x-kite-token'] as string;
  if (!token) return res.status(401).json({ message: 'No token' });

  kite.setAccessToken(token);
  const endpoint = req.path.replace('/api/kite', '');

  try {
    let data;
    if (req.method === 'GET') data = await kite.request('GET', endpoint);
    else if (req.method === 'POST') data = await kite.request('POST', endpoint, req.body);
    else if (req.method === 'DELETE') data = await kite.request('DELETE', endpoint);
    res.json({ data });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

app.listen(3001, () => console.log('Kite proxy backend running on :3001'));
`;
