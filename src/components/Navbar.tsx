import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, Moon, Sun, Clock, LogOut, User } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import { stockApi } from '../services/stockApi';

const getMarketStatus = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  // Market hours: 9:00 AM to 3:30 PM (540 to 930 minutes)
  const marketOpen = 9 * 60; // 9:00 AM in minutes
  const marketClose = 15 * 60 + 30; // 3:30 PM in minutes
  
  if (currentTime < marketOpen) {
    return {
      isOpen: false,
      status: 'Market opens at 9:00 AM ET',
      nextChange: `${marketOpen - currentTime} minutes until market opens`
    };
  } else if (currentTime >= marketOpen && currentTime < marketClose) {
    return {
      isOpen: true,
      status: 'Market open until 3:30 PM ET',
      nextChange: `${marketClose - currentTime} minutes until market closes`
    };
  } else {
    return {
      isOpen: false,
      status: 'Market closed — next open at 9:00 AM ET',
      nextChange: 'Market opens tomorrow at 9:00 AM ET'
    };
  }
};

export const Navbar: React.FC = () => {
  const { isDarkMode, toggleDarkMode, userProfile } = useAppContext();
  const { signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const marketStatus = stockApi.getMarketStatus();

  const searchUseCases = [
    "Search by ticker (RELIANCE, TCS, INFY)",
    "Look up a company name (Tata Motors, HDFC Bank)",
    "Find stocks by sector (Banking, IT, Oil & Gas)"
  ];

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  return (
    <nav className={`px-4 py-3 ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link to="/" className="flex items-center space-x-2">
            <div className={`h-8 w-8 rounded-md ${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-600'} flex items-center justify-center`}>
              <span className="font-bold text-white">MP</span>
            </div>
            <span className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>MarketPulse</span>
          </Link>
        </div>

        <div className="hidden md:flex items-center md:ml-6 space-x-4">
          <div className="relative">
            <div className={`relative rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                className={`py-2 pl-10 pr-4 block w-full sm:text-sm border-none rounded-md focus:ring-2 focus:ring-emerald-500 ${
                  isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
                placeholder="Search stocks, companies, sectors..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              />
            </div>
            
            {searchFocused && searchValue.length === 0 && (
              <div className={`absolute top-full left-0 right-0 mt-1 rounded-md shadow-lg z-50 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <div className="p-3">
                  <div className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Search Examples:
                  </div>
                  {searchUseCases.map((useCase, index) => (
                    <div
                      key={index}
                      className={`text-sm py-1 cursor-pointer ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                      onClick={() => {
                        setSearchValue(useCase.split('(')[1]?.split(')')[0]?.split(',')[0] || '');
                        setSearchFocused(false);
                      }}
                    >
                      • {useCase}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className={`hidden md:flex items-center px-3 py-1.5 rounded-md ${
            marketStatus.isOpen
              ? isDarkMode ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
              : isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-700'
          }`}>
            <Clock size={16} className="mr-2" />
            <span className="text-sm font-medium">{marketStatus.isOpen ? 'Market Open' : 'Market Closed'}</span>
          </div>
          
          <button className={`p-2 rounded-md ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
            <Bell size={20} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
          </button>
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-md ml-2 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
          >
            {isDarkMode ? (
              <Sun size={20} className="text-yellow-300" />
            ) : (
              <Moon size={20} className="text-gray-600" />
            )}
          </button>
          
          {/* User Menu */}
          <div className="ml-3 relative">
            <div>
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                <span className="inline-flex h-8 w-8 rounded-full overflow-hidden bg-emerald-600">
                  <span className="text-xs flex items-center justify-center h-full w-full text-white">
                    {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'U'}
                  </span>
                </span>
              </button>
            </div>
            
            {showUserMenu && (
              <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-50 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <div className="py-1">
                  <div className={`px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div className="font-medium">{userProfile?.full_name || 'User'}</div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {userProfile?.experience_level || 'Trader'}
                    </div>
                  </div>
                  <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}></div>
                  <Link
                    to="/settings"
                    className={`flex items-center px-4 py-2 text-sm ${
                      isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setShowUserMenu(false)}
                  >
                    <User size={16} className="mr-2" />
                    Account Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className={`flex items-center w-full px-4 py-2 text-sm ${
                      isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <LogOut size={16} className="mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden mt-2">
          <div className={`px-2 pt-2 pb-3 space-y-1 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`relative rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} mb-2`}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                className={`py-2 pl-10 pr-4 block w-full sm:text-sm border-none rounded-md focus:ring-2 focus:ring-emerald-500 ${
                  isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
                placeholder="Search stocks, companies, sectors..."
              />
            </div>
            <div className={`px-3 py-2 rounded-md ${
              marketStatus.isOpen
                ? isDarkMode ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                : isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-700'
            }`}>
              <div className="flex items-center">
                <Clock size={16} className="mr-2" />
                <span className="text-sm font-medium">{marketStatus.isOpen ? 'Market Open' : 'Market Closed'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};