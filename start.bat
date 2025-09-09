@echo off
echo 🏫 Smart Classroom Lighting System
echo ================================
echo.
echo Starting all services...
echo.

echo 🔥 Starting Firebase Emulator...
start "Firebase Emulator" cmd /k "firebase emulators:start"

timeout /t 5

echo 📊 Starting Device Simulator...
start "Device Simulator" cmd /k "cd simulator && npm start"

echo 🌐 Starting Web Dashboard...
start "Web Dashboard" cmd /k "cd web && npm run dev"

echo.
echo ✅ All services started!
echo.
echo 📍 Access points:
echo   - Firebase UI: http://localhost:4000
echo   - Web Dashboard: http://localhost:5173  
echo   - Simulator logs: Check simulator window
echo.
echo Press any key to exit...
pause