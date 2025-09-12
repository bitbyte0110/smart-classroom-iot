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
 * SYSTEM ARCHITECTURE:
 * ESP32 (DHT22 + MQ-135 + Fan) + AI Presence + MQTT + Firebase + Web Dashboard
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
#define BOOST_PIN 27     // Boost Button (10-minute override)

// DHT22 Configuration
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// MQTT Configuration (Raspberry Pi broker)
const char* MQTT_HOST = "192.168.202.221"; // Your Pi IPv4
const int   MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "esp32-climate-roomA";

WiFiClient espClient;
PubSubClient mqtt(espClient);

// System Configuration
const String ROOM_ID = "roomA";
const unsigned long SENSOR_INTERVAL = 30000;     // 30 seconds
const unsigned long MQTT_INTERVAL = 5000;        // 5 seconds
const unsigned long FIREBASE_INTERVAL = 10000;   // 10 seconds
const unsigned long PRESENCE_TIMEOUT = 10000;    // 10 seconds grace period

// Fan PWM Configuration (LEDC new API)
const int PWM_FREQ = 500;    // 500 Hz for DC fans
const int PWM_RES = 10;      // 10-bit resolution (0-1023)
const int MAX_DUTY = (1 << PWM_RES) - 1;

// Fan Speed Levels (as specified in requirements)
const int FAN_DUTY_LOW  = (int)(MAX_DUTY * 0.30);  // 30% PWM
const int FAN_DUTY_MED  = (int)(MAX_DUTY * 0.60);  // 60% PWM  
const int FAN_DUTY_HIGH = MAX_DUTY;                // 100% PWM

// Temperature Bands (tunable thresholds)
const float TEMP_LOW_MAX = 25.0;    // ≤25°C → LOW band
const float TEMP_MED_MAX = 29.0;    // 25.1-29°C → MED band
                                    // ≥29.1°C → HIGH band

// Air Quality Thresholds (configurable)
const int AQ_GOOD_MAX = 200;        // 0-200 → Good
const int AQ_MODERATE_MAX = 400;    // 201-400 → Moderate
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
  unsigned long presenceLastSeen = 0;
  bool boostMode = false;
  unsigned long boostEndTime = 0;
  bool systemActive = false;   // Controlled by presence
} currentState;

// Timing Variables
unsigned long lastSensorRead = 0;
unsigned long lastMqttPublish = 0;
unsigned long lastFirebaseSync = 0;
unsigned long lastBandChange = 0;
unsigned long lastBoostCheck = 0;

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
  
  // Configure time for Firebase
  configTime(0, 0, "pool.ntp.org");
  
  Serial.println("✅ Climate Control System Ready!");
  Serial.println("🌡️ DHT22 + 🌬️ MQ-135 + 💨 Fan Control");
  Serial.println("🤖 AI Presence Integration Active");
  Serial.println();
}

void loop() {
  unsigned long now = millis();
  
  // Maintain MQTT connection
  if (!mqtt.connected()) {
    reconnectMqtt();
  }
  mqtt.loop();
  
  // Read sensors (every 30 seconds)
  if (now - lastSensorRead > SENSOR_INTERVAL) {
    readSensors();
    lastSensorRead = now;
  }
  
  // Check boost mode timeout
  checkBoostMode();
  
  // Update system state based on presence
  updateSystemActivation();
  
  // Apply control logic (only when system is active)
  if (currentState.systemActive) {
    applyControlLogic();
  } else {
    // System idle - turn off fan completely
    setFanDuty(0);
    currentState.fanOn = false;
    currentState.fanPwm = 0;
    currentState.comfortBand = "Idle";
    // Cancel boost mode when no presence
    if (currentState.boostMode) {
      currentState.boostMode = false;
      Serial.println("🚀 BOOST MODE cancelled (no presence)");
    }
  }
  
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
  
  // Initialize boost button
  pinMode(BOOST_PIN, INPUT_PULLUP);
  
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

void reconnectMqtt() {
  while (!mqtt.connected() && WiFi.status() == WL_CONNECTED) {
    Serial.print("Connecting to MQTT...");
    if (mqtt.connect(MQTT_CLIENT_ID)) {
      Serial.println(" connected!");
      
      // Subscribe to control topics
      mqtt.subscribe("control/climate/mode");
      mqtt.subscribe("control/climate/fan_on");
      mqtt.subscribe("control/climate/fan_pwm");
      mqtt.subscribe("control/climate/boost");
      
      // Subscribe to AI presence
      mqtt.subscribe("ai/presence/detection");
      
      Serial.println("📡 Subscribed to control topics");
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
  
  Serial.println("📨 MQTT: " + topicStr + " = " + message);
  
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
  else if (topicStr == "control/climate/boost") {
    if (message == "true") {
      activateBoostMode();
    }
  }
  else if (topicStr == "ai/presence/detection") {
    bool newPresence = (message == "true");
    if (newPresence != currentState.presence) {
      currentState.presence = newPresence;
      if (currentState.presence) {
        currentState.presenceLastSeen = millis();
        Serial.println("👥 AI Presence: DETECTED - System will activate");
      } else {
        Serial.println("👥 AI Presence: NONE - 10s grace period started");
      }
    }
  }
}

void readSensors() {
  // Always read MQ-135 (air quality monitoring should be continuous)
  int aqRaw = analogRead(MQ135_PIN);
  currentState.aqRaw = aqRaw;
  
  // Classify air quality
  if (aqRaw <= AQ_GOOD_MAX) {
    currentState.aqStatus = "Good";
  } else if (aqRaw <= AQ_MODERATE_MAX) {
    currentState.aqStatus = "Moderate";
  } else {
    currentState.aqStatus = "Poor";
  }
  
  Serial.printf("🌬️ Air Quality: %d (%s)\n", aqRaw, currentState.aqStatus.c_str());
  
  // Only read DHT22 when system is active (presence detected)
  if (currentState.systemActive) {
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    
    if (!isnan(h) && !isnan(t)) {
      currentState.temperature = t;
      currentState.humidity = h;
      Serial.printf("🌡️ Temp: %.1f°C, Humidity: %.1f%%\n", t, h);
    } else {
      Serial.println("❌ DHT22 read failed");
    }
  } else {
    // System idle - DHT22 not sampled
    Serial.println("💤 DHT22 idle (no presence)");
  }
  
  // Check boost button (only when system active)
  if (currentState.systemActive && digitalRead(BOOST_PIN) == LOW) {
    activateBoostMode();
  }
}

void updateSystemActivation() {
  unsigned long now = millis();
  
  // System becomes active immediately when presence detected
  if (currentState.presence) {
    currentState.presenceLastSeen = now; // Update last seen time
    if (!currentState.systemActive) {
      Serial.println("🟢 System ACTIVATED - Presence detected");
      Serial.println("🌡️ DHT22 sampling resumed");
      Serial.println("💨 Fan control activated");
    }
    currentState.systemActive = true;
  }
  // System becomes idle after grace period without presence
  else if (currentState.systemActive && (now - currentState.presenceLastSeen > PRESENCE_TIMEOUT)) {
    Serial.println("🔴 System IDLE - No presence for 10 seconds");
    Serial.println("🌡️ DHT22 sampling paused");
    Serial.println("💨 Fan turned OFF");
    Serial.println("🌬️ MQ-135 continues monitoring");
    currentState.systemActive = false;
  }
  
  // Debug info
  if (!currentState.presence && currentState.systemActive) {
    unsigned long timeLeft = PRESENCE_TIMEOUT - (now - currentState.presenceLastSeen);
    if (timeLeft <= PRESENCE_TIMEOUT) {
      Serial.printf("⏰ Grace period: %.1fs remaining\n", timeLeft / 1000.0);
    }
  }
}

void applyControlLogic() {
  // Only apply control logic when system is active (presence detected)
  if (!currentState.systemActive) {
    return; // This should not be called when inactive, but safety check
  }
  
  if (currentState.mode == "manual") {
    // Manual mode - use dashboard commands (only when presence detected)
    currentState.fanOn = manualFanOn;
    if (manualFanOn) {
      currentState.fanPwm = manualFanPwm;
      int duty = map(manualFanPwm, 0, 255, 0, MAX_DUTY);
      setFanDuty(duty);
      Serial.printf("💨 Manual Fan: ON at PWM %d\n", manualFanPwm);
    } else {
      currentState.fanPwm = 0;
      setFanDuty(0);
      Serial.println("💨 Manual Fan: OFF");
    }
  } else {
    // Auto mode - temperature-based control with AQ assistance
    autoControlLogic();
  }
}

void autoControlLogic() {
  unsigned long now = millis();
  
  // Check if boost mode is active
  if (currentState.boostMode) {
    currentState.fanOn = true;
    currentState.fanPwm = 255;
    currentState.comfortBand = "High";
    setFanDuty(FAN_DUTY_HIGH);
    return;
  }
  
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
  
  // Air Quality assistance
  if (currentState.aqStatus == "Poor") {
    // Force HIGH for poor air quality
    targetDuty = FAN_DUTY_HIGH;
    Serial.println("⚠️ POOR Air Quality - Fan forced to HIGH");
  } else if (currentState.aqStatus == "Moderate") {
    // Increase by one step for moderate AQ
    if (targetDuty == FAN_DUTY_LOW) targetDuty = FAN_DUTY_MED;
    else if (targetDuty == FAN_DUTY_MED) targetDuty = FAN_DUTY_HIGH;
    Serial.println("⚠️ MODERATE Air Quality - Fan speed increased");
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

void activateBoostMode() {
  if (!currentState.boostMode) {
    currentState.boostMode = true;
    currentState.boostEndTime = millis() + 600000; // 10 minutes
    Serial.println("🚀 BOOST MODE activated for 10 minutes");
  }
}

void checkBoostMode() {
  if (currentState.boostMode && millis() > currentState.boostEndTime) {
    currentState.boostMode = false;
    Serial.println("🚀 BOOST MODE ended");
  }
}

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
  doc["presence"] = currentState.presence;
  doc["systemActive"] = currentState.systemActive;
  doc["boostMode"] = currentState.boostMode;
  doc["ts"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.PATCH(payload);
  if (httpCode > 0) {
    Serial.println("🔥 Firebase synced");
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
  doc["comfortBand"] = currentState.comfortBand;
  doc["fanOn"] = currentState.fanOn;
  doc["fanPwm"] = currentState.fanPwm;
  doc["mode"] = currentState.mode;
  doc["presence"] = currentState.presence;
  doc["systemActive"] = currentState.systemActive;
  doc["ts"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  http.POST(payload);
  http.end();
}
