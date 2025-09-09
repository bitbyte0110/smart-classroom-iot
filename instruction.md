
# 🏫 Smart Classroom IoT System - Multi-Module Architecture

## 📋 System Overview & Assignment Compliance

### 🎯 Assignment Requirements Met
- **System Type**: Smart Campus Application ✅
- **Hardware**: ESP32 (NodeMCU) + Raspberry Pi 4 ✅
- **Sensors**: 5+ inputs/outputs per module (Lighting: PIR, LDR, LED, Temperature, Air Quality | Climate: Temperature, Humidity, Air Quality, Fan, Boost Button) ✅
- **Cloud Integration**: Firebase Realtime Database ✅
- **User Interface**: Web-based dashboard with real-time monitoring ✅
- **Data Processing**: Real-time sensor data with analytics and reporting ✅

### 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ESP32 Device  │    │  Raspberry Pi   │    │  Web Dashboard  │
│                 │    │                 │    │                 │
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
**Module 3 - Lighting:**
- `sensors/lighting/presence` - PIR motion detection status
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

**Module 2 - Climate:**
- `control/climate/mode` - Mode switching commands (auto/manual)
- `control/climate/fan_on` - Manual fan ON/OFF commands
- `control/climate/fan_pwm` - Manual fan speed control (0-255)
- `control/climate/boost` - Boost mode activation (10-minute override)
- `control/climate/thresholds` - Temperature and AQ threshold updates

#### Raspberry Pi (Publisher & Subscriber)
**Publishes to:**
- `ai/presence/detection` - AI camera human detection results
- `ai/presence/count` - Number of people detected
- `ai/presence/confidence` - Detection confidence scores
- `system/status/pi` - Raspberry Pi system health

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

### 🍓 Raspberry Pi vs ESP32 Roles

#### ESP32 (Edge Device - Sensor Hub)
**Primary Functions:**
- **Sensor Data Collection**: PIR, LDR, Temperature, Humidity, Air Quality
- **Actuator Control**: LED PWM control, Fan speed control (PWM)
- **Local Processing**: Sensor filtering, debouncing, validation, hysteresis logic
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

#### Raspberry Pi (Gateway & AI Processing)
**Primary Functions:**
- **MQTT Broker**: Mosquitto MQTT server for device communication
- **AI Processing**: YOLO human detection with camera
- **Data Logging**: Historical data storage and analytics
- **Web Server**: Hosting React dashboard application
- **Cloud Gateway**: Firebase integration and data synchronization
- **System Monitoring**: Health checks and error reporting

**Technical Specifications:**
- **CPU**: Quad-core 64-bit ARM Cortex-A72 @ 1.5GHz
- **Memory**: 4GB/8GB LPDDR4 RAM
- **Storage**: 32GB+ microSD card
- **Connectivity**: WiFi 802.11ac, Bluetooth 5.0, Gigabit Ethernet
- **Camera**: Pi Camera Module or USB webcam
- **OS**: Raspberry Pi OS (Debian-based)

### 🖥️ User Interface Specifications

#### Web Dashboard Features
**Real-time Monitoring Tiles:**
**Module 3 - Lighting:**
- **Presence Status**: PIR + AI detection with confidence indicators
- **Brightness Level**: LDR readings with visual gauge (0-4095)
- **LED Status**: ON/OFF state with PWM level display (0-255)
- **System Mode**: Auto/Manual mode with visual toggle

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
- **Daily Brightness Chart**: LDR readings over time with day/night cycles
- **Presence Heatmap**: Hourly detection patterns and occupancy trends
- **LED Runtime Analysis**: Usage statistics and energy consumption
- **Energy Savings Report**: Comparison with baseline (always-on scenario)

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

### 📊 Assignment Compliance Analysis

#### ✅ Sensor Data Acquisition Module
**Requirements Met:**
- **5+ Sensors/Actuators**: PIR, LDR, LED, Temperature (DHT22), Air Quality (MQ-135) = 5 inputs/outputs ✅
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
│   ├── presence          # PIR detection status
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
│   └── pi                # Raspberry Pi health
```

---

## Module 2 — Smart Climate Control (ESP32 + DHT22 + MQ-135 + DC Fan)

### 🎯 Purpose & Scope
Maintain classroom comfort by controlling a DC fan from temperature (DHT22) and assisting ventilation from air quality (MQ-135), with manual override and real-time monitoring via Firebase.

### ⚡ Features
- **DHT22 Temperature & Humidity Sensor (GPIO4)**: Reads room temperature and humidity
- **MQ-135 Air Quality Sensor (GPIO35)**: Monitors air quality for ventilation assistance
- **DC Fan with PWM Control (GPIO18)**: Variable speed fan control via NPN transistor
- **Boost Button (GPIO27)**: Optional 10-minute high-speed override
- **Firebase Integration**: Real-time data logging and web dashboard control

### 🔧 Hardware Requirements
**Core Components:**
- 1 × ESP32 development board (Wi-Fi)
- 1 × DHT22 temperature & humidity sensor
- 1 × MQ-135 gas sensor (AO output)
- 1 × DC fan (5–12V)
- 1 × NPN transistor (2N2222/S8050) as low-side switch
- 1 × Diode (1N4007) across fan for back-EMF protection
- 1 × Push button for "Boost 10 min" override (optional)
- Breadboard, jumper wires, suitable power supply

### 🔌 Wiring (ESP32)
**DHT22 Temperature & Humidity:**
- VCC → 3.3V
- GND → GND
- DATA → GPIO4 (with 10kΩ pull-up to 3.3V)

**MQ-135 Air Quality:**
- VCC → 5V
- GND → GND
- AO → GPIO35 (ADC input)

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

#### Auto Mode
**Temperature Bands (tunable):**
- **Low**: Temp < 25°C → Fan OFF/LOW (PWM=90)
- **Moderate**: 25-29°C → Fan MEDIUM (PWM=160)
- **High**: >29°C → Fan HIGH (PWM=230)

**Air Quality Assistance:**
- **Good AQ** → No change to temperature-based speed
- **Moderate AQ** → +1 speed step for 5-10 minutes
- **Poor AQ** → Force HIGH for 10-15 minutes, then re-evaluate

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

#### Live State — `/climate/{roomId}/state`
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
  "ts": 1703123456789
}
```

#### Commands — `/climate/{roomId}/cmd`
```json
{
  "mode": "manual",
  "fan": {
    "on": true,
    "pwm": 200
  },
  "boost": {
    "enabled": true,
    "minutes": 10
  },
  "thresholds": {
    "tLow": 25,
    "tHigh": 29,
    "aqT1": 200,
    "aqT2": 400
  }
}
```

#### Logs — `/climate/{roomId}/logs/{autoId}`
- Same structure as state + timestamp
- Log every 30-60 seconds and on significant changes
- Store hundreds of records for trend analysis

### 🖥️ Web Dashboard Features

#### Real-time Monitoring Tiles
- **Temperature**: Current room temperature with trend graph (°C)
- **Humidity**: Current humidity level with trend graph (%)
- **Air Quality**: MQ-135 readings with health status indicators
- **Fan Status**: ON/OFF state with PWM level display (0-255)
- **Comfort Band**: Current temperature band (Low/Moderate/High)
- **AQ Status**: Air quality classification (Good/Moderate/Poor)
- **Boost Mode**: 10-minute override status and countdown timer

#### Control Panel
- **Mode Switch**: Toggle between Automatic and Manual modes
- **Manual Fan Control**: ON/OFF toggle and speed slider (0-255)
- **Boost Button**: 10-minute high-speed override
- **Threshold Settings**: Temperature bands and AQ thresholds
- **Comfort Settings**: Customizable temperature ranges

#### Analytics & Reports
- **Temperature Line Chart**: Daily temperature and humidity trends
- **Fan Runtime Analysis**: Usage statistics and average PWM levels
- **Air Quality Trends**: Historical AQ data and status distribution
- **Energy Savings Report**: Comparison with baseline (always HIGH during school hours)
- **Comfort Analysis**: Time spent in each temperature band

### ✅ Assignment Compliance Analysis

#### Sensor Data Acquisition Module
**Requirements Met:**
- **5+ Sensors/Actuators**: DHT22 (temp+humidity), MQ-135, DC Fan, Boost Button = 5 inputs/outputs ✅
- **Sufficient Records**: 30-60 second logging intervals, 200+ entries per day ✅
- **Real-time Data**: Live sensor readings with 2-second update intervals ✅

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

### 🧪 Test Cases for Demo
1. **Auto Low**: Temp < 25°C → Fan OFF/LOW (tile + log reflect)
2. **Auto Moderate**: Raise to 25-29°C → MED after ≥60s; step-down respects hysteresis
3. **Auto High**: >29°C → HIGH; drop only after delay + lower band
4. **Manual**: Slider 0-255 responds instantly; OFF forces PWM=0
5. **AQ Moderate**: Drive aqRaw into Moderate → +1 step for 5-10 min
6. **AQ Poor**: Drive aqRaw above T2 → HIGH for 10-15 min, then re-evaluate
7. **Offline**: Cut Wi-Fi → local control continues; restore → logs backfill & UI resync
8. **Fault**: Simulate bad DHT/MQ-135 read → UI shows sensorError; safe fallback applies

### 📄 Submission Artifacts
- **Videos (≤90s each)**: Auto vs Manual; AQ assist; offline/resync (with subtitles)
- **Screenshots**: Live tiles, charts, Firebase paths
- **Hardware Photos**: Wiring, fan driver (transistor + diode)
- **Design Notes**: Block diagram, thresholds, hysteresis, assist timers, failure strategy
- **CSV Export**: Sample of /logs for at least one full day

---

## Module 3 — Smart Lighting Control (ESP32 + PIR + LDR AO + LED)
🎯 Purpose
Automate classroom lighting based on presence and ambient brightness, with monitoring and manual control via Firebase.

⚡ Features
PIR (GPIO27): Detects human presence.


LDR Module AO (GPIO34): Reads brightness (analog 0–4095).


LED Demo Light (GPIO18, PWM): Dims automatically in Auto mode; fully user-controlled in Manual mode.


Logic


Presence and Dark → LED ON (auto-dim by brightness).


No presence → LED OFF (energy saving).


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
1 × ESP32 (recommended)


1 × PIR motion sensor (HC-SR501)


1 × LDR module with AO pin (the blue-potentiometer board)


1 × LED + 220 Ω resistor (demo light)


Breadboard, jumper wires, USB cable, power supply



🔌 Wiring (ESP32)
LDR Module (AO)
VCC → 3.3 V (keeps AO within ESP32 ADC limits)


GND → GND


AO → GPIO34 (ADC input-only)


PIR (HC-SR501)
VCC → 5 V


GND → GND


OUT → GPIO27 (digital input)


Most modules output ~3.3 V HIGH (safe). If yours is 5 V, add divider: OUT→220 kΩ→GPIO27, GPIO27→100 kΩ→GND.


LED (demo light)
GPIO18 (PWM) → 220 Ω → LED anode (+)


LED cathode (–) → GND


Common ground: ESP32 GND ↔ PIR GND ↔ LDR GND ↔ LED (–)

⚙️ Control Logic (Auto vs Manual)
Auto Mode
Read PIR (presence) and LDR AO (brightness).


If presence = true and ldrRaw > DARK_THRESHOLD → LED ON with PWM mapped from LDR (darker = brighter).


If presence = false or ldrRaw < BRIGHT_THRESHOLD → LED OFF.


Use hysteresis (two thresholds) to avoid flicker:


BRIGHT_THRESHOLD < DARK_THRESHOLD


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

 • PIR debounce: require a stable HIGH ≥200 ms; add a 2 s cooldown to prevent flicker.
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

 • Sensor faults: if ldrRaw unchanged ±5 for >10 min or reads invalid, raise state.sensorError='LDR' and fall back to presence-only control; if PIR stuck, switch to brightness-only. Never crash; no restart needed.
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

