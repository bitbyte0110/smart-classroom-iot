#!/usr/bin/env python3
"""
Check Firebase Data - Verify if Pi bridge is writing to Firebase
"""

import requests
import json
import time

# Firebase configuration
FIREBASE_URL = "https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app"
ROOM_ID = "roomA"

def check_firebase_data():
    print("🔍 Checking Firebase Data...")
    print(f"📍 Firebase URL: {FIREBASE_URL}")
    print(f"📍 Room ID: {ROOM_ID}")
    
    try:
        # Check root data
        print("\n📊 Checking root data...")
        root_response = requests.get(f"{FIREBASE_URL}/.json", timeout=10)
        if root_response.status_code == 200:
            root_data = root_response.json()
            print(f"✅ Root data accessible: {root_data is not None}")
            if root_data:
                print(f"📋 Root keys: {list(root_data.keys())}")
            else:
                print("⚠️ Root data is empty")
        else:
            print(f"❌ Root access failed: {root_response.status_code}")
            return
        
        # Check lighting data
        print("\n💡 Checking lighting data...")
        lighting_response = requests.get(f"{FIREBASE_URL}/lighting/.json", timeout=10)
        if lighting_response.status_code == 200:
            lighting_data = lighting_response.json()
            print(f"✅ Lighting data accessible: {lighting_data is not None}")
            if lighting_data:
                print(f"📋 Lighting keys: {list(lighting_data.keys())}")
            else:
                print("⚠️ Lighting data is empty")
        else:
            print(f"❌ Lighting access failed: {lighting_response.status_code}")
        
        # Check room state
        print(f"\n🏠 Checking room {ROOM_ID} state...")
        state_response = requests.get(f"{FIREBASE_URL}/lighting/{ROOM_ID}/state.json", timeout=10)
        if state_response.status_code == 200:
            state_data = state_response.json()
            print(f"✅ Room state accessible: {state_data is not None}")
            if state_data:
                print("📊 Current room state:")
                print(json.dumps(state_data, indent=2))
            else:
                print("⚠️ Room state is empty")
        else:
            print(f"❌ Room state access failed: {state_response.status_code}")
        
        # Check room logs
        print(f"\n📝 Checking room {ROOM_ID} logs...")
        logs_response = requests.get(f"{FIREBASE_URL}/lighting/{ROOM_ID}/logs.json", timeout=10)
        if logs_response.status_code == 200:
            logs_data = logs_response.json()
            print(f"✅ Room logs accessible: {logs_data is not None}")
            if logs_data:
                log_count = len(logs_data) if isinstance(logs_data, dict) else 0
                print(f"📊 Log entries: {log_count}")
                if log_count > 0:
                    print("📋 Recent log keys:", list(logs_data.keys())[-5:])
            else:
                print("⚠️ Room logs are empty")
        else:
            print(f"❌ Room logs access failed: {logs_response.status_code}")
        
        print("\n" + "="*50)
        print("🔍 DIAGNOSIS:")
        
        if state_data:
            print("✅ Pi bridge is working - data found in Firebase")
            print("💡 Dashboard should work - check browser console for errors")
        else:
            print("❌ Pi bridge is NOT working - no data in Firebase")
            print("🔧 Solutions:")
            print("   1. Check if Pi bridge is running:")
            print("      python3 /home/pi/pi_mqtt_firebase_bridge.py --mqtt-host 192.168.202.221 --room roomA")
            print("   2. Check MQTT broker is running on Pi:")
            print("      sudo systemctl status mosquitto")
            print("   3. Test MQTT connection:")
            print("      python test_mqtt_bridge.py")
        
    except Exception as e:
        print(f"❌ Error checking Firebase: {e}")

if __name__ == "__main__":
    check_firebase_data()
