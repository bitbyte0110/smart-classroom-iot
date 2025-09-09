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
        """Initialize hybrid presence detector with Firebase integration"""
        self.firebase_url = firebase_url
        self.room_id = room_id
        
        # Hybrid approach: HOG for accuracy + Motion for speed
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(detectShadows=False)
        
        # Timing control
        self.last_update = 0
        self.update_interval = 2.0  # Update Firebase every 2 seconds
        self.last_hog_detection = 0
        self.hog_detection_interval = 1.0  # Run HOG every 1 second
        
        # Detection state management
        self.presence_history = []
        self.history_size = 3
        self.last_person_detected = 0
        self.person_timeout = 10.0  # Keep presence for 10 seconds after last detection
        
        print("🤖 Hybrid Presence Detector initialized")
        print(f"📍 Room: {room_id}")
        print(f"🔗 Firebase: {firebase_url}")
        print("⚡ Mode: HOG (accuracy) + Motion (speed) + Timeout (still people)")
    
    def detect_people_hog_fast(self, frame):
        """Fast HOG detection with optimized parameters"""
        try:
            # Faster HOG detection with reduced accuracy for speed
            boxes, weights = self.hog.detectMultiScale(
                frame, 
                winStride=(16, 16),  # Larger stride for speed
                padding=(16, 16),    # Less padding for speed
                scale=1.1            # Larger scale step for speed
            )
            
            return len(boxes) > 0, boxes
        except Exception as e:
            print(f"HOG detection error: {e}")
            return False, []
    
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
    
    def hybrid_presence_detection(self, hog_detected, motion_detected):
        """Hybrid detection with timeout for still people"""
        current_time = time.time()
        
        # If HOG detects a person, update last detection time
        if hog_detected:
            self.last_person_detected = current_time
            return True
        
        # If recent HOG detection (within timeout), keep presence
        if current_time - self.last_person_detected < self.person_timeout:
            return True
        
        # If no recent HOG detection, use motion as backup
        return motion_detected
    
    def update_firebase(self, presence, detection_method="Hybrid"):
        """Update Firebase with presence data"""
        try:
            timestamp = int(time.time() * 1000)
            
            # Prepare data for Firebase
            data = {
                "presence": presence,
                "ts": timestamp,
                "source": f"AI_Camera_{detection_method}"
            }
            
            # Update state
            state_url = f"{self.firebase_url}/lighting/{self.room_id}/state.json"
            response = requests.patch(state_url, json=data, timeout=3)
            
            if response.status_code == 200:
                print(f"✅ Firebase updated: presence={presence} ({detection_method})")
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
        """Hybrid detection loop - HOG + Motion + Timeout for still people"""
        # Initialize camera with balanced settings for performance and quality
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)  # Balanced resolution
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
        cap.set(cv2.CAP_PROP_FPS, 20)  # Higher FPS for smoother video
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize lag
        
        if not cap.isOpened():
            print("❌ Error: Could not open camera")
            input("Press Enter to exit...")
            return
        
        print("🎥 Camera started - Press 'q' to quit")
        print("📖 Method: Hybrid HOG + Motion + Timeout")
        print("⚡ Settings: 320x240 @ 20fps")
        print("🎯 Features: Detects still people + motion + 10s timeout")
        
        try:
            frame_count = 0
            hog_detected = False
            motion_detected = False
            detection_method = "Starting"
            boxes = []
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                current_time = time.time()
                
                # Always do fast motion detection
                motion_detected, motion_level = self.detect_presence_fast(frame)
                
                # Do HOG detection every second (not every frame)
                if current_time - self.last_hog_detection >= self.hog_detection_interval:
                    # Use smaller frame for HOG processing
                    small_frame = cv2.resize(frame, (160, 120))
                    hog_detected, boxes = self.detect_people_hog_fast(small_frame)
                    # Scale boxes back to original size
                    boxes = [(x*2, y*2, w*2, h*2) for x, y, w, h in boxes]
                    self.last_hog_detection = current_time
                    detection_method = "HOG" if hog_detected else "Motion"
                
                # Hybrid presence detection with timeout
                final_presence = self.hybrid_presence_detection(hog_detected, motion_detected)
                
                # Determine display method
                time_since_hog = current_time - self.last_person_detected
                if final_presence:
                    if hog_detected:
                        detection_method = "HOG"
                    elif time_since_hog < self.person_timeout:
                        detection_method = f"Timeout({self.person_timeout - time_since_hog:.1f}s)"
                    else:
                        detection_method = "Motion"
                else:
                    detection_method = "None"
                
                # Update Firebase every 2 seconds
                if current_time - self.last_update >= self.update_interval:
                    self.update_firebase(final_presence, detection_method)
                    self.last_update = current_time
                
                # Draw detection boxes if available
                if len(boxes) > 0 and hog_detected:
                    for (x, y, w, h) in boxes:
                        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                
                # Visual status indicator
                if final_presence:
                    cv2.rectangle(frame, (10, 10), (120, 50), (0, 255, 0), 2)
                    cv2.putText(frame, "PRESENT", (15, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                else:
                    cv2.rectangle(frame, (10, 10), (120, 50), (0, 0, 255), 2)
                    cv2.putText(frame, "EMPTY", (25, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                
                # Status overlay
                status_text = f"Method: {detection_method} | Motion: {motion_level}"
                cv2.putText(frame, status_text, (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                
                # Show frame
                cv2.imshow('Hybrid Presence Detection', frame)
                
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