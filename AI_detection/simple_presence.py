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
        
        # Initialize HOG (Histogram of Oriented Gradients) person detector
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        
        # Motion detection for backup
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2()
        
        # Timing control
        self.last_update = 0
        self.update_interval = 2.0  # Update Firebase every 2 seconds
        
        # Detection history for stability
        self.detection_history = []
        self.history_size = 5
        
        print("🤖 Simple Presence Detector initialized")
        print(f"📍 Room: {room_id}")
        print(f"🔗 Firebase: {firebase_url}")
    
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
    
    def detect_motion(self, frame):
        """Backup motion detection method"""
        try:
            # Apply background subtraction
            fg_mask = self.bg_subtractor.apply(frame)
            
            # Find contours
            contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filter large contours (likely to be people)
            large_contours = [c for c in contours if cv2.contourArea(c) > 1000]
            
            return len(large_contours) > 0, large_contours
        except Exception as e:
            print(f"Motion detection error: {e}")
            return False, []
    
    def stable_presence_detection(self, person_count):
        """Apply stability filter to reduce false positives"""
        # Add current detection to history
        self.detection_history.append(person_count > 0)
        
        # Keep only recent history
        if len(self.detection_history) > self.history_size:
            self.detection_history.pop(0)
        
        # Require majority of recent frames to have detection
        if len(self.detection_history) >= 3:
            stable_presence = sum(self.detection_history) >= 2
        else:
            stable_presence = person_count > 0
        
        return stable_presence
    
    def update_firebase(self, presence, person_count, method="HOG"):
        """Update Firebase with presence data"""
        try:
            timestamp = int(time.time() * 1000)
            
            # Prepare data for Firebase
            data = {
                "presence": presence,
                "personCount": person_count,
                "ts": timestamp,
                "source": f"AI_Camera_{method}"
            }
            
            # Update state
            state_url = f"{self.firebase_url}/lighting/{self.room_id}/state.json"
            response = requests.patch(state_url, json=data, timeout=5)
            
            if response.status_code == 200:
                print(f"✅ Firebase updated: presence={presence}, count={person_count} ({method})")
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
        """Main detection loop"""
        # Initialize camera
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        if not cap.isOpened():
            print("❌ Error: Could not open camera")
            input("Press Enter to exit...")
            return
        
        print("🎥 Camera started - Press 'q' to quit")
        print("📖 Methods: HOG (person detection) + Motion (backup)")
        
        try:
            frame_count = 0
            person_count = 0
            detection_method = "Starting"
            boxes = []
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                
                # Primary method: HOG person detection (every 3rd frame for performance)
                if frame_count % 3 == 0:
                    person_count, boxes, weights = self.detect_people_hog(frame)
                    detection_method = "HOG"
                    
                    # If no people detected, try motion detection as backup
                    if person_count == 0:
                        has_motion, contours = self.detect_motion(frame)
                        if has_motion:
                            person_count = 1  # Assume 1 person if motion detected
                            detection_method = "Motion"
                            # Convert contours to boxes for drawing
                            boxes = []
                            for contour in contours:
                                x, y, w, h = cv2.boundingRect(contour)
                                if w * h > 1000:  # Filter small movements
                                    boxes.append((x, y, w, h))
                
                # Apply stability filter
                stable_presence = self.stable_presence_detection(person_count)
                
                # Update Firebase every 2 seconds
                current_time = time.time()
                if current_time - self.last_update >= self.update_interval:
                    self.update_firebase(stable_presence, person_count, detection_method)
                    self.last_update = current_time
                
                # Draw detections on frame
                if len(boxes) > 0:
                    frame = self.draw_detections(frame, boxes, detection_method)
                
                # Add status overlay
                status_text = f"People: {person_count} | Presence: {stable_presence} | Method: {detection_method}"
                cv2.putText(frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                
                # Show frame
                cv2.imshow('Simple AI Presence Detection', frame)
                
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