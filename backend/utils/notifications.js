const nodemailer = require('nodemailer');
const axios = require('axios');

class NotificationService {
    constructor() {
        this.transporter = null;
        this.setupEmailTransporter();
    }

    setupEmailTransporter() {
        if (process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER) {
            this.transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                secure: process.env.EMAIL_PORT == 465,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
        }
    }

    // Email Notifications
    async sendEmailNotification(to, subject, template, data = {}) {
        if (!this.transporter) {
            console.warn('⚠️  Email transporter not configured');
            return { success: false, error: 'Email not configured' };
        }

        try {
            const html = this.renderEmailTemplate(template, data);
            
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'CryptoPro <noreply@cryptopro.com>',
                to,
                subject,
                html,
                text: this.htmlToText(html)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email sent:', result.messageId);
            
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Email sending failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Trading Notifications
    async sendTradeNotification(user, trade, type) {
        const notifications = [];

        // Email notification
        if (user.notificationPreferences?.email?.trades) {
            const emailResult = await this.sendEmailNotification(
                user.email,
                this.getTradeEmailSubject(trade, type),
                'trade_notification',
                { user, trade, type }
            );
            notifications.push({ type: 'email', ...emailResult });
        }

        // In-app notification (store in database)
        const inAppNotification = await this.createInAppNotification(user._id, {
            type: 'trade',
            title: this.getTradeNotificationTitle(trade, type),
            message: this.getTradeNotificationMessage(trade, type),
            data: { tradeId: trade._id, type },
            priority: this.getTradeNotificationPriority(type)
        });
        notifications.push({ type: 'in_app', ...inAppNotification });

        return notifications;
    }

    // System Notifications
    async sendSystemNotification(userId, title, message, priority = 'medium') {
        try {
            const Notification = require('../models/Notification');
            
            const notification = await Notification.create({
                user: userId,
                type: 'system',
                title,
                message,
                priority,
                read: false
            });

            // Real-time push notification (WebSocket)
            this.sendRealTimeNotification(userId, {
                type: 'system',
                title,
                message,
                notificationId: notification._id,
                timestamp: new Date()
            });

            return { success: true, notification };
        } catch (error) {
            console.error('System notification error:', error);
            return { success: false, error: error.message };
        }
    }

    // Real-time Notifications (WebSocket)
    sendRealTimeNotification(userId, data) {
        // This would integrate with your WebSocket service
        // For now, we'll log it
        console.log(`🔔 Real-time notification for user ${userId}:`, data);
        
        // In a real implementation:
        // io.to(`user_${userId}`).emit('notification', data);
    }

    // Mobile Push Notifications
    async sendPushNotification(user, title, body, data = {}) {
        if (!user.notificationPreferences?.push) {
            return { success: false, error: 'Push notifications disabled' };
        }

        // This would integrate with FCM (Firebase Cloud Messaging) or APNS
        // For demo, we'll simulate it
        try {
            console.log(`📱 Push notification: ${title} - ${body}`, data);
            return { success: true, sent: true };
        } catch (error) {
            console.error('Push notification error:', error);
            return { success: false, error: error.message };
        }
    }

    // Admin Notifications
    async sendAdminNotification(title, message, level = 'info') {
        const adminUsers = await this.getAdminUsers();
        
        const notifications = await Promise.all(
            adminUsers.map(admin => 
                this.sendSystemNotification(
                    admin._id, 
                    `[ADMIN] ${title}`, 
                    message, 
                    this.getAdminNotificationPriority(level)
                )
            )
        );

        // Also send to admin channel/email
        if (process.env.ADMIN_EMAIL) {
            await this.sendEmailNotification(
                process.env.ADMIN_EMAIL,
                `Admin Alert: ${title}`,
                'admin_alert',
                { title, message, level, timestamp: new Date() }
            );
        }

        return notifications;
    }

    // Template Rendering
    renderEmailTemplate(template, data) {
        const templates = {
            welcome: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">🎉 مرحباً بك في CryptoPro!</h2>
                    <p>عزيزي ${data.user?.fullName || 'المستخدم'},</p>
                    <p>شكراً لتسجيلك في منصة CryptoPro للتداول الآلي.</p>
                    <p>يمكنك الآن:</p>
                    <ul>
                        <li>🔗 ربط منصات التداول الخاصة بك</li>
                        <li>⚙️ ضبط إعدادات التداول الآلي</li>
                        <li>📊 متابعة أداء التداول</li>
                        <li>👥 دعوة الأصدقاء وكسب العمولات</li>
                    </ul>
                    <p>إذا كان لديك أي استفسار، لا تتردد في التواصل مع فريق الدعم.</p>
                    <br>
                    <p>مع أطيب التحيات,<br>فريق CryptoPro</p>
                </div>
            `,
            trade_notification: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">📊 إشعار تداول</h2>
                    <p>عزيزي ${data.user?.fullName || 'المستخدم'},</p>
                    <p>${this.getTradeEmailMessage(data.trade, data.type)}</p>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <strong>تفاصيل الصفقة:</strong><br>
                        - الزوج: ${data.trade.symbol}<br>
                        - الاتجاه: ${data.trade.side === 'BUY' ? 'شراء' : 'بيع'}<br>
                        - الكمية: ${data.trade.quantity}<br>
                        ${data.trade.profitLoss ? `- الربح/الخسارة: $${data.trade.profitLoss.toFixed(2)}` : ''}
                    </div>
                    <p>يمكنك متابعة جميع صفقاتك من خلال لوحة التحكم.</p>
                    <br>
                    <p>مع أطيب التحيات,<br>فريق CryptoPro</p>
                </div>
            `,
            profit_share: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #10b981;">💰 إشعار تحويل أرباح</h2>
                    <p>عزيزي ${data.user?.fullName || 'المستخدم'},</p>
                    <p>تم تحويل حصص الأرباح بنجاح من حسابك.</p>
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <strong>تفاصيل التحويل:</strong><br>
                        - المبلغ: $${data.amount?.toFixed(2) || '0.00'}<br>
                        - الفترة: ${data.period || '4 أيام'}<br>
                        - إجمالي الأرباح: $${data.totalProfit?.toFixed(2) || '0.00'}<br>
                        - عدد الصفقات: ${data.tradesCount || 0}
                    </div>
                    <p>هذا التحويل يتم تلقائياً كل 4 أيام حسب سياسة المنصة.</p>
                    <br>
                    <p>مع أطيب التحيات,<br>فريق CryptoPro</p>
                </div>
            `,
            admin_alert: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: ${this.getAlertColor(data.level)};">🚨 تنبيه المدير</h2>
                    <p><strong>${data.title}</strong></p>
                    <p>${data.message}</p>
                    <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <strong>معلومات التنبيه:</strong><br>
                        - المستوى: ${data.level}<br>
                        - الوقت: ${data.timestamp?.toLocaleString() || new Date().toLocaleString()}
                    </div>
                    <p>يرجى مراجعة النظام واتخاذ الإجراء اللازم.</p>
                </div>
            `
        };

        return templates[template] || '<p>Notification template not found</p>';
    }

    // Helper Methods
    getTradeEmailSubject(trade, type) {
        const subjects = {
            executed: `✅ تم تنفيذ صفقة - ${trade.symbol}`,
            closed: `📊 صفقة مغلقة - ${trade.symbol}`,
            stopped: `🛑 إيقاف - ${trade.symbol}`,
            error: `❌ خطأ في الصفقة - ${trade.symbol}`
        };
        return subjects[type] || `إشعار تداول - ${trade.symbol}`;
    }

    getTradeNotificationTitle(trade, type) {
        const titles = {
            executed: `✅ صفقة جديدة`,
            closed: `📊 صفقة مغلقة`,
            stopped: `🛑 إيقاف تلقائي`,
            error: `❌ خطأ في التداول`
        };
        return titles[type] || `إشعار تداول`;
    }

    getTradeNotificationMessage(trade, type) {
        const messages = {
            executed: `تم تنفيذ صفقة ${trade.side === 'BUY' ? 'شراء' : 'بيع'} على ${trade.symbol}`,
            closed: `تم إغلاق صفقة ${trade.symbol} بربح $${trade.profitLoss?.toFixed(2) || '0.00'}`,
            stopped: `تم إيقاف الصفقة ${trade.symbol} تلقائياً`,
            error: `حدث خطأ في صفقة ${trade.symbol}`
        };
        return messages[type] || `تحديث صفقة ${trade.symbol}`;
    }

    getTradeNotificationPriority(type) {
        const priorities = {
            error: 'high',
            stopped: 'high',
            executed: 'medium',
            closed: 'low'
        };
        return priorities[type] || 'medium';
    }

    getAdminNotificationPriority(level) {
        const priorities = {
            critical: 'high',
            error: 'high',
            warning: 'medium',
            info: 'low'
        };
        return priorities[level] || 'medium';
    }

    getAlertColor(level) {
        const colors = {
            critical: '#dc2626',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[level] || '#3b82f6';
    }

    htmlToText(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async getAdminUsers() {
        const User = require('../models/User');
        return await User.find({ role: 'admin' }).select('_id');
    }

    async createInAppNotification(userId, notificationData) {
        try {
            const Notification = require('../models/Notification');
            
            const notification = await Notification.create({
                user: userId,
                ...notificationData
            });

            return { success: true, notification };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Bulk Notifications
    async sendBulkNotification(users, title, message, type = 'system') {
        const results = await Promise.allSettled(
            users.map(user => 
                this.sendSystemNotification(user._id, title, message, 'medium')
            )
        );

        const successful = results.filter(result => result.status === 'fulfilled').length;
        const failed = results.filter(result => result.status === 'rejected').length;

        return {
            total: users.length,
            successful,
            failed,
            results: results.map((result, index) => ({
                user: users[index].email,
                status: result.status,
                ...(result.status === 'fulfilled' ? { data: result.value } : { error: result.reason })
            }))
        };
    }
}

module.exports = new NotificationService();