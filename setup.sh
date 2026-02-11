#!/bin/bash

echo "🚀 Setting up talKS..."

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file from template..."
  cp .env.example .env
  echo "⚠️  Please update .env with your OAuth credentials before starting!"
  echo ""
  echo "You need to:"
  echo "1. Register talKS as an OAuth client in Konnect Service"
  echo "2. Update OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in .env"
  echo ""
  read -p "Press enter to continue..."
fi

# Install server dependencies
echo "📦 Installing server dependencies..."
npm install

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client && npm install && cd ..

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Ensure Konnect Service is running on port 3000"
echo "2. Register talKS OAuth client (see README.md)"
echo "3. Update .env with OAuth credentials"
echo "4. Run 'npm run dev' for development"
echo "5. Or run 'npm run docker:up' for Docker"
