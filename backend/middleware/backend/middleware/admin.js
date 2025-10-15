const User = require('../models/User');
const Trade = require('../models/Trade');

class AdminMiddleware {
    // Verify admin privileges
    async requireAdmin(req, res, next) {
        try {
            // Check if user is admin (you can modify this based on your role system)
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '❌ غير مصرح بالوصول. تحتاج صلاحيات المدير.'
                });
            }

            // Additional admin verification can be added here
            const adminUser = await User.findById(req.user._id);
            if (!adminUser || !adminUser.isActive) {
                return res.status(403).json({
                    success: false,
                    message: '❌ حساب المدير غير نشط أو غير موجود.'
                });
            }

            next();
        } catch (error) {
            console.error('Admin Middleware Error:', error);
            return res.status(500).json({
                success: false,
                message: '❌ خطأ في التحقق من صلاحيات المدير.'
            });
        }
    }

    // Log admin actions
    async logAdminAction(req, res, next) {
        const adminAction = {
            adminId: req.user._id,
            action: `${req.method} ${req.path}`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date(),
            params: req.params,
            query: req.query,
            body: this.sanitizeBody(req.body)
        };

        console.log('🔧 Admin Action:', adminAction);
        
        // Here you can save to an admin actions collection
        // await AdminAction.create(adminAction);
        
        next();
    }

    // Sanitize sensitive data from logs
    sanitizeBody(body) {
        const sanitized = { ...body };
        const sensitiveFields = ['password', 'apiKey', 'apiSecret', 'token', 'secret'];
        
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '***HIDDEN***';
            }
        });
        
        return sanitized;
    }

    // Rate limiting for admin operations
    adminRateLimit(req, res, next) {
        const adminLimits = req.user.adminLimits || {};
        const operation = req.path;
        const now = Date.now();
        
        // More generous limits for admins
        if (adminLimits[operation] && adminLimits[operation] > now) {
            return res.status(429).json({
                success: false,
                message: '⏳ تجاوزت الحد المسموح للمدير. يرجى الانتظار قليلاً.'
            });
        }
        
        // Set limit for next operation (1 minute from now)
        adminLimits[operation] = now + 60 * 1000;
        req.user.adminLimits = adminLimits;
        
        next();
    }

    // Validate admin permissions for specific operations
    async validateAdminPermissions(req, res, next) {
        const requiredPermissions = this.getRequiredPermissions(req.method, req.path);
        
        if (requiredPermissions.length > 0) {
            const hasPermissions = await this.checkUserPermissions(req.user._id, requiredPermissions);
            
            if (!hasPermissions) {
                return res.status(403).json({
                    success: false,
                    message: '❌ لا تملك الصلاحيات الكافية لهذا الإجراء.'
                });
            }
        }
        
        next();
    }

    getRequiredPermissions(method, path) {
        const permissionMap = {
            'GET:/api/admin/users': ['read_users'],
            'POST:/api/admin/users': ['create_users'],
            'PUT:/api/admin/users': ['update_users'],
            'DELETE:/api/admin/users': ['delete_users'],
            'GET:/api/admin/trades': ['read_trades'],
            'GET:/api/admin/analytics': ['read_analytics'],
            'POST:/api/admin/broadcast': ['send_notifications'],
            'PUT:/api/admin/settings': ['update_settings']
        };
        
        return permissionMap[`${method}:${path}`] || [];
    }

    async checkUserPermissions(userId, requiredPermissions) {
        // This would check against a permissions database
        // For now, return true for demo
        return true;
    }

    // Data validation for admin operations
    validateAdminData(schema) {
        return (req, res, next) => {
            const { error } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: '❌ بيانات غير صالحة',
                    errors: error.details.map(detail => detail.message)
                });
            }
            next();
        };
    }

    // Audit trail for sensitive admin actions
    async auditAction(action, details) {
        const auditLog = {
            adminId: this.currentAdmin?._id,
            action,
            details,
            ip: this.currentIp,
            userAgent: this.currentUserAgent,
            timestamp: new Date()
        };

        console.log('📋 Admin Audit:', auditLog);
        
        // Save to audit collection
        // await AuditLog.create(auditLog);
    }
}

module.exports = new AdminMiddleware();