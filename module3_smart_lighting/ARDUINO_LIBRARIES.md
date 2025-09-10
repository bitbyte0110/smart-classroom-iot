# Required Arduino Libraries for ESP32

## Install these libraries in Arduino IDE:

### 1. Firebase ESP Client
- **Library Name**: `Firebase Arduino Client Library for ESP8266 and ESP32`
- **Author**: Mobizt
- **Version**: Latest
- **Installation**: Tools → Manage Libraries → Search "Firebase ESP Client"

### 2. ArduinoJson
- **Library Name**: `ArduinoJson`
- **Author**: Benoit Blanchon
- **Version**: Latest (6.x)
- **Installation**: Tools → Manage Libraries → Search "ArduinoJson"

### 3. ESP32 Board Package
- **URL**: `https://dl.espressif.com/dl/package_esp32_index.json`
- **Installation**: File → Preferences → Additional Board Manager URLs
- Then: Tools → Board → Boards Manager → Search "ESP32"

## Board Settings in Arduino IDE:
- **Board**: "ESP32 Dev Module"
- **CPU Frequency**: "240MHz (WiFi/BT)"
- **Flash Mode**: "QIO"
- **Flash Size**: "4MB"
- **Partition Scheme**: "Default 4MB with spiffs"
- **Upload Speed**: "921600"

## Upload Steps:
1. Connect ESP32 via USB
2. Select correct COM port
3. Press and hold BOOT button on ESP32
4. Click Upload in Arduino IDE
5. Release BOOT button when "Connecting..." appears
