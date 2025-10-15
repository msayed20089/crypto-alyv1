// Global Variables
let currentLanguage = 'ar';

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
    }, 1000);

    // Initialize language
    initializeLanguage();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Initialize trading animation
    initializeTradingAnimation();
});

// Language Management
function initializeLanguage() {
    const savedLanguage = localStorage.getItem('cryptopro-language');
    if (savedLanguage) {
        currentLanguage = savedLanguage;
        document.getElementById('languageSelector').value = savedLanguage;
    }
    applyLanguage(currentLanguage);
}

function applyLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('cryptopro-language', lang);
    
    // Update RTL/LTR direction
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    
    // Update content based on language
    updateContentForLanguage(lang);
}

function updateContentForLanguage(lang) {
    // This would be expanded with actual translation strings
    const translations = {
        ar: {
            // Arabic translations
        },
        en: {
            // English translations
        }
    };
    
    // Update all elements with data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
}

// Event Listeners
function initializeEventListeners() {
    // Language selector
    document.getElementById('languageSelector').addEventListener('change', function(e) {
        applyLanguage(e.target.value);
    });

    // Navigation smooth scroll
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

    // Form submissions
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
}

// Modal Functions
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

// Close modals when clicking outside
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

// Mobile Menu
function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
}

// Scroll to Section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Form Handlers
function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Simulate login process
    showNotification('جاري تسجيل الدخول...', 'info');
    
    setTimeout(() => {
        showNotification('تم تسجيل الدخول بنجاح!', 'success');
        closeLoginModal();
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    }, 2000);
}

function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Simulate registration process
    showNotification('جاري إنشاء الحساب...', 'info');
    
    setTimeout(() => {
        showNotification('تم إنشاء الحساب بنجاح!', 'success');
        closeRegisterModal();
    }, 2000);
}

// Trading Animation
function initializeTradingAnimation() {
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        // Simple trading chart animation
        chartContainer.innerHTML = `
            <div class="chart-line"></div>
            <div class="chart-points">
                <div class="point buy" style="bottom: 20%; left: 20%">🟢</div>
                <div class="point sell" style="bottom: 60%; left: 40%">🔴</div>
                <div class="point buy" style="bottom: 30%; left: 60%">🟢</div>
                <div class="point sell" style="bottom: 70%; left: 80%">🔴</div>
            </div>
        `;
    }
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${getNotificationIcon(type)} ${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 1002;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
}

function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || '#3b82f6';
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .chart-container {
        position: relative;
        width: 100%;
        height: 200px;
        background: linear-gradient(45deg, #1e293b, #334155);
        border-radius: 12px;
        overflow: hidden;
    }
    
    .chart-line {
        position: absolute;
        bottom: 50%;
        width: 100%;
        height: 2px;
        background: rgba(255,255,255,0.3);
    }
    
    .point {
        position: absolute;
        font-size: 1.2rem;
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
    }
`;
document.head.appendChild(style);

// Performance monitoring
window.addEventListener('load', function() {
    // Log performance metrics
    if ('performance' in window) {
        const perfData = performance.timing;
        const loadTime = perfData.loadEventEnd - perfData.navigationStart;
        console.log(`Page loaded in ${loadTime}ms`);
    }
});