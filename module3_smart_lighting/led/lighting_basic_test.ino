/*
 * Smart Lighting - Basic Hardware Test (No Firebase)
 * Test your hardware connections first before adding Firebase
 */

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

// Timing constants
const unsigned long PIR_STABLE_TIME = 200;       // 200ms
const unsigned long PIR_COOLDOWN = 2000;         // 2 seconds

// System state
bool presence = false;
int ldrRaw = 0;
String mode = "auto";
bool ledOn = false;
int ledPwm = 0;

// PIR debounce variables
unsigned long pirLastHigh = 0;
unsigned long pirCooldownUntil = 0;
bool pirStableHigh = false;

// LDR filtering
int ldrHistory[5] = {0};
int ldrHistoryIndex = 0;
bool ldrHistoryFull = false;

void setup() {
  Serial.begin(115200);
  Serial.println("🏫 Smart Lighting - Basic Hardware Test");
  Serial.println("=====================================");
  
  // Initialize pins
  pinMode(PIR_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  
  // Initialize PWM
  ledcSetup(LED_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(LED_PIN, LED_CHANNEL);
  
  Serial.println("✅ Hardware initialized!");
  Serial.println("📊 Monitoring sensors...");
  Serial.println();
}

void loop() {
  // Read sensors
  readSensors();
  
  // Update LED based on sensors
  updateLEDState();
  
  // Print status every 2 seconds
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 2000) {
    printStatus();
    lastPrint = millis();
  }
  
  delay(100);
}

void readSensors() {
  // Read PIR with debounce
  bool pirRaw = digitalRead(PIR_PIN);
  presence = debouncePIR(pirRaw);
  
  // Read LDR with filtering
  int ldrRawReading = analogRead(LDR_PIN);
  ldrRaw = filterLDR(ldrRawReading);
}

bool debouncePIR(bool currentReading) {
  unsigned long now = millis();
  
  if (currentReading && !pirStableHigh) {
    if (pirLastHigh == 0) {
      pirLastHigh = now;
    } else if (now - pirLastHigh >= PIR_STABLE_TIME) {
      pirStableHigh = true;
      pirCooldownUntil = now + PIR_COOLDOWN;
    }
  } else if (!currentReading) {
    pirLastHigh = 0;
    if (now > pirCooldownUntil) {
      pirStableHigh = false;
    }
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

void updateLEDState() {
  // Auto mode logic with hysteresis
  if (presence && ldrRaw > DARK_THRESHOLD) {
    // Dark room + presence -> LED ON
    ledOn = true;
    ledPwm = mapLDRToPWM(ldrRaw);
  } else if (!presence || ldrRaw < BRIGHT_THRESHOLD) {
    // No presence OR bright room -> LED OFF
    ledOn = false;
    ledPwm = 0;
  }
  // Between thresholds -> maintain current state (hysteresis)
  
  // Apply PWM guardrails
  ledPwm = constrain(ledPwm, 0, MAX_PWM);
  if (!ledOn) {
    ledPwm = 0;
  }
  
  // Update actual LED
  ledcWrite(LED_CHANNEL, ledPwm);
}

int mapLDRToPWM(int ldrValue) {
  // Map LDR reading to PWM (darker = brighter)
  return constrain(map(4095 - ldrValue, 0, 4095, 0, MAX_PWM), 0, MAX_PWM);
}

void printStatus() {
  Serial.println("📊 SENSOR STATUS:");
  Serial.println("├─ PIR Presence: " + String(presence ? "DETECTED" : "none"));
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
  
  // Business logic explanation
  Serial.println();
  Serial.println("🧠 LOGIC:");
  if (presence && ldrRaw > DARK_THRESHOLD) {
    Serial.println("   Presence + Dark = LED ON ✅");
  } else if (!presence) {
    Serial.println("   No presence = LED OFF ⭕");
  } else if (ldrRaw < BRIGHT_THRESHOLD) {
    Serial.println("   Too bright = LED OFF ☀️");
  } else {
    Serial.println("   Hysteresis zone = Maintain state 🔄");
  }
  
  Serial.println("═══════════════════════════════════════");
}
