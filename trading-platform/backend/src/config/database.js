const knex = require('knex');
require('dotenv').config();

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

const db = knex(config);

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    console.log('🔗 ALALIZ.COM - Database connection established successfully');
  })
  .catch((err) => {
    console.error('❌ ALALIZ.COM - Database connection failed:', err);
    process.exit(1);
  });

module.exports = db;