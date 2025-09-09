# 🚀 Start Here - AI Presence Detection

## 🎯 Quick Start (No YOLO files needed!)

### Step 1: Install Python packages
```bash
pip install opencv-python numpy requests
```

### Step 2: Run the simple AI detection
**Double-click: `simple_presence.py`** or run in terminal:
```bash
python simple_presence.py
```

### Step 3: What you'll see
- 🎥 Camera window opens showing live feed
- 📦 Green boxes around detected people  
- 📊 Status overlay showing person count and presence
- 🔥 Firebase updates every 2 seconds (if emulator running)

### Step 4: Test it
- 👋 **Wave your hand** in front of camera
- 🚶 **Walk around** to trigger motion detection  
- 📱 **Check your lighting dashboard** - should show AI presence data

---

## 🛠️ If You Want YOLO (Advanced)

### Option A: Try YOLO version (might not work due to model compatibility)
```bash
python realtime_presence.py
```

### Option B: Download proper YOLO files manually
1. Go to: https://pjreddie.com/darknet/yolo/
2. Download `yolov3-tiny.weights` (~35MB)
3. Replace the small file in `yolo/` folder

---

## 🎮 Controls

- **Press 'q'** to quit camera
- **Close window** to stop detection
- **Ctrl+C** in terminal to force quit

---

## 🔗 Integration Status

✅ **Working now:**
- Simple person detection (HOG + Motion)
- Firebase integration 
- Real-time dashboard updates
- Stability filtering

🔄 **Switch to Pi later:**
Same code works on Raspberry Pi - just change:
```python
cap = cv2.VideoCapture(0)  # Works on both laptop and Pi!
```

---

## 📊 Dashboard Integration

Your lighting dashboard will automatically show:
- `presence: true/false` (from AI camera)
- `personCount: X` (number of people)
- `source: "AI_Camera_HOG"` (detection method)

**No changes needed** - it uses the same Firebase path as PIR sensor!

---

## 🎯 Why This Approach?

✅ **Advantages:**
- No large model downloads
- Works immediately  
- OpenCV built-in methods
- Good accuracy for presence detection
- Ready for Pi deployment

✅ **Detection Methods:**
1. **HOG + SVM**: Detects human shapes
2. **Motion Detection**: Backup for movement
3. **Stability Filter**: Reduces false positives

**Ready to test? Just double-click `simple_presence.py`!** 🎥