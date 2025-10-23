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
import { LoginPage } from './components/auth/LoginPage';
import { AppProvider } from './context/AppContext';
import { useAuth } from './hooks/useAuth';
import './index.css';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
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
          <Route path="strategies" element={<StrategyPage />} />
          <Route path="backtesting" element={<BacktestingPage />} />
          <Route path="predictions" element={<PredictionsPage />} />
          <Route path="dashboard" element={<TradingDashboardPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
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

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <AppProvider>
      <div className="cursor-light" />
      <AppContent />
    </AppProvider>
  );
}

export default App;
