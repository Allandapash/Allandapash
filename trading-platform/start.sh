#!/bin/bash

# ALALIZ.COM Trading Platform Startup Script
echo "🚀 Starting ALALIZ.COM Trading Platform..."
echo "📊 Advanced Trading Platform - Empowering Your Investment Journey"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[ALALIZ.COM]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env file created from template"
        print_warning "Please edit .env file with your configuration before continuing"
        exit 1
    else
        print_error ".env.example file not found"
        exit 1
    fi
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16+ is required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js $(node --version) detected"

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL client not found. Make sure PostgreSQL is installed and running."
fi

# Check if Redis is running (optional)
if ! command -v redis-cli &> /dev/null; then
    print_warning "Redis client not found. Redis is recommended for optimal performance."
fi

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend

if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -eq 0 ]; then
        print_success "Backend dependencies installed"
    else
        print_error "Failed to install backend dependencies"
        exit 1
    fi
else
    print_success "Backend dependencies already installed"
fi

# Create logs directory
mkdir -p logs

# Check database connection and run migrations
print_status "Checking database connection..."

# Source environment variables
set -a
source ../.env
set +a

# Test database connection
if command -v psql &> /dev/null; then
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" &> /dev/null
    if [ $? -eq 0 ]; then
        print_success "Database connection successful"
        
        # Run migrations
        print_status "Running database migrations..."
        npm run migrate
        if [ $? -eq 0 ]; then
            print_success "Database migrations completed"
        else
            print_warning "Database migrations failed or already up to date"
        fi
    else
        print_warning "Could not connect to database. Please check your database configuration."
        print_warning "The platform will start but may not function properly without a database."
    fi
fi

# Start the backend server
print_status "Starting ALALIZ.COM Trading Platform API..."
echo ""
echo "🌐 API Server will be available at: http://localhost:${PORT:-5000}"
echo "📊 Health Check: http://localhost:${PORT:-5000}/health"
echo "📚 Market Data: http://localhost:${PORT:-5000}/api/market/prices"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm run dev