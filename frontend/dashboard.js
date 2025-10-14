// ملف الجافاسكريبت للوحة التحكم
document.addEventListener('DOMContentLoaded', function() {
    // تحديث الإحصائيات
    updateDashboardStats();
    
    // محاكاة التداول الحي
    simulateDashboardTrading();
    
    // إدارة ربط الحسابات
    setupExchangeConnection();
});

// تحديث إحصائيات اللوحة
function updateDashboardStats() {
    setInterval(() => {
        // تحديث رصيد الحساب
        const balance = (2450 + Math.random() * 50).toFixed(2);
        document.querySelector('.stat-card:nth-child(1) h3').textContent = '$' + balance;
        
        // تحديث أرباح اليوم
        const todayProfit = (1240 + Math.random() * 30).toFixed(2);
        document.querySelector('.stat-card:nth-child(2) h3').textContent = '$' + todayProfit;
        
        // تحديث عدد الصفقات
        const activeTrades = 18 + Math.floor(Math.random() * 3);
        document.querySelector('.stat-card:nth-child(3) h3').textContent = activeTrades;
        
        // تحديث متوسط الربح
        const avgProfit = (8.2 + Math.random() * 0.5).toFixed(1);
        document.querySelector('.stat-card:nth-child(4) h3').textContent = avgProfit + '%';
    }, 3000);
}

// محاكاة التداول في اللوحة
function simulateDashboardTrading() {
    const trades = [
        { pair: 'BTC/USDT', type: 'شراء', size: '0.1', entry: '$42,100', current: '$45,200', profit: '+8.2%', status: 'نشط' },
        { pair: 'ETH/USDT', type: 'بيع', size: '2.5', entry: '$2,850', current: '$2,620', profit: '+7.8%', status: 'نشط' },
        { pair: 'ADA/USDT', type: 'شراء', size: '1000', entry: '$0.48', current: '$0.52', profit: '+8.5%', status: 'نشط' },
        { pair: 'DOT/USDT', type: 'شراء', size: '50', entry: '$7.20', current: '$7.75', profit: '+7.9%', status: 'نشط' },
        { pair: 'LINK/USDT', type: 'بيع', size: '80', entry: '$18.50', current: '$17.20', profit: '+8.1%', status: 'نشط' }
    ];

    setInterval(() => {
        const tableBody = document.querySelector('.trades-table tbody');
        if (tableBody) {
            const randomTrade = trades[Math.floor(Math.random() * trades.length)];
            const newRow = document.createElement('tr');
            
            newRow.innerHTML = `
                <td>${randomTrade.pair}</td>
                <td>${randomTrade.type}</td>
                <td>${randomTrade.size}</td>
                <td>${randomTrade.entry}</td>
                <td>${randomTrade.current}</td>
                <td class="profit-positive">${randomTrade.profit}</td>
                <td>${randomTrade.status}</td>
            `;
            
            tableBody.appendChild(newRow);
            
            // إزالة الصفوف القديمة
            if (tableBody.children.length > 5) {
                tableBody.removeChild(tableBody.children[0]);
            }
        }
    }, 5000);
}

// إعداد ربط الحسابات
function setupExchangeConnection() {
    const connectBtn = document.querySelector('.api-form .btn-primary');
    if (connectBtn) {
        connectBtn.addEventListener('click', function() {
            const platform = document.querySelector('.api-form select').value;
            const apiKey = document.querySelector('.api-form input[placeholder="API Key"]').value;
            const apiSecret = document.querySelector('.api-form input[placeholder="API Secret"]').value;
            
            if (!platform || !apiKey || !apiSecret) {
                alert('يرجى ملء جميع الحقول');
                return;
            }
            
            // محاكاة ربط الحساب
            alert(`جارٍ ربط حساب ${platform}...`);
            
            // هنا سيتم إضافة منطق الربط الفعلي مع الخادم
            setTimeout(() => {
                alert('تم ربط الحساب بنجاح!');
            }, 2000);
        });
    }
}

// وظائف التحكم في التداول
function startTrading() {
    if (confirm('هل تريد بدء التداول الآلي؟')) {
        // محاكاة بدء التداول
        alert('تم بدء التداول الآلي بنجاح');
        
        // تحديث واجهة المستخدم
        document.querySelector('.btn-start').textContent = 'جارٍ التداول...';
        document.querySelector('.btn-start').style.background = '#00FFA3';
    }
}

function stopTrading() {
    if (confirm('هل تريد إيقاف التداول الآلي؟')) {
        // محاكاة إيقاف التداول
        alert('تم إيقاف التداول الآلي');
        
        // تحديث واجهة المستخدم
        document.querySelector('.btn-start').textContent = 'بدء التداول';
        document.querySelector('.btn-start').style.background = '';
    }
}

function openSettings() {
    alert('سيتم فتح إعدادات التداول قريباً');
}

function copyReferralLink() {
    const linkInput = document.querySelector('.referral-link input');
    linkInput.select();
    document.execCommand('copy');
    alert('تم نسخ رابط الدعوة');
}

function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        window.location.href = 'index.html';
    }
}

// إدارة التنقل في الشريط الجانبي
document.querySelectorAll('.sidebar-menu a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // إزالة النشاط من جميع الروابط
        document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
        
        // إضافة النشاط للرابط الحالي
        this.classList.add('active');
        
        // هنا يمكن إضافة منطق تحميل المحتوى الديناميكي
        const section = this.getAttribute('href').substring(1);
        loadSection(section);
    });
});

function loadSection(section) {
    // محاكاة تحميل المحتوى الديناميكي
    console.log('جارٍ تحميل قسم:', section);
    
    // هنا سيتم إضافة منطق تحميل المحتوى الفعلي
    const mainContent = document.querySelector('.main-content');
    // mainContent.innerHTML = ... محتوى القسم المطلوب
}