/*
 * Smart Lighting - Complete System with Firebase
 * ESP32: LDR -> GPIO34, LED -> GPIO18
 * Integrates with AI camera detection via Firebase
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>

// WiFi and Firebase credentials
#define WIFI_SSID "vivo x200 Ultra"
#define WIFI_PASS "12345678"
#define API_KEY "AIzaSyDpAjEMP0MatqhwlLY_clqtpcfGVXkpsS8"
#define DATABASE_URL "https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app/"

// Pin definitions
const int LDR_PIN = 34;      // LDR AO -> GPIO34
const int LED_PIN = 18;      // LED PWM -> GPIO18

// System constants
const int BRIGHT_THRESHOLD = 2800;
const int DARK_THRESHOLD = 3200;
const int PWM_FREQ = 5000;
const int PWM_RESOLUTION = 8;
const int MAX_PWM = 255;
const String ROOM_ID = "roomA";

// Timing constants
const unsigned long UPDATE_INTERVAL = 2000;        // 2 seconds
const unsigned long FIREBASE_READ_INTERVAL = 5000; // 5 seconds
const unsigned long LOG_INTERVAL = 30000;          // 30 seconds

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// System state
struct SystemState {
  bool ai_presence = false;
  int ai_people_count = 0;
  float ai_confidence = 0.0;
  int ldrRaw = 0;
  String mode = "auto";
  bool ledOn = false;
  int ledPwm = 0;
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
unsigned long lastLogTime = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("🏫 Smart Lighting System - Complete");
  Serial.println("===================================");
  
  // Initialize pins
  pinMode(LDR_PIN, INPUT);
  ledcAttach(LED_PIN, PWM_FREQ, PWM_RESOLUTION);
  
  // Connect to WiFi
  connectWiFi();
  
  // Initialize Firebase
  initializeFirebase();
  
  Serial.println("✅ Smart Lighting System Ready!");
  Serial.println("🎥 AI Camera + 💡 LED + 🌡️ LDR Integration Active");
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
  
  // Update Firebase with current state
  updateFirebaseState();
  
  // Log data periodically
  if (now - lastLogTime > LOG_INTERVAL) {
    logData();
    lastLogTime = now;
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
    Serial.print("\n✅ WiFi connected: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi failed - running offline");
  }
}

void initializeFirebase() {
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  Serial.println("🔥 Firebase initialized");
}

void readLocalSensors() {
  int ldrRawReading = analogRead(LDR_PIN);
  currentState.ldrRaw = filterLDR(ldrRawReading);
  currentState.timestamp = millis();
}

int filterLDR(int rawValue) {
  rawValue = constrain(rawValue, 0, 4095);
  
  ldrHistory[ldrHistoryIndex] = rawValue;
  ldrHistoryIndex = (ldrHistoryIndex + 1) % 5;
  if (ldrHistoryIndex == 0) ldrHistoryFull = true;
  
  if (ldrHistoryFull) {
    int sortedHistory[5];
    memcpy(sortedHistory, ldrHistory, sizeof(ldrHistory));
    
    // Bubble sort
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
  if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) return;
  
  String path = "/lighting/" + ROOM_ID + "/state";
  
  if (Firebase.RTDB.getJSON(&fbdo, path.c_str())) {
    FirebaseJson json = fbdo.jsonObject();
    
    // Read AI data
    bool ai_presence = false;
    int ai_people_count = 0;
    float ai_confidence = 0.0;
    
    json.get(ai_presence, "ai_presence");
    json.get(ai_people_count, "ai_people_count");
    json.get(ai_confidence, "ai_confidence");
    
    currentState.ai_presence = ai_presence;
    currentState.ai_people_count = ai_people_count;
    currentState.ai_confidence = ai_confidence;
    
    // Read mode
    String mode;
    if (json.get(mode, "mode")) {
      currentState.mode = mode;
    }
    
    // Read manual commands
    if (currentState.mode == "manual") {
      FirebaseJson ledJson;
      if (json.get(ledJson, "led")) {
        bool on = false;
        int pwm = 0;
        ledJson.get(on, "on");
        ledJson.get(pwm, "pwm");
        
        manualCommands.ledOn = on;
        manualCommands.ledPwm = constrain(pwm, 0, MAX_PWM);
      }
    }
  }
}

void updateLEDState() {
  if (currentState.mode == "manual") {
    // Manual mode
    currentState.ledOn = manualCommands.ledOn;
    currentState.ledPwm = currentState.ledOn ? manualCommands.ledPwm : 0;
  } else {
    // Auto mode: AI + LDR logic
    if (currentState.ai_presence && currentState.ldrRaw > DARK_THRESHOLD) {
      currentState.ledOn = true;
      currentState.ledPwm = mapLDRToPWM(currentState.ldrRaw);
    } else if (!currentState.ai_presence || currentState.ldrRaw < BRIGHT_THRESHOLD) {
      currentState.ledOn = false;
      currentState.ledPwm = 0;
    }
  }
  
  // Apply guardrails
  currentState.ledPwm = constrain(currentState.ledPwm, 0, MAX_PWM);
  if (!currentState.ledOn) {
    currentState.ledPwm = 0;
  }
  
  // Update physical LED
  ledcWrite(LED_PIN, currentState.ledPwm);
}

int mapLDRToPWM(int ldrValue) {
  return constrain(map(4095 - ldrValue, 0, 4095, 0, MAX_PWM), 0, MAX_PWM);
}

void updateFirebaseState() {
  if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) return;
  
  FirebaseJson json;
  json.set("ts", (unsigned long)millis());
  json.set("ldrRaw", currentState.ldrRaw);
  json.set("mode", currentState.mode);
  
  FirebaseJson ledJson;
  ledJson.set("on", currentState.ledOn);
  ledJson.set("pwm", currentState.ledPwm);
  json.set("led", ledJson);
  
  // Preserve AI data
  json.set("ai_presence", currentState.ai_presence);
  json.set("ai_people_count", currentState.ai_people_count);
  json.set("ai_confidence", currentState.ai_confidence);
  
  String path = "/lighting/" + ROOM_ID + "/state";
  Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json);
}

void logData() {
  if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) return;
  
  FirebaseJson json;
  json.set("ts", (unsigned long)currentState.timestamp);
  json.set("ai_presence", currentState.ai_presence);
  json.set("ai_people_count", currentState.ai_people_count);
  json.set("ai_confidence", currentState.ai_confidence);
  json.set("ldrRaw", currentState.ldrRaw);
  json.set("mode", currentState.mode);
  
  FirebaseJson ledJson;
  ledJson.set("on", currentState.ledOn);
  ledJson.set("pwm", currentState.ledPwm);
  json.set("led", ledJson);
  
  String path = "/lighting/" + ROOM_ID + "/logs/" + String(currentState.timestamp);
  Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json);
}

void printStatus() {
  Serial.println("📊 SMART LIGHTING STATUS:");
  Serial.println("├─ WiFi: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected"));
  Serial.println("├─ Firebase: " + String(Firebase.ready() ? "Ready" : "Not Ready"));
  Serial.println("├─ AI Presence: " + String(currentState.ai_presence ? "DETECTED" : "none"));
  Serial.println("├─ AI People: " + String(currentState.ai_people_count));
  Serial.println("├─ AI Confidence: " + String(currentState.ai_confidence, 2));
  Serial.println("├─ LDR Raw: " + String(currentState.ldrRaw) + " (0-4095)");
  
  String ldrStatus = currentState.ldrRaw < BRIGHT_THRESHOLD ? "BRIGHT" : 
                     currentState.ldrRaw > DARK_THRESHOLD ? "DARK" : "MEDIUM";
  Serial.println("├─ Light Level: " + ldrStatus);
  Serial.println("├─ Mode: " + currentState.mode);
  Serial.println("├─ LED State: " + String(currentState.ledOn ? "ON" : "OFF"));
  Serial.println("└─ LED PWM: " + String(currentState.ledPwm) + "/255");
  
  Serial.println();
  Serial.println("🧠 SMART LOGIC:");
  if (currentState.mode == "manual") {
    Serial.println("   🎛️ Manual mode - Dashboard control");
  } else if (currentState.ai_presence && currentState.ldrRaw > DARK_THRESHOLD) {
    Serial.println("   ✅ AI presence + Dark room = LED ON");
  } else if (!currentState.ai_presence) {
    Serial.println("   ⭕ No AI presence = LED OFF");
  } else if (currentState.ldrRaw < BRIGHT_THRESHOLD) {
    Serial.println("   ☀️ Room too bright = LED OFF");
  } else {
    Serial.println("   🔄 Hysteresis zone");
  }
  
  Serial.println("═══════════════════════════════════════");
}
