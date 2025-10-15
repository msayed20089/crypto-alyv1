const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthMiddleware {
    // Protect routes - verify JWT token
    async protect(req, res, next) {
        try {
            let token;
            
            // Check for token in header
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                token = req.headers.authorization.split(' ')[1];
            }
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'غير مصرح بالوصول. يرجى تسجيل الدخول.'
                });
            }
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
            
            // Check if user still exists
            const user = await User.findById(decoded.id).select('+passwordChangedAt');
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'المستخدم لم يعد موجوداً.'
                });
            }
            
            // Check if user changed password after token was issued
            if (user.changedPasswordAfter(decoded.iat)) {
                return res.status(401).json({
                    success: false,
                    message: 'تم تغيير كلمة المرور مؤخراً. يرجى تسجيل الدخول مرة أخرى.'
                });
            }
            
            // Check if account is locked
            if (user.isLocked()) {
                return res.status(423).json({
                    success: false,
                    message: 'الحساب مؤقتاً مغلق due to too many login attempts.'
                });
            }
            
            // Grant access to protected route
            req.user = user;
            next();
            
        } catch (error) {
            console.error('Auth Middleware Error:', error);
            
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'رمز الدخول غير صالح.'
                });
            }
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'انتهت صلاحية رمز الدخول. يرجى تسجيل الدخول مرة أخرى.'
                });
            }
            
            return res.status(500).json({
                success: false,
                message: 'خطأ في المصادقة.'
            });
        }
    }
    
    // Grant access to specific roles
    restrictTo(...roles) {
        return (req, res, next) => {
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'ليس لديك الصلاحية للقيام بهذا الإجراء.'
                });
            }
            next();
        };
    }
    
    // Optional authentication (for public routes that can have authenticated users)
    async optional(req, res, next) {
        try {
            let token;
            
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                token = req.headers.authorization.split(' ')[1];
                
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
                const user = await User.findById(decoded.id);
                
                if (user && !user.changedPasswordAfter(decoded.iat)) {
                    req.user = user;
                }
            }
            
            next();
        } catch (error) {
            // Continue without user for optional auth
            next();
        }
    }
    
    // Check if user is verified
    async requireVerification(req, res, next) {
        if (!req.user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'يرجى تفعيل حسابك قبل الوصول إلى هذا المورد.'
            });
        }
        next();
    }
    
    // Check if user has active subscription
    async requireSubscription(req, res, next) {
        if (!req.user.subscription.isActive) {
            return res.status(403).json({
                success: false,
                message: 'يجب الاشتراك في إحدى الباقات للوصول إلى هذه الميزة.'
            });
        }
        next();
    }
    
    // Rate limiting for sensitive operations
    sensitiveOperationLimiter(req, res, next) {
        // This would integrate with a rate limiting library
        // For now, we'll implement a basic version
        
        const userLimits = req.user.operationLimits || {};
        const operation = req.path;
        const now = Date.now();
        
        if (userLimits[operation] && userLimits[operation] > now) {
            return res.status(429).json({
                success: false,
                message: 'Too many attempts. Please try again later.'
            });
        }
        
        // Set limit for next operation (5 minutes from now)
        userLimits[operation] = now + 5 * 60 * 1000;
        req.user.operationLimits = userLimits;
        
        next();
    }
}

module.exports = new AuthMiddleware();