# 🚀 Run ALALIZ.COM Trading Platform

## Quick Start (Recommended)

**Option 1: Automated Startup**
```bash
# From the trading-platform directory
./start.sh
```

**Option 2: Manual Startup**
```bash
# From the trading-platform directory
cd backend
npm install
npm run dev
```

## What You'll See

When the platform starts successfully, you'll see:

```
🚀 ALALIZ.COM Trading Platform API running on port 5000 in development mode
📊 Advanced Trading Platform - Empowering Your Investment Journey
```

## Test the Platform

### 1. Health Check
```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "platform": "ALALIZ.COM",
  "service": "Trading Platform API",
  "status": "healthy",
  "timestamp": "2024-...",
  "uptime": 1.234,
  "version": "1.0.0"
}
```

### 2. Market Data
```bash
curl http://localhost:5000/api/market/prices
```

**Expected Response:**
```json
{
  "platform": "ALALIZ.COM",
  "data": [
    {
      "symbol": "AAPL",
      "price": 175.23,
      "change": 2.15,
      "changePercent": 1.24,
      "volume": 234567,
      "source": "mock_data"
    },
    ...
  ]
}
```

### 3. Search Securities
```bash
curl "http://localhost:5000/api/market/search?q=apple"
```

### 4. Register User
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

### 5. Login User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trader@alaliz.com",
    "password": "SecurePass123!"
  }'
```

**Save the token from the response for authenticated requests!**

### 6. Create Portfolio (Authenticated)
```bash
curl -X POST http://localhost:5000/api/portfolio \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "My First Portfolio",
    "description": "Demo portfolio for testing",
    "initialBalance": 10000
  }'
```

## Available Endpoints

### Public Endpoints (No Authentication)
- `GET /health` - Platform health check
- `GET /api/market/prices` - Current market prices
- `GET /api/market/price/:symbol` - Specific symbol price
- `GET /api/market/history/:symbol` - Historical data
- `GET /api/market/search?q=query` - Search securities
- `GET /api/market/status` - Market status
- `GET /api/market/movers` - Top gainers/losers
- `GET /api/market/trending` - Trending stocks
- `GET /api/market/indices` - Market indices

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/refresh` - Refresh token (requires auth)
- `PUT /api/auth/profile` - Update profile (requires auth)
- `PUT /api/auth/password` - Change password (requires auth)

### Portfolio Endpoints (Require Authentication)
- `GET /api/portfolio` - Get user portfolios
- `POST /api/portfolio` - Create new portfolio
- `GET /api/portfolio/:id` - Get portfolio details
- `PUT /api/portfolio/:id` - Update portfolio
- `GET /api/portfolio/:id/positions` - Get positions
- `GET /api/portfolio/:id/transactions` - Get transactions
- `GET /api/portfolio/:id/performance` - Get performance data
- `DELETE /api/portfolio/:id` - Deactivate portfolio

### Trading Endpoints (Require Authentication)
- `GET /api/trading/orders` - Get user orders
- `POST /api/trading/orders` - Create new order (demo mode)

## Demo Mode Features

The platform runs in demo mode by default with:

✅ **Mock Market Data** - Real-time price simulation for major stocks  
✅ **In-Memory Database** - No PostgreSQL required  
✅ **In-Memory Cache** - No Redis required  
✅ **Complete API** - All endpoints functional  
✅ **Authentication** - Full JWT-based auth system  
✅ **Portfolio Management** - Create and manage portfolios  
✅ **Market Data** - Search, prices, historical data  

## Production Setup

For production use:

1. **Set up PostgreSQL database**
2. **Set up Redis cache**
3. **Get real API keys** (Alpha Vantage, Finnhub, etc.)
4. **Update .env file** with production values
5. **Run database migrations**

## Troubleshooting

### Common Issues

**"Port 5000 already in use"**
- Change `PORT=5001` in .env file

**"Cannot find module"**
- Run `npm install` in the backend directory

**"Database connection failed"**
- This is normal in demo mode - platform works without database

**"Redis connection failed"**
- This is normal in demo mode - platform works without Redis

## Next Steps

1. **Explore the API** using the curl commands above
2. **Build a frontend** to interact with the API
3. **Add real market data** by getting API keys
4. **Set up database** for persistent storage
5. **Deploy to production** using Docker

---

**🎉 Your ALALIZ.COM trading platform is ready!**

*Advanced Trading Platform - Empowering Your Investment Journey*