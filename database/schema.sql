-- قاعدة بيانات CryptoPro

SET FOREIGN_KEY_CHECKS = 0;

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    country VARCHAR(50),
    referral_code VARCHAR(20) UNIQUE,
    referred_by INT,
    membership_level ENUM('bronze', 'silver', 'gold', 'diamond') DEFAULT 'bronze',
    total_profit DECIMAL(15, 2) DEFAULT 0.00,
    total_commissions DECIMAL(15, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
);

-- جدول المنصات المدعومة
CREATE TABLE IF NOT EXISTS exchanges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    logo VARCHAR(255),
    api_docs_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول حسابات المستخدمين المتصلة
CREATE TABLE IF NOT EXISTS user_exchanges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    exchange_id INT NOT NULL,
    api_key VARCHAR(500) NOT NULL,
    api_secret VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    last_sync TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_exchange (user_id, exchange_id)
);

-- جدول الصفقات
CREATE TABLE IF NOT EXISTS trades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    exchange_id INT NOT NULL,
    pair VARCHAR(20) NOT NULL,
    type ENUM('BUY', 'SELL') NOT NULL,
    amount DECIMAL(15, 8) NOT NULL,
    entry_price DECIMAL(15, 4) NOT NULL,
    current_price DECIMAL(15, 4),
    exit_price DECIMAL(15, 4),
    stop_loss DECIMAL(15, 4),
    take_profit DECIMAL(15, 4),
    profit DECIMAL(15, 4),
    profit_percentage DECIMAL(8, 4),
    status ENUM('pending', 'active', 'closed', 'cancelled') DEFAULT 'pending',
    closed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exchange_id) REFERENCES user_exchanges(id) ON DELETE CASCADE
);

-- جدول الإحالات
CREATE TABLE IF NOT EXISTS referrals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referrer_id INT NOT NULL,
    referred_id INT NOT NULL,
    level INT DEFAULT 1,
    commission_rate DECIMAL(5, 2) NOT NULL,
    total_earned DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_referral (referrer_id, referred_id)
);

-- جدول المدفوعات والعمولات
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('profit', 'commission', 'withdrawal') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    transaction_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- جدول إعدادات التداول
CREATE TABLE IF NOT EXISTS trading_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    risk_per_trade DECIMAL(5, 2) DEFAULT 20.00,
    take_profit DECIMAL(5, 2) DEFAULT 8.00,
    stop_loss DECIMAL(5, 2) DEFAULT 5.00,
    move_to_break_even BOOLEAN DEFAULT TRUE,
    break_even_trigger DECIMAL(5, 2) DEFAULT 3.00,
    max_daily_losses INT DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_settings (user_id)
);

-- جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- جدول سجل الأنشطة
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- جدول إعدادات النظام
CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- إدراج البيانات الأساسية
INSERT IGNORE INTO exchanges (id, name, logo, api_docs_url) VALUES
(1, 'Binance', 'binance.png', 'https://binance-docs.github.io/apidocs/spot/en/'),
(2, 'Coinbase', 'coinbase.png', 'https://docs.cloud.coinbase.com/'),
(3, 'Bybit', 'bybit.png', 'https://bybit-exchange.github.io/docs/'),
(4, 'KuCoin', 'kucoin.png', 'https://docs.kucoin.com/'),
(5, 'OKX', 'okx.png', 'https://www.okx.com/docs/'),
(6, 'Gate.io', 'gateio.png', 'https://www.gate.io/docs/'),
(7, 'Bitget', 'bitget.png', 'https://www.bitget.com/docs/'),
(8, 'Kraken', 'kraken.png', 'https://docs.kraken.com/');

-- إدراج الإعدادات الأساسية
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('platform_commission', '20', 'عمولة المنصة من أرباح المستخدمين'),
('min_deposit', '100', 'الحد الأدنى للإيداع'),
('max_daily_trades', '50', 'الحد الأقصى للصفقات اليومية'),
('maintenance_mode', 'false', 'وضع الصيانة'),
('registration_enabled', 'true', 'تفعيل التسجيل'),
('version', '1.0.0', 'إصدار المنصة');

-- إنشاء الفهرس لتحسين الأداء
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_trades_user_status ON trades(user_id, status);
CREATE INDEX idx_trades_created ON trades(created_at);
CREATE INDEX idx_payments_user_status ON payments(user_id, status);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

SET FOREIGN_KEY_CHECKS = 1;