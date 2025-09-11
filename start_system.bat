@echo off
echo 🏫 Smart Classroom IoT System Startup
echo =====================================
echo.

echo 📋 Starting components in order:
echo.

echo 1️⃣ Testing Firebase connection...
python test_firebase_connection.py
echo.

echo 🔍 Debug Dashboard Test:
echo    Opening debug_dashboard.html for direct Firebase test
start debug_dashboard.html
echo.

echo 2️⃣ Starting Web Dashboard...
echo    Opening http://localhost:5173
start cmd /k "cd web && npm run dev"
echo.

echo 3️⃣ Instructions for ESP32:
echo    - Upload ASSIGNMENT_COMPLIANT.ino to your ESP32
echo    - Open Serial Monitor @115200 baud
echo    - Check for "WiFi connected" and "Cloud sync successful" messages
echo.

echo 4️⃣ Instructions for AI Camera:
echo    - Open a new terminal
echo    - Run: python AI_detection/yolo_force_gpu.py
echo    - Make sure your camera is working
echo.

echo 5️⃣ Instructions for MQTT Broker (Raspberry Pi):
echo    - SSH into your Pi: ssh pi@192.168.0.102
echo    - Run: sudo systemctl status mosquitto
echo    - If not running: sudo systemctl start mosquitto
echo.

echo ✅ System startup complete!
echo.
echo 🔍 Troubleshooting:
echo    - If web dashboard shows "Initializing...", check Firebase data
echo    - If no data in Firebase, check ESP32 Serial Monitor
echo    - If AI not working, check camera permissions
echo.
pause
