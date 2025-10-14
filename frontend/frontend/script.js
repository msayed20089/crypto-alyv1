// ملف الجافاسكريبت الرئيسي
document.addEventListener('DOMContentLoaded', function() {
    // تغيير اللغة
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            changeLanguage(this.value);
        });
    }

    // التمرير السلس
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // تحديث الإحصائيات الحيوية
    updateLiveStats();
});

// وظيفة تغيير اللغة
function changeLanguage(lang) {
    const translations = {
        'ar': {
            'home': 'الرئيسية',
            'features': 'المميزات',
            'platforms': 'المنصات',
            'trading': 'نظام التداول',
            'referral': 'نظام العمولات',
            'login': 'تسجيل الدخول',
            'register': 'إنشاء حساب'
        },
        'en': {
            'home': 'Home',
            'features': 'Features',
            'platforms': 'Platforms',
            'trading': 'Trading System',
            'referral': 'Referral System',
            'login': 'Login',
            'register': 'Register'
        }
    };

    // تحديث النصوص في الصفحة
    Object.keys(translations[lang]).forEach(key => {
        const elements = document.querySelectorAll(`[data-translate="${key}"]`);
        elements.forEach(element => {
            element.textContent = translations[lang][key];
        });
    });

    // تغيير اتجاه الصفحة
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
}

// التمرير إلى قسم معين
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// فتح وإغلاق الموديلات
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function openRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
}

// إغلاق الموديل عند النقر خارجها
window.onclick = function(event) {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    
    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === registerModal) {
        closeRegisterModal();
    }
}

// تحديث الإحصائيات الحيوية
function updateLiveStats() {
    // محاكاة بيانات حية
    setInterval(() => {
        const stats = document.querySelectorAll('.stat h3');
        if (stats.length > 0) {
            // تحديث عدد المستخدمين
            const users = Math.floor(15000 + Math.random() * 100);
            stats[0].textContent = users.toLocaleString() + '+';
            
            // تحديث الأرباح
            const profits = (42 + Math.random() * 0.5).toFixed(1);
            stats[1].textContent = '$' + profits + 'M+';
        }
    }, 5000);
}

// محاكاة التداول الحي
function simulateLiveTrading() {
    const trades = [
        { coin: 'BTC/USDT', action: 'buy', profit: '+8.2%' },
        { coin: 'ETH/USDT', action: 'sell', profit: '+7.8%' },
        { coin: 'ADA/USDT', action: 'buy', profit: '+8.5%' },
        { coin: 'DOT/USDT', action: 'buy', profit: '+7.9%' },
        { coin: 'LINK/USDT', action: 'sell', profit: '+8.1%' }
    ];

    setInterval(() => {
        const previewContent = document.querySelector('.preview-content');
        if (previewContent) {
            const randomTrade = trades[Math.floor(Math.random() * trades.length)];
            const tradeElement = document.createElement('div');
            tradeElement.className = 'trade-item';
            tradeElement.innerHTML = `
                <span class="coin">${randomTrade.coin}</span>
                <span class="action ${randomTrade.action}">${randomTrade.action === 'buy' ? 'شراء' : 'بيع'}</span>
                <span class="profit">${randomTrade.profit}</span>
            `;
            
            previewContent.appendChild(tradeElement);
            
            // إزالة العناصر القديمة
            if (previewContent.children.length > 3) {
                previewContent.removeChild(previewContent.children[0]);
            }
        }
    }, 3000);
}

// تشغيل محاكاة التداول عند تحميل الصفحة
simulateLiveTrading();

// التحقق من النماذج
document.getElementById('loginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    // هنا سيتم إضافة منطق تسجيل الدخول
    alert('سيتم تنفيذ تسجيل الدخول قريباً');
});

document.getElementById('registerForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    // هنا سيتم إضافة منطق التسجيل
    alert('سيتم إنشاء الحساب قريباً');
});