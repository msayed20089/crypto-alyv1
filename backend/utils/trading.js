const axios = require('axios');
const crypto = require('crypto');

class TradingUtils {
    constructor() {
        this.exchangeConfigs = {
            binance: {
                baseURL: 'https://api.binance.com',
                futuresURL: 'https://fapi.binance.com',
                endpoints: {
                    account: '/api/v3/account',
                    order: '/api/v3/order',
                    ticker: '/api/v3/ticker/price',
                    klines: '/api/v3/klines'
                }
            },
            coinbase: {
                baseURL: 'https://api.coinbase.com',
                endpoints: {
                    accounts: '/v2/accounts',
                    orders: '/v2/orders'
                }
            },
            bybit: {
                baseURL: 'https://api.bybit.com',
                endpoints: {
                    order: '/v2/private/order/create',
                    position: '/v2/private/position/list'
                }
            }
        };
    }

    // Technical Analysis Indicators
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) {
            throw new Error(`Not enough data for RSI calculation. Need at least ${period + 1} prices.`);
        }

        let gains = 0;
        let losses = 0;

        // Calculate initial gains and losses
        for (let i = 1; i <= period; i++) {
            const difference = prices[i] - prices[i - 1];
            if (difference >= 0) {
                gains += difference;
            } else {
                losses -= difference;
            }
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        // Calculate subsequent values
        const rsiValues = [];
        
        for (let i = period + 1; i < prices.length; i++) {
            const difference = prices[i] - prices[i - 1];
            let currentGain = 0;
            let currentLoss = 0;

            if (difference >= 0) {
                currentGain = difference;
            } else {
                currentLoss = -difference;
            }

            avgGain = ((avgGain * (period - 1)) + currentGain) / period;
            avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

            if (avgLoss === 0) {
                rsiValues.push(100);
            } else {
                const rs = avgGain / avgLoss;
                const rsi = 100 - (100 / (1 + rs));
                rsiValues.push(rsi);
            }
        }

        return rsiValues;
    }

    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (prices.length < slowPeriod) {
            throw new Error(`Not enough data for MACD calculation. Need at least ${slowPeriod} prices.`);
        }

        // Calculate EMAs
        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);

        // Calculate MACD line
        const macdLine = [];
        for (let i = 0; i < slowEMA.length; i++) {
            if (i < fastEMA.length - slowPeriod + fastPeriod) {
                macdLine.push(fastEMA[i + slowPeriod - fastPeriod] - slowEMA[i]);
            }
        }

        // Calculate Signal line
        const signalLine = this.calculateEMA(macdLine, signalPeriod);

        // Calculate Histogram
        const histogram = [];
        for (let i = 0; i < signalLine.length; i++) {
            if (i < macdLine.length - signalPeriod + 1) {
                histogram.push(macdLine[i + signalPeriod - 1] - signalLine[i]);
            }
        }

        return {
            macdLine: macdLine.slice(signalPeriod - 1),
            signalLine,
            histogram
        };
    }

    calculateEMA(prices, period) {
        const k = 2 / (period + 1);
        const ema = [prices[0]]; // Start with the first price

        for (let i = 1; i < prices.length; i++) {
            ema.push(prices[i] * k + ema[i - 1] * (1 - k));
        }

        return ema;
    }

    calculateBollingerBands(prices, period = 20, multiplier = 2) {
        if (prices.length < period) {
            throw new Error(`Not enough data for Bollinger Bands. Need at least ${period} prices.`);
        }

        const bands = {
            upper: [],
            middle: [],
            lower: []
        };

        for (let i = period - 1; i < prices.length; i++) {
            const slice = prices.slice(i - period + 1, i + 1);
            const mean = slice.reduce((sum, price) => sum + price, 0) / period;
            const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
            const stdDev = Math.sqrt(variance);

            bands.middle.push(mean);
            bands.upper.push(mean + (multiplier * stdDev));
            bands.lower.push(mean - (multiplier * stdDev));
        }

        return bands;
    }

    // Risk Management
    calculatePositionSize(balance, riskPercent, entryPrice, stopLossPrice) {
        const riskAmount = balance * (riskPercent / 100);
        const priceDifference = Math.abs(entryPrice - stopLossPrice);
        const positionSize = riskAmount / priceDifference;
        
        return {
            positionSize,
            riskAmount,
            riskRewardRatio: this.calculateRiskRewardRatio(entryPrice, stopLossPrice, null)
        };
    }

    calculateRiskRewardRatio(entryPrice, stopLossPrice, takeProfitPrice) {
        const risk = Math.abs(entryPrice - stopLossPrice);
        const reward = takeProfitPrice ? Math.abs(takeProfitPrice - entryPrice) : risk * 2; // Default 1:2 ratio
        
        return reward / risk;
    }

    // Trading Signals
    generateTradingSignal(marketData, indicators) {
        const signals = [];
        const { rsi, macd, bollingerBands, price } = marketData;

        // RSI Signals
        if (rsi < 30) {
            signals.push({ indicator: 'RSI', signal: 'BUY', strength: 0.8 });
        } else if (rsi > 70) {
            signals.push({ indicator: 'RSI', signal: 'SELL', strength: 0.8 });
        }

        // MACD Signals
        const latestMACD = macd.macdLine[macd.macdLine.length - 1];
        const latestSignal = macd.signalLine[macd.signalLine.length - 1];
        
        if (latestMACD > latestSignal && latestMACD > 0) {
            signals.push({ indicator: 'MACD', signal: 'BUY', strength: 0.7 });
        } else if (latestMACD < latestSignal && latestMACD < 0) {
            signals.push({ indicator: 'MACD', signal: 'SELL', strength: 0.7 });
        }

        // Bollinger Bands Signals
        const latestPrice = price;
        const upperBand = bollingerBands.upper[bollingerBands.upper.length - 1];
        const lowerBand = bollingerBands.lower[bollingerBands.lower.length - 1];
        
        if (latestPrice < lowerBand) {
            signals.push({ indicator: 'BB', signal: 'BUY', strength: 0.6 });
        } else if (latestPrice > upperBand) {
            signals.push({ indicator: 'BB', signal: 'SELL', strength: 0.6 });
        }

        // Calculate overall signal
        const overallSignal = this.calculateOverallSignal(signals);
        
        return {
            signals,
            overallSignal,
            confidence: this.calculateConfidence(signals),
            timestamp: new Date()
        };
    }

    calculateOverallSignal(signals) {
        let buyScore = 0;
        let sellScore = 0;

        signals.forEach(signal => {
            if (signal.signal === 'BUY') {
                buyScore += signal.strength;
            } else if (signal.signal === 'SELL') {
                sellScore += signal.strength;
            }
        });

        if (buyScore > sellScore) return 'BUY';
        if (sellScore > buyScore) return 'SELL';
        return 'HOLD';
    }

    calculateConfidence(signals) {
        if (signals.length === 0) return 0;
        
        const totalStrength = signals.reduce((sum, signal) => sum + signal.strength, 0);
        return totalStrength / signals.length;
    }

    // Exchange API Integration
    async connectToExchange(exchangeName, apiKey, apiSecret) {
        const config = this.exchangeConfigs[exchangeName];
        if (!config) {
            throw new Error(`Unsupported exchange: ${exchangeName}`);
        }

        try {
            // Test connection by fetching account info
            const accountInfo = await this.makeExchangeRequest(
                exchangeName,
                'GET',
                config.endpoints.account,
                apiKey,
                apiSecret
            );

            return {
                connected: true,
                accountInfo,
                timestamp: new Date()
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message,
                timestamp: new Date()
            };
        }
    }

    async makeExchangeRequest(exchangeName, method, endpoint, apiKey, apiSecret, data = {}) {
        const config = this.exchangeConfigs[exchangeName];
        
        const headers = {
            'Content-Type': 'application/json',
            'X-MBX-APIKEY': apiKey
        };

        // Add signature for private endpoints
        if (this.isPrivateEndpoint(endpoint)) {
            const signature = this.generateSignature(exchangeName, data, apiSecret);
            data.signature = signature;
        }

        try {
            const response = await axios({
                method,
                url: config.baseURL + endpoint,
                headers,
                data: method !== 'GET' ? data : undefined,
                params: method === 'GET' ? data : undefined,
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            throw new Error(`Exchange API error: ${error.response?.data?.msg || error.message}`);
        }
    }

    generateSignature(exchangeName, data, apiSecret) {
        const queryString = Object.keys(data)
            .sort()
            .map(key => `${key}=${data[key]}`)
            .join('&');

        return crypto
            .createHmac('sha256', apiSecret)
            .update(queryString)
            .digest('hex');
    }

    isPrivateEndpoint(endpoint) {
        const privateEndpoints = ['/account', '/order', '/withdraw'];
        return privateEndpoints.some(privateEndpoint => 
            endpoint.includes(privateEndpoint)
        );
    }

    // Market Data
    async getMarketData(symbol, exchange = 'binance', interval = '1h', limit = 100) {
        try {
            const config = this.exchangeConfigs[exchange];
            const response = await axios.get(`${config.baseURL}${config.endpoints.klines}`, {
                params: {
                    symbol: symbol.toUpperCase(),
                    interval,
                    limit
                }
            });

            return response.data.map(candle => ({
                timestamp: new Date(candle[0]),
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
                volume: parseFloat(candle[5])
            }));
        } catch (error) {
            throw new Error(`Failed to fetch market data: ${error.message}`);
        }
    }

    // Order Management
    async createOrder(exchangeName, orderData, apiKey, apiSecret) {
        const config = this.exchangeConfigs[exchangeName];
        
        const order = {
            symbol: orderData.symbol.toUpperCase(),
            side: orderData.side.toUpperCase(),
            type: orderData.type.toUpperCase(),
            quantity: orderData.quantity,
            ...(orderData.price && { price: orderData.price }),
            ...(orderData.stopPrice && { stopPrice: orderData.stopPrice })
        };

        try {
            const result = await this.makeExchangeRequest(
                exchangeName,
                'POST',
                config.endpoints.order,
                apiKey,
                apiSecret,
                order
            );

            return {
                success: true,
                orderId: result.orderId,
                status: result.status,
                executedQty: result.executedQty,
                cummulativeQuoteQty: result.cummulativeQuoteQty
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Performance Analytics
    calculatePerformanceMetrics(trades) {
        const profitableTrades = trades.filter(trade => trade.profitLoss > 0);
        const losingTrades = trades.filter(trade => trade.profitLoss < 0);

        const totalProfit = trades.reduce((sum, trade) => sum + trade.profitLoss, 0);
        const totalWins = profitableTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
        const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.profitLoss, 0));

        const winRate = (profitableTrades.length / trades.length) * 100;
        const profitFactor = totalLosses > 0 ? totalWins / totalLosses : Infinity;
        const averageWin = profitableTrades.length > 0 ? totalWins / profitableTrades.length : 0;
        const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
        const expectancy = (winRate / 100 * averageWin) - ((100 - winRate) / 100 * averageLoss);

        return {
            totalTrades: trades.length,
            profitableTrades: profitableTrades.length,
            losingTrades: losingTrades.length,
            winRate,
            totalProfit,
            profitFactor,
            averageWin,
            averageLoss,
            expectancy,
            sharpeRatio: this.calculateSharpeRatio(trades),
            maxDrawdown: this.calculateMaxDrawdown(trades)
        };
    }

    calculateSharpeRatio(trades, riskFreeRate = 0.02) {
        if (trades.length < 2) return 0;

        const returns = trades.map(trade => trade.profitLoss / (trade.quantity * trade.price));
        const averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const stdDev = Math.sqrt(
            returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length
        );

        return stdDev > 0 ? (averageReturn - riskFreeRate) / stdDev : 0;
    }

    calculateMaxDrawdown(trades) {
        let peak = -Infinity;
        let maxDrawdown = 0;
        let runningTotal = 0;

        for (const trade of trades) {
            runningTotal += trade.profitLoss;
            if (runningTotal > peak) {
                peak = runningTotal;
            }
            const drawdown = peak - runningTotal;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }

        return maxDrawdown;
    }
}

module.exports = new TradingUtils();