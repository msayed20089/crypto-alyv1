# CryptoPro - منصة التداول الآلي الذكي

منصة متكاملة للتداول الآلي في العملات الرقمية باستخدام الذكاء الاصطناعي وتحليل السوق المتقدم.

## 🌟 المميزات

- 🤖 تداول آلي ذكي 24/7
- 📊 تحليل فني متقدم
- 🛡️ إدارة مخاطر متقدمة
- 💰 نظام عمولات متعدد المستويات
- 🔐 أمان وحماية متكاملة
- 📱 واجهة مستخدم متجاوبة

## 🚀 التثبيت السريع

### المتطلبات الأساسية
- Node.js 16+
- MySQL 8.0+
- npm أو yarn

### خطوات التثبيت

1. **استنساخ المشروع**
```bash
git clone https://github.com/yourusername/cryptopro-website.git
cd cryptopro-website
# للخلفية
cd backend
npm install

# للواجهة الأمامية
cd ../frontend
# الملفات جاهزة - لا حاجة لتثبيت
mysql -u root -p < database/schema.sql
cp backend/.env.example backend/.env
# تعديل ملف .env بإعداداتك
# تشغيل الخادم
cd backend
npm start

# سيعمل الموقع على http://localhost:3000
