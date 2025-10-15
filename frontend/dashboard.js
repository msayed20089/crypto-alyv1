// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    loadDashboardData();
});

function initializeDashboard() {
    // Initialize navigation
    initializeNavigation();
    
    // Initialize charts
    initializeCharts();
    
    // Load initial data
    loadInitialData();
}

function initializeNavigation() {
    // Sidebar navigation
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.dashboard-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Show corresponding section
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

function initializeCharts() {
    // Initialize trading chart
    const tradingChart = document.getElementById('tradingChart');
    if (tradingChart) {
        // Simple chart simulation
        tradingChart.innerHTML = `
            <div class="chart-placeholder">
                <div class="chart-bars">
                    ${Array.from({length: 12}, (_, i) => `
                        <div class="bar" style="height: ${30 + Math.random() * 70}%"></div>
                    `).join('')}
                </div>
                <div class="chart-labels">
                    ${Array.from({length: 12}, (_, i) => `
                        <span>${i + 1}</span>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Add chart styles
        const chartStyle = document.createElement('style');
        chartStyle.textContent = `
            .chart-placeholder {
                display: flex;
                align-items: end;
                height: 100%;
                gap: 8px;
                padding: 1rem;
            }
            
            .chart-bars {
                display: flex;
                align-items: end;
                gap: 8px;
                flex: 1;
                height: 80%;
            }
            
            .bar {
                flex: 1;
                background: var(--gradient);
                border-radius: 4px 4px 0 0;
                min-height: 10px;
                transition: height 0.3s ease;
            }
            
            .chart-labels {
                display: flex;
                justify-content: space-between;
                padding: 0 1rem;
            }
        `;
        document.head.appendChild(chartStyle);
    }
}

async function loadDashboardData() {
    try {
        // Simulate API call
        const dashboardData = await simulateAPICall('/api/dashboard');
        updateDashboardUI(dashboardData);
    } catch (error) {
        showNotification('❌ فشل في تحميل البيانات', 'error');
    }
}

function updateDashboardUI(data) {
    // Update stats cards
    if (data.stats) {
        updateStatsCards(data.stats);
    }
    
    // Update recent trades
    if (data.recentTrades) {
        updateRecentTrades(data.recentTrades);
    }
}

function updateStatsCards(stats) {
    // Update each stat card with real data
    const statElements = {
        totalProfit: document.querySelector('.stat-value'),
        activeTrades: document.querySelectorAll('.stat-value')[1],
        successRate: document.querySelectorAll('.stat-value')[2],
        referrals: document.querySelectorAll('.stat-value')[3]
    };
    
    // This would be updated with real data from API
}

function updateRecentTrades(trades) {
    const tradesTable = document.querySelector('.trades-table');
    if (tradesTable && trades.length > 0) {
        // Update trades table with real data
    }
}

function simulateAPICall(endpoint) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                stats: {
                    totalProfit: 12450,
                    activeTrades: 24,
                    successRate: 87.5,
                    referrals: 15
                },
                recentTrades: [
                    {
                        pair: "BTC/USDT",
                        type: "buy",
                        size: "0.05 BTC",
                        price: "$42,150",
                        profit: "+$420",
                        status: "completed"
                    }
                ]
            });
        }, 1000);
    });
}

function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        showNotification('🚪 جاري تسجيل الخروج...', 'info');
        
        setTimeout(() => {
            // Clear user data and redirect
            localStorage.removeItem('userToken');
            window.location.href = 'index.html';
        }, 1500);
    }
}

// Real-time updates
function startRealTimeUpdates() {
    // Simulate real-time data updates
    setInterval(() => {
        updateLiveData();
    }, 5000);
}

function updateLiveData() {
    // Update live data like active trades, prices, etc.
    const activeTradesElement = document.querySelectorAll('.stat-value')[1];
    if (activeTradesElement) {
        const currentTrades = parseInt(activeTradesElement.textContent);
        const newTrades = currentTrades + (Math.random() > 0.5 ? 1 : -1);
        activeTradesElement.textContent = Math.max(0, newTrades);
    }
}

// Initialize real-time updates when dashboard loads
startRealTimeUpdates();