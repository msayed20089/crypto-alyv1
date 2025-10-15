const mongoose = require('mongoose');
const crypto = require('crypto');

const exchangeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    exchangeName: {
        type: String,
        required: true,
        enum: ['binance', 'coinbase', 'bybit', 'kucoin', 'okx', 'gateio', 'bitget', 'kraken']
    },
    
    // Encrypted API Keys
    apiKey: {
        type: String,
        required: true
    },
    
    apiSecret: {
        type: String,
        required: true
    },
    
    passphrase: {
        type: String,
        required: false // For exchanges like Coinbase
    },
    
    // Connection Status
    isConnected: {
        type: Boolean,
        default: false
    },
    
    lastConnectionTest: Date,
    
    connectionError: String,
    
    // Trading Permissions
    permissions: {
        spotTrading: {
            type: Boolean,
            default: false
        },
        marginTrading: {
            type: Boolean,
            default: false
        },
        futuresTrading: {
            type: Boolean,
            default: false
        },
        withdrawal: {
            type: Boolean,
            default: false
        }
    },
    
    // Balance Information
    balances: [{
        asset: {
            type: String,
            uppercase: true,
            trim: true
        },
        free: {
            type: Number,
            default: 0
        },
        locked: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            default: 0
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Trading Settings
    tradingSettings: {
        maxLeverage: {
            type: Number,
            default: 1,
            min: 1,
            max: 100
        },
        defaultSymbols: [{
            type: String,
            uppercase: true,
            trim: true
        }],
        tradingEnabled: {
            type: Boolean,
            default: false
        },
        dailyLossLimit: {
            type: Number,
            default: 0
        }
    },
    
    // Security
    isActive: {
        type: Boolean,
        default: true
    },
    
    lastUsed: Date,
    
    // Statistics
    statistics: {
        totalTrades: {
            type: Number,
            default: 0
        },
        totalVolume: {
            type: Number,
            default: 0
        },
        totalFees: {
            type: Number,
            default: 0
        },
        lastSync: Date
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for total balance
exchangeSchema.virtual('totalBalance').get(function() {
    return this.balances.reduce((total, balance) => total + balance.total, 0);
});

// Indexes
exchangeSchema.index({ user: 1, exchangeName: 1 }, { unique: true });
exchangeSchema.index({ isConnected: 1 });
exchangeSchema.index({ 'tradingSettings.tradingEnabled': 1 });

// Pre-save middleware to encrypt API keys
exchangeSchema.pre('save', function(next) {
    if (this.isModified('apiKey') || this.isModified('apiSecret') || this.isModified('passphrase')) {
        const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
        const algorithm = 'aes-256-gcm';
        
        try {
            // Encrypt API Key
            if (this.apiKey) {
                const cipher = crypto.createCipher(algorithm, encryptionKey);
                let encrypted = cipher.update(this.apiKey, 'utf8', 'hex');
                encrypted += cipher.final('hex');
                this.apiKey = encrypted;
            }
            
            // Encrypt API Secret
            if (this.apiSecret) {
                const cipher = crypto.createCipher(algorithm, encryptionKey);
                let encrypted = cipher.update(this.apiSecret, 'utf8', 'hex');
                encrypted += cipher.final('hex');
                this.apiSecret = encrypted;
            }
            
            // Encrypt Passphrase
            if (this.passphrase) {
                const cipher = crypto.createCipher(algorithm, encryptionKey);
                let encrypted = cipher.update(this.passphrase, 'utf8', 'hex');
                encrypted += cipher.final('hex');
                this.passphrase = encrypted;
            }
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Method to decrypt API keys
exchangeSchema.methods.decryptAPIKeys = function() {
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const algorithm = 'aes-256-gcm';
    
    const decrypted = {};
    
    try {
        // Decrypt API Key
        if (this.apiKey) {
            const decipher = crypto.createDecipher(algorithm, encryptionKey);
            let decryptedKey = decipher.update(this.apiKey, 'hex', 'utf8');
            decryptedKey += decipher.final('utf8');
            decrypted.apiKey = decryptedKey;
        }
        
        // Decrypt API Secret
        if (this.apiSecret) {
            const decipher = crypto.createDecipher(algorithm, encryptionKey);
            let decryptedSecret = decipher.update(this.apiSecret, 'hex', 'utf8');
            decryptedSecret += decipher.final('utf8');
            decrypted.apiSecret = decryptedSecret;
        }
        
        // Decrypt Passphrase
        if (this.passphrase) {
            const decipher = crypto.createDecipher(algorithm, encryptionKey);
            let decryptedPassphrase = decipher.update(this.passphrase, 'hex', 'utf8');
            decryptedPassphrase += decipher.final('utf8');
            decrypted.passphrase = decryptedPassphrase;
        }
        
        return decrypted;
    } catch (error) {
        throw new Error('Failed to decrypt API keys');
    }
};

// Method to test connection
exchangeSchema.methods.testConnection = async function() {
    try {
        const decryptedKeys = this.decryptAPIKeys();
        
        // This would be implemented based on the specific exchange
        // For now, we'll simulate a connection test
        const isSuccessful = Math.random() > 0.2; // 80% success rate for demo
        
        this.isConnected = isSuccessful;
        this.lastConnectionTest = new Date();
        
        if (!isSuccessful) {
            this.connectionError = 'Failed to connect to exchange API';
        } else {
            this.connectionError = null;
        }
        
        await this.save();
        return { success: isSuccessful, error: this.connectionError };
        
    } catch (error) {
        this.isConnected = false;
        this.connectionError = error.message;
        await this.save();
        return { success: false, error: error.message };
    }
};

// Static method to get user's connected exchanges
exchangeSchema.statics.getUserExchanges = function(userId) {
    return this.find({ user: userId, isConnected: true })
        .select('exchangeName isConnected lastConnectionTest tradingSettings.tradingEnabled')
        .sort({ lastConnectionTest: -1 });
};

module.exports = mongoose.model('Exchange', exchangeSchema);