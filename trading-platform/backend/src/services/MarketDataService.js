const axios = require('axios');
const WebSocket = require('ws');
const db = require('../config/database');
const redis = require('../config/redis');
const EventEmitter = require('events');

class MarketDataService extends EventEmitter {
  constructor() {
    super();
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    this.finnhubKey = process.env.FINNHUB_API_KEY;
    this.wsConnections = new Map();
    this.subscribers = new Map();
    this.rateLimitDelay = 12000; // 12 seconds between API calls (5 calls per minute limit)
    this.lastApiCall = 0;
  }

  // Rate limiting helper
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    if (timeSinceLastCall < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastCall;
      console.log(`ALALIZ.COM - Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastApiCall = Date.now();
  }

  // Get current price from cache or API
  async getCurrentPrice(symbol) {
    try {
      // Check cache first
      const cachedPrice = await redis.get(`price:${symbol}`);
      if (cachedPrice) {
        return JSON.parse(cachedPrice);
      }

      console.log(`ALALIZ.COM - Fetching current price for ${symbol}`);
      await this.waitForRateLimit();

      // Fetch from Alpha Vantage API
      const response = await axios.get(`https://www.alphavantage.co/query`, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: this.apiKey
        },
        timeout: 10000
      });

      if (response.data['Error Message']) {
        throw new Error(`API Error: ${response.data['Error Message']}`);
      }

      if (response.data['Note']) {
        throw new Error('API rate limit exceeded. Please try again later.');
      }

      const quote = response.data['Global Quote'];
      if (!quote || Object.keys(quote).length === 0) {
        // Fallback to mock data for demo purposes
        return this.getMockPrice(symbol);
      }

      const priceData = {
        symbol: symbol,
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        previousClose: parseFloat(quote['08. previous close']),
        timestamp: new Date(),
        source: 'alpha_vantage'
      };

      // Cache for 30 seconds
      await redis.set(`price:${symbol}`, JSON.stringify(priceData), 30);
      
      return priceData;
    } catch (error) {
      console.error('ALALIZ.COM - Error fetching current price:', error.message);
      
      // Return mock data as fallback
      return this.getMockPrice(symbol);
    }
  }

  // Mock price data for testing/demo
  getMockPrice(symbol) {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const randomChange = (Math.random() - 0.5) * 0.1; // ±5% random change
    const price = basePrice * (1 + randomChange);
    const change = price - basePrice;
    const changePercent = (change / basePrice) * 100;

    return {
      symbol: symbol,
      price: parseFloat(price.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 100000,
      previousClose: basePrice,
      timestamp: new Date(),
      source: 'mock_data'
    };
  }

  // Base prices for common symbols (for demo)
  getBasePriceForSymbol(symbol) {
    const basePrices = {
      'AAPL': 175.00,
      'GOOGL': 2800.00,
      'MSFT': 340.00,
      'AMZN': 3200.00,
      'TSLA': 800.00,
      'NVDA': 450.00,
      'META': 320.00,
      'NFLX': 400.00,
      'SPY': 420.00,
      'QQQ': 350.00
    };
    return basePrices[symbol.toUpperCase()] || 100.00;
  }

  // Get historical data
  async getHistoricalData(symbol, timeframe = 'daily', outputSize = 'compact') {
    try {
      const cacheKey = `history:${symbol}:${timeframe}:${outputSize}`;
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      console.log(`ALALIZ.COM - Fetching historical data for ${symbol}`);
      await this.waitForRateLimit();

      const functionMap = {
        '1min': 'TIME_SERIES_INTRADAY',
        '5min': 'TIME_SERIES_INTRADAY',
        '15min': 'TIME_SERIES_INTRADAY',
        '30min': 'TIME_SERIES_INTRADAY',
        '60min': 'TIME_SERIES_INTRADAY',
        'daily': 'TIME_SERIES_DAILY',
        'weekly': 'TIME_SERIES_WEEKLY',
        'monthly': 'TIME_SERIES_MONTHLY'
      };

      const params = {
        function: functionMap[timeframe] || 'TIME_SERIES_DAILY',
        symbol: symbol,
        apikey: this.apiKey,
        outputsize: outputSize
      };

      if (timeframe.includes('min')) {
        params.interval = timeframe;
      }

      const response = await axios.get(`https://www.alphavantage.co/query`, { 
        params,
        timeout: 15000 
      });
      
      if (response.data['Error Message'] || response.data['Note']) {
        // Return mock historical data as fallback
        return this.getMockHistoricalData(symbol, timeframe);
      }

      const timeSeriesKey = Object.keys(response.data).find(key => 
        key.includes('Time Series')
      );
      
      if (!timeSeriesKey) {
        return this.getMockHistoricalData(symbol, timeframe);
      }

      const timeSeries = response.data[timeSeriesKey];
      const historicalData = Object.entries(timeSeries).map(([timestamp, data]) => ({
        timestamp: new Date(timestamp),
        open: parseFloat(data['1. open']),
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: parseFloat(data['4. close']),
        volume: parseInt(data['5. volume'] || 0)
      })).reverse();

      // Cache for 5 minutes
      await redis.set(cacheKey, JSON.stringify(historicalData), 300);
      
      return historicalData;

    } catch (error) {
      console.error('ALALIZ.COM - Error fetching historical data:', error.message);
      return this.getMockHistoricalData(symbol, timeframe);
    }
  }

  // Mock historical data for testing
  getMockHistoricalData(symbol, timeframe = 'daily') {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const data = [];
    const days = timeframe === 'daily' ? 30 : 100;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const randomFactor = 0.95 + Math.random() * 0.1; // ±5% variation
      const open = basePrice * randomFactor;
      const close = open * (0.98 + Math.random() * 0.04); // ±2% from open
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      
      data.push({
        timestamp: date,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: Math.floor(Math.random() * 1000000) + 100000
      });
    }
    
    return data;
  }

  // Search securities
  async searchSecurities(query) {
    try {
      const cacheKey = `search:${query}`;
      const cachedResults = await redis.get(cacheKey);
      if (cachedResults) {
        return JSON.parse(cachedResults);
      }

      console.log(`ALALIZ.COM - Searching securities for: ${query}`);
      await this.waitForRateLimit();

      const response = await axios.get(`https://www.alphavantage.co/query`, {
        params: {
          function: 'SYMBOL_SEARCH',
          keywords: query,
          apikey: this.apiKey
        },
        timeout: 10000
      });

      let results = [];
      if (response.data.bestMatches && response.data.bestMatches.length > 0) {
        results = response.data.bestMatches.map(match => ({
          symbol: match['1. symbol'],
          name: match['2. name'],
          type: match['3. type'],
          region: match['4. region'],
          currency: match['8. currency'],
          marketOpen: match['5. marketOpen'],
          marketClose: match['6. marketClose'],
          timezone: match['7. timezone']
        }));
      } else {
        // Return mock search results
        results = this.getMockSearchResults(query);
      }

      // Cache for 1 hour
      await redis.set(cacheKey, JSON.stringify(results), 3600);
      
      return results;
    } catch (error) {
      console.error('ALALIZ.COM - Error searching securities:', error.message);
      return this.getMockSearchResults(query);
    }
  }

  // Mock search results for demo
  getMockSearchResults(query) {
    const mockSecurities = [
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'TSLA', name: 'Tesla Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'META', name: 'Meta Platforms Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'NFLX', name: 'Netflix Inc.', type: 'Equity', region: 'United States', currency: 'USD' }
    ];

    return mockSecurities.filter(security => 
      security.symbol.toLowerCase().includes(query.toLowerCase()) ||
      security.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
  }

  // Store security in database
  async storeSecurity(securityData) {
    try {
      const existing = await db('securities').where({ symbol: securityData.symbol }).first();
      
      if (existing) {
        return existing;
      }

      const [security] = await db('securities')
        .insert({
          symbol: securityData.symbol,
          name: securityData.name,
          exchange: securityData.region || 'NASDAQ',
          security_type: securityData.type === 'Equity' ? 'stock' : 'other'
        })
        .returning('*');

      return security;
    } catch (error) {
      console.error('ALALIZ.COM - Error storing security:', error);
      throw error;
    }
  }

  // Store historical data in database
  async storeHistoricalData(symbol, timeframe, data) {
    try {
      const security = await db('securities').where({ symbol }).first();
      if (!security) {
        throw new Error(`Security ${symbol} not found`);
      }

      const records = data.map(candle => ({
        security_id: security.id,
        timestamp: candle.timestamp,
        open_price: candle.open,
        high_price: candle.high,
        low_price: candle.low,
        close_price: candle.close,
        volume: candle.volume,
        timeframe: timeframe
      }));

      return await db('market_data')
        .insert(records)
        .onConflict(['security_id', 'timestamp', 'timeframe'])
        .merge(['open_price', 'high_price', 'low_price', 'close_price', 'volume']);
    } catch (error) {
      console.error('ALALIZ.COM - Error storing historical data:', error);
      throw error;
    }
  }

  // Simulate real-time price updates
  startPriceSimulation(symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']) {
    console.log('ALALIZ.COM - Starting price simulation for:', symbols.join(', '));
    
    setInterval(async () => {
      for (const symbol of symbols) {
        try {
          const priceData = this.getMockPrice(symbol);
          
          // Emit price update event
          this.emit('priceUpdate', priceData);
          
          // Update cache
          await redis.set(`price:${symbol}`, JSON.stringify(priceData), 60);
        } catch (error) {
          console.error(`ALALIZ.COM - Error in price simulation for ${symbol}:`, error);
        }
      }
    }, 5000); // Update every 5 seconds
  }

  // Get market status
  getMarketStatus() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Simple market hours check (9:30 AM - 4:00 PM EST, Mon-Fri)
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = hour >= 9 && hour < 16;
    
    return {
      isOpen: isWeekday && isMarketHours,
      nextOpen: this.getNextMarketOpen(),
      nextClose: this.getNextMarketClose(),
      timezone: 'EST'
    };
  }

  getNextMarketOpen() {
    const now = new Date();
    const nextOpen = new Date(now);
    nextOpen.setHours(9, 30, 0, 0);
    
    if (now.getHours() >= 16 || now.getDay() === 0 || now.getDay() === 6) {
      // Market is closed, set to next weekday
      nextOpen.setDate(nextOpen.getDate() + 1);
      while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
        nextOpen.setDate(nextOpen.getDate() + 1);
      }
    }
    
    return nextOpen;
  }

  getNextMarketClose() {
    const now = new Date();
    const nextClose = new Date(now);
    nextClose.setHours(16, 0, 0, 0);
    
    if (now.getHours() >= 16) {
      nextClose.setDate(nextClose.getDate() + 1);
    }
    
    return nextClose;
  }
}

module.exports = new MarketDataService();