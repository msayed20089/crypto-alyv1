-- CryptoPro Database Schema
-- MySQL/PostgreSQL Compatible

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT UUID(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    -- Account Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    
    -- Trading Settings (JSON)
    trading_settings JSON DEFAULT '{
        "profitTarget": 8,
        "stopLoss": 5,
        "tradeSize": 20,
        "autoStopLoss": true,
        "maxConsecutiveLosses": 3
    }',
    
    -- Subscription
    subscription_plan ENUM('free', 'premium', 'vip') DEFAULT 'free',
    subscription_active BOOLEAN DEFAULT FALSE,
    subscription_expires_at TIMESTAMP NULL,
    
    -- Balance
    balance DECIMAL(15, 8) DEFAULT 0,
    
    -- Referral System
    referral_code VARCHAR(20) UNIQUE,
    referred_by VARCHAR(36),
    referral_tier ENUM('bronze', 'silver', 'gold', 'diamond') DEFAULT 'bronze',
    referral_earnings DECIMAL(15, 8) DEFAULT 0,
    
    -- Statistics (JSON)
    statistics JSON DEFAULT '{
        "totalTrades": 0,
        "successfulTrades": 0,
        "totalProfit": 0,
        "totalVolume": 0
    }',
    
    -- Security
    login_attempts INT DEFAULT 0,
    lock_until TIMESTAMP NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    
    -- Timestamps
    last_login_at TIMESTAMP NULL,
    password_changed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_email (email),
    INDEX idx_referral_code (referral_code),
    INDEX idx_referred_by (referred_by),
    INDEX idx_created_at (created_at),
    INDEX idx_subscription (subscription_plan, subscription_active)
);

-- Exchanges Table
CREATE TABLE IF NOT EXISTS exchanges (
    id VARCHAR(36) PRIMARY KEY DEFAULT UUID(),
    user_id VARCHAR(36) NOT NULL,
    exchange_name ENUM('binance', 'coinbase', 'bybit', 'kucoin', 'okx', 'gateio', 'bitget', 'kraken') NOT NULL,
    
    -- Encrypted API Keys
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    passphrase TEXT,
    
    -- Connection Status
    is_connected BOOLEAN DEFAULT FALSE,
    last_connection_test TIMESTAMP NULL,
    connection_error TEXT,
    
    -- Trading Permissions (JSON)
    permissions JSON DEFAULT '{
        "spotTrading": false,
        "marginTrading": false,
        "futuresTrading": false,
        "withdrawal": false
    }',
    
    -- Trading Settings (JSON)
    trading_settings JSON DEFAULT '{
        "maxLeverage": 1,
        "defaultSymbols": [],
        "tradingEnabled": false,
        "dailyLossLimit": 0
    }',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMP NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    UNIQUE KEY unique_user_exchange (user_id, exchange_name),
    INDEX idx_is_connected (is_connected),
    INDEX idx_last_used (last_used)
);

-- Trades Table
CREATE TABLE IF NOT EXISTS trades (
    id VARCHAR(36) PRIMARY KEY DEFAULT UUID(),
    user_id VARCHAR(36) NOT NULL,
    exchange_name VARCHAR(50) NOT NULL,
    
    -- Trade Details
    symbol VARCHAR(20) NOT NULL,
    side ENUM('BUY', 'SELL') NOT NULL,
    type ENUM('MARKET', 'LIMIT') DEFAULT 'MARKET',
    quantity DECIMAL(15, 8) NOT NULL,
    price DECIMAL(15, 8) NOT NULL,
    total DECIMAL(15, 8) NOT NULL,
    
    -- Trade Status
    status ENUM('PENDING', 'FILLED', 'CANCELLED', 'REJECTED', 'PARTIALLY_FILLED') DEFAULT 'PENDING',
    filled_quantity DECIMAL(15, 8) DEFAULT 0,
    average_price DECIMAL(15, 8) DEFAULT 0,
    
    -- Profit/Loss
    profit_loss DECIMAL(15, 8) DEFAULT 0,
    profit_loss_percentage DECIMAL(8, 4) DEFAULT 0,
    closed_at TIMESTAMP NULL,
    
    -- Trading Strategy
    strategy ENUM('RSI', 'MACD', 'BOLLINGER', 'FIBONACCI', 'COMBINATION', 'MANUAL') DEFAULT 'COMBINATION',
    signal_strength DECIMAL(5, 2) DEFAULT 0,
    
    -- Risk Management
    stop_loss DECIMAL(15, 8) NOT NULL,
    take_profit DECIMAL(15, 8) NOT NULL,
    trailing_stop JSON,
    
    -- Exchange Response
    exchange_order_id VARCHAR(100),
    client_order_id VARCHAR(100),
    exchange_response JSON,
    
    -- Analytics
    execution_time INT DEFAULT 0, -- milliseconds
    slippage DECIMAL(8, 4) DEFAULT 0,
    fees DECIMAL(15, 8) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_symbol_created (symbol, created_at),
    INDEX idx_status (status),
    INDEX idx_profit_loss (profit_loss),
    INDEX idx_created_at (created_at)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY DEFAULT UUID(),
    user_id VARCHAR(36) NOT NULL,
    
    -- Payment Details
    type ENUM('subscription', 'withdrawal', 'commission', 'refund', 'profit_share') NOT NULL,
    amount DECIMAL(15, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Payment Status
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    
    -- Subscription Details (JSON)
    subscription_details JSON,
    
    -- Withdrawal Details (JSON)
    withdrawal_details JSON,
    
    -- Commission Details (JSON)
    commission_details JSON,
    
    -- Profit Share Details (JSON)
    profit_share_details JSON,
    
    -- Gateway Details (JSON)
    gateway_details JSON,
    
    -- Metadata
    description TEXT,
    metadata JSON,
    
    -- Timestamps
    processed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
);

-- Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
    id VARCHAR(36) PRIMARY KEY DEFAULT UUID(),
    referrer_id VARCHAR(36) NOT NULL,
    referred_user_id VARCHAR(36) NOT NULL,
    
    -- Referral Details
    tier ENUM('bronze', 'silver', 'gold', 'diamond') DEFAULT 'bronze',
    commission_rate DECIMAL(5, 2) NOT NULL,
    
    -- Earnings
    total_earnings DECIMAL(15, 8) DEFAULT 0,
    pending_earnings DECIMAL(15, 8) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Tracking
    signup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    first_trade_date TIMESTAMP NULL,
    last_commission_date TIMESTAMP NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    UNIQUE KEY unique_referral (referrer_id, referred_user_id),
    INDEX idx_tier (tier),
    INDEX idx_is_active (is_active),
    INDEX idx_signup_date (signup_date)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT UUID(),
    user_id VARCHAR(36) NOT NULL,
    
    -- Notification Details
    type ENUM('system', 'trade', 'payment', 'referral', 'security') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    
    -- Data (JSON)
    data JSON,
    
    -- Status
    read BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    
    -- Foreign Key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_read (user_id, read),
    INDEX idx_type (type),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at)
);

-- Admin Actions Table (Audit Log)
CREATE TABLE IF NOT EXISTS admin_actions (
    id VARCHAR(36) PRIMARY KEY DEFAULT UUID(),
    admin_id VARCHAR(36) NOT NULL,
    
    -- Action Details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(36),
    
    -- Changes (JSON)
    changes JSON,
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_admin_created (admin_id, created_at),
    INDEX idx_action (action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created_at (created_at)
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT UUID(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSON NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_setting_key (setting_key)
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description, is_public) VALUES
('platform.commission_rate', '20', 'Platform commission rate (percentage)', TRUE),
('referral.tiers', '{
    "bronze": {"invites": 10, "rate": 2.5},
    "silver": {"invites": 25, "rate": 4.0},
    "gold": {"invites": 60, "rate": 6.5},
    "diamond": {"invites": 100, "rate": 9.0}
}', 'Referral tier configuration', TRUE),
('trading.default_settings', '{
    "profitTarget": 8,
    "stopLoss": 5,
    "tradeSize": 20,
    "autoStopLoss": true
}', 'Default trading settings for new users', TRUE),
('profit_share.interval_days', '4', 'Profit share interval in days', TRUE),
('security.max_login_attempts', '5', 'Maximum login attempts before lock', FALSE),
('security.lock_duration_minutes', '30', 'Account lock duration in minutes', FALSE)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Create Views for Analytics

-- User Trading Performance View
CREATE OR REPLACE VIEW user_trading_performance AS
SELECT 
    u.id as user_id,
    u.full_name,
    u.email,
    COUNT(t.id) as total_trades,
    SUM(CASE WHEN t.profit_loss > 0 THEN 1 ELSE 0 END) as profitable_trades,
    SUM(t.profit_loss) as total_profit,
    AVG(t.profit_loss) as average_profit,
    (SUM(CASE WHEN t.profit_loss > 0 THEN 1 ELSE 0 END) / COUNT(t.id)) * 100 as win_rate
FROM users u
LEFT JOIN trades t ON u.id = t.user_id AND t.status = 'FILLED'
GROUP BY u.id, u.full_name, u.email;

-- Platform Daily Stats View
CREATE OR REPLACE VIEW platform_daily_stats AS
SELECT
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_trades,
    SUM(profit_loss) as daily_profit,
    AVG(profit_loss) as average_trade_profit
FROM trades
WHERE status = 'FILLED'
GROUP BY DATE(created_at);

-- Referral Earnings View
CREATE OR REPLACE VIEW referral_earnings_summary AS
SELECT
    r.referrer_id,
    u.full_name as referrer_name,
    COUNT(r.referred_user_id) as total_referrals,
    SUM(r.total_earnings) as total_earnings,
    r.tier
FROM referrals r
JOIN users u ON r.referrer_id = u.id
WHERE r.is_active = TRUE
GROUP BY r.referrer_id, u.full_name, r.tier;