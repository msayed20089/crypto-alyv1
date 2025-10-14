const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// الحصول على إعدادات التداول
router.get('/settings', authenticate, async (req, res) => {
  try {
    const settings = await db.query(
      'SELECT * FROM trading_settings WHERE user_id = ?',
      [req.user.id]
    );
    
    res.json({
      success: true,
      settings: settings[0] || {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإعدادات'
    });
  }
});

// تحديث إعدادات التداول
router.put('/settings', authenticate, async (req, res) => {
  try {
    const {
      risk_per_trade,
      take_profit,
      stop_loss,
      move_to_break_even,
      break_even_trigger,
      max_daily_losses,
      is_active
    } = req.body;

    await db.query(
      `INSERT INTO trading_settings 
       (user_id, risk_per_trade, take_profit, stop_loss, move_to_break_even, break_even_trigger, max_daily_losses, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       risk_per_trade = VALUES(risk_per_trade),
       take_profit = VALUES(take_profit),
       stop_loss = VALUES(stop_loss),
       move_to_break_even = VALUES(move_to_break_even),
       break_even_trigger = VALUES(break_even_trigger),
       max_daily_losses = VALUES(max_daily_losses),
       is_active = VALUES(is_active)`,
      [
        req.user.id,
        risk_per_trade || 20,
        take_profit || 8,
        stop_loss || 5,
        move_to_break_even !== undefined ? move_to_break_even : true,
        break_even_trigger || 3,
        max_daily_losses || 3,
        is_active !== undefined ? is_active : true
      ]
    );

    res.json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الإعدادات'
    });
  }
});

// ربط حساب تبادل
router.post('/connect-exchange', authenticate, async (req, res) => {
  try {
    const { exchange_id, api_key, api_secret } = req.body;

    if (!exchange_id || !api_key || !api_secret) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة'
      });
    }

    await db.exchanges.connect(req.user.id, {
      exchange_id,
      api_key,
      api_secret
    });

    // تسجيل النشاط
    await db.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
      [req.user.id, 'EXCHANGE_CONNECT', `تم ربط حساب تبادل ${exchange_id}`]
    );

    res.json({
      success: true,
      message: 'تم ربط الحساب بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في ربط الحساب'
    });
  }
});

// الحصول على الحسابات المتصلة
router.get('/exchanges', authenticate, async (req, res) => {
  try {
    const exchanges = await db.exchanges.getConnectedExchanges(req.user.id);
    
    res.json({
      success: true,
      exchanges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الحسابات'
    });
  }
});

// بدء التداول الآلي
router.post('/start', authenticate, async (req, res) => {
  try {
    const settings = await db.query(
      'SELECT * FROM trading_settings WHERE user_id = ? AND is_active = true',
      [req.user.id]
    );

    if (!settings.length) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تفعيل إعدادات التداول أولاً'
      });
    }

    // هنا سيتم تفعيل البوت الفعلي
    // هذا مثال محاكاة

    res.json({
      success: true,
      message: 'تم بدء التداول الآلي بنجاح',
      botId: `BOT_${req.user.id}_${Date.now()}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في بدء التداول'
    });
  }
});

// إيقاف التداول الآلي
router.post('/stop', authenticate, async (req, res) => {
  try {
    // هنا سيتم إيقاف البوت الفعلي
    // هذا مثال محاكاة

    res.json({
      success: true,
      message: 'تم إيقاف التداول الآلي بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إيقاف التداول'
    });
  }
});

// الحصول على الصفقات النشطة
router.get('/active-trades', authenticate, async (req, res) => {
  try {
    const trades = await db.trading.getActiveTrades(req.user.id);
    
    res.json({
      success: true,
      trades
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الصفقات'
    });
  }
});

// الحصول على تاريخ الصفقات
router.get('/history', authenticate, async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const trades = await db.query(
      `SELECT t.*, e.name as exchange_name 
       FROM trades t 
       JOIN user_exchanges e ON t.exchange_id = e.id 
       WHERE t.user_id = ? 
       ORDER BY t.created_at DESC 
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), offset]
    );

    const total = await db.query(
      'SELECT COUNT(*) as count FROM trades WHERE user_id = ?',
      [req.user.id]
    );

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
      message: 'خطأ في جلب تاريخ الصفقات'
    });
  }
});

// الحصول على الإحصائيات
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_trades,
        SUM(CASE WHEN status = 'closed' AND profit > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN status = 'closed' AND profit < 0 THEN 1 ELSE 0 END) as losing_trades,
        COALESCE(SUM(profit), 0) as total_profit,
        COALESCE(AVG(profit_percentage), 0) as avg_profit_percentage
      FROM trades 
      WHERE user_id = ?
    `, [req.user.id]);

    const todayStats = await db.query(`
      SELECT 
        COUNT(*) as today_trades,
        COALESCE(SUM(profit), 0) as today_profit
      FROM trades 
      WHERE user_id = ? AND DATE(created_at) = CURDATE()
    `, [req.user.id]);

    res.json({
      success: true,
      stats: {
        ...stats[0],
        ...todayStats[0],
        win_rate: stats[0].total_trades > 0 ? 
          (stats[0].winning_trades / stats[0].total_trades * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات'
    });
  }
});

module.exports = router;