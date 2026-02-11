@echo off
echo 🚀 Setting up talKS...

REM Check if .env exists
if not exist .env (
  echo 📝 Creating .env file from template...
  copy .env.example .env
  echo ⚠️  Please update .env with your OAuth credentials before starting!
  echo.
  echo You need to:
  echo 1. Register talKS as an OAuth client in Konnect Service
  echo 2. Update OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in .env
  echo.
  pause
)

REM Install server dependencies
echo 📦 Installing server dependencies...
call npm install

REM Install client dependencies
echo 📦 Installing client dependencies...
cd client
call npm install
cd ..

echo ✅ Setup complete!
echo.
echo 📋 Next steps:
echo 1. Ensure Konnect Service is running on port 3000
echo 2. Register talKS OAuth client (see README.md)
echo 3. Update .env with OAuth credentials
echo 4. Run 'npm run dev' for development
echo 5. Or run 'npm run docker:up' for Docker

pause
