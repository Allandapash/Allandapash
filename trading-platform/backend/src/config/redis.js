const redis = require('redis');
require('dotenv').config();

let client = null;
let isConnected = false;

// Try to connect to Redis, but don't fail if it's not available
try {
  client = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
    retry_strategy: (options) => {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        console.log('🔄 ALALIZ.COM - Redis server not available, using in-memory cache');
        return false; // Don't retry
      }
      if (options.total_retry_time > 1000 * 10) {
        return false; // Stop retrying after 10 seconds
      }
      if (options.attempt > 3) {
        return false; // Stop after 3 attempts
      }
      return Math.min(options.attempt * 100, 3000);
    }
  });

  client.on('connect', () => {
    console.log('🔗 ALALIZ.COM - Redis client connected');
    isConnected = true;
  });

  client.on('error', (err) => {
    console.log('⚠️  ALALIZ.COM - Redis not available, using in-memory cache');
    isConnected = false;
  });

  client.on('ready', () => {
    console.log('✅ ALALIZ.COM - Redis client ready');
    isConnected = true;
  });

  client.on('reconnecting', () => {
    console.log('🔄 ALALIZ.COM - Redis client reconnecting');
  });

  // Connect to Redis (but don't fail if it's not available)
  client.connect().catch(() => {
    console.log('🟡 ALALIZ.COM - Redis server not available, continuing without Redis');
    isConnected = false;
  });

} catch (error) {
  console.log('🟡 ALALIZ.COM - Redis initialization failed, using in-memory cache');
  isConnected = false;
}

// In-memory cache fallback
const memoryCache = new Map();

// Helper functions with fallback to in-memory cache
const redisHelpers = {
  async get(key) {
    try {
      if (isConnected && client) {
        return await client.get(key);
      } else {
        return memoryCache.get(key) || null;
      }
    } catch (error) {
      console.log('ALALIZ.COM - Redis GET error, using memory cache:', error.message);
      return memoryCache.get(key) || null;
    }
  },

  async set(key, value, ttl = 3600) {
    try {
      if (isConnected && client) {
        return await client.setEx(key, ttl, value);
      } else {
        memoryCache.set(key, value);
        // Simple TTL implementation for memory cache
        setTimeout(() => {
          memoryCache.delete(key);
        }, ttl * 1000);
        return true;
      }
    } catch (error) {
      console.log('ALALIZ.COM - Redis SET error, using memory cache:', error.message);
      memoryCache.set(key, value);
      setTimeout(() => {
        memoryCache.delete(key);
      }, ttl * 1000);
      return true;
    }
  },

  async del(key) {
    try {
      if (isConnected && client) {
        return await client.del(key);
      } else {
        return memoryCache.delete(key);
      }
    } catch (error) {
      console.log('ALALIZ.COM - Redis DEL error, using memory cache:', error.message);
      return memoryCache.delete(key);
    }
  },

  async exists(key) {
    try {
      if (isConnected && client) {
        return await client.exists(key);
      } else {
        return memoryCache.has(key);
      }
    } catch (error) {
      console.log('ALALIZ.COM - Redis EXISTS error, using memory cache:', error.message);
      return memoryCache.has(key);
    }
  },

  async hset(key, field, value) {
    try {
      if (isConnected && client) {
        return await client.hSet(key, field, value);
      } else {
        if (!memoryCache.has(key)) {
          memoryCache.set(key, {});
        }
        const hash = memoryCache.get(key);
        hash[field] = value;
        return true;
      }
    } catch (error) {
      console.log('ALALIZ.COM - Redis HSET error, using memory cache:', error.message);
      if (!memoryCache.has(key)) {
        memoryCache.set(key, {});
      }
      const hash = memoryCache.get(key);
      hash[field] = value;
      return true;
    }
  },

  async hget(key, field) {
    try {
      if (isConnected && client) {
        return await client.hGet(key, field);
      } else {
        const hash = memoryCache.get(key);
        return hash ? hash[field] : null;
      }
    } catch (error) {
      console.log('ALALIZ.COM - Redis HGET error, using memory cache:', error.message);
      const hash = memoryCache.get(key);
      return hash ? hash[field] : null;
    }
  },

  async hgetall(key) {
    try {
      if (isConnected && client) {
        return await client.hGetAll(key);
      } else {
        return memoryCache.get(key) || {};
      }
    } catch (error) {
      console.log('ALALIZ.COM - Redis HGETALL error, using memory cache:', error.message);
      return memoryCache.get(key) || {};
    }
  }
};

module.exports = { client, ...redisHelpers };