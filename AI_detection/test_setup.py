"""
Test setup for AI Presence Detection
This script checks if everything is ready and shows detailed error messages
"""

import sys
import os
import cv2

def test_setup():
    print("🔧 Testing AI Presence Detection Setup")
    print("=" * 50)
    
    # Test 1: Check Python packages
    print("\n1. Testing Python packages...")
    try:
        import cv2
        print(f"✅ OpenCV installed: {cv2.__version__}")
    except ImportError:
        print("❌ OpenCV not installed. Run: pip install opencv-python")
        return False
    
    try:
        import numpy as np
        print(f"✅ NumPy installed: {np.__version__}")
    except ImportError:
        print("❌ NumPy not installed. Run: pip install numpy")
        return False
    
    try:
        import requests
        print(f"✅ Requests installed: {requests.__version__}")
    except ImportError:
        print("❌ Requests not installed. Run: pip install requests")
        return False
    
    # Test 2: Check YOLO files
    print("\n2. Testing YOLO model files...")
    yolo_cfg = "yolo/yolov3-tiny.cfg"
    yolo_weights = "yolo/yolov3-tiny.weights"
    
    if os.path.exists(yolo_cfg):
        print(f"✅ Config file found: {yolo_cfg}")
    else:
        print(f"❌ Config file missing: {yolo_cfg}")
        print("   Download from: https://github.com/pjreddie/darknet/blob/master/cfg/yolov3-tiny.cfg")
        return False
    
    if os.path.exists(yolo_weights):
        size_mb = os.path.getsize(yolo_weights) / (1024 * 1024)
        print(f"✅ Weights file found: {yolo_weights} ({size_mb:.1f} MB)")
    else:
        print(f"❌ Weights file missing: {yolo_weights}")
        print("   Download from: https://pjreddie.com/media/files/yolov3-tiny.weights")
        return False
    
    # Test 3: Test camera access
    print("\n3. Testing camera access...")
    try:
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                print(f"✅ Camera working: {frame.shape}")
            else:
                print("❌ Camera opened but cannot read frames")
                return False
            cap.release()
        else:
            print("❌ Cannot open camera (index 0)")
            print("   Make sure webcam is connected and not used by other apps")
            return False
    except Exception as e:
        print(f"❌ Camera error: {e}")
        return False
    
    # Test 4: Test YOLO loading
    print("\n4. Testing YOLO model loading...")
    try:
        net = cv2.dnn.readNetFromDarknet(yolo_cfg, yolo_weights)
        layer_names = net.getLayerNames()
        output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]
        print(f"✅ YOLO model loaded: {len(output_layers)} output layers")
    except Exception as e:
        print(f"❌ YOLO loading error: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 All tests passed! Ready to run AI detection.")
    print("Run: python realtime_presence.py")
    return True

if __name__ == "__main__":
    if not test_setup():
        print("\n❌ Setup incomplete. Fix the issues above and try again.")
        input("Press Enter to exit...")
    else:
        print("\n✅ Everything is ready!")
        response = input("Run AI detection now? (y/n): ")
        if response.lower() == 'y':
            try:
                from realtime_presence import AIPresenceDetector
                detector = AIPresenceDetector()
                detector.run_detection()
            except Exception as e:
                print(f"Error running detection: {e}")
                input("Press Enter to exit...")