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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mqtt-host', default='192.168.0.102')
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
    lock = threading.Lock()

    def patch_state():
        with lock:
            payload = state.copy()
        url = f"{args.firebase_url}/lighting/{args.room}/state.json"
        try:
            requests.patch(url, json=payload, timeout=5)
        except Exception:
            pass

    def on_message(client, userdata, msg):
        nonlocal state
        topic = msg.topic
        data = msg.payload.decode('utf-8', errors='ignore')
        try:
            if topic == 'sensors/lighting/brightness':
                try:
                    obj = json.loads(data)
                    val = obj.get('ldrRaw')
                except Exception:
                    val = int(data)
                with lock:
                    state['ldrRaw'] = int(val)
            elif topic == 'sensors/lighting/led_state':
                obj = json.loads(data)
                with lock:
                    state['led'] = {
                        'on': bool(obj.get('on', False)),
                        'pwm': int(obj.get('pwm', 0))
                    }
            elif topic == 'sensors/lighting/mode':
                with lock:
                    state['mode'] = 'manual' if data.strip() == 'manual' else 'auto'
            elif topic == 'ai/presence/detection':
                with lock:
                    state['ai_presence'] = (data.strip().lower() == 'true')
                    state['ai_timestamp'] = int(time.time() * 1000)
            elif topic == 'ai/presence/count':
                with lock:
                    state['ai_people_count'] = int(float(data))
                    state['ai_timestamp'] = int(time.time() * 1000)
            elif topic == 'ai/presence/confidence':
                with lock:
                    state['ai_confidence'] = float(data)
                    state['ai_timestamp'] = int(time.time() * 1000)
        except Exception:
            return

        patch_state()

    client = mqtt.Client(client_id=f"pi-bridge-{args.room}")
    client.on_message = on_message
    client.connect(args.mqtt_host, args.mqtt_port, 60)
    client.subscribe([
        ('sensors/lighting/brightness', 0),
        ('sensors/lighting/led_state', 0),
        ('sensors/lighting/mode', 0),
        ('ai/presence/detection', 0),
        ('ai/presence/count', 0),
        ('ai/presence/confidence', 0),
    ])
    print(f"Bridge running. MQTT {args.mqtt_host}:{args.mqtt_port} → Firebase {args.firebase_url}/lighting/{args.room}/state")
    client.loop_forever()


if __name__ == '__main__':
    main()


