#!/usr/bin/env python3
"""
Test MQTT Bridge - Send test data to verify the Pi bridge is working
"""

import json
import time
import paho.mqtt.client as mqtt

# Configuration
MQTT_HOST = "192.168.202.221"
MQTT_PORT = 1883
ROOM_ID = "roomA"

def on_connect(client, userdata, flags, rc):
    print(f"🔗 MQTT Connected: {rc}")
    if rc == 0:
        print("✅ Connected to MQTT broker")
    else:
        print(f"❌ Failed to connect: {rc}")

def on_publish(client, userdata, mid):
    print(f"📤 Message published: {mid}")

def test_mqtt_bridge():
    print("🧪 Testing MQTT Bridge...")
    print(f"📍 MQTT Host: {MQTT_HOST}:{MQTT_PORT}")
    print(f"📍 Room ID: {ROOM_ID}")
    
    # Create MQTT client
    client = mqtt.Client(client_id="test-bridge-client")
    client.on_connect = on_connect
    client.on_publish = on_publish
    
    try:
        # Connect to MQTT broker
        print("🔌 Connecting to MQTT broker...")
        client.connect(MQTT_HOST, MQTT_PORT, 60)
        client.loop_start()
        
        # Wait for connection
        time.sleep(2)
        
        # Test 1: Send LDR data
        print("\n📊 Test 1: Sending LDR data...")
        ldr_data = {"ldrRaw": 2500}
        client.publish("sensors/lighting/brightness", json.dumps(ldr_data), qos=0, retain=True)
        time.sleep(1)
        
        # Test 2: Send LED state
        print("💡 Test 2: Sending LED state...")
        led_data = {"on": True, "pwm": 150}
        client.publish("sensors/lighting/led_state", json.dumps(led_data), qos=0, retain=True)
        time.sleep(1)
        
        # Test 3: Send mode
        print("⚙️ Test 3: Sending mode...")
        client.publish("sensors/lighting/mode", "auto", qos=0, retain=True)
        time.sleep(1)
        
        # Test 4: Send AI presence
        print("👤 Test 4: Sending AI presence...")
        client.publish("ai/presence/detection", "true", qos=0, retain=True)
        client.publish("ai/presence/count", "1", qos=0, retain=True)
        client.publish("ai/presence/confidence", "0.85", qos=0, retain=True)
        time.sleep(1)
        
        print("\n✅ All test messages sent!")
        print("🔍 Check Firebase at: https://console.firebase.google.com/project/smartclassroom-af237/database")
        print(f"📍 Path: /lighting/{ROOM_ID}/state")
        print("\n💡 Expected Firebase data:")
        expected = {
            "ldrRaw": 2500,
            "led": {"on": True, "pwm": 150},
            "mode": "auto",
            "ai_presence": True,
            "ai_people_count": 1,
            "ai_confidence": 0.85,
            "ai_timestamp": int(time.time() * 1000)
        }
        print(json.dumps(expected, indent=2))
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.loop_stop()
        client.disconnect()
        print("\n👋 Test completed")

if __name__ == "__main__":
    test_mqtt_bridge()
