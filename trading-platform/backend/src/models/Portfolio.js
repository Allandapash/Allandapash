const db = require('../config/database');

class Portfolio {
  static async create(portfolioData) {
    const [portfolio] = await db('portfolios')
      .insert({
        user_id: portfolioData.userId,
        name: portfolioData.name,
        description: portfolioData.description,
        initial_balance: portfolioData.initialBalance,
        current_balance: portfolioData.initialBalance,
        currency: portfolioData.currency || 'USD'
      })
      .returning('*');
    return portfolio;
  }

  static async findById(id) {
    return await db('portfolios')
      .where({ id })
      .first();
  }

  static async findByUserId(userId) {
    return await db('portfolios')
      .where({ user_id: userId, is_active: true })
      .select('*')
      .orderBy('created_at', 'desc');
  }

  static async update(id, updateData) {
    const [portfolio] = await db('portfolios')
      .where({ id })
      .update({
        ...updateData,
        updated_at: db.fn.now()
      })
      .returning('*');
    return portfolio;
  }

  static async updateBalance(portfolioId, newBalance) {
    return await db('portfolios')
      .where({ id: portfolioId })
      .update({ 
        current_balance: newBalance,
        updated_at: db.fn.now()
      });
  }

  static async getPortfolioValue(portfolioId) {
    const result = await db('positions')
      .join('securities', 'positions.security_id', 'securities.id')
      .where('positions.portfolio_id', portfolioId)
      .sum('positions.market_value as total_value')
      .first();
    
    return parseFloat(result.total_value) || 0;
  }

  static async getPortfolioSummary(portfolioId) {
    const portfolio = await this.findById(portfolioId);
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    // Get total portfolio value (cash + positions)
    const positionsValue = await this.getPortfolioValue(portfolioId);
    const totalValue = parseFloat(portfolio.current_balance) + positionsValue;

    // Get positions count
    const positionsCount = await db('positions')
      .where({ portfolio_id: portfolioId })
      .count('id as count')
      .first();

    // Get total P&L
    const totalPnL = totalValue - parseFloat(portfolio.initial_balance);
    const totalPnLPercent = portfolio.initial_balance > 0 
      ? (totalPnL / parseFloat(portfolio.initial_balance)) * 100 
      : 0;

    // Get unrealized P&L from positions
    const unrealizedPnL = await db('positions')
      .where({ portfolio_id: portfolioId })
      .sum('unrealized_pnl as total')
      .first();

    // Get realized P&L from transactions
    const realizedPnL = await db('transactions')
      .where({ portfolio_id: portfolioId })
      .where('transaction_type', 'in', ['buy', 'sell'])
      .select(
        db.raw(`
          SUM(CASE 
            WHEN transaction_type = 'sell' THEN amount - fee
            WHEN transaction_type = 'buy' THEN -(amount + fee)
            ELSE 0 
          END) as realized_pnl
        `)
      )
      .first();

    return {
      ...portfolio,
      total_value: totalValue,
      positions_value: positionsValue,
      positions_count: parseInt(positionsCount.count),
      total_pnl: totalPnL,
      total_pnl_percent: totalPnLPercent,
      unrealized_pnl: parseFloat(unrealizedPnL.total) || 0,
      realized_pnl: parseFloat(realizedPnL.realized_pnl) || 0
    };
  }

  static async getPositions(portfolioId) {
    return await db('positions')
      .join('securities', 'positions.security_id', 'securities.id')
      .where('positions.portfolio_id', portfolioId)
      .select(
        'positions.*',
        'securities.symbol',
        'securities.name',
        'securities.exchange',
        'securities.sector',
        'securities.security_type'
      )
      .orderBy('positions.market_value', 'desc');
  }

  static async getTransactions(portfolioId, limit = 50, offset = 0) {
    return await db('transactions')
      .join('securities', 'transactions.security_id', 'securities.id')
      .leftJoin('orders', 'transactions.order_id', 'orders.id')
      .where('transactions.portfolio_id', portfolioId)
      .select(
        'transactions.*',
        'securities.symbol',
        'securities.name',
        'orders.order_type',
        'orders.side'
      )
      .orderBy('transactions.executed_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  static async getPerformanceHistory(portfolioId, days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily portfolio values based on transactions
    const dailyValues = await db('transactions')
      .where('portfolio_id', portfolioId)
      .where('executed_at', '>=', startDate)
      .where('executed_at', '<=', endDate)
      .select(
        db.raw('DATE(executed_at) as date'),
        db.raw('SUM(CASE WHEN transaction_type = \'buy\' THEN -amount ELSE amount END) as net_flow')
      )
      .groupBy(db.raw('DATE(executed_at)'))
      .orderBy('date');

    return dailyValues;
  }

  static async delete(id) {
    // Check if portfolio has active positions
    const activePositions = await db('positions')
      .where({ portfolio_id: id })
      .where('quantity', '>', 0)
      .count('id as count')
      .first();

    if (parseInt(activePositions.count) > 0) {
      throw new Error('Cannot delete portfolio with active positions');
    }

    return await db('portfolios')
      .where({ id })
      .del();
  }

  static async deactivate(id) {
    return await db('portfolios')
      .where({ id })
      .update({
        is_active: false,
        updated_at: db.fn.now()
      });
  }

  static async activate(id) {
    return await db('portfolios')
      .where({ id })
      .update({
        is_active: true,
        updated_at: db.fn.now()
      });
  }

  // Get portfolio allocation by sector
  static async getSectorAllocation(portfolioId) {
    return await db('positions')
      .join('securities', 'positions.security_id', 'securities.id')
      .where('positions.portfolio_id', portfolioId)
      .where('positions.quantity', '>', 0)
      .select(
        'securities.sector',
        db.raw('SUM(positions.market_value) as total_value'),
        db.raw('COUNT(*) as positions_count')
      )
      .groupBy('securities.sector')
      .orderBy('total_value', 'desc');
  }

  // Get portfolio allocation by security type
  static async getSecurityTypeAllocation(portfolioId) {
    return await db('positions')
      .join('securities', 'positions.security_id', 'securities.id')
      .where('positions.portfolio_id', portfolioId)
      .where('positions.quantity', '>', 0)
      .select(
        'securities.security_type',
        db.raw('SUM(positions.market_value) as total_value'),
        db.raw('COUNT(*) as positions_count')
      )
      .groupBy('securities.security_type')
      .orderBy('total_value', 'desc');
  }
}

module.exports = Portfolio;