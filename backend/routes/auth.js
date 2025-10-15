const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        success: false,
        message: '⏳ كثرة محاولات الدخول. يرجى المحاولة بعد 15 دقيقة.'
    }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 registrations per hour
    message: {
        success: false,
        message: '⏳ تم إنشاء العديد من الحسابات من هذا العنوان. يرجى المحاولة لاحقاً.'
    }
});

// Generate JWT Token
const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback-secret', {
        expiresIn: process.env.JWT_EXPIRES_IN || '30d'
    });
};

// Send token response
const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    
    // Remove password from output
    user.password = undefined;
    
    res.status(statusCode).json({
        success: true,
        token,
        data: {
            user
        }
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', registerLimiter, async (req, res) => {
    try {
        const { fullName, email, password, passwordConfirm, referralCode } = req.body;

        // Validation
        if (!fullName || !email || !password || !passwordConfirm) {
            return res.status(400).json({
                success: false,
                message: '❌ جميع الحقول مطلوبة'
            });
        }

        if (password !== passwordConfirm) {
            return res.status(400).json({
                success: false,
                message: '❌ كلمات المرور غير متطابقة'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: '❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '❌ هذا البريد الإلكتروني مسجل مسبقاً'
            });
        }

        // Handle referral
        let referredBy = null;
        if (referralCode) {
            const referrer = await User.findOne({ 'referral.code': referralCode });
            if (referrer) {
                referredBy = referrer._id;
            }
        }

        // Create user
        const newUser = await User.create({
            fullName,
            email,
            password,
            referral: {
                code: generateReferralCode(),
                referredBy
            }
        });

        // Generate referral code if not exists
        if (!newUser.referral.code) {
            newUser.referral.code = newUser.generateReferralCode();
            await newUser.save();
        }

        createSendToken(newUser, 201, res);

    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في إنشاء الحساب',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: '❌ البريد الإلكتروني وكلمة المرور مطلوبان'
            });
        }

        // Check if user exists and password is correct
        const user = await User.findOne({ email }).select('+password');
        
        if (!user || !(await user.correctPassword(password, user.password))) {
            // Increment login attempts
            user.loginAttempts += 1;
            
            // Lock account after 5 failed attempts for 30 minutes
            if (user.loginAttempts >= 5) {
                user.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
            }
            
            await user.save();
            
            return res.status(401).json({
                success: false,
                message: '❌ البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        // Check if account is locked
        if (user.isLocked()) {
            return res.status(423).json({
                success: false,
                message: '🔒 الحساب مغلق مؤقتاً due to too many failed attempts. Please try again later.'
            });
        }

        // Reset login attempts on successful login
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        user.lastLoginAt = new Date();
        await user.save();

        createSendToken(user, 200, res);

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في تسجيل الدخول',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authMiddleware.protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('referral.referredBy', 'fullName email');
        
        res.status(200).json({
            success: true,
            data: {
                user
            }
        });
    } catch (error) {
        console.error('Get User Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في جلب بيانات المستخدم'
        });
    }
});

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
router.put('/update-password', authMiddleware.protect, async (req, res) => {
    try {
        const { currentPassword, newPassword, newPasswordConfirm } = req.body;

        // Validation
        if (!currentPassword || !newPassword || !newPasswordConfirm) {
            return res.status(400).json({
                success: false,
                message: '❌ جميع الحقول مطلوبة'
            });
        }

        if (newPassword !== newPasswordConfirm) {
            return res.status(400).json({
                success: false,
                message: '❌ كلمات المرور غير متطابقة'
            });
        }

        // Get user with password
        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        if (!(await user.correctPassword(currentPassword, user.password))) {
            return res.status(401).json({
                success: false,
                message: '❌ كلمة المرور الحالية غير صحيحة'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        createSendToken(user, 200, res);

    } catch (error) {
        console.error('Update Password Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في تحديث كلمة المرور'
        });
    }
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: '❌ البريد الإلكتروني مطلوب'
            });
        }

        const user = await User.findOne({ email });
        
        if (!user) {
            // Don't reveal whether email exists
            return res.status(200).json({
                success: true,
                message: '✅ إذا كان البريد مسجلاً، سيصلك رابط إعادة التعيين'
            });
        }

        // Generate reset token (simplified for demo)
        const resetToken = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET + user.password,
            { expiresIn: '1h' }
        );

        // In real app, send email with reset link
        console.log('Password Reset Token:', resetToken);

        res.status(200).json({
            success: true,
            message: '✅ إذا كان البريد مسجلاً، سيصلك رابط إعادة التعيين'
        });

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في عملية إعادة تعيين كلمة المرور'
        });
    }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authMiddleware.protect, (req, res) => {
    // With JWT, logout is handled client-side by removing the token
    res.status(200).json({
        success: true,
        message: '✅ تم تسجيل الخروج بنجاح'
    });
});

// Helper function to generate referral code
function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'CP-';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

module.exports = router;