const express = require('express');
const User = require('../models/User');
const Trade = require('../models/Trade');
const Exchange = require('../models/Exchange');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.protect);

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password -verificationToken -twoFactorSecret')
            .populate('referral.referredBy', 'fullName email');

        res.status(200).json({
            success: true,
            data: {
                user
            }
        });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في جلب بيانات الملف الشخصي'
        });
    }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', async (req, res) => {
    try {
        const { fullName, phone, tradingSettings } = req.body;

        // Fields that can be updated
        const allowedUpdates = {};
        if (fullName) allowedUpdates.fullName = fullName;
        if (phone) allowedUpdates.phone = phone;
        if (tradingSettings) allowedUpdates.tradingSettings = tradingSettings;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            allowedUpdates,
            {
                new: true,
                runValidators: true
            }
        ).select('-password -verificationToken -twoFactorSecret');

        res.status(200).json({
            success: true,
            message: '✅ تم تحديث الملف الشخصي بنجاح',
            data: {
                user
            }
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في تحديث الملف الشخصي'
        });
    }
});

// @desc    Get user dashboard data
// @route   GET /api/users/dashboard
// @access  Private
router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user with statistics
        const user = await User.findById(userId)
            .select('statistics tradingSettings referral subscription');

        // Get recent trades
        const recentTrades = await Trade.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('symbol side quantity price profitLoss status createdAt');

        // Get connected exchanges
        const exchanges = await Exchange.find({ user: userId, isConnected: true })
            .select('exchangeName isConnected balances tradingSettings.tradingEnabled');

        // Get trading statistics
        const tradeStats = await Trade.getUserStats(userId);
        const dailyPerformance = await Trade.getDailyPerformance(userId, 7);

        // Calculate today's profit
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayTrades = await Trade.find({
            user: userId,
            status: 'FILLED',
            createdAt: { $gte: today }
        });
        
        const todayProfit = todayTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);

        res.status(200).json({
            success: true,
            data: {
                user,
                stats: {
                    ...tradeStats,
                    todayProfit,
                    successRate: user.statistics.successRate
                },
                recentTrades,
                exchanges,
                dailyPerformance,
                overview: {
                    totalBalance: exchanges.reduce((sum, exchange) => 
                        sum + exchange.balances.reduce((balSum, balance) => 
                            balSum + balance.total, 0), 0),
                    activeTrades: recentTrades.filter(trade => 
                        trade.status === 'PENDING' || trade.status === 'PARTIALLY_FILLED').length,
                    referralCount: await User.countDocuments({ 'referral.referredBy': userId })
                }
            }
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في جلب بيانات اللوحة'
        });
    }
});

// @desc    Get user trading statistics
// @route   GET /api/users/statistics
// @access  Private
router.get('/statistics', async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = '30d' } = req.query;

        let days;
        switch (period) {
            case '7d': days = 7; break;
            case '30d': days = 30; break;
            case '90d': days = 90; break;
            default: days = 30;
        }

        const tradeStats = await Trade.getUserStats(userId);
        const dailyPerformance = await Trade.getDailyPerformance(userId, days);
        const monthlyPerformance = await getMonthlyPerformance(userId);

        // Get best and worst trades
        const bestTrade = await Trade.findOne({ user: userId })
            .sort({ profitLoss: -1 })
            .select('symbol side profitLoss profitLossPercentage createdAt');
        
        const worstTrade = await Trade.findOne({ user: userId })
            .sort({ profitLoss: 1 })
            .select('symbol side profitLoss profitLossPercentage createdAt');

        // Get most traded symbols
        const popularSymbols = await Trade.aggregate([
            { $match: { user: userId } },
            { $group: { _id: '$symbol', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: tradeStats,
                dailyPerformance,
                monthlyPerformance,
                bestTrade,
                worstTrade,
                popularSymbols,
                analytics: {
                    averageTradeDuration: await calculateAverageTradeDuration(userId),
                    winRate: tradeStats.totalTrades > 0 ? 
                        (tradeStats.profitableTrades / tradeStats.totalTrades) * 100 : 0,
                    profitFactor: await calculateProfitFactor(userId)
                }
            }
        });
    } catch (error) {
        console.error('Statistics Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في جلب الإحصائيات'
        });
    }
});

// @desc    Get user referral data
// @route   GET /api/users/referrals
// @access  Private
router.get('/referrals', async (req, res) => {
    try {
        const userId = req.user.id;

        // Get referred users
        const referredUsers = await User.find({ 'referral.referredBy': userId })
            .select('fullName email createdAt statistics.totalProfit referral.referralTier')
            .sort({ createdAt: -1 });

        // Calculate referral earnings
        const referralEarnings = referredUsers.reduce((sum, user) => 
            sum + (user.statistics.totalProfit || 0), 0);

        // Get user's referral tier and commission rate
        const user = await User.findById(userId).select('referral');
        const commissionRate = getCommissionRate(user.referral.referralTier);

        res.status(200).json({
            success: true,
            data: {
                referralCode: user.referral.code,
                referralTier: user.referral.referralTier,
                commissionRate,
                referredUsers,
                earnings: {
                    total: referralEarnings * commissionRate / 100,
                    potential: referralEarnings,
                    commissionRate
                },
                nextTier: getNextTierRequirements(user.referral.referralTier)
            }
        });
    } catch (error) {
        console.error('Referrals Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في جلب بيانات الإحالات'
        });
    }
});

// Helper functions
async function getMonthlyPerformance(userId) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    return await Trade.aggregate([
        {
            $match: {
                user: userId,
                status: 'FILLED',
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                },
                monthlyProfit: { $sum: '$profitLoss' },
                tradeCount: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
}

async function calculateAverageTradeDuration(userId) {
    const result = await Trade.aggregate([
        {
            $match: {
                user: userId,
                status: 'FILLED',
                closedAt: { $exists: true }
            }
        },
        {
            $group: {
                _id: null,
                avgDuration: { $avg: { $subtract: ['$closedAt', '$createdAt'] } }
            }
        }
    ]);
    
    return result[0]?.avgDuration || 0;
}

async function calculateProfitFactor(userId) {
    const result = await Trade.aggregate([
        {
            $match: {
                user: userId,
                status: 'FILLED'
            }
        },
        {
            $group: {
                _id: null,
                totalProfit: {
                    $sum: {
                        $cond: [{ $gt: ['$profitLoss', 0] }, '$profitLoss', 0]
                    }
                },
                totalLoss: {
                    $sum: {
                        $cond: [{ $lt: ['$profitLoss', 0] }, '$profitLoss', 0]
                    }
                }
            }
        }
    ]);
    
    if (result[0] && result[0].totalLoss !== 0) {
        return Math.abs(result[0].totalProfit / result[0].totalLoss);
    }
    
    return result[0]?.totalProfit > 0 ? Infinity : 0;
}

function getCommissionRate(tier) {
    const rates = {
        'bronze': 2.5,
        'silver': 4.0,
        'gold': 6.5,
        'diamond': 9.0
    };
    return rates[tier] || 2.5;
}

function getNextTierRequirements(currentTier) {
    const requirements = {
        'bronze': { invites: 25, tier: 'silver' },
        'silver': { invites: 60, tier: 'gold' },
        'gold': { invites: 100, tier: 'diamond' },
        'diamond': null
    };
    return requirements[currentTier];
}

module.exports = router;