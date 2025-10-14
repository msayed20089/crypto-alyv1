const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const router = express.Router();

// تسجيل مستخدم جديد
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, phone, country, referralCode } = req.body;

    // التحقق من البيانات
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة'
      });
    }

    // التحقق من وجود المستخدم
    const existingUser = await db.users.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مسجل مسبقاً'
      });
    }

    // التحقق من كود الإحالة إذا موجود
    let referredBy = null;
    if (referralCode) {
      const referrer = await db.query('SELECT id FROM users WHERE referral_code = ?', [referralCode]);
      if (referrer.length > 0) {
        referredBy = referrer[0].id;
      }
    }

    // إنشاء المستخدم
    const userId = await db.users.create({
      username,
      email,
      password,
      phone,
      country,
      referredBy
    });

    // تسجيل الإحالة إذا كانت موجودة
    if (referredBy) {
      await db.referrals.create(referredBy, userId);
    }

    // إنشاء إعدادات التداول الافتراضية
    await db.query(
      'INSERT INTO trading_settings (user_id) VALUES (?)',
      [userId]
    );

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      userId
    });

  } catch (error) {
    console.error('خطأ في التسجيل:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الحساب'
    });
  }
});

// تسجيل الدخول
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
      });
    }

    // البحث عن المستخدم
    const user = await db.users.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // التحقق من كلمة المرور
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // تحديث آخر دخول
    await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    // إنشاء token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'cryptopro_secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        membershipLevel: user.membership_level
      }
    });

  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدخول'
    });
  }
});

// التحقق من token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token مطلوب'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cryptopro_secret_key');
    const user = await db.users.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        membershipLevel: user.membership_level
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token غير صالح'
    });
  }
});

module.exports = router;