/*
  # Authentication and User Management Schema

  1. New Tables
    - `user_profiles`
      - `id` (uuid, references auth.users)
      - `full_name` (text)
      - `phone` (text)
      - `risk_tolerance` (text)
      - `experience_level` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_stocks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `symbol` (text)
      - `name` (text)
      - `price` (decimal)
      - `market` (text)
      - `sector` (text)
      - `selected_at` (timestamp)
    
    - `user_strategies`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `strategy_id` (text)
      - `strategy_name` (text)
      - `parameters` (jsonb)
      - `selected_at` (timestamp)
    
    - `user_predictions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `stock_symbol` (text)
      - `predicted_price` (decimal)
      - `predicted_direction` (text)
      - `confidence` (integer)
      - `prediction_date` (timestamp)
      - `target_date` (timestamp)
    
    - `user_portfolio`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `stock_symbol` (text)
      - `stock_name` (text)
      - `quantity` (integer)
      - `purchase_price` (decimal)
      - `current_price` (decimal)
      - `purchase_date` (timestamp)
      - `updated_at` (timestamp)
    
    - `trading_parameters`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `initial_capital` (decimal)
      - `position_size` (integer)
      - `max_open_positions` (integer)
      - `stop_loss` (decimal)
      - `take_profit` (decimal)
      - `trailing_stop` (boolean)
      - `auto_rebalance` (boolean)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  phone text,
  risk_tolerance text DEFAULT 'Medium',
  experience_level text DEFAULT 'Beginner',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- User Selected Stocks Table
CREATE TABLE IF NOT EXISTS user_stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  price decimal NOT NULL,
  market text NOT NULL,
  sector text,
  selected_at timestamptz DEFAULT now()
);

ALTER TABLE user_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own stocks"
  ON user_stocks
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- User Strategies Table
CREATE TABLE IF NOT EXISTS user_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  strategy_id text NOT NULL,
  strategy_name text NOT NULL,
  parameters jsonb DEFAULT '{}',
  selected_at timestamptz DEFAULT now()
);

ALTER TABLE user_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own strategies"
  ON user_strategies
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- User Predictions Table
CREATE TABLE IF NOT EXISTS user_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  stock_symbol text NOT NULL,
  predicted_price decimal NOT NULL,
  predicted_direction text NOT NULL,
  confidence integer NOT NULL,
  prediction_date timestamptz DEFAULT now(),
  target_date timestamptz NOT NULL
);

ALTER TABLE user_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own predictions"
  ON user_predictions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- User Portfolio Table
CREATE TABLE IF NOT EXISTS user_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  stock_symbol text NOT NULL,
  stock_name text NOT NULL,
  quantity integer NOT NULL,
  purchase_price decimal NOT NULL,
  current_price decimal NOT NULL,
  purchase_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own portfolio"
  ON user_portfolio
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Trading Parameters Table
CREATE TABLE IF NOT EXISTS trading_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  initial_capital decimal DEFAULT 100000,
  position_size integer DEFAULT 10,
  max_open_positions integer DEFAULT 5,
  stop_loss decimal DEFAULT 5,
  take_profit decimal DEFAULT 15,
  trailing_stop boolean DEFAULT false,
  auto_rebalance boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trading_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trading parameters"
  ON trading_parameters
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Function to handle user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  
  INSERT INTO trading_parameters (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_portfolio_updated_at
    BEFORE UPDATE ON user_portfolio
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_parameters_updated_at
    BEFORE UPDATE ON trading_parameters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();