"""
Smart Classroom AI Presence Detection
Simplified version for real-time Firebase integration
Based on: https://github.com/g4lb/camera-recorder-with-human-detection
"""

import cv2
import numpy as np
import time
import json
import requests
from datetime import datetime

class AIPresenceDetector:
    def __init__(self, firebase_url="http://localhost:9000", room_id="roomA"):
        """Initialize AI presence detector with Firebase integration"""
        self.firebase_url = firebase_url
        self.room_id = room_id
        
        # Load YOLO model
        self.net = cv2.dnn.readNetFromDarknet(
            'yolo/yolov3-tiny.cfg', 
            'yolo/yolov3-tiny.weights'
        )
        
        # Get output layer names
        layer_names = self.net.getLayerNames()
        self.output_layers = [layer_names[i[0] - 1] for i in self.net.getUnconnectedOutLayers()]
        
        # Detection parameters
        self.conf_threshold = 0.5
        self.nms_threshold = 0.4
        
        # Timing control
        self.last_update = 0
        self.update_interval = 2.0  # Update Firebase every 2 seconds
        
        # Detection history for stability
        self.detection_history = []
        self.history_size = 5
        
        print("🤖 AI Presence Detector initialized")
        print(f"📍 Room: {room_id}")
        print(f"🔗 Firebase: {firebase_url}")
    
    def detect_people(self, frame):
        """Detect people in frame using YOLO"""
        height, width, channels = frame.shape
        
        # Prepare image for YOLO
        blob = cv2.dnn.blobFromImage(frame, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
        self.net.setInput(blob)
        outputs = self.net.forward(self.output_layers)
        
        # Process detections
        boxes = []
        confidences = []
        class_ids = []
        
        for output in outputs:
            for detection in output:
                scores = detection[5:]
                class_id = np.argmax(scores)
                confidence = scores[class_id]
                
                # Only process person class (ID = 0) with high confidence
                if class_id == 0 and confidence > self.conf_threshold:
                    # Object detected
                    center_x = int(detection[0] * width)
                    center_y = int(detection[1] * height)
                    w = int(detection[2] * width)
                    h = int(detection[3] * height)
                    
                    # Rectangle coordinates
                    x = int(center_x - w / 2)
                    y = int(center_y - h / 2)
                    
                    boxes.append([x, y, w, h])
                    confidences.append(float(confidence))
                    class_ids.append(class_id)
        
        # Apply non-maximum suppression
        indexes = cv2.dnn.NMSBoxes(boxes, confidences, self.conf_threshold, self.nms_threshold)
        
        # Count valid detections
        person_count = len(indexes) if len(indexes) > 0 else 0
        
        return person_count, boxes, indexes, confidences
    
    def stable_presence_detection(self, person_count):
        """Apply stability filter to reduce false positives"""
        # Add current detection to history
        self.detection_history.append(person_count > 0)
        
        # Keep only recent history
        if len(self.detection_history) > self.history_size:
            self.detection_history.pop(0)
        
        # Require majority of recent frames to have detection
        if len(self.detection_history) >= 3:
            stable_presence = sum(self.detection_history) >= 2  # 2 out of last frames
        else:
            stable_presence = person_count > 0
        
        return stable_presence
    
    def update_firebase(self, presence, person_count):
        """Update Firebase with presence data"""
        try:
            timestamp = int(time.time() * 1000)
            
            # Prepare data for Firebase
            data = {
                "presence": presence,
                "personCount": person_count,
                "ts": timestamp,
                "source": "AI_Camera"
            }
            
            # Update state
            state_url = f"{self.firebase_url}/lighting/{self.room_id}/state.json"
            response = requests.patch(state_url, json=data, timeout=5)
            
            if response.status_code == 200:
                print(f"✅ Firebase updated: presence={presence}, count={person_count}")
            else:
                print(f"❌ Firebase update failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Firebase error: {e}")
    
    def draw_detections(self, frame, boxes, indexes, confidences):
        """Draw detection boxes on frame"""
        if len(indexes) > 0:
            for i in indexes.flatten():
                x, y, w, h = boxes[i]
                confidence = confidences[i]
                
                # Draw bounding box
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                
                # Draw confidence label
                label = f"Person: {confidence:.2f}"
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
            return
        
        print("🎥 Camera started - Press 'q' to quit")
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Detect people
                person_count, boxes, indexes, confidences = self.detect_people(frame)
                
                # Apply stability filter
                stable_presence = self.stable_presence_detection(person_count)
                
                # Update Firebase every 2 seconds
                current_time = time.time()
                if current_time - self.last_update >= self.update_interval:
                    self.update_firebase(stable_presence, person_count)
                    self.last_update = current_time
                
                # Draw detections on frame
                frame = self.draw_detections(frame, boxes, indexes, confidences)
                
                # Add status overlay
                status_text = f"People: {person_count} | Presence: {stable_presence}"
                cv2.putText(frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                
                # Show frame
                cv2.imshow('AI Presence Detection', frame)
                
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
    # For development with emulator
    detector = AIPresenceDetector(
        firebase_url="http://localhost:9000",
        room_id="roomA"
    )
    
    # For production with real Firebase
    # detector = AIPresenceDetector(
    #     firebase_url="https://smartclassroom-af237-default-rtdb.firebaseio.com",
    #     room_id="roomA"
    # )
    
    detector.run_detection()