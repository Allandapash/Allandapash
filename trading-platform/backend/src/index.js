const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const tradingRoutes = require('./routes/trading');
const marketDataRoutes = require('./routes/marketData');
const portfolioRoutes = require('./routes/portfolio');

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    platform: 'ALALIZ.COM',
    service: 'Trading Platform API',
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/market', marketDataRoutes);
app.use('/api/portfolio', portfolioRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error(error);
  res.status(error.status || 500).json({
    platform: 'ALALIZ.COM',
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    platform: 'ALALIZ.COM',
    error: 'Route not found' 
  });
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  logger.info(`ALALIZ.COM - Client connected: ${socket.id}`);
  
  socket.on('subscribe', (data) => {
    const { symbols, userId } = data;
    if (symbols && Array.isArray(symbols)) {
      const room = `market-${symbols.join('-')}`;
      socket.join(room);
      logger.info(`ALALIZ.COM - Socket ${socket.id} subscribed to ${room}`);
    }
    
    if (userId) {
      socket.join(`user-${userId}`);
      logger.info(`ALALIZ.COM - Socket ${socket.id} joined user room: user-${userId}`);
    }
  });
  
  socket.on('unsubscribe', (data) => {
    const { symbols } = data;
    if (symbols && Array.isArray(symbols)) {
      const room = `market-${symbols.join('-')}`;
      socket.leave(room);
      logger.info(`ALALIZ.COM - Socket ${socket.id} unsubscribed from ${room}`);
    }
  });
  
  socket.on('disconnect', (reason) => {
    logger.info(`ALALIZ.COM - Client disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('ALALIZ.COM - SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('ALALIZ.COM - Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('ALALIZ.COM - SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('ALALIZ.COM - Process terminated');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 ALALIZ.COM Trading Platform API running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  logger.info(`📊 Advanced Trading Platform - Empowering Your Investment Journey`);
});

module.exports = { app, io };