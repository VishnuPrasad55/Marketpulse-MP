import React, { useState, useEffect } from 'react';
import {
  Zap, CheckCircle2, AlertCircle, ExternalLink, TrendingUp,
  DollarSign, ShoppingCart, XCircle, RefreshCw, Info,
} from 'lucide-react';
import { kiteService, KiteProfile, KiteHolding, KiteOrder } from '../services/kiteService';
import { useAppContext } from '../context/AppContext';

// ─── Setup Instructions Card ──────────────────────────────────────────────────

const SetupCard: React.FC<{ onConnect: () => void }> = ({ onConnect }) => (
  <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-6 space-y-5">
    <div className="flex items-center gap-3">
      <div className="p-2.5 rounded-lg bg-orange-900/30 border border-orange-500/30">
        <Zap size={20} className="text-orange-400" />
      </div>
      <div>
        <h3 className="text-white font-semibold">Connect Zerodha Kite</h3>
        <p className="text-xs text-gray-400">Live trading via Zerodha's official API</p>
      </div>
    </div>

    {/* Steps */}
    <ol className="space-y-3">
      {[
        {
          step: 1,
          title: 'Create a Kite app',
          desc: (
            <>
              Go to{' '}
              <a
                href="https://developers.kite.trade"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:underline"
              >
                developers.kite.trade
              </a>{' '}
              and create an app. Set redirect URL to your app's{' '}
              <code className="text-emerald-400 text-xs">/kite-callback</code> route.
            </>
          ),
        },
        {
          step: 2,
          title: 'Add credentials to .env',
          desc: (
            <code className="block text-xs text-emerald-400 bg-gray-900/50 p-2 rounded mt-1">
              VITE_KITE_API_KEY=your_api_key
              <br />
              VITE_BACKEND_URL=http://localhost:3001
            </code>
          ),
        },
        {
          step: 3,
          title: 'Run the token exchange backend',
          desc: (
            <>
              Download{' '}
              <code className="text-emerald-400 text-xs">kiteService.ts</code> and
              run the <code className="text-emerald-400 text-xs">KITE_BACKEND_EXAMPLE_CODE</code>{' '}
              as a separate Node server. This keeps your API secret safe.
            </>
          ),
        },
        {
          step: 4,
          title: 'Connect your account',
          desc: 'Click the button below to log in with Zerodha.',
        },
      ].map(({ step, title, desc }) => (
        <li key={step} className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-900/40 border border-orange-500/40 text-orange-400 text-xs font-bold flex items-center justify-center">
            {step}
          </span>
          <div>
            <p className="text-sm text-white font-medium">{title}</p>
            <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
          </div>
        </li>
      ))}
    </ol>

    <button
      onClick={onConnect}
      className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
    >
      <Zap size={16} />
      Connect Zerodha Account
      <ExternalLink size={14} />
    </button>

    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-900/20 border border-blue-500/20">
      <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-blue-300">
        MarketPulse does not store your Zerodha credentials. The API key is used only
        to initiate OAuth. Your access token is stored in sessionStorage and cleared
        when you close the tab.
      </p>
    </div>
  </div>
);

// ─── Connected Dashboard ──────────────────────────────────────────────────────

const ConnectedDashboard: React.FC<{
  profile: KiteProfile;
  holdings: KiteHolding[];
  orders: KiteOrder[];
  loading: boolean;
  onDisconnect: () => void;
  onRefresh: () => void;
  onPlaceOrder: (symbol: string, type: 'BUY' | 'SELL') => void;
  selectedStockSymbols: string[];
}> = ({ profile, holdings, orders, loading, onDisconnect, onRefresh, onPlaceOrder, selectedStockSymbols }) => (
  <div className="space-y-4">
    {/* Profile bar */}
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-orange-900/20 border border-orange-500/30">
      <div className="flex items-center gap-3">
        <CheckCircle2 size={18} className="text-emerald-400" />
        <div>
          <p className="text-sm text-white font-semibold">{profile.user_name}</p>
          <p className="text-xs text-gray-400">{profile.user_id} · {profile.broker}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
          disabled={loading}
        >
          <RefreshCw size={14} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={onDisconnect}
          className="px-3 py-1 text-xs rounded-lg bg-red-900/30 text-red-400 border border-red-500/30 hover:bg-red-900/50 transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>

    {/* Quick Trade panel for selected stocks */}
    {selectedStockSymbols.length > 0 && (
      <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
        <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">
          Quick Trade — Selected Stocks
        </p>
        <div className="space-y-2">
          {selectedStockSymbols.map(sym => (
            <div key={sym} className="flex items-center justify-between">
              <span className="text-sm text-white font-medium">{sym}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onPlaceOrder(sym, 'BUY')}
                  className="px-3 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors flex items-center gap-1"
                >
                  <ShoppingCart size={12} /> BUY
                </button>
                <button
                  onClick={() => onPlaceOrder(sym, 'SELL')}
                  className="px-3 py-1 text-xs rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors flex items-center gap-1"
                >
                  <XCircle size={12} /> SELL
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Holdings */}
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/50">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <DollarSign size={14} className="text-orange-400" />
          Holdings ({holdings.length})
        </h4>
      </div>
      {loading ? (
        <div className="py-6 text-center text-gray-400 text-sm">Loading holdings...</div>
      ) : holdings.length === 0 ? (
        <div className="py-6 text-center text-gray-400 text-sm">No holdings found</div>
      ) : (
        <div className="divide-y divide-gray-700/30">
          {holdings.slice(0, 8).map(h => (
            <div key={h.tradingsymbol} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm text-white font-medium">{h.tradingsymbol}</p>
                <p className="text-xs text-gray-400">{h.quantity} shares @ ₹{h.average_price.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white">₹{h.last_price.toFixed(2)}</p>
                <p className={`text-xs ${h.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {h.pnl >= 0 ? '+' : ''}₹{h.pnl.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Recent orders */}
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/50">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <TrendingUp size={14} className="text-orange-400" />
          Recent Orders ({orders.length})
        </h4>
      </div>
      {loading ? (
        <div className="py-6 text-center text-gray-400 text-sm">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="py-6 text-center text-gray-400 text-sm">No orders today</div>
      ) : (
        <div className="divide-y divide-gray-700/30">
          {orders.slice(0, 5).map(o => (
            <div key={o.order_id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm text-white font-medium">{o.tradingsymbol}</p>
                <p className="text-xs text-gray-400">{o.order_type} · {o.validity || 'DAY'}</p>
              </div>
              <div className="text-right flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  o.transaction_type === 'BUY'
                    ? 'bg-emerald-900/30 text-emerald-400'
                    : 'bg-red-900/30 text-red-400'
                }`}>
                  {o.transaction_type}
                </span>
                <div>
                  <p className="text-sm text-white">{o.quantity} × ₹{o.price.toFixed(2)}</p>
                  <p className={`text-xs ${
                    o.status === 'COMPLETE' ? 'text-emerald-400'
                    : o.status === 'REJECTED' ? 'text-red-400'
                    : 'text-amber-400'
                  }`}>{o.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ─── Order Modal ──────────────────────────────────────────────────────────────

const OrderModal: React.FC<{
  symbol: string;
  type: 'BUY' | 'SELL';
  onConfirm: (qty: number, orderType: 'MARKET' | 'LIMIT', price?: number) => void;
  onClose: () => void;
}> = ({ symbol, type, onConfirm, onClose }) => {
  const [qty, setQty] = useState(1);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <h3 className="text-white font-bold text-lg mb-4">
          {type === 'BUY' ? '🟢' : '🔴'} {type} {symbol}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Order Type</label>
            <div className="flex gap-2">
              {(['MARKET', 'LIMIT'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    orderType === t
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {orderType === 'LIMIT' && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Limit Price (₹)</label>
              <input
                type="number"
                min={0}
                step={0.05}
                value={limitPrice}
                onChange={e => setLimitPrice(e.target.value)}
                placeholder="Enter price"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(qty, orderType, limitPrice ? parseFloat(limitPrice) : undefined)}
              className={`flex-1 py-2 rounded-lg text-white text-sm font-semibold transition-colors ${
                type === 'BUY'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              Place {type} Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

export const ZerodhaPanel: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { selectedStocks } = useAppContext();
  const [connected, setConnected] = useState(false);
  const [profile, setProfile] = useState<KiteProfile | null>(null);
  const [holdings, setHoldings] = useState<KiteHolding[]>([]);
  const [orders, setOrders] = useState<KiteOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderModal, setOrderModal] = useState<{ symbol: string; type: 'BUY' | 'SELL' } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    // Check if already authenticated
    if (kiteService.restoreSession()) {
      setConnected(true);
      fetchData();
    }

    // Handle kite callback (if redirected back with request_token in URL)
    const url = new URL(window.location.href);
    const requestToken = url.searchParams.get('request_token');
    if (requestToken) {
      kiteService.handleCallback(requestToken).then(success => {
        if (success) {
          setConnected(true);
          fetchData();
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      });
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, h, o] = await Promise.all([
        kiteService.getProfile().catch(() => null),
        kiteService.getHoldings().catch(() => []),
        kiteService.getOrders().catch(() => []),
      ]);
      if (p) setProfile(p);
      setHoldings(h);
      setOrders(o);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    kiteService.initiateLogin();
  };

  const handleDisconnect = () => {
    kiteService.logout();
    setConnected(false);
    setProfile(null);
    setHoldings([]);
    setOrders([]);
  };

  const handleOrderConfirm = async (qty: number, orderType: 'MARKET' | 'LIMIT', price?: number) => {
    if (!orderModal) return;
    setOrderModal(null);

    try {
      const exchange = orderModal.symbol.endsWith('.B') ? 'BSE' : 'NSE';
      const symbol = orderModal.symbol.replace('.B', '');

      await kiteService.placeOrder({
        tradingsymbol: symbol,
        exchange,
        transaction_type: orderModal.type,
        order_type: orderType,
        quantity: qty,
        price: orderType === 'LIMIT' ? price : undefined,
        product: 'CNC',
        validity: 'DAY',
      });

      showToast(`✅ ${orderModal.type} order placed for ${qty} × ${symbol}`);
      fetchData();
    } catch (err: any) {
      showToast(`❌ Order failed: ${err.message}`);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className={`relative ${className}`}>
      {toast && (
        <div className="absolute top-0 left-0 right-0 z-50 mx-4 mt-2 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-sm text-white shadow-lg animate-in">
          {toast}
        </div>
      )}

      {!connected ? (
        <SetupCard onConnect={handleConnect} />
      ) : profile ? (
        <ConnectedDashboard
          profile={profile}
          holdings={holdings}
          orders={orders}
          loading={loading}
          onDisconnect={handleDisconnect}
          onRefresh={fetchData}
          onPlaceOrder={(symbol, type) => setOrderModal({ symbol, type })}
          selectedStockSymbols={selectedStocks.map(s => s.symbol)}
        />
      ) : (
        <div className="py-8 text-center text-gray-400 text-sm">Loading account data...</div>
      )}

      {orderModal && (
        <OrderModal
          symbol={orderModal.symbol}
          type={orderModal.type}
          onConfirm={handleOrderConfirm}
          onClose={() => setOrderModal(null)}
        />
      )}
    </div>
  );
};

export default ZerodhaPanel;
