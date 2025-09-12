#!/usr/bin/env python3
"""
Raspberry Pi MQ-135 Air Quality Publisher
Reads MQ-135 sensor via Grove Base Hat and publishes to MQTT + Firebase

Requirements:
- Grove Base Hat for Raspberry Pi
- Grove MQ-135 Air Quality Sensor connected to A0
- pip install grove.py paho-mqtt requests

Hardware Setup:
- MQ-135 sensor → Grove Base Hat A0 port
- Pi runs MQTT broker (mosquitto)

Thresholds:
- 0-300: Good (no alert)
- 301-400: Moderate → "Warning, air quality moderate"  
- 401+: Poor → "Alert, air quality poor"
"""

import time
import json
import logging
import paho.mqtt.client as mqtt
from datetime import datetime, timezone
import requests

try:
    from grove.adc import ADC
except ImportError:
    print("ERROR: grove.py not installed. Run: pip install grove.py")
    exit(1)

# Configuration
ROOM_ID = "roomA"
FIREBASE_URL = "https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app"
MQTT_HOST = "localhost"
MQTT_PORT = 1883
READING_INTERVAL = 2  # seconds
MQ135_CHANNEL = 0     # A0 on Grove Base Hat

# Air Quality Thresholds (MQ-135 raw values)
AQ_GOOD_MAX = 300
AQ_MODERATE_MAX = 400

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def classify_air_quality(raw_value):
    """Classify air quality based on MQ-135 raw reading"""
    if raw_value >= (AQ_MODERATE_MAX + 1):  # 401+
        return "Poor", "Alert, air quality poor"
    elif raw_value >= (AQ_GOOD_MAX + 1):   # 301-400
        return "Moderate", "Warning, air quality moderate"
    else:  # 0-300
        return "Good", ""

def on_mqtt_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("✅ Connected to MQTT broker")
    else:
        logger.error(f"❌ Failed to connect to MQTT broker: {rc}")

def on_mqtt_disconnect(client, userdata, rc):
    logger.warning("⚠️ Disconnected from MQTT broker")

def main():
    logger.info("🌿 Starting MQ-135 Air Quality Publisher")
    logger.info(f"📊 Thresholds: Good(0-{AQ_GOOD_MAX}), Moderate({AQ_GOOD_MAX+1}-{AQ_MODERATE_MAX}), Poor({AQ_MODERATE_MAX+1}+)")
    
    # Initialize Grove ADC
    try:
        adc = ADC()
        logger.info("✅ Grove ADC initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Grove ADC: {e}")
        return
    
    # Initialize MQTT client
    mqttc = mqtt.Client()
    mqttc.on_connect = on_mqtt_connect
    mqttc.on_disconnect = on_mqtt_disconnect
    
    try:
        mqttc.connect(MQTT_HOST, MQTT_PORT, 60)
        mqttc.loop_start()
        logger.info("🔗 MQTT client started")
    except Exception as e:
        logger.error(f"❌ Failed to connect to MQTT: {e}")
        return
    
    logger.info("🚀 MQ-135 monitoring started...")
    
    try:
        while True:
            # Read MQ-135 sensor
            try:
                aq_raw = adc.read(MQ135_CHANNEL)
                timestamp = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
                
                # Classify air quality
                status, alert = classify_air_quality(aq_raw)
                
                # Create payload
                payload = {
                    "ts": timestamp,
                    "aqRaw": aq_raw,
                    "aqStatus": status,
                    "aqAlert": alert
                }
                
                # Publish to MQTT
                topic = "sensors/air/aq"
                mqttc.publish(topic, json.dumps(payload), qos=1, retain=True)
                
                # Mirror to Firebase for Climate UI integration
                try:
                    firebase_data = {
                        "aqRaw": aq_raw,
                        "aqStatus": status,
                        "aqAlert": alert,
                        "ts": timestamp
                    }
                    firebase_url = f"{FIREBASE_URL}/climate/{ROOM_ID}/state.json"
                    response = requests.patch(firebase_url, json=firebase_data, timeout=3)
                    
                    if response.status_code == 200:
                        firebase_status = "✅"
                    else:
                        firebase_status = f"❌({response.status_code})"
                except Exception as e:
                    firebase_status = f"❌({str(e)[:20]})"
                
                # Log status
                status_icon = "🟢" if status == "Good" else "🟡" if status == "Moderate" else "🔴"
                logger.info(f"{status_icon} AQ: {aq_raw} → {status} | MQTT: ✅ | Firebase: {firebase_status}")
                
                if alert:
                    logger.warning(f"🚨 {alert}")
                    
            except Exception as e:
                logger.error(f"❌ Sensor reading error: {e}")
            
            time.sleep(READING_INTERVAL)
            
    except KeyboardInterrupt:
        logger.info("🛑 Stopping MQ-135 publisher...")
    finally:
        mqttc.loop_stop()
        mqttc.disconnect()
        logger.info("👋 MQ-135 publisher stopped")

if __name__ == "__main__":
    main()
