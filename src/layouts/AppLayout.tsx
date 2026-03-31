import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import {
  Home, TrendingUp, BarChart2, Activity, LineChart,
  Settings, Layers, ChevronRight, Newspaper, Zap,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { LiveTicker } from '../components/LiveTicker';
import { useAppContext } from '../context/AppContext';

// ─── Sidebar nav items ─────────────────────────────────────────────────────

const NAV_ITEMS = [
  { name: 'Home', path: '/', icon: Home, badge: null },
  { name: 'Stocks', path: '/stocks', icon: TrendingUp, badge: null },
  { name: 'Strategies', path: '/strategies', icon: Layers, badge: null },
  { name: 'Backtesting', path: '/backtesting', icon: BarChart2, badge: null },
  { name: 'Predictions', path: '/predictions', icon: LineChart, badge: 'AI' },
  { name: 'Dashboard', path: '/dashboard', icon: Activity, badge: null },
  { name: 'Settings', path: '/settings', icon: Settings, badge: null },
];

// ─── Sidebar ───────────────────────────────────────────────────────────────

const Sidebar: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
  const { isDarkMode } = useAppContext();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300 ease-in-out
        ${isOpen ? 'w-56' : 'w-14'}
        bg-gray-900/95 backdrop-blur-xl border-r border-gray-800/80
      `}
      style={{ top: '57px' }} /* below navbar */
    >
      {/* Nav items */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-hidden">
        {NAV_ITEMS.map(({ name, path, icon: Icon, badge }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium
               transition-all duration-200 group overflow-hidden
               ${isActive
                 ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/20'
                 : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
               }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active left bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-r-full" />
                )}

                <Icon
                  size={18}
                  className={`flex-shrink-0 transition-transform duration-200 ${
                    isActive ? 'text-emerald-400' : 'group-hover:scale-110'
                  }`}
                />

                <span
                  className={`whitespace-nowrap transition-all duration-300 ${
                    isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
                  }`}
                >
                  {name}
                </span>

                {badge && isOpen && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-900/50 text-emerald-400 border border-emerald-500/20 font-semibold">
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Help card (only when open) */}
      <div
        className={`mx-2 mb-4 overflow-hidden transition-all duration-300 ${
          isOpen ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0'
        }`}
      >
        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-900/30 to-gray-900 border border-emerald-500/20">
          <p className="text-xs font-semibold text-emerald-400 mb-1">Need Help?</p>
          <p className="text-xs text-gray-400 leading-relaxed mb-2">
            Set up strategies and run backtests to get started.
          </p>
          <button className="w-full text-xs py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors">
            View Docs
          </button>
        </div>
      </div>
    </aside>
  );
};

// ─── Page wrapper with reveal animation ───────────────────────────────────

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <div
      className="transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
      }}
    >
      {children}
    </div>
  );
};

// ─── Main layout ───────────────────────────────────────────────────────────

export const AppLayout: React.FC = () => {
  const { isDarkMode } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto-reveal scrollable elements
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`min-h-screen flex flex-col dot-grid ${
        isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'
      }`}
    >
      {/* Fixed navbar */}
      <Navbar />

      {/* Ticker bar */}
      <LiveTicker />

      {/* Body */}
      <div className="flex flex-1 relative">
        {/* Sidebar hover zone */}
        <div
          className="flex-shrink-0 relative z-30"
          onMouseEnter={() => setIsSidebarOpen(true)}
          onMouseLeave={() => setIsSidebarOpen(false)}
        >
          <Sidebar isOpen={isSidebarOpen} />
          {/* Spacer that keeps layout stable */}
          <div className="w-14" />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-screen-2xl mx-auto p-4 md:p-6">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
};
