# Grove Base Hat Setup Guide for Smart Classroom IoT

## Hardware Requirements

### Raspberry Pi Setup
- **Raspberry Pi 4** (recommended) or Pi 3B+
- **Grove Base Hat for Raspberry Pi** 
- **MicroSD card** (32GB+) with Raspberry Pi OS
- **Power supply** (5V 3A for Pi 4)

### Grove Modules  
- **Grove 16x2 RGB LCD** (I2C interface) - connected to Raspberry Pi

### ESP32 Modules
- **ESP32 DevKit** for lighting control (LDR + LED)
- **ESP32 DevKit** for climate control (DHT22 + Fan + MQ-135)
- **MQ-135 Air Quality Sensor** - connected to ESP32 climate module

## Hardware Connections

### Raspberry Pi + Grove Base Hat
```
Grove Base Hat Connections:
├── I2C Port → Grove 16x2 RGB LCD (ONLY)
├── A0-A2 Ports → (Available for expansion)
└── Digital Ports → (Available for expansion)

Note: MQ-135 is on ESP32, not on Raspberry Pi
```

### ESP32 Lighting Module (existing)
```
ESP32 Connections:
├── GPIO 34 (ADC) → LDR Sensor
├── GPIO 18 (PWM) → LED Strip/Module
├── 3.3V → Sensor VCC
└── GND → Sensor/LED GND
```

### ESP32 Climate Module (existing)
```
ESP32 Connections:
├── GPIO 22 → DHT22 Data Pin
├── GPIO 32 (ADC) → MQ-135 Air Quality Sensor
├── GPIO 19 (PWM) → Fan Control
├── 5V → Fan VCC (if needed)
├── 3.3V → DHT22 VCC, MQ-135 VCC
└── GND → All sensor/fan GND
```

## Software Installation

### 1. Raspberry Pi OS Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Enable I2C interface
sudo raspi-config
# Navigate to: Interface Options → I2C → Enable

# Install Python packages
sudo apt install python3-pip -y
pip3 install grove.py paho-mqtt requests

# Install MQTT broker
sudo apt install mosquitto mosquitto-clients -y
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
```

### 2. Grove.py Library Installation
```bash
# Clone Grove.py repository
cd ~
git clone https://github.com/Seeed-Studio/grove.py.git
cd grove.py

# Install Grove.py
sudo pip3 install .

# Test installation
python3 -c "from grove.adc import ADC; print('Grove.py installed successfully')"
```

### 3. Smart Classroom Scripts
```bash
# Copy the LCD dashboard script to your Pi
scp pi_lcd_dashboard.py pi@your-pi-ip:~/

# Make script executable
chmod +x ~/pi_lcd_dashboard.py
```

## Configuration

### 1. Update MQTT Host
Edit the LCD dashboard script and update your Pi's IP:
```python
MQTT_HOST = "localhost"  # Or your Pi's IP if running from external device
```

### 2. Network Configuration
Ensure all devices are on the same network:
- **Raspberry Pi IP**: Note your Pi's IP address (`hostname -I`)
- **ESP32 MQTT Host**: Update ESP32 code to use Pi's IP
```cpp
const char* MQTT_HOST = "192.168.x.x"; // Your Pi's IP
```

## Testing Hardware

### 1. Test Grove Base Hat
```bash
# Test I2C devices
sudo i2cdetect -y 1
# Should show device at address 0x3E (LCD)

# Test ADC (MQ-135)
python3 -c "
from grove.adc import ADC
adc = ADC()
print('MQ-135 reading:', adc.read(0))
"
```

### 2. Test LCD Display
```bash
# Test LCD basic functionality
python3 -c "
from grove.display.jhd1802 import JHD1802
lcd = JHD1802()
lcd.setCursor(0, 0)
lcd.print('Grove LCD Test')
lcd.setRGB(0, 255, 0)
"
```

### 3. Test MQ-135 Sensor
```bash
# Test if Grove Base Hat ADC is working (not used for MQ-135)  
python3 -c "
from grove.adc import ADC
import time
adc = ADC()
for i in range(5):
    print(f'A0: {adc.read(0)}, A1: {adc.read(1)}')
    time.sleep(1)
"
```

## Running the System

### 1. Start Services on Raspberry Pi
```bash
# Start LCD Dashboard  
python3 ~/pi_lcd_dashboard.py

# Or run in background with nohup
nohup python3 ~/pi_lcd_dashboard.py > lcd.log 2>&1 &
```

### 2. Upload Updated ESP32 Code
Flash the updated `ASSIGNMENT_COMPLIANT.ino` to your ESP32 lighting module for enhanced MQTT support.

### 3. Start Web Dashboard
```bash
cd web
npm run dev
```

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ESP32 #1      │    │   ESP32 #2      │    │ Raspberry Pi    │
│   (Lighting)    │    │   (Climate)     │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ LDR + LED   │ │    │ │DHT22+MQ135  │ │    │ │ Grove LCD   │ │
│ └─────────────┘ │    │ │   + Fan     │ │    │ │ (I2C Only)  │ │
│       │         │    │ └─────────────┘ │    │ └─────────────┘ │
│   ┌───▼───┐     │    │   ┌───▼───┐     │    │ ┌─────────────┐ │
│   │ WiFi  │     │    │   │ WiFi  │     │    │ │ MQTT Broker │ │
│   │ MQTT  │     │    │   │ MQTT  │     │    │ │ (mosquitto) │ │
│   └───────┘     │    │   └───────┘     │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────┬───────────┼───────────────────────┘
                     │           │
                 ┌───▼───┐       │
                 │ WiFi  │       │
                 │Router │       │
                 └───┬───┘       │
                     │           │
              ┌──────▼──────┐    │
              │   Laptop    │    │
              │ ┌─────────┐ │    │
              │ │AI Camera│ │    │
              │ │Firebase │ │ ◄──┘
              │ │Web UI   │ │
              │ └─────────┘ │
              └─────────────┘
```

## LCD Display Pages

### Page 1: Lighting (3s, Blue backlight)
```
Light P:1 L:1234
LED:ON PWM:128 M
```

### Page 2: Climate (3s, Cyan backlight)  
```
T:26.5C H:65%
AUTO Fan:85
```

### Page 3: Air Quality (3s, Color by status)
```
AQ:350 Moderate
Warning
```
**Colors:**
- 🟢 Green: Good (0-300)
- 🟡 Yellow: Moderate (301-400) 
- 🔴 Red (blinking): Poor (401+)

## MQTT Topics

### Published by ESP32 Lighting
- `sensors/lighting/brightness` - LDR readings
- `sensors/lighting/led_state` - LED on/off + PWM
- `sensors/lighting/mode` - auto/manual
- `sensors/lighting/state` - Combined state for LCD

### Published by ESP32 Climate  
- `sensors/climate/env` - Temperature + humidity
- `sensors/climate/fan` - Fan state
- `sensors/climate/state` - Combined state for LCD

### Published by ESP32 Climate (includes air quality)
- `sensors/climate/state` - Combined climate + air quality data

### Control Topics
- `control/lighting/mode` - Set lighting mode
- `control/lighting/led_on` - Manual LED control
- `control/lighting/led_pwm` - Manual PWM control
- `control/climate/mode` - Set climate mode
- `control/climate/fan_on` - Manual fan control
- `control/climate/fan_pwm` - Manual fan PWM

## Troubleshooting

### Grove Base Hat Issues
```bash
# Check if Grove Base Hat is detected
ls /dev/i2c-*
# Should show /dev/i2c-1

# Check I2C devices
sudo i2cdetect -y 1
# LCD should appear at 0x3E
```

### MQ-135 Issues
```bash
# Check ADC functionality
python3 -c "
from grove.adc import ADC
adc = ADC()
for i in range(5):
    print(f'A0: {adc.read(0)}, A1: {adc.read(1)}')
"

# Check sensor placement
# - MQ-135 needs 24-48h burn-in time for accuracy
# - Test by covering sensor or using alcohol spray
```

### LCD Issues
```bash
# Check LCD connection
sudo i2cdetect -y 1

# Test LCD manually
python3 -c "
from grove.display.jhd1802 import JHD1802
lcd = JHD1802()
lcd.clear()
lcd.print('Test Message')
lcd.setRGB(255, 0, 0)  # Red backlight
"
```

### MQTT Issues
```bash
# Check MQTT broker status
sudo systemctl status mosquitto

# Test MQTT publishing
mosquitto_pub -h localhost -t test/topic -m "Hello World"

# Test MQTT subscription
mosquitto_sub -h localhost -t "sensors/#" -v
```

### Firebase Issues
- Check Firebase rules allow read/write
- Verify internet connection on both Pi and ESP32
- Check Firebase URL in all scripts matches your project

## Automatic Startup (Optional)

### Create systemd services for auto-start:

```bash
# Create service file for MQ-135 publisher
sudo tee /etc/systemd/system/mq135-publisher.service > /dev/null <<EOF
[Unit]
Description=MQ-135 Air Quality Publisher
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
ExecStart=/usr/bin/python3 /home/pi/pi_mq135_publisher.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create service file for LCD dashboard
sudo tee /etc/systemd/system/lcd-dashboard.service > /dev/null <<EOF
[Unit]
Description=LCD Dashboard
After=network.target mq135-publisher.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
ExecStart=/usr/bin/python3 /home/pi/pi_lcd_dashboard.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
sudo systemctl enable mq135-publisher.service
sudo systemctl enable lcd-dashboard.service
sudo systemctl start mq135-publisher.service
sudo systemctl start lcd-dashboard.service

# Check service status
sudo systemctl status mq135-publisher.service
sudo systemctl status lcd-dashboard.service
```

## Performance Tips

1. **Optimize MQTT QoS**: Use QoS 1 for critical data, QoS 0 for frequent updates
2. **Reduce Firebase writes**: Batch updates or use longer intervals for logging
3. **LCD refresh rate**: Keep display updates smooth but not excessive
4. **Sensor filtering**: Average multiple readings for stable values
5. **Error handling**: Implement retry logic for network operations

## Complete System Checklist

- [ ] Grove Base Hat properly connected to Raspberry Pi
- [ ] Grove 16x2 LCD connected to I2C port
- [ ] Grove MQ-135 connected to A0 port  
- [ ] Both ESP32 modules flashed with updated code
- [ ] MQTT broker running on Raspberry Pi
- [ ] Python scripts configured with correct Firebase URL
- [ ] All devices connected to same WiFi network
- [ ] Web dashboard accessible from browser
- [ ] LCD showing rotating pages correctly
- [ ] Air quality alerts working (test with 301+ values)
- [ ] MQTT topics publishing sensor data
- [ ] Firebase receiving and storing data

Your smart classroom IoT system is now complete with professional LCD display and comprehensive air quality monitoring! 🎉
