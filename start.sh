#!/bin/bash

# Quick start script for MCP + Express servers

echo "🚀 Starting MCP Integration Servers..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Creating .env from template..."
    cat > .env << 'EOF'
# OpenAI API Key (REQUIRED)
OPENAI_API_KEY=your_openai_api_key_here

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_ENDPOINT=http://localhost:7200

# Server Ports
EXPRESS_PORT=3001
MCP_PORT=3002
EOF
    echo ""
    echo "✅ Created .env file"
    echo "⚠️  Please edit .env and add your credentials before continuing!"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the servers
echo ""
echo "Starting Express + MCP servers..."
echo "Press Ctrl+C to stop"
echo ""

npm run dev

