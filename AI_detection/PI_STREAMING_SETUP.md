# 🍓 Raspberry Pi + PC YOLO Detection Setup

This setup allows you to use a Raspberry Pi as an IP camera streaming server while running YOLO detection on a more powerful PC with GPU acceleration.

## 📋 Architecture Overview

```
Raspberry Pi (Camera) → Stream → PC (YOLO Detection) → Firebase
```

- **Pi**: Captures video and streams via HTTP/MJPEG
- **PC**: Connects to Pi stream, runs YOLO detection with GPU acceleration
- **Firebase**: Receives presence detection results

## 🍓 Raspberry Pi Setup

### Prerequisites
- Raspberry Pi 4 (recommended) or Pi 3B+
- Pi Camera module or USB webcam
- Python 3.7+
- Network connection (same network as PC)

### Installation

1. **Update Pi**:
```bash
sudo apt update && sudo apt upgrade -y
```

2. **Install required packages**:
```bash
sudo apt install python3-pip python3-opencv
pip3 install flask opencv-python numpy
```

3. **Enable camera** (if using Pi Camera):
```bash
sudo raspi-config
# Navigate to: Interface Options → Camera → Enable
sudo reboot
```

4. **Copy Pi streaming server**:
```bash
# Transfer pi_streaming_server.py to your Pi
scp pi_streaming_server.py pi@YOUR_PI_IP:/home/pi/
```

### Running Pi Streaming Server

```bash
cd /home/pi
python3 pi_streaming_server.py
```

The server will start on port 5000 and display:
- **Web interface**: `http://PI_IP:5000`
- **Stream URL**: `http://PI_IP:5000/video_feed`
- **MJPEG Stream**: `http://PI_IP:5000/stream.mjpg`

## 💻 PC Setup

### Prerequisites
- Windows/Linux PC with NVIDIA GPU (recommended)
- Python 3.8+
- CUDA Toolkit (for GPU acceleration)
- YOLO model files

### Installation

1. **Install Python packages**:
```bash
pip install opencv-python numpy requests
```

2. **For GPU acceleration**, install CUDA-enabled OpenCV:
```bash
# Check if you have CUDA-capable GPU
nvidia-smi

# Install CUDA Toolkit from NVIDIA website
# Then install OpenCV with CUDA support (optional, for better performance)
```

3. **Prepare YOLO files**:
- Ensure `yolo/yolov3-tiny.cfg` and `yolo/yolov3-tiny.weights` are in place
- Run `python test_setup.py` to verify setup

### Running PC Client

```bash
# Basic usage
python pc_stream_client.py --pi_ip 192.168.1.100

# With custom Firebase URL
python pc_stream_client.py --pi_ip 192.168.1.100 --firebase_url http://localhost:9000

# Force CPU usage (disable GPU)
python pc_stream_client.py --pi_ip 192.168.1.100 --no_gpu
```

## 🚀 Quick Start Guide

### Step 1: Find Pi IP Address
On Pi:
```bash
hostname -I
```

### Step 2: Start Pi Streaming
On Pi:
```bash
python3 pi_streaming_server.py
```

### Step 3: Test Stream
Open browser: `http://PI_IP:5000`

### Step 4: Run PC Detection
On PC:
```bash
python pc_stream_client.py --pi_ip PI_IP_ADDRESS
```

## 🔧 Configuration Options

### Pi Streaming Server
- **Resolution**: Modify `width` and `height` in `PiCameraStreamer()`
- **FPS**: Adjust `fps` parameter
- **Port**: Change Flask app port if needed

### PC Client
- **Detection threshold**: Modify `conf_threshold` (default: 0.3)
- **GPU usage**: Use `--no_gpu` flag to disable
- **Firebase**: Custom URL with `--firebase_url`

## 📊 Performance Optimization

### For Better Detection Accuracy:
1. **Increase input resolution**: Change blob size from (608,608) to (832,832)
2. **Lower confidence threshold**: Reduce from 0.3 to 0.2
3. **Better lighting**: Ensure good lighting conditions

### For Better Performance:
1. **Enable GPU**: Ensure CUDA is properly installed
2. **Adjust resolution**: Lower Pi stream resolution if network is slow
3. **Network optimization**: Use wired connection for Pi if possible

## 🌐 Network Configuration

### Port Requirements:
- **Pi**: Port 5000 (HTTP streaming)
- **Firebase**: Port 9000 (if using local emulator)

### Firewall Settings:
Ensure ports are open between Pi and PC:
```bash
# On Pi (if firewall enabled)
sudo ufw allow 5000

# Test connectivity from PC
telnet PI_IP 5000
```

## 🐛 Troubleshooting

### Pi Stream Issues:
1. **Camera not detected**:
   ```bash
   # Check camera
   libcamera-hello --camera 0
   
   # Or for USB camera
   v4l2-ctl --list-devices
   ```

2. **Permission errors**:
   ```bash
   sudo usermod -a -G video $USER
   sudo reboot
   ```

### PC Connection Issues:
1. **Cannot connect to stream**:
   - Verify Pi IP address
   - Check network connectivity: `ping PI_IP`
   - Ensure Pi streaming server is running

2. **YOLO not detecting**:
   - Check YOLO model files are present
   - Verify GPU setup with `python test_setup.py`
   - Try lowering confidence threshold

### Performance Issues:
1. **Low FPS**: 
   - Check network bandwidth
   - Reduce Pi stream resolution
   - Close other applications

2. **High latency**:
   - Use wired connection
   - Reduce Pi buffer size
   - Optimize network settings

## 📈 Monitoring and Logs

### Pi Server Logs:
- Server status visible in terminal
- Access logs for debugging connections

### PC Client Metrics:
- Real-time FPS display
- Detection confidence scores
- Firebase update status

## 🔄 Alternative Streaming Methods

### Using mjpg-streamer (Alternative to Flask):
```bash
# Install mjpg-streamer
sudo apt install mjpg-streamer

# Start streaming
mjpg_streamer -i "input_uvc.so -d /dev/video0 -r 640x480 -f 30" -o "output_http.so -p 8080"
```

### Using GStreamer:
```bash
# Pi server
gst-launch-1.0 v4l2src device=/dev/video0 ! video/x-raw,width=640,height=480 ! videoconvert ! jpegenc ! tcpserversink host=0.0.0.0 port=5000

# PC client (modify OpenCV VideoCapture)
cap = cv2.VideoCapture("tcpclientsrc host=PI_IP port=5000 ! jpegdec ! videoconvert ! appsink")
```

## 📚 Additional Resources

- [OpenCV CUDA Installation Guide](https://docs.opencv.org/master/d6/d15/tutorial_building_tegra_cuda.html)
- [Pi Camera Documentation](https://www.raspberrypi.org/documentation/usage/camera/)
- [YOLO Model Downloads](https://github.com/pjreddie/darknet/wiki/YOLO:-Real-Time-Object-Detection)

## 🤝 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Test components individually (Pi stream, PC detection, Firebase)
4. Check network connectivity and firewall settings