const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'cryptopro_encryption_key_2024';

// تشفير النص
function encrypt(text) {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

// فك تشفير النص
function decrypt(encryptedText) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('خطأ في فك التشفير:', error);
    return null;
  }
}

// تشفير بيانات API
function encryptAPIKeys(apiKey, apiSecret) {
  return {
    api_key: encrypt(apiKey),
    api_secret: encrypt(apiSecret)
  };
}

// فك تشفير بيانات API
function decryptAPIKeys(encryptedApiKey, encryptedApiSecret) {
  return {
    api_key: decrypt(encryptedApiKey),
    api_secret: decrypt(encryptedApiSecret)
  };
}

// إنشاء hash
function createHash(data) {
  return CryptoJS.SHA256(data + ENCRYPTION_KEY).toString();
}

// التحقق من hash
function verifyHash(data, hash) {
  return createHash(data) === hash;
}

module.exports = {
  encrypt,
  decrypt,
  encryptAPIKeys,
  decryptAPIKeys,
  createHash,
  verifyHash
};