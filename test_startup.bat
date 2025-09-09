@echo off
echo 🔧 Testing Smart Lighting System Startup
echo ========================================
echo.

echo Step 1: Testing React App Build...
cd web
npm run build > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ React app builds successfully
) else (
    echo ❌ React app build failed
    echo Run: cd web && npm run build
    pause
    exit /b 1
)

echo.
echo Step 2: Starting React Development Server...
echo Opening: http://localhost:5173
echo.
echo 📝 What you should see:
echo   - Purple gradient background
echo   - "Test Mode" button in top-right corner
echo   - Click it to test basic React functionality
echo.
echo 🚨 If you see blank page:
echo   - Check browser console (F12)
echo   - Try different port: npm run dev -- --port 3000
echo.

start "Web Dashboard" cmd /k "npm run dev"

echo.
echo ⏳ Waiting 5 seconds for server to start...
timeout /t 5 > nul

echo.
echo 🌐 Opening browser...
start http://localhost:5173

echo.
echo ✅ Test complete! 
echo.
echo Next steps if working:
echo 1. Close this window
echo 2. Run start.bat for full system
echo.
pause