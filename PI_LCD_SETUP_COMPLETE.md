# Complete Grove LCD Dashboard Setup Guide
## For Fresh Raspberry Pi Installation

This guide provides step-by-step instructions for setting up the Grove LCD dashboard on a new Raspberry Pi from scratch.

---

## Hardware Requirements

- **Raspberry Pi 4** (recommended) with Raspberry Pi OS
- **Grove Base Hat for Raspberry Pi**
- **Grove 16x2 LCD** (white on blue, non-RGB version)
- **SD Card** (32GB+ recommended)
- **Network connection** (WiFi or Ethernet)

---

## Step 1: Basic Raspberry Pi Setup

### 1.1 Flash Raspberry Pi OS
```bash
# Enable SSH and I2C during initial setup
# Or enable after boot:
sudo raspi-config
# → Interface Options → SSH → Enable
# → Interface Options → I2C → Enable
# → Finish → Reboot
```

### 1.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Install Dependencies
```bash
sudo apt install -y git python3-pip python3-venv python3-smbus i2c-tools
```

---

## Step 2: Install GrovePi Library

### 2.1 Clone GrovePi Repository
```bash
cd ~
git clone https://github.com/DexterInd/GrovePi
cd GrovePi/Software/Python
```

### 2.2 Install GrovePi Library
```bash
sudo python3 setup.py install
```

### 2.3 Fix GrovePi Package Structure
```bash
# Create __init__.py to make grove_rgb_lcd a proper Python package
touch grove_rgb_lcd/__init__.py
```

### 2.4 Create Python Virtual Environment
```bash
python3 -m venv grove-env
source grove-env/bin/activate
```

### 2.5 Install Python Dependencies
```bash
pip install paho-mqtt
```

---

## Step 3: Hardware Connection & Testing

### 3.1 Connect Grove LCD
- Connect Grove 16x2 LCD to **I2C port** on Grove Base Hat
- Ensure Base Hat is properly mounted on Raspberry Pi GPIO pins

### 3.2 Verify I2C Connection
```bash
sudo i2cdetect -y 1
```
**Expected output:** You should see `3e` (LCD controller)

### 3.3 Test Grove LCD Library
```bash
# Navigate to GrovePi Python directory
cd ~/GrovePi/Software/Python

# Test LCD import and display
python3 -c 'import sys; sys.path.insert(0, "."); from grove_rgb_lcd.grove_rgb_lcd import setText; setText("Hello World\nLCD Working!")'
```
**Expected result:** LCD should display "Hello World" on line 1 and "LCD Working!" on line 2

---

## Step 4: Install LCD Dashboard

### 4.1 Copy Dashboard File
```bash
# From your Windows development machine:
scp pi_lcd_dashboard_working.py pi@192.168.202.221:~/pi_lcd_dashboard.py

# Replace 192.168.202.221 with your actual Pi IP address
```

### 4.2 Test Dashboard
```bash
# On Raspberry Pi, activate environment and run
source grove-env/bin/activate
cd ~/GrovePi/Software/Python
python3 ~/pi_lcd_dashboard.py
```

**Expected output:**
```
✅ GrovePi library imported successfully
2025-XX-XX XX:XX:XX,XXX - INFO - 🚀 Starting LCD dashboard...
2025-XX-XX XX:XX:XX,XXX - INFO - ✅ MQTT client connected
2025-XX-XX XX:XX:XX,XXX - INFO - 📡 Connected to MQTT broker
2025-XX-XX XX:XX:XX,XXX - INFO - 📡 Subscribed to 2 topics
```

**LCD should display:**
- Page 1 (3s): Lighting info (presence, LDR, LED state)
- Page 2 (3s): Climate info (temperature, humidity, fan)  
- Page 3 (3s): Air quality info (readings, status)

---

## Step 5: Auto-Start Setup (Optional)

### 5.1 Create Startup Script
```bash
cat > ~/start_lcd_dashboard.sh << 'EOF'
#!/bin/bash
cd /home/pi/GrovePi/Software/Python
source /home/pi/grove-env/bin/activate
python3 /home/pi/pi_lcd_dashboard.py
EOF

chmod +x ~/start_lcd_dashboard.sh
```

### 5.2 Create Systemd Service
```bash
sudo tee /etc/systemd/system/lcd-dashboard.service > /dev/null << 'EOF'
[Unit]
Description=Smart Classroom LCD Dashboard
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/GrovePi/Software/Python
ExecStart=/home/pi/start_lcd_dashboard.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### 5.3 Enable Auto-Start
```bash
sudo systemctl enable lcd-dashboard.service
sudo systemctl start lcd-dashboard.service

# Check status
sudo systemctl status lcd-dashboard.service
```

---

## Step 6: Manual Operation Commands

### Start Dashboard
```bash
source grove-env/bin/activate
cd ~/GrovePi/Software/Python
python3 ~/pi_lcd_dashboard.py
```

### Stop Dashboard
```bash
# Press Ctrl+C in the terminal running the dashboard
# Or if running as service:
sudo systemctl stop lcd-dashboard.service
```

### View Logs
```bash
# Real-time logs
sudo journalctl -u lcd-dashboard.service -f

# Recent logs
sudo journalctl -u lcd-dashboard.service --since "10 minutes ago"
```

---

## Troubleshooting

### LCD Not Detected
```bash
# Check I2C connection
sudo i2cdetect -y 1

# Should show '3e' for LCD controller
# If not detected, check physical connections
```

### Import Errors
```bash
# Verify you're in the correct directory
cd ~/GrovePi/Software/Python

# Check if __init__.py exists (required for package import)
ls -la grove_rgb_lcd/__init__.py

# If missing, create it:
touch grove_rgb_lcd/__init__.py

# Test import manually
python3 -c 'import sys; sys.path.insert(0, "."); from grove_rgb_lcd.grove_rgb_lcd import setText; print("Import OK")'
```

### MQTT Connection Issues
```bash
# Check if MQTT broker is running
sudo systemctl status mosquitto

# Start MQTT broker if needed
sudo apt install mosquitto mosquitto-clients
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
```

### Permission Issues
```bash
# Add user to i2c group
sudo usermod -a -G i2c pi
# Then logout and login again
```

---

## File Structure After Setup

```
/home/pi/
├── grove-env/                    # Python virtual environment
├── GrovePi/                      # GrovePi library
│   └── Software/Python/          # Run dashboard from here
├── pi_lcd_dashboard.py           # Main dashboard script
└── start_lcd_dashboard.sh        # Startup script (optional)
```

---

## Quick Setup Commands Summary

For experienced users, here's the rapid setup sequence:

```bash
# System setup
sudo apt update && sudo apt upgrade -y
sudo apt install -y git python3-pip python3-venv python3-smbus i2c-tools
sudo raspi-config  # Enable SSH and I2C

# GrovePi installation
cd ~ && git clone https://github.com/DexterInd/GrovePi
cd GrovePi/Software/Python && sudo python3 setup.py install

# Fix package structure (IMPORTANT!)
touch grove_rgb_lcd/__init__.py

# Python environment
python3 -m venv grove-env && source grove-env/bin/activate
pip install paho-mqtt

# Copy dashboard file (from Windows)
scp pi_lcd_dashboard_working.py pi@YOUR_PI_IP:~/pi_lcd_dashboard.py

# Test
cd ~/GrovePi/Software/Python && python3 ~/pi_lcd_dashboard.py
```
---

## Success Criteria

✅ **I2C Detection:** `sudo i2cdetect -y 1` shows `3e`  
✅ **LCD Test:** Manual setText command displays text on LCD  
✅ **Dashboard Start:** No import errors, MQTT connects successfully  
✅ **Display Rotation:** LCD shows rotating pages every 3 seconds  
✅ **MQTT Integration:** Dashboard receives data from ESP32 modules  

---

*Last updated: September 2025*  
*Tested on: Raspberry Pi 4, Raspberry Pi OS Bookworm*
