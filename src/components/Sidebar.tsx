import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  TrendingUp,
  BarChart2,
  Activity,
  LineChart,
  Settings,
  Layers
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { isDarkMode } = useAppContext();

  const navItems = [
    { name: 'Home', path: '/', icon: <Home size={20} /> },
    { name: 'Stocks', path: '/stocks', icon: <TrendingUp size={20} /> },
    { name: 'Strategies', path: '/strategies', icon: <Layers size={20} /> },
    { name: 'Backtesting', path: '/backtesting', icon: <BarChart2 size={20} /> },
    { name: 'Predictions', path: '/predictions', icon: <LineChart size={20} /> },
    { name: 'Dashboard', path: '/dashboard', icon: <Activity size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> }
  ];

  return (
    <div
      className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-[calc(100%-8px)]'
      } ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border-r ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}
    >
      <div className="h-full py-4 flex flex-col">
        <div className="px-4 space-y-4 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? `${isDarkMode ? 'bg-gray-900 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`
                    : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                }`
              }
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className={`mt-auto mx-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-emerald-50'}`}>
          <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-emerald-700'}`}>
            Need Help?
          </h3>
          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-emerald-600'}`}>
            Check our documentation or contact support for assistance with setting up your trading strategies.
          </p>
          <button
            className={`mt-3 text-xs font-medium px-3 py-1.5 rounded-md w-full ${
              isDarkMode
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            View Documentation
          </button>
        </div>
      </div>
    </div>
  );
};