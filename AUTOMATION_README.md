# Grove LCD Dashboard - Automated Installation Scripts

This directory contains automated installation scripts for setting up the Grove LCD Dashboard on fresh Raspberry Pi installations.

## 🚀 Quick Start (Recommended)

For complete automation from Windows to Pi:

```bash
# Make scripts executable
chmod +x *.sh

# Run complete setup (replace with your Pi's IP)
./quick_setup.sh 192.168.202.221
```

This single command will:
- Copy installation script to Pi
- Install all dependencies on Pi
- Deploy the dashboard
- Set up auto-start service
- Verify everything is working

## 📋 Individual Scripts

### 1. `quick_setup.sh` - Complete Automation
**Use this for new Pi setups**
```bash
./quick_setup.sh <PI_IP_ADDRESS>
```

### 2. `install_grove_lcd_dashboard.sh` - Pi Installation Only
Run this **on the Raspberry Pi** to install dependencies:
```bash
# Copy to Pi first
scp install_grove_lcd_dashboard.sh pi@YOUR_PI_IP:~/

# Then run on Pi
ssh pi@YOUR_PI_IP
chmod +x install_grove_lcd_dashboard.sh
./install_grove_lcd_dashboard.sh
```

### 3. `deploy_dashboard.sh` - Dashboard Deployment Only
Run this **from Windows** to copy dashboard to Pi:
```bash
./deploy_dashboard.sh <PI_IP_ADDRESS>
```

## 📁 Required Files

Make sure these files are in your project directory:

```
smart-classroom-iot/
├── pi_lcd_dashboard_working.py     # Main dashboard (REQUIRED - THE WORKING VERSION)
├── pi_lcd_dashboard.py             # Old version (DO NOT USE)
├── quick_setup.sh                  # Complete automation
├── install_grove_lcd_dashboard.sh  # Pi installation script
├── deploy_dashboard.sh             # Dashboard deployment
├── PI_LCD_SETUP_COMPLETE.md       # Manual setup guide
└── AUTOMATION_README.md           # This file
```

## 🔧 What Gets Installed

The automation scripts install:

### System Packages
- `git` - For cloning repositories
- `python3-pip` - Python package manager
- `python3-venv` - Virtual environments
- `python3-smbus` - I2C communication
- `i2c-tools` - I2C debugging tools
- `mosquitto` - MQTT broker
- `mosquitto-clients` - MQTT client tools

### Python Environment
- Virtual environment: `~/grove-env`
- Package: `paho-mqtt`

### GrovePi Library
- Cloned to: `~/GrovePi`
- Python library installed system-wide

### Dashboard Files
- Main script: `~/pi_lcd_dashboard.py`
- Startup script: `~/start_lcd_dashboard.sh`
- Systemd service: `/etc/systemd/system/lcd-dashboard.service`

### System Configuration
- I2C enabled in `/boot/config.txt`
- SSH enabled and started
- User added to `i2c` group
- Auto-start service (optional)

## 🎯 Usage Examples

### Setup New Pi at 192.168.1.100
```bash
./quick_setup.sh 192.168.1.100
```

### Deploy Dashboard to Existing Pi
```bash
./deploy_dashboard.sh 192.168.1.100
```

### Manual Installation on Pi
```bash
# Copy and run installation script
scp install_grove_lcd_dashboard.sh pi@192.168.1.100:~/
ssh pi@192.168.1.100 "chmod +x install_grove_lcd_dashboard.sh && ./install_grove_lcd_dashboard.sh"

# Then deploy dashboard
./deploy_dashboard.sh 192.168.1.100
```

## ✅ Success Criteria

After running the scripts, you should have:

1. **I2C Working**: `sudo i2cdetect -y 1` shows device at `3e`
2. **GrovePi Import**: No errors when importing grove_rgb_lcd
3. **Dashboard Running**: LCD shows rotating pages every 3 seconds
4. **MQTT Connected**: Dashboard connects to localhost MQTT broker
5. **Auto-start**: Service starts automatically on boot (if enabled)

## 🛠️ Troubleshooting

### Script Fails with Permission Denied
```bash
chmod +x *.sh
```

### Cannot Connect to Pi
- Check IP address is correct
- Ensure Pi is on same network
- Verify SSH is enabled on Pi

### LCD Not Detected
- Check physical connections
- Verify I2C is enabled: `sudo i2cdetect -y 1`
- Try different I2C port on Grove Base Hat

### Dashboard Import Errors
- Ensure you're in the correct directory: `cd ~/GrovePi/Software/Python`
- Activate virtual environment: `source ~/grove-env/bin/activate`
- Check Python path includes GrovePi directory

### Service Won't Start
```bash
# Check service status
sudo systemctl status lcd-dashboard

# View logs
sudo journalctl -u lcd-dashboard -f

# Restart service
sudo systemctl restart lcd-dashboard
```

## 📞 Manual Fallback

If automation fails, use the manual setup guide:
- See `PI_LCD_SETUP_COMPLETE.md` for step-by-step instructions

## 🔄 Updates

To update the dashboard on existing Pi:
```bash
./deploy_dashboard.sh <PI_IP_ADDRESS>
```

This only copies the dashboard file without reinstalling dependencies.

---

*For detailed manual setup instructions, see `PI_LCD_SETUP_COMPLETE.md`*
