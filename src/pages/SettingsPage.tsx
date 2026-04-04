import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  User, Bell, Shield, TrendingUp, Moon, Sun,
  Smartphone, Mail, Lock, AlertTriangle, CheckCircle2,
  Settings as SettingsIcon, Download, Upload, Trash2,
  Eye, EyeOff, Save, RefreshCw, Info, Database,
  Key, LogOut, ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }

const useToasts = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
};

const ToastContainer: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed top-4 right-4 z-[200] space-y-2 pointer-events-none">
    {toasts.map(t => (
      <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border animate-slide-up ${
        t.type === 'success' ? 'bg-gray-800 border-emerald-500/40 text-emerald-400' :
        t.type === 'error'   ? 'bg-gray-800 border-red-500/40 text-red-400' :
                               'bg-gray-800 border-blue-500/40 text-blue-400'
      }`}>
        {t.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
        {t.message}
      </div>
    ))}
  </div>
);

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-4">
    <h3 className="text-base font-semibold text-white">{title}</h3>
    {children}
  </div>
);

// ─── Toggle row ───────────────────────────────────────────────────────────────
const ToggleRow: React.FC<{
  label: string; sub?: string;
  checked: boolean; onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}> = ({ label, sub, checked, onChange, icon }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-700/40 last:border-0">
    <div className="flex items-center gap-3">
      {icon && <span className="text-gray-400">{icon}</span>}
      <div>
        <p className="text-sm text-gray-200">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${checked ? 'bg-emerald-600' : 'bg-gray-600'}`}
    >
      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
);

// ─── Field ────────────────────────────────────────────────────────────────────
const Field: React.FC<{
  label: string; type?: string; value: string | number;
  onChange: (v: string) => void; min?: number; max?: number;
  step?: number; suffix?: string; readOnly?: boolean;
}> = ({ label, type = 'text', value, onChange, min, max, step, suffix, readOnly }) => (
  <div>
    <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        min={min} max={max} step={step}
        readOnly={readOnly}
        className={`flex-1 px-3 py-2 rounded-xl text-sm text-white border transition-colors focus:outline-none ${
          readOnly
            ? 'bg-gray-900/40 border-gray-700/40 text-gray-400 cursor-default'
            : 'bg-gray-800/60 border-gray-700/50 focus:border-emerald-500/50 focus:bg-gray-800'
        }`}
      />
      {suffix && <span className="text-xs text-gray-500 flex-shrink-0">{suffix}</span>}
    </div>
  </div>
);

const SelectField: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-xl text-sm text-white bg-gray-800/60 border border-gray-700/50 focus:border-emerald-500/50 focus:outline-none transition-colors"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ─── Notification preferences (stored in localStorage) ────────────────────────
const NOTIF_KEY = 'mp_notification_prefs';
const defaultNotifPrefs = {
  email: true, push: true, sms: false,
  priceAlerts: true, tradeExecutions: true, marketNews: false, weeklyReports: true,
};

// ─── Security settings (stored in localStorage) ───────────────────────────────
const SECURITY_KEY = 'mp_security_prefs';
const defaultSecurityPrefs = {
  twoFactorEnabled: false, sessionTimeout: 30, loginAlerts: true,
};

// ─── Appearance settings (stored in localStorage) ─────────────────────────────
const APPEARANCE_KEY = 'mp_appearance_prefs';
const defaultAppearancePrefs = {
  compactMode: false, showVolume: true, showSectorBadge: true,
  defaultChart: '1M' as string, language: 'en',
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export function SettingsPage() {
  const { isDarkMode, toggleDarkMode, tradingParameters, updateTradingParameters, userProfile, updateUserProfile } = useAppContext();
  const { signOut } = useAuth();
  const { toasts, show: showToast } = useToasts();
  const [activeTab, setActiveTab] = useState('profile');
  const [showApiKey, setShowApiKey] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [tradingLoading, setTradingLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Profile form state
  const [profile, setProfile] = useState({
    full_name: '', phone: '', risk_tolerance: 'Medium', experience_level: 'Beginner',
  });

  // Trading params form state (local copy for batch save)
  const [tradingLocal, setTradingLocal] = useState({ ...tradingParameters });

  // Notification prefs (localStorage)
  const [notifs, setNotifs] = useState(() => {
    try { return { ...defaultNotifPrefs, ...JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}') }; }
    catch { return defaultNotifPrefs; }
  });

  // Security prefs (localStorage)
  const [security, setSecurity] = useState(() => {
    try { return { ...defaultSecurityPrefs, ...JSON.parse(localStorage.getItem(SECURITY_KEY) || '{}') }; }
    catch { return defaultSecurityPrefs; }
  });

  // Appearance prefs (localStorage)
  const [appearance, setAppearance] = useState(() => {
    try { return { ...defaultAppearancePrefs, ...JSON.parse(localStorage.getItem(APPEARANCE_KEY) || '{}') }; }
    catch { return defaultAppearancePrefs; }
  });

  // Sync profile from context
  useEffect(() => {
    if (userProfile) {
      setProfile({
        full_name: userProfile.full_name || '',
        phone: userProfile.phone || '',
        risk_tolerance: userProfile.risk_tolerance || 'Medium',
        experience_level: userProfile.experience_level || 'Beginner',
      });
    }
  }, [userProfile]);

  // Sync trading params from context
  useEffect(() => {
    setTradingLocal({ ...tradingParameters });
  }, [tradingParameters]);

  // Save notification prefs immediately on change
  const updateNotif = (key: string, value: boolean) => {
    const next = { ...notifs, [key]: value };
    setNotifs(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    showToast('Notification preference saved', 'success');
  };

  // Save security prefs immediately on change
  const updateSecurity = (key: string, value: any) => {
    const next = { ...security, [key]: value };
    setSecurity(next);
    localStorage.setItem(SECURITY_KEY, JSON.stringify(next));
    showToast('Security setting saved', 'success');
  };

  // Save appearance prefs immediately on change
  const updateAppearance = (key: string, value: any) => {
    const next = { ...appearance, [key]: value };
    setAppearance(next);
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
    showToast('Appearance preference saved', 'success');
  };

  // Save profile to Supabase
  const saveProfile = async () => {
    setProfileLoading(true);
    try {
      await updateUserProfile(profile);
      showToast('Profile updated successfully', 'success');
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // Save trading params to Supabase
  const saveTradingParams = async () => {
    setTradingLoading(true);
    try {
      await updateTradingParameters(tradingLocal);
      showToast('Trading parameters saved', 'success');
    } catch {
      showToast('Failed to save trading parameters', 'error');
    } finally {
      setTradingLoading(false);
    }
  };

  // Export user data as JSON
  const exportData = () => {
    const data = {
      profile, tradingParameters: tradingLocal,
      notifications: notifs, security, appearance,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'marketpulse-settings.json';
    a.click(); URL.revokeObjectURL(url);
    showToast('Settings exported', 'success');
  };

  // Delete account
  const deleteAccount = async () => {
    try {
      const { error } = await supabase.auth.admin.deleteUser((await supabase.auth.getUser()).data.user?.id ?? '');
      if (error) throw error;
      await signOut();
    } catch {
      // fallback: just sign out and clear local data
      localStorage.clear();
      await signOut();
      showToast('Account data cleared. Contact support to fully delete your account.', 'info');
    }
    setDeleteConfirm(false);
  };

  const tabs = [
    { id: 'profile',       label: 'Profile',       icon: User },
    { id: 'trading',       label: 'Trading',        icon: TrendingUp },
    { id: 'notifications', label: 'Notifications',  icon: Bell },
    { id: 'security',      label: 'Security',       icon: Shield },
    { id: 'appearance',    label: 'Appearance',     icon: SettingsIcon },
    { id: 'data',          label: 'Data',           icon: Database },
  ];

  // ── Tab content renderers ──────────────────────────────────────────────────

  const renderProfile = () => (
    <div className="space-y-6">
      <Section title="Personal information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" value={profile.full_name} onChange={v => setProfile(p => ({ ...p, full_name: v }))} />
          <Field label="Phone number" type="tel" value={profile.phone} onChange={v => setProfile(p => ({ ...p, phone: v }))} />
          <SelectField label="Risk tolerance" value={profile.risk_tolerance} onChange={v => setProfile(p => ({ ...p, risk_tolerance: v }))}
            options={[{ value: 'Conservative', label: 'Conservative' }, { value: 'Medium', label: 'Medium' }, { value: 'Aggressive', label: 'Aggressive' }]} />
          <SelectField label="Trading experience" value={profile.experience_level} onChange={v => setProfile(p => ({ ...p, experience_level: v }))}
            options={[
              { value: 'Beginner', label: 'Beginner (0–1 years)' },
              { value: 'Intermediate', label: 'Intermediate (1–5 years)' },
              { value: 'Advanced', label: 'Advanced (5+ years)' },
              { value: 'Professional', label: 'Professional' },
            ]} />
        </div>
      </Section>

      <Section title="API configuration">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Finnhub API key</label>
            <div className="flex items-center gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                readOnly
                value={import.meta.env.VITE_FINNHUB_API_KEY ? '••••••••••••••••••••' : 'Not configured'}
                className="flex-1 px-3 py-2 rounded-xl text-sm text-gray-400 bg-gray-900/40 border border-gray-700/40 cursor-default"
              />
              <button onClick={() => setShowApiKey(v => !v)} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors">
                {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">Set in your .env file as VITE_FINNHUB_API_KEY</p>
          </div>
          <div className="rounded-xl bg-blue-900/20 border border-blue-500/20 p-3 flex gap-2">
            <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">API keys are configured via environment variables for security. Edit your .env file to update them, then restart the dev server.</p>
          </div>
        </div>
      </Section>

      <div className="flex justify-end pt-2">
        <button onClick={saveProfile} disabled={profileLoading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
          {profileLoading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          Save profile
        </button>
      </div>
    </div>
  );

  const renderTrading = () => (
    <div className="space-y-6">
      <Section title="Capital & position sizing">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Initial capital (₹)" type="number" value={tradingLocal.initialCapital}
            onChange={v => setTradingLocal(p => ({ ...p, initialCapital: Number(v) }))} min={1000} />
          <Field label="Position size" type="number" value={tradingLocal.positionSize}
            onChange={v => setTradingLocal(p => ({ ...p, positionSize: Number(v) }))} min={1} max={100} suffix="%" />
          <Field label="Max open positions" type="number" value={tradingLocal.maxOpenPositions}
            onChange={v => setTradingLocal(p => ({ ...p, maxOpenPositions: Number(v) }))} min={1} max={50} />
          <Field label="Commission per trade" type="number" value={10} onChange={() => {}} readOnly suffix="₹" />
        </div>
      </Section>

      <Section title="Risk controls">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Stop loss" type="number" value={tradingLocal.stopLoss}
            onChange={v => setTradingLocal(p => ({ ...p, stopLoss: Number(v) }))} min={0.1} max={50} step={0.1} suffix="%" />
          <Field label="Take profit" type="number" value={tradingLocal.takeProfit}
            onChange={v => setTradingLocal(p => ({ ...p, takeProfit: Number(v) }))} min={0.1} max={200} step={0.1} suffix="%" />
        </div>
        <div className="mt-2 space-y-0">
          <ToggleRow label="Trailing stop loss" sub="Adjusts stop loss as price moves in your favour"
            checked={tradingLocal.trailingStop} onChange={v => setTradingLocal(p => ({ ...p, trailingStop: v }))} />
          <ToggleRow label="Auto rebalance" sub="Automatically rebalance portfolio to target allocations"
            checked={tradingLocal.autoRebalance} onChange={v => setTradingLocal(p => ({ ...p, autoRebalance: v }))} />
        </div>
      </Section>

      <div className="rounded-xl bg-amber-900/20 border border-amber-500/20 p-4 flex gap-3">
        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-300 leading-relaxed">
          <strong className="text-amber-200">Risk warning:</strong> These settings directly affect your simulated trading risk.
          Higher position sizes increase both potential profits and losses. The paper trading simulator uses these parameters.
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <button onClick={() => setTradingLocal({ initialCapital: 100000, positionSize: 10, maxOpenPositions: 5, stopLoss: 5, takeProfit: 15, trailingStop: false, autoRebalance: false })}
          className="px-4 py-2 rounded-xl bg-gray-700/50 text-gray-400 hover:text-white text-sm transition-colors">
          Reset to defaults
        </button>
        <button onClick={saveTradingParams} disabled={tradingLoading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
          {tradingLoading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          Save parameters
        </button>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <Section title="Delivery channels">
        <div className="rounded-xl bg-gray-800/40 border border-gray-700/40 px-4">
          <ToggleRow label="Email notifications" sub="Receive updates via email" icon={<Mail size={15} />}
            checked={notifs.email} onChange={v => updateNotif('email', v)} />
          <ToggleRow label="Push notifications" sub="Browser notifications when alerts trigger" icon={<Smartphone size={15} />}
            checked={notifs.push} onChange={v => updateNotif('push', v)} />
          <ToggleRow label="SMS alerts" sub="Text messages for critical events (premium)"
            checked={notifs.sms} onChange={v => updateNotif('sms', v)} />
        </div>
      </Section>

      <Section title="Alert types">
        <div className="rounded-xl bg-gray-800/40 border border-gray-700/40 px-4">
          <ToggleRow label="Price alerts" sub="Notify when watchlist stocks hit your target levels"
            checked={notifs.priceAlerts} onChange={v => updateNotif('priceAlerts', v)} />
          <ToggleRow label="Trade executions" sub="Notify when paper trades are placed"
            checked={notifs.tradeExecutions} onChange={v => updateNotif('tradeExecutions', v)} />
          <ToggleRow label="Market news" sub="Breaking news and major market events"
            checked={notifs.marketNews} onChange={v => updateNotif('marketNews', v)} />
          <ToggleRow label="Weekly portfolio report" sub="Sunday evening summary of your performance"
            checked={notifs.weeklyReports} onChange={v => updateNotif('weeklyReports', v)} />
        </div>
      </Section>

      <div className="rounded-xl bg-blue-900/20 border border-blue-500/20 p-3 flex gap-2">
        <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300">Preferences are saved automatically and stored locally. Push notifications require browser permission — click the notification icon in your browser address bar to enable.</p>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <Section title="Account security">
        <div className="rounded-xl bg-gray-800/40 border border-gray-700/40 px-4">
          <ToggleRow label="Two-factor authentication" sub="Adds an extra layer of security (via Supabase Auth)"
            checked={security.twoFactorEnabled} onChange={v => updateSecurity('twoFactorEnabled', v)} />
          <ToggleRow label="Login notifications" sub="Email alert whenever your account is accessed"
            checked={security.loginAlerts} onChange={v => updateSecurity('loginAlerts', v)} />
        </div>
      </Section>

      <Section title="Session">
        <SelectField label="Session timeout" value={String(security.sessionTimeout)} onChange={v => updateSecurity('sessionTimeout', Number(v))}
          options={[
            { value: '15', label: '15 minutes' }, { value: '30', label: '30 minutes' },
            { value: '60', label: '1 hour' }, { value: '120', label: '2 hours' },
            { value: '480', label: '8 hours' },
          ]} />
      </Section>

      <Section title="Password">
        <div className="space-y-2">
          <button onClick={async () => {
            const { data } = await supabase.auth.getUser();
            if (data.user?.email) {
              await supabase.auth.resetPasswordForEmail(data.user.email);
              showToast('Password reset email sent', 'success');
            }
          }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/50 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
            <Lock size={15} />
            Send password reset email
            <ChevronRight size={14} className="ml-auto" />
          </button>
          <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/50 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
            <LogOut size={15} />
            Sign out of all devices
            <ChevronRight size={14} className="ml-auto" />
          </button>
        </div>
      </Section>

      <Section title="Danger zone">
        {!deleteConfirm ? (
          <button onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-900/20 border border-red-500/20 text-red-400 hover:bg-red-900/40 text-sm font-medium transition-colors">
            <Trash2 size={14} />
            Delete account
          </button>
        ) : (
          <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-4 space-y-3">
            <p className="text-sm text-red-300 font-medium">Are you sure? This is irreversible.</p>
            <p className="text-xs text-red-400">Your portfolio, predictions, and all data will be permanently deleted.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 text-sm hover:bg-gray-600 transition-colors">Cancel</button>
              <button onClick={deleteAccount} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors">Delete permanently</button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );

  const renderAppearance = () => (
    <div className="space-y-6">
      <Section title="Theme">
        <div className="rounded-xl bg-gray-800/40 border border-gray-700/40 px-4">
          <ToggleRow label="Dark mode" sub="Switch between light and dark themes"
            icon={isDarkMode ? <Moon size={15} /> : <Sun size={15} />}
            checked={isDarkMode} onChange={() => { toggleDarkMode(); showToast('Theme updated', 'success'); }} />
          <ToggleRow label="Compact mode" sub="Reduce spacing for more information density"
            checked={appearance.compactMode} onChange={v => updateAppearance('compactMode', v)} />
        </div>
      </Section>

      <Section title="Stock list display">
        <div className="rounded-xl bg-gray-800/40 border border-gray-700/40 px-4">
          <ToggleRow label="Show volume" sub="Display trading volume in stock lists"
            checked={appearance.showVolume} onChange={v => updateAppearance('showVolume', v)} />
          <ToggleRow label="Show sector badge" sub="Display sector labels on stock cards"
            checked={appearance.showSectorBadge} onChange={v => updateAppearance('showSectorBadge', v)} />
        </div>
      </Section>

      <Section title="Chart defaults">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Default chart period" value={appearance.defaultChart} onChange={v => updateAppearance('defaultChart', v)}
            options={[
              { value: '1W', label: '1 Week' }, { value: '1M', label: '1 Month' },
              { value: '3M', label: '3 Months' }, { value: '6M', label: '6 Months' },
              { value: '1Y', label: '1 Year' },
            ]} />
          <SelectField label="Language" value={appearance.language} onChange={v => updateAppearance('language', v)}
            options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' }]} />
        </div>
      </Section>
    </div>
  );

  const renderData = () => (
    <div className="space-y-6">
      <Section title="Export your data">
        <div className="space-y-2">
          <button onClick={exportData}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/50 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
            <Download size={15} className="text-emerald-400" />
            <div className="text-left">
              <p>Export all settings (JSON)</p>
              <p className="text-xs text-gray-500 mt-0.5">Profile, trading params, notification preferences</p>
            </div>
            <ChevronRight size={14} className="ml-auto" />
          </button>
          <button onClick={() => {
            const strategies = localStorage.getItem('mp_strategies') || '[]';
            const blob = new Blob([strategies], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'marketpulse-strategies.json';
            a.click(); URL.revokeObjectURL(url);
            showToast('Strategies exported', 'success');
          }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/50 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
            <Download size={15} className="text-violet-400" />
            <div className="text-left">
              <p>Export saved strategies (JSON)</p>
              <p className="text-xs text-gray-500 mt-0.5">All custom algorithms from the Algo Editor</p>
            </div>
            <ChevronRight size={14} className="ml-auto" />
          </button>
        </div>
      </Section>

      <Section title="Import settings">
        <label className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/50 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer">
          <Upload size={15} className="text-blue-400" />
          <div>
            <p>Import strategies (JSON)</p>
            <p className="text-xs text-gray-500 mt-0.5">Previously exported strategy file</p>
          </div>
          <input type="file" accept=".json" className="sr-only" onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
              try {
                const data = JSON.parse(ev.target?.result as string);
                if (Array.isArray(data)) {
                  localStorage.setItem('mp_strategies', JSON.stringify(data));
                  showToast(`Imported ${data.length} strategies`, 'success');
                } else {
                  showToast('Invalid file format', 'error');
                }
              } catch { showToast('Failed to parse file', 'error'); }
            };
            reader.readAsText(file);
          }} />
        </label>
      </Section>

      <Section title="Clear local data">
        <div className="rounded-xl bg-gray-800/40 border border-gray-700/40 p-4 space-y-3">
          <p className="text-xs text-gray-400">These actions clear data stored in your browser only — your Supabase account data is not affected.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => {
              localStorage.removeItem('mp_paper_portfolio');
              showToast('Paper trading data cleared', 'success');
            }} className="px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-500/20 text-red-400 hover:bg-red-900/40 text-xs font-medium transition-colors">
              Clear paper trading
            </button>
            <button onClick={() => {
              localStorage.removeItem('mp_price_alerts');
              showToast('Alerts cleared', 'success');
            }} className="px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-500/20 text-red-400 hover:bg-red-900/40 text-xs font-medium transition-colors">
              Clear price alerts
            </button>
            <button onClick={() => {
              localStorage.removeItem('mp_strategies');
              showToast('Saved strategies cleared', 'success');
            }} className="px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-500/20 text-red-400 hover:bg-red-900/40 text-xs font-medium transition-colors">
              Clear strategies
            </button>
          </div>
        </div>
      </Section>

      <Section title="About">
        <div className="rounded-xl bg-gray-800/40 border border-gray-700/40 p-4 space-y-2 text-xs text-gray-400">
          <div className="flex justify-between"><span>Version</span><span className="text-white">0.1.0</span></div>
          <div className="flex justify-between"><span>Data provider (primary)</span><span className="text-white">Finnhub</span></div>
          <div className="flex justify-between"><span>Data provider (fallback)</span><span className="text-white">Yahoo Finance</span></div>
          <div className="flex justify-between"><span>Database</span><span className="text-white">Supabase (PostgreSQL)</span></div>
          <div className="flex justify-between"><span>News sentiment</span><span className="text-white">NewsData.io</span></div>
          <div className="flex justify-between"><span>Broker integration</span><span className="text-white">Zerodha Kite</span></div>
        </div>
      </Section>
    </div>
  );

  const contentMap: Record<string, React.ReactNode> = {
    profile: renderProfile(),
    trading: renderTrading(),
    notifications: renderNotifications(),
    security: renderSecurity(),
    appearance: renderAppearance(),
    data: renderData(),
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>Settings</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your account, trading preferences, and platform configuration</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar nav */}
          <div className="lg:col-span-1">
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-2 space-y-0.5">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/40'
                    }`}>
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-6">
              {contentMap[activeTab]}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
