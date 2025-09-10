@echo off
echo 🏫 Smart Classroom IoT System - Complete Hardware Integration
echo ============================================================
echo.
echo 🎯 This will start all components for your hardware setup:
echo    1. Firebase (for ESP32 communication)
echo    2. Web Dashboard (monitoring and controls)
echo    3. AI Detection (laptop camera)
echo.
echo ⚠️  BEFORE RUNNING:
echo    - Flash ESP32 with lighting_complete.ino
echo    - Update WiFi credentials in ESP32 code
echo    - Connect hardware: PIR→GPIO27, LDR→GPIO34, LED→GPIO18
echo.
pause

echo.
echo 🔥 Starting Firebase...
start "Firebase" cmd /k "firebase emulators:start"
timeout /t 5

echo.
echo 🌐 Starting Web Dashboard...
start "Web Dashboard" cmd /k "cd web && npm run dev"
timeout /t 3

echo.
echo 🤖 Starting AI Detection...
start "AI Detection" cmd /k "cd AI_detection && python laptop_ai_integration.py"

echo.
echo ✅ All services starting...
echo.
echo 📱 Access points:
echo    - Web Dashboard: http://localhost:5173
echo    - Firebase UI: http://localhost:4000
echo    - AI Detection: Camera window will open
echo.
echo 🎮 Test scenarios:
echo    1. Walk in front of camera (AI detection)
echo    2. Cover LDR with hand (darkness simulation)
echo    3. Wave hand in front of PIR (motion detection)
echo    4. Use web dashboard to switch modes
echo.
pause
