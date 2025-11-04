#!/bin/bash

# EC2 Deployment Script for Next.js Portfolio
# Run this on your EC2 instance after setting it up

echo "🚀 Starting deployment..."

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "Cannot detect OS. Assuming Ubuntu."
    OS=ubuntu
fi

# Update system
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    echo "📦 Detected Ubuntu/Debian. Using apt..."
    sudo apt update -y
    sudo apt install -y curl git
    
    # Install Node.js 20.x LTS (Ubuntu/Debian)
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
elif [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    echo "📦 Detected Amazon Linux/RHEL/CentOS. Using yum..."
    sudo yum update -y
    sudo yum install -y curl git
    
    # Install Node.js 20.x LTS (Amazon Linux/RHEL/CentOS)
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
else
    echo "⚠️  Unknown OS. Please install Node.js 18+ manually."
    exit 1
fi

# Install PM2 for process management
sudo npm install -g pm2

# Clone or pull your repository
if [ -d "AIPortfolio" ]; then
  echo "📦 Updating repository..."
  cd AIPortfolio
  git pull origin main
else
  echo "📦 Cloning repository..."
  git clone https://github.com/hatish2001/AIPortfolio.git
  cd AIPortfolio
fi

# Install dependencies
echo "📥 Installing dependencies..."
npm install --legacy-peer-deps

# Build the application
echo "🔨 Building application..."
npm run build

# Create .env file (you'll need to add your API keys)
if [ ! -f ".env" ]; then
  echo "📝 Creating .env file..."
  cat > .env << EOF
OPENAI_API_KEY=your-openai-api-key-here
PINECONE_API_KEY=your-pinecone-api-key-here
PINECONE_INDEX_NAME=portfolio-chatbot
NEXT_PUBLIC_APP_URL=http://your-ec2-ip-or-domain:3000
EOF
  echo "⚠️  Don't forget to edit .env with your actual API keys!"
fi

# Start the application with PM2
echo "🎯 Starting application with PM2..."
pm2 delete portfolio 2>/dev/null || true
pm2 start npm --name "portfolio" -- start
pm2 save
pm2 startup

echo "✅ Deployment complete!"
echo "🌐 Your app should be running on port 3000"
echo "📊 Check status: pm2 status"
echo "📋 View logs: pm2 logs portfolio"

