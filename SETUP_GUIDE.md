# 🚀 Smart Lighting System - Setup Guide

## ✅ What's Been Completed

All BMIT2123 assignment requirements have been implemented:

### 🏗️ System Architecture
- **Firebase Realtime Database** with proper data structure (`/lighting/roomA/state` and `/logs`)
- **Device Simulator** generating realistic sensor data with day/night cycles
- **React Web Dashboard** with real-time controls and 4 required reports
- **Complete ESP32 Code** with all validation rules and offline handling

### 📊 All Requirements Met
- ✅ PIR debounce (200ms stable, 2s cooldown)
- ✅ LDR median filter (5 samples) 
- ✅ Hysteresis thresholds (BRIGHT=2800, DARK=3200)
- ✅ Auto/Manual mode switching
- ✅ PWM guardrails (0-255, OFF forces 0)
- ✅ Offline ring buffer (200 entries)
- ✅ Sensor error detection and fallback
- ✅ Real-time Firebase sync
- ✅ 4 reports: brightness chart, presence heatmap, LED runtime, energy savings
- ✅ CSV export for verification

## 🎯 What You Can Do Right Now (No Hardware)

### Option 1: Quick Demo (Recommended)
```bash
# Double-click start.bat - opens all 3 services:
# 1. Firebase Emulator (localhost:4000)
# 2. Device Simulator (generates data)  
# 3. Web Dashboard (localhost:5173)
```

### Option 2: Manual Startup
```bash
# Terminal 1: Firebase Emulator
firebase emulators:start

# Terminal 2: Device Simulator  
cd simulator
npm start

# Terminal 3: Web Dashboard
cd web
npm run dev
```

## 🎮 Test the 4 Demo Scenarios

1. **🌞 Bright Room + Presence**: LED stays OFF (simulator will show this)
2. **🌙 Dark Room + Presence**: LED ON with auto-dimming
3. **🎛️ Manual Mode**: Switch mode in dashboard, control LED directly  
4. **📶 Offline Mode**: Stop emulator, see device continues working

## 🏫 Lab Day Instructions

### What to Bring to Lab
- **This complete project folder**
- **ESP32, PIR sensor, LDR module, LED + resistor**
- **Breadboard and jumper wires**

### Lab Steps (10 minutes)
1. **Wire hardware** per diagram in `module3_smart_lighting/README.md`
2. **Update WiFi credentials** in `lighting_complete.ino`
3. **Upload complete code** (not the simple `led.ino`)
4. **Switch Firebase config** from emulator to real project
5. **Test all 4 scenarios** with real hardware

### Hardware Wiring
```
PIR → GPIO27, LDR → GPIO34, LED → GPIO18
(See full diagram in module README)
```

## 📁 Key Files You'll Use

### For Development (Now)
- `simulator/simulator.js` - Device simulator with realistic data
- `web/src/components/Dashboard.tsx` - Main dashboard
- `firebase.json` - Emulator configuration

### For Hardware (Lab)  
- `module3_smart_lighting/led/lighting_complete.ino` - Complete ESP32 code
- Update WiFi: `#define WIFI_SSID "YourWiFi"`
- Install libraries: Firebase ESP Client, ArduinoJson

### For Reports
- Dashboard → Reports tab → Export CSV
- All 4 charts are automatically generated from log data

## 🎬 Demo Video Content (90 seconds)

1. **Auto Logic** (30s): Show simulator presence + brightness → LED response
2. **Manual Control** (20s): Switch to manual, use sliders
3. **Offline Handling** (20s): Stop emulator, show local operation  
4. **Reports** (20s): Show 4 charts + CSV export

## 🎓 Assignment Deliverables

### Code Files Ready ✅
- Complete ESP32 implementation with all features
- React dashboard with live tiles and reports
- Device simulator for testing without hardware
- Firebase configuration and rules

### Documentation Ready ✅
- Architecture diagrams and state flow
- Complete setup instructions
- Test scenario validation
- Business logic documentation

### Demo Ready ✅
- All 4 test scenarios working
- Real-time dashboard updates
- Offline tolerance demonstration
- Report generation and CSV export

---

## 🚨 Important Notes

1. **Use `lighting_complete.ino` in lab**, not the simple `led.ino`
2. **Firebase config is already set** - just switch from emulator to real project
3. **All validation rules implemented** - no need to add anything
4. **Logs generate automatically** - run simulator overnight for rich data
5. **Dashboard works offline** - shows last known state when disconnected

## ✨ Success Criteria

After setup, you should see:
- 📊 **Simulator console**: Live sensor readings and LED states
- 🌐 **Web dashboard**: Real-time tiles updating every 2 seconds  
- 🔥 **Firebase emulator**: Data flowing in `/lighting/roomA/`
- 📈 **Reports**: Charts populating as data accumulates

**You're ready for the lab! The hardest part (software) is done.** 🎉