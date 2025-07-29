-- ALALIZ.COM Trading Platform Database Schema
-- Advanced Trading Platform - Empowering Your Investment Journey
-- Create database (run this manually if needed)
-- CREATE DATABASE alaliz_trading_platform;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  role VARCHAR(20) DEFAULT 'trader',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolios table
CREATE TABLE portfolios (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  initial_balance DECIMAL(15,2) NOT NULL,
  current_balance DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Securities table
CREATE TABLE securities (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  exchange VARCHAR(50),
  sector VARCHAR(100),
  industry VARCHAR(100),
  security_type VARCHAR(20), -- 'stock', 'etf', 'crypto', etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Positions table
CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  security_id INTEGER REFERENCES securities(id) ON DELETE CASCADE,
  quantity DECIMAL(15,8) NOT NULL,
  average_cost DECIMAL(15,4) NOT NULL,
  current_price DECIMAL(15,4),
  market_value DECIMAL(15,2),
  unrealized_pnl DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(portfolio_id, security_id)
);

-- Orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  security_id INTEGER REFERENCES securities(id) ON DELETE CASCADE,
  order_type VARCHAR(20) NOT NULL, -- 'market', 'limit', 'stop', 'stop_limit'
  side VARCHAR(10) NOT NULL, -- 'buy', 'sell'
  quantity DECIMAL(15,8) NOT NULL,
  price DECIMAL(15,4),
  stop_price DECIMAL(15,4),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'filled', 'cancelled', 'rejected', 'partial'
  filled_quantity DECIMAL(15,8) DEFAULT 0,
  filled_price DECIMAL(15,4),
  time_in_force VARCHAR(10) DEFAULT 'DAY', -- 'DAY', 'GTC', 'IOC', 'FOK'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  executed_at TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  security_id INTEGER REFERENCES securities(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL, -- 'buy', 'sell', 'dividend', 'fee'
  quantity DECIMAL(15,8) NOT NULL,
  price DECIMAL(15,4) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  fee DECIMAL(15,2) DEFAULT 0,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market data table
CREATE TABLE market_data (
  id SERIAL PRIMARY KEY,
  security_id INTEGER REFERENCES securities(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,
  open_price DECIMAL(15,4),
  high_price DECIMAL(15,4),
  low_price DECIMAL(15,4),
  close_price DECIMAL(15,4),
  volume BIGINT,
  timeframe VARCHAR(10), -- '1m', '5m', '1h', '1d'
  UNIQUE(security_id, timestamp, timeframe)
);

-- Trading strategies table
CREATE TABLE trading_strategies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  strategy_type VARCHAR(50),
  parameters JSONB,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Watchlists table
CREATE TABLE watchlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist items table
CREATE TABLE watchlist_items (
  id SERIAL PRIMARY KEY,
  watchlist_id INTEGER REFERENCES watchlists(id) ON DELETE CASCADE,
  security_id INTEGER REFERENCES securities(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(watchlist_id, security_id)
);

-- Risk management rules table
CREATE TABLE risk_rules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  rule_type VARCHAR(50) NOT NULL, -- 'position_size', 'stop_loss', 'daily_loss_limit'
  parameters JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  security_id INTEGER REFERENCES securities(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'price_above', 'price_below', 'volume_spike'
  condition_value DECIMAL(15,4),
  is_triggered BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  triggered_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_positions_portfolio_id ON positions(portfolio_id);
CREATE INDEX idx_positions_security_id ON positions(security_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_portfolio_id ON orders(portfolio_id);
CREATE INDEX idx_orders_security_id ON orders(security_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_transactions_portfolio_id ON transactions(portfolio_id);
CREATE INDEX idx_transactions_executed_at ON transactions(executed_at);
CREATE INDEX idx_market_data_security_id ON market_data(security_id);
CREATE INDEX idx_market_data_timestamp ON market_data(timestamp);
CREATE INDEX idx_market_data_timeframe ON market_data(timeframe);
CREATE INDEX idx_securities_symbol ON securities(symbol);
CREATE INDEX idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id);
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_security_id ON alerts(security_id);

-- Create triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trading_strategies_updated_at BEFORE UPDATE ON trading_strategies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON watchlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risk_rules_updated_at BEFORE UPDATE ON risk_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();