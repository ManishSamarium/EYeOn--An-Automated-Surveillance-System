#!/bin/bash
# Setup script for Unix/Linux/Mac

echo "================================"
echo "EYeOn Setup Script"
echo "================================"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed. Please install from https://nodejs.org"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python not installed. Please install from https://python.org"
    exit 1
fi
echo "✅ Python $(python3 --version)"

# Backend Setup
echo ""
echo "Setting up Backend..."
cd backend

echo "Installing Node dependencies..."
npm install

echo "Installing Python dependencies..."
pip3 install -r ../requirements.txt

echo "✅ Backend setup complete"

# Frontend Setup
echo ""
echo "Setting up Frontend..."
cd ../frontend

echo "Installing dependencies..."
npm install

echo "✅ Frontend setup complete"

echo ""
echo "================================"
echo "Setup Complete!"
echo "================================"
echo ""
echo "Start backend:  cd backend && npm run dev"
echo "Start frontend: cd frontend && npm run dev"
echo ""
echo "Open http://localhost:5173 in your browser"
