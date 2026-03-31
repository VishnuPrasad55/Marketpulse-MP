import { createClient } from '@supabase/supabase-js';

const supabaseUrlRaw = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKeyRaw = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseUrl = typeof supabaseUrlRaw === 'string' ? supabaseUrlRaw.trim() : '';
const supabaseAnonKey = typeof supabaseAnonKeyRaw === 'string' ? supabaseAnonKeyRaw.trim() : '';

const fallbackSupabaseUrl = 'https://czeyjzymjlvznbeopioy.supabase.co';

if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url') {
  console.warn('Supabase URL is placeholder/missing, using fallback URL:', fallbackSupabaseUrl);
  supabaseUrl = fallbackSupabaseUrl;
}

if (!supabaseAnonKey) {
  console.error('Supabase env:', { supabaseUrlRaw, supabaseAnonKeyRaw });
  throw new Error('Missing Supabase environment variable: VITE_SUPABASE_ANON_KEY is not set or is empty.');
}

console.log('Supabase config (runtime):', { supabaseUrl, supabaseAnonKey: '***' });

if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  throw new Error(`Invalid Supabase URL (must start with http:// or https://): ${supabaseUrl}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  risk_tolerance: string;
  experience_level: string;
  created_at: string;
  updated_at: string;
}

export interface UserStock {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  price: number;
  market: string;
  sector: string | null;
  selected_at: string;
}

export interface UserStrategy {
  id: string;
  user_id: string;
  strategy_id: string;
  strategy_name: string;
  parameters: Record<string, any>;
  selected_at: string;
}

export interface UserPrediction {
  id: string;
  user_id: string;
  stock_symbol: string;
  predicted_price: number;
  predicted_direction: string;
  confidence: number;
  prediction_date: string;
  target_date: string;
}

export interface UserPortfolio {
  id: string;
  user_id: string;
  stock_symbol: string;
  stock_name: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
  purchase_date: string;
  updated_at: string;
}

export interface TradingParametersDB {
  id: string;
  user_id: string;
  initial_capital: number;
  position_size: number;
  max_open_positions: number;
  stop_loss: number;
  take_profit: number;
  trailing_stop: boolean;
  auto_rebalance: boolean;
  updated_at: string;
}
