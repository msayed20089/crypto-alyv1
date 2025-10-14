const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// إعدادات الاتصال بقاعدة البيانات
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'cryptopro_user',
  password: process.env.DB_PASSWORD || 'secure_password_123',
  database: process.env.DB_NAME || 'cryptopro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// إنشاء pool للاتصال
const pool = mysql.createPool(dbConfig);

// وظائف قاعدة البيانات
const db = {
  // الحصول على اتصال
  async getConnection() {
    return await pool.getConnection();
  },

  // تنفيذ استعلام
  async query(sql, params) {
    try {
      const [results] = await pool.execute(sql, params);
      return results;
    } catch (error) {
      console.error('خطأ في قاعدة البيانات:', error);
      throw error;
    }
  },

  // بدء transaction
  async beginTransaction() {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    return connection;
  },

  // تأكيد transaction
  async commit(connection) {
    await connection.commit();
    connection.release();
  },

  // تراجع عن transaction
  async rollback(connection) {
    await connection.rollback();
    connection.release();
  }
};

// وظائف المستخدمين
db.users = {
  // إنشاء مستخدم جديد
  async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const sql = `
      INSERT INTO users (username, email, password_hash, phone, country, referral_code, referred_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await db.query(sql, [
      userData.username,
      userData.email,
      hashedPassword,
      userData.phone,
      userData.country,
      referralCode,
      userData.referredBy || null
    ]);
    
    return result.insertId;
  },

  // البحث عن مستخدم بالبريد الإلكتروني
  async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const users = await db.query(sql, [email]);
    return users[0];
  },

  // البحث عن مستخدم بمعرف
  async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const users = await db.query(sql, [id]);
    return users[0];
  },

  // تحديث بيانات المستخدم
  async update(id, updateData) {
    const allowedFields = ['username', 'phone', 'country', 'membership_level'];
    const fields = Object.keys(updateData).filter(field => allowedFields.includes(field));
    
    if (fields.length === 0) return;
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updateData[field]);
    values.push(id);
    
    const sql = `UPDATE users SET ${setClause} WHERE id = ?`;
    await db.query(sql, values);
  }
};

// وظائف التداول
db.trading = {
  // إنشاء صفقة جديدة
  async create(tradeData) {
    const sql = `
      INSERT INTO trades (user_id, exchange_id, pair, type, amount, entry_price, stop_loss, take_profit, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await db.query(sql, [
      tradeData.user_id,
      tradeData.exchange_id,
      tradeData.pair,
      tradeData.type,
      tradeData.amount,
      tradeData.entry_price,
      tradeData.stop_loss,
      tradeData.take_profit,
      'active'
    ]);
    
    return result.insertId;
  },

  // تحديث حالة الصفقة
  async updateStatus(tradeId, status, exitPrice = null, profit = null) {
    const sql = `
      UPDATE trades 
      SET status = ?, exit_price = ?, profit = ?, closed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    await db.query(sql, [status, exitPrice, profit, tradeId]);
  },

  // الحصول على الصفقات النشطة لمستخدم
  async getActiveTrades(userId) {
    const sql = `
      SELECT t.*, e.name as exchange_name 
      FROM trades t 
      JOIN exchanges e ON t.exchange_id = e.id 
      WHERE t.user_id = ? AND t.status = 'active'
    `;
    
    return await db.query(sql, [userId]);
  },

  // الحصول على تاريخ الصفقات
  async getTradeHistory(userId, limit = 50) {
    const sql = `
      SELECT t.*, e.name as exchange_name 
      FROM trades t 
      JOIN exchanges e ON t.exchange_id = e.id 
      WHERE t.user_id = ? 
      ORDER BY t.created_at DESC 
      LIMIT ?
    `;
    
    return await db.query(sql, [userId, limit]);
  }
};

// وظائف الحسابات المتصلة
db.exchanges = {
  // ربط حساب تبادل
  async connect(userId, exchangeData) {
    const sql = `
      INSERT INTO user_exchanges (user_id, exchange_id, api_key, api_secret, is_active)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    // تشفير API keys
    const CryptoJS = require('crypto-js');
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default_encryption_key';
    
    const encryptedApiKey = CryptoJS.AES.encrypt(exchangeData.api_key, encryptionKey).toString();
    const encryptedApiSecret = CryptoJS.AES.encrypt(exchangeData.api_secret, encryptionKey).toString();
    
    await db.query(sql, [
      userId,
      exchangeData.exchange_id,
      encryptedApiKey,
      encryptedApiSecret,
      true
    ]);
  },

  // الحصول على الحسابات المتصلة لمستخدم
  async getConnectedExchanges(userId) {
    const sql = `
      SELECT ue.*, e.name, e.logo 
      FROM user_exchanges ue 
      JOIN exchanges e ON ue.exchange_id = e.id 
      WHERE ue.user_id = ? AND ue.is_active = true
    `;
    
    return await db.query(sql, [userId]);
  }
};

// وظائف نظام العمولات
db.referrals = {
  // تسجيل إحالة جديدة
  async create(referrerId, referredId) {
    const sql = `
      INSERT INTO referrals (referrer_id, referred_id, level, commission_rate)
      VALUES (?, ?, 1, 2.5)
    `;
    
    await db.query(sql, [referrerId, referredId]);
  },

  // الحصول على إحالات المستخدم
  async getUserReferrals(userId) {
    const sql = `
      SELECT r.*, u.username as referred_username, u.created_at as referred_joined
      FROM referrals r 
      JOIN users u ON r.referred_id = u.id 
      WHERE r.referrer_id = ?
    `;
    
    return await db.query(sql, [userId]);
  },

  // حساب العمولات المستحقة
  async calculateCommissions(userId) {
    const sql = `
      SELECT SUM(t.profit * r.commission_rate / 100) as total_commissions
      FROM trades t 
      JOIN referrals r ON t.user_id = r.referred_id 
      WHERE r.referrer_id = ? AND t.status = 'closed' AND t.profit > 0
    `;
    
    const result = await db.query(sql, [userId]);
    return result[0]?.total_commissions || 0;
  }
};

module.exports = db;