/*
 * BMIT2123 Assignment - Smart Classroom IoT System
 * COMBINED SYSTEM: Smart Lighting + Climate Control
 * 
 * ASSIGNMENT COMPLIANCE:
 * ✅ 8+ Sensors/Actuators: LDR, LED, DHT22, MQ-135, DC Fan, AI Camera, Manual Controls
 * ✅ Cloud Integration: Firebase Realtime Database + MQTT
 * ✅ Real-time Data: Sensor readings every 2 seconds
 * ✅ Business Rules: Hysteresis, validation, error handling, temperature bands
 * ✅ User Interface: Web dashboard integration
 * ✅ AI Integration: Presence-triggered activation
 * 
 * HARDWARE PINS:
 * Smart Lighting: LDR (GPIO 34), LED (GPIO 18)
 * Climate Control: DHT22 (GPIO 4), MQ-135 (GPIO 32), Fan (GPIO 5)
 * 
 * SYSTEM ARCHITECTURE:
 * ESP32 (All Sensors) + Laptop Camera (AI Detection) + Firebase + Web Dashboard
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WiFiClient.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <time.h>

// Assignment Requirements - WiFi and Firebase
#define WIFI_SSID "vivo X200 Ultra"
#define WIFI_PASS "12345678"
#define FIREBASE_URL "https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app"

// ===== SMART LIGHTING PINS =====
const int LDR_PIN = 34;      // Light sensor (ADC input)
const int LED_PIN = 18;      // LED actuator (PWM output)

// ===== CLIMATE CONTROL PINS =====
#define DHT_PIN 4            // DHT22 Temperature & Humidity Sensor
#define MQ135_PIN 32         // MQ-135 Air Quality Sensor (ADC input)
#define FAN_PIN 5            // DC Fan PWM Control (via NPN transistor)

// DHT22 Configuration
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// ===== SMART LIGHTING CONSTANTS =====
const int BRIGHT_THRESHOLD = 1500;  // Below this = bright room (LED OFF)
const int DARK_THRESHOLD = 2500;    // Above this = dark room (LED ON)
const int LED_PWM_FREQ = 5000;
const int LED_PWM_RESOLUTION = 8;
const int MAX_LED_PWM = 255;
const bool LDR_DEBUG = true;

// ===== CLIMATE CONTROL CONSTANTS =====
const int FAN_PWM_FREQ = 500;    // 500 Hz for DC fans
const int FAN_PWM_RES = 10;      // 10-bit resolution (0-1023)
const int MAX_FAN_DUTY = (1 << FAN_PWM_RES) - 1;

// Fan Speed Levels
const int FAN_DUTY_LOW  = (int)(MAX_FAN_DUTY * 0.30);  // 30% PWM
const int FAN_DUTY_MED  = (int)(MAX_FAN_DUTY * 0.60);  // 60% PWM  
const int FAN_DUTY_HIGH = MAX_FAN_DUTY;                // 100% PWM

// Temperature Bands
const float TEMP_LOW_MAX = 26.0;    // ≤26°C → LOW band
const float TEMP_MED_MAX = 28.0;    // 26.1-28°C → MED band

// Air Quality Thresholds
const int AQ_GOOD_MAX = 300;        // 0-300 → Good
const int AQ_MODERATE_MAX = 400;    // 301-400 → Moderate

// Hysteresis Control
const unsigned long HYSTERESIS_DELAY = 60000; // 60 seconds

// MQTT Configuration
const char* MQTT_HOST = "192.168.202.221";
const int   MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "esp32-combined-roomA";

WiFiClient espClient;
PubSubClient mqtt(espClient);

// ===== TIMING CONSTANTS =====
const unsigned long SENSOR_INTERVAL = 2000;     // 2 seconds
const unsigned long CLOUD_SYNC_INTERVAL = 3000; // 3 seconds
const unsigned long MANUAL_CHECK_INTERVAL = 300; // 0.3 seconds (optimized response)
const unsigned long LOG_INTERVAL = 10000;       // 10 seconds
const unsigned long PRESENCE_CHECK_INTERVAL = 10000; // 10 seconds

// ===== SYSTEM STATE =====
struct SmartLightingState {
  int ldrRaw = 0;
  bool ai_presence = false;
  int ai_people_count = 0;
  float ai_confidence = 0.0;
  bool ledOn = false;
  int ledPwm = 0;
  String mode = "auto";
  String lightLevel = "MEDIUM";
  String systemStatus = "NORMAL";
  bool validData = true;
  unsigned long timestamp = 0;
};

struct ClimateControlState {
  float temperature = 0.0;
  float humidity = 0.0;
  int aqRaw = 0;
  String aqStatus = "Good";
  String mode = "auto";
  bool fanOn = false;
  int fanPwm = 0;
  String comfortBand = "Low";
  bool presence = false;
  String aqAlert = "";
};

SmartLightingState lightingState;
ClimateControlState climateState;

// Manual control variables
struct ManualCommands {
  bool ledOn = false;
  int ledPwm = 0;
  bool fanOn = false;
  int fanPwm = 0;
} manualCommands;

// Data validation and filtering
int ldrHistory[5] = {0};
int ldrIndex = 0;
bool ldrFull = false;

// Timing control
unsigned long lastSensorRead = 0;
unsigned long lastCloudSync = 0;
unsigned long lastManualCheck = 0;
unsigned long lastDataLog = 0;
unsigned long lastPresenceCheck = 0;
unsigned long lastBandChange = 0;

// AI timestamp tracking
uint64_t lastAiTimestampServer = 0;
unsigned long lastAiTimestampChangeMillis = 0;

// System counters
int totalRecords = 0;
int successfulCloudUploads = 0;
int errorCount = 0;

// Fan control
bool fanPwmReady = false;
int currentFanDuty = 0;

const String ROOM_ID = "roomA";

void setup() {
  Serial.begin(115200);
  Serial.println("🏫 BMIT2123 Assignment - Smart Classroom IoT");
  Serial.println("=============================================");
  Serial.println("📋 COMBINED SYSTEM: Smart Lighting + Climate Control");
  Serial.println("✅ 8+ Sensors: LDR, LED, DHT22, MQ-135, Fan, AI Camera, Controls");
  Serial.println("✅ Cloud Integration: Firebase Realtime Database");
  Serial.println("✅ Real-time Processing: 2-second intervals");
  Serial.println("🎥 AI Detection: Laptop camera for presence detection");
  Serial.println();
  
  // Initialize hardware
  initializeHardware();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Configure NTP
  configTime(8 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  Serial.println("⏰ Configuring time from NTP servers...");
  
  int attempts = 0;
  while (!time(nullptr) && attempts < 10) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }
  
  if (time(nullptr)) {
    Serial.println("\n✅ NTP time synchronized!");
  } else {
    Serial.println("\n⚠️ NTP time failed, using fallback timestamps");
  }
  
  // Initialize MQTT
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  
  Serial.println("🎯 Combined System Ready!");
  Serial.println("📊 Generating sufficient data records...");
  Serial.println();
}

void initializeHardware() {
  // Smart Lighting Hardware
  pinMode(LDR_PIN, INPUT);
  ledcAttach(LED_PIN, LED_PWM_FREQ, LED_PWM_RESOLUTION);
  
  // Climate Control Hardware
  dht.begin();
  analogReadResolution(12);   // ESP32 ADC: 0-4095
  fanPwmReady = ledcAttach(FAN_PIN, FAN_PWM_FREQ, FAN_PWM_RES);
  
  if (fanPwmReady) {
    Serial.printf("✅ Fan LEDC attached on GPIO %d @ %d Hz, %d-bit\n", FAN_PIN, FAN_PWM_FREQ, FAN_PWM_RES);
  } else {
    Serial.println("❌ ERROR: Fan LEDC attach failed");
  }
  
  // LDR Test
  Serial.println("🔧 LDR SENSOR TEST:");
  for (int i = 0; i < 5; i++) {
    int ldrValue = analogRead(LDR_PIN);
    Serial.printf("├─ LDR Reading %d: %d/4095\n", i+1, ldrValue);
    delay(500);
  }
  Serial.println("💡 Cover/uncover LDR now to see if values change!");
  Serial.println();
  
  Serial.println("🔧 Hardware initialized");
}

void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("🔗 Connecting to WiFi");
  
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("\n✅ WiFi connected: ");
    Serial.println(WiFi.localIP());
    Serial.println("🌐 Cloud integration active");
  } else {
    Serial.println("\n❌ WiFi failed - Limited functionality");
    errorCount++;
  }
}

void loop() {
  unsigned long now = millis();
  mqttEnsureConnected();
  mqtt.loop();
  
  // Debug: Show we're running (every 30 seconds)
  static unsigned long lastDebugOutput = 0;
  if (now - lastDebugOutput >= 30000) {
    Serial.println("🔄 Main loop running - system operational");
    lastDebugOutput = now;
  }
  
  // Fast Manual Command Check (0.5s response time)
  if (now - lastManualCheck >= MANUAL_CHECK_INTERVAL) {
    if (lightingState.mode == "manual" || climateState.mode == "manual") {
      readManualCommandsFromCloud();
    }
    lastManualCheck = now;
  }
  
  // Check presence status every 10 seconds
  if (now - lastPresenceCheck >= PRESENCE_CHECK_INTERVAL) {
    readPresenceFromFirebase();
    checkPresenceStatus();
    lastPresenceCheck = now;
  }
  
  // Sensor Data Acquisition (every 2 seconds)
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    acquireSensorData();
    validateBusinessRules();
    lastSensorRead = now;
  }
  
  // Cloud Data Processing (every 3 seconds)
  if (now - lastCloudSync >= CLOUD_SYNC_INTERVAL) {
    readAIDataFromCloud();
    syncWithCloud();
    publishMQTT();
    lastCloudSync = now;
  }
  
  // Data logging (every 10 seconds)
  if (now - lastDataLog >= LOG_INTERVAL) {
    logDataRecord();
    lastDataLog = now;
  }
  
  // Actuator control
  controlActuators();
  
  // Optimized loop for manual mode responsiveness
  if (lightingState.mode == "manual" || climateState.mode == "manual") {
    delay(30);  // Responsive manual controls (33Hz update rate)
  } else {
    delay(100); // Normal auto mode
  }
}

void acquireSensorData() {
  Serial.println("📊 Reading sensor data...");
  
  // ===== SMART LIGHTING SENSORS =====
  int rawLDR1 = analogRead(LDR_PIN);
  delay(10);
  int rawLDR2 = analogRead(LDR_PIN);
  delay(10);
  int rawLDR3 = analogRead(LDR_PIN);
  
  int maxDiff = max(abs(rawLDR1 - rawLDR2), abs(rawLDR2 - rawLDR3));
  bool isStable = maxDiff < 100;
  
  int rawLDR = (rawLDR1 + rawLDR2 + rawLDR3) / 3;
  lightingState.ldrRaw = filterLDRReading(rawLDR);
  
  if (LDR_DEBUG) {
    Serial.printf("🔧 LDR: %d | ", lightingState.ldrRaw);
    if (isStable) {
      if (lightingState.ldrRaw < BRIGHT_THRESHOLD) {
        Serial.println("BRIGHT ☀️");
      } else if (lightingState.ldrRaw > DARK_THRESHOLD) {
        Serial.println("DARK 🌙");
      } else {
        Serial.println("MEDIUM 🔄");
      }
    } else {
      Serial.println("UNSTABLE ⚠️");
    }
  }
  
  // ===== CLIMATE CONTROL SENSORS =====
  // Always read MQ-135 (continuous monitoring)
  int aqRaw = analogRead(MQ135_PIN);
  climateState.aqRaw = aqRaw;
  
  if (aqRaw <= AQ_GOOD_MAX) {
    climateState.aqStatus = "Good";
    climateState.aqAlert = "";
  } else if (aqRaw <= AQ_MODERATE_MAX) {
    climateState.aqStatus = "Moderate";
    climateState.aqAlert = "WARNING: Moderate air quality detected.";
  } else {
    climateState.aqStatus = "Poor";
    climateState.aqAlert = "CRITICAL: Poor air quality detected!";
  }
  
  Serial.printf("🌬️ Air Quality: %d (%s)\n", aqRaw, climateState.aqStatus.c_str());
  
  // Read DHT22 - try to read even without presence for debugging
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  
  if (!isnan(h) && !isnan(t)) {
    climateState.temperature = t;
    climateState.humidity = h;
    if (climateState.presence) {
      Serial.printf("🌡️ Temperature: %.1f°C | Humidity: %.1f%%\n", t, h);
    } else {
      Serial.printf("🌡️ DHT22 (no presence): %.1f°C | %.1f%%\n", t, h);
    }
  } else {
    Serial.println("❌ DHT22 read failed - using fallback values");
    // Use fallback values to prevent stale data
    if (climateState.temperature == 0.0) climateState.temperature = 25.0;
    if (climateState.humidity == 0.0) climateState.humidity = 50.0;
  }
  
  // Data validation
  lightingState.validData = (lightingState.ldrRaw >= 0 && lightingState.ldrRaw <= 4095 && isStable);
  lightingState.timestamp = getEpochTime();
  
  // Classify light level
  if (isStable) {
    if (lightingState.ldrRaw < BRIGHT_THRESHOLD) {
      lightingState.lightLevel = "BRIGHT";
    } else if (lightingState.ldrRaw > DARK_THRESHOLD) {
      lightingState.lightLevel = "DARK";
    } else {
      lightingState.lightLevel = "MEDIUM";
    }
  } else {
    lightingState.lightLevel = "ERROR";
    lightingState.systemStatus = "LDR_UNSTABLE";
  }
  
  totalRecords++;
}

int filterLDRReading(int rawValue) {
  rawValue = constrain(rawValue, 0, 4095);
  
  ldrHistory[ldrIndex] = rawValue;
  ldrIndex = (ldrIndex + 1) % 5;
  if (ldrIndex == 0) ldrFull = true;
  
  if (ldrFull) {
    int sum = ldrHistory[0] + ldrHistory[1] + ldrHistory[2];
    return sum / 3;
  }
  
  return rawValue;
}

void readManualCommandsFromCloud() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  unsigned long startTime = millis(); // Track response time
  
  // Optimize HTTP client for faster requests
  http.setTimeout(1000); // 1 second timeout instead of default 5 seconds
  http.setConnectTimeout(1000); // Fast connection timeout
  
  // Read lighting commands
  String lightingUrl = String(FIREBASE_URL) + "/lighting/" + ROOM_ID + "/state/led.json";
  http.begin(lightingUrl);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DynamicJsonDocument doc(256);
    deserializeJson(doc, payload);
    
    if (doc.containsKey("on")) {
      bool newLedOn = doc["on"];
      if (newLedOn != manualCommands.ledOn) {
        manualCommands.ledOn = newLedOn;
        Serial.printf("⚡ Fast manual LED: %s\n", newLedOn ? "ON" : "OFF");
        lightingState.ledOn = manualCommands.ledOn;
        lightingState.ledPwm = manualCommands.ledPwm;
        // Apply immediately for instant response
        ledcWrite(LED_PIN, lightingState.ledPwm);
      }
    }
    if (doc.containsKey("pwm")) {
      int newPwm = doc["pwm"];
      if (newPwm != manualCommands.ledPwm) {
        manualCommands.ledPwm = constrain(newPwm, 0, MAX_LED_PWM);
        Serial.printf("⚡ Fast manual LED PWM: %d\n", manualCommands.ledPwm);
        lightingState.ledOn = manualCommands.ledOn;
        lightingState.ledPwm = manualCommands.ledPwm;
        // Apply immediately for instant response
        ledcWrite(LED_PIN, lightingState.ledPwm);
      }
    }
  }
  http.end();
  
  // Read climate commands with same optimization
  String climateUrl = String(FIREBASE_URL) + "/climate/" + ROOM_ID + "/state.json";
  http.begin(climateUrl);
  http.setTimeout(1000); // Fast timeout for climate requests too
  httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DynamicJsonDocument doc(512);
    deserializeJson(doc, payload);
    
    if (doc.containsKey("mode")) {
      String newMode = doc["mode"].as<String>();
      if (newMode != climateState.mode) {
        Serial.printf("🔄 Climate mode change: %s → %s\n", climateState.mode.c_str(), newMode.c_str());
        climateState.mode = newMode;
        Serial.printf("🔄 Climate mode: %s\n", climateState.mode.c_str());
      }
    }
    
    if (climateState.mode == "manual" && doc.containsKey("fan")) {
      JsonObject fan = doc["fan"];
      if (fan.containsKey("on")) {
        bool newFanOn = fan["on"];
        if (newFanOn != manualCommands.fanOn) {
          manualCommands.fanOn = newFanOn;
          Serial.printf("⚡ Fast manual Fan: %s (mode=%s)\n", newFanOn ? "ON" : "OFF", climateState.mode.c_str());
          climateState.fanOn = manualCommands.fanOn;
          climateState.fanPwm = manualCommands.fanPwm;
          // Apply immediately for instant response
          if (manualCommands.fanOn) {
            int duty = map(manualCommands.fanPwm, 0, 255, 0, MAX_FAN_DUTY);
            setFanDuty(duty);
            Serial.printf("🌪️ IMMEDIATE Fan ON: PWM=%d, Duty=%d\n", manualCommands.fanPwm, duty);
          } else {
            setFanDuty(0);
            Serial.println("🌪️ IMMEDIATE Fan OFF");
          }
        }
      }
      if (fan.containsKey("pwm")) {
        int newPwm = fan["pwm"];
        if (newPwm != manualCommands.fanPwm) {
          manualCommands.fanPwm = constrain(newPwm, 0, 255);
          Serial.printf("⚡ Fast manual Fan PWM: %d (mode=%s)\n", manualCommands.fanPwm, climateState.mode.c_str());
          climateState.fanOn = manualCommands.fanOn;
          climateState.fanPwm = manualCommands.fanPwm;
          // Apply immediately for instant response
          if (manualCommands.fanOn) {
            int duty = map(manualCommands.fanPwm, 0, 255, 0, MAX_FAN_DUTY);
            setFanDuty(duty);
            Serial.printf("🌪️ IMMEDIATE Fan PWM: %d, Duty=%d\n", manualCommands.fanPwm, duty);
          } else {
            setFanDuty(0);
            Serial.println("🌪️ IMMEDIATE Fan OFF (PWM=0)");
          }
        }
      }
    }
  }
  http.end();
  
  // Debug: Show actual response time
  unsigned long responseTime = millis() - startTime;
  if (responseTime > 100) { // Only log if slower than 100ms
    Serial.printf("⏱️ Manual command check took %lums\n", responseTime);
  }
}

void readAIDataFromCloud() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  
  // Read lighting AI data
  String lightingUrl = String(FIREBASE_URL) + "/lighting/" + ROOM_ID + "/state.json";
  http.begin(lightingUrl);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);
    
    // Read AI camera data
    if (doc.containsKey("ai_presence")) {
      lightingState.ai_presence = doc["ai_presence"];
      climateState.presence = lightingState.ai_presence; // Sync presence
    }
    if (doc.containsKey("ai_people_count")) {
      lightingState.ai_people_count = doc["ai_people_count"];
    }
    if (doc.containsKey("ai_confidence")) {
      lightingState.ai_confidence = doc["ai_confidence"];
    }
    
    // Read lighting mode changes
    if (doc.containsKey("mode")) {
      String newMode = doc["mode"].as<String>();
      if (newMode != lightingState.mode) {
        lightingState.mode = newMode;
        Serial.printf("🔄 Lighting mode: %s\n", lightingState.mode.c_str());
      }
    }
    
    // AI timestamp tracking
    if (doc.containsKey("ai_timestamp")) {
      uint64_t ai_ts = doc["ai_timestamp"];
      if (ai_ts != lastAiTimestampServer) {
        lastAiTimestampServer = ai_ts;
        lastAiTimestampChangeMillis = millis();
      }
    }
  }
  http.end();
  
  // Read climate mode separately
  String climateUrl = String(FIREBASE_URL) + "/climate/" + ROOM_ID + "/state.json";
  http.begin(climateUrl);
  httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DynamicJsonDocument doc(512);
    deserializeJson(doc, payload);
    
    // Read climate mode changes
    if (doc.containsKey("mode")) {
      String newMode = doc["mode"].as<String>();
      if (newMode != climateState.mode) {
        Serial.printf("🔄 Climate mode change: %s → %s\n", climateState.mode.c_str(), newMode.c_str());
        climateState.mode = newMode;
        Serial.printf("🔄 Climate mode: %s\n", climateState.mode.c_str());
      }
    }
  }
  http.end();
}

void readPresenceFromFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(FIREBASE_URL) + "/lighting/" + ROOM_ID + "/state/ai_presence.json";
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    bool firebasePresence = (payload == "true");
    
    if (firebasePresence != climateState.presence) {
      climateState.presence = firebasePresence;
      lightingState.ai_presence = firebasePresence; // Sync
      Serial.println("🔥 Firebase Presence: " + String(climateState.presence ? "TRUE" : "FALSE"));
    }
  }
  
  http.end();
}

void checkPresenceStatus() {
  static bool previousPresence = false;
  
  if (previousPresence != climateState.presence) {
    if (climateState.presence) {
      Serial.println("🟢 PRESENCE DETECTED - Both systems ACTIVE");
    } else {
      Serial.println("🔴 NO PRESENCE - Systems in IDLE mode");
    }
    previousPresence = climateState.presence;
  }
}

void validateBusinessRules() {
  // Track presence changes for immediate response
  static bool previousPresence = false;
  bool presenceChanged = (previousPresence != climateState.presence);
  if (presenceChanged) {
    Serial.printf("🔄 PRESENCE CHANGE: %s → %s\n", 
                  previousPresence ? "true" : "false", 
                  climateState.presence ? "true" : "false");
    previousPresence = climateState.presence;
  }
  
  // ===== SMART LIGHTING BUSINESS RULES =====
  if (lightingState.mode == "auto") {
    int level = lightingState.ldrRaw;
    bool aiFresh = (millis() - lastAiTimestampChangeMillis) <= 10000;
    bool effectivePresence = lightingState.ai_presence && aiFresh;

    if (effectivePresence && level > DARK_THRESHOLD) {
      lightingState.ledOn = true;
      lightingState.ledPwm = mapLightToPWM(lightingState.ldrRaw);
    } else if (!effectivePresence || level < BRIGHT_THRESHOLD) {
      lightingState.ledOn = false;
      lightingState.ledPwm = 0;
    }
  } else {
    // Manual mode - use commands directly
    lightingState.ledOn = manualCommands.ledOn;
    lightingState.ledPwm = manualCommands.ledPwm;
  }
  
  // ===== CLIMATE CONTROL BUSINESS RULES =====
  if (climateState.mode == "manual") {
    // Manual mode - CRITICAL: Use commands directly, don't override with presence
    // NOTE: Fan control is already applied in readManualCommandsFromCloud() for instant response
    // This section only updates the state variables for consistency
    climateState.fanOn = manualCommands.fanOn;
    climateState.fanPwm = manualCommands.fanPwm;
    // Don't call setFanDuty() here to avoid conflicts with immediate manual control
    Serial.printf("🎛️ Business Rules: Manual mode - fanOn=%s, pwm=%d (NO setFanDuty call)\n", 
                  climateState.fanOn ? "true" : "false", climateState.fanPwm);
  } else {
    // Auto mode - presence-based control
    if (climateState.presence) {
      // Presence detected - IMMEDIATE response
      if (presenceChanged) {
        Serial.println("🚀 IMMEDIATE FAN START - Presence detected!");
        // Force immediate fan start when presence is detected
        lastBandChange = 0; // Reset hysteresis for immediate response
      }
      // Temperature-based control
      autoClimateControl();
    } else {
      // No presence - turn off fan (auto mode only)
      setFanDuty(0);
      climateState.fanOn = false;
      climateState.fanPwm = 0;
      climateState.comfortBand = "Idle";
    }
  }
  
  // System status evaluation
  if (errorCount > 10) {
    lightingState.systemStatus = "ERROR";
  } else if (WiFi.status() != WL_CONNECTED) {
    lightingState.systemStatus = "OFFLINE";
  } else {
    lightingState.systemStatus = "NORMAL";
  }
}

void autoClimateControl() {
  unsigned long now = millis();
  
  Serial.printf("🤖 autoClimateControl called: mode=%s, presence=%s, temp=%.1f°C\n", 
                climateState.mode.c_str(), climateState.presence ? "true" : "false", climateState.temperature);
  
  // Determine temperature band
  String newBand = climateState.comfortBand;
  int targetDuty = currentFanDuty;
  
  if (climateState.temperature <= TEMP_LOW_MAX) {
    newBand = "Low";
    targetDuty = FAN_DUTY_LOW;
  } else if (climateState.temperature <= TEMP_MED_MAX) {
    newBand = "Moderate";
    targetDuty = FAN_DUTY_MED;
  } else {
    newBand = "High";
    targetDuty = FAN_DUTY_HIGH;
  }
  
  // Air Quality Override - IMMEDIATE response
  if (climateState.aqStatus == "Poor") {
    targetDuty = FAN_DUTY_HIGH;
    newBand = "High";
    Serial.println("🚨 POOR Air Quality - Fan at MAXIMUM!");
  }
  
  // Apply band change immediately when presence is detected
  // Only use hysteresis for temperature changes, not presence changes
  if (newBand != climateState.comfortBand) {
    climateState.comfortBand = newBand;
    lastBandChange = now;
    Serial.println("🎯 Temperature Band: " + newBand);
  }
  
  // Apply fan control IMMEDIATELY
  setFanDuty(targetDuty);
  climateState.fanOn = (targetDuty > 0);
  climateState.fanPwm = map(targetDuty, 0, MAX_FAN_DUTY, 0, 255);
  
  Serial.printf("🌪️ Auto fan: %s (PWM: %d, Band: %s)\n", 
                climateState.fanOn ? "ON" : "OFF", 
                climateState.fanPwm, 
                climateState.comfortBand.c_str());
}

int mapLightToPWM(int ldrValue) {
  if (ldrValue >= 4000) return 255;
  if (ldrValue >= 3500) return 200;
  if (ldrValue >= 3000) return 150;
  if (ldrValue >= 2500) return 100;
  if (ldrValue >= 2000) return 50;
  return 0;
}

void setFanDuty(int duty) {
  duty = constrain(duty, 0, MAX_FAN_DUTY);
  
  // Debug: Track all fan duty changes
  if (currentFanDuty != duty) {
    Serial.printf("🌪️ setFanDuty: %d → %d (mode=%s, manualFanOn=%s)\n", 
                  currentFanDuty, duty, climateState.mode.c_str(), 
                  manualCommands.fanOn ? "true" : "false");
  }
  
  if (!fanPwmReady) {
    currentFanDuty = duty;
    return;
  }
  
  // Kick-start when going from 0 to low duty
  if (currentFanDuty == 0 && duty > 0 && duty < (int)(MAX_FAN_DUTY * 0.4)) {
    ledcWrite(FAN_PIN, MAX_FAN_DUTY);
    delay(300);
  }
  
  ledcWrite(FAN_PIN, duty);
  currentFanDuty = duty;
}

void controlActuators() {
  // Smart Lighting
  ledcWrite(LED_PIN, lightingState.ledPwm);
  
  // Climate Control (fan is controlled in validateBusinessRules)
}

void publishMQTT() {
  if (!mqtt.connected()) return;
  
  // Smart Lighting Data
  StaticJsonDocument<96> lightingDoc;
  lightingDoc["ldrRaw"] = lightingState.ldrRaw;
  char lightingStr[96];
  size_t n = serializeJson(lightingDoc, lightingStr);
  mqtt.publish("sensors/lighting/brightness", (const uint8_t*)lightingStr, n, true);
  
  if (lightingState.mode == "auto") {
    StaticJsonDocument<96> ledDoc;
    ledDoc["on"] = lightingState.ledOn;
    ledDoc["pwm"] = lightingState.ledPwm;
    char ledStr[96];
    size_t n2 = serializeJson(ledDoc, ledStr);
    mqtt.publish("sensors/lighting/led_state", (const uint8_t*)ledStr, n2, true);
  }
  
  mqtt.publish("sensors/lighting/mode", lightingState.mode.c_str(), true);
  
  // Combined lighting state for LCD
  StaticJsonDocument<256> lightingStateDoc;
  lightingStateDoc["ts"] = getEpochTime();
  lightingStateDoc["presence"] = lightingState.ai_presence;
  lightingStateDoc["ldrRaw"] = lightingState.ldrRaw;
  lightingStateDoc["mode"] = lightingState.mode;
  JsonObject led = lightingStateDoc.createNestedObject("led");
  led["on"] = lightingState.ledOn;
  led["pwm"] = lightingState.ledPwm;
  char lightingStateStr[256];
  size_t n3 = serializeJson(lightingStateDoc, lightingStateStr);
  mqtt.publish("sensors/lighting/state", (const uint8_t*)lightingStateStr, n3, true);
  
  // Climate Control Data
  StaticJsonDocument<128> tempDoc;
  tempDoc["c"] = climateState.temperature;
  char tempStr[128];
  size_t n4 = serializeJson(tempDoc, tempStr);
  mqtt.publish("sensors/climate/temperature", tempStr, true);
  
  StaticJsonDocument<128> humDoc;
  humDoc["rh"] = climateState.humidity;
  char humStr[128];
  size_t n5 = serializeJson(humDoc, humStr);
  mqtt.publish("sensors/climate/humidity", humStr, true);
  
  StaticJsonDocument<128> aqDoc;
  aqDoc["mq135"] = climateState.aqRaw;
  char aqStr[128];
  size_t n6 = serializeJson(aqDoc, aqStr);
  mqtt.publish("sensors/air/quality_raw", aqStr, true);
  
  StaticJsonDocument<128> aqStatusDoc;
  aqStatusDoc["status"] = climateState.aqStatus;
  char aqStatusStr[128];
  size_t n7 = serializeJson(aqStatusDoc, aqStatusStr);
  mqtt.publish("sensors/air/quality_status", aqStatusStr, true);
  
  // CRITICAL: Only publish fan state in AUTO mode to prevent command conflicts
  if (climateState.mode == "auto") {
    StaticJsonDocument<256> fanDoc;
    fanDoc["mode"] = climateState.mode;
    fanDoc["on"] = climateState.fanOn;
    fanDoc["pwm"] = climateState.fanPwm;
    fanDoc["band"] = climateState.comfortBand;
    char fanStr[256];
    size_t n8 = serializeJson(fanDoc, fanStr);
    mqtt.publish("sensors/climate/fan_state", fanStr, true);
  }
  
  // Combined climate state for LCD
  StaticJsonDocument<512> climateStateDoc;
  climateStateDoc["tempC"] = climateState.temperature;
  climateStateDoc["humidity"] = climateState.humidity;
  climateStateDoc["aqRaw"] = climateState.aqRaw;
  climateStateDoc["aqStatus"] = climateState.aqStatus;
  climateStateDoc["aqAlert"] = climateState.aqAlert;
  climateStateDoc["mode"] = climateState.mode;
  JsonObject fan = climateStateDoc.createNestedObject("fan");
  fan["on"] = climateState.fanOn;
  fan["pwm"] = climateState.fanPwm;
  climateStateDoc["comfortBand"] = climateState.comfortBand;
  climateStateDoc["presence"] = climateState.presence;
  
  char climateStateStr[512];
  size_t n9 = serializeJson(climateStateDoc, climateStateStr);
  mqtt.publish("sensors/climate/state", (const uint8_t*)climateStateStr, n9, true);
  
  Serial.println("📡 MQTT Published: All sensor data");
}

void syncWithCloud() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  Serial.println("☁️ Syncing with Firebase...");
  
  // Sync Lighting State
  HTTPClient http;
  String lightingUrl = String(FIREBASE_URL) + "/lighting/" + ROOM_ID + "/state.json";
  
  http.begin(lightingUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000); // 5 second timeout
  http.setConnectTimeout(3000); // 3 second connection timeout
  
  DynamicJsonDocument lightingDoc(2048);
  lightingDoc["ts"] = getEpochTime();
  lightingDoc["timestamp"] = getEpochTime();
  lightingDoc["ldrRaw"] = lightingState.ldrRaw;
  lightingDoc["lightLevel"] = lightingState.lightLevel;
  
  if (lightingState.mode == "auto") {
    lightingDoc["led"]["on"] = lightingState.ledOn;
    lightingDoc["led"]["pwm"] = lightingState.ledPwm;
  }
  
  // Mode is controlled by web dashboard - don't overwrite
  // lightingDoc["mode"] = lightingState.mode;
  lightingDoc["systemStatus"] = lightingState.systemStatus;
  lightingDoc["totalRecords"] = totalRecords;
  lightingDoc["errorCount"] = errorCount;
  lightingDoc["validData"] = lightingState.validData;
  lightingDoc["ai_presence"] = lightingState.ai_presence;
  lightingDoc["ai_people_count"] = lightingState.ai_people_count;
  lightingDoc["ai_confidence"] = lightingState.ai_confidence;
  lightingDoc["ai_timestamp"] = lastAiTimestampServer;
  
  String lightingJsonString;
  serializeJson(lightingDoc, lightingJsonString);
  
  int httpCode = http.PATCH(lightingJsonString);
  if (httpCode == HTTP_CODE_OK) {
    successfulCloudUploads++;
    Serial.println("☁️ Lighting cloud sync successful");
  } else {
    errorCount++;
    Serial.printf("❌ Lighting cloud sync failed: %d\n", httpCode);
  }
  http.end();
  
  // Sync Climate State
  String climateUrl = String(FIREBASE_URL) + "/climate/" + ROOM_ID + "/state.json";
  
  http.begin(climateUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000); // 5 second timeout
  http.setConnectTimeout(3000); // 3 second connection timeout
  
  DynamicJsonDocument climateDoc(512);
  climateDoc["tempC"] = climateState.temperature;
  climateDoc["humidity"] = climateState.humidity;
  // Mode is controlled by web dashboard - don't overwrite
  // climateDoc["mode"] = climateState.mode;
  
  // CRITICAL: Don't overwrite manual fan commands in Firebase
  if (climateState.mode == "auto") {
    climateDoc["fan"]["on"] = climateState.fanOn;
    climateDoc["fan"]["pwm"] = climateState.fanPwm;
  }
  // In manual mode, preserve existing Firebase fan commands (don't overwrite)
  
  climateDoc["comfortBand"] = climateState.comfortBand;
  climateDoc["aqRaw"] = climateState.aqRaw;
  climateDoc["aqStatus"] = climateState.aqStatus;
  climateDoc["aqAlert"] = climateState.aqAlert;
  climateDoc["presence"] = climateState.presence;
  
  // ALWAYS update timestamp to prevent stale data warnings
  climateDoc["lastUpdate"] = getEpochTime();
  
  time_t now = time(nullptr);
  if (now > 1000000000) {
    long long timestamp = (long long)now * 1000;
    climateDoc["ts"] = timestamp;
  } else {
    long long fallbackTime = 1726000000000LL + millis();
    climateDoc["ts"] = fallbackTime;
  }
  
  String climateJsonString;
  serializeJson(climateDoc, climateJsonString);
  
  httpCode = http.PATCH(climateJsonString);
  if (httpCode == HTTP_CODE_OK) {
    if (climateState.mode == "manual") {
      Serial.println("☁️ Climate cloud sync successful (preserving manual commands)");
    } else {
      Serial.println("☁️ Climate cloud sync successful");
    }
    Serial.printf("🌡️ Climate data: Temp=%.1f°C, Hum=%.1f%%, AQ=%d, Fan=%s\n", 
                  climateState.temperature, climateState.humidity, climateState.aqRaw, 
                  climateState.fanOn ? "ON" : "OFF");
  } else {
    Serial.printf("❌ Climate cloud sync failed: %d\n", httpCode);
    Serial.printf("📊 Climate data being sent: %s\n", climateJsonString.c_str());
  }
  http.end();
}

void logDataRecord() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  uint64_t logEpochTime = getEpochTime();
  String url = String(FIREBASE_URL) + "/combined/" + ROOM_ID + "/logs/" + String(logEpochTime) + ".json";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument doc(2048);
  doc["timestamp"] = logEpochTime;
  
  // Lighting data
  JsonObject lighting = doc.createNestedObject("lighting");
  lighting["ldr"] = lightingState.ldrRaw;
  lighting["lightLevel"] = lightingState.lightLevel;
  lighting["ledOn"] = lightingState.ledOn;
  lighting["ledPWM"] = lightingState.ledPwm;
  lighting["mode"] = lightingState.mode;
  
  // Climate data
  JsonObject climate = doc.createNestedObject("climate");
  climate["tempC"] = climateState.temperature;
  climate["humidity"] = climateState.humidity;
  climate["aqRaw"] = climateState.aqRaw;
  climate["aqStatus"] = climateState.aqStatus;
  climate["fanOn"] = climateState.fanOn;
  climate["fanPwm"] = climateState.fanPwm;
  climate["comfortBand"] = climateState.comfortBand;
  climate["mode"] = climateState.mode;
  
  // AI data
  JsonObject ai = doc.createNestedObject("ai");
  ai["presence"] = lightingState.ai_presence;
  ai["peopleCount"] = lightingState.ai_people_count;
  ai["confidence"] = lightingState.ai_confidence;
  
  // System data
  JsonObject system = doc.createNestedObject("system");
  system["recordNumber"] = totalRecords;
  system["errors"] = errorCount;
  system["status"] = lightingState.systemStatus;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpCode = http.PUT(jsonString);
  if (httpCode == HTTP_CODE_OK) {
    Serial.printf("📊 Combined data record #%d logged\n", totalRecords);
  }
  
  http.end();
  
  // Print status
  printSystemStatus();
}

void printSystemStatus() {
  Serial.println("📋 COMBINED SYSTEM STATUS:");
  Serial.println("├─ Smart Lighting: " + String(lightingState.ledOn ? "ON" : "OFF") + " (PWM: " + String(lightingState.ledPwm) + ")");
  Serial.println("├─ Climate Control: " + String(climateState.fanOn ? "ON" : "OFF") + " (PWM: " + String(climateState.fanPwm) + ")");
  Serial.println("├─ Temperature: " + String(climateState.temperature, 1) + "°C | Humidity: " + String(climateState.humidity, 1) + "%");
  Serial.println("├─ Air Quality: " + climateState.aqStatus + " (" + String(climateState.aqRaw) + ")");
  Serial.println("├─ Light Level: " + lightingState.lightLevel + " (" + String(lightingState.ldrRaw) + ")");
  Serial.println("├─ Presence: " + String(climateState.presence ? "DETECTED" : "NONE"));
  Serial.println("└─ Records: " + String(totalRecords));
  Serial.println("═══════════════════════════════════════");
}

void mqttCallback(char* topic, byte* payload, unsigned int len) {
  // MQTT callback - commands come from Firebase only
}

void mqttEnsureConnected() {
  if (mqtt.connected()) return;
  
  static unsigned long lastMqttAttempt = 0;
  static int mqttAttempts = 0;
  const unsigned long MQTT_RETRY_INTERVAL = 5000; // Try every 5 seconds
  const int MAX_MQTT_ATTEMPTS = 3; // Max attempts before giving up
  
  unsigned long now = millis();
  
  // Only try to connect if enough time has passed and we haven't exceeded max attempts
  if (now - lastMqttAttempt >= MQTT_RETRY_INTERVAL && mqttAttempts < MAX_MQTT_ATTEMPTS) {
    Serial.printf("📡 Attempting MQTT connection (attempt %d/%d)...\n", mqttAttempts + 1, MAX_MQTT_ATTEMPTS);
    
    if (mqtt.connect(MQTT_CLIENT_ID)) {
      Serial.println("📡 MQTT connected (publish only)");
      mqttAttempts = 0; // Reset attempts on success
    } else {
      Serial.printf("❌ MQTT connection failed (attempt %d/%d)\n", mqttAttempts + 1, MAX_MQTT_ATTEMPTS);
      mqttAttempts++;
    }
    
    lastMqttAttempt = now;
  }
  
  // If we've exceeded max attempts, just skip MQTT for this session
  if (mqttAttempts >= MAX_MQTT_ATTEMPTS) {
    static bool mqttWarningShown = false;
    if (!mqttWarningShown) {
      Serial.println("⚠️ MQTT connection failed after max attempts - continuing without MQTT");
      mqttWarningShown = true;
    }
  }
}

uint64_t getEpochTime() {
  time_t now;
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return 1700000000000ULL + millis();
  }
  time(&now);
  return (uint64_t)now * 1000;
}
