
# 🏫 Smart Classroom IoT System - Module 3: Smart Lighting Control

## 📋 System Overview & Assignment Compliance

### 🎯 Assignment Requirements Met
- **System Type**: Smart Campus Application ✅
- **Hardware**: ESP32 (NodeMCU) + Laptop Camera ✅
- **Sensors/Actuators**: 4+ (LDR, LED, AI Camera, Manual Controls) ✅
- **Cloud Integration**: Firebase Realtime Database ✅
- **User Interface**: Web-based dashboard with real-time monitoring ✅
- **Data Processing**: Real-time sensor data with analytics and reporting ✅

### 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ESP32 Device  │    │  Laptop/PC      │    │  Web Dashboard  │
│                 │    │                 │    │                 │
│ • Manual Controls│◄──►│ • AI Detection  │◄──►│ • React App     │
│ • LDR Sensor    │    │ • Integrated    │    │ • Firebase UI   │
│ • LED Control   │    │   Camera        │    │ • Analytics     │
│                 │    │ • Firebase Sync │    │ • Reports       │
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
- `sensors/lighting/presence` - (unused in camera-only; AI presence via Firebase state)
- `sensors/lighting/brightness` - LDR analog readings (0-4095)
- `sensors/lighting/led_state` - LED ON/OFF and PWM level
- `sensors/lighting/temperature` - DHT22 temperature readings
- `sensors/lighting/air_quality` - MQ-135 air quality values
- `sensors/lighting/mode` - Auto/Manual mode status

**Subscribes to:**
- `control/lighting/mode` - Mode switching commands (auto/manual)
- `control/lighting/led_on` - Manual LED ON/OFF commands
- `control/lighting/led_pwm` - Manual brightness control (0-255)
- `control/lighting/emergency` - Emergency override commands

#### Laptop/PC (Publisher & Subscriber)
**Publishes to:**
- `ai/presence/detection` - AI camera human detection results
- `ai/presence/count` - Number of people detected
- `ai/presence/confidence` - Detection confidence scores
- `system/status/laptop` - Laptop system health

**Subscribes to:**
- `sensors/lighting/*` - All sensor data from ESP32
- `control/lighting/*` - All control commands
- `system/status/esp32` - ESP32 health status

#### Web Dashboard (Subscriber Only)
**Subscribes to:**
- `sensors/lighting/*` - Real-time sensor data
- `ai/presence/*` - AI detection results
- `system/status/*` - System health monitoring

### 💻 Laptop/PC vs ESP32 Roles

#### ESP32 (Edge Device - Sensor Hub)
**Primary Functions:**
- **Sensor Data Collection**: LDR, Temperature, Air Quality
- **Actuator Control**: LED PWM control, Fan speed control
- **Local Processing**: Sensor filtering, debouncing, validation
- **MQTT Publishing**: Real-time sensor data to cloud
- **Offline Operation**: Continues working without internet
- **Hardware Interface**: Direct GPIO control of sensors/actuators

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
- **Presence Status**: AI detection (camera) with confidence indicators
- **Brightness Level**: LDR readings with visual gauge (0-4095)
- **LED Status**: ON/OFF state with PWM level display (0-255)
- **Temperature**: Current room temperature with trend graph
- **Air Quality**: MQ-135 readings with health status indicators
- **System Mode**: Auto/Manual mode with visual toggle

**Control Panel:**
- **Mode Switch**: Toggle between Automatic and Manual modes
- **Manual LED Control**: ON/OFF toggle and brightness slider (0-255)
- **Emergency Override**: Force unlock/override all systems
- **Settings Panel**: Threshold adjustments, calibration tools

**Analytics & Reports:**
- **Daily Brightness Chart**: LDR readings over time with day/night cycles
- **Presence Heatmap**: Hourly detection patterns and occupancy trends
- **LED Runtime Analysis**: Usage statistics and energy consumption
- **Energy Savings Report**: Comparison with baseline (always-on scenario)
- **Air Quality Trends**: Historical air quality data and alerts
- **System Health**: Uptime, error logs, and performance metrics

**Data Export:**
- **CSV Download**: Complete sensor logs for analysis
- **PDF Reports**: Formatted reports for submission
- **Real-time Data**: Live streaming of all sensor values

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

control/
├── lighting/
│   ├── mode              # Auto/Manual switching
│   ├── led_on            # Manual LED control
│   ├── led_pwm           # Brightness control
│   └── emergency         # Emergency override

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

## Module 3 — Smart Lighting Control (ESP32 + LDR AO + LED + Camera AI)
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

