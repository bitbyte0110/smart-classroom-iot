/*
 * Smart Classroom Lighting Control System
 * Module 3 - Complete Implementation with Firebase Integration
 * 
 * Features:
 * - PIR motion detection with debounce
 * - LDR brightness sensing with median filter
 * - PWM LED control with hysteresis
 * - Firebase Realtime Database integration
 * - Offline tolerance with ring buffer
 * - Manual/Auto mode switching
 * - Sensor error handling
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include <time.h>

// Firebase and WiFi credentials - UPDATE THESE WITH YOUR ACTUAL VALUES
#define WIFI_SSID "vivo x200 Ultra"          // Replace with your WiFi network name
#define WIFI_PASS "12345678"       
#define API_KEY "AIzaSyDpAjEMP0MatqhwlLY_clqtpcfGVXkpsS8"
#define DATABASE_URL "https://smartclassroom-af237-default-rtdb.firebaseio.com/"

// Pin definitions
const int PIR_PIN = 27;      // PIR OUT -> GPIO27
const int LDR_PIN = 34;      // LDR AO -> GPIO34 (ADC input-only)
const int LED_PIN = 18;      // LED PWM -> GPIO18
const int LED_CHANNEL = 0;   // PWM channel

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
const unsigned long PIR_STABLE_TIME = 200;       // 200ms
const unsigned long PIR_COOLDOWN = 2000;         // 2 seconds
const unsigned long SENSOR_CHECK_INTERVAL = 600000; // 10 minutes

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// System state
struct SystemState {
  bool presence = false;
  int ldrRaw = 0;
  String mode = "auto";
  bool ledOn = false;
  int ledPwm = 0;
  String sensorError = "";
  unsigned long timestamp = 0;
};

SystemState currentState;
SystemState manualCommands;

// Sensor filtering and debounce
int ldrHistory[5] = {0};
int ldrHistoryIndex = 0;
bool ldrHistoryFull = false;

unsigned long pirLastHigh = 0;
unsigned long pirCooldownUntil = 0;
bool pirStableHigh = false;

// Offline handling
struct LogEntry {
  SystemState state;
  bool sent = false;
};

const int RING_BUFFER_SIZE = 200;
LogEntry logBuffer[RING_BUFFER_SIZE];
int logWriteIndex = 0;
int logReadIndex = 0;
int logCount = 0;

// Timing variables
unsigned long lastLogTime = 0;
unsigned long lastStateUpdate = 0;
unsigned long lastSensorCheck = 0;
unsigned long lastConnectionAttempt = 0;
unsigned long connectionRetryDelay = 1000;

// Sensor error detection
int lastLdrValue = -1;
unsigned long ldrUnchangedSince = 0;
bool pirStuckHigh = false;
unsigned long pirHighSince = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("🏫 Smart Lighting System Starting...");
  
  // Initialize pins
  pinMode(PIR_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  
  // Initialize PWM
  ledcSetup(LED_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(LED_PIN, LED_CHANNEL);
  
  // Initialize time
  configTime(0, 0, "pool.ntp.org");
  
  // Initialize WiFi
  connectWiFi();
  
  // Initialize Firebase
  initializeFirebase();
  
  Serial.println("✅ System ready!");
}

void loop() {
  unsigned long now = millis();
  
  // Read sensors
  readSensors();
  
  // Check for sensor errors
  if (now - lastSensorCheck > SENSOR_CHECK_INTERVAL) {
    checkSensorHealth();
    lastSensorCheck = now;
  }
  
  // Check for manual commands
  checkFirebaseCommands();
  
  // Update LED state
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
  
  // Process offline queue
  processOfflineQueue();
  
  delay(100); // Small delay for stability
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
  config.token_status_callback = tokenStatusCallback;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  Serial.println("🔥 Firebase initialized");
}

void readSensors() {
  // Read PIR with debounce
  bool pirRaw = digitalRead(PIR_PIN);
  currentState.presence = debouncePIR(pirRaw);
  
  // Read LDR with filtering
  int ldrRaw = analogRead(LDR_PIN);
  currentState.ldrRaw = filterLDR(ldrRaw);
  
  currentState.timestamp = millis();
}

bool debouncePIR(bool currentReading) {
  unsigned long now = millis();
  
  if (currentReading && !pirStableHigh) {
    if (pirLastHigh == 0) {
      pirLastHigh = now;
    } else if (now - pirLastHigh >= PIR_STABLE_TIME) {
      pirStableHigh = true;
      pirCooldownUntil = now + PIR_COOLDOWN;
      pirHighSince = now;
    }
  } else if (!currentReading) {
    pirLastHigh = 0;
    if (now > pirCooldownUntil) {
      pirStableHigh = false;
    }
  }
  
  // Check for stuck PIR
  if (pirStableHigh && now - pirHighSince > 300000) { // 5 minutes
    pirStuckHigh = true;
  }
  
  return pirStableHigh && now > pirCooldownUntil;
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

void checkSensorHealth() {
  unsigned long now = millis();
  
  // Check LDR for stuck readings
  if (lastLdrValue == -1) {
    lastLdrValue = currentState.ldrRaw;
    ldrUnchangedSince = now;
  } else if (abs(currentState.ldrRaw - lastLdrValue) <= 5) {
    if (now - ldrUnchangedSince > 600000) { // 10 minutes
      currentState.sensorError = "LDR";
    }
  } else {
    lastLdrValue = currentState.ldrRaw;
    ldrUnchangedSince = now;
    if (currentState.sensorError == "LDR") {
      currentState.sensorError = "";
    }
  }
  
  // Check PIR for stuck high
  if (pirStuckHigh) {
    currentState.sensorError = "PIR";
  }
}

void checkFirebaseCommands() {
  if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) return;
  
  String path = "/lighting/" + ROOM_ID + "/state";
  
  if (Firebase.RTDB.getJSON(&fbdo, path.c_str())) {
    FirebaseJson json = fbdo.jsonObject();
    
    String mode;
    if (json.get(mode, "mode")) {
      if (mode != currentState.mode) {
        currentState.mode = mode;
        Serial.println("Mode changed to: " + mode);
      }
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
    // Auto mode with business logic
    if (currentState.sensorError == "LDR") {
      // LDR fault: presence-only control
      currentState.ledOn = currentState.presence;
      currentState.ledPwm = currentState.ledOn ? 200 : 0;
    } else if (currentState.sensorError == "PIR") {
      // PIR fault: brightness-only control
      if (currentState.ldrRaw > DARK_THRESHOLD) {
        currentState.ledOn = true;
        currentState.ledPwm = mapLDRToPWM(currentState.ldrRaw);
      } else {
        currentState.ledOn = false;
        currentState.ledPwm = 0;
      }
    } else {
      // Normal operation with hysteresis
      if (currentState.presence && currentState.ldrRaw > DARK_THRESHOLD) {
        currentState.ledOn = true;
        currentState.ledPwm = mapLDRToPWM(currentState.ldrRaw);
      } else if (!currentState.presence || currentState.ldrRaw < BRIGHT_THRESHOLD) {
        currentState.ledOn = false;
        currentState.ledPwm = 0;
      }
      // If between thresholds, maintain current state (hysteresis)
    }
  }
  
  // Apply PWM guardrails
  currentState.ledPwm = constrain(currentState.ledPwm, 0, MAX_PWM);
  if (!currentState.ledOn) {
    currentState.ledPwm = 0;
  }
  
  // Update actual LED
  ledcWrite(LED_CHANNEL, currentState.ledPwm);
}

int mapLDRToPWM(int ldrValue) {
  // Map LDR reading to PWM (darker = brighter)
  return constrain(map(4095 - ldrValue, 0, 4095, 0, MAX_PWM), 0, MAX_PWM);
}

void updateFirebaseState() {
  if (WiFi.status() != WL_CONNECTED || !Firebase.ready()) return;
  
  FirebaseJson json;
  json.set("ts", (unsigned long)(millis()));
  json.set("presence", currentState.presence);
  json.set("ldrRaw", currentState.ldrRaw);
  json.set("mode", currentState.mode);
  
  FirebaseJson ledJson;
  ledJson.set("on", currentState.ledOn);
  ledJson.set("pwm", currentState.ledPwm);
  json.set("led", ledJson);
  
  if (currentState.sensorError.length() > 0) {
    json.set("sensorError", currentState.sensorError);
  } else {
    json.set("sensorError", nullptr);
  }
  
  String path = "/lighting/" + ROOM_ID + "/state";
  Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json);
}

void logData() {
  // Add to ring buffer
  logBuffer[logWriteIndex].state = currentState;
  logBuffer[logWriteIndex].sent = false;
  
  logWriteIndex = (logWriteIndex + 1) % RING_BUFFER_SIZE;
  if (logCount < RING_BUFFER_SIZE) {
    logCount++;
  } else {
    logReadIndex = (logReadIndex + 1) % RING_BUFFER_SIZE;
  }
  
  Serial.printf("📊 [%02d:%02d] P:%d LDR:%d LED:%d(%d) Mode:%s\n",
    (int)(millis() / 60000) % 60, (int)(millis() / 1000) % 60,
    currentState.presence, currentState.ldrRaw, 
    currentState.ledOn, currentState.ledPwm, currentState.mode.c_str());
}

void processOfflineQueue() {
  if (WiFi.status() != WL_CONNECTED || !Firebase.ready() || logCount == 0) return;
  
  // Process one log entry per loop iteration
  if (!logBuffer[logReadIndex].sent) {
    FirebaseJson json;
    SystemState &state = logBuffer[logReadIndex].state;
    
    json.set("ts", (unsigned long)state.timestamp);
    json.set("presence", state.presence);
    json.set("ldrRaw", state.ldrRaw);
    json.set("mode", state.mode);
    
    FirebaseJson ledJson;
    ledJson.set("on", state.ledOn);
    ledJson.set("pwm", state.ledPwm);
    json.set("led", ledJson);
    
    if (state.sensorError.length() > 0) {
      json.set("sensorError", state.sensorError);
    } else {
      json.set("sensorError", nullptr);
    }
    
    String path = "/lighting/" + ROOM_ID + "/logs/" + String(state.timestamp);
    
    if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
      logBuffer[logReadIndex].sent = true;
      logReadIndex = (logReadIndex + 1) % RING_BUFFER_SIZE;
      logCount--;
      connectionRetryDelay = 1000; // Reset retry delay on success
    } else {
      // Exponential backoff on failure
      connectionRetryDelay = min(connectionRetryDelay * 2, 60000UL);
      delay(connectionRetryDelay);
    }
  }
}

void tokenStatusCallback(token_info_t info) {
  if (info.status == token_status_error) {
    Serial.printf("❌ Token error: %s\n", info.error.message.c_str());
  }
}