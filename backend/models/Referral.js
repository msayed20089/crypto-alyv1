const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    referrer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    referredUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Referral Details
    tier: {
        type: String,
        required: true,
        enum: ['bronze', 'silver', 'gold', 'diamond'],
        default: 'bronze'
    },
    
    commissionRate: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    
    // Earnings
    totalEarnings: {
        type: Number,
        default: 0
    },
    
    pendingEarnings: {
        type: Number,
        default: 0
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Tracking
    signupDate: {
        type: Date,
        default: Date.now
    },
    
    firstTradeDate: Date,
    
    lastCommissionDate: Date,

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for referral duration
referralSchema.virtual('durationDays').get(function() {
    return Math.floor((Date.now() - this.signupDate) / (1000 * 60 * 60 * 24));
});

// Indexes
referralSchema.index({ referrer: 1, referredUser: 1 }, { unique: true });
referralSchema.index({ tier: 1 });
referralSchema.index({ isActive: 1 });
referralSchema.index({ signupDate: 1 });

// Static method to calculate commission
referralSchema.statics.calculateCommission = function(profitAmount, tier) {
    const commissionRates = {
        'bronze': 2.5,
        'silver': 4.0,
        'gold': 6.5,
        'diamond': 9.0
    };
    
    const rate = commissionRates[tier] || 2.5;
    return (profitAmount * rate) / 100;
};

// Static method to get referrer's total earnings
referralSchema.statics.getReferrerEarnings = async function(referrerId) {
    const result = await this.aggregate([
        { $match: { referrer: referrerId } },
        {
            $group: {
                _id: null,
                totalEarnings: { $sum: '$totalEarnings' },
                pendingEarnings: { $sum: '$pendingEarnings' },
                referralCount: { $sum: 1 },
                activeReferrals: {
                    $sum: { $cond: ['$isActive', 1, 0] }
                }
            }
        }
    ]);
    
    return result[0] || {
        totalEarnings: 0,
        pendingEarnings: 0,
        referralCount: 0,
        activeReferrals: 0
    };
};

// Static method to update referral tier
referralSchema.statics.updateReferralTier = async function(referrerId) {
    const referralCount = await this.countDocuments({ referrer: referrerId });
    
    let newTier = 'bronze';
    if (referralCount >= 100) newTier = 'diamond';
    else if (referralCount >= 60) newTier = 'gold';
    else if (referralCount >= 25) newTier = 'silver';
    
    // Update all active referrals for this referrer
    await this.updateMany(
        { referrer: referrerId, isActive: true },
        { 
            tier: newTier,
            commissionRate: this.calculateCommission(0, newTier) // Get rate for display
        }
    );
    
    // Update referrer's tier in User model
    const User = require('./User');
    await User.findByIdAndUpdate(referrerId, {
        'referral.referralTier': newTier
    });
    
    return newTier;
};

// Method to add commission
referralSchema.methods.addCommission = async function(profitAmount) {
    const commission = this.constructor.calculateCommission(profitAmount, this.tier);
    
    this.totalEarnings += commission;
    this.pendingEarnings += commission;
    this.lastCommissionDate = new Date();
    
    await this.save();
    
    // Create payment record
    const Payment = require('./Payment');
    await Payment.create({
        user: this.referrer,
        type: 'commission',
        amount: commission,
        status: 'pending',
        commission: {
            fromUser: this.referredUser,
            tier: this.tier,
            rate: this.commissionRate
        },
        description: `Commission from ${this.referredUser} - Tier: ${this.tier}`
    });
    
    return commission;
};

// Pre-save middleware to set commission rate based on tier
referralSchema.pre('save', function(next) {
    if (this.isModified('tier')) {
        this.commissionRate = this.constructor.calculateCommission(0, this.tier);
    }
    next();
});

module.exports = mongoose.model('Referral', referralSchema);