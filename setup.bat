@echo off
REM Setup script for Windows

echo ================================
echo EYeOn Setup Script for Windows
echo ================================

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js not found!
    echo Please install from https://nodejs.org
    exit /b 1
)
echo.
echo Node.js installed:
node --version

REM Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Python not found!
    echo Please install from https://python.org
    exit /b 1
)
echo Python installed:
python --version

REM Backend Setup
echo.
echo ================================
echo Setting up Backend...
echo ================================

cd backend
echo.
echo Installing Node dependencies...
call npm install

echo.
echo Installing Python dependencies...
pip install -r ..\requirements.txt

echo.
echo Backend setup complete!

REM Frontend Setup
echo.
echo ================================
echo Setting up Frontend...
echo ================================

cd ..\frontend
echo.
echo Installing Node dependencies...
call npm install

echo.
echo Frontend setup complete!

echo.
echo ================================
echo Setup Complete!
echo ================================
echo.
echo Next steps:
echo.
echo 1. Start backend:
echo    cd backend
echo    npm run dev
echo.
echo 2. In a new terminal, start frontend:
echo    cd frontend
echo    npm run dev
echo.
echo 3. Open http://localhost:5173 in your browser
echo.
pause
