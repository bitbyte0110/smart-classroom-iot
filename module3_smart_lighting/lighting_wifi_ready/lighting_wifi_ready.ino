/*
 * Smart Lighting - WiFi Ready (No Firebase library needed initially)
 * ESP32: LDR -> GPIO34, LED -> GPIO18
 * Connects to WiFi and uses HTTP requests to Firebase
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
#define WIFI_SSID "vivo x200 Ultra"
#define WIFI_PASS "12345678"

// Firebase configuration
#define FIREBASE_URL "https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app"

// Pin definitions
const int LDR_PIN = 34;      // LDR AO -> GPIO34 (ADC input-only)
const int LED_PIN = 18;      // LED PWM -> GPIO18

// System constants
const int BRIGHT_THRESHOLD = 2800;
const int DARK_THRESHOLD = 3200;
const int PWM_FREQ = 5000;
const int PWM_RESOLUTION = 8;
const int MAX_PWM = 255;
const String ROOM_ID = "roomA";

// System state
struct SystemState {
  bool ai_presence = false;      // From camera AI
  int ai_people_count = 0;       // From camera AI
  float ai_confidence = 0.0;     // From camera AI
  int ldrRaw = 0;                // From ESP32 sensor
  String mode = "auto";          // auto/manual
  bool ledOn = false;            // LED state
  int ledPwm = 0;               // LED brightness
  unsigned long timestamp = 0;
};

SystemState currentState;
SystemState manualCommands;

// LDR filtering
int ldrHistory[5] = {0};
int ldrHistoryIndex = 0;
bool ldrHistoryFull = false;

// Timing variables
unsigned long lastUpdate = 0;
unsigned long lastFirebaseRead = 0;
unsigned long lastFirebaseWrite = 0;
const unsigned long UPDATE_INTERVAL = 2000;     // 2 seconds
const unsigned long FIREBASE_READ_INTERVAL = 5000;  // 5 seconds
const unsigned long FIREBASE_WRITE_INTERVAL = 10000; // 10 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("🏫 Smart Lighting - WiFi + Firebase Ready");
  Serial.println("=========================================");
  
  // Initialize pins
  pinMode(LDR_PIN, INPUT);
  
  // Initialize PWM (compatible with ESP32 core 3.x)
  ledcAttach(LED_PIN, PWM_FREQ, PWM_RESOLUTION);
  
  // Connect to WiFi
  connectWiFi();
  
  Serial.println("✅ System ready!");
  Serial.println("🔗 Firebase integration active");
  Serial.println("🎥 Waiting for AI camera data...");
  Serial.println();
}

void loop() {
  unsigned long now = millis();
  
  // Read local sensors
  readLocalSensors();
  
  // Read AI data from Firebase
  if (now - lastFirebaseRead > FIREBASE_READ_INTERVAL) {
    readAIDataFromFirebase();
    lastFirebaseRead = now;
  }
  
  // Update LED based on AI + LDR
  updateLEDState();
  
  // Write state to Firebase
  if (now - lastFirebaseWrite > FIREBASE_WRITE_INTERVAL) {
    writeStateToFirebase();
    lastFirebaseWrite = now;
  }
  
  // Print status
  if (now - lastUpdate > UPDATE_INTERVAL) {
    printStatus();
    lastUpdate = now;
  }
  
  delay(100);
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("\n✅ WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi connection failed - running offline");
  }
}

void readLocalSensors() {
  // Read LDR with filtering
  int ldrRawReading = analogRead(LDR_PIN);
  currentState.ldrRaw = filterLDR(ldrRawReading);
  currentState.timestamp = millis();
}

int filterLDR(int rawValue) {
  // Clamp to valid range
  rawValue = constrain(rawValue, 0, 4095);
  
  // Add to history
  ldrHistory[ldrHistoryIndex] = rawValue;
  ldrHistoryIndex = (ldrHistoryIndex + 1) % 5;
  if (ldrHistoryIndex == 0) ldrHistoryFull = true;
  
  // Return median if we have enough samples
  if (ldrHistoryFull) {
    int sortedHistory[5];
    memcpy(sortedHistory, ldrHistory, sizeof(ldrHistory));
    
    // Simple bubble sort
    for (int i = 0; i < 4; i++) {
      for (int j = 0; j < 4 - i; j++) {
        if (sortedHistory[j] > sortedHistory[j + 1]) {
          int temp = sortedHistory[j];
          sortedHistory[j] = sortedHistory[j + 1];
          sortedHistory[j + 1] = temp;
        }
      }
    }
    
    return sortedHistory[2]; // Median
  }
  
  return rawValue;
}

void readAIDataFromFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(FIREBASE_URL) + "/lighting/" + ROOM_ID + "/state.json";
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);
    
    // Read AI data
    if (doc.containsKey("ai_presence")) {
      currentState.ai_presence = doc["ai_presence"];
    }
    if (doc.containsKey("ai_people_count")) {
      currentState.ai_people_count = doc["ai_people_count"];
    }
    if (doc.containsKey("ai_confidence")) {
      currentState.ai_confidence = doc["ai_confidence"];
    }
    if (doc.containsKey("mode")) {
      currentState.mode = doc["mode"].as<String>();
    }
    
    // Read manual commands if in manual mode
    if (currentState.mode == "manual" && doc.containsKey("led")) {
      JsonObject led = doc["led"];
      if (led.containsKey("on")) {
        manualCommands.ledOn = led["on"];
      }
      if (led.containsKey("pwm")) {
        manualCommands.ledPwm = led["pwm"];
      }
    }
  }
  
  http.end();
}

void updateLEDState() {
  if (currentState.mode == "manual") {
    // Manual mode
    currentState.ledOn = manualCommands.ledOn;
    currentState.ledPwm = currentState.ledOn ? manualCommands.ledPwm : 0;
  } else {
    // Auto mode: AI presence + LDR logic
    if (currentState.ai_presence && currentState.ldrRaw > DARK_THRESHOLD) {
      // AI detects person + Dark room → LED ON
      currentState.ledOn = true;
      currentState.ledPwm = mapLDRToPWM(currentState.ldrRaw);
    } else if (!currentState.ai_presence || currentState.ldrRaw < BRIGHT_THRESHOLD) {
      // No person OR bright room → LED OFF
      currentState.ledOn = false;
      currentState.ledPwm = 0;
    }
    // Between thresholds → maintain current state (hysteresis)
  }
  
  // Apply PWM guardrails
  currentState.ledPwm = constrain(currentState.ledPwm, 0, MAX_PWM);
  if (!currentState.ledOn) {
    currentState.ledPwm = 0;
  }
  
  // Update actual LED
  ledcWrite(LED_PIN, currentState.ledPwm);
}

int mapLDRToPWM(int ldrValue) {
  // Map LDR reading to PWM (darker = brighter)
  return constrain(map(4095 - ldrValue, 0, 4095, 0, MAX_PWM), 0, MAX_PWM);
}

void writeStateToFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(FIREBASE_URL) + "/lighting/" + ROOM_ID + "/state.json";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["ts"] = millis();
  doc["ldrRaw"] = currentState.ldrRaw;
  doc["mode"] = currentState.mode;
  doc["led"]["on"] = currentState.ledOn;
  doc["led"]["pwm"] = currentState.ledPwm;
  
  // Keep AI data that was read from Firebase
  doc["ai_presence"] = currentState.ai_presence;
  doc["ai_people_count"] = currentState.ai_people_count;
  doc["ai_confidence"] = currentState.ai_confidence;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpCode = http.PATCH(jsonString);
  
  if (httpCode == HTTP_CODE_OK) {
    Serial.println("🔗 Firebase updated successfully");
  } else {
    Serial.printf("❌ Firebase update failed: %d\n", httpCode);
  }
  
  http.end();
}

void printStatus() {
  Serial.println("📊 SMART LIGHTING STATUS:");
  Serial.println("├─ WiFi: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected"));
  Serial.println("├─ AI Presence: " + String(currentState.ai_presence ? "DETECTED" : "none"));
  Serial.println("├─ AI People: " + String(currentState.ai_people_count));
  Serial.println("├─ AI Confidence: " + String(currentState.ai_confidence, 2));
  Serial.println("├─ LDR Raw: " + String(currentState.ldrRaw) + " (0-4095)");
  
  // LDR interpretation
  String ldrStatus;
  if (currentState.ldrRaw < BRIGHT_THRESHOLD) {
    ldrStatus = "BRIGHT";
  } else if (currentState.ldrRaw > DARK_THRESHOLD) {
    ldrStatus = "DARK";
  } else {
    ldrStatus = "MEDIUM";
  }
  Serial.println("├─ Light Level: " + ldrStatus);
  Serial.println("├─ Mode: " + currentState.mode);
  Serial.println("├─ LED State: " + String(currentState.ledOn ? "ON" : "OFF"));
  Serial.println("└─ LED PWM: " + String(currentState.ledPwm) + "/255");
  
  // Smart logic explanation
  Serial.println();
  Serial.println("🧠 SMART LOGIC:");
  if (currentState.mode == "manual") {
    Serial.println("   🎛️ Manual mode - Dashboard control active");
  } else if (currentState.ai_presence && currentState.ldrRaw > DARK_THRESHOLD) {
    Serial.println("   ✅ AI + Dark room = LED ON");
  } else if (!currentState.ai_presence) {
    Serial.println("   ⭕ No AI presence = LED OFF");
  } else if (currentState.ldrRaw < BRIGHT_THRESHOLD) {
    Serial.println("   ☀️ Room too bright = LED OFF");
  } else {
    Serial.println("   🔄 Hysteresis zone = Maintain state");
  }
  
  Serial.println("═══════════════════════════════════════");
}
