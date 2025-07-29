const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const [user] = await db('users')
      .insert({
        email: userData.email,
        password_hash: hashedPassword,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone
      })
      .returning(['id', 'email', 'first_name', 'last_name', 'phone', 'role', 'created_at']);
    return user;
  }

  static async findByEmail(email) {
    return await db('users')
      .where({ email: email.toLowerCase() })
      .first();
  }

  static async findById(id) {
    return await db('users')
      .where({ id })
      .select(['id', 'email', 'first_name', 'last_name', 'phone', 'role', 'is_active', 'is_verified'])
      .first();
  }

  static async update(id, updateData) {
    const [user] = await db('users')
      .where({ id })
      .update({
        ...updateData,
        updated_at: db.fn.now()
      })
      .returning(['id', 'email', 'first_name', 'last_name', 'phone', 'role', 'updated_at']);
    return user;
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    return await db('users')
      .where({ id })
      .update({
        password_hash: hashedPassword,
        updated_at: db.fn.now()
      });
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async activate(id) {
    return await db('users')
      .where({ id })
      .update({
        is_active: true,
        updated_at: db.fn.now()
      });
  }

  static async deactivate(id) {
    return await db('users')
      .where({ id })
      .update({
        is_active: false,
        updated_at: db.fn.now()
      });
  }

  static async verify(id) {
    return await db('users')
      .where({ id })
      .update({
        is_verified: true,
        updated_at: db.fn.now()
      });
  }

  static async getAll(filters = {}) {
    let query = db('users')
      .select(['id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'is_verified', 'created_at']);

    if (filters.role) {
      query = query.where('role', filters.role);
    }

    if (filters.is_active !== undefined) {
      query = query.where('is_active', filters.is_active);
    }

    if (filters.search) {
      query = query.where(function() {
        this.where('first_name', 'ilike', `%${filters.search}%`)
          .orWhere('last_name', 'ilike', `%${filters.search}%`)
          .orWhere('email', 'ilike', `%${filters.search}%`);
      });
    }

    return await query.orderBy('created_at', 'desc');
  }

  static async delete(id) {
    return await db('users')
      .where({ id })
      .del();
  }

  static async exists(email) {
    const user = await db('users')
      .where({ email: email.toLowerCase() })
      .select('id')
      .first();
    return !!user;
  }

  // Get user statistics
  static async getStats(userId) {
    const portfolioCount = await db('portfolios')
      .where({ user_id: userId, is_active: true })
      .count('id as count')
      .first();

    const totalOrderCount = await db('orders')
      .where({ user_id: userId })
      .count('id as count')
      .first();

    const activeOrderCount = await db('orders')
      .where({ user_id: userId, status: 'pending' })
      .count('id as count')
      .first();

    return {
      portfolios: parseInt(portfolioCount.count),
      totalOrders: parseInt(totalOrderCount.count),
      activeOrders: parseInt(activeOrderCount.count)
    };
  }
}

module.exports = User;