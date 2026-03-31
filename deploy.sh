#!/bin/bash

# Deployment Script for Chat App
echo "🚀 Chat App Deployment Script"
echo "================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your MongoDB URI and other settings."
    echo "📋 Required variables to set:"
    echo "   - MONGODB_URI (your MongoDB connection string)"
    echo "   - SESSION_SECRET (random secure string)"
    echo "   - NODE_ENV=production"
    echo ""
    echo "⚠️  Please edit the .env file and run this script again."
    exit 1
fi

# Check if MongoDB URI is set
if grep -q "mongodb+srv://username:password" .env; then
    echo "❌ Please update the MongoDB URI in .env file with your actual connection string!"
    exit 1
fi

# Check if session secret is default
if grep -q "your-secret-key-here" .env; then
    echo "❌ Please update the SESSION_SECRET in .env file with a secure random string!"
    echo "💡 You can generate one with: openssl rand -base64 32"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🎯 Choose deployment platform:"
echo "1) Heroku"
echo "2) Vercel"
echo "3) Railway"
echo "4) Local production server"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo "🔧 Deploying to Heroku..."
        
        # Check if Heroku CLI is installed
        if ! command -v heroku &> /dev/null; then
            echo "❌ Heroku CLI not found. Please install it first:"
            echo "   npm install -g heroku"
            exit 1
        fi
        
        echo "📝 Creating Heroku app..."
        heroku create
        
        echo "⚙️  Setting environment variables..."
        heroku config:set NODE_ENV=production
        heroku config:set MONGODB_URI=$(grep MONGODB_URI .env | cut -d '=' -f2)
        heroku config:set SESSION_SECRET=$(grep SESSION_SECRET .env | cut -d '=' -f2)
        
        echo "🚀 Deploying to Heroku..."
        git push heroku main
        
        echo "✅ Deployment complete!"
        echo "🌐 Your app is live at: $(heroku info -s | grep web_url | cut -d '=' -f2)"
        ;;
        
    2)
        echo "🔧 Deploying to Vercel..."
        
        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            echo "❌ Vercel CLI not found. Please install it first:"
            echo "   npm install -g vercel"
            exit 1
        fi
        
        echo "🚀 Deploying to Vercel..."
        vercel --prod
        
        echo "✅ Deployment complete!"
        ;;
        
    3)
        echo "🔧 Deploying to Railway..."
        
        # Check if Railway CLI is installed
        if ! command -v railway &> /dev/null; then
            echo "❌ Railway CLI not found. Please install it first:"
            echo "   npm install -g @railway/cli"
            exit 1
        fi
        
        echo "🚀 Deploying to Railway..."
        railway up
        
        echo "✅ Deployment complete!"
        ;;
        
    4)
        echo "🔧 Starting local production server..."
        echo "⚠️  Make sure MongoDB is running locally or update MONGODB_URI in .env"
        
        # Start production server
        npm run prod
        ;;
        
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment completed successfully!"
echo "📚 For more deployment options, check the README.md file"
