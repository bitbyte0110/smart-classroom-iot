"""
Simple AI Presence Detection using OpenCV built-in methods
Alternative to YOLO for easier setup
"""

import cv2
import numpy as np
import time
import requests
from datetime import datetime

class SimplePresenceDetector:
    def __init__(self, firebase_url="http://localhost:9000", room_id="roomA"):
        """Initialize simple presence detector with Firebase integration"""
        self.firebase_url = firebase_url
        self.room_id = room_id
        
        # Lightweight motion detection only (skip heavy HOG)
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(detectShadows=False)
        
        # Timing control
        self.last_update = 0
        self.update_interval = 3.0  # Update Firebase every 3 seconds (less frequent)
        
        # Detection history for stability (presence only)
        self.presence_history = []
        self.history_size = 3  # Smaller history for faster response
        
        print("🤖 Optimized Presence Detector initialized")
        print(f"📍 Room: {room_id}")
        print(f"🔗 Firebase: {firebase_url}")
        print("⚡ Mode: Motion-based presence detection (optimized for speed)")
    
    def detect_people_hog(self, frame):
        """Detect people using HOG + SVM (built into OpenCV)"""
        try:
            # Detect people
            boxes, weights = self.hog.detectMultiScale(
                frame, 
                winStride=(8, 8),
                padding=(32, 32),
                scale=1.05
            )
            
            return len(boxes), boxes, weights
        except Exception as e:
            print(f"HOG detection error: {e}")
            return 0, [], []
    
    def detect_presence_fast(self, frame):
        """Fast motion-based presence detection"""
        try:
            # Apply background subtraction
            fg_mask = self.bg_subtractor.apply(frame)
            
            # Count non-zero pixels (motion pixels)
            motion_pixels = cv2.countNonZero(fg_mask)
            
            # Simple threshold: if enough motion pixels, assume presence
            motion_threshold = frame.shape[0] * frame.shape[1] * 0.02  # 2% of frame
            
            has_presence = motion_pixels > motion_threshold
            
            return has_presence, motion_pixels
        except Exception as e:
            print(f"Motion detection error: {e}")
            return False, 0
    
    def stable_presence_detection(self, has_presence):
        """Apply stability filter to reduce false positives"""
        # Add current detection to history
        self.presence_history.append(has_presence)
        
        # Keep only recent history
        if len(self.presence_history) > self.history_size:
            self.presence_history.pop(0)
        
        # Require majority of recent frames to have detection
        if len(self.presence_history) >= 2:
            stable_presence = sum(self.presence_history) >= 2
        else:
            stable_presence = has_presence
        
        return stable_presence
    
    def update_firebase(self, presence, motion_level=0):
        """Update Firebase with presence data only"""
        try:
            timestamp = int(time.time() * 1000)
            
            # Prepare data for Firebase (simplified)
            data = {
                "presence": presence,
                "ts": timestamp,
                "source": "AI_Camera_Motion",
                "motionLevel": motion_level  # For debugging
            }
            
            # Update state
            state_url = f"{self.firebase_url}/lighting/{self.room_id}/state.json"
            response = requests.patch(state_url, json=data, timeout=3)  # Shorter timeout
            
            if response.status_code == 200:
                print(f"✅ Firebase updated: presence={presence}, motion={motion_level}")
            else:
                print(f"❌ Firebase update failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Firebase error: {e}")
    
    def draw_detections(self, frame, boxes, method="HOG"):
        """Draw detection boxes on frame"""
        for (x, y, w, h) in boxes:
            # Draw bounding box
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            
            # Draw label
            label = f"Person ({method})"
            cv2.putText(frame, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        return frame
    
    def run_detection(self):
        """Main detection loop - optimized for presence detection only"""
        # Initialize camera with maximum performance settings
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 240)  # Even smaller for speed
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 180)
        cap.set(cv2.CAP_PROP_FPS, 10)  # Lower FPS for stability
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize buffer
        
        if not cap.isOpened():
            print("❌ Error: Could not open camera")
            input("Press Enter to exit...")
            return
        
        print("🎥 Camera started - Press 'q' to quit")
        print("📖 Method: Fast motion detection for presence only")
        print("⚡ Optimized: 240x180 @ 10fps - PRESENCE ONLY MODE")
        
        try:
            frame_count = 0
            has_presence = False
            motion_level = 0
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                
                # Fast motion detection every frame (very lightweight)
                has_presence, motion_level = self.detect_presence_fast(frame)
                
                # Apply stability filter
                stable_presence = self.stable_presence_detection(has_presence)
                
                # Update Firebase every 3 seconds (less frequent)
                current_time = time.time()
                if current_time - self.last_update >= self.update_interval:
                    self.update_firebase(stable_presence, motion_level)
                    self.last_update = current_time
                
                # Simple visual feedback (no heavy drawing)
                if stable_presence:
                    cv2.rectangle(frame, (10, 10), (100, 50), (0, 255, 0), 2)
                    cv2.putText(frame, "PRESENT", (15, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                else:
                    cv2.rectangle(frame, (10, 10), (100, 50), (0, 0, 255), 2)
                    cv2.putText(frame, "EMPTY", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                
                # Minimal status overlay
                status_text = f"Motion: {motion_level} | Presence: {stable_presence}"
                cv2.putText(frame, status_text, (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                
                # Show frame
                cv2.imshow('Fast Presence Detection', frame)
                
                # Check for quit
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                    
        except KeyboardInterrupt:
            print("\n🛑 Detection stopped by user")
        finally:
            cap.release()
            cv2.destroyAllWindows()
            print("👋 Camera released")

if __name__ == "__main__":
    try:
        print("🚀 Starting Simple AI Presence Detection...")
        print("This uses OpenCV built-in methods (no external model files needed)")
        
        detector = SimplePresenceDetector(
            firebase_url="http://localhost:9000",
            room_id="roomA"
        )
        
        detector.run_detection()
        
    except ImportError as e:
        print(f"❌ Missing Python package: {e}")
        print("Install with: pip install opencv-python numpy requests")
        input("Press Enter to exit...")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        input("Press Enter to exit...")
        
    finally:
        print("👋 Simple AI Detection ended")
        input("Press Enter to exit...")