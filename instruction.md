
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

