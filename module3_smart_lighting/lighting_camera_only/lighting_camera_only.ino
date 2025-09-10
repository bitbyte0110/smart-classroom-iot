/*
 * Smart Lighting - Camera + LDR Only (No PIR needed)
 * ESP32: LDR -> GPIO34, LED -> GPIO18
 * Presence detection via laptop camera AI
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include <time.h>

// Firebase and WiFi credentials
#define WIFI_SSID "vivo x200 Ultra"
#define WIFI_PASS "12345678"
#define API_KEY "AIzaSyDpAjEMP0MatqhwlLY_clqtpcfGVXkpsS8"
#define DATABASE_URL "https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app/"

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

// Timing constants
const unsigned long LOG_INTERVAL = 30000;        // 30 seconds
const unsigned long STATE_UPDATE_INTERVAL = 2000; // 2 seconds

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

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
unsigned long lastLogTime = 0;
unsigned long lastStateUpdate = 0;
unsigned long lastFirebaseRead = 0;
const unsigned long FIREBASE_READ_INTERVAL = 3000; // Read AI data every 3 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("🏫 Smart Lighting - Camera + LDR System");
  Serial.println("========================================");
  
  // Initialize pins
  pinMode(LDR_PIN, INPUT);
  
  // Initialize PWM (compatible with ESP32 core 3.x)
  ledcAttach(LED_PIN, PWM_FREQ, PWM_RESOLUTION);
  
  // Initialize time
  configTime(0, 0, "pool.ntp.org");
  
  // Initialize WiFi
  connectWiFi();
  
  // Initialize Firebase
  initializeFirebase();
  
  Serial.println("✅ System ready!");
  Serial.println("🎥 Waiting for camera AI data...");
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
  
  // Check for manual commands
  checkManualCommands();
  
  // Update LED state based on AI + LDR
  updateLEDState();
  
  // Update Firebase state
  if (now - lastStateUpdate > STATE_UPDATE_INTERVAL) {
    updateFirebaseState();
    lastStateUpdate = now;
  }
  
  // Log data
  if (now - lastLogTime > LOG_INTERVAL) {
    logData();
    lastLogTime = now;
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

void initializeFirebase() {
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  Serial.println("🔥 Firebase initialized");
}

void readLocalSensors() {
  // Read LDR with filtering
  int ldrRaw = analogRead(LDR_PIN);
  currentState.ldrRaw = filterLDR(ldrRaw);
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
  if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) return;
  
  String path = "/lighting/" + ROOM_ID + "/state";
  
  if (Firebase.RTDB.getJSON(&fbdo, path.c_str())) {
    FirebaseJson json = fbdo.jsonObject();
    
    // Read AI detection data
    bool ai_presence = false;
    int ai_people_count = 0;
    float ai_confidence = 0.0;
    
    json.get(ai_presence, "ai_presence");
    json.get(ai_people_count, "ai_people_count");
    json.get(ai_confidence, "ai_confidence");
    
    currentState.ai_presence = ai_presence;
    currentState.ai_people_count = ai_people_count;
    currentState.ai_confidence = ai_confidence;
  }
}

void checkManualCommands() {
  if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) return;
  
  String path = "/lighting/" + ROOM_ID + "/state";
  
  if (Firebase.RTDB.getJSON(&fbdo, path.c_str())) {
    FirebaseJson json = fbdo.jsonObject();
    
    String mode;
    if (json.get(mode, "mode")) {
      currentState.mode = mode;
    }
    
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

void updateFirebaseState() {
  if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) return;
  
  FirebaseJson json;
  json.set("ts", (unsigned long)(millis()));
  json.set("ldrRaw", currentState.ldrRaw);
  json.set("mode", currentState.mode);
  
  FirebaseJson ledJson;
  ledJson.set("on", currentState.ledOn);
  ledJson.set("pwm", currentState.ledPwm);
  json.set("led", ledJson);
  
  // Keep AI data that was read from Firebase
  json.set("ai_presence", currentState.ai_presence);
  json.set("ai_people_count", currentState.ai_people_count);
  json.set("ai_confidence", currentState.ai_confidence);
  
  String path = "/lighting/" + ROOM_ID + "/state";
  Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json);
}

void logData() {
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
  
  // Print status to serial
  Serial.printf("📊 [%02d:%02d] AI:%s(%d) LDR:%d LED:%s(%d) Mode:%s\n",
    (int)(millis() / 60000) % 60, (int)(millis() / 1000) % 60,
    currentState.ai_presence ? "YES" : "no", currentState.ai_people_count,
    currentState.ldrRaw, 
    currentState.ledOn ? "ON" : "OFF", currentState.ledPwm, 
    currentState.mode.c_str());
}
