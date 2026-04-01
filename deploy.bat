@echo off
REM Deployment Script for Chat App (Windows)
echo 🚀 Chat App Deployment Script
echo ================================

REM Check if .env file exists
if not exist .env (
    echo ❌ .env file not found!
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ✅ .env file created. Please edit it with your MongoDB URI and other settings.
    echo 📋 Required variables to set:
    echo    - MONGODB_URI (your MongoDB connection string)
    echo    - SESSION_SECRET (random secure string)
    echo    - NODE_ENV=production
    echo.
    echo ⚠️  Please edit the .env file and run this script again.
    pause
    exit /b 1
)

REM Check if MongoDB URI is set
findstr /C:"mongodb+srv://username:password" .env >nul
if %errorlevel%==0 (
    echo ❌ Please update the MongoDB URI in .env file with your actual connection string!
    pause
    exit /b 1
)

REM Check if session secret is default
findstr /C:"your-secret-key-here" .env >nul
if %errorlevel%==0 (
    echo ❌ Please update the SESSION_SECRET in .env file with a secure random string!
    echo 💡 You can generate one with: openssl rand -base64 32
    pause
    exit /b 1
)

echo ✅ Environment variables configured
echo.

REM Install dependencies
echo 📦 Installing dependencies...
npm install

echo.
echo 🎯 Choose deployment platform:
echo 1) Heroku
echo 2) Vercel
echo 3) Railway
echo 4) Render (Recommended - includes Redis)
echo 5) Local production server
echo.
set /p choice="Enter choice (1-5): "

if "%choice%"=="1" (
    echo 🔧 Deploying to Heroku...
    
    REM Check if Heroku CLI is installed
    heroku --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Heroku CLI not found. Please install it first:
        echo    npm install -g heroku
        pause
        exit /b 1
    )
    
    echo 📝 Creating Heroku app...
    heroku create
    
    echo ⚙️  Setting environment variables...
    for /f "tokens=2 delims==" %%a in ('findstr MONGODB_URI .env') do set MONGO_URI=%%a
    for /f "tokens=2 delims==" %%a in ('findstr SESSION_SECRET .env') do set SESSION_SECRET_VALUE=%%a
    
    heroku config:set NODE_ENV=production
    heroku config:set MONGODB_URI=%MONGO_URI%
    heroku config:set SESSION_SECRET=%SESSION_SECRET_VALUE%
    
    echo 🚀 Deploying to Heroku...
    git push heroku main
    
    echo ✅ Deployment complete!
    echo 🌐 Your app is live at: 
    for /f "tokens=2 delims==" %%a in ('heroku info -s ^| findstr web_url') do echo %%a
)

if "%choice%"=="2" (
    echo 🔧 Deploying to Vercel...
    
    REM Check if Vercel CLI is installed
    vercel --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Vercel CLI not found. Please install it first:
        echo    npm install -g vercel
        pause
        exit /b 1
    )
    
    echo 🚀 Deploying to Vercel...
    vercel --prod
    
    echo ✅ Deployment complete!
)

if "%choice%"=="3" (
    echo 🔧 Deploying to Railway...
    
    REM Check if Railway CLI is installed
    railway --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Railway CLI not found. Please install it first:
        echo    npm install -g @railway/cli
        pause
        exit /b 1
    )
    
    echo 🚀 Deploying to Railway...
    railway up
    
    echo ✅ Deployment complete!
)

if "%choice%"=="4" (
    echo 🔧 Deploying to Render (Recommended)...
    echo 📝 Render setup instructions:
    echo 1. Go to https://render.com
    echo 2. Click 'New +' and select 'Web Service'
    echo 3. Connect your GitHub repository
    echo 4. Set environment variables:
    echo    - NODE_ENV=production
    echo    - MONGODB_URI=%MONGO_URI%
    echo    - SESSION_SECRET=%SESSION_SECRET_VALUE%
    echo    - REDIS_URL=redis://your-redis-instance:6379
    echo 5. Add Redis addon (Render has built-in Redis)
    echo 6. Deploy! Render will automatically detect and use Redis
    echo.
    echo 🔗 Render URL: https://dashboard.render.com
)

if "%choice%"=="5" (
    echo 🔧 Starting local production server...
    echo ⚠️  Make sure MongoDB is running locally or update MONGODB_URI in .env
    
    REM Start production server
    npm run prod
)

if "%choice%"=="1" goto :end
if "%choice%"=="2" goto :end
if "%choice%"=="3" goto :end
if "%choice%"=="4" goto :end

echo ❌ Invalid choice!
pause
exit /b 1

:end
echo.
echo 🎉 Deployment completed successfully!
echo 📚 For more deployment options, check the README.md file
pause
