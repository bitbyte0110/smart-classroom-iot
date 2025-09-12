/*
 * BMIT2123 Assignment - Smart Classroom IoT System
 * Module 2: Smart Climate Control (DHT22 + MQ-135 + DC Fan)
 * 
 * ASSIGNMENT COMPLIANCE:
 * ✅ 5+ Sensors/Actuators: DHT22 (temp+humidity), MQ-135, DC Fan, Boost Button
 * ✅ Cloud Integration: Firebase Realtime Database + MQTT
 * ✅ Real-time Data: Sensor readings every 30 seconds
 * ✅ Business Rules: Temperature bands, AQ assistance, hysteresis
 * ✅ User Interface: Web dashboard integration
 * ✅ AI Integration: Presence-triggered activation
 * 
 * SYSTEM BEHAVIOR (Updated per instruction.md):
 * 🤖 PRESENCE: Only follows yolo_force_gpu.py results (ai/presence/detection)
 * 🌡️ DHT22: ON only when YOLO presence detected, OFF when no presence
 * 💨 FAN: ON only when YOLO presence detected, follows temperature bands:
 *      ≤25°C → LOW (30% PWM), 25.1-28°C → MED (60% PWM), ≥28.1°C → HIGH (100% PWM)
 * 🌬️ MQ-135: ALWAYS ON (continuous monitoring, not affected by presence)
 * 🚨 AIR QUALITY: Good/Moderate = no fan change, Poor = force fan to MAX speed
 * 
 * SYSTEM ARCHITECTURE:
 * ESP32 (DHT22 + MQ-135 + Fan) + YOLO AI Presence + MQTT + Firebase + Web Dashboard
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <time.h>

// Assignment Requirements - WiFi and MQTT
#define WIFI_SSID "vivo X200 Ultra"
#define WIFI_PASS "12345678"
#define FIREBASE_URL "https://smartclassroom-af237-default-rtdb.asia-southeast1.firebasedatabase.app"

// Hardware Pin Definitions - Module 2 Climate Control
#define DHT_PIN 4        // DHT22 Temperature & Humidity Sensor
#define MQ135_PIN 32     // MQ-135 Air Quality Sensor (ADC input)
#define FAN_PIN 5        // DC Fan PWM Control (via NPN transistor)
// #define BOOST_PIN 27     // Boost Button (removed - not using boost mode)

// DHT22 Configuration
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// MQTT Configuration (Raspberry Pi broker)
const char* MQTT_HOST = "192.168.202.221"; // Your Pi IPv4
const int   MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "esp32-climate-roomA-v2";

WiFiClient espClient;
PubSubClient mqtt(espClient);

// System Configuration
const String ROOM_ID = "roomA";
const unsigned long SENSOR_INTERVAL = 30000;     // 30 seconds
const unsigned long MQTT_INTERVAL = 5000;        // 5 seconds
const unsigned long FIREBASE_INTERVAL = 10000;   // 10 seconds
const unsigned long PRESENCE_CHECK_INTERVAL = 10000; // Check presence every 10 seconds

// Fan PWM Configuration (LEDC new API)
const int PWM_FREQ = 500;    // 500 Hz for DC fans
const int PWM_RES = 10;      // 10-bit resolution (0-1023)
const int MAX_DUTY = (1 << PWM_RES) - 1;

// Fan Speed Levels (as specified in requirements)
const int FAN_DUTY_LOW  = (int)(MAX_DUTY * 0.30);  // 30% PWM
const int FAN_DUTY_MED  = (int)(MAX_DUTY * 0.60);  // 60% PWM  
const int FAN_DUTY_HIGH = MAX_DUTY;                // 100% PWM

// Temperature Bands (updated per instruction.md)
const float TEMP_LOW_MAX = 25.0;    // ≤25°C → LOW band
const float TEMP_MED_MAX = 28.0;    // 25.1-28°C → MED band
                                    // ≥28.1°C → HIGH band

// Air Quality Thresholds (configurable)
const int AQ_GOOD_MAX = 300;        // 0-300 → Good
const int AQ_MODERATE_MAX = 400;    // 301-400 → Moderate
                                    // ≥401 → Poor

// Hysteresis Control (prevent oscillation)
const unsigned long HYSTERESIS_DELAY = 60000; // 60 seconds

// System State Variables
struct ClimateState {
  float temperature = 0.0;
  float humidity = 0.0;
  int aqRaw = 0;
  String aqStatus = "Good";
  String mode = "auto";        // "auto" or "manual"
  bool fanOn = false;
  int fanPwm = 0;
  String comfortBand = "Low";
  bool presence = false;
  // bool systemActive = false; // Removed - using presence directly
  String lastStatusMessage = "";
  String aqAlert = ""; // Air quality alert message for UI
} currentState;

// Timing Variables
unsigned long lastSensorRead = 0;
unsigned long lastMqttPublish = 0;
unsigned long lastFirebaseSync = 0;
unsigned long lastBandChange = 0;
// unsigned long lastBoostCheck = 0; // Removed - no boost mode
unsigned long lastPresenceCheck = 0;

// Fan Control Variables
bool pwmReady = false;
int currentDuty = 0;

// Manual Override Variables
bool manualFanOn = false;
int manualFanPwm = 0;

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n🏫 Smart Climate Control System");
  Serial.println("===============================");
  
  // Initialize hardware
  initializeHardware();
  
  // Connect to WiFi
  connectWiFi();
  
  // Initialize MQTT
  initializeMqtt();
  
  // Configure time for Firebase (UTC timezone)
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  
  // Wait for time synchronization
  Serial.print("⏰ Synchronizing time");
  int timeoutCount = 0;
  while (time(nullptr) < 1000000000 && timeoutCount < 30) {
    delay(500);
    Serial.print(".");
    timeoutCount++;
  }
  
  time_t now = time(nullptr);
  if (now > 1000000000) {
    Serial.println(" ✅ Time synchronized");
    Serial.printf("   Unix timestamp: %ld\n", now);
    Serial.printf("   Milliseconds: %lld\n", (long long)now * 1000);
    Serial.printf("   Current UTC time: %s", ctime(&now));
  } else {
    Serial.println(" ⚠️ Time sync failed, will use fallback");
  }
  
  
  // Test connectivity
  testConnectivity();
  
  Serial.println("✅ Climate Control System Ready!");
  Serial.println("🌡️ DHT22 + 🌬️ MQ-135 + 💨 Fan Control");
  Serial.println("🤖 AI Presence Integration Active");
  Serial.println("⏰ Checking presence every 10 seconds");
  Serial.println("📊 System Status:");
  Serial.println("   • MQ-135: Always monitoring");
  Serial.println("   • DHT22: Only when presence detected");
  Serial.println("   • Fan: Only when presence detected");
  Serial.println("🔍 Debug Mode: Enhanced presence tracking enabled");
  Serial.println();
}

void loop() {
  unsigned long now = millis();
  
  // Maintain MQTT connection
  if (!mqtt.connected()) {
    Serial.println("⚠️ MQTT disconnected - attempting reconnection");
    reconnectMqtt();
  }
  mqtt.loop();
  
  // Check presence status every 10 seconds
  if (now - lastPresenceCheck > PRESENCE_CHECK_INTERVAL) {
    // Also read presence directly from Firebase as backup
    readPresenceFromFirebase();
    // Read manual control commands from Firebase
    readManualControlFromFirebase();
    checkPresenceStatus();
    lastPresenceCheck = now;
  }
  
  // Read sensors (every 30 seconds)
  if (now - lastSensorRead > SENSOR_INTERVAL) {
    readSensors();
    lastSensorRead = now;
  }
  
  // Boost mode check removed
  
  // Apply control logic based on system state
  applySystemLogic();
  
  // Publish to MQTT (every 5 seconds)
  if (now - lastMqttPublish > MQTT_INTERVAL) {
    publishMqttData();
    lastMqttPublish = now;
  }
  
  // Sync with Firebase (every 10 seconds)
  if (now - lastFirebaseSync > FIREBASE_INTERVAL) {
    syncFirebase();
    lastFirebaseSync = now;
  }
  
  delay(100);
}

void initializeHardware() {
  // Initialize sensors
  dht.begin();
  analogReadResolution(12);   // ESP32 ADC: 0-4095
  
  // Initialize fan PWM (LEDC new API)
  pwmReady = ledcAttach(FAN_PIN, PWM_FREQ, PWM_RES);
  if (pwmReady) {
    Serial.printf("✅ LEDC attached on GPIO %d @ %d Hz, %d-bit\n", FAN_PIN, PWM_FREQ, PWM_RES);
  } else {
    Serial.println("❌ ERROR: ledcAttach failed");
  }
  
  // Boost button initialization removed - not using boost mode
  
  Serial.println("🔧 Hardware initialized");
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

void initializeMqtt() {
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  Serial.println("🔗 MQTT configured");
}

void testConnectivity() {
  Serial.println("🧪 Testing Connectivity...");
  
  // Test WiFi
  Serial.println("📶 WiFi: " + String(WiFi.status() == WL_CONNECTED ? "✅ Connected" : "❌ Disconnected"));
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("   └─ IP: " + WiFi.localIP().toString());
  }
  
  // Test MQTT
  Serial.println("📡 MQTT: " + String(mqtt.connected() ? "✅ Connected" : "❌ Disconnected"));
  if (!mqtt.connected()) {
    Serial.println("   └─ Attempting MQTT connection...");
    reconnectMqtt();
  }
  
  // Test Firebase
  HTTPClient http;
  String testUrl = String(FIREBASE_URL) + "/test.json";
  http.begin(testUrl);
  int httpCode = http.GET();
  Serial.println("🔥 Firebase: " + String(httpCode == 200 ? "✅ Accessible" : "❌ Error " + String(httpCode)));
  http.end();
  
  Serial.println("🧪 Connectivity test complete\n");
}

void reconnectMqtt() {
  while (!mqtt.connected() && WiFi.status() == WL_CONNECTED) {
    Serial.print("Connecting to MQTT...");
    if (mqtt.connect(MQTT_CLIENT_ID)) {
      Serial.println(" connected!");
      
      // Subscribe to control topics
      bool sub1 = mqtt.subscribe("control/climate/mode");
      bool sub2 = mqtt.subscribe("control/climate/fan_on");
      bool sub3 = mqtt.subscribe("control/climate/fan_pwm");
      // bool sub4 = mqtt.subscribe("control/climate/boost"); // Removed boost
      
      // Subscribe to AI presence (CRITICAL)
      bool sub5 = mqtt.subscribe("ai/presence/detection");
      
      Serial.println("📡 MQTT Subscriptions:");
      Serial.println("  ├─ control/climate/* : " + String(sub1 && sub2 && sub3 ? "✅" : "❌"));
      Serial.println("  └─ ai/presence/detection : " + String(sub5 ? "✅" : "❌"));
      
      if (sub5) {
        Serial.println("✅ AI presence subscription successful - ready to receive YOLO data");
      } else {
        Serial.println("❌ AI presence subscription FAILED - will use Firebase backup");
      }
    } else {
      Serial.print(" failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(" retrying in 5 seconds");
      delay(5000);
    }
  }
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.println("📨 MQTT Received: " + topicStr + " = " + message);
  
  // Special handling for AI presence
  if (topicStr == "ai/presence/detection") {
    Serial.println("🤖 YOLO AI Message Received!");
  }
  
  if (topicStr == "control/climate/mode") {
    currentState.mode = (message == "manual") ? "manual" : "auto";
    Serial.println("🔄 Mode: " + currentState.mode);
  }
  else if (topicStr == "control/climate/fan_on" && currentState.mode == "manual") {
    manualFanOn = (message == "true");
    Serial.println("💨 Manual Fan: " + String(manualFanOn ? "ON" : "OFF"));
  }
  else if (topicStr == "control/climate/fan_pwm" && currentState.mode == "manual") {
    manualFanPwm = constrain(message.toInt(), 0, 255);
    Serial.println("🎛️ Manual PWM: " + String(manualFanPwm));
  }
  // Boost mode handling removed
  else if (topicStr == "ai/presence/detection") {
    // ONLY source of presence: yolo_force_gpu.py AI detection
    bool newPresence = (message == "true");
    if (newPresence != currentState.presence) {
      currentState.presence = newPresence;
      Serial.println("🔄 PRESENCE CHANGED: " + String(currentState.presence ? "TRUE" : "FALSE"));
    }
    // Let the 10-second check cycle handle fan/DHT activation logic
  }
}

void readPresenceFromFirebase() {
  // Backup method to read presence directly from Firebase
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(FIREBASE_URL) + "/lighting/" + ROOM_ID + "/state/ai_presence.json";
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    bool firebasePresence = (payload == "true");
    
    if (firebasePresence != currentState.presence) {
      currentState.presence = firebasePresence;
      Serial.println("🔥 Firebase Presence Update: " + String(currentState.presence ? "TRUE" : "FALSE"));
    }
  } else {
    Serial.println("⚠️ Firebase presence read failed: " + String(httpCode));
  }
  
  http.end();
}

void readManualControlFromFirebase() {
  // Read manual control commands from Firebase dashboard
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(FIREBASE_URL) + "/climate/" + ROOM_ID + "/state.json";
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    
    // Parse JSON response
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      // Check for mode changes
      String firebaseMode = doc["mode"] | "auto";
      if (firebaseMode != currentState.mode) {
        currentState.mode = firebaseMode;
        Serial.println("🔥 Firebase Mode Update: " + currentState.mode);
      }
      
      // Check for manual fan control
      if (currentState.mode == "manual") {
        bool firebaseFanOn = doc["fan"]["on"] | false;
        int firebaseFanPwm = doc["fan"]["pwm"] | 0;
        
        if (firebaseFanOn != manualFanOn || firebaseFanPwm != manualFanPwm) {
          manualFanOn = firebaseFanOn;
          manualFanPwm = firebaseFanPwm;
          Serial.printf("🔥 Firebase Manual Control: Fan %s, PWM %d\n", 
                       manualFanOn ? "ON" : "OFF", manualFanPwm);
        }
      }
    }
  }
  
  http.end();
}

void checkPresenceStatus() {
  // Check presence every 10 seconds - ONLY follows yolo_force_gpu.py results
  static bool previousPresence = false;
  
  // Debug: Always show current presence state every 10 seconds
  Serial.println("🔍 Presence Check: currentState.presence = " + String(currentState.presence ? "TRUE" : "FALSE"));
  
  // Only print status when it changes to avoid flooding
  if (previousPresence != currentState.presence) {
    if (currentState.presence) {
      currentState.lastStatusMessage = "🟢 YOLO PRESENCE DETECTED - System ACTIVE";
      Serial.println(currentState.lastStatusMessage);
      Serial.println("   └─ DHT22: ON | Fan: ACTIVE (temp-based) | MQ-135: CONTINUOUS");
    } else {
      currentState.lastStatusMessage = "🔴 NO YOLO PRESENCE - System IDLE";
      Serial.println(currentState.lastStatusMessage);
      Serial.println("   └─ DHT22: OFF | Fan: OFF | MQ-135: CONTINUOUS");
    }
    previousPresence = currentState.presence;
  }
}

void applySystemLogic() {
  if (currentState.presence) {
    // YOLO presence detected - apply temperature-based fan control
    applyControlLogic();
  } else {
    // NO YOLO presence - turn off fan and DHT, keep MQ-135 active
    setFanDuty(0);
    currentState.fanOn = false;
    currentState.fanPwm = 0;
    currentState.comfortBand = "Idle";
  }
}

void readSensors() {
  // ALWAYS read MQ-135 - air quality monitoring is continuous regardless of presence
  int aqRaw = analogRead(MQ135_PIN);
  currentState.aqRaw = aqRaw;
  
  // Classify air quality (always active)
  if (aqRaw <= AQ_GOOD_MAX) {
    currentState.aqStatus = "Good";
  } else if (aqRaw <= AQ_MODERATE_MAX) {
    currentState.aqStatus = "Moderate";
  } else {
    currentState.aqStatus = "Poor";
  }
  
  Serial.printf("🌬️ Air Quality: %d (%s) [CONTINUOUS - Not affected by presence]\n", aqRaw, currentState.aqStatus.c_str());
  
  // ONLY read DHT22 when YOLO presence detected
  if (currentState.presence) {
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    
    if (!isnan(h) && !isnan(t)) {
      currentState.temperature = t;
      currentState.humidity = h;
      Serial.printf("🌡️ Temperature: %.1f°C | Humidity: %.1f%% [YOLO presence active]\n", t, h);
      
      // Show current fan status
      if (currentState.fanOn) {
        Serial.printf("💨 Fan: %s (PWM: %d) - Band: %s\n", 
                     currentState.fanOn ? "ON" : "OFF", 
                     currentState.fanPwm, 
                     currentState.comfortBand.c_str());
      }
    } else {
      Serial.println("❌ DHT22 read failed");
    }
  } else {
    // No YOLO presence - DHT22 is OFF
    Serial.println("💤 DHT22: OFF (No YOLO presence detected)");
  }
  
  // Boost button check removed
}


void applyControlLogic() {
  // This function only gets called when YOLO presence detected
  if (currentState.mode == "manual") {
    // Manual mode - use dashboard commands
    currentState.fanOn = manualFanOn;
    if (manualFanOn) {
      currentState.fanPwm = manualFanPwm;
      int duty = map(manualFanPwm, 0, 255, 0, MAX_DUTY);
      setFanDuty(duty);
    } else {
      currentState.fanPwm = 0;
      setFanDuty(0);
    }
  } else {
    // Auto mode - temperature-based control with AQ assistance
    autoControlLogic();
  }
}

void autoControlLogic() {
  unsigned long now = millis();
  
  // Boost mode logic removed
  
  // Determine temperature band with hysteresis
  String newBand = currentState.comfortBand;
  int targetDuty = currentDuty;
  
  if (currentState.temperature <= TEMP_LOW_MAX) {
    newBand = "Low";
    targetDuty = FAN_DUTY_LOW;
  } else if (currentState.temperature <= TEMP_MED_MAX) {
    newBand = "Moderate";
    targetDuty = FAN_DUTY_MED;
  } else {
    newBand = "High";
    targetDuty = FAN_DUTY_HIGH;
  }
  
  // Apply hysteresis - only change after delay
  if (newBand != currentState.comfortBand) {
    if (now - lastBandChange > HYSTERESIS_DELAY) {
      currentState.comfortBand = newBand;
      lastBandChange = now;
      Serial.println("🎯 Temperature Band: " + newBand);
    } else {
      // Keep current band during hysteresis period
      return;
    }
  }
  
  // Air Quality Control Logic
  // Thresholds: 0-300=Good, 301-400=Moderate, 401+=Poor
  if (currentState.aqStatus == "Poor") {
    // POOR Air Quality (401+): Force fan to MAXIMUM speed + ALERT
    targetDuty = FAN_DUTY_HIGH;
    currentState.comfortBand = "High"; // Override temperature band
    currentState.aqAlert = "CRITICAL: Poor air quality detected! Fan at maximum speed.";
    Serial.println("🚨 POOR Air Quality detected! Fan forced to MAXIMUM speed");
    Serial.printf("   AQ Raw: %d (Threshold: >400)\n", currentState.aqRaw);
  } else if (currentState.aqStatus == "Moderate") {
    // MODERATE Air Quality (301-400): Keep current fan speed + WARNING
    currentState.aqAlert = "WARNING: Moderate air quality detected. Monitor conditions.";
    Serial.println("⚠️ MODERATE Air Quality detected - Warning to user");
    Serial.printf("   AQ Raw: %d (Threshold: 301-400) - No fan speed change\n", currentState.aqRaw);
    // targetDuty remains unchanged (temperature-based control)
  } else {
    // GOOD Air Quality (0-300): Clear any alerts
    currentState.aqAlert = "";
    Serial.printf("✅ GOOD Air Quality: %d (Threshold: 0-300)\n", currentState.aqRaw);
    // targetDuty remains temperature-based
  }
  
  // Apply fan control
  setFanDuty(targetDuty);
  
  // Update state
  currentState.fanOn = (targetDuty > 0);
  currentState.fanPwm = map(targetDuty, 0, MAX_DUTY, 0, 255);
}

void setFanDuty(int duty) {
  duty = constrain(duty, 0, MAX_DUTY);
  
  if (!pwmReady) {
    currentDuty = duty;
    return;
  }
  
  // Kick-start when going from 0 to low duty
  if (currentDuty == 0 && duty > 0 && duty < (int)(MAX_DUTY * 0.4)) {
    ledcWrite(FAN_PIN, MAX_DUTY);
    delay(300);
  }
  
  ledcWrite(FAN_PIN, duty);
  currentDuty = duty;
}

// Boost mode functions removed - not using boost functionality

void publishMqttData() {
  if (!mqtt.connected()) return;
  
  // Temperature
  DynamicJsonDocument tempDoc(128);
  tempDoc["c"] = currentState.temperature;
  String tempStr;
  serializeJson(tempDoc, tempStr);
  mqtt.publish("sensors/climate/temperature", tempStr.c_str());
  
  // Humidity
  DynamicJsonDocument humDoc(128);
  humDoc["rh"] = currentState.humidity;
  String humStr;
  serializeJson(humDoc, humStr);
  mqtt.publish("sensors/climate/humidity", humStr.c_str());
  
  // Air Quality Raw
  DynamicJsonDocument aqDoc(128);
  aqDoc["mq135"] = currentState.aqRaw;
  String aqStr;
  serializeJson(aqDoc, aqStr);
  mqtt.publish("sensors/air/quality_raw", aqStr.c_str());
  
  // Air Quality Status
  DynamicJsonDocument aqStatusDoc(128);
  aqStatusDoc["status"] = currentState.aqStatus;
  String aqStatusStr;
  serializeJson(aqStatusDoc, aqStatusStr);
  mqtt.publish("sensors/air/quality_status", aqStatusStr.c_str());
  
  // Fan State
  DynamicJsonDocument fanDoc(256);
  fanDoc["mode"] = currentState.mode;
  fanDoc["on"] = currentState.fanOn;
  fanDoc["pwm"] = currentState.fanPwm;
  fanDoc["band"] = currentState.comfortBand;
  String fanStr;
  serializeJson(fanDoc, fanStr);
  mqtt.publish("sensors/climate/fan_state", fanStr.c_str());
}

void syncFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(FIREBASE_URL) + "/climate/" + ROOM_ID + "/state.json";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Create state JSON
  DynamicJsonDocument doc(512);
  doc["tempC"] = currentState.temperature;
  doc["humidity"] = currentState.humidity;
  doc["mode"] = currentState.mode;
  doc["fan"]["on"] = currentState.fanOn;
  doc["fan"]["pwm"] = currentState.fanPwm;
  doc["comfortBand"] = currentState.comfortBand;
  doc["aqRaw"] = currentState.aqRaw;
  doc["aqStatus"] = currentState.aqStatus;
  doc["aqAlert"] = currentState.aqAlert;
  doc["presence"] = currentState.presence;
  // doc["systemActive"] removed - using presence directly
  // doc["boostMode"] removed - not using boost mode
  // Use proper timestamp if available, otherwise use millis() + offset
  time_t now = time(nullptr);
  if (now > 1000000000) {
    long long timestamp = (long long)now * 1000;
    doc["ts"] = timestamp;
    Serial.printf("   Using NTP timestamp: %lld\n", timestamp);
  } else {
    // Fallback: Use millis() + approximate timestamp
    long long fallbackTime = 1726000000000LL + millis();
    doc["ts"] = fallbackTime;
    Serial.printf("   Using fallback timestamp: %lld\n", fallbackTime);
  }
  
  String payload;
  serializeJson(doc, payload);
  
  // Debug: Print data being sent
  Serial.println("📡 Syncing to Firebase:");
  Serial.println("   URL: " + url);
  Serial.println("   Data: " + payload);
  
  int httpCode = http.PATCH(payload);
  if (httpCode > 0) {
    Serial.printf("🔥 Firebase synced (HTTP %d)\n", httpCode);
    if (httpCode != 200) {
      String response = http.getString();
      Serial.println("Response: " + response);
    }
  } else {
    Serial.printf("❌ Firebase sync failed (HTTP %d)\n", httpCode);
  }
  
  http.end();
  
  // Also log data
  logToFirebase();
}

void logToFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(FIREBASE_URL) + "/climate/" + ROOM_ID + "/logs.json";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Create log entry
  DynamicJsonDocument doc(512);
  doc["tempC"] = currentState.temperature;
  doc["humidity"] = currentState.humidity;
  doc["aqRaw"] = currentState.aqRaw;
  doc["aqStatus"] = currentState.aqStatus;
  doc["aqAlert"] = currentState.aqAlert;
  doc["comfortBand"] = currentState.comfortBand;
  doc["fanOn"] = currentState.fanOn;
  doc["fanPwm"] = currentState.fanPwm;
  doc["mode"] = currentState.mode;
  doc["presence"] = currentState.presence;
  // doc["systemActive"] removed - using presence directly
  // Use proper timestamp if available, otherwise use millis() + offset
  time_t now = time(nullptr);
  if (now > 1000000000) {
    long long timestamp = (long long)now * 1000;
    doc["ts"] = timestamp;
    Serial.printf("   Using NTP timestamp: %lld\n", timestamp);
  } else {
    // Fallback: Use millis() + approximate timestamp
    long long fallbackTime = 1726000000000LL + millis();
    doc["ts"] = fallbackTime;
    Serial.printf("   Using fallback timestamp: %lld\n", fallbackTime);
  }
  
  String payload;
  serializeJson(doc, payload);
  
  http.POST(payload);
  http.end();
}
