import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update, push, connectDatabaseEmulator } from "firebase/database";

// Firebase config from instruction.md
const firebaseConfig = {
  apiKey: "AIzaSyDpAjEMP0MatqhwlLY_clqtpcfGVXkpsS8",
  authDomain: "smartclassroom-af237.firebaseapp.com",
  projectId: "smartclassroom-af237",
  storageBucket: "smartclassroom-af237.firebasestorage.app",
  messagingSenderId: "172327783054",
  appId: "1:172327783054:web:b9bdddfb213ea0dd48d7df",
  measurementId: "G-EHFTC93M2F"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Connect to emulator for local development
connectDatabaseEmulator(db, "localhost", 9000);

const roomId = "roomA";
const stateRef = ref(db, `/lighting/${roomId}/state`);
const logsRef = ref(db, `/lighting/${roomId}/logs`);

// System state
let mode = "auto"; // "auto" | "manual"
let manual = { on: false, pwm: 0 };
let presence = false;
let ldrRaw = 3000; // Start with moderate brightness
let sensorError = null;

// Constants from requirements
const BRIGHT_THRESHOLD = 2800;
const DARK_THRESHOLD = 3200;

// Helpers
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const mapToPwm = (ldr) => clamp(Math.round((4095 - ldr) * (255 / 4095)), 0, 255);

// Median filter for LDR (5 samples)
const ldrHistory = [];
const getFilteredLDR = (rawValue) => {
  ldrHistory.push(rawValue);
  if (ldrHistory.length > 5) ldrHistory.shift();
  
  const sorted = [...ldrHistory].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

// PIR debounce state
let pirLastHigh = 0;
let pirCooldown = 0;
let pirStableHigh = false;

const debouncePIR = (currentReading) => {
  const now = Date.now();
  
  if (currentReading && !pirStableHigh) {
    if (pirLastHigh === 0) {
      pirLastHigh = now;
    } else if (now - pirLastHigh >= 200) { // 200ms stable HIGH
      pirStableHigh = true;
      pirCooldown = now + 2000; // 2s cooldown
    }
  } else if (!currentReading) {
    pirLastHigh = 0;
    if (now > pirCooldown) {
      pirStableHigh = false;
    }
  }
  
  return pirStableHigh && now > pirCooldown;
};

// Write state to Firebase
async function writeState(state) {
  const ts = Date.now();
  const stateWithTs = { ...state, ts };
  
  try {
    await update(stateRef, stateWithTs);
    await set(ref(db, `/lighting/${roomId}/logs/${ts}`), stateWithTs);
    console.log(`[${new Date(ts).toLocaleTimeString()}] State updated:`, 
      `presence=${state.presence}, ldr=${state.ldrRaw}, mode=${state.mode}, led=${state.led.on}(${state.led.pwm})`);
  } catch (error) {
    console.error("Firebase write error:", error);
  }
}

// Listen for manual mode commands
onValue(stateRef, (snapshot) => {
  const value = snapshot.val();
  if (!value) return;
  
  if (value.mode && value.mode !== mode) {
    console.log(`Mode changed from ${mode} to ${value.mode}`);
    mode = value.mode;
  }
  
  if (value.mode === "manual" && value.led) {
    manual = { 
      on: !!value.led.on, 
      pwm: clamp(value.led.pwm || 0, 0, 255) 
    };
  }
});

// Simulate realistic day/night cycle and occupancy patterns
let timeOfDay = 0; // 0-24 hours simulation
const simulateRealisticConditions = () => {
  timeOfDay += 0.1; // 6 minutes per real second = 4-hour day cycle
  if (timeOfDay >= 24) timeOfDay = 0;
  
  // Simulate natural light curve (bright at noon, dark at night)
  const lightBase = 2048 + 1500 * Math.sin((timeOfDay - 6) * Math.PI / 12);
  const noise = (Math.random() - 0.5) * 200;
  ldrRaw = clamp(Math.round(lightBase + noise), 0, 4095);
  
  // Simulate occupancy patterns (higher during "work hours")
  const occupancyProbability = timeOfDay > 8 && timeOfDay < 18 ? 0.7 : 0.1;
  const rawPresence = Math.random() < occupancyProbability;
  presence = debouncePIR(rawPresence);
  
  // Simulate occasional sensor errors
  if (Math.random() < 0.002) { // 0.2% chance
    sensorError = Math.random() < 0.5 ? "LDR" : "PIR";
    setTimeout(() => { sensorError = null; }, 5000); // Clear after 5s
  }
};

// Apply business logic
const calculateLEDState = () => {
  let led = { on: false, pwm: 0 };
  
  if (mode === "manual") {
    led.on = manual.on;
    led.pwm = led.on ? clamp(manual.pwm, 0, 255) : 0;
  } else {
    // Auto mode with hysteresis
    const filteredLDR = getFilteredLDR(ldrRaw);
    
    if (sensorError === "LDR") {
      // LDR fault: presence-only control
      led.on = presence;
      led.pwm = led.on ? 200 : 0; // Fixed brightness
    } else if (sensorError === "PIR") {
      // PIR fault: brightness-only control
      if (filteredLDR > DARK_THRESHOLD) {
        led.on = true;
        led.pwm = mapToPwm(filteredLDR);
      }
    } else {
      // Normal operation
      if (presence && filteredLDR > DARK_THRESHOLD) {
        led.on = true;
        led.pwm = mapToPwm(filteredLDR);
      } else if (!presence || filteredLDR < BRIGHT_THRESHOLD) {
        led.on = false;
        led.pwm = 0;
      }
    }
  }
  
  return led;
};

// Main simulation loop
console.log("🔥 Smart Lighting Simulator Started");
console.log(`📍 Room: ${roomId}`);
console.log(`🔗 Firebase Emulator: localhost:9000`);
console.log("─".repeat(60));

setInterval(async () => {
  simulateRealisticConditions();
  
  const led = calculateLEDState();
  
  const state = {
    presence,
    ldrRaw: clamp(ldrRaw, 0, 4095),
    mode,
    led,
    sensorError
  };
  
  await writeState(state);
}, 2000); // Update every 2 seconds

// Initialize Firebase with default state
await writeState({
  presence: false,
  ldrRaw: 3000,
  mode: "auto",
  led: { on: false, pwm: 0 },
  sensorError: null
});