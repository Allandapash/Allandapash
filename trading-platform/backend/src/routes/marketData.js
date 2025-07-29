const express = require('express');
const router = express.Router();
const MarketDataService = require('../services/MarketDataService');
const { auth, optionalAuth } = require('../middleware/auth');
const { validateQuery, schemas } = require('../middleware/validation');
const Joi = require('joi');

// Query validation schemas
const priceQuerySchema = Joi.object({
  symbols: Joi.string().optional()
});

const historyQuerySchema = Joi.object({
  timeframe: Joi.string().valid('1min', '5min', '15min', '30min', '60min', 'daily', 'weekly', 'monthly').default('daily'),
  outputSize: Joi.string().valid('compact', 'full').default('compact')
});

const searchQuerySchema = Joi.object({
  q: Joi.string().min(1).max(50).required()
});

// Get current price for a symbol
router.get('/price/:symbol', optionalAuth, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol || symbol.length > 10) {
      return res.status(400).json({ 
        platform: 'ALALIZ.COM',
        error: 'Invalid symbol provided' 
      });
    }

    console.log(`ALALIZ.COM - Price request for ${symbol.toUpperCase()}`);
    const priceData = await MarketDataService.getCurrentPrice(symbol.toUpperCase());
    
    res.json({
      platform: 'ALALIZ.COM',
      data: priceData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Price fetch error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch price data' 
    });
  }
});

// Get current prices for multiple symbols
router.get('/prices', optionalAuth, validateQuery(priceQuerySchema), async (req, res) => {
  try {
    const { symbols } = req.query;
    const symbolList = symbols ? symbols.split(',').map(s => s.trim().toUpperCase()) : ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
    
    if (symbolList.length > 20) {
      return res.status(400).json({ 
        platform: 'ALALIZ.COM',
        error: 'Maximum 20 symbols allowed per request' 
      });
    }

    console.log(`ALALIZ.COM - Batch price request for: ${symbolList.join(', ')}`);
    
    const pricePromises = symbolList.map(symbol => 
      MarketDataService.getCurrentPrice(symbol).catch(error => ({
        symbol,
        error: error.message
      }))
    );
    
    const prices = await Promise.all(pricePromises);
    
    res.json({
      platform: 'ALALIZ.COM',
      data: prices,
      count: prices.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Batch price fetch error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch price data' 
    });
  }
});

// Get historical data for a symbol
router.get('/history/:symbol', optionalAuth, validateQuery(historyQuerySchema), async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe, outputSize } = req.query;
    
    if (!symbol || symbol.length > 10) {
      return res.status(400).json({ 
        platform: 'ALALIZ.COM',
        error: 'Invalid symbol provided' 
      });
    }

    console.log(`ALALIZ.COM - Historical data request for ${symbol.toUpperCase()}, timeframe: ${timeframe}`);
    
    const historicalData = await MarketDataService.getHistoricalData(
      symbol.toUpperCase(), 
      timeframe, 
      outputSize
    );
    
    res.json({
      platform: 'ALALIZ.COM',
      symbol: symbol.toUpperCase(),
      timeframe,
      data: historicalData,
      count: historicalData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Historical data error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch historical data' 
    });
  }
});

// Search securities
router.get('/search', optionalAuth, validateQuery(searchQuerySchema), async (req, res) => {
  try {
    const { q } = req.query;
    
    console.log(`ALALIZ.COM - Security search for: "${q}"`);
    const results = await MarketDataService.searchSecurities(q);

    res.json({
      platform: 'ALALIZ.COM',
      query: q,
      results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Search error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to search securities' 
    });
  }
});

// Get market status
router.get('/status', optionalAuth, async (req, res) => {
  try {
    const marketStatus = MarketDataService.getMarketStatus();
    
    res.json({
      platform: 'ALALIZ.COM',
      market: marketStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Market status error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch market status' 
    });
  }
});

// Get top movers (mock data for demo)
router.get('/movers', optionalAuth, async (req, res) => {
  try {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'];
    
    const pricePromises = symbols.map(symbol => 
      MarketDataService.getCurrentPrice(symbol)
    );
    
    const prices = await Promise.all(pricePromises);
    
    // Sort by absolute change percentage
    const gainers = prices
      .filter(p => p.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);
      
    const losers = prices
      .filter(p => p.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5);
    
    const mostActive = prices
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
    
    res.json({
      platform: 'ALALIZ.COM',
      data: {
        gainers,
        losers,
        mostActive
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Market movers error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch market movers' 
    });
  }
});

// Add security to database (authenticated users only)
router.post('/securities', auth, async (req, res) => {
  try {
    const { symbol, name, exchange, sector, industry, securityType } = req.body;
    
    if (!symbol || !name) {
      return res.status(400).json({ 
        platform: 'ALALIZ.COM',
        error: 'Symbol and name are required' 
      });
    }

    const security = await MarketDataService.storeSecurity({
      symbol: symbol.toUpperCase(),
      name,
      region: exchange,
      type: securityType || 'Equity'
    });

    res.status(201).json({
      platform: 'ALALIZ.COM',
      message: 'Security added successfully',
      data: security
    });
  } catch (error) {
    console.error('ALALIZ.COM - Add security error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to add security' 
    });
  }
});

// Get trending symbols (mock data)
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const trendingSymbols = ['AAPL', 'TSLA', 'NVDA', 'GOOGL', 'MSFT'];
    
    const pricePromises = trendingSymbols.map(symbol => 
      MarketDataService.getCurrentPrice(symbol)
    );
    
    const trendingData = await Promise.all(pricePromises);
    
    res.json({
      platform: 'ALALIZ.COM',
      trending: trendingData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Trending data error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch trending data' 
    });
  }
});

// Get market indices
router.get('/indices', optionalAuth, async (req, res) => {
  try {
    const indices = ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI'];
    
    const pricePromises = indices.map(symbol => 
      MarketDataService.getCurrentPrice(symbol)
    );
    
    const indicesData = await Promise.all(pricePromises);
    
    res.json({
      platform: 'ALALIZ.COM',
      indices: indicesData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Indices data error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch indices data' 
    });
  }
});

module.exports = router;