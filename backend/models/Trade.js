const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    exchange: {
        type: String,
        required: true,
        enum: ['binance', 'coinbase', 'bybit', 'kucoin', 'okx', 'gateio', 'bitget', 'kraken']
    },
    
    // Trade Details
    symbol: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    
    side: {
        type: String,
        required: true,
        enum: ['BUY', 'SELL'],
        uppercase: true
    },
    
    type: {
        type: String,
        required: true,
        enum: ['MARKET', 'LIMIT'],
        default: 'MARKET'
    },
    
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    
    price: {
        type: Number,
        required: true,
        min: 0
    },
    
    total: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Trade Status
    status: {
        type: String,
        required: true,
        enum: ['PENDING', 'FILLED', 'CANCELLED', 'REJECTED', 'PARTIALLY_FILLED'],
        default: 'PENDING'
    },
    
    filledQuantity: {
        type: Number,
        default: 0
    },
    
    averagePrice: {
        type: Number,
        default: 0
    },
    
    // Profit/Loss
    profitLoss: {
        type: Number,
        default: 0
    },
    
    profitLossPercentage: {
        type: Number,
        default: 0
    },
    
    closedAt: Date,
    
    // Trading Strategy
    strategy: {
        type: String,
        enum: ['RSI', 'MACD', 'BOLLINGER', 'FIBONACCI', 'COMBINATION', 'MANUAL'],
        default: 'COMBINATION'
    },
    
    signalStrength: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    
    // Risk Management
    stopLoss: {
        type: Number,
        required: true
    },
    
    takeProfit: {
        type: Number,
        required: true
    },
    
    trailingStop: {
        enabled: {
            type: Boolean,
            default: false
        },
        activationPrice: Number,
        callbackRate: Number
    },
    
    // Exchange Response
    exchangeOrderId: String,
    
    clientOrderId: String,
    
    exchangeResponse: mongoose.Schema.Types.Mixed,
    
    // Error Handling
    error: {
        code: String,
        message: String,
        timestamp: Date
    },
    
    // Analytics
    executionTime: {
        type: Number, // in milliseconds
        default: 0
    },
    
    slippage: {
        type: Number,
        default: 0
    },
    
    fees: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for isProfitable
tradeSchema.virtual('isProfitable').get(function() {
    return this.profitLoss > 0;
});

// Virtual for duration
tradeSchema.virtual('duration').get(function() {
    if (!this.closedAt) return null;
    return this.closedAt - this.createdAt;
});

// Indexes for better query performance
tradeSchema.index({ user: 1, createdAt: -1 });
tradeSchema.index({ symbol: 1, createdAt: -1 });
tradeSchema.index({ status: 1 });
tradeSchema.index({ createdAt: 1 });
tradeSchema.index({ 'profitLoss': -1 });

// Static method to get user's trading statistics
tradeSchema.statics.getUserStats = async function(userId) {
    const stats = await this.aggregate([
        { $match: { user: mongoose.Types.ObjectId(userId), status: 'FILLED' } },
        {
            $group: {
                _id: null,
                totalTrades: { $sum: 1 },
                profitableTrades: {
                    $sum: { $cond: [{ $gt: ['$profitLoss', 0] }, 1, 0] }
                },
                totalProfit: { $sum: '$profitLoss' },
                totalVolume: { $sum: '$total' },
                averageProfit: { $avg: '$profitLoss' },
                bestTrade: { $max: '$profitLoss' },
                worstTrade: { $min: '$profitLoss' }
            }
        }
    ]);
    
    return stats[0] || {
        totalTrades: 0,
        profitableTrades: 0,
        totalProfit: 0,
        totalVolume: 0,
        averageProfit: 0,
        bestTrade: 0,
        worstTrade: 0
    };
};

// Static method to get daily performance
tradeSchema.statics.getDailyPerformance = async function(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await this.aggregate([
        {
            $match: {
                user: mongoose.Types.ObjectId(userId),
                status: 'FILLED',
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt'
                    }
                },
                dailyProfit: { $sum: '$profitLoss' },
                tradeCount: { $sum: 1 },
                volume: { $sum: '$total' }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

// Method to calculate PnL percentage
tradeSchema.methods.calculatePnLPercentage = function(entryPrice, exitPrice, side) {
    if (side === 'BUY') {
        return ((exitPrice - entryPrice) / entryPrice) * 100;
    } else {
        return ((entryPrice - exitPrice) / entryPrice) * 100;
    }
};

// Pre-save middleware to calculate PnL percentage
tradeSchema.pre('save', function(next) {
    if (this.profitLoss !== 0 && this.total > 0) {
        this.profitLossPercentage = (this.profitLoss / this.total) * 100;
    }
    next();
});

module.exports = mongoose.model('Trade', tradeSchema);