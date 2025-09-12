@echo off
echo Starting Smart Classroom Climate Control System...
echo.

echo 1. Starting MQTT Bridge Service...
cd tools\climate-mqtt-bridge
start "MQTT Bridge" cmd /k "npm start"
cd ..\..

timeout /t 3

echo 2. Starting Web Dashboard...
cd web
start "Web Dashboard" cmd /k "npm run dev"
cd ..

echo.
echo =================================================
echo Climate Control System Started!
echo =================================================
echo.
echo Services running:
echo - MQTT Bridge: Check the "MQTT Bridge" window
echo - Web Dashboard: http://localhost:5173
echo.
echo Navigate to Climate Control tab in the web interface
echo.
echo To stop: Close both command windows
echo =================================================
pause
