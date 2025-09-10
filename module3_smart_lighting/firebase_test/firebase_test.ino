/*
 * Firebase Library Test - Minimal version to verify installation
 * This should compile without errors if Firebase library is properly installed
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// Test credentials
#define WIFI_SSID "vivo x200 Ultra"
#define WIFI_PASS "12345678"
#define API_KEY "AIzaSyDpAjEMP0MatqhwlLY_clqtpcfGVXkpsS8"
#define DATABASE_URL "https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app/"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

void setup() {
  Serial.begin(115200);
  Serial.println("🔥 Firebase Library Test");
  Serial.println("========================");
  
  // Test WiFi connection
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.print("\n✅ WiFi connected: ");
  Serial.println(WiFi.localIP());
  
  // Test Firebase initialization
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  Serial.println("✅ Firebase library test PASSED!");
  Serial.println("🎯 Ready to upload full smart lighting code");
}

void loop() {
  // Test basic Firebase operation
  if (Firebase.ready()) {
    Serial.println("🔗 Firebase connection: OK");
    
    // Simple test write
    if (Firebase.RTDB.setString(&fbdo, "/test/message", "Hello from ESP32!")) {
      Serial.println("✅ Firebase write test: PASSED");
    } else {
      Serial.println("❌ Firebase write test: FAILED");
      Serial.println("Reason: " + fbdo.errorReason());
    }
  } else {
    Serial.println("⏳ Firebase not ready...");
  }
  
  delay(10000); // Test every 10 seconds
}
