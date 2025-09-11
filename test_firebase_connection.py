#!/usr/bin/env python3
"""
Test Firebase Connection and Data
This script helps debug Firebase connectivity and data structure issues.
"""

import requests
import json
import time
from datetime import datetime

# Firebase configuration
FIREBASE_URL = "https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app"
ROOM_ID = "roomA"

def test_firebase_connection():
    """Test Firebase connection and check data structure"""
    print("🔥 Testing Firebase Connection...")
    print("=" * 50)
    print(f"🎯 Firebase URL: {FIREBASE_URL}")
    print(f"🏠 Room ID: {ROOM_ID}")
    print(f"📍 Full path: /lighting/{ROOM_ID}/state")
    print()
    
    # Test 1: Check if Firebase is accessible
    try:
        response = requests.get(f"{FIREBASE_URL}/.json", timeout=10)
        if response.status_code == 200:
            print("✅ Firebase is accessible")
        else:
            print(f"❌ Firebase returned status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Firebase connection failed: {e}")
        return False
    
    # Test 2: Check lighting data structure
    print("\n📊 Checking lighting data structure...")
    lighting_url = f"{FIREBASE_URL}/lighting/{ROOM_ID}/state.json"
    print(f"🔗 Testing URL: {lighting_url}")
    try:
        response = requests.get(lighting_url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data:
                print("✅ Lighting data found in Firebase")
                print(f"📋 Data structure:")
                print(json.dumps(data, indent=2))
                
                # Check required fields
                required_fields = ['ts', 'ldrRaw', 'led', 'mode']
                missing_fields = []
                for field in required_fields:
                    if field not in data:
                        missing_fields.append(field)
                
                if missing_fields:
                    print(f"⚠️ Missing required fields: {missing_fields}")
                else:
                    print("✅ All required fields present")
                    
                # Check AI data
                ai_fields = ['ai_presence', 'ai_timestamp']
                ai_present = all(field in data for field in ai_fields)
                if ai_present:
                    print("✅ AI data present")
                else:
                    print("⚠️ AI data missing - Camera AI may not be running")
                    
            else:
                print("❌ No lighting data found in Firebase")
                print("💡 This means ESP32 is not writing data to Firebase")
                return False
        else:
            print(f"❌ Failed to get lighting data: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error checking lighting data: {e}")
        return False
    
    # Test 3: Check data freshness
    print("\n⏰ Checking data freshness...")
    try:
        response = requests.get(f"{FIREBASE_URL}/lighting/{ROOM_ID}/state.json", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data and 'ts' in data:
                data_time = data['ts']
                current_time = int(time.time() * 1000)
                age_seconds = (current_time - data_time) / 1000
                
                print(f"📅 Data timestamp: {datetime.fromtimestamp(data_time/1000)}")
                print(f"⏱️ Data age: {age_seconds:.1f} seconds")
                
                if age_seconds < 10:
                    print("✅ Data is fresh")
                elif age_seconds < 60:
                    print("⚠️ Data is getting stale")
                else:
                    print("❌ Data is very stale - ESP32 may not be running")
            else:
                print("❌ No timestamp found in data")
    except Exception as e:
        print(f"❌ Error checking data freshness: {e}")
    
    return True

def write_test_data():
    """Write test data to Firebase for debugging"""
    print("\n🧪 Writing test data to Firebase...")
    
    epoch_time = int(time.time() * 1000)
    test_data = {
        "ts": epoch_time,
        "timestamp": epoch_time,
        "ldrRaw": 1500,
        "lightLevel": "MEDIUM",
        "led": {
            "on": False,
            "pwm": 0
        },
        "mode": "auto",
        "systemStatus": "NORMAL",
        "validData": True,
        "ai_presence": False,
        "ai_people_count": 0,
        "ai_confidence": 0.0,
        "ai_timestamp": epoch_time
    }
    
    try:
        response = requests.patch(
            f"{FIREBASE_URL}/lighting/{ROOM_ID}/state.json",
            json=test_data,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Test data written successfully")
            print("🔄 Refresh your web dashboard to see the test data")
        else:
            print(f"❌ Failed to write test data: {response.status_code}")
    except Exception as e:
        print(f"❌ Error writing test data: {e}")

if __name__ == "__main__":
    print("🏫 Smart Classroom IoT - Firebase Test")
    print("=" * 50)
    
    # Print browser test URL
    browser_url = f"{FIREBASE_URL}/lighting/{ROOM_ID}/state.json"
    print(f"🌐 Browser test URL: {browser_url}")
    print("💡 Copy this URL to your browser to test Firebase directly")
    print("=" * 50)
    
    # Test Firebase connection
    if test_firebase_connection():
        print("\n✅ Firebase connection test passed")
    else:
        print("\n❌ Firebase connection test failed")
        print("\n💡 Troubleshooting steps:")
        print("1. Check your internet connection")
        print("2. Verify Firebase URL is correct")
        print("3. Check if ESP32 is running and connected to WiFi")
        print("4. Check if ESP32 is writing data to Firebase")
    
    # Ask if user wants to write test data
    print("\n" + "=" * 50)
    response = input("Write test data to Firebase? (y/n): ").lower().strip()
    if response == 'y':
        write_test_data()
    
    print("\n👋 Test completed!")
