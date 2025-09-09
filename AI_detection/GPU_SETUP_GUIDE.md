# 🚀 GPU Acceleration Setup Guide

This guide will help you set up GPU acceleration for YOLO detection, which can provide 10-50x faster performance compared to CPU-only inference.

## 🎯 Current Status Check

Run this to check your current setup:
```bash
python -c "import cv2; print('OpenCV version:', cv2.__version__); print('Available backends:', cv2.dnn.getAvailableBackends()); print('Available targets:', cv2.dnn.getAvailableTargets())"
```

## 🛠️ GPU Setup Options

### Option 1: Quick Setup (Easiest)
Try installing OpenCV with potential CUDA support:
```bash
pip uninstall opencv-python opencv-contrib-python
pip install opencv-contrib-python
```

### Option 2: NVIDIA CUDA Setup (Most Performance)

#### Step 1: Check GPU Compatibility
```bash
nvidia-smi
```
You should see your GPU information. Supported GPUs: GTX 1060+, RTX series, Quadro, Tesla

#### Step 2: Install CUDA Toolkit
1. Download from: https://developer.nvidia.com/cuda-downloads
2. Choose your OS version
3. Install with default settings
4. Verify installation:
```bash
nvcc --version
```

#### Step 3: Install cuDNN
1. Register at: https://developer.nvidia.com/cudnn
2. Download cuDNN for your CUDA version
3. Extract and copy files to CUDA directory:
   - Copy `bin` files to `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.x\bin`
   - Copy `include` files to `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.x\include`
   - Copy `lib` files to `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.x\lib\x64`

#### Step 4: Build OpenCV with CUDA (Advanced)
This requires Visual Studio and cmake. Alternative: use pre-built packages.

### Option 3: Intel OpenVINO (Alternative)
For Intel hardware optimization:
```bash
pip install openvino-dev
```

## 🔧 Verification

After setup, test with:
```bash
python test_setup.py
```

Look for:
- ✅ GPU acceleration enabled (CUDA)
- ✅ OpenVINO acceleration enabled
- Or ⚠️ warnings about missing CUDA

## 📊 Performance Comparison

| Method | FPS (approx) | Use Case |
|--------|--------------|----------|
| CPU only | 2-5 FPS | Testing, light use |
| OpenVINO | 8-15 FPS | Intel hardware |
| CUDA GPU | 20-60+ FPS | NVIDIA GPU |

## 🎯 Quick Test

Run the detection and check the status:
```bash
python realtime_presence.py
```

Look for:
- 🚀 GPU acceleration enabled
- 💻 Using CPU for detection
- FPS counter in the video window

## 🐛 Troubleshooting

### CUDA Not Found
- Ensure NVIDIA drivers are latest
- Install CUDA Toolkit matching your GPU
- Check Windows PATH includes CUDA directories

### OpenCV CUDA Errors
- Try `pip install opencv-contrib-python` first
- If still issues, may need to build OpenCV from source
- Alternative: use CPU detection (still works well)

### Performance Issues
- Check Windows Game Mode is off
- Close other GPU-intensive applications
- Monitor GPU usage with Task Manager

## 💡 Alternative Solutions

If GPU setup is complex, consider:

1. **Use Raspberry Pi streaming** (as implemented):
   - Pi handles camera capture
   - PC runs YOLO detection
   - Reduces latency and camera conflicts

2. **Cloud GPU services**:
   - Google Colab Pro
   - AWS EC2 GPU instances
   - Azure GPU VMs

3. **Edge TPU devices**:
   - Google Coral USB Accelerator
   - Specialized for inference

## 🔄 Next Steps

1. **Test current setup** with CPU detection
2. **Monitor performance** and decide if GPU needed
3. **Implement Pi streaming** for better architecture
4. **Consider cloud options** for demanding applications

The system is designed to work well on CPU while providing GPU acceleration when available.