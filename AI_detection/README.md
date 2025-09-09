# 🤖 AI Presence Detection Module

## Overview
Real-time human presence detection using YOLO + webcam, integrated with Firebase for smart lighting control.

## Setup

### 1. Install Dependencies
```bash
cd AI_detection
pip install -r requirements.txt
```

### 2. Download YOLO Model Files
Copy these files to `AI_detection/yolo/`:
- `yolov3-tiny.cfg` 
- `yolov3-tiny.weights`

*From your existing project or download from: https://pjreddie.com/darknet/yolo/*

### 3. Test Camera
```bash
python realtime_presence.py
```

## Features

### ✅ Real-time Detection
- YOLO-based person detection
- Confidence threshold: 0.5
- Non-maximum suppression
- Stability filtering (reduces false positives)

### ✅ Firebase Integration  
- Updates `/lighting/roomA/state` every 2 seconds
- Adds `presence` and `personCount` fields
- Works with emulator and real Firebase

### ✅ Visual Feedback
- Live camera feed with bounding boxes
- Person count and presence status overlay
- Press 'q' to quit

## Integration with Lighting

The AI camera writes to the same Firebase path as PIR sensor:
```json
{
  "presence": true,
  "personCount": 2,
  "ts": 1695123456789,
  "source": "AI_Camera"
}
```

Your existing lighting dashboard automatically uses this data!

## Hardware Migration

### Development (Laptop)
```python
cap = cv2.VideoCapture(0)  # Built-in webcam
```

### Production (Raspberry Pi)
```python
cap = cv2.VideoCapture(0)  # Pi camera module
```
*Same code works on both!*

## Performance
- **YOLOv3-tiny**: Fast inference (~30 FPS on laptop)
- **640x480 resolution**: Good balance of speed/accuracy  
- **2-second Firebase updates**: Matches lighting system timing

## Next Steps
1. Test with laptop webcam
2. Integrate with existing dashboard
3. Deploy to Raspberry Pi
4. Add advanced features (face recognition, etc.)