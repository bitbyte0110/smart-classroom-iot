#include <WiFi.h>

// ==== WIFI ====  <<-- change these
#define WIFI_SSID "X_X"
#define WIFI_PASS "Sanjit02"

// ==== PINS ====
const int PIR_PIN = 27;   // PIR OUT -> GPIO27

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() - start > 20000) {
      Serial.println("\nRetrying WiFi...");
      WiFi.disconnect(true);
      WiFi.begin(WIFI_SSID, WIFI_PASS);
      start = millis();
    }
  }
  Serial.print("\nWiFi connected. IP: ");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  Serial.println("PIR WiFi test started...");

  connectWiFi();  // connect to Wi-Fi first
}

void loop() {
  int v = digitalRead(PIR_PIN);
  if (v == HIGH) {
    Serial.println("MOTION DETECTED");
  } else {
    Serial.println("no motion");
  }
  delay(1000);
}