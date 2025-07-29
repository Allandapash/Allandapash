const knex = require('knex');
require('dotenv').config();

let db = null;
let isConnected = false;

const config = {
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'alaliz_trading_platform',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: '../../../database/migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: '../../../database/seeds'
  },
  acquireConnectionTimeout: 60000,
  asyncStackTraces: true
};

// Try to connect to database, but don't fail if it's not available
try {
  db = knex(config);

  // Test database connection
  db.raw('SELECT 1')
    .then(() => {
      console.log('🔗 ALALIZ.COM - Database connection established successfully');
      isConnected = true;
    })
    .catch((err) => {
      console.log('🟡 ALALIZ.COM - Database not available, using mock data mode');
      console.log('   Database features will use in-memory storage for demo purposes');
      isConnected = false;
    });

} catch (error) {
  console.log('🟡 ALALIZ.COM - Database initialization failed, using mock data mode');
  isConnected = false;
}

// Mock database for demo mode
const mockDb = {
  users: new Map(),
  portfolios: new Map(),
  securities: new Map(),
  positions: new Map(),
  orders: new Map(),
  transactions: new Map(),
  market_data: new Map(),
  counters: {
    users: 1,
    portfolios: 1,
    securities: 1,
    positions: 1,
    orders: 1,
    transactions: 1,
    market_data: 1
  }
};

// Database wrapper that falls back to mock data
const dbWrapper = {
  // Check if real database is available
  isConnected: () => isConnected,

  // Raw query method
  raw: async (query) => {
    if (isConnected && db) {
      return await db.raw(query);
    } else {
      // Mock response for raw queries
      return { rows: [{ '?column?': 1 }] };
    }
  },

  // Table method
  table: (tableName) => {
    if (isConnected && db) {
      return db(tableName);
    } else {
      // Return mock query builder
      return createMockQueryBuilder(tableName);
    }
  },

  // Direct table access
  [Symbol.for('table')]: (tableName) => {
    return dbWrapper.table(tableName);
  }
};

// Mock query builder for demo mode
function createMockQueryBuilder(tableName) {
  const mockData = mockDb[tableName] || new Map();
  
  return {
    select: (columns = '*') => ({
      where: (conditions) => ({
        first: async () => {
          for (const [id, record] of mockData) {
            let matches = true;
            for (const [key, value] of Object.entries(conditions)) {
              if (record[key] !== value) {
                matches = false;
                break;
              }
            }
            if (matches) return record;
          }
          return null;
        },
        orderBy: (column, direction = 'asc') => mockData.size > 0 ? Array.from(mockData.values()) : []
      }),
      first: async () => mockData.size > 0 ? mockData.values().next().value : null,
      orderBy: (column, direction = 'asc') => Array.from(mockData.values())
    }),

    where: (conditions) => ({
      first: async () => {
        for (const [id, record] of mockData) {
          let matches = true;
          for (const [key, value] of Object.entries(conditions)) {
            if (record[key] !== value) {
              matches = false;
              break;
            }
          }
          if (matches) return record;
        }
        return null;
      },
      select: (columns) => ({
        first: async () => {
          for (const [id, record] of mockData) {
            let matches = true;
            for (const [key, value] of Object.entries(conditions)) {
              if (record[key] !== value) {
                matches = false;
                break;
              }
            }
            if (matches) return record;
          }
          return null;
        }
      }),
      update: async (updateData) => {
        let updated = 0;
        for (const [id, record] of mockData) {
          let matches = true;
          for (const [key, value] of Object.entries(conditions)) {
            if (record[key] !== value) {
              matches = false;
              break;
            }
          }
          if (matches) {
            Object.assign(record, updateData);
            updated++;
          }
        }
        return updated;
      },
      del: async () => {
        let deleted = 0;
        for (const [id, record] of mockData) {
          let matches = true;
          for (const [key, value] of Object.entries(conditions)) {
            if (record[key] !== value) {
              matches = false;
              break;
            }
          }
          if (matches) {
            mockData.delete(id);
            deleted++;
          }
        }
        return deleted;
      }
    }),

    insert: async (data) => {
      const id = mockDb.counters[tableName]++;
      const record = { id, ...data, created_at: new Date(), updated_at: new Date() };
      mockData.set(id, record);
      return [record];
    },

    returning: (columns) => ({
      insert: async (data) => {
        const id = mockDb.counters[tableName]++;
        const record = { id, ...data, created_at: new Date(), updated_at: new Date() };
        mockData.set(id, record);
        return [record];
      }
    }),

    count: async (column = 'id') => {
      return [{ count: mockData.size.toString() }];
    },

    first: async () => mockData.size > 0 ? mockData.values().next().value : null,

    orderBy: (column, direction = 'asc') => Array.from(mockData.values())
  };
}

// Proxy to handle both real database and mock database calls
const dbProxy = new Proxy(dbWrapper, {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    }
    
    // Handle table calls like db('users')
    if (typeof prop === 'string') {
      return target.table(prop);
    }
    
    return target[prop];
  },
  
  apply(target, thisArg, argumentsList) {
    // Handle calls like db('users')
    if (argumentsList.length === 1 && typeof argumentsList[0] === 'string') {
      return target.table(argumentsList[0]);
    }
    return target.apply(thisArg, argumentsList);
  }
});

// Make the proxy callable
const callableDb = function(tableName) {
  return dbProxy.table(tableName);
};

// Copy all properties from dbProxy to callableDb
Object.setPrototypeOf(callableDb, dbProxy);
Object.assign(callableDb, dbProxy);

module.exports = callableDb;