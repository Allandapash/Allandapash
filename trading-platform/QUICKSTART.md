# 🚀 ALALIZ.COM Quick Start Guide

**Get your trading platform running in minutes!**

## Prerequisites

Before starting, make sure you have:
- **Node.js 16+** installed
- **PostgreSQL** (optional - platform works with mock data)
- **Redis** (optional - improves performance)

## Quick Setup

### 1. Environment Configuration
```bash
# Copy the environment template
cp .env.example .env

# Edit the .env file with your settings (optional for demo)
nano .env
```

### 2. Start the Platform
```bash
# Run the automated startup script
./start.sh
```

The script will:
- ✅ Check system requirements
- ✅ Install dependencies
- ✅ Set up the database (if available)
- ✅ Start the API server

### 3. Test the Platform

Once running, you can test these endpoints:

**Health Check:**
```bash
curl http://localhost:5000/health
```

**Market Data:**
```bash
curl http://localhost:5000/api/market/prices
```

**Search Securities:**
```bash
curl "http://localhost:5000/api/market/search?q=apple"
```

**Register a User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trader@alaliz.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Trader"
  }'
```

## Manual Setup (Alternative)

If you prefer manual setup:

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup (Optional)
```bash
# Create database
createdb alaliz_trading_platform

# Run migrations
npm run migrate
```

### 4. Start Server
```bash
npm run dev
```

## Demo Mode Features

The platform includes demo/mock data so you can test without external APIs:

- **Mock Market Data** - Real-time price simulation for major stocks
- **Mock User System** - Complete authentication flow
- **Mock Portfolio Management** - Create and manage portfolios
- **Mock Trading** - Place orders and track positions

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Market Data
- `GET /api/market/prices` - Get current prices
- `GET /api/market/price/:symbol` - Get specific price
- `GET /api/market/history/:symbol` - Get historical data
- `GET /api/market/search` - Search securities

### Portfolio Management
- `GET /api/portfolio` - Get user portfolios
- `POST /api/portfolio` - Create new portfolio
- `GET /api/portfolio/:id` - Get portfolio details
- `GET /api/portfolio/:id/positions` - Get positions

### Trading
- `GET /api/trading/orders` - Get user orders
- `POST /api/trading/orders` - Create new order

## Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Change port in .env file
PORT=5001
```

**Database Connection Failed:**
The platform works without a database using mock data. For full functionality:
1. Install PostgreSQL
2. Create database: `createdb alaliz_trading_platform`
3. Update .env with correct database credentials

**Redis Connection Failed:**
Redis is optional. The platform will work without it but may be slower.

**Node.js Version Error:**
Upgrade to Node.js 16 or higher:
```bash
# Using nvm
nvm install 16
nvm use 16
```

### Getting Help

- 📧 Email: support@alaliz.com
- 📚 Full Documentation: README.md
- 🐛 Issues: Check console logs for detailed error messages

## Next Steps

Once the platform is running:

1. **Register a user account** via the API
2. **Create a portfolio** to manage investments
3. **Explore market data** endpoints
4. **Place demo orders** to test trading functionality
5. **Check the logs** to see real-time platform activity

---

**🎉 Congratulations! Your ALALIZ.COM trading platform is now running!**

*Advanced Trading Platform - Empowering Your Investment Journey*