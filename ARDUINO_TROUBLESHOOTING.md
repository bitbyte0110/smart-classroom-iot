# Arduino IDE ESP32 Compilation Error Fix Guide

## 🚨 Common Arduino IDE Errors & Solutions

### **Problem: "Connection lost. Cloud sketch actions and updates won't be available" + Compilation Errors**

---

## **Solution 1: Arduino IDE Board Configuration**

### **Step 1: Install ESP32 Board Package**
1. Open Arduino IDE
2. Go to `File > Preferences`
3. In "Additional Board Manager URLs", add:
   ```
   https://dl.espressif.com/dl/package_esp32_index.json
   ```
4. Go to `Tools > Board > Boards Manager`
5. Search for "ESP32" and install "ESP32 by Espressif Systems"

### **Step 2: Configure Board Settings**
1. **Tools > Board > ESP32 Arduino > ESP32 Dev Module**
2. **Tools > Port > [Select your ESP32 COM port]** (e.g., COM3, COM4)
3. **Tools > Upload Speed > 115200**
4. **Tools > CPU Frequency > 240MHz (WiFi/BT)**
5. **Tools > Flash Frequency > 80MHz**
6. **Tools > Flash Mode > QIO**
7. **Tools > Flash Size > 4MB (32Mb)**
8. **Tools > Partition Scheme > Default 4MB with spiffs**

---

## **Solution 2: Install Required Libraries**

### **Library Manager Installation:**
1. Go to `Tools > Manage Libraries`
2. Search and install these libraries:
   - **ArduinoJson** by Benoit Blanchon (version 6.x or 7.x)
   - **PubSubClient** by Nick O'Leary
   - **WiFi** (usually built-in with ESP32)
   - **HTTPClient** (usually built-in with ESP32)

### **Manual Library Check:**
If libraries are missing, download from:
- ArduinoJson: https://github.com/bblanchon/ArduinoJson
- PubSubClient: https://github.com/knolleary/pubsubclient

---

## **Solution 3: Fix Code Compatibility Issues**

### **ESP32 Core Version Compatibility:**
If using ESP32 Core v3.x, replace this line in your code:
```cpp
// OLD (for ESP32 Core v2.x):
ledcAttachPin(LED_PIN, 0);
ledcSetup(0, PWM_FREQ, PWM_RESOLUTION);

// NEW (for ESP32 Core v3.x):
ledcAttach(LED_PIN, PWM_FREQ, PWM_RESOLUTION);
```

### **PWM Function Update:**
```cpp
// OLD:
ledcWrite(0, currentData.ledPwm);

// NEW:
ledcWrite(LED_PIN, currentData.ledPwm);
```

---

## **Solution 4: Hardware Connection Check**

### **ESP32 Pin Connections:**
- **LDR (Light Sensor):** Pin 34 (ADC1_CH6)
- **LED:** Pin 18 (PWM capable)
- **Power:** USB or 3.3V/5V
- **Ground:** Common ground for all components

### **LDR Circuit:**
```
LDR ── 10kΩ ── GND
  │
Pin 34 (ESP32)
```

---

## **Solution 5: Compilation Error Fixes**

### **If you get "WiFi.h not found":**
- Make sure ESP32 board package is installed
- Restart Arduino IDE

### **If you get "ArduinoJson.h not found":**
- Install ArduinoJson library via Library Manager
- Version 6.21.3 or 7.x recommended

### **If you get "PubSubClient.h not found":**
- Install PubSubClient library via Library Manager

### **If you get memory allocation errors:**
- Increase partition size: `Tools > Partition Scheme > No OTA (2MB APP/2MB SPIFFS)`

---

## **Solution 6: Upload Process**

### **Before Upload:**
1. **Press and hold BOOT button** on ESP32
2. Click **Upload** in Arduino IDE
3. **Release BOOT button** when "Connecting..." appears
4. Wait for "Hard resetting via RTS pin..." message

### **If Upload Fails:**
1. Check COM port is correct
2. Try different USB cable
3. Try lower upload speed (e.g., 921600 → 115200)
4. Press BOOT + EN buttons, release EN first, then BOOT

---

## **Quick Test Code**

Save this as a test file to verify your setup:

```cpp
#include <WiFi.h>

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 Test - Libraries OK!");
  
  // Test WiFi
  WiFi.mode(WIFI_STA);
  Serial.println("WiFi library working!");
  
  // Test GPIO
  pinMode(2, OUTPUT);
  digitalWrite(2, HIGH);
  Serial.println("GPIO working!");
}

void loop() {
  Serial.println("ESP32 is running...");
  delay(2000);
}
```

---

## **Final Checklist**

- [ ] ESP32 board package installed
- [ ] Board set to "ESP32 Dev Module"
- [ ] Correct COM port selected
- [ ] All required libraries installed
- [ ] USB cable provides data connection (not power-only)
- [ ] ESP32 is in upload mode (BOOT button)

---

## **Still Having Issues?**

1. **Restart Arduino IDE** completely
2. **Try a different USB port**
3. **Update Arduino IDE** to latest version
4. **Check ESP32 with simple blink sketch** first
5. **Verify ESP32 is genuine** (not a clone with driver issues)

---

**💡 Note:** The Firebase connection test passing means your network and Firebase are fine. The issue is purely with Arduino IDE compilation/upload process.
