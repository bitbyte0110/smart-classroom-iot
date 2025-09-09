# Smart Classroom AI Detection & Lighting Testing Guide

## 🎯 Understanding Your System Logic

Based on your code analysis, here's exactly how your system works:

### Current AI Detection System
- **Input**: Camera feed (now optimized to 320x240 @ 15fps)
- **Output**: `presence` (true/false) + `personCount` (number of people detected)
- **Methods**: HOG person detection + Motion detection (backup)
- **Performance**: Processes every 5th frame for reduced lag

### Current Lighting Control Logic
The ESP32 lighting system uses **PRESENCE + LDR**, NOT people count:

```arduino
// Auto Mode Logic (from lighting_complete.ino line 337-343)
if (currentState.presence && currentState.ldrRaw > DARK_THRESHOLD) {
    currentState.ledOn = true;
    currentState.ledPwm = mapLDRToPWM(currentState.ldrRaw);  // Based on darkness level
} else if (!currentState.presence || currentState.ldrRaw < BRIGHT_THRESHOLD) {
    currentState.ledOn = false;
    currentState.ledPwm = 0;
}
```

**Key Points:**
- ✅ **Presence detected**: LED turns ON, brightness based on LDR darkness
- ❌ **No presence**: LED turns OFF (energy saving)
- ❌ **Too bright**: LED stays OFF even with presence
- 🔧 **People count**: Currently NOT used for brightness adjustment

## 🧪 Testing Scenarios

### 1. Performance Testing (Camera Lag Issue)

**Test the optimized camera settings:**
```bash
cd AI_detection
python simple_presence.py
```

**What to check:**
- [ ] Camera lag reduced from previous version?
- [ ] Frame rate appears smoother?
- [ ] Detection still accurate with lower resolution?
- [ ] Status shows "Processing: Every 5th frame"

### 2. AI Detection Accuracy Testing

**Test Case 1: Single Person Detection**
- [ ] Stand in front of camera
- [ ] Verify "People: 1" and "Presence: True"
- [ ] Move around - should maintain detection
- [ ] Leave frame - should show "People: 0" and "Presence: False"

**Test Case 2: Multiple People Detection**
- [ ] Have 2-3 people in frame
- [ ] Check if "People: X" shows correct count
- [ ] Note: Only "Presence: True/False" affects lighting

**Test Case 3: Motion Detection Backup**
- [ ] Cover yourself with a blanket (to fool HOG)
- [ ] Move around - should detect motion and show "Method: Motion"
- [ ] Stop moving - should lose detection

### 3. Firebase Integration Testing

**Check Firebase Updates:**
- [ ] Open Firebase console: https://console.firebase.google.com/
- [ ] Navigate to Realtime Database
- [ ] Look for `/lighting/roomA/state`
- [ ] Verify presence updates every 2 seconds

### 4. ESP32 Lighting Logic Testing

**Test Case 1: Dark Room + Presence**
- [ ] Cover LDR sensor (simulate darkness)
- [ ] Stand in front of camera
- [ ] Expected: LED should turn ON with PWM based on darkness level

**Test Case 2: Bright Room + Presence**
- [ ] Shine flashlight on LDR (simulate brightness)
- [ ] Stand in front of camera
- [ ] Expected: LED should stay OFF (energy saving)

**Test Case 3: No Presence**
- [ ] Leave camera view
- [ ] Expected: LED should turn OFF regardless of brightness

### 5. Manual vs Auto Mode Testing

**Auto Mode:**
- [ ] Check dashboard shows "Mode: Auto"
- [ ] Lighting follows presence + LDR logic

**Manual Mode:**
- [ ] Switch to "Manual" on web dashboard
- [ ] Use slider to control brightness
- [ ] LED should ignore presence/LDR sensors

## 🔧 Current System Limitations & Upgrades

### What Your System Does Now:
1. **AI Detection**: Counts people but only uses presence (true/false) for lighting
2. **Lighting Control**: Binary ON/OFF based on presence + room brightness
3. **Brightness**: Determined by LDR sensor, not people count

### Potential Upgrades:
If you want brightness to increase with more people, you'd need to modify the ESP32 code:

```arduino
// Modified logic (not currently implemented)
if (currentState.presence && currentState.ldrRaw > DARK_THRESHOLD) {
    int basePWM = mapLDRToPWM(currentState.ldrRaw);
    int peopleBoost = min(personCount * 30, 100);  // +30 PWM per person, max +100
    currentState.ledPwm = constrain(basePWM + peopleBoost, 0, MAX_PWM);
}
```

## 📊 Success Criteria

### AI Detection Performance:
- [ ] Camera lag eliminated/significantly reduced
- [ ] Detection accuracy >90% for single person
- [ ] Firebase updates consistently every 2 seconds
- [ ] Stable presence detection (no flickering)

### Lighting Control:
- [ ] LED turns ON in dark room with presence
- [ ] LED stays OFF in bright room regardless of presence
- [ ] LED turns OFF immediately when person leaves
- [ ] Manual mode overrides auto logic

### Integration:
- [ ] Web dashboard shows real-time updates
- [ ] ESP32 receives AI presence data from Firebase
- [ ] System continues working if one component fails

## 🚨 Troubleshooting

### Camera Still Lagging?
1. Try lower resolution: Change to 160x120 in code
2. Increase frame skip: Change `frame_count % 5` to `frame_count % 10`
3. Disable motion detection backup temporarily

### AI Detection Not Accurate?
1. Ensure good lighting
2. Check if HOG detection parameters need tuning
3. Verify camera is stable (not shaking)

### Lighting Not Responding?
1. Check Firebase connection on ESP32
2. Verify LDR sensor wiring and readings
3. Test manual mode first, then auto mode

## 📈 Performance Optimization Tips

1. **For Better AI Performance:**
   - Good room lighting
   - Camera mounted steadily
   - Clear view of detection area

2. **For Better Lighting Response:**
   - Calibrate LDR thresholds for your room
   - Test different DARK_THRESHOLD values (currently 3200)
   - Ensure stable WiFi connection

Run these tests systematically and note any issues. The system is designed to be robust with offline tolerance and error handling.