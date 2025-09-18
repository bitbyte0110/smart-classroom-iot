"""
Force GPU Usage YOLO Detection
Ensure GPU is actually being used for inference
"""

import cv2
import time
import torch
import numpy as np
from ultralytics import YOLO
import paho.mqtt.client as mqtt

class ForceGPUYOLODetector:
    def __init__(self, firebase_url="https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app", room_id="roomA", mqtt_host="192.168.225.221", mqtt_port=1883):
        """Initialize force GPU YOLO detector"""
        self.firebase_url = firebase_url
        self.room_id = room_id
        
        print("Initializing Force GPU YOLO Detection...")
        
        # Force GPU usage
        if torch.cuda.is_available():
            self.device = 'cuda'
            torch.cuda.set_device(0)  # Force GPU 0
            print(f"Forcing GPU: {torch.cuda.get_device_name(0)}")
            print(f"CUDA version: {torch.version.cuda}")
        else:
            self.device = 'cpu'
            print("⚠️ No GPU available")
        
        # Load model and force to GPU
        print("📥 Loading YOLOv8n model...")
        self.model = YOLO('yolov8n.pt')
        self.model.to(self.device)
        
        # Verify model is on GPU
        if self.device == 'cuda':
            print(f"✅ Model on GPU: {next(self.model.model.parameters()).device}")
        
        # Ultra-fast settings
        self.conf_threshold = 0.6
        self.iou_threshold = 0.5
        self.frame_skip = 1  # Process every frame
        self.input_size = 224
        
        # Detection history
        self.detection_history = []
        self.history_size = 4
        
        # Timing
        self.last_update = 0
        self.update_interval = 1.0  # Update every 1s for immediate LED response
        
        # MQTT client (Raspberry Pi broker)
        self.mqtt_host = mqtt_host
        self.mqtt_port = mqtt_port
        self.mqtt = mqtt.Client(client_id=f"ai-camera-{self.room_id}")
        try:
            self.mqtt.connect(self.mqtt_host, self.mqtt_port, 60)
            print(f"🔗 MQTT connected: {self.mqtt_host}:{self.mqtt_port}")
        except Exception as e:
            print(f"⚠️ MQTT connect failed: {e}")

        print("✅ Force GPU YOLO Detector initialized")
    
    def detect_people_force_gpu(self, frame):
        """Force GPU detection with explicit GPU usage"""
        # Resize for speed
        height, width = frame.shape[:2]
        if width > 320:
            scale = 320 / width
            new_width = 320
            new_height = int(height * scale)
            frame_resized = cv2.resize(frame, (new_width, new_height))
        else:
            frame_resized = frame
        
        # Force GPU inference with explicit settings
        with torch.cuda.amp.autocast(enabled=self.device == 'cuda'):  # Use mixed precision
            results = self.model(frame_resized, 
                               conf=self.conf_threshold,
                               iou=self.iou_threshold,
                               device=self.device,
                               imgsz=self.input_size,
                               verbose=False,
                               half=True if self.device == 'cuda' else False,
                               max_det=3)
        
        # Process results
        person_count = 0
        boxes = []
        confidences = []
        
        if results and len(results) > 0:
            result = results[0]
            if result.boxes is not None and len(result.boxes) > 0:
                person_mask = result.boxes.cls == 0
                if person_mask.any():
                    person_boxes = result.boxes.xyxy[person_mask].cpu().numpy()
                    person_confs = result.boxes.conf[person_mask].cpu().numpy()
                    
                    person_count = len(person_boxes)
                    
                    for box, conf in zip(person_boxes, person_confs):
                        x1, y1, x2, y2 = box.astype(int)
                        w, h = x2 - x1, y2 - y1
                        
                        # Scale back
                        if width > 320:
                            scale_factor = width / 320
                            x1 = int(x1 * scale_factor)
                            y1 = int(y1 * scale_factor)
                            w = int(w * scale_factor)
                            h = int(h * scale_factor)
                        
                        if w > 15 and h > 25:
                            boxes.append([x1, y1, w, h])
                            confidences.append(float(conf))
        
        return person_count, boxes, confidences
    
    def stable_presence_detection(self, person_count):
        """Quick stability check with immediate off when no people"""
        self.detection_history.append(person_count > 0)
        if len(self.detection_history) > self.history_size:
            self.detection_history.pop(0)
        
        # Immediate OFF when no people detected (no delay)
        if person_count == 0:
            return False
        
        # Require stability for ON (prevent false positives)
        if len(self.detection_history) >= 3:
            return sum(self.detection_history) >= 2
        return person_count > 0
    
    def update_firebase(self, presence, person_count, max_confidence=0.0):
        """Update Firebase with complete AI data"""
        try:
            import requests
            timestamp = int(time.time() * 1000)
            
            # Complete AI data for ESP32 integration
            ai_data = {
                "ai_presence": presence,
                "ai_people_count": person_count,
                "ai_confidence": round(max_confidence, 2),
                "ai_timestamp": timestamp,
                "ai_source": "GPU_Camera"
            }
            
            # Update Firebase state
            state_url = f"{self.firebase_url}/lighting/{self.room_id}/state.json"
            response = requests.patch(state_url, json=ai_data, timeout=5)
            
            # Publish to MQTT alongside Firebase
            try:
                self.mqtt.publish("ai/presence/detection", "true" if presence else "false", qos=0, retain=True)
                self.mqtt.publish("ai/presence/count", str(person_count), qos=0, retain=True)
                self.mqtt.publish("ai/presence/confidence", f"{max_confidence:.2f}", qos=0, retain=True)
            except Exception as e:
                print(f"⚠️ MQTT publish failed: {e}")

            if response.status_code == 200:
                # Enhanced logging for LED and Fan control debugging
                status_icon = "🟢" if presence else "🔴"
                led_action = "LED should turn ON" if presence else "LED should turn OFF IMMEDIATELY"
                fan_action = "Fan should turn ON (if temp/humidity needs it)" if presence else "Fan should turn OFF IMMEDIATELY"
                print(f"{status_icon} Firebase updated: AI presence={presence}, people={person_count}, conf={max_confidence:.2f}")
                print(f"💡 {led_action}")
                print(f"🌪️ {fan_action}")
                return True
            else:
                print(f"❌ Firebase error: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Firebase update failed: {e}")
            return False
    
    def draw_detections(self, frame, boxes, confidences):
        """Draw detections"""
        for box, conf in zip(boxes, confidences):
            x, y, w, h = box
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(frame, f"{conf:.1f}", (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
        return frame
    
    def run_detection(self, camera_source=0):
        """Force GPU detection loop"""
        print(f"🎥 Force GPU Detection (Camera {camera_source}) - Press 'q' to quit")
        
        # Open camera
        cap = cv2.VideoCapture(camera_source, cv2.CAP_DSHOW)
        if not cap.isOpened():
            print(f"❌ Could not open camera {camera_source}")
            return
        
        # Set camera for speed
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
        cap.set(cv2.CAP_PROP_FPS, 30)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        # Performance tracking
        frame_count = 0
        start_time = time.time()
        last_fps_time = start_time
        
        print("🚀 Starting detection...")
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                current_time = time.time()
                
                # Process every Nth frame
                if frame_count % self.frame_skip == 0:
                    # Force GPU detection
                    person_count, boxes, confidences = self.detect_people_force_gpu(frame)
                    stable_presence = self.stable_presence_detection(person_count)
                    
                    # Get max confidence for Firebase
                    max_confidence = max(confidences) if confidences else 0.0
                    
                    # Update Firebase occasionally
                    if current_time - self.last_update >= self.update_interval:
                        self.update_firebase(stable_presence, person_count, max_confidence)
                        self.last_update = current_time
                    
                    # Draw detections
                    frame = self.draw_detections(frame, boxes, confidences)
                
                # Calculate FPS
                if current_time - last_fps_time >= 1.0:
                    fps = frame_count / (current_time - start_time)
                    last_fps_time = current_time
                    print(f"📊 FPS: {fps:.1f} | People: {person_count if frame_count % self.frame_skip == 0 else '...'}")
                else:
                    fps = frame_count / (current_time - start_time)
                
                # Add status
                status = f"People: {person_count if frame_count % self.frame_skip == 0 else '...'} | FPS: {fps:.1f}"
                cv2.putText(frame, status, (5, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
                
                # Show frame
                cv2.imshow('AI Presence Detection', frame)
                
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                    
        except KeyboardInterrupt:
            print("\n🛑 Stopped by user")
        finally:
            cap.release()
            cv2.destroyAllWindows()
            print("👋 Force GPU Detection ended")

def main():
    try:
        print("🚀 Starting Force GPU YOLO Detection...")
        detector = ForceGPUYOLODetector()
        detector.run_detection()
    except Exception as e:
        print(f"❌ Error: {e}")
        input("Press Enter to exit...")
    finally:
        print("👋 Force GPU Detection ended")

if __name__ == "__main__":
    main()