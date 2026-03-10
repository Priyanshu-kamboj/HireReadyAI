@echo off
REM 🚀 HireReady AI - Windows Quick Setup Script

echo ==================================
echo 🎓 HireReady AI - Quick Setup
echo ==================================
echo.

REM Check Python
echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.9+
    pause
    exit /b 1
)
echo ✅ Python found
python --version

REM Check Node.js
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+
    pause
    exit /b 1
)
echo ✅ Node.js found
node --version

REM Check MongoDB
echo Checking MongoDB installation...
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  MongoDB not found locally. You can use MongoDB Atlas instead.
    echo    Get connection string from: https://www.mongodb.com/cloud/atlas
) else (
    echo ✅ MongoDB found
)

echo.
echo ==================================
echo 📦 Installing Backend Dependencies
echo ==================================

cd app\backend

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing Python packages...
pip install -r requirements.txt

REM Setup .env
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please edit app\backend\.env with your API keys!
) else (
    echo ✅ .env file already exists
)

cd ..\..

echo.
echo ==================================
echo 🎨 Installing Frontend Dependencies
echo ==================================

cd app\frontend

echo Installing npm packages...
call npm install

REM Setup frontend .env
if not exist .env (
    echo Creating frontend .env...
    echo REACT_APP_BACKEND_URL=http://localhost:8000 > .env
    echo ✅ Frontend .env created
) else (
    echo ✅ Frontend .env already exists
)

cd ..\..

echo.
echo ==================================
echo ✅ Setup Complete!
echo ==================================
echo.
echo Next steps:
echo.
echo 1. Get your API keys:
echo    - OpenAI: https://platform.openai.com/api-keys
echo    - Razorpay: https://dashboard.razorpay.com/app/keys
echo.
echo 2. Edit app\backend\.env and add:
echo    - OPENAI_API_KEY
echo    - RAZORPAY_KEY_ID
echo    - RAZORPAY_KEY_SECRET
echo    - MONGO_URL (if using Atlas)
echo.
echo 3. Start MongoDB (if local):
echo    mongod --dbpath C:\data\db
echo.
echo 4. Start backend (Terminal 1):
echo    cd app\backend
echo    venv\Scripts\activate
echo    uvicorn server:app --reload
echo.
echo 5. Start frontend (Terminal 2):
echo    cd app\frontend
echo    npm start
echo.
echo 6. Open browser:
echo    http://localhost:3000
echo.
echo ==================================
echo 📚 Documentation:
echo    - README.md - Overview
echo    - DEPLOYMENT_GUIDE.md - Production deployment
echo    - CHANGES_MADE.md - Recent updates
echo ==================================
echo.
pause
