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
    def __init__(self, firebase_url="http://localhost:9000", room_id="roomA", use_gpu=True):
        """Initialize AI presence detector with Firebase integration"""
        self.firebase_url = firebase_url
        self.room_id = room_id
        self.use_gpu = use_gpu
        
        # Load YOLO model
        self.net = cv2.dnn.readNetFromDarknet(
            'yolo/yolov3-tiny.cfg', 
            'yolo/yolov3-tiny.weights'
        )
        
        # Enable GPU acceleration if available and requested
        if self.use_gpu:
            try:
                self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
                self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA)
                print("🚀 GPU acceleration enabled (CUDA)")
            except Exception as e:
                print(f"⚠️ CUDA not compatible: {e}")
                print("💡 Using CPU - still very fast for real-time detection")
                self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                self.use_gpu = False
        
        if not self.use_gpu:
            print("💻 Using CPU for detection")

        # Use higher-level DetectionModel API (faster, simpler)
        self.model = cv2.dnn_DetectionModel(self.net)
        self.model.setInputParams(scale=1/255.0, size=(416, 416), mean=(0, 0, 0), swapRB=True, crop=False)
        
        # Improved detection parameters
        self.conf_threshold = 0.25  # Slightly lower threshold for better detection
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
        """Detect people using cv2.dnn_DetectionModel (fast path)"""
        class_ids, confidences, boxes = self.model.detect(frame, confThreshold=self.conf_threshold, nmsThreshold=self.nms_threshold)
        people_boxes = []
        people_confs = []
        indexes = []
        if len(class_ids) > 0:
            for idx, (cid, conf, box) in enumerate(zip(class_ids.flatten(), confidences.flatten(), boxes)):
                if int(cid) == 0:  # person class in COCO
                    x, y, w, h = box
                    # Filter out tiny boxes
                    if w > 30 and h > 50:
                        indexes.append(len(people_boxes))
                        people_boxes.append([int(x), int(y), int(w), int(h)])
                        people_confs.append(float(conf))
        person_count = len(people_boxes)
        return person_count, people_boxes, indexes, people_confs
    
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
    
    def run_detection(self, camera_source=0):
        """Main detection loop with improved performance"""
        # Force integrated laptop camera (index 0) via DirectShow to avoid Snap Camera
        camera_source = 0
        backends = [cv2.CAP_DSHOW]
        cap = None
        
        for backend in backends:
            try:
                cap = cv2.VideoCapture(camera_source, backend)
                if cap.isOpened():
                    # Test if we can read a frame
                    ret, test_frame = cap.read()
                    if ret:
                        print(f"✅ Integrated camera (index 0) opened with DirectShow")
                        break
                    else:
                        cap.release()
                        cap = None
                else:
                    if cap:
                        cap.release()
                    cap = None
            except Exception as e:
                print(f"⚠️ Backend {backend} failed: {e}")
                if cap:
                    cap.release()
                cap = None
        
        if cap is None or not cap.isOpened():
            print("❌ Error: Could not open camera with any backend")
            print("🔧 Troubleshooting tips:")
            print("   - Make sure camera is not used by another application")
            print("   - Try different camera index (0, 1, 2, etc.)")
            print("   - Check camera permissions")
            return
        
        # Set camera properties (keep modest resolution for speed)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)  # Set FPS for smoother video
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce buffer for real-time
        
        device_info = "GPU" if self.use_gpu else "CPU"
        print(f"🎥 Camera started ({device_info}) - Press 'q' to quit")
        
        # Performance tracking
        frame_count = 0
        start_time = time.time()
        
        # Process every N frames to boost FPS
        process_every_n = 2
        last_drawn_frame = None
        # Initialize defaults to avoid UnboundLocalError on first iterations
        person_count = 0
        boxes, indexes, confidences = [], [], []

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                
                # Detect people on every Nth frame
                if frame_count % process_every_n == 0:
                    person_count, boxes, indexes, confidences = self.detect_people(frame)
                    last_drawn_frame = self.draw_detections(frame.copy(), boxes, indexes, confidences)
                
                # Use the most recent annotated frame if available
                display_frame = last_drawn_frame if last_drawn_frame is not None else frame
                
                # Apply stability filter
                stable_presence = self.stable_presence_detection(person_count)
                
                # Update Firebase every 2 seconds
                current_time = time.time()
                if current_time - self.last_update >= self.update_interval:
                    self.update_firebase(stable_presence, person_count)
                    self.last_update = current_time
                
                # Calculate and display FPS
                elapsed_time = current_time - start_time
                fps = frame_count / elapsed_time if elapsed_time > 0 else 0
                
                # Add status overlay with more info
                status_text = f"People: {person_count} | Presence: {stable_presence} | FPS: {fps:.1f}"
                cv2.putText(display_frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                
                # Add detection confidence for debugging
                if len(indexes) > 0:
                    for i in indexes.flatten():
                        confidence = confidences[i]
                        x, y, w, h = boxes[i]
                        conf_text = f"Conf: {confidence:.2f}"
                        cv2.putText(frame, conf_text, (x, y + h + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)
                
                # Show frame
                cv2.imshow('AI Presence Detection', display_frame)
                
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
        print("🚀 Starting AI Presence Detection...")
        
        # For development with emulator (GPU enabled by default)
        detector = AIPresenceDetector(
            firebase_url="http://localhost:9000",
            room_id="roomA",
            use_gpu=True  # Set to False to force CPU usage
        )
        
        # For production with real Firebase
        # detector = AIPresenceDetector(
        #     firebase_url="https://smartclassroom-af237-default-rtdb.firebaseio.com",
        #     room_id="roomA"
        # )
        
        # Use camera 1 since camera 0 has issues
        detector.run_detection(camera_source=1)
        
    except FileNotFoundError as e:
        print(f"❌ YOLO model files not found: {e}")
        print("Make sure yolov3-tiny.cfg and yolov3-tiny.weights are in the yolo/ folder")
        input("Press Enter to exit...")
        
    except ImportError as e:
        print(f"❌ Missing Python package: {e}")
        print("Install with: pip install opencv-python numpy requests")
        input("Press Enter to exit...")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        input("Press Enter to exit...")
        
    finally:
        print("👋 AI Detection ended")