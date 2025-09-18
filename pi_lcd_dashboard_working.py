#!/usr/bin/env python3
"""
Raspberry Pi LCD Dashboard for Smart Classroom IoT
Displays rotating pages with lighting, climate, and air quality data

Requirements:
- Grove Base Hat for Raspberry Pi
- Grove 16x2 LCD connected to I2C
- GrovePi library installed: sudo python3 setup.py install in GrovePi/Software/Python
- pip install paho-mqtt

Hardware Setup:
- Grove 16x2 LCD → Grove Base Hat I2C port
- Pi runs MQTT broker receiving data from ESP32 modules

Display Pages (3 seconds each):
1. Lighting: Presence, LDR, LED state
2. Climate: Temperature, Humidity, Fan
3. Air Quality: MQ-135 reading, status, alerts
"""

import sys
import os
import time
import json
import logging
import paho.mqtt.client as mqtt
from datetime import datetime

# Add the GrovePi directory to Python path
grovepi_path = "/home/pi/GrovePi/Software/Python"
if grovepi_path not in sys.path:
    sys.path.insert(0, grovepi_path)

# Also add current directory if we're in the GrovePi directory
current_dir = os.getcwd()
if "GrovePi/Software/Python" in current_dir and current_dir not in sys.path:
    sys.path.insert(0, current_dir)

try:
    # GrovePi LCD library (works with both RGB and standard LCD)
    from grove_rgb_lcd.grove_rgb_lcd import setText, setRGB
    print("✅ GrovePi library imported successfully")
except ImportError as e:
    print(f"❌ ERROR: GrovePi library not found! {e}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Python path: {sys.path}")
    print("Make sure you're in the GrovePi/Software/Python directory")
    exit(1)

# Configuration
MQTT_HOST = "localhost"
MQTT_PORT = 1883
PAGE_DURATION = 3  # seconds per page
TOTAL_PAGES = 3  # lighting, climate, air quality

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SmartClassroomLCD:
    def __init__(self):
        self.current_page = 0
        self.last_page_change = 0
        
        # System state from MQTT (ESP32 modules + AI detection)
        self.state = {
            "lighting": {
                "presence": 0,
                "ldrRaw": 0,
                "mode": "auto",
                "led": {"on": False, "pwm": 0}
            },
            "climate": {
                "tempC": 0.0,
                "humidity": 0.0,
                "mode": "auto",
                "fan": {"on": False, "pwm": 0},
                "aqRaw": 0,
                "aqStatus": "Good", 
                "aqAlert": ""
            },
            "ai": {
                "presence": False,
                "people_count": 0,
                "confidence": 0.0
            }
        }
        
        # MQTT client
        self.mqtt_client = mqtt.Client()
        self.mqtt_client.on_connect = self.on_mqtt_connect
        self.mqtt_client.on_message = self.on_mqtt_message
        
    def initialize(self):
        """Initialize LCD and MQTT connection"""
        try:
            # Show startup message
            self.lcd_write("Smart Classroom", "IoT Dashboard...")
            self.set_lcd_color("blue")
            time.sleep(2)
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize LCD: {e}")
            return False
            
        try:
            # Connect to MQTT
            self.mqtt_client.connect(MQTT_HOST, MQTT_PORT, 60)
            self.mqtt_client.loop_start()
            logger.info("✅ MQTT client connected")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to MQTT: {e}")
            return False
    
    def on_mqtt_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("📡 Connected to MQTT broker")
            # Subscribe to ESP32 sensor topics and AI detection topics
            topics = [
                ("sensors/lighting/state", 1),
                ("sensors/climate/state", 1),
                ("ai/presence/detection", 1),
                ("ai/presence/count", 1),
                ("ai/presence/confidence", 1)
            ]
            for topic, qos in topics:
                client.subscribe(topic, qos)
            logger.info(f"📡 Subscribed to {len(topics)} topics")
        else:
            logger.error(f"❌ MQTT connection failed: {rc}")
    
    def on_mqtt_message(self, client, userdata, msg):
        """Handle incoming MQTT messages"""
        try:
            topic = msg.topic
            data = msg.payload.decode()
            
            if topic == "sensors/lighting/state":
                data = json.loads(data)
                self.state["lighting"].update({
                    "presence": data.get("presence", 0),
                    "ldrRaw": data.get("ldrRaw", 0),
                    "mode": data.get("mode", "auto"),
                    "led": data.get("led", self.state["lighting"]["led"])
                })
                
            elif topic == "sensors/climate/state":
                data = json.loads(data)
                self.state["climate"].update({
                    "tempC": data.get("tempC", 0),
                    "humidity": data.get("humidity", 0),
                    "mode": data.get("mode", "auto"),
                    "fan": data.get("fan", self.state["climate"]["fan"]),
                    "aqRaw": data.get("aqRaw", 0),
                    "aqStatus": data.get("aqStatus", "Good"),
                    "aqAlert": data.get("aqAlert", "")
                })
                
            # AI detection topics (string values, not JSON)
            elif topic == "ai/presence/detection":
                self.state["ai"]["presence"] = data.lower() == "true"
                
            elif topic == "ai/presence/count":
                try:
                    self.state["ai"]["people_count"] = int(data)
                except ValueError:
                    self.state["ai"]["people_count"] = 0
                    
            elif topic == "ai/presence/confidence":
                try:
                    self.state["ai"]["confidence"] = float(data)
                except ValueError:
                    self.state["ai"]["confidence"] = 0.0
                
        except Exception as e:
            logger.error(f"❌ Error processing MQTT message: {e}")
    
    def set_lcd_color(self, color_name):
        """Set LCD backlight color (standard LCD has fixed blue backlight)"""
        try:
            if color_name == "black":
                setRGB(0, 0, 0)
            else:
                setRGB(0, 128, 255)
        except:
            pass

    def lcd_write(self, line1: str, line2: str):
        """Write two lines to the LCD safely within 16 chars each"""
        # Ensure lines are exactly 16 characters and stable
        line1 = line1[:16].ljust(16)
        line2 = line2[:16].ljust(16)
        
        # Write to LCD in one operation to prevent flickering
        try:
            setText(f"{line1}\n{line2}")
        except Exception as e:
            # If LCD write fails, don't crash the program
            logger.error(f"LCD write error: {e}")
    
    def display_page_lighting(self):
        """Display lighting information page with AI people count"""
        lighting = self.state["lighting"]
        ai = self.state["ai"]
        
        # Show AI people count instead of ESP32 presence
        people_count = ai['people_count']
        presence_status = "DET" if ai['presence'] else "None"
        
        line1 = f"P:{people_count} LDR:{lighting['ldrRaw']}"
        
        led_state = "ON" if lighting['led']['on'] else "OFF"
        pwm = lighting['led']['pwm']
        mode_indicator = " M" if lighting['mode'] == 'manual' else ""
        
        line2 = f"LED:{led_state} PWM:{pwm}{mode_indicator}"
        if len(line2) > 16:
            line2 = f"LED:{led_state} {pwm}{mode_indicator}"
        
        # Write to LCD once and set color once
        self.lcd_write(line1, line2)
        self.set_lcd_color("blue")
    
    def display_page_climate(self):
        """Display climate information page"""
        climate = self.state["climate"]
        
        temp = climate['tempC']
        humidity = climate['humidity']
        line1 = f"T:{temp:.1f}C H:{humidity:.0f}%"
        
        mode = climate['mode'].upper()[:4]
        fan_pwm = climate['fan']['pwm']
        line2 = f"{mode} Fan:{fan_pwm}"
        
        self.lcd_write(line1, line2)
        self.set_lcd_color("cyan")
    
    def display_page_air_quality(self):
        """Display air quality information page"""
        climate = self.state["climate"]
        aq_raw = climate['aqRaw']
        aq_status = climate['aqStatus']
        
        line1 = f"AQ:{aq_raw} {aq_status}"
        
        if aq_status == "Poor":
            line2 = "ALERT"
            color = "red"
        elif aq_status == "Moderate":
            line2 = "Warning"
            color = "yellow"
        else:
            line2 = "OK"
            color = "green"
        
        # Always display data without blinking
        self.lcd_write(line1, line2)
        self.set_lcd_color(color)
    
    def update_display(self):
        """Update the LCD display with rotating pages"""
        current_time = time.time()
        
        # Only update LCD when page changes, not every loop iteration
        if current_time - self.last_page_change >= PAGE_DURATION:
            self.current_page = (self.current_page + 1) % TOTAL_PAGES
            self.last_page_change = current_time
            
            # Only write to LCD when page actually changes
            try:
                if self.current_page == 0:
                    self.display_page_lighting()
                elif self.current_page == 1:
                    self.display_page_climate()
                elif self.current_page == 2:
                    self.display_page_air_quality()
                    
            except Exception as e:
                logger.error(f"❌ Display error: {e}")
                # Show error on LCD instead of crashing
                self.lcd_write("Display Error", "Check Logs")
    
    def run(self):
        """Main display loop"""
        logger.info("🚀 Starting LCD dashboard...")
        
        if not self.initialize():
            logger.error("❌ Failed to initialize system")
            return
        
        try:
            self.last_page_change = time.time()
            
            while True:
                self.update_display()
                time.sleep(1.0)  # Check every second, LCD only updates every 3 seconds
                
        except KeyboardInterrupt:
            logger.info("🛑 Stopping LCD dashboard...")
        except Exception as e:
            logger.error(f"❌ Runtime error: {e}")
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Clean up resources"""
        try:
            self.lcd_write("System Stopped", "Goodbye!")
            self.set_lcd_color("blue")
                
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
            logger.info("👋 LCD dashboard stopped")
            
        except Exception as e:
            logger.error(f"❌ Cleanup error: {e}")

def main():
    dashboard = SmartClassroomLCD()
    dashboard.run()

if __name__ == "__main__":
    main()
