"""
Raspberry Pi IP Camera Streaming Server
Stream camera feed using Flask + OpenCV for PC to connect and run YOLO detection
"""

import cv2
import threading
import time
from flask import Flask, Response, render_template_string
import socket

app = Flask(__name__)

class PiCameraStreamer:
    def __init__(self, camera_index=0, width=640, height=480, fps=30):
        """Initialize Pi camera streaming server"""
        self.camera_index = camera_index
        self.width = width
        self.height = height
        self.fps = fps
        self.camera = None
        self.frame = None
        self.lock = threading.Lock()
        self.streaming = False
        
        print("🍓 Pi Camera Streaming Server")
        print(f"📹 Resolution: {width}x{height} @ {fps}FPS")
        
    def initialize_camera(self):
        """Initialize camera with proper settings"""
        try:
            self.camera = cv2.VideoCapture(self.camera_index)
            
            if not self.camera.isOpened():
                raise Exception("Failed to open camera")
            
            # Set camera properties
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            self.camera.set(cv2.CAP_PROP_FPS, self.fps)
            self.camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize latency
            
            # Test camera
            ret, test_frame = self.camera.read()
            if not ret:
                raise Exception("Failed to read from camera")
                
            print("✅ Camera initialized successfully")
            return True
            
        except Exception as e:
            print(f"❌ Camera initialization failed: {e}")
            return False
    
    def capture_frames(self):
        """Continuously capture frames from camera"""
        print("🎬 Starting frame capture...")
        
        while self.streaming:
            try:
                ret, frame = self.camera.read()
                if ret:
                    # Add timestamp overlay
                    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
                    cv2.putText(frame, timestamp, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    
                    # Add streaming info
                    info_text = f"Pi Stream - {self.width}x{self.height}"
                    cv2.putText(frame, info_text, (10, self.height - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                    
                    with self.lock:
                        self.frame = frame.copy()
                else:
                    print("⚠️ Failed to capture frame")
                    time.sleep(0.1)
                    
            except Exception as e:
                print(f"❌ Frame capture error: {e}")
                time.sleep(1)
    
    def get_frame(self):
        """Get the latest frame for streaming"""
        with self.lock:
            if self.frame is not None:
                return self.frame.copy()
            return None
    
    def generate_frames(self):
        """Generate frames for HTTP streaming"""
        while True:
            frame = self.get_frame()
            if frame is not None:
                # Encode frame as JPEG
                ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if ret:
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(1/self.fps)  # Control frame rate
    
    def start_streaming(self):
        """Start the camera streaming"""
        if not self.initialize_camera():
            return False
            
        self.streaming = True
        
        # Start frame capture thread
        capture_thread = threading.Thread(target=self.capture_frames)
        capture_thread.daemon = True
        capture_thread.start()
        
        return True
    
    def stop_streaming(self):
        """Stop camera streaming"""
        self.streaming = False
        if self.camera:
            self.camera.release()
        print("🛑 Camera streaming stopped")

# Global camera streamer instance
camera_streamer = PiCameraStreamer()

@app.route('/')
def index():
    """Main page with streaming info"""
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    html_template = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Pi Camera Stream</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f0f0f0; }
            .container { max-width: 800px; margin: auto; background: white; padding: 20px; border-radius: 10px; }
            .stream-container { text-align: center; margin: 20px 0; }
            .info { background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .code { background: #2d3748; color: #e2e8f0; padding: 10px; border-radius: 5px; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🍓 Raspberry Pi Camera Stream</h1>
            
            <div class="stream-container">
                <img src="{{ url_for('video_feed') }}" style="width: 100%; max-width: 640px; border: 2px solid #333;">
            </div>
            
            <div class="info">
                <h3>📡 Connection Info</h3>
                <p><strong>Local IP:</strong> {{ local_ip }}</p>
                <p><strong>Stream URL:</strong> http://{{ local_ip }}:5000/video_feed</p>
                <p><strong>MJPEG Stream:</strong> http://{{ local_ip }}:5000/stream.mjpg</p>
            </div>
            
            <div class="info">
                <h3>💻 PC Client Connection</h3>
                <p>Use this URL in your PC YOLO detection script:</p>
                <div class="code">
                camera_source = "http://{{ local_ip }}:5000/video_feed"<br>
                detector.run_detection(camera_source)
                </div>
            </div>
            
            <div class="info">
                <h3>🔧 Setup Instructions</h3>
                <ol>
                    <li>Ensure Pi and PC are on the same network</li>
                    <li>Run this script on Pi: <code>python pi_streaming_server.py</code></li>
                    <li>Run PC detection script with Pi's IP</li>
                    <li>Monitor detection results on PC</li>
                </ol>
            </div>
        </div>
    </body>
    </html>
    """
    
    return render_template_string(html_template, local_ip=local_ip)

@app.route('/video_feed')
def video_feed():
    """Video streaming route for web display"""
    return Response(camera_streamer.generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/stream.mjpg')
def mjpeg_stream():
    """MJPEG stream for direct access"""
    return Response(camera_streamer.generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/status')
def status():
    """Stream status endpoint"""
    return {
        "streaming": camera_streamer.streaming,
        "resolution": f"{camera_streamer.width}x{camera_streamer.height}",
        "fps": camera_streamer.fps
    }

def get_local_ip():
    """Get local IP address"""
    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        return local_ip
    except:
        return "localhost"

if __name__ == '__main__':
    print("🚀 Starting Pi Camera Streaming Server...")
    
    # Start camera streaming
    if camera_streamer.start_streaming():
        local_ip = get_local_ip()
        print(f"✅ Camera streaming started")
        print(f"🌐 Web interface: http://{local_ip}:5000")
        print(f"📹 Stream URL: http://{local_ip}:5000/video_feed")
        print(f"🔗 MJPEG Stream: http://{local_ip}:5000/stream.mjpg")
        print("🛑 Press Ctrl+C to stop")
        
        try:
            # Run Flask app
            app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
        except KeyboardInterrupt:
            print("\n🛑 Stopping server...")
        finally:
            camera_streamer.stop_streaming()
    else:
        print("❌ Failed to start camera streaming")