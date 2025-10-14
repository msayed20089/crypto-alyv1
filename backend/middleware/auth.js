const jwt = require('jsonwebtoken');
const db = require('../config/database');

// middleware المصادقة
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'مطلوب مصادقة'
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

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'الحساب موقوف'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token غير صالح'
    });
  }
};

// middleware التحقق من صلاحيات المدير
const isAdmin = async (req, res, next) => {
  try {
    // في هذا المثال، نفترض أن المستخدم الأول هو المدير
    // في التطبيق الحقيقي، يجب إضافة حقل is_admin في جدول المستخدمين
    if (req.user.id !== 1) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول'
      });
    }
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'خطأ في الصلاحيات'
    });
  }
};

module.exports = { authenticate, isAdmin };