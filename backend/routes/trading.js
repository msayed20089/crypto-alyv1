const express = require('express');
const Trade = require('../models/Trade');
const Exchange = require('../models/Exchange');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.protect);

// @desc    Get all trades
// @route   GET /api/trading/trades
// @access  Private
router.get('/trades', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            symbol, 
            status, 
            side,
            startDate,
            endDate 
        } = req.query;

        const filter = { user: req.user.id };
        
        if (symbol) filter.symbol = symbol.toUpperCase();
        if (status) filter.status = status.toUpperCase();
        if (side) filter.side = side.toUpperCase();
        
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const trades = await Trade.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Trade.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                trades,
                pagination: {
                    current: page,
                    pages: Math.ceil(total / limit),
                    total
                }
            }
        });
    } catch (error) {
        console.error('Get Trades Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في جلب الصفقات'
        });
    }
});

// @desc    Get single trade
// @route   GET /api/trading/trades/:id
// @access  Private
router.get('/trades/:id', async (req, res) => {
    try {
        const trade = await Trade.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!trade) {
            return res.status(404).json({
                success: false,
                message: '❌ الصفقة غير موجودة'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                trade
            }
        });
    } catch (error) {
        console.error('Get Trade Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في جلب الصفقة'
        });
    }
});

// @desc    Create new trade (Manual)
// @route   POST /api/trading/trades
// @access  Private
router.post('/trades', async (req, res) => {
    try {
        const {
            exchange,
            symbol,
            side,
            type,
            quantity,
            price,
            stopLoss,
            takeProfit
        } = req.body;

        // Validation
        if (!exchange || !symbol || !side || !quantity) {
            return res.status(400).json({
                success: false,
                message: '❌ الحقول الإلزامية: المنصة، الزوج، الاتجاه، الكمية'
            });
        }

        // Check if exchange is connected
        const userExchange = await Exchange.findOne({
            user: req.user.id,
            exchangeName: exchange,
            isConnected: true
        });

        if (!userExchange) {
            return res.status(400).json({
                success: false,
                message: '❌ المنصة غير متصلة أو غير مفعلة'
            });
        }

        // Create trade
        const trade = await Trade.create({
            user: req.user.id,
            exchange,
            symbol: symbol.toUpperCase(),
            side: side.toUpperCase(),
            type: type || 'MARKET',
            quantity,
            price: price || 0,
            stopLoss: stopLoss || 0,
            takeProfit: takeProfit || 0,
            total: quantity * (price || 0),
            strategy: 'MANUAL'
        });

        // Here you would integrate with actual exchange API
        // For demo, we'll simulate trade execution
        setTimeout(async () => {
            try {
                trade.status = 'FILLED';
                trade.filledQuantity = quantity;
                trade.averagePrice = price || (Math.random() * 1000 + 1000); // Random price for demo
                trade.profitLoss = calculateDemoProfitLoss(trade);
                trade.closedAt = new Date();
                trade.executionTime = Date.now() - trade.createdAt;
                
                await trade.save();

                // Update user statistics
                await updateUserStatistics(req.user.id, trade);

            } catch (updateError) {
                console.error('Trade Update Error:', updateError);
            }
        }, 2000);

        res.status(201).json({
            success: true,
            message: '✅ تم إنشاء الصفقة بنجاح',
            data: {
                trade
            }
        });
    } catch (error) {
        console.error('Create Trade Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في إنشاء الصفقة'
        });
    }
});

// @desc    Update trading settings
// @route   PUT /api/trading/settings
// @access  Private
router.put('/settings', async (req, res) => {
    try {
        const {
            profitTarget,
            stopLoss,
            tradeSize,
            autoStopLoss,
            maxConsecutiveLosses
        } = req.body;

        const User = require('../models/User');
        const user = await User.findById(req.user.id);

        // Update trading settings
        if (profitTarget !== undefined) user.tradingSettings.profitTarget = profitTarget;
        if (stopLoss !== undefined) user.tradingSettings.stopLoss = stopLoss;
        if (tradeSize !== undefined) user.tradingSettings.tradeSize = tradeSize;
        if (autoStopLoss !== undefined) user.tradingSettings.autoStopLoss = autoStopLoss;
        if (maxConsecutiveLosses !== undefined) user.tradingSettings.maxConsecutiveLosses = maxConsecutiveLosses;

        await user.save();

        res.status(200).json({
            success: true,
            message: '✅ تم تحديث إعدادات التداول بنجاح',
            data: {
                tradingSettings: user.tradingSettings
            }
        });
    } catch (error) {
        console.error('Update Settings Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في تحديث الإعدادات'
        });
    }
});

// @desc    Get trading analytics
// @route   GET /api/trading/analytics
// @access  Private
router.get('/analytics', async (req, res) => {
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

        const analytics = await getTradingAnalytics(userId, days);

        res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في جلب التحليلات'
        });
    }
});

// Helper functions
function calculateDemoProfitLoss(trade) {
    // Simulate profit/loss for demo
    const baseAmount = trade.quantity * trade.averagePrice;
    const randomFactor = (Math.random() - 0.3) * 0.1; // -3% to +7%
    return baseAmount * randomFactor;
}

async function updateUserStatistics(userId, trade) {
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    user.statistics.totalTrades += 1;
    user.statistics.totalProfit += trade.profitLoss;
    user.statistics.totalVolume += trade.total;
    
    if (trade.profitLoss > 0) {
        user.statistics.successfulTrades += 1;
    }
    
    user.statistics.lastTradeAt = new Date();
    await user.save();
}

async function getTradingAnalytics(userId, days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trades = await Trade.find({
        user: userId,
        status: 'FILLED',
        createdAt: { $gte: startDate }
    });

    // Calculate various analytics
    const totalTrades = trades.length;
    const profitableTrades = trades.filter(t => t.profitLoss > 0).length;
    const totalProfit = trades.reduce((sum, t) => sum + t.profitLoss, 0);
    const averageProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

    // Strategy performance
    const strategyPerformance = await Trade.aggregate([
        {
            $match: {
                user: userId,
                status: 'FILLED',
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$strategy',
                totalTrades: { $sum: 1 },
                profitableTrades: {
                    $sum: { $cond: [{ $gt: ['$profitLoss', 0] }, 1, 0] }
                },
                totalProfit: { $sum: '$profitLoss' },
                averageProfit: { $avg: '$profitLoss' }
            }
        }
    ]);

    // Symbol performance
    const symbolPerformance = await Trade.aggregate([
        {
            $match: {
                user: userId,
                status: 'FILLED',
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$symbol',
                totalTrades: { $sum: 1 },
                totalProfit: { $sum: '$profitLoss' },
                winRate: {
                    $avg: { $cond: [{ $gt: ['$profitLoss', 0] }, 1, 0] }
                }
            }
        },
        { $sort: { totalProfit: -1 } },
        { $limit: 10 }
    ]);

    return {
        overview: {
            totalTrades,
            profitableTrades,
            totalProfit,
            averageProfit,
            winRate,
            days
        },
        strategyPerformance,
        symbolPerformance,
        performanceByDay: await getPerformanceByDay(userId, days)
    };
}

async function getPerformanceByDay(userId, days) {
    return await Trade.aggregate([
        {
            $match: {
                user: userId,
                status: 'FILLED',
                createdAt: { 
                    $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
                }
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
                tradeCount: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
}

module.exports = router;