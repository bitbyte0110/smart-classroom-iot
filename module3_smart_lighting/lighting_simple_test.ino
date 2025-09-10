/*
 * Smart Lighting - Simple Test (No Firebase Dependencies)
 * ESP32: LDR -> GPIO34, LED -> GPIO18
 * Test hardware first, then add Firebase later
 */

// Pin definitions
const int LDR_PIN = 34;      // LDR AO -> GPIO34 (ADC input-only)
const int LED_PIN = 18;      // LED PWM -> GPIO18

// System constants
const int BRIGHT_THRESHOLD = 2800;
const int DARK_THRESHOLD = 3200;
const int PWM_FREQ = 5000;
const int PWM_RESOLUTION = 8;
const int MAX_PWM = 255;

// System state
bool ai_presence = false;      // Simulated AI presence
int ai_people_count = 0;       // Simulated people count
int ldrRaw = 0;               // LDR reading
bool ledOn = false;           // LED state
int ledPwm = 0;              // LED brightness

// LDR filtering
int ldrHistory[5] = {0};
int ldrHistoryIndex = 0;
bool ldrHistoryFull = false;

// Timing variables
unsigned long lastUpdate = 0;
const unsigned long UPDATE_INTERVAL = 2000; // 2 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("🏫 Smart Lighting - Hardware Test");
  Serial.println("=================================");
  
  // Initialize pins
  pinMode(LDR_PIN, INPUT);
  
  // Initialize PWM (compatible with ESP32 core 3.x)
  ledcAttach(LED_PIN, PWM_FREQ, PWM_RESOLUTION);
  
  Serial.println("✅ Hardware initialized!");
  Serial.println("📊 Testing LDR + LED control...");
  Serial.println("🎯 Logic: Simulate AI presence to test LED");
  Serial.println();
}

void loop() {
  unsigned long now = millis();
  
  // Read LDR sensor
  readLocalSensors();
  
  // Simulate AI presence detection (for testing)
  simulateAIPresence();
  
  // Update LED based on simulated AI + LDR
  updateLEDState();
  
  // Print status every 2 seconds
  if (now - lastUpdate > UPDATE_INTERVAL) {
    printStatus();
    lastUpdate = now;
  }
  
  delay(100);
}

void readLocalSensors() {
  // Read LDR with filtering
  int ldrRawReading = analogRead(LDR_PIN);
  ldrRaw = filterLDR(ldrRawReading);
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

void simulateAIPresence() {
  // Simulate AI detection every 10 seconds
  unsigned long now = millis();
  int cycle = (now / 10000) % 3; // 30-second cycle
  
  switch(cycle) {
    case 0:
      ai_presence = true;
      ai_people_count = 1;
      break;
    case 1:
      ai_presence = false;
      ai_people_count = 0;
      break;
    case 2:
      ai_presence = true;
      ai_people_count = 2;
      break;
  }
}

void updateLEDState() {
  // Smart lighting logic: AI presence + LDR
  if (ai_presence && ldrRaw > DARK_THRESHOLD) {
    // AI detects person + Dark room → LED ON
    ledOn = true;
    ledPwm = mapLDRToPWM(ldrRaw);
  } else if (!ai_presence || ldrRaw < BRIGHT_THRESHOLD) {
    // No person OR bright room → LED OFF
    ledOn = false;
    ledPwm = 0;
  }
  // Between thresholds → maintain current state (hysteresis)
  
  // Apply PWM guardrails
  ledPwm = constrain(ledPwm, 0, MAX_PWM);
  if (!ledOn) {
    ledPwm = 0;
  }
  
  // Update actual LED
  ledcWrite(LED_PIN, ledPwm);
}

int mapLDRToPWM(int ldrValue) {
  // Map LDR reading to PWM (darker = brighter)
  return constrain(map(4095 - ldrValue, 0, 4095, 0, MAX_PWM), 0, MAX_PWM);
}

void printStatus() {
  Serial.println("📊 SMART LIGHTING STATUS:");
  Serial.println("├─ AI Presence: " + String(ai_presence ? "DETECTED" : "none"));
  Serial.println("├─ AI People Count: " + String(ai_people_count));
  Serial.println("├─ LDR Raw: " + String(ldrRaw) + " (0-4095)");
  
  // LDR interpretation
  String ldrStatus;
  if (ldrRaw < BRIGHT_THRESHOLD) {
    ldrStatus = "BRIGHT";
  } else if (ldrRaw > DARK_THRESHOLD) {
    ldrStatus = "DARK";
  } else {
    ldrStatus = "MEDIUM";
  }
  Serial.println("├─ Light Level: " + ldrStatus);
  
  Serial.println("├─ LED State: " + String(ledOn ? "ON" : "OFF"));
  Serial.println("└─ LED PWM: " + String(ledPwm) + "/255");
  
  // Smart logic explanation
  Serial.println();
  Serial.println("🧠 SMART LOGIC:");
  if (ai_presence && ldrRaw > DARK_THRESHOLD) {
    Serial.println("   ✅ AI detects person + Dark room = LED ON");
  } else if (!ai_presence) {
    Serial.println("   ⭕ No person detected = LED OFF");
  } else if (ldrRaw < BRIGHT_THRESHOLD) {
    Serial.println("   ☀️ Room too bright = LED OFF");
  } else {
    Serial.println("   🔄 Hysteresis zone = Maintain current state");
  }
  
  Serial.println("═══════════════════════════════════════");
}
