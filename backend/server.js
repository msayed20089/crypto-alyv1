const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');
const path = require('path');

// استيراد المسارات
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tradingRoutes = require('./routes/trading');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');

const app = express();

// middleware الأمان
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// معدل الحد للطلبات
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100 // حد 100 طلب لكل IP
});
app.use(limiter);

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname, '../frontend')));

// المسارات
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// المسار الرئيسي
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// مسار لوحة التحكم
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// WebSocket للتداول الحي
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('عميل متصل WebSocket');
  
  // إرسال بيانات التداول الحي
  const sendLiveData = () => {
    const liveData = {
      type: 'trade_update',
      data: {
        timestamp: new Date().toISOString(),
        activeTrades: Math.floor(Math.random() * 20) + 10,
        totalProfit: (Math.random() * 1000 + 5000).toFixed(2),
        recentTrades: generateRandomTrades()
      }
    };
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(liveData));
    }
  };
  
  // إرسال بيانات كل 3 ثواني
  const interval = setInterval(sendLiveData, 3000);
  
  ws.on('close', () => {
    console.log('عميل منفصل WebSocket');
    clearInterval(interval);
  });
});

function generateRandomTrades() {
  const pairs = ['BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'DOT/USDT', 'LINK/USDT'];
  const types = ['BUY', 'SELL'];
  
  return Array.from({ length: 5 }, () => ({
    pair: pairs[Math.floor(Math.random() * pairs.length)],
    type: types[Math.floor(Math.random() * types.length)],
    amount: (Math.random() * 1).toFixed(4),
    price: (Math.random() * 50000 + 1000).toFixed(2),
    profit: (Math.random() * 10 - 2).toFixed(2)
  }));
}

// معالج الأخطاء
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'حدث خطأ في الخادم' 
  });
});

// معالج 404
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'الصفحة غير موجودة' 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🌐 الموقع: http://localhost:${PORT}`);
});

module.exports = app;