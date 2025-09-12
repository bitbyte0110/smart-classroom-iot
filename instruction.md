
# 🏫 Smart Classroom IoT System - Multi-Module Architecture

## 📋 System Overview & Assignment Compliance

### 🎯 Assignment Requirements Met
- **System Type**: Smart Campus Application ✅
<<<<<<< HEAD
- **Hardware**: ESP32 (NodeMCU) + Laptop Camera ✅
- **Sensors/Actuators**: 4+ (LDR, LED, AI Camera, Manual Controls) ✅
=======
- **Hardware**: ESP32 (NodeMCU) + Raspberry Pi 4 ✅
- **Sensors**: 5+ inputs/outputs per module (Lighting: PIR, LDR, LED, Temperature, Air Quality | Climate: Temperature, Humidity, Air Quality, Fan, Boost Button) ✅
>>>>>>> 91f274ab1c25be0933d5944378579967c37a7719
- **Cloud Integration**: Firebase Realtime Database ✅
- **User Interface**: Web-based dashboard with real-time monitoring ✅
- **Data Processing**: Real-time sensor data with analytics and reporting ✅

### 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ESP32 Device  │    │  Laptop/PC      │    │  Web Dashboard  │
│                 │    │                 │    │                 │
<<<<<<< HEAD
│ • Manual Controls│◄──►│ • AI Detection  │◄──►│ • React App     │
│ • LDR Sensor    │    │ • Integrated    │    │ • Firebase UI   │
│ • LED Control   │    │   Camera        │    │ • Analytics     │
│                 │    │ • Firebase Sync │    │ • Reports       │
=======
│ MODULE 3:       │◄──►│ • MQTT Broker   │◄──►│ • React App     │
│ • PIR Sensor    │    │ • Data Logger   │    │ • Firebase UI   │
│ • LDR Sensor    │    │ • AI Detection  │    │ • Analytics     │
│ • LED Control   │    │ • Camera Stream │    │ • Reports       │
│ • Temperature   │    │                 │    │                 │
│ • Air Quality   │    │                 │    │                 │
│                 │    │                 │    │                 │
│ MODULE 2:       │    │                 │    │                 │
│ • DHT22 Temp    │    │                 │    │                 │
│ • MQ-135 AQ     │    │                 │    │                 │
│ • DC Fan PWM    │    │                 │    │                 │
│ • Boost Button  │    │                 │    │                 │
>>>>>>> 91f274ab1c25be0933d5944378579967c37a7719
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Firebase Cloud │
                    │                 │
                    │ • Real-time DB  │
                    │ • Authentication│
                    │ • Analytics     │
                    └─────────────────┘
```

### 🔄 MQTT Publisher/Subscriber Roles

#### ESP32 (Publisher & Subscriber)
**Publishes to:**
<<<<<<< HEAD
- `sensors/lighting/presence` - (unused in camera-only; AI presence via Firebase state)
=======
**Module 3 - Lighting:**
- `sensors/lighting/presence` - PIR motion detection status
>>>>>>> 91f274ab1c25be0933d5944378579967c37a7719
- `sensors/lighting/brightness` - LDR analog readings (0-4095)
- `sensors/lighting/led_state` - LED ON/OFF and PWM level
- `sensors/lighting/temperature` - DHT22 temperature readings
- `sensors/lighting/air_quality` - MQ-135 air quality values
- `sensors/lighting/mode` - Auto/Manual mode status

**Module 2 - Climate:**
- `sensors/climate/temperature` - DHT22 temperature readings (°C)
- `sensors/climate/humidity` - DHT22 humidity readings (%)
- `sensors/climate/air_quality` - MQ-135 air quality raw values
- `sensors/climate/fan_state` - Fan ON/OFF and PWM level
- `sensors/climate/comfort_band` - Current comfort band (Low/Moderate/High)
- `sensors/climate/aq_status` - Air quality status (Good/Moderate/Poor)
- `sensors/climate/mode` - Auto/Manual mode status
- `sensors/climate/boost` - Boost mode status and remaining time

**Subscribes to:**
**Module 3 - Lighting:**
- `control/lighting/mode` - Mode switching commands (auto/manual)
- `control/lighting/led_on` - Manual LED ON/OFF commands
- `control/lighting/led_pwm` - Manual brightness control (0-255)
- `control/lighting/emergency` - Emergency override commands

<<<<<<< HEAD
#### Laptop/PC (Publisher & Subscriber)
=======
**Module 2 - Climate:**
- `control/climate/mode` - Mode switching commands (auto/manual)
- `control/climate/fan_on` - Manual fan ON/OFF commands
- `control/climate/fan_pwm` - Manual fan speed control (0-255)
- `control/climate/boost` - Boost mode activation (10-minute override)
- `control/climate/thresholds` - Temperature and AQ threshold updates

#### Raspberry Pi (Publisher & Subscriber)
>>>>>>> 91f274ab1c25be0933d5944378579967c37a7719
**Publishes to:**
- `ai/presence/detection` - AI camera human detection results
- `ai/presence/count` - Number of people detected
- `ai/presence/confidence` - Detection confidence scores
- `system/status/laptop` - Laptop system health

**Subscribes to:**
- `sensors/lighting/*` - All lighting sensor data from ESP32
- `sensors/climate/*` - All climate sensor data from ESP32
- `control/lighting/*` - All lighting control commands
- `control/climate/*` - All climate control commands
- `system/status/esp32` - ESP32 health status

#### Web Dashboard (Subscriber Only)
**Subscribes to:**
- `sensors/lighting/*` - Real-time lighting sensor data
- `sensors/climate/*` - Real-time climate sensor data
- `ai/presence/*` - AI detection results
- `system/status/*` - System health monitoring

### 💻 Laptop/PC vs ESP32 Roles

#### ESP32 (Edge Device - Sensor Hub)
**Primary Functions:**
<<<<<<< HEAD
- **Sensor Data Collection**: LDR, Temperature, Air Quality
- **Actuator Control**: LED PWM control, Fan speed control
- **Local Processing**: Sensor filtering, debouncing, validation
=======
- **Sensor Data Collection**: PIR, LDR, Temperature, Humidity, Air Quality
- **Actuator Control**: LED PWM control, Fan speed control (PWM)
- **Local Processing**: Sensor filtering, debouncing, validation, hysteresis logic
>>>>>>> 91f274ab1c25be0933d5944378579967c37a7719
- **MQTT Publishing**: Real-time sensor data to cloud
- **Offline Operation**: Continues working without internet
- **Hardware Interface**: Direct GPIO control of sensors/actuators
- **Climate Logic**: Temperature band control, AQ assistance, boost mode

**Technical Specifications:**
- **CPU**: Dual-core 32-bit processor @ 240MHz
- **Memory**: 520KB SRAM, 4MB Flash
- **Connectivity**: WiFi 802.11 b/g/n, Bluetooth 4.2
- **GPIO**: 34 digital pins, 18 analog inputs
- **Programming**: Arduino IDE, ESP-IDF, MicroPython

#### Laptop/PC (AI Processing & Gateway)
**Primary Functions:**
- **AI Processing**: YOLO human detection with integrated camera
- **MQTT Client**: Direct communication with ESP32 and Firebase
- **Data Logging**: Historical data storage and analytics
- **Web Server**: Hosting React dashboard application
- **Cloud Gateway**: Firebase integration and data synchronization
- **System Monitoring**: Health checks and error reporting

**Technical Specifications:**
- **CPU**: Multi-core processor (Intel/AMD)
- **Memory**: 8GB+ RAM (recommended)
- **Storage**: SSD/HDD for data storage
- **Connectivity**: WiFi 802.11ac, Ethernet, Bluetooth
- **Camera**: Integrated laptop camera (720p/1080p)
- **OS**: Windows 10/11, macOS, or Linux
- **AI Framework**: Python with OpenCV, YOLO, PyTorch/TensorFlow

### 🖥️ User Interface Specifications

#### Web Dashboard Features
**Real-time Monitoring Tiles:**
**Module 3 - Lighting:**
- **Presence Status**: AI detection (camera) with confidence indicators
- **Brightness Level**: LDR readings with visual gauge (0-4095)
- **LED Status**: ON/OFF state with PWM level display (0-255)
- **System Mode**: Auto/Manual mode with visual toggle
- **Live Data Indicator**: Shows "Live Data" or "Demo Mode" status

**Module 2 - Climate:**
- **Temperature**: Current room temperature with trend graph (°C)
- **Humidity**: Current humidity level with trend graph (%)
- **Air Quality**: MQ-135 readings with health status indicators
- **Fan Status**: ON/OFF state with PWM level display (0-255)
- **Comfort Band**: Current temperature band (Low/Moderate/High)
- **AQ Status**: Air quality classification (Good/Moderate/Poor)
- **Boost Mode**: 10-minute override status and countdown timer

**Control Panel:**
**Module 3 - Lighting:**
- **Mode Switch**: Toggle between Automatic and Manual modes
- **Manual LED Control**: ON/OFF toggle and brightness slider (0-255)
- **Emergency Override**: Force unlock/override all systems
- **Settings Panel**: Threshold adjustments, calibration tools

**Module 2 - Climate:**
- **Mode Switch**: Toggle between Automatic and Manual modes
- **Manual Fan Control**: ON/OFF toggle and speed slider (0-255)
- **Boost Button**: 10-minute high-speed override
- **Threshold Settings**: Temperature bands and AQ thresholds
- **Comfort Settings**: Customizable temperature ranges

**Analytics & Reports:**
**Module 3 - Lighting:**
- **Daily Brightness Chart**: LDR readings over time with day/night cycles (30s updates, 5s refresh for demo)
- **Presence Heatmap**: Hourly detection patterns and occupancy trends (with 10-minute demo mode)
- **LED Runtime Analysis**: Usage statistics and energy consumption
- **Energy Savings Report**: Realistic comparison for tiny 3.3V IoT LED (20mW power consumption)
- **Demo Mode Toggle**: Switch between 24-hour view and 10-minute demo view for video recording
- **Real-time Chart Updates**: Charts refresh every 5 seconds for smooth demo experience

**Module 2 - Climate:**
- **Temperature Line Chart**: Daily temperature and humidity trends
- **Fan Runtime Analysis**: Usage statistics and average PWM levels
- **Air Quality Trends**: Historical AQ data and status distribution
- **Energy Savings Report**: Comparison with baseline (always HIGH during school hours)
- **Comfort Analysis**: Time spent in each temperature band

**Data Export:**
- **CSV Download**: Complete sensor logs for analysis
- **PDF Reports**: Formatted reports for submission
- **Real-time Data**: Live streaming of all sensor values

#### Demo Mode Features (NEW)
**Module 3 - Lighting:**
- **Demo Mode Toggle**: Switch between "Full Data (24h)" and "Last 10 min" views
- **Faster Chart Updates**: Charts refresh every 5 seconds for smooth demo experience
- **Synchronized Time Ranges**: Both brightness and presence charts show same time range
- **Video Recording Ready**: Perfect for 1m 30s demo videos with real-time changes
- **Realistic Energy Calculations**: Properly scaled for tiny 3.3V IoT LED (20mW power)

### 📊 Assignment Compliance Analysis

#### ✅ Sensor Data Acquisition Module
**Requirements Met:**
- **4+ Sensors/Actuators**: LDR, LED, AI Camera, Manual Controls ✅
- **Sufficient Records**: 30-second logging intervals, 200+ entries per day ✅
- **Real-time Data**: Live sensor readings with 2-second update intervals ✅

#### ✅ Sensor Data Processing Module
**Requirements Met:**
- **Cloud Database**: Firebase Realtime Database integration ✅
- **Data Retrieval**: Historical data access for analytics ✅
- **Analysis Capabilities**: 4 different report types with charts ✅
- **Business Rules**: Hysteresis, validation, error handling ✅

#### ✅ User Interface Module
**Requirements Met:**
- **Web Interface**: React-based responsive dashboard ✅
- **Real-time Communication**: MQTT + Firebase integration ✅
- **Reports & Analytics**: Multiple chart types and data visualization ✅
- **Control Interface**: Manual override and system configuration ✅

### 🔧 Technical Implementation Details

#### Smart Lighting Module Improvements (NEW)
**Realistic Energy Calculations:**
- **LED Power**: 20mW (tiny 3.3V IoT LED, ~6mA current)
- **Energy Display**: Milliwatts (mW) instead of unrealistic watts
- **Savings Calculation**: Properly scaled for small LED power consumption
- **Baseline Comparison**: LED always ON at full power when occupied

**Demo Mode Features:**
- **Chart Refresh Rate**: 5 seconds (smooth for video recording)
- **Time Range Toggle**: 24-hour view vs 10-minute demo view
- **Synchronized Charts**: Both brightness and presence charts use same time range
- **Real-time Updates**: ESP32 logs every 30s, charts refresh every 5s

**Chart Improvements:**
- **Daily Brightness Levels**: Shows LDR readings with 30s data updates, 5s chart refresh
- **Presence Detection**: Hourly view or 10-minute demo view
- **Data Points Counter**: Real Firebase log entries count
- **Average PWM**: Calculated from actual LED ON states only

#### Firebase Configuration
```javascript
// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDpAjEMP0MatqhwlLY_clqtpcfGVXkpsS8",
  authDomain: "smartclassroom-af237.firebaseapp.com",
  projectId: "smartclassroom-af237",
  storageBucket: "smartclassroom-af237.firebasestorage.app",
  messagingSenderId: "172327783054",
  appId: "1:172327783054:web:b9bdddfb213ea0dd48d7df",
  measurementId: "G-EHFTC93M2F"
};
```

#### MQTT Topic Structure
```
sensors/
├── lighting/
│   ├── presence          # (unused in camera-only; AI presence via Firebase state)
│   ├── brightness        # LDR analog readings
│   ├── led_state         # LED ON/OFF + PWM
│   ├── temperature       # DHT22 temperature
│   └── air_quality       # MQ-135 readings
├── climate/
│   ├── temperature       # DHT22 temperature (°C)
│   ├── humidity          # DHT22 humidity (%)
│   ├── air_quality       # MQ-135 raw readings
│   ├── fan_state         # Fan ON/OFF + PWM
│   ├── comfort_band      # Temperature band
│   ├── aq_status         # AQ classification
│   ├── mode              # Auto/Manual mode
│   └── boost             # Boost mode status

control/
├── lighting/
│   ├── mode              # Auto/Manual switching
│   ├── led_on            # Manual LED control
│   ├── led_pwm           # Brightness control
│   └── emergency         # Emergency override
├── climate/
│   ├── mode              # Auto/Manual switching
│   ├── fan_on            # Manual fan control
│   ├── fan_pwm           # Fan speed control
│   ├── boost             # Boost mode activation
│   └── thresholds        # Threshold updates

ai/
├── presence/
│   ├── detection         # AI camera results
│   ├── count             # Person count
│   └── confidence        # Detection confidence

system/
├── status/
│   ├── esp32             # ESP32 health
│   └── laptop             # Laptop/PC health
```

### 🧩 Raspberry Pi MQTT Broker (Mosquitto) — Setup & Run

Use your Raspberry Pi as the MQTT hub so ESP32 and Laptop AI can exchange data reliably.

1) Install Mosquitto broker and clients
```bash
sudo apt update
sudo apt install -y mosquitto mosquitto-clients
```

2) Allow LAN access (listen on all interfaces)
```bash
echo "listener 1883 0.0.0.0" | sudo tee /etc/mosquitto/conf.d/lan.conf
echo "allow_anonymous true"   | sudo tee -a /etc/mosquitto/conf.d/lan.conf
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto
```
- Your Pi IP (from user): `192.168.0.102` (use this in ESP32 and AI script)
- Optional: replace `allow_anonymous true` with username/password for security.

3) Test from the Pi (or any LAN device)
```bash
# Terminal 1 (subscriber)
mosquitto_sub -h 192.168.0.102 -t 'sensors/lighting/#' -v

# Terminal 2 (publisher)
mosquitto_pub -h 192.168.0.102 -t 'sensors/lighting/brightness' -m '{"ldrRaw":1234}'
```

4) Run the Pi bridge (mirrors MQTT → Firebase)
```bash
python3 /home/pi/pi_mqtt_firebase_bridge.py --mqtt-host 192.168.0.102 --room roomA
```
Keep this running during demos so the web dashboard stays in sync.

### 🤖 Laptop-Based AI Camera Setup

#### Simplified Architecture Benefits
- **No External Hardware**: Uses your laptop's integrated camera
- **Direct Processing**: AI runs directly on laptop (no streaming needed)
- **Simplified Setup**: No Raspberry Pi or external camera required
- **Better Performance**: Laptop CPU/GPU can handle YOLO processing efficiently
- **Easy Development**: All code runs on familiar laptop environment

#### Laptop AI Processing Workflow
```
Laptop Integrated Camera → YOLO Detection → Firebase Update → ESP32 Response
```

**Step-by-Step Process:**
1. **Camera Capture**: Laptop camera captures video frames (640x480, 20fps)
2. **YOLO Processing**: Real-time human detection using YOLOv8n
3. **Presence Logic**: Determines if people are present in classroom
4. **Firebase Update**: Sends presence data to Firebase Realtime Database
5. **ESP32 Sync**: ESP32 reads Firebase data and controls lighting accordingly

#### Required Laptop Setup
**Hardware Requirements:**
- **Camera**: Integrated laptop camera (720p minimum)
- **RAM**: 8GB+ recommended for smooth YOLO processing
- **CPU**: Multi-core processor (Intel i5/AMD Ryzen 5 or better)
- **Storage**: 2GB+ free space for models and data

**Software Requirements:**
- **Python 3.8+**: For AI processing
- **OpenCV**: Computer vision library
- **YOLO**: Pre-trained model (yolov3-tiny.weights)
- **Firebase SDK**: For cloud integration
- **MQTT Client**: For ESP32 communication

#### AI Detection Features
- **Real-time Processing**: 20fps detection with integrated camera
- **Person Counting**: Exact number of people in classroom
- **Confidence Scoring**: Detection reliability (0.0-1.0)
- **Smart Filtering**: Reduces false positives with debouncing
- **Background Processing**: Runs continuously without user interaction

### 🚀 Quick Start — Camera-Only Smart Lighting (Real-Only Mode)

1) Flash the ESP32 (Camera + LDR Only)
- Open `module3_smart_lighting/ASSIGNMENT_COMPLIANT.ino`.
- Set `WIFI_SSID`, `WIFI_PASS`, and optionally `ROOM_ID`.
- Upload to ESP32. Open Serial Monitor @115200 to confirm WiFi and status.

2) Start MQTT Broker on the Pi
Ensure Mosquitto is running on the Raspberry Pi at `192.168.0.102` (see section above).

3) Run the Camera AI on Laptop
- Ensure Python 3.8+ installed.
- In a terminal from project root:
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r AI_detection/requirements.txt
python AI_detection/yolo_force_gpu.py
```
- The script uses GPU if available; otherwise CPU.
- Presence is REAL ONLY: UI shows presence=true only if `ai_timestamp` is fresh (≤6s).

4) Test End-to-End
- Stand in front of the camera → presence updates to Firebase (`/lighting/{roomId}/state`).
- Cover the LDR → darker reading on ESP32.
- Result: presence AND dark → LED ON (auto), otherwise LED OFF.

Tips:
- Your hardware behaves as: dark ⇒ AO increases. In code `LDR_INVERT = false`.
- If your LDR module outputs LOWER when dark, set `LDR_INVERT = true` instead.
- If you get occasional false positives from the camera, thresholds are tightened in `AI_detection/yolo_force_gpu.py` (conf=0.6, iou=0.5) and smoothing requires 2 of last 3 frames.

---

## Module 2: Smart Climate Control (Fan) Module and Air Quality Monitoring Module

### 🎯 Purpose
Maintain comfortable classroom temperature by controlling a fan and monitor healthy classroom air quality by detecting harmful gases and pollutants.

### ⚡ Features ✅ **UPDATED & ENHANCED**

#### Smart Climate Control (Fan) Module ✅
- **Temperature Sensor**: DHT22 reads current room temperature and humidity
- **Fan or Model Fan**: 3-speed PWM controlled automatically with enhanced logic
- **Enhanced Temperature Logic** ✅ **CORRECTED**:
  - **≤26°C**: Fan LOW (30% PWM) - Slow speed for minimal cooling
  - **26.1-28°C**: Fan MEDIUM (60% PWM) - Moderate speed for comfort  
  - **≥28.1°C**: Fan HIGH (100% PWM) - Maximum speed for cooling
- **Real-time Dashboard**: Live temperature, humidity, fan status with enhanced UI
- **Dual Mode Operation**: Seamless switching between Automatic and Manual modes
- **Manual Override**: Complete user control of fan ON/OFF and speed (0-255 PWM)
- **Firebase Integration**: Real-time synchronization with web dashboard
- **Enhanced Debugging**: Comprehensive logging for system monitoring

#### Air Quality Monitoring Module ✅ **ENHANCED WITH ALERTS**
- **MQ-135 Air Quality Sensor**: Continuous monitoring of CO₂, smoke, and VOCs
- **Intelligent Processing**: Real-time classification with threshold-based alerts
- **Enhanced Alert System** ✅ **NEW**:
  - **Good (0-300)**: Green status, no action required
  - **Moderate (301-400)**: ⚠️ Yellow warning alert to user interface
  - **Poor (401+)**: 🚨 Critical red alert + automatic fan max speed override
- **Continuous Operation**: Monitors air quality 24/7 regardless of presence
- **Smart Integration**: Poor air quality automatically forces fan to maximum speed
- **Enhanced Dashboard**: Prominent visual alerts with detailed status information
- **Historical Tracking**: Complete air quality trend analysis and reporting

### 🔧 Required Hardware
- 1 × ESP32
- 1 × Temperature Sensor (DHT22 to gpio 4)
- 1 × DC Fan (5V DC fan)
- 1 × NPN Transistor (2N2222) to gpio 5
- 1 × MQ-135 Gas Sensor to gpio 32
- Fan control transistor for linking air quality to fan activation
- Jumper wires, breadboard, power supply (if fan needs >5V)

### ✅ Updates: AI-triggered activation, MQTT/Firebase sync, and Raspberry Pi LCD

#### 1) Start/stop on human presence (from Smart Lighting's YOLO)
**Trigger source**: Laptop AI (yolo_force_gpu.py) publishes presence and updates Firebase.

**Enhanced Behavior** ✅ **UPDATED**:
- When presence=true → **DHT22 active**: Temperature-based fan control becomes active
- When presence=false → **DHT22 idle**: Fan turns OFF, but MQ-135 continues monitoring
- **MQ-135 ALWAYS ON**: Air quality monitoring is continuous (24/7) regardless of presence
- **Critical Override**: Poor air quality (401+) forces fan to max speed even without presence

**Reference**: Uses the same AI presence signals defined in the Smart Lighting instructions (topics/paths listed below).

#### 2) Fan logic (clarified & demo-ready mappings)
Keep your original ranges, with LOW never 0% (to avoid stall when <25 °C).

- **LOW**: 30% PWM
- **MEDIUM**: 60% PWM
- **HIGH**: 100% PWM

Manual mode fully overrides sensor logic: ON/OFF and speed set from the app; device writes the final state back to Firebase.

**DC Fan Control:**
- GPIO18 → 220Ω → NPN transistor base
- Fan+ → 5-12V power supply
- Fan- → NPN transistor collector
- NPN transistor emitter → GND
- Diode across fan (anode to +, cathode to -)

**Boost Button (Optional):**
- GPIO27 → Button → GND (with internal pull-up)

**Common Ground:** ESP32 GND ↔ MQ-135 GND ↔ Fan supply GND

### ⚙️ Control Logic

#### Auto Mode ✅ **CORRECTED & ENHANCED**
**Temperature Bands (corrected):**
- **Low**: Temp ≤26°C → Fan LOW (30% PWM) - Slow speed for minimal cooling
- **Moderate**: 26.1-28°C → Fan MEDIUM (60% PWM) - Moderate speed for comfort
- **High**: ≥28.1°C → Fan HIGH (100% PWM) - Maximum speed for cooling

**Enhanced Air Quality Integration** ✅ **NEW LOGIC**:
- **Good AQ (0-300)** → Normal temperature-based fan control
- **Moderate AQ (301-400)** → ⚠️ Warning alert to dashboard (no fan change)
- **Poor AQ (401+)** → 🚨 **CRITICAL OVERRIDE**: Fan forced to MAXIMUM speed + alert

**Hysteresis Logic:**
- Step-up only if band exceeded ≥60 seconds
- Step-down only after dropping below lower band ≥60 seconds
- Prevents fan speed oscillation

#### Manual Mode
- Ignore all sensors
- Dashboard directly controls ON/OFF and PWM (0-255)
- If fan OFF, force PWM=0

#### Boost Mode (Optional)
- One-tap 10-minute HIGH speed
- Overrides current mode temporarily
- Returns to previous mode after timeout

### 📊 Air Quality Classification
**Signal Processing:**
- Apply 5-sample median filter + 10-sample moving average
- Thresholds (UI-tunable): T1 (Good→Moderate), T2 (Moderate→Poor)
- Derive aqStatus ∈ {Good, Moderate, Poor}

### 🗄️ Firebase Data Structure

#### Live State — `/climate/{roomId}/state` ✅ **ENHANCED**
```json
{
  "tempC": 26.5,
  "humidity": 45.2,
  "mode": "auto",
  "fan": {
    "on": true,
    "pwm": 160
  },
  "comfortBand": "Moderate",
  "aqRaw": 245,
  "aqStatus": "Good",
  "aqAlert": "",
  "presence": true,
  "ts": 1703123456789
}
```

#### Enhanced Features ✅ **NEW**
- **aqAlert**: Contains warning/critical messages for UI display
- **presence**: AI-detected human presence from YOLO detection
- **Real-time Timestamps**: Proper NTP-synchronized Unix timestamps
- **Manual Control**: Direct Firebase write support for dashboard controls
- **Removed**: boost mode functionality (simplified system)

#### Logs — `/climate/{roomId}/logs/{autoId}`
- Same structure as state + timestamp
- Log every 30-60 seconds and on significant changes
- Store hundreds of records for trend analysis

### 🖥️ Web Dashboard Features ✅ **ENHANCED UI**

#### Real-time Monitoring Tiles ✅ **IMPROVED**
- **Temperature**: Live temperature readings with corrected thresholds (26°C/28°C)
- **Humidity**: Real-time humidity levels with enhanced display  
- **Air Quality**: MQ-135 readings with prominent 3-tier status indicators
- **Fan Status**: Enhanced display with AQ override indicators
- **Comfort Band**: Visual temperature band classification 
- **AQ Status**: Color-coded status (Good/Moderate/Poor) with alert integration
- **Presence Indicator**: Live AI detection status from YOLO system
- **Stale Data Protection**: Detects and warns about offline ESP32 modules

#### Enhanced Alert System ✅ **NEW**
- **Air Quality Alerts**: Prominent banner alerts for moderate/poor air quality
- **Visual Indicators**: Color-coded warning (yellow) and critical (red, pulsing) states
- **Detailed Information**: Shows raw MQ-135 readings and threshold explanations
- **Fan Action Status**: Indicates when fan is automatically set to maximum due to poor AQ
- **Real-time Updates**: Live alert status changes as air quality fluctuates

#### Control Panel ✅ **ENHANCED**
- **Mode Switch**: Seamless toggle between Automatic and Manual modes  
- **Manual Fan Control**: Direct fan ON/OFF and speed control (0-255 PWM)
- **Firebase Integration**: Real-time synchronization with ESP32 device
- **Enhanced Manual Controls**: Improved responsiveness and user feedback
- **System Status**: Live connection status and data freshness indicators

#### Analytics & Reports
- **Temperature Line Chart**: Daily temperature and humidity trends
- **Fan Runtime Analysis**: Usage statistics and average PWM levels
- **Air Quality Trends**: Historical AQ data and status distribution
- **Energy Savings Report**: Comparison with baseline (always HIGH during school hours)
- **Comfort Analysis**: Time spent in each temperature band

### 🔧 Recent System Improvements ✅ **COMPLETED**

#### Critical Fixes & Enhancements
- **✅ Temperature Threshold Correction**: Fixed fan speed logic from 25°C/28°C to 26°C/28°C
- **✅ Merge Conflict Resolution**: Resolved 14 merge conflicts in ClimateControl.tsx
- **✅ Boost Mode Removal**: Simplified system by removing unused boost functionality
- **✅ Manual Control Fix**: Implemented Firebase direct read for dashboard controls
- **✅ Stale Data Resolution**: Fixed timestamp synchronization issues (millis() → Unix timestamps)
- **✅ Air Quality Alert System**: Implemented comprehensive warning and critical alert UI
- **✅ Enhanced Debugging**: Added extensive logging for system monitoring and troubleshooting

#### Performance Optimizations
- **✅ Sensor Reading Frequency**: Improved from 30s to 2s intervals for faster response
- **✅ Firebase Sync Rate**: Enhanced from 10s to 5s for better real-time performance  
- **✅ NTP Time Synchronization**: Proper timestamp handling with fallback mechanisms
- **✅ Enhanced Error Handling**: Comprehensive sensor fault detection and recovery

#### UI/UX Improvements
- **✅ Alert Banner System**: Prominent visual alerts for air quality warnings
- **✅ Enhanced Status Tiles**: Improved fan status indicators with AQ override display
- **✅ Real-time Data Validation**: Better detection and handling of stale data
- **✅ Color-coded Status**: Visual feedback for different air quality levels

### ✅ Assignment Compliance Analysis

#### Sensor Data Acquisition Module
**Requirements Met:**
- **5+ Sensors/Actuators**: DHT22 (temp+humidity), MQ-135, DC Fan = 4 physical + AI presence = 5+ total ✅
- **Sufficient Records**: 2-5 second logging intervals, 1000+ entries per day ✅
- **Real-time Data**: Live sensor readings with enhanced 2-second update intervals ✅

#### Sensor Data Processing Module
**Requirements Met:**
- **Cloud Database**: Firebase Realtime Database integration ✅
- **Data Retrieval**: Historical data access for analytics ✅
- **Analysis Capabilities**: 4 different report types with charts ✅
- **Business Rules**: Hysteresis, validation, error handling ✅

#### User Interface Module
**Requirements Met:**
- **Web Interface**: React-based responsive dashboard ✅
- **Real-time Communication**: MQTT + Firebase integration ✅
- **Reports & Analytics**: Multiple chart types and data visualization ✅
- **Control Interface**: Manual override and system configuration ✅

### 🛡️ Exception Handling & Reliability

#### Offline Operation
- **Wi-Fi/Firebase down**: Continue local Auto/Manual control
- **Queue Management**: Store up to 200 log entries in ring buffer
- **Reconnection**: Flush queued data on network restore

#### Sensor Fault Detection
- **Temperature/Humidity**: Unchanged (±0.1) for >10 min or NaN → sensorError="TEMP"
- **Air Quality**: Flat/NaN readings → sensorError="AQ"
- **Fallback Strategy**: Hold last safe fan level or MEDIUM speed

#### Command Conflicts
- Set mode first, then apply fan settings to avoid race conditions
- Log all overrides in Firebase for audit trail

### 🧪 Test Cases for Demo ✅ **UPDATED**
1. **Auto Low**: Temp ≤26°C → Fan LOW (30% PWM) - tile + log reflect corrected thresholds
2. **Auto Moderate**: Temp 26.1-28°C → MED (60% PWM) after hysteresis delay
3. **Auto High**: Temp ≥28.1°C → HIGH (100% PWM); step-down respects hysteresis  
4. **Manual Control**: Dashboard slider 0-255 responds instantly via Firebase; OFF forces PWM=0
5. **AQ Moderate**: MQ-135 301-400 → ⚠️ Yellow warning alert in UI (no fan change)
6. **AQ Poor**: MQ-135 401+ → 🚨 Critical red alert + fan forced to MAXIMUM speed
7. **AQ Alert Display**: UI shows detailed alert banners with raw readings and thresholds
8. **Presence Integration**: DHT22 only active when YOLO AI detects presence; MQ-135 always active
9. **Stale Data Detection**: UI warns when ESP32 data is >30s old
10. **Enhanced Logging**: All fan speed changes and AQ alerts logged with detailed reasoning
11. **Offline Resilience**: Local control continues; Firebase sync resumes on reconnection
12. **Real-time Performance**: 2s sensor reads, 5s Firebase sync for responsive operation

#### Smart Lighting Demo Cases (NEW)
9. **Demo Mode Toggle**: Switch between 24h and 10min views → both charts sync
10. **Chart Refresh**: Verify charts update every 5 seconds for smooth demo
11. **Energy Calculations**: Confirm realistic mW values for tiny LED (not watts)
12. **Presence Detection**: AI camera detection shows in both hourly and 10min views
13. **Brightness Chart**: LDR readings update in real-time with proper scaling
14. **Data Points Counter**: Verify count matches actual Firebase log entries
15. **PWM Calculation**: Confirm average PWM only includes LED ON states

### 📄 Submission Artifacts
- **Videos (≤90s each)**: Auto vs Manual; AQ assist; offline/resync (with subtitles)
- **Screenshots**: Live tiles, charts, Firebase paths
- **Hardware Photos**: Wiring, fan driver (transistor + diode)
- **Design Notes**: Block diagram, thresholds, hysteresis, assist timers, failure strategy
- **CSV Export**: Sample of /logs for at least one full day

#### Smart Lighting Demo Artifacts (NEW)
- **Demo Mode Video**: Show 10-minute view toggle and 5-second chart updates
- **Energy Savings Screenshot**: Realistic mW values for tiny LED
- **Chart Synchronization**: Both brightness and presence charts in sync
- **Real-time Updates**: Smooth chart refresh during demo
- **Data Accuracy**: Verify data points counter and PWM calculations

---

## Module 3 — Smart Lighting Control (ESP32 + PIR + LDR AO + LED)
🎯 Purpose
Automate classroom lighting based on presence and ambient brightness, with monitoring and manual control via Firebase.

⚡ Features
Camera AI (Laptop): Detects human presence (people count, confidence).


LDR Module AO (GPIO34): Reads brightness (analog 0–4095).


LED Demo Light (GPIO18, PWM): Dims automatically in Auto mode; fully user-controlled in Manual mode.


Logic


AI Presence and Dark → LED ON (auto-dim by brightness).


No AI presence → LED OFF (energy saving).


Bright room → LED OFF (even if presence).


Firebase Web Dashboard
The system integrates with Firebase Realtime Database.


A web dashboard (accessible via browser) is connected to Firebase and provides:


Real-time display of presence status, brightness value, LED state, and PWM level.


Control panel to switch between Automatic and Manual modes.


In Manual Mode, the user can directly:


Toggle light ON/OFF.


Adjust brightness with a slider (0–255).


All state changes are synced in real time between the ESP32 device and the Firebase database, ensuring the website always shows live information.



Required Hardware

#### ESP32 Module Components
1 × ESP32 (recommended)


1 × Laptop with integrated camera (replaces PIR)


1 × LDR module with AO pin (the blue-potentiometer board)


1 × LED + 220 Ω resistor (demo light)


Breadboard, jumper wires, USB cable, power supply

#### Laptop/PC Requirements
1 × Laptop with integrated camera (720p minimum)


8GB+ RAM (recommended for YOLO processing)


Multi-core processor (Intel i5/AMD Ryzen 5 or better)


2GB+ free storage space


WiFi connectivity for MQTT and Firebase communication



🔌 Wiring (ESP32)
LDR Module (AO)
VCC → 3.3 V (keeps AO within ESP32 ADC limits)


GND → GND


AO → GPIO34 (ADC input-only)


Camera AI is on the laptop; no PIR wiring is required.


LED (demo light)
GPIO18 (PWM) → 220 Ω → LED anode (+)


LED cathode (–) → GND


Common ground: ESP32 GND ↔ LDR GND ↔ LED (–)

⚙️ Control Logic (Auto vs Manual)
Auto Mode
Read AI presence (from Firebase) and LDR AO (brightness).


If presence = true and ldrRaw > DARK_THRESHOLD → LED ON with PWM mapped from LDR (darker = brighter).


If presence = false or ldrRaw < BRIGHT_THRESHOLD → LED OFF.


Use hysteresis (two thresholds) to avoid flicker:


BRIGHT_THRESHOLD < DARK_THRESHOLD

#### LED Brightness Mapping (Demo-Ready)
- Hardware confirmed behavior: dark ⇒ AO increases (up to 4095), bright ⇒ lower AO (~1100).
- Current thresholds in code: `BRIGHT_THRESHOLD = 1500`, `DARK_THRESHOLD = 2500`.
- Discrete PWM mapping for clear visual demo:
  - `ldrRaw ≥ 4000` → PWM 255 (100%)
  - `ldrRaw ≥ 3500` → PWM 200 (~78%)
  - `ldrRaw ≥ 3000` → PWM 150 (~59%)
  - `ldrRaw ≥ 2500` → PWM 100 (~39%)
  - `ldrRaw ≥ 2000` → PWM 50  (20%)
  - `< 1500` (bright) → PWM 0 (OFF)

This makes brightness changes obvious during demo: flashlight on LDR → OFF, normal room → medium, cover with hand → 100%.


Manual Mode
Ignore sensors.


LED obeys Firebase commands: on and pwm (0–255).





Module Extra 1:Voice Control via Mobile App & Cloud Integration

Overview:
 The system integrates app-based voice control, allowing users to operate classroom devices (lights) hands-free using platforms like Google Assistant.


How It Works:


Users issue voice commands (e.g., “Turn on the classroom ligh and fant”) through their mobile device or smart speaker.


The mobile app (e.g., Blynk, Node-RED Dashboard, or Google Home) recognizes the command and triggers the corresponding virtual button/action.


The app sends the control signal via WiFi or the cloud to the IoT device (ESP32/NodeMCU).


The IoT device executes the command, turning lights or fan ON/OFF or adjusting settings.


Example Scenario:


The teacher says “OK Google, turn on the classroom light.”


Google Assistant recognizes the phrase and sends a command to the app.


The app triggers the ESP32 to turn on the light instantly.

• Log to Firebase every 30–60s: {ts, presence, ldrRaw(0–4095), mode('auto'|'manual'), led:{on:boolean,pwm:0–255}} under /lighting/{roomId}/logs/{ts}. Also mirror live state at /lighting/{roomId}/state.
BMIT2123 Assignment (202505)

 • Build reports on the web dashboard (read from logs):
 (1) Daily Brightness Line Chart (ldrRaw vs time), (2) Presence Heatmap/Bar (detections per hour), (3) LED Runtime & Avg PWM (minutes ON, mean PWM), (4) Energy Saved vs baseline (assume baseline = LED always ON at PWM=255 during occupied hours).
BMIT2123 Assignment (202505)

 • Keep “sufficient records” (at least a few hundred rows over several hours/days) so graphs show clear trends.
BMIT2123 Assignment (202505)
✅ Validations & Business Rules (NEW)
 • ADC sanity: clamp ldrRaw to 0–4095; ignore NaN/-1; apply a 5-sample median filter before mapping to PWM.
BMIT2123 Assignment (202505)

 • AI presence smoothing: use short history (e.g., 2–3 frames) to reduce flicker.
BMIT2123 Assignment Marking Sch…

 • PWM guardrails: always clamp 0–255; if mode=manual and on=false, force PWM=0.
BMIT2123 Assignment (202505)

 • Hysteresis constants: BRIGHT_THRESHOLD=2800, DARK_THRESHOLD=3200 (ensure BRIGHT < DARK). Document these in code & UI.
BMIT2123 Assignment (202505)

 • Business-rule checks: if presence=true and ldrRaw>DARK_THRESHOLD → auto map to PWM; if ldrRaw<BRIGHT_THRESHOLD or presence=false → LED OFF. (State machine documented in report.)
BMIT2123 Assignment (202505)
🛡️ Exception Handling & Offline Tolerance (NEW)
 • Wi-Fi/Firebase down: keep local control running; queue up to 200 log entries in a ring buffer; retry with exponential back-off; flush on reconnect.
BMIT2123 Assignment Marking Sch…

 • Sensor faults: if ldrRaw unchanged ±5 for >10 min or reads invalid, raise state.sensorError='LDR' and fall back to presence-only control; if AI feed unavailable, switch to brightness-only. Never crash; no restart needed.
BMIT2123 Assignment Marking Sch…

 • Command conflicts: when switching Manual ↔ Auto, atomically set mode first, then apply on/pwm to avoid race conditions. Log all overrides in /logs.
BMIT2123 Assignment Marking Sch…
🧪 Test Cases for Demo (NEW)
 • Bright room + presence → LED stays OFF.
 • Dark room + presence → LED ON, PWM rises as it gets darker.
 • Manual mode → slider changes PWM instantly; toggle OFF forces PWM=0.
 • Network unplugged → UI freezes but device still follows sensors; upon reconnection, logs backfill and UI resyncs.
 (These map to Validations/Reports, Exception Handling, and Program Logic marks.)
BMIT2123 Assignment (202505)
🖥️ Dashboard Extras (NEW)
 • Mode switch + live tiles (Presence, LDR, LED ON/OFF, PWM).
 • Reports tab with the 4 charts and a CSV export of logs for lecturer verification.
BMIT2123 Assignment (202505)
📄 Presentation & Submission Artifacts (NEW)
 • Short video ≤90 s with subtitles showing: (i) Auto logic, (ii) Manual control, (iii) Offline handling, (iv) Reports page.
BMIT2123 Assignment (202505)

 • Each member presents their own module; include your architecture & state-flow slide.
BMIT2123 Assignment (202505)

 • Zip upload: PDF report (with diagrams, screenshots), complete source code, Firebase details, and video(s); name as Programme_Tutorial_Leader.zip and submit to Google Classroom. 

