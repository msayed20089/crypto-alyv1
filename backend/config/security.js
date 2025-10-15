const crypto = require('crypto');

class SecurityConfig {
    constructor() {
        this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateDefaultKey();
        this.jwtSecret = process.env.JWT_SECRET || 'cryptopro-default-secret-change-in-production';
        this.rateLimitConfig = this.getRateLimitConfig();
    }

    generateDefaultKey() {
        console.warn('⚠️  Using default encryption key - Change in production!');
        return crypto.randomBytes(32).toString('hex');
    }

    getRateLimitConfig() {
        return {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // Limit each IP to 100 requests per windowMs
            message: {
                success: false,
                message: 'Too many requests from this IP, please try again later.'
            },
            standardHeaders: true,
            legacyHeaders: false,
        };
    }

    getCORSConfig() {
        return {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        };
    }

    getAPIConfig() {
        return {
            binance: {
                baseURL: 'https://api.binance.com',
                timeout: 5000
            },
            coinbase: {
                baseURL: 'https://api.coinbase.com',
                timeout: 5000
            },
            bybit: {
                baseURL: 'https://api.bybit.com',
                timeout: 5000
            }
        };
    }

    validateAPIKeys(keys) {
        const requiredFields = ['apiKey', 'apiSecret'];
        const missingFields = requiredFields.filter(field => !keys[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required API key fields: ${missingFields.join(', ')}`);
        }

        // Validate API key format (basic validation)
        if (keys.apiKey.length < 10) {
            throw new Error('Invalid API key format');
        }

        return true;
    }

    // Generate secure random strings
    generateSecureRandom(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Hash sensitive data
    hashData(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
}

module.exports = new SecurityConfig();