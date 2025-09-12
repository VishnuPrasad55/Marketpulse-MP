import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  User,
  Bell,
  Shield,
  DollarSign,
  TrendingUp,
  Moon,
  Sun,
  Smartphone,
  Mail,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Settings as SettingsIcon,
  Download,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Save,
  RefreshCw
} from 'lucide-react';

export function SettingsPage() {
  const { isDarkMode, toggleDarkMode, tradingParameters, updateTradingParameters, userProfile, updateUserProfile } = useAppContext();
  const [activeTab, setActiveTab] = useState('profile');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    priceAlerts: true,
    tradeExecutions: true,
    marketNews: false,
    weeklyReports: true
  });
  
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    risk_tolerance: 'Medium',
    experience_level: 'Beginner'
  });
  
  const [security, setSecurity] = useState({
    twoFactorEnabled: true,
    sessionTimeout: 30,
    loginAlerts: true
  });

  // Load user profile data
  useEffect(() => {
    if (userProfile) {
      setProfile({
        full_name: userProfile.full_name || '',
        phone: userProfile.phone || '',
        risk_tolerance: userProfile.risk_tolerance || 'Medium',
        experience_level: userProfile.experience_level || 'Beginner'
      });
    }
  }, [userProfile]);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: <User size={20} /> },
    { id: 'trading', name: 'Trading', icon: <TrendingUp size={20} /> },
    { id: 'notifications', name: 'Notifications', icon: <Bell size={20} /> },
    { id: 'security', name: 'Security', icon: <Shield size={20} /> },
    { id: 'appearance', name: 'Appearance', icon: <SettingsIcon size={20} /> }
  ];

  const handleTradingParameterChange = (key: string, value: any) => {
    updateTradingParameters({ [key]: value });
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  const handleProfileChange = (key: string, value: string) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const handleSecurityChange = (key: string, value: any) => {
    setSecurity(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await updateUserProfile(profile);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Full Name
            </label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => handleProfileChange('full_name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Phone Number
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => handleProfileChange('phone', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Risk Tolerance
            </label>
            <select
              value={profile.risk_tolerance}
              onChange={(e) => handleProfileChange('risk_tolerance', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="Conservative">Conservative</option>
              <option value="Medium">Medium</option>
              <option value="Aggressive">Aggressive</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Trading Experience
            </label>
            <select
              value={profile.experience_level}
              onChange={(e) => handleProfileChange('experience_level', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="Beginner">Beginner (0-1 years)</option>
              <option value="Intermediate">Intermediate (1-5 years)</option>
              <option value="Advanced">Advanced (5+ years)</option>
              <option value="Professional">Professional</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          API Configuration
        </h3>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Broker API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value="sk_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                readOnly
                className={`w-full px-3 py-2 pr-10 border rounded-md ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
                }`}
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                  isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Your API key is encrypted and securely stored
            </p>
          </div>
          <div className="flex space-x-3">
            <button className={`px-4 py-2 rounded-md font-medium transition-colors ${
              isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}>
              <RefreshCw size={16} className="mr-2 inline" />
              Regenerate Key
            </button>
            <button className={`px-4 py-2 rounded-md font-medium transition-colors ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}>
              Test Connection
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-emerald-900/20 border border-emerald-800' : 'bg-emerald-50 border border-emerald-200'}`}>
          <div className="flex items-center">
            <CheckCircle2 size={16} className={`mr-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className={`text-sm ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center">
            <AlertTriangle size={16} className={`mr-2 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
            <span className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderTradingSettings = () => (
    <div className="space-y-8">
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Trading Parameters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Initial Capital (₹)
            </label>
            <input
              type="number"
              value={tradingParameters.initialCapital}
              onChange={(e) => handleTradingParameterChange('initialCapital', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Position Size (%)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={tradingParameters.positionSize}
              onChange={(e) => handleTradingParameterChange('positionSize', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Max Open Positions
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={tradingParameters.maxOpenPositions}
              onChange={(e) => handleTradingParameterChange('maxOpenPositions', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Stop Loss (%)
            </label>
            <input
              type="number"
              min="0.1"
              max="50"
              step="0.1"
              value={tradingParameters.stopLoss}
              onChange={(e) => handleTradingParameterChange('stopLoss', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Take Profit (%)
            </label>
            <input
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={tradingParameters.takeProfit}
              onChange={(e) => handleTradingParameterChange('takeProfit', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Advanced Options
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Trailing Stop Loss
              </label>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Automatically adjust stop loss as price moves favorably
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tradingParameters.trailingStop}
                onChange={(e) => handleTradingParameterChange('trailingStop', e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Auto Rebalancing
              </label>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Automatically rebalance portfolio based on target allocations
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tradingParameters.autoRebalance}
                onChange={(e) => handleTradingParameterChange('autoRebalance', e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex items-start">
          <AlertTriangle size={20} className={`mr-3 mt-0.5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
          <div>
            <h4 className={`font-medium ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`}>
              Risk Warning
            </h4>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
              These settings directly affect your trading risk. Higher position sizes and leverage increase both potential profits and losses. Always ensure your risk tolerance aligns with these parameters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Notification Channels
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Mail size={20} className={`mr-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <div>
                <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email Notifications
                </label>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Receive notifications via email
                </p>
              </div>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) => handleNotificationChange('email', e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Smartphone size={20} className={`mr-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <div>
                <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Push Notifications
                </label>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Receive push notifications on your device
                </p>
              </div>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.push}
                onChange={(e) => handleNotificationChange('push', e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Alert Types
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Price Alerts
              </label>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Get notified when stock prices hit your target levels
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.priceAlerts}
                onChange={(e) => handleNotificationChange('priceAlerts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Trade Executions
              </label>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Notifications when trades are executed
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.tradeExecutions}
                onChange={(e) => handleNotificationChange('tradeExecutions', e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Market News
              </label>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Breaking news and market updates
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.marketNews}
                onChange={(e) => handleNotificationChange('marketNews', e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Weekly Reports
              </label>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Weekly portfolio performance summaries
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.weeklyReports}
                onChange={(e) => handleNotificationChange('weeklyReports', e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Account Security
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Two-Factor Authentication
              </label>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Add an extra layer of security to your account
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-sm ${security.twoFactorEnabled ? 'text-emerald-500' : 'text-gray-500'}`}>
                {security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={security.twoFactorEnabled}
                  onChange={(e) => handleSecurityChange('twoFactorEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Login Alerts
              </label>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Get notified of new login attempts
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={security.loginAlerts}
                onChange={(e) => handleSecurityChange('loginAlerts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Session Timeout (minutes)
            </label>
            <select
              value={security.sessionTimeout}
              onChange={(e) => handleSecurityChange('sessionTimeout', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={480}>8 hours</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Password & Access
        </h3>
        <div className="space-y-4">
          <button className={`w-full px-4 py-3 rounded-md font-medium transition-colors text-left ${
            isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Lock size={20} className="mr-3" />
                <span>Change Password</span>
              </div>
              <span className="text-sm text-gray-500">Last changed 30 days ago</span>
            </div>
          </button>
          <button className={`w-full px-4 py-3 rounded-md font-medium transition-colors text-left ${
            isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center">
              <Download size={20} className="mr-3" />
              <span>Download Account Data</span>
            </div>
          </button>
        </div>
      </div>

      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
        <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>
          Danger Zone
        </h4>
        <p className={`text-sm mb-3 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
          These actions are irreversible. Please proceed with caution.
        </p>
        <button className={`px-4 py-2 rounded-md font-medium transition-colors ${
          isDarkMode ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
        }`}>
          <Trash2 size={16} className="mr-2 inline" />
          Delete Account
        </button>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Theme Preferences
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isDarkMode ? (
                <Moon size={20} className="mr-3 text-blue-400" />
              ) : (
                <Sun size={20} className="mr-3 text-yellow-500" />
              )}
              <div>
                <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Dark Mode
                </label>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Switch between light and dark themes
                </p>
              </div>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isDarkMode}
                onChange={toggleDarkMode}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Data & Storage
        </h3>
        <div className="space-y-4">
          <button className={`w-full px-4 py-3 rounded-md font-medium transition-colors text-left ${
            isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Download size={20} className="mr-3" />
                <span>Export Trading Data</span>
              </div>
              <span className="text-sm text-gray-500">CSV, JSON formats</span>
            </div>
          </button>
          <button className={`w-full px-4 py-3 rounded-md font-medium transition-colors text-left ${
            isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Upload size={20} className="mr-3" />
                <span>Import Strategy Settings</span>
              </div>
              <span className="text-sm text-gray-500">JSON format</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Settings
        </h1>
        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Manage your trading preferences, account settings, and platform configuration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <nav className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-2`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors mb-1 ${
                  activeTab === tab.id
                    ? isDarkMode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-100 text-emerald-700'
                    : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-3">
          <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            {activeTab === 'profile' && renderProfileSettings()}
            {activeTab === 'trading' && renderTradingSettings()}
            {activeTab === 'notifications' && renderNotificationSettings()}
            {activeTab === 'security' && renderSecuritySettings()}
            {activeTab === 'appearance' && renderAppearanceSettings()}

            <div className="flex justify-end mt-8 pt-6 border-t border-gray-700">
              <div className="flex space-x-3">
                <button className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}>
                  Reset to Defaults
                </button>
                {activeTab === 'profile' ? (
                  <button 
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className={`px-6 py-2 rounded-md font-medium transition-colors ${
                      isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Save size={16} className="mr-2 inline" />
                        Save Changes
                      </>
                    )}
                  </button>
                ) : (
                  <button className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}>
                    <Save size={16} className="mr-2 inline" />
                    Save Changes
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}