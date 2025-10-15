# CryptoPro API Documentation

## Base URL
https://api.cryptopro.com/v1

text

## Authentication
```http
Authorization: Bearer your_jwt_token
Endpoints
Authentication
POST /auth/register
json
{
  "fullName": "User Name",
  "email": "user@example.com",
  "password": "password",
  "passwordConfirm": "password"
}
POST /auth/login
json
{
  "email": "user@example.com",
  "password": "password"
}
GET /users/profile
PUT /users/profile
json
{
  "tradingSettings": {
    "profitTarget": 10,
    "stopLoss": 4
  }
}
Trading
GET /trading/trades?page=1&limit=20
POST /trading/trades
json
{
  "exchange": "binance",
  "symbol": "BTCUSDT",
  "side": "BUY",
  "quantity": 0.1,
  "stopLoss": 44000,
  "takeProfit": 46000
}
Exchanges
POST /exchanges/connect
json
{
  "exchangeName": "binance",
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret"
}
GET /exchanges
Payments
GET /payments
POST /payments/withdraw
json
{
  "amount": 1000,
  "method": "crypto",
  "walletAddress": "wallet_address"
}
Referrals
GET /users/referrals
Error Responses
json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}