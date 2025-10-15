const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Payment Details
    type: {
        type: String,
        required: true,
        enum: ['subscription', 'withdrawal', 'commission', 'refund', 'profit_share']
    },
    
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    
    // Payment Status
    status: {
        type: String,
        required: true,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    
    // Subscription Details (if applicable)
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'premium', 'vip']
        },
        period: {
            type: String,
            enum: ['monthly', 'quarterly', 'yearly']
        },
        startDate: Date,
        endDate: Date
    },
    
    // Withdrawal Details (if applicable)
    withdrawal: {
        method: {
            type: String,
            enum: ['bank_transfer', 'crypto', 'paypal', 'credit_card']
        },
        walletAddress: String,
        bankDetails: {
            accountNumber: String,
            bankName: String,
            swiftCode: String
        },
        network: String // For crypto withdrawals
    },
    
    // Commission Details (if applicable)
    commission: {
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        tier: {
            type: String,
            enum: ['bronze', 'silver', 'gold', 'diamond']
        },
        rate: {
            type: Number,
            min: 0,
            max: 100
        }
    },
    
    // Payment Gateway Details
    gateway: {
        name: {
            type: String,
            enum: ['stripe', 'paypal', 'coinbase', 'binance', 'manual']
        },
        transactionId: String,
        paymentMethod: String,
        gatewayResponse: mongoose.Schema.Types.Mixed
    },
    
    // Automatic Profit Share (20% every 4 days)
    profitShare: {
        periodStart: Date,
        periodEnd: Date,
        totalProfit: Number,
        shareAmount: Number, // 20% of totalProfit
        tradesCount: Number
    },
    
    // Metadata
    description: String,
    
    metadata: mongoose.Schema.Types.Mixed,
    
    // Timestamps
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    failureReason: String

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for isProcessed
paymentSchema.virtual('isProcessed').get(function() {
    return this.status === 'completed' || this.status === 'processing';
});

// Virtual for display amount
paymentSchema.virtual('displayAmount').get(function() {
    return `${this.amount} ${this.currency}`;
});

// Indexes for better query performance
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ createdAt: 1 });
paymentSchema.index({ 'gateway.transactionId': 1 });

// Static method to get user's payment statistics
paymentSchema.statics.getUserStats = async function(userId) {
    const stats = await this.aggregate([
        { $match: { user: mongoose.Types.ObjectId(userId), status: 'completed' } },
        {
            $group: {
                _id: '$type',
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);
    
    return stats.reduce((acc, stat) => {
        acc[stat._id] = {
            totalAmount: stat.totalAmount,
            count: stat.count
        };
        return acc;
    }, {});
};

// Static method to calculate total platform revenue
paymentSchema.statics.getPlatformRevenue = async function(startDate, endDate) {
    const match = { status: 'completed' };
    
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(endDate);
    }
    
    const result = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$amount' },
                paymentCount: { $sum: 1 }
            }
        }
    ]);
    
    return result[0] || { totalRevenue: 0, paymentCount: 0 };
};

// Static method to get pending withdrawals
paymentSchema.statics.getPendingWithdrawals = async function() {
    return await this.find({
        type: 'withdrawal',
        status: { $in: ['pending', 'processing'] }
    })
    .populate('user', 'fullName email')
    .sort({ createdAt: 1 });
};

// Method to process payment
paymentSchema.methods.processPayment = async function() {
    try {
        this.status = 'processing';
        this.processedAt = new Date();
        await this.save();
        
        // Simulate payment processing
        // In real application, integrate with payment gateway
        
        // For demo, 90% success rate
        const isSuccessful = Math.random() > 0.1;
        
        if (isSuccessful) {
            this.status = 'completed';
            this.completedAt = new Date();
            
            // If this is a subscription payment, update user's subscription
            if (this.type === 'subscription') {
                const User = require('./User');
                await User.findByIdAndUpdate(this.user, {
                    'subscription.plan': this.subscription.plan,
                    'subscription.isActive': true,
                    'subscription.expiresAt': this.subscription.endDate
                });
            }
            
        } else {
            this.status = 'failed';
            this.failedAt = new Date();
            this.failureReason = 'Payment processing failed';
        }
        
        await this.save();
        return { success: isSuccessful, payment: this };
        
    } catch (error) {
        this.status = 'failed';
        this.failedAt = new Date();
        this.failureReason = error.message;
        await this.save();
        
        return { success: false, error: error.message };
    }
};

// Pre-save middleware for profit share calculations
paymentSchema.pre('save', function(next) {
    if (this.type === 'profit_share' && this.profitShare) {
        this.description = `Profit Share - ${this.profitShare.periodStart.toDateString()} to ${this.profitShare.periodEnd.toDateString()}`;
    }
    
    if (this.type === 'commission' && this.commission) {
        this.description = `Commission - Tier: ${this.commission.tier} (${this.commission.rate}%)`;
    }
    
    next();
});

module.exports = mongoose.model('Payment', paymentSchema);