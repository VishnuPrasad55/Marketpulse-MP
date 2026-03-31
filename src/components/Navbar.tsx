import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, Moon, Sun, LogOut, User, Menu, X, TrendingUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import { stockApi } from '../services/stockApi';

export const Navbar: React.FC = () => {
  const { isDarkMode, toggleDarkMode, userProfile } = useAppContext();
  const { signOut } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [marketStatus, setMarketStatus] = useState(stockApi.getMarketStatus());

  // Update market status every minute
  useEffect(() => {
    const t = setInterval(() => setMarketStatus(stockApi.getMarketStatus()), 60000);
    return () => clearInterval(t);
  }, []);

  // Scroll listener for navbar glass effect
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  const initials = userProfile?.full_name
    ? userProfile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <nav
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-gray-900/90 backdrop-blur-xl border-b border-gray-800/80 shadow-lg shadow-black/20'
          : 'bg-gray-900 border-b border-gray-800/50'
      }`}
    >
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <div className="relative">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-900/40 group-hover:shadow-emerald-900/60 transition-shadow">
              <TrendingUp size={16} className="text-white" strokeWidth={2.5} />
            </div>
            {/* Live indicator dot */}
            {marketStatus.isOpen && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-gray-900 animate-pulse" />
            )}
          </div>
          <span className="font-bold text-lg text-white hidden sm:block tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
            Market<span className="text-emerald-400">Pulse</span>
          </span>
        </Link>

        {/* Search bar */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 ${
              searchFocused
                ? 'bg-gray-800 border-emerald-500/50 shadow-lg shadow-emerald-900/20'
                : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600'
            }`}
          >
            <Search size={15} className="text-gray-500 flex-shrink-0" />
            <input
              type="text"
              className="bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none w-full"
              placeholder="Search stocks, sectors… (e.g. TCS, Banking)"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            />
            {searchValue && (
              <button onClick={() => setSearchValue('')}>
                <X size={13} className="text-gray-500 hover:text-gray-300" />
              </button>
            )}
          </div>

          {/* Dropdown suggestions */}
          {searchFocused && !searchValue && (
            <div className="absolute top-full mt-1.5 left-0 right-0 bg-gray-800 border border-gray-700/60 rounded-xl shadow-xl py-2 z-50 animate-slide-up">
              {[
                { label: 'RELIANCE', sub: 'Reliance Industries · NSE' },
                { label: 'TCS', sub: 'Tata Consultancy Services · NSE' },
                { label: 'HDFCBANK', sub: 'HDFC Bank · NSE' },
              ].map(s => (
                <button
                  key={s.label}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-700/60 transition-colors text-left"
                  onClick={() => setSearchValue(s.label)}
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center text-xs font-bold text-emerald-400">
                    {s.label[0]}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{s.label}</p>
                    <p className="text-xs text-gray-500">{s.sub}</p>
                  </div>
                </button>
              ))}
              <div className="px-4 pt-2 pb-1 border-t border-gray-700/50 mt-1">
                <p className="text-xs text-gray-500">Search by ticker, company name, or sector</p>
              </div>
            </div>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Market status badge */}
          <div
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              marketStatus.isOpen
                ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/20'
                : 'bg-gray-800/60 text-gray-400 border-gray-700/50'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                marketStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
              }`}
            />
            {marketStatus.isOpen ? 'Live' : 'Closed'}
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-gray-800 transition-colors group">
            <Bell size={18} className="text-gray-400 group-hover:text-white transition-colors" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors group"
          >
            {isDarkMode ? (
              <Sun size={18} className="text-amber-400 group-hover:rotate-12 transition-transform" />
            ) : (
              <Moon size={18} className="text-gray-400 group-hover:text-white transition-colors" />
            )}
          </button>

          {/* Avatar menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs text-white font-medium leading-none">
                  {userProfile?.full_name?.split(' ')[0] || 'Trader'}
                </p>
                <p className="text-[10px] text-gray-500 leading-none mt-0.5">
                  {userProfile?.experience_level || 'Pro'}
                </p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-gray-800 border border-gray-700/60 rounded-xl shadow-2xl overflow-hidden z-50 animate-slide-up">
                <div className="px-4 py-3 border-b border-gray-700/50">
                  <p className="text-sm text-white font-semibold">{userProfile?.full_name || 'Trader'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{userProfile?.experience_level || 'Beginner'}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700/60 hover:text-white transition-colors"
                  >
                    <User size={15} />
                    Account Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
