import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';
import { StockSelectionPage } from './pages/StockSelectionPage';
import { StrategyPage } from './pages/StrategyPage';
import { BacktestingPage } from './pages/BacktestingPage';
import { PredictionsPage } from './pages/PredictionsPage';
import { TradingDashboardPage } from './pages/TradingDashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { AlgoEditorPage } from './pages/AlgoEditorPage';
import { PaperTradingPage } from './pages/PaperTradingPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { PortfolioAnalyticsPage } from './pages/PortfolioAnalyticsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { LoginPage } from './components/auth/LoginPage';
import { AppProvider } from './context/AppContext';
import { useAuth } from './hooks/useAuth';
import './index.css';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
          <p className="text-gray-500 text-sm">Loading MarketPulse…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="stocks" element={<StockSelectionPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="strategies" element={<StrategyPage />} />
          <Route path="algo-editor" element={<AlgoEditorPage />} />
          <Route path="backtesting" element={<BacktestingPage />} />
          <Route path="predictions" element={<PredictionsPage />} />
          <Route path="dashboard" element={<TradingDashboardPage />} />
          <Route path="paper-trading" element={<PaperTradingPage />} />
          <Route path="analytics" element={<PortfolioAnalyticsPage />} />
          <Route path="ai-assistant" element={<AIAssistantPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="kite-callback" element={<KiteCallbackPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

// Minimal Kite callback handler
function KiteCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('request_token');
    if (token) {
      window.opener?.postMessage({ type: 'kite_callback', request_token: token }, window.location.origin);
      window.close();
    }
  }, []);
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-500 border-t-transparent mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Completing Zerodha authentication…</p>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    const light = document.querySelector('.cursor-light') as HTMLElement | null;
    if (!light) return;
    const handleMouseMove = (e: MouseEvent) => {
      light.style.left = `${e.clientX}px`;
      light.style.top = `${e.clientY}px`;
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <AppProvider>
      <div className="cursor-light" />
      <AppContent />
    </AppProvider>
  );
}

export default App;
