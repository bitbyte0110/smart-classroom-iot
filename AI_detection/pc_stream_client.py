"""
PC Client for Pi Camera Stream with YOLO Detection
Connects to Pi streaming server and runs YOLO detection on the stream
"""

import cv2
import numpy as np
import time
import json
import requests
from datetime import datetime
import argparse

class PCStreamClient:
    def __init__(self, pi_ip, firebase_url="http://localhost:9000", room_id="roomA", use_gpu=True):
        """Initialize PC client for Pi stream with YOLO detection"""
        self.pi_ip = pi_ip
        self.firebase_url = firebase_url
        self.room_id = room_id
        self.use_gpu = use_gpu
        
        # Construct stream URL
        self.stream_url = f"http://{pi_ip}:5000/video_feed"
        
        print("💻 PC Stream Client with YOLO Detection")
        print(f"🍓 Pi Stream: {self.stream_url}")
        print(f"🔗 Firebase: {firebase_url}")
        
        # Load YOLO model
        self.load_yolo_model()
        
        # Detection parameters
        self.conf_threshold = 0.3
        self.nms_threshold = 0.4
        
        # Timing control
        self.last_update = 0
        self.update_interval = 2.0  # Update Firebase every 2 seconds
        
        # Detection history for stability
        self.detection_history = []
        self.history_size = 5
        
    def load_yolo_model(self):
        """Load YOLO model with GPU acceleration if available"""
        try:
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
                    print("🚀 GPU acceleration enabled")
                except Exception as e:
                    print(f"⚠️ GPU not available, falling back to CPU: {e}")
                    self.use_gpu = False
            
            if not self.use_gpu:
                print("💻 Using CPU for detection")
            
            # Get output layer names
            layer_names = self.net.getLayerNames()
            self.output_layers = [layer_names[i - 1] for i in self.net.getUnconnectedOutLayers()]
            
            print("✅ YOLO model loaded successfully")
            
        except Exception as e:
            print(f"❌ Failed to load YOLO model: {e}")
            raise
    
    def test_stream_connection(self):
        """Test connection to Pi stream"""
        try:
            # Test stream URL
            cap = cv2.VideoCapture(self.stream_url)
            if not cap.isOpened():
                return False, "Cannot connect to stream"
            
            # Try to read a frame
            ret, frame = cap.read()
            cap.release()
            
            if not ret:
                return False, "Cannot read frames from stream"
            
            return True, "Stream connection successful"
            
        except Exception as e:
            return False, f"Connection error: {e}"
    
    def detect_people(self, frame):
        """Detect people in frame using YOLO"""
        height, width, channels = frame.shape
        
        # Prepare image for YOLO with better preprocessing
        blob = cv2.dnn.blobFromImage(frame, 1/255.0, (608, 608), (0, 0, 0), True, crop=False)
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
                
                # Only process person class (ID = 0)
                if class_id == 0 and confidence > self.conf_threshold:
                    # Object detected
                    center_x = int(detection[0] * width)
                    center_y = int(detection[1] * height)
                    w = int(detection[2] * width)
                    h = int(detection[3] * height)
                    
                    # Rectangle coordinates
                    x = int(center_x - w / 2)
                    y = int(center_y - h / 2)
                    
                    # Filter out boxes that are too small or too large
                    if w > 30 and h > 50 and w < width * 0.8 and h < height * 0.8:
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
                "source": "Pi_Stream_PC_YOLO"
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
        """Main detection loop using Pi stream"""
        # Test stream connection first
        success, message = self.test_stream_connection()
        if not success:
            print(f"❌ Stream connection failed: {message}")
            print("Make sure Pi streaming server is running and accessible")
            return
        
        print(f"✅ {message}")
        
        # Connect to stream
        cap = cv2.VideoCapture(self.stream_url)
        
        if not cap.isOpened():
            print("❌ Error: Could not connect to Pi stream")
            return
        
        device_info = "GPU" if self.use_gpu else "CPU"
        print(f"🎥 Pi Stream connected ({device_info}) - Press 'q' to quit")
        
        # Performance tracking
        frame_count = 0
        start_time = time.time()
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    print("⚠️ Failed to read frame from stream")
                    time.sleep(1)
                    continue
                
                frame_count += 1
                
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
                
                # Calculate and display FPS
                elapsed_time = current_time - start_time
                fps = frame_count / elapsed_time if elapsed_time > 0 else 0
                
                # Add status overlay
                status_text = f"PC-YOLO | People: {person_count} | Presence: {stable_presence} | FPS: {fps:.1f}"
                cv2.putText(frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                
                # Add Pi stream info
                pi_info = f"Pi Stream: {self.pi_ip}"
                cv2.putText(frame, pi_info, (10, frame.shape[0] - 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                
                # Add detection confidence for debugging
                if len(indexes) > 0:
                    for i in indexes.flatten():
                        confidence = confidences[i]
                        x, y, w, h = boxes[i]
                        conf_text = f"Conf: {confidence:.2f}"
                        cv2.putText(frame, conf_text, (x, y + h + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)
                
                # Show frame
                cv2.imshow('PC YOLO Detection - Pi Stream', frame)
                
                # Check for quit
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                    
        except KeyboardInterrupt:
            print("\n🛑 Detection stopped by user")
        finally:
            cap.release()
            cv2.destroyAllWindows()
            print("👋 Stream disconnected")

def main():
    parser = argparse.ArgumentParser(description='PC Stream Client with YOLO Detection')
    parser.add_argument('--pi_ip', required=True, help='Raspberry Pi IP address')
    parser.add_argument('--firebase_url', default='http://localhost:9000', help='Firebase URL')
    parser.add_argument('--room_id', default='roomA', help='Room ID')
    parser.add_argument('--no_gpu', action='store_true', help='Disable GPU acceleration')
    parser.add_argument('--local_camera', type=int, help='Use local camera instead of Pi stream (0=integrated, 1=external)')
    
    args = parser.parse_args()
    
    try:
        print("🚀 Starting PC Stream Client with YOLO Detection...")
        
        client = PCStreamClient(
            pi_ip=args.pi_ip,
            firebase_url=args.firebase_url,
            room_id=args.room_id,
            use_gpu=not args.no_gpu
        )
        
        client.run_detection()
        
    except FileNotFoundError as e:
        print(f"❌ YOLO model files not found: {e}")
        print("Make sure yolov3-tiny.cfg and yolov3-tiny.weights are in the yolo/ folder")
        
    except ImportError as e:
        print(f"❌ Missing Python package: {e}")
        print("Install with: pip install opencv-python numpy requests")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        
    finally:
        print("👋 PC Stream Client ended")

if __name__ == "__main__":
    main()