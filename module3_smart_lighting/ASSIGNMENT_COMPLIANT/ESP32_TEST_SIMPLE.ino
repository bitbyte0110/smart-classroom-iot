/*
 * ESP32 Simple Test - Verify Compilation & Upload
 * Use this to test if your Arduino IDE setup is working
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Test configuration
const char* WIFI_SSID = "vivo X200 Ultra";
const char* WIFI_PASS = "12345678";
const int LDR_PIN = 34;
const int LED_PIN = 18;

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("🧪 ESP32 Simple Test Starting...");
  
  // Test GPIO
  pinMode(LDR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  ledcAttach(LED_PIN, 5000, 8);  // ESP32 Core v3.x syntax
  
  Serial.println("✅ GPIO initialized");
  
  // Test WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("🔗 Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("✅ WiFi Connected! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("❌ WiFi connection failed");
  }
  
  Serial.println("🎯 Test completed - Arduino IDE setup is working!");
}

void loop() {
  // Read LDR
  int ldrValue = analogRead(LDR_PIN);
  
  // Control LED based on light level
  int brightness = map(ldrValue, 0, 4095, 255, 0);  // Brighter LED when darker
  ledcWrite(LED_PIN, brightness);
  
  // Print status
  Serial.printf("LDR: %d/4095 | LED: %d/255 | WiFi: %s\n", 
    ldrValue, brightness, WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
  
  delay(2000);
}
