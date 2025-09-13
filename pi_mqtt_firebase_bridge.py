"""
MQTT ↔ Firebase Bridge (run on Raspberry Pi)

Subscribes to MQTT topics and patches merged state to Firebase:
  - sensors/lighting/brightness  (json { ldrRaw })
  - sensors/lighting/led_state   (json { on, pwm })
  - sensors/lighting/mode        (string)
  - ai/presence/detection        ("true"/"false")
  - ai/presence/count            (int)
  - ai/presence/confidence       (float)

Usage:
  python3 pi_mqtt_firebase_bridge.py --mqtt-host 192.168.0.102 --room roomA
"""

import json
import time
import argparse
import threading
import requests
import paho.mqtt.client as mqtt
from firebase_admin import credentials, db, initialize_app
import firebase_admin


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mqtt-host', default='192.168.202.221')
    parser.add_argument('--mqtt-port', type=int, default=1883)
    parser.add_argument('--firebase-url', default='https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app')
    parser.add_argument('--room', default='roomA')
    args = parser.parse_args()

    state = {
        'ldrRaw': None,
        'led': {'on': False, 'pwm': 0},
        'mode': 'auto',
        'ai_presence': False,
        'ai_people_count': 0,
        'ai_confidence': 0.0,
        'ai_timestamp': 0
    }
    
    climate_state = {
        'tempC': None,
        'humidity': None,
        'aqRaw': None,
        'aqStatus': 'Good',
        'fan': {'on': False, 'pwm': 0},
        'comfortBand': 'Low',
        'mode': 'auto',
        'presence': False
    }
    lock = threading.Lock()

    def patch_state():
        with lock:
            payload = state.copy()
        url = f"{args.firebase_url}/lighting/{args.room}/state.json"
        try:
            requests.patch(url, json=payload, timeout=5)
        except Exception:
            pass
    
    def patch_climate_state():
        with lock:
            payload = climate_state.copy()
        url = f"{args.firebase_url}/climate/{args.room}/state.json"
        try:
            requests.patch(url, json=payload, timeout=5)
        except Exception:
            pass

    def on_message(client, userdata, msg):
        nonlocal state, climate_state
        topic = msg.topic
        data = msg.payload.decode('utf-8', errors='ignore')
        try:
            # Lighting topics
            if topic == 'sensors/lighting/brightness':
                try:
                    obj = json.loads(data)
                    val = obj.get('ldrRaw')
                except Exception:
                    val = int(data)
                with lock:
                    state['ldrRaw'] = int(val)
                patch_state()
            elif topic == 'sensors/lighting/led_state':
                obj = json.loads(data)
                with lock:
                    state['led'] = {
                        'on': bool(obj.get('on', False)),
                        'pwm': int(obj.get('pwm', 0))
                    }
                patch_state()
            elif topic == 'sensors/lighting/mode':
                with lock:
                    state['mode'] = 'manual' if data.strip() == 'manual' else 'auto'
                patch_state()
            
            # Climate topics
            elif topic == 'sensors/climate/temperature':
                obj = json.loads(data)
                with lock:
                    climate_state['tempC'] = float(obj.get('c', 0))
                patch_climate_state()
            elif topic == 'sensors/climate/humidity':
                obj = json.loads(data)
                with lock:
                    climate_state['humidity'] = float(obj.get('rh', 0))
                patch_climate_state()
            elif topic == 'sensors/climate/fan_state':
                obj = json.loads(data)
                with lock:
                    climate_state['fan'] = {
                        'on': bool(obj.get('on', False)),
                        'pwm': int(obj.get('pwm', 0))
                    }
                    climate_state['mode'] = obj.get('mode', 'auto')
                    climate_state['comfortBand'] = obj.get('band', 'Low')
                patch_climate_state()
            
            # Air quality topics
            elif topic == 'sensors/air/quality_raw':
                obj = json.loads(data)
                with lock:
                    climate_state['aqRaw'] = int(obj.get('mq135', 0))
                patch_climate_state()
            elif topic == 'sensors/air/quality_status':
                obj = json.loads(data)
                with lock:
                    climate_state['aqStatus'] = obj.get('status', 'Good')
                patch_climate_state()
            
            # AI presence (affects both lighting and climate)
            elif topic == 'ai/presence/detection':
                is_present = (data.strip().lower() == 'true')
                timestamp = int(time.time() * 1000)
                with lock:
                    # Update lighting state
                    state['ai_presence'] = is_present
                    state['ai_timestamp'] = timestamp
                    # Update climate state
                    climate_state['presence'] = is_present
                patch_state()
                patch_climate_state()
            elif topic == 'ai/presence/count':
                with lock:
                    state['ai_people_count'] = int(float(data))
                    state['ai_timestamp'] = int(time.time() * 1000)
                patch_state()
            elif topic == 'ai/presence/confidence':
                with lock:
                    state['ai_confidence'] = float(data)
                    state['ai_timestamp'] = int(time.time() * 1000)
                patch_state()
        except Exception:
            return

    # Firebase Admin SDK removed to prevent command conflicts
    # Commands flow: Web Dashboard → Firebase → ESP32 (direct)
    # Sensor data flows: ESP32 → MQTT → Pi Bridge → Firebase → Web Dashboard
    print("📡 Bridge running in MQTT→Firebase mode only (no command conflicts)")

    client = mqtt.Client(client_id=f"pi-bridge-{args.room}")
    client.on_message = on_message
    client.connect(args.mqtt_host, args.mqtt_port, 60)
    client.subscribe([
        ('sensors/lighting/brightness', 0),
        ('sensors/lighting/led_state', 0),
        ('sensors/lighting/mode', 0),
        ('sensors/climate/temperature', 0),
        ('sensors/climate/humidity', 0),
        ('sensors/climate/fan_state', 0),
        ('sensors/air/quality_raw', 0),
        ('sensors/air/quality_status', 0),
        ('ai/presence/detection', 0),
        ('ai/presence/count', 0),
        ('ai/presence/confidence', 0),
    ])
    print(f"📡 MQTT→Firebase Bridge running:")
    print(f"   MQTT {args.mqtt_host}:{args.mqtt_port} → Firebase {args.firebase_url}/lighting+climate/{args.room}/state")
    print(f"   Commands: Web Dashboard → Firebase → ESP32 (direct)")
    print(f"   Sensors: ESP32 → MQTT → Firebase → Web Dashboard")
    print(f"   Display: ESP32 → MQTT → Pi LCD")
    client.loop_forever()


if __name__ == '__main__':
    main()


