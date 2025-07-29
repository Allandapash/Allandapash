const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const { auth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// Get all user portfolios
router.get('/', auth, async (req, res) => {
  try {
    console.log(`ALALIZ.COM - Fetching portfolios for user ${req.user.id}`);
    
    const portfolios = await Portfolio.findByUserId(req.user.id);
    
    // Get summary data for each portfolio
    const portfolioSummaries = await Promise.all(
      portfolios.map(async (portfolio) => {
        try {
          return await Portfolio.getPortfolioSummary(portfolio.id);
        } catch (error) {
          console.error(`ALALIZ.COM - Error getting summary for portfolio ${portfolio.id}:`, error);
          return portfolio; // Return basic portfolio data if summary fails
        }
      })
    );

    res.json({
      platform: 'ALALIZ.COM',
      portfolios: portfolioSummaries,
      count: portfolioSummaries.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Get portfolios error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch portfolios' 
    });
  }
});

// Create new portfolio
router.post('/', auth, validate(schemas.portfolio), async (req, res) => {
  try {
    const { name, description, initialBalance, currency } = req.body;
    
    console.log(`ALALIZ.COM - Creating portfolio "${name}" for user ${req.user.id}`);

    const portfolio = await Portfolio.create({
      userId: req.user.id,
      name,
      description,
      initialBalance,
      currency: currency || 'USD'
    });

    const portfolioSummary = await Portfolio.getPortfolioSummary(portfolio.id);

    res.status(201).json({
      platform: 'ALALIZ.COM',
      message: 'Portfolio created successfully',
      portfolio: portfolioSummary
    });
  } catch (error) {
    console.error('ALALIZ.COM - Create portfolio error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to create portfolio' 
    });
  }
});

// Get specific portfolio details
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const portfolio = await Portfolio.findById(id);
    
    if (!portfolio) {
      return res.status(404).json({ 
        platform: 'ALALIZ.COM',
        error: 'Portfolio not found' 
      });
    }

    // Check if user owns this portfolio
    if (portfolio.user_id !== req.user.id) {
      return res.status(403).json({ 
        platform: 'ALALIZ.COM',
        error: 'Access denied to this portfolio' 
      });
    }

    console.log(`ALALIZ.COM - Fetching details for portfolio ${id}`);
    
    const portfolioSummary = await Portfolio.getPortfolioSummary(id);

    res.json({
      platform: 'ALALIZ.COM',
      portfolio: portfolioSummary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Get portfolio details error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch portfolio details' 
    });
  }
});

// Update portfolio
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const portfolio = await Portfolio.findById(id);
    
    if (!portfolio) {
      return res.status(404).json({ 
        platform: 'ALALIZ.COM',
        error: 'Portfolio not found' 
      });
    }

    if (portfolio.user_id !== req.user.id) {
      return res.status(403).json({ 
        platform: 'ALALIZ.COM',
        error: 'Access denied to this portfolio' 
      });
    }

    console.log(`ALALIZ.COM - Updating portfolio ${id}`);

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const updatedPortfolio = await Portfolio.update(id, updateData);
    const portfolioSummary = await Portfolio.getPortfolioSummary(id);

    res.json({
      platform: 'ALALIZ.COM',
      message: 'Portfolio updated successfully',
      portfolio: portfolioSummary
    });
  } catch (error) {
    console.error('ALALIZ.COM - Update portfolio error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to update portfolio' 
    });
  }
});

// Get portfolio positions
router.get('/:id/positions', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const portfolio = await Portfolio.findById(id);
    
    if (!portfolio) {
      return res.status(404).json({ 
        platform: 'ALALIZ.COM',
        error: 'Portfolio not found' 
      });
    }

    if (portfolio.user_id !== req.user.id) {
      return res.status(403).json({ 
        platform: 'ALALIZ.COM',
        error: 'Access denied to this portfolio' 
      });
    }

    console.log(`ALALIZ.COM - Fetching positions for portfolio ${id}`);
    
    const positions = await Portfolio.getPositions(id);

    res.json({
      platform: 'ALALIZ.COM',
      positions,
      count: positions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Get positions error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch positions' 
    });
  }
});

// Get portfolio transactions
router.get('/:id/transactions', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const portfolio = await Portfolio.findById(id);
    
    if (!portfolio) {
      return res.status(404).json({ 
        platform: 'ALALIZ.COM',
        error: 'Portfolio not found' 
      });
    }

    if (portfolio.user_id !== req.user.id) {
      return res.status(403).json({ 
        platform: 'ALALIZ.COM',
        error: 'Access denied to this portfolio' 
      });
    }

    console.log(`ALALIZ.COM - Fetching transactions for portfolio ${id}`);
    
    const transactions = await Portfolio.getTransactions(id, parseInt(limit), parseInt(offset));

    res.json({
      platform: 'ALALIZ.COM',
      transactions,
      count: transactions.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Get transactions error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch transactions' 
    });
  }
});

// Get portfolio performance history
router.get('/:id/performance', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;
    
    const portfolio = await Portfolio.findById(id);
    
    if (!portfolio) {
      return res.status(404).json({ 
        platform: 'ALALIZ.COM',
        error: 'Portfolio not found' 
      });
    }

    if (portfolio.user_id !== req.user.id) {
      return res.status(403).json({ 
        platform: 'ALALIZ.COM',
        error: 'Access denied to this portfolio' 
      });
    }

    console.log(`ALALIZ.COM - Fetching performance for portfolio ${id}, ${days} days`);
    
    const performanceHistory = await Portfolio.getPerformanceHistory(id, parseInt(days));

    res.json({
      platform: 'ALALIZ.COM',
      performance: performanceHistory,
      days: parseInt(days),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Get performance error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch performance data' 
    });
  }
});

// Get portfolio allocation by sector
router.get('/:id/allocation/sectors', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const portfolio = await Portfolio.findById(id);
    
    if (!portfolio) {
      return res.status(404).json({ 
        platform: 'ALALIZ.COM',
        error: 'Portfolio not found' 
      });
    }

    if (portfolio.user_id !== req.user.id) {
      return res.status(403).json({ 
        platform: 'ALALIZ.COM',
        error: 'Access denied to this portfolio' 
      });
    }

    console.log(`ALALIZ.COM - Fetching sector allocation for portfolio ${id}`);
    
    const sectorAllocation = await Portfolio.getSectorAllocation(id);

    res.json({
      platform: 'ALALIZ.COM',
      allocation: sectorAllocation,
      type: 'sectors',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Get sector allocation error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch sector allocation' 
    });
  }
});

// Get portfolio allocation by security type
router.get('/:id/allocation/types', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const portfolio = await Portfolio.findById(id);
    
    if (!portfolio) {
      return res.status(404).json({ 
        platform: 'ALALIZ.COM',
        error: 'Portfolio not found' 
      });
    }

    if (portfolio.user_id !== req.user.id) {
      return res.status(403).json({ 
        platform: 'ALALIZ.COM',
        error: 'Access denied to this portfolio' 
      });
    }

    console.log(`ALALIZ.COM - Fetching security type allocation for portfolio ${id}`);
    
    const typeAllocation = await Portfolio.getSecurityTypeAllocation(id);

    res.json({
      platform: 'ALALIZ.COM',
      allocation: typeAllocation,
      type: 'security_types',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ALALIZ.COM - Get security type allocation error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to fetch security type allocation' 
    });
  }
});

// Deactivate portfolio
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const portfolio = await Portfolio.findById(id);
    
    if (!portfolio) {
      return res.status(404).json({ 
        platform: 'ALALIZ.COM',
        error: 'Portfolio not found' 
      });
    }

    if (portfolio.user_id !== req.user.id) {
      return res.status(403).json({ 
        platform: 'ALALIZ.COM',
        error: 'Access denied to this portfolio' 
      });
    }

    console.log(`ALALIZ.COM - Deactivating portfolio ${id}`);
    
    await Portfolio.deactivate(id);

    res.json({
      platform: 'ALALIZ.COM',
      message: 'Portfolio deactivated successfully'
    });
  } catch (error) {
    console.error('ALALIZ.COM - Deactivate portfolio error:', error);
    res.status(500).json({ 
      platform: 'ALALIZ.COM',
      error: 'Failed to deactivate portfolio' 
    });
  }
});

module.exports = router;