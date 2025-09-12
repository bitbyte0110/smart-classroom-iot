# Smart Classroom Climate Control - Complete Setup Guide

This guide walks you through setting up the complete Climate Control system with ESP32 hardware, MQTT bridge, and web dashboard.

## 🏗️ System Overview

```
ESP32 (DHT22 + MQ-135 + Fan) ↔ MQTT Broker ↔ Bridge Service ↔ Firebase ↔ React Web Dashboard
```

## 📋 Prerequisites

### Hardware
- ESP32 development board
- DHT22 temperature/humidity sensor
- MQ-135 air quality sensor
- 12V DC fan
- NPN transistor (2N2222 or S8050)
- 1N4007 diode
- Push button (optional, for boost)
- Breadboard and jumper wires

### Software
- Arduino IDE with ESP32 support
- Node.js 18+ for bridge service
- Firebase project with Realtime Database
- MQTT broker (Raspberry Pi recommended)

## 🔌 Hardware Wiring

Based on your `fan_success.ino`:

### DHT22 Temperature & Humidity Sensor
- VCC → 3.3V
- GND → GND  
- DATA → GPIO4 (with 10kΩ pull-up resistor)

### MQ-135 Air Quality Sensor
- VCC → 5V
- GND → GND
- AO → GPIO34 (analog input)

### DC Fan Control Circuit
- GPIO18 → 220Ω resistor → NPN transistor base
- Fan positive → 12V power supply
- Fan negative → NPN collector
- NPN emitter → GND
- 1N4007 diode across fan (cathode to +, anode to -)

### Optional Boost Button
- GPIO27 → Button → GND (internal pull-up enabled)

## 🔧 ESP32 Firmware Setup

### 1. Update Your Arduino Code

Your current `fan_success.ino` only reads sensors. You need to add MQTT and control logic:

```cpp
// Add these libraries to your existing code
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// Add these after your existing definitions
#define FAN_PIN 18
#define BOOST_BUTTON_PIN 27
#define MQTT_SERVER "192.168.0.102"  // Your Pi IP
#define MQTT_PORT 1883
#define ROOM_ID "roomA"

WiFiClient espClient;
PubSubClient client(espClient);

// Add fan control variables
bool fanOn = false;
int fanPWM = 0;
String currentMode = "Auto";
bool boostActive = false;
unsigned long boostStartTime = 0;

void setup() {
  // Your existing setup code...
  
  // Add these:
  pinMode(FAN_PIN, OUTPUT);
  pinMode(BOOST_BUTTON_PIN, INPUT_PULLUP);
  
  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
  
  // Setup MQTT
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(onMqttMessage);
}

void loop() {
  // Your existing sensor reading code...
  
  // Add these:
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();
  
  // Check boost button
  if (digitalRead(BOOST_BUTTON_PIN) == LOW) {
    activateBoost();
    delay(500); // debounce
  }
  
  // Update fan based on mode
  updateFanControl();
  
  // Publish telemetry
  publishTelemetry();
  
  delay(2000);
}

void updateFanControl() {
  if (currentMode == "Auto") {
    // Auto mode logic based on temperature
    float temp = dht.readTemperature();
    if (temp < 25) {
      fanPWM = 0;
      fanOn = false;
    } else if (temp <= 29) {
      fanPWM = 160;
      fanOn = true;
    } else {
      fanPWM = 230;
      fanOn = true;
    }
  }
  
  // Handle boost mode
  if (boostActive) {
    if (millis() - boostStartTime > 600000) { // 10 minutes
      boostActive = false;
    } else {
      fanPWM = 255;
      fanOn = true;
    }
  }
  
  // Apply PWM to fan
  if (fanOn && fanPWM > 0) {
    analogWrite(FAN_PIN, fanPWM);
  } else {
    analogWrite(FAN_PIN, 0);
  }
}

void publishTelemetry() {
  DynamicJsonDocument doc(1024);
  
  doc["tempC"] = dht.readTemperature();
  doc["humidity"] = dht.readHumidity();
  doc["aqRaw"] = analogRead(MQ_PIN);
  doc["mode"] = currentMode;
  doc["fan"]["on"] = fanOn;
  doc["fan"]["pwm"] = fanPWM;
  doc["updatedAt"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  String topic = "campus/climate/" + String(ROOM_ID) + "/telemetry";
  client.publish(topic.c_str(), payload.c_str());
}

void onMqttMessage(char* topic, byte* message, unsigned int length) {
  String topicStr = String(topic);
  String expectedTopic = "campus/climate/" + String(ROOM_ID) + "/cmd";
  
  if (topicStr == expectedTopic) {
    String payload = "";
    for (int i = 0; i < length; i++) {
      payload += (char)message[i];
    }
    
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);
    
    if (doc["mode"]) {
      currentMode = doc["mode"].as<String>();
    }
    
    if (doc["fan"]["on"]) {
      fanOn = doc["fan"]["on"];
    }
    
    if (doc["fan"]["pwm"]) {
      fanPWM = doc["fan"]["pwm"];
    }
    
    if (doc["boost"]["enabled"]) {
      activateBoost();
    }
  }
}

void activateBoost() {
  boostActive = true;
  boostStartTime = millis();
}

void reconnectMQTT() {
  while (!client.connected()) {
    if (client.connect(("ESP32_" + String(ROOM_ID)).c_str())) {
      String cmdTopic = "campus/climate/" + String(ROOM_ID) + "/cmd";
      client.subscribe(cmdTopic.c_str());
    } else {
      delay(5000);
    }
  }
}
```

### 2. Required Libraries
Install these in Arduino IDE:
- WiFi (built-in)
- PubSubClient
- ArduinoJson
- DHT sensor library

## 🔥 Firebase Setup

### 1. Create/Configure Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create project or use existing `smartclassroom-af237`
3. Enable Realtime Database
4. Set database rules for testing:

```json
{
  "rules": {
    "climate": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

### 2. Get Firebase Configuration
1. Project Settings → General → Web Apps
2. Copy the config object values
3. Note the Database URL from Realtime Database section

## 🌐 MQTT Broker Setup (Raspberry Pi)

If using Raspberry Pi as MQTT broker:

```bash
# Install Mosquitto
sudo apt update
sudo apt install mosquitto mosquitto-clients

# Configure for LAN access
echo "listener 1883 0.0.0.0" | sudo tee /etc/mosquitto/conf.d/lan.conf
echo "allow_anonymous true" | sudo tee -a /etc/mosquitto/conf.d/lan.conf

# Start and enable
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto

# Test
mosquitto_sub -h localhost -t 'campus/climate/+/telemetry' -v
```

## 🌉 Bridge Service Setup

### 1. Install Dependencies
```bash
cd tools/climate-mqtt-bridge
npm install
```

### 2. Firebase Service Account
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `tools/climate-mqtt-bridge/serviceAccountKey.json`

### 3. Configure Environment
```bash
cd tools/climate-mqtt-bridge
cp .env.bridge.example .env.bridge
```

Edit `.env.bridge`:
```bash
MQTT_URL=tcp://192.168.0.102:1883
MQTT_TOPIC_BASE=campus
FIREBASE_DB_URL=https://smartclassroom-af237-default-rtdb.firebaseio.com
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
ROOM_IDS=roomA
DEBUG=true
```

### 4. Start Bridge
```bash
npm start
```

## 🖥️ Web Dashboard Setup

### 1. Install Dependencies
```bash
cd web
npm install
```

### 2. Configure Environment
```bash
cd web
cp .env.local.example .env.local
```

Edit `.env.local` with your Firebase config:
```bash
VITE_FIREBASE_API_KEY=AIzaSyDpAjEMP0MatqhwlLY_clqtpcfGVXkpsS8
VITE_FIREBASE_AUTH_DOMAIN=smartclassroom-af237.firebaseapp.com
VITE_FIREBASE_DB_URL=https://smartclassroom-af237-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=smartclassroom-af237
VITE_FIREBASE_STORAGE_BUCKET=smartclassroom-af237.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=172327783054
VITE_FIREBASE_APP_ID=1:172327783054:web:b9bdddfb213ea0dd48d7df
```

### 3. Start Web App
```bash
npm run dev
```

Visit `http://localhost:5173` and navigate to Climate Control.

## 🧪 Testing the Complete System

### 1. Verify Data Flow
1. **ESP32 → MQTT**: Monitor MQTT broker
   ```bash
   mosquitto_sub -h 192.168.0.102 -t 'campus/climate/+/telemetry' -v
   ```

2. **MQTT → Firebase**: Check bridge logs and Firebase console

3. **Firebase → Web**: Open web dashboard, should show live data

### 2. Test Controls
1. **Mode Change**: Switch Auto/Manual in web UI
2. **Fan Control**: Toggle ON/OFF and adjust PWM slider
3. **Boost Mode**: Click "Boost 10 min" button

### 3. Test Hardware Response
1. Changes in web UI should appear in MQTT command topic
2. ESP32 should receive commands and update fan
3. Monitor Serial output on ESP32 for debug info

## 🔍 Troubleshooting

### ESP32 Issues
- **No WiFi**: Check SSID/password, signal strength
- **No MQTT**: Verify broker IP, check network connectivity
- **Sensor errors**: Check wiring, power supply

### Bridge Issues
- **MQTT connection**: Verify broker running, check IP/port
- **Firebase errors**: Check service account JSON, database URL
- **No data flow**: Check topic format, payload validation

### Web Dashboard Issues
- **No connection**: Check Firebase config in `.env.local`
- **No data**: Verify bridge is running and writing to Firebase
- **Controls not working**: Check command writing to Firebase

## 📊 Expected Results

Once everything is set up:

### Live Control Tab
- Real-time temperature, humidity, air quality readings
- Current fan status (ON/OFF, PWM level)
- Mode display (Auto/Manual)
- Working controls that update hardware immediately

### Reports & Analytics Tab
- KPI cards showing average PWM, runtime, energy savings
- Live charts of temperature and fan speed trends
- Air quality trends over time
- Data validation warnings for out-of-range values
- CSV export functionality

### Hardware Behavior
- **Auto Mode**: Fan speed adjusts based on temperature
  - <25°C: Fan OFF
  - 25-29°C: Fan MEDIUM (~160 PWM)
  - >29°C: Fan HIGH (~230 PWM)
- **Manual Mode**: Fan responds to web UI controls
- **Boost Mode**: Fan runs at HIGH for 10 minutes

## 🚀 Next Steps

1. **Add More Sensors**: Extend to multiple rooms
2. **Advanced Analytics**: Add machine learning for predictive control
3. **Mobile App**: Create React Native companion app
4. **Voice Control**: Integrate with Google Assistant/Alexa
5. **Energy Monitoring**: Add current sensors for power measurement

## 📝 Maintenance

- Monitor bridge service uptime
- Rotate Firebase service account keys
- Update ESP32 firmware for bug fixes
- Back up historical data regularly
- Check sensor calibration periodically
