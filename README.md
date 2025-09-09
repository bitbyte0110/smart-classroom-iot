
npm install firebase

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDpAjEMP0MatqhwlLY_clqtpcfGVXkpsS8",
  authDomain: "smartclassroom-af237.firebaseapp.com",
  projectId: "smartclassroom-af237",
  storageBucket: "smartclassroom-af237.firebasestorage.app",
  messagingSenderId: "172327783054",
  appId: "1:172327783054:web:b9bdddfb213ea0dd48d7df",
  measurementId: "G-EHFTC93M2F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


Module 3 — Smart Lighting Control (ESP32 + PIR + LDR AO + LED)
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


Firebase App/Dashboard


View: presence, brightness value, light state, PWM level.


Switch Auto ↔ Manual.


Manual: set ON/OFF and brightness slider.



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



Module 2:Smart Climate Control (Fan) Module

Purpose: Maintain comfortable classroom temperature by controlling a fan.
Features:
Temperature Sensor (e.g., DHT11, DHT22, or DS18B20): Reads current room temperature.


Fan or Model Fan: Speed controlled automatically.


Logic:


If temperature is low (<25°C): Fan OFF or LOW.


If temperature is moderate (25–29°C): Fan MEDIUM.


If temperature is high (>29°C): Fan HIGH.


App/Dashboard:


View real-time temperature and fan speed/status.


Switch between Automatic and Manual modes.


Manual mode: User can turn fan ON/OFF or set speed from the app.



Required Hardware:
1 × ESP32 / NodeMCU / Arduino UNO
 (If using only one controller for both modules, just need one; else, one for each.)


1 × Temperature Sensor
 (Choose one: DHT11, DHT22, or DS18B20. DHT22 is more accurate than DHT11.)


1 × DC Fan or Model Fan
 (You can use a small 5V DC fan, or any fan compatible with your power supply.)


1 × NPN Transistor (e.g., 2N2222, S8050)
 (To switch the fan, since the microcontroller pin can’t supply enough current.)


1 × Diode (e.g., 1N4007)
 (Protects circuit from back EMF from the fan.)



(Optional) 1 × Button
 (For mode switch/manual override.)


Jumper wires, breadboard, power supply (if fan needs >5V)

Module Extra 2:Air Quality Monitoring Module

Purpose:
 Monitor and maintain healthy classroom air quality by detecting harmful gases and pollutants.
Features:
MQ-135 Air Quality Sensor:
 Detects air pollutants such as CO₂, smoke, and volatile organic compounds (VOCs).


Microcontroller (ESP32/NodeMCU/Arduino):
 Reads sensor data and processes air quality levels.
Logic:
Sensor continuously measures air quality values.


If air quality is good (below threshold) → status is displayed as "Good," no action required.


If air quality is moderate (within set range) → status is displayed as "Moderate," system can send a mild alert.


If air quality is poor (above threshold) → status is displayed as "Poor,"


System can automatically turn on the ventilation fan or send a real-time alert via the app.


App/Dashboard:
View real-time air quality value and status (Good/Moderate/Poor).


Monitor the history or trends of classroom air quality.

Module 1:Smart Door Access with RFID

Goal: Control access using RFID authentication and log attendance, while ensuring emergency safety through manual and automatic unlock mechanisms.
 Components:
RFID Reader (RC522 / PN532): Reads RFID tags/cards for authentication.


ESP32 / NodeMCU / Arduino: Processes RFID input, controls lock, and logs attendance.


Servo Motor: Locks/unlocks the door.


PIR / Ultrasonic Sensor: Detects presence near the door.


LED & Buzzer: Provides feedback (access granted/denied, alerts).


Firebase / SD Card: Stores attendance logs.


Push Button (Emergency Unlock): Allows door to be unlocked during emergencies.


Integration with Air Quality Module: Automatically triggers emergency unlock if poor air quality (e.g., smoke, gas) is detected.


🔍 Features:
RFID authentication for authorized access.


Logs entry time and stores attendance records.


Visual and audio feedback (LED & buzzer).


Emergency unlock via push button (manual override).


Automatic unlock triggered by Air Quality Monitoring Module during hazardous conditions.



🔹 Full Component List
Core Controllers
1 × ESP32 dev board (on breadboard)


1 × Raspberry Pi (with Grove HAT, runs MQTT broker + dashboard UI)


Sensors
1 × DHT22/DHT11 temperature & humidity sensor


1 × MQ-135 Air Quality Sensor (for CO₂, smoke, VOCs)


Actuators
1 × 5 V DC Fan (or bigger AC fan if using relay)


1 × NPN Transistor (2N2222, S8050, or similar) for fan control


1 × Flyback Diode (1N4007) across fan


1 × Relay Module (optional, if you want to control bigger fan/AC fan)


Supporting Parts
Resistors:


1 × 1 kΩ (base resistor for transistor)


1 × 10 kΩ (pull-up for DHT if not built-in)


(Optional) Button for Auto/Manual switching


Breadboard


Jumper wires (M–M, M–F as needed)


Power supply (5 V for fan, ESP32 from USB)



🔹 Wiring Setup
A) ESP32 + DHT Sensor
DHT VCC → ESP32 3.3 V


DHT GND → ESP32 GND


DHT Data → ESP32 GPIO 4 (with 10 kΩ pull-up to 3.3 V if needed)


B) ESP32 + MQ-135
MQ-135 VCC → ESP32 5 V (needs 5 V for heating element)


MQ-135 GND → ESP32 GND


MQ-135 A0 (analog out) → ESP32 GPIO 34 (ADC input)
 (ESP32 analog pins: 32, 33, 34, 35, 36, 39)


C) ESP32 + Fan Control
If DC Fan (5 V):
Fan + → 5 V


Fan – → Collector of 2N2222


2N2222 Emitter → GND


ESP32 GPIO 16 → 1 kΩ resistor → Base of 2N2222


Diode 1N4007 across fan (stripe side → 5 V, other side → fan –)


If AC Fan:
Use Relay Module instead of transistor


ESP32 pin (e.g., GPIO 16) → Relay IN


Relay VCC → 5 V, Relay GND → GND


AC Fan wiring goes through relay (like a switch)


D) Button (Optional)
Button one side → ESP32 GPIO 14


Other side → GND


Use internal pull-up in code



🔹 Raspberry Pi Role
Runs Mosquitto MQTT broker


Runs UI dashboard (Node-RED or Flask app)


No physical wiring to sensors/fan — only network communication with ESP32.



🔹 Logic in Software
ESP32 reads temperature (DHT22) + air quality (MQ-135).


ESP32 applies logic:


Temperature < 25 °C → Fan OFF


25–29 °C → Fan Medium


29 °C → Fan High



MQ-135 < threshold → Good


MQ-135 moderate → Alert


MQ-135 high → Poor (trigger ventilation fan via relay/fan control)


ESP32 publishes results to MQTT topics:


climate/temp


climate/fan


airquality/value


airquality/status


Raspberry Pi dashboard subscribes to these and shows live data.

🔹 1. NPN Transistor (2N2222 / S8050)
Transistors have 3 pins:
C = Collector (connects to fan –)


B = Base (signal from ESP32 via resistor)


E = Emitter (goes to GND)


Wiring:
Collector (C) → Fan negative (–)


Emitter (E) → Breadboard GND (shared with ESP32 GND)


Base (B) → 1 kΩ resistor → ESP32 GPIO (e.g. GPIO 16, PWM pin)



🔹 2. Flyback Diode (1N4007)
This protects your ESP32/transistor when fan switches OFF.
Orientation:
Diode has a stripe = Cathode (–).


Connect it across the fan terminals:


Stripe side → Fan + (5 V)


Non-stripe side → Fan – (Collector of transistor)




🔹 4. Resistors
1 kΩ: Between ESP32 GPIO (e.g., GPIO 16) and transistor base (B).


10 kΩ: Pull-up resistor for DHT22 data pin → between DHT DATA and 3.3 V (skip if your module already has one).



🔹 5. Breadboard Layout (Text Map)
Imagine your breadboard split into left (ESP32 side) and right (fan + transistor side):
ESP32 3.3 V → DHT VCC


ESP32 GND → Breadboard GND rail


ESP32 GPIO 4 → DHT Data (with 10 kΩ pull-up to 3.3 V)


ESP32 GPIO 34 → MQ-135 A0 output


ESP32 5 V → MQ-135 VCC and Fan + terminal


Fan control path:
Fan + → 5 V rail


Fan – → Collector of transistor


Emitter of transistor → GND


ESP32 GPIO 16 → 1 kΩ resistor → Base of transistor


Flyback diode across fan (stripe → +5 V, other end → Fan –)



✅ This way:
ESP32 controls the transistor → switches fan ON/OFF or PWM speed.


Relay module is only needed if you want to drive AC fan or big motor.


