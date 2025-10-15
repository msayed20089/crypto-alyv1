const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Basic Information
    fullName: {
        type: String,
        required: [true, 'الاسم الكامل مطلوب'],
        trim: true,
        maxlength: [100, 'الاسم لا يمكن أن يزيد عن 100 حرف']
    },
    
    email: {
        type: String,
        required: [true, 'البريد الإلكتروني مطلوب'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'البريد الإلكتروني غير صالح']
    },
    
    password: {
        type: String,
        required: [true, 'كلمة المرور مطلوبة'],
        minlength: [6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'],
        select: false
    },
    
    phone: {
        type: String,
        trim: true
    },

    // Account Status
    isActive: {
        type: Boolean,
        default: true
    },
    
    isVerified: {
        type: Boolean,
        default: false
    },
    
    verificationToken: String,
    
    // Trading Settings
    tradingSettings: {
        profitTarget: {
            type: Number,
            default: 8,
            min: 1,
            max: 20
        },
        stopLoss: {
            type: Number,
            default: 5,
            min: 1,
            max: 10
        },
        tradeSize: {
            type: Number,
            default: 20,
            min: 5,
            max: 50
        },
        autoStopLoss: {
            type: Boolean,
            default: true
        },
        maxConsecutiveLosses: {
            type: Number,
            default: 3,
            min: 1,
            max: 10
        }
    },

    // Subscription & Payments
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'premium', 'vip'],
            default: 'free'
        },
        expiresAt: Date,
        isActive: {
            type: Boolean,
            default: false
        }
    },

    balance: {
        type: Number,
        default: 0
    },

    // Referral System
    referral: {
        code: {
            type: String,
            unique: true,
            sparse: true
        },
        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        referralTier: {
            type: String,
            enum: ['bronze', 'silver', 'gold', 'diamond'],
            default: 'bronze'
        },
        totalEarnings: {
            type: Number,
            default: 0
        }
    },

    // Statistics
    statistics: {
        totalTrades: {
            type: Number,
            default: 0
        },
        successfulTrades: {
            type: Number,
            default: 0
        },
        totalProfit: {
            type: Number,
            default: 0
        },
        totalVolume: {
            type: Number,
            default: 0
        },
        lastTradeAt: Date
    },

    // Security
    loginAttempts: {
        type: Number,
        default: 0
    },
    
    lockUntil: Date,
    
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    
    twoFactorSecret: String,

    // Timestamps
    lastLoginAt: Date,
    
    passwordChangedAt: Date

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for success rate
userSchema.virtual('statistics.successRate').get(function() {
    if (this.statistics.totalTrades === 0) return 0;
    return (this.statistics.successfulTrades / this.statistics.totalTrades) * 100;
});

// Virtual for referral count
userSchema.virtual('referralCount', {
    ref: 'User',
    localField: '_id',
    foreignField: 'referral.referredBy',
    count: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ 'referral.code': 1 });
userSchema.index({ 'subscription.expiresAt': 1 });
userSchema.index({ createdAt: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware for password change timestamp
userSchema.pre('save', function(next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

// Method to check password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Method to check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// Method to check if account is locked
userSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to generate referral code
userSchema.methods.generateReferralCode = function() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'CP-';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Static method to find by referral code
userSchema.statics.findByReferralCode = function(code) {
    return this.findOne({ 'referral.code': code });
};

// Static method to get leaderboard
userSchema.statics.getLeaderboard = function(limit = 10) {
    return this.find({ 'statistics.totalTrades': { $gt: 0 } })
        .sort({ 'statistics.totalProfit': -1 })
        .limit(limit)
        .select('fullName statistics.totalProfit statistics.successRate referral.referralTier');
};

module.exports = mongoose.model('User', userSchema);