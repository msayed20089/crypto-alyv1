const express = require('express');
const db = require('../config/database');
const { authenticate, isAdmin } = require('../middleware/auth');
const router = express.Router();

// الحصول على إحصائيات المنصة
router.get('/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()) as new_today,
        (SELECT COUNT(*) FROM trades) as total_trades,
        (SELECT COUNT(*) FROM trades WHERE DATE(created_at) = CURDATE()) as today_trades,
        (SELECT COALESCE(SUM(total_profit), 0) FROM users) as total_platform_profit,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE type = 'profit' AND status = 'completed') as total_payouts
    `);

    const activeBots = await db.query(`
      SELECT COUNT(DISTINCT user_id) as active_bots 
      FROM trading_settings 
      WHERE is_active = true
    `);

    res.json({
      success: true,
      stats: {
        ...stats[0],
        ...activeBots[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات المنصة'
    });
  }
});

// الحصول على جميع المستخدمين
router.get('/users', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = 'WHERE username LIKE ? OR email LIKE ?';
      params = [`%${search}%`, `%${search}%`];
    }

    const users = await db.query(`
      SELECT id, username, email, membership_level, total_profit, 
             total_commissions, is_active, last_login, created_at
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const total = await db.query(`
      SELECT COUNT(*) as count FROM users ${whereClause}
    `, params);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0].count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المستخدمين'
    });
  }
});

// تحديث حالة المستخدم
router.put('/users/:id/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    await db.query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [is_active, id]
    );

    res.json({
      success: true,
      message: `تم ${is_active ? 'تفعيل' : 'إيقاف'} المستخدم بنجاح`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة المستخدم'
    });
  }
});

// الحصول على جميع الصفقات
router.get('/trades', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, user_id, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (user_id) {
      whereClause += ' AND t.user_id = ?';
      params.push(user_id);
    }

    if (status) {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }

    const trades = await db.query(`
      SELECT t.*, u.username, u.email, e.name as exchange_name
      FROM trades t
      JOIN users u ON t.user_id = u.id
      JOIN user_exchanges e ON t.exchange_id = e.id
      ${whereClause}
      ORDER BY t.created_at DESC 
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const total = await db.query(`
      SELECT COUNT(*) as count FROM trades t ${whereClause}
    `, params);

    res.json({
      success: true,
      trades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0].count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الصفقات'
    });
  }
});

// الحصول على المدفوعات
router.get('/payments', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const payments = await db.query(`
      SELECT p.*, u.username, u.email
      FROM payments p
      JOIN users u ON p.user_id = u.id
      ${whereClause}
      ORDER BY p.created_at DESC 
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const total = await db.query(`
      SELECT COUNT(*) as count FROM payments ${whereClause}
    `, params);

    res.json({
      success: true,
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0].count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المدفوعات'
    });
  }
});

// تحديث حالة الدفع
router.put('/payments/:id/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transaction_hash } = req.body;

    await db.query(
      'UPDATE payments SET status = ?, transaction_hash = ? WHERE id = ?',
      [status, transaction_hash, id]
    );

    res.json({
      success: true,
      message: 'تم تحديث حالة الدفع بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة الدفع'
    });
  }
});

// الحصول على إعدادات النظام
router.get('/settings', authenticate, isAdmin, async (req, res) => {
  try {
    const settings = await db.query('SELECT * FROM system_settings');
    
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = setting.setting_value;
    });

    res.json({
      success: true,
      settings: settingsObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إعدادات النظام'
    });
  }
});

// تحديث إعدادات النظام
router.put('/settings', authenticate, isAdmin, async (req, res) => {
  try {
    const { settings } = req.body;

    for (const [key, value] of Object.entries(settings)) {
      await db.query(`
        INSERT INTO system_settings (setting_key, setting_value) 
        VALUES (?, ?) 
        ON DUPLICATE KEY UPDATE setting_value = ?
      `, [key, value, value]);
    }

    res.json({
      success: true,
      message: 'تم تحديث إعدادات النظام بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث إعدادات النظام'
    });
  }
});

module.exports = router;