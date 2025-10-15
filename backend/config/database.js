const mongoose = require('mongoose');

class Database {
    constructor() {
        this.connection = null;
        this.connect();
    }

    async connect() {
        try {
            const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptopro';
            
            this.connection = await mongoose.connect(MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');

            // Event listeners for database connection
            mongoose.connection.on('error', (error) => {
                console.error('❌ خطأ في قاعدة البيانات:', error);
            });

            mongoose.connection.on('disconnected', () => {
                console.log('⚠️  تم قطع الاتصال بقاعدة البيانات');
            });

            mongoose.connection.on('reconnected', () => {
                console.log('🔁 تم إعادة الاتصال بقاعدة البيانات');
            });

        } catch (error) {
            console.error('❌ فشل في الاتصال بقاعدة البيانات:', error);
            process.exit(1);
        }
    }

    async disconnect() {
        try {
            await mongoose.disconnect();
            console.log('✅ تم قطع الاتصال بقاعدة البيانات');
        } catch (error) {
            console.error('❌ خطأ في قطع الاتصال:', error);
        }
    }

    getConnection() {
        return this.connection;
    }

    // Health check for database
    async healthCheck() {
        try {
            await mongoose.connection.db.admin().ping();
            return { status: 'healthy', timestamp: new Date() };
        } catch (error) {
            return { status: 'unhealthy', error: error.message, timestamp: new Date() };
        }
    }
}

module.exports = new Database();