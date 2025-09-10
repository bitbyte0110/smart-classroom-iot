"""
Smart Lighting AI Detection - GPU Optimized
Camera-only presence detection for smart lighting system
"""

import cv2
import numpy as np
import time
import requests
import json
from datetime import datetime

class SmartLightingAI:
    def __init__(self, firebase_url="https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app", room_id="roomA"):
        """Initialize smart lighting AI detector"""
        self.firebase_url = firebase_url
        self.room_id = room_id
        
        print("🤖 Loading YOLO model for Smart Lighting...")
        
        # Load YOLO model (works with your existing files)
        self.net = cv2.dnn.readNetFromDarknet('yolo/yolov3-tiny.cfg', 'yolo/yolov3-tiny.weights')
        
        # Try GPU first, fallback to CPU
        try:
            self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
            self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA)
            print("🚀 GPU acceleration enabled")
        except:
            self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
            self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
            print("💻 Using CPU (still fast)")
        
        # Detection model for easier use
        self.model = cv2.dnn_DetectionModel(self.net)
        self.model.setInputParams(scale=1/255.0, size=(416, 416), swapRB=True, crop=False)
        
        # Detection parameters
        self.conf_threshold = 0.3
        self.nms_threshold = 0.4
        
        # Firebase update timing
        self.last_firebase_update = 0
        self.firebase_interval = 3.0  # Update every 3 seconds
        
        # Detection stability
        self.detection_history = []
        self.history_size = 5
        
        print("✅ Smart Lighting AI ready!")
        print(f"🏫 Room: {room_id}")
        print(f"🔗 Firebase: {firebase_url}")
    
    def detect_people(self, frame):
        """Detect people in frame"""
        try:
            # Run detection
            class_ids, confidences, boxes = self.model.detect(
                frame, 
                confThreshold=self.conf_threshold, 
                nmsThreshold=self.nms_threshold
            )
            
            # Filter for people (class_id = 0 in COCO dataset)
            people_count = 0
            people_boxes = []
            people_confs = []
            
            if len(class_ids) > 0:
                for i in range(len(class_ids)):
                    class_id = int(class_ids[i])
                    confidence = float(confidences[i])
                    
                    if class_id == 0:  # Person class
                        people_count += 1
                        people_boxes.append(boxes[i])
                        people_confs.append(confidence)
            
            return people_count, people_boxes, people_confs
            
        except Exception as e:
            print(f"❌ Detection error: {e}")
            return 0, [], []
    
    def stable_presence_detection(self, people_count):
        """Apply stability filter to reduce false positives"""
        # Add to history
        self.detection_history.append(people_count > 0)
        
        # Keep only recent detections
        if len(self.detection_history) > self.history_size:
            self.detection_history.pop(0)
        
        # Need majority to confirm presence
        if len(self.detection_history) >= 3:
            presence = sum(self.detection_history) >= 2
        else:
            presence = people_count > 0
        
        return presence
    
    def update_firebase(self, presence, people_count, max_confidence):
        """Update Firebase with AI detection results"""
        try:
            timestamp = int(time.time() * 1000)
            
            # Prepare AI data for ESP32 lighting system
            ai_data = {
                "ai_presence": presence,
                "ai_people_count": people_count,
                "ai_confidence": round(max_confidence, 2) if max_confidence > 0 else 0.0,
                "ai_timestamp": timestamp,
                "ai_source": "camera_gpu"
            }
            
            # Update Firebase state
            state_url = f"{self.firebase_url}/lighting/{self.room_id}/state.json"
            response = requests.patch(state_url, json=ai_data, timeout=5)
            
            if response.status_code == 200:
                status = "🟢 PRESENCE" if presence else "🔴 NO ONE"
                print(f"📡 Firebase: {status} | People: {people_count} | Conf: {max_confidence:.2f}")
                return True
            else:
                print(f"❌ Firebase error: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Firebase update failed: {e}")
            return False
    
    def draw_detections(self, frame, boxes, confidences):
        """Draw detection boxes on frame"""
        for i, (box, conf) in enumerate(zip(boxes, confidences)):
            x, y, w, h = box
            
            # Draw bounding box
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            
            # Draw confidence label
            label = f"Person {i+1}: {conf:.2f}"
            cv2.putText(frame, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        return frame
    
    def run_detection(self):
        """Main detection loop for smart lighting"""
        print("🎥 Starting Smart Lighting Camera...")
        
        # Try to open camera
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)  # Use DirectShow on Windows
        
        if not cap.isOpened():
            print("❌ Cannot open camera!")
            print("💡 Troubleshooting:")
            print("   - Close other camera apps (Teams, Zoom, etc.)")
            print("   - Check camera permissions")
            print("   - Try different camera index (1, 2, etc.)")
            return
        
        # Set camera properties for good performance
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce latency
        
        print("✅ Camera ready - Press 'q' to quit")
        print("🏠 Smart Lighting: Camera will control ESP32 LED!")
        print("📋 Logic: Person detected + Dark room = LED ON")
        
        frame_count = 0
        start_time = time.time()
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    print("❌ Cannot read frame")
                    break
                
                frame_count += 1
                current_time = time.time()
                
                # Detect people
                people_count, boxes, confidences = self.detect_people(frame)
                
                # Apply stability filter
                stable_presence = self.stable_presence_detection(people_count)
                
                # Get max confidence
                max_confidence = max(confidences) if confidences else 0.0
                
                # Update Firebase every few seconds
                if current_time - self.last_firebase_update >= self.firebase_interval:
                    success = self.update_firebase(stable_presence, people_count, max_confidence)
                    if success:
                        self.last_firebase_update = current_time
                
                # Draw detections
                display_frame = self.draw_detections(frame.copy(), boxes, confidences)
                
                # Calculate FPS
                elapsed = current_time - start_time
                fps = frame_count / elapsed if elapsed > 0 else 0
                
                # Add status overlay
                presence_color = (0, 255, 0) if stable_presence else (0, 0, 255)
                status = f"People: {people_count} | Presence: {stable_presence} | FPS: {fps:.1f}"
                cv2.putText(display_frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, presence_color, 2)
                
                # Add lighting logic status
                lighting_status = "LED: ON (Dark + Person)" if stable_presence else "LED: Depends on LDR"
                cv2.putText(display_frame, lighting_status, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)
                
                # Add Firebase connection status
                firebase_status = "Firebase: Connected" if current_time - self.last_firebase_update < 10 else "Firebase: Disconnected"
                firebase_color = (0, 255, 0) if current_time - self.last_firebase_update < 10 else (0, 0, 255)
                cv2.putText(display_frame, firebase_status, (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.5, firebase_color, 1)
                
                # Show frame
                cv2.imshow('Smart Lighting AI - Camera Detection', display_frame)
                
                # Check for quit
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                
        except KeyboardInterrupt:
            print("\n🛑 Smart Lighting AI stopped")
        finally:
            cap.release()
            cv2.destroyAllWindows()
            print("👋 Camera released - Lighting system offline")

if __name__ == "__main__":
    print("🏠 Smart Lighting AI System Starting...")
    print("🎯 Camera-based presence detection for intelligent lighting!")
    
    # Create detector with your Firebase URL
    detector = SmartLightingAI(
        firebase_url="https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app",
        room_id="roomA"
    )
    
    # Start detection
    detector.run_detection()
