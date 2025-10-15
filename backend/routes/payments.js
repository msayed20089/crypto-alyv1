const express = require('express');
const Payment = require('../models/Payment');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(authMiddleware.protect);

// @desc    Get user payments
// @route   GET /api/payments
// @access  Private
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            type, 
            status,
            startDate,
            endDate 
        } = req.query;

        const filter = { user: req.user.id };
        
        if (type) filter.type = type;
        if (status) filter.status = status;
        
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const payments = await Payment.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Payment.countDocuments(filter);

        // Get payment statistics
        const stats = await Payment.getUserStats(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                payments,
                statistics: stats,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total
                }
            }
        });
    } catch (error) {
        console.error('Get Payments Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في جلب المدفوعات'
        });
    }
});

// @desc    Create withdrawal request
// @route   POST /api/payments/withdraw
// @access  Private
router.post('/withdraw', async (req, res) => {
    try {
        const { amount, method, walletAddress, bankDetails, network } = req.body;

        // Validation
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: '❌ المبلغ غير صالح'
            });
        }

        // Check user balance
        const user = await User.findById(req.user.id);
        if (user.balance < amount) {
            return res.status(400).json({
                success: false,
                message: '❌ الرصيد غير كافي'
            });
        }

        // Create withdrawal payment
        const payment = await Payment.create({
            user: req.user.id,
            type: 'withdrawal',
            amount: -amount, // Negative for withdrawals
            status: 'pending',
            withdrawal: {
                method,
                walletAddress,
                bankDetails,
                network
            },
            description: `طلب سحب ${amount} USD`
        });

        // Deduct from user balance
        user.balance -= amount;
        await user.save();

        res.status(201).json({
            success: true,
            message: '✅ تم إنشاء طلب السحب بنجاح',
            data: {
                payment
            }
        });
    } catch (error) {
        console.error('Withdrawal Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في إنشاء طلب السحب'
        });
    }
});

// @desc    Process profit share payout
// @route   POST /api/payments/profit-share
// @access  Private
router.post('/profit-share', authMiddleware.requireSubscription, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        // Calculate profit for the last 4 days
        const fourDaysAgo = new Date();
        fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
        
        const Trade = require('../models/Trade');
        const recentTrades = await Trade.find({
            user: req.user.id,
            status: 'FILLED',
            createdAt: { $gte: fourDaysAgo }
        });
        
        const totalProfit = recentTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
        
        if (totalProfit <= 0) {
            return res.status(400).json({
                success: false,
                message: '❌ لا توجد أرباح للتحويل في الفترة الماضية'
            });
        }
        
        const shareAmount = totalProfit * 0.2; // 20% platform share
        
        // Create profit share payment
        const payment = await Payment.create({
            user: req.user.id,
            type: 'profit_share',
            amount: -shareAmount, // Negative as it's paid to platform
            status: 'completed',
            profitShare: {
                periodStart: fourDaysAgo,
                periodEnd: new Date(),
                totalProfit: totalProfit,
                shareAmount: shareAmount,
                tradesCount: recentTrades.length
            },
            description: `حصص الأرباح - ${fourDaysAgo.toDateString()} إلى ${new Date().toDateString()}`
        });
        
        // Update user statistics
        user.balance -= shareAmount;
        await user.save();
        
        res.status(201).json({
            success: true,
            message: '✅ تم تحويل حصص الأرباح بنجاح',
            data: {
                payment,
                summary: {
                    totalProfit,
                    shareAmount,
                    tradesCount: recentTrades.length,
                    period: '4 أيام'
                }
            }
        });
        
    } catch (error) {
        console.error('Profit Share Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في معالجة حصص الأرباح'
        });
    }
});

// @desc    Get payment details
// @route   GET /api/payments/:id
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const payment = await Payment.findOne({
            _id: req.params.id,
            user: req.user.id
        });
        
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: '❌ المعاملة غير موجودة'
            });
        }
        
        res.status(200).json({
            success: true,
            data: {
                payment
            }
        });
    } catch (error) {
        console.error('Get Payment Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ خطأ في جلب تفاصيل المعاملة'
        });
    }
});

module.exports = router;