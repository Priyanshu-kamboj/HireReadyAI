#!/bin/bash

# 🚀 HireReady AI - Quick Setup Script
# This script sets up your development environment

echo "=================================="
echo "🎓 HireReady AI - Quick Setup"
echo "=================================="
echo ""

# Check Python
echo "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9+"
    exit 1
fi
echo "✅ Python found: $(python3 --version)"

# Check Node.js
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+"
    exit 1
fi
echo "✅ Node.js found: $(node --version)"

# Check MongoDB
echo "Checking MongoDB installation..."
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not found locally. You can use MongoDB Atlas instead."
    echo "   Get connection string from: https://www.mongodb.com/cloud/atlas"
else
    echo "✅ MongoDB found: $(mongod --version | head -n 1)"
fi

echo ""
echo "=================================="
echo "📦 Installing Backend Dependencies"
echo "=================================="

cd app/backend || exit

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

# Install dependencies
echo "Installing Python packages..."
pip install -r requirements.txt

# Setup .env
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit app/backend/.env with your API keys!"
else
    echo "✅ .env file already exists"
fi

cd ../..

echo ""
echo "=================================="
echo "🎨 Installing Frontend Dependencies"
echo "=================================="

cd app/frontend || exit

echo "Installing npm packages..."
npm install

# Setup frontend .env
if [ ! -f .env ]; then
    echo "Creating frontend .env..."
    echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env
    echo "✅ Frontend .env created"
else
    echo "✅ Frontend .env already exists"
fi

cd ../..

echo ""
echo "=================================="
echo "✅ Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Get your API keys:"
echo "   - OpenAI: https://platform.openai.com/api-keys"
echo "   - Razorpay: https://dashboard.razorpay.com/app/keys"
echo ""
echo "2. Edit app/backend/.env and add:"
echo "   - OPENAI_API_KEY"
echo "   - RAZORPAY_KEY_ID"
echo "   - RAZORPAY_KEY_SECRET"
echo "   - MONGO_URL (if using Atlas)"
echo ""
echo "3. Start MongoDB (if local):"
echo "   mongod --dbpath /path/to/data"
echo ""
echo "4. Start backend (Terminal 1):"
echo "   cd app/backend"
echo "   source venv/bin/activate  # On Windows: venv\\Scripts\\activate"
echo "   uvicorn server:app --reload"
echo ""
echo "5. Start frontend (Terminal 2):"
echo "   cd app/frontend"
echo "   npm start"
echo ""
echo "6. Open browser:"
echo "   http://localhost:3000"
echo ""
echo "=================================="
echo "📚 Documentation:"
echo "   - README.md - Overview"
echo "   - DEPLOYMENT_GUIDE.md - Production deployment"
echo "   - CHANGES_MADE.md - Recent updates"
echo "=================================="
