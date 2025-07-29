const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

client.on('connect', () => {
  console.log('🔗 ALALIZ.COM - Redis client connected');
});

client.on('error', (err) => {
  console.error('❌ ALALIZ.COM - Redis client error:', err);
});

client.on('ready', () => {
  console.log('✅ ALALIZ.COM - Redis client ready');
});

client.on('reconnecting', () => {
  console.log('🔄 ALALIZ.COM - Redis client reconnecting');
});

// Connect to Redis
client.connect().catch(console.error);

// Helper functions
const redisHelpers = {
  async get(key) {
    try {
      return await client.get(key);
    } catch (error) {
      console.error('ALALIZ.COM - Redis GET error:', error);
      return null;
    }
  },

  async set(key, value, ttl = 3600) {
    try {
      return await client.setEx(key, ttl, value);
    } catch (error) {
      console.error('ALALIZ.COM - Redis SET error:', error);
      return false;
    }
  },

  async del(key) {
    try {
      return await client.del(key);
    } catch (error) {
      console.error('ALALIZ.COM - Redis DEL error:', error);
      return false;
    }
  },

  async exists(key) {
    try {
      return await client.exists(key);
    } catch (error) {
      console.error('ALALIZ.COM - Redis EXISTS error:', error);
      return false;
    }
  },

  async hset(key, field, value) {
    try {
      return await client.hSet(key, field, value);
    } catch (error) {
      console.error('ALALIZ.COM - Redis HSET error:', error);
      return false;
    }
  },

  async hget(key, field) {
    try {
      return await client.hGet(key, field);
    } catch (error) {
      console.error('ALALIZ.COM - Redis HGET error:', error);
      return null;
    }
  },

  async hgetall(key) {
    try {
      return await client.hGetAll(key);
    } catch (error) {
      console.error('ALALIZ.COM - Redis HGETALL error:', error);
      return {};
    }
  }
};

module.exports = { client, ...redisHelpers };