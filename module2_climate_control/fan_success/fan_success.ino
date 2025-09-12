// ===== Combined: DHT22 + MQ-135 + 2-pin Fan (transistor), LEDC new API =====
#include <Arduino.h>
#include <DHT.h>

// ---- WIFI (reserved for future MQTT/Firebase; not used here) ----
#define WIFI_SSID "vivo X200 Ultra"
#define WIFI_PASS "12345678"

// ================== FAN (LEDC new API) ==================
const int FAN_PIN   = 5;    // GPIO to transistor base (via ~1k resistor)
const int PWM_FREQ  = 500;   // 2-wire fans like 250–1000 Hz; start with 500
const int PWM_RES   = 10;    // 10-bit resolution (0..1023)
const int MAX_DUTY  = (1 << PWM_RES) - 1;

// Duty levels (tweak as needed)
const int FAN_DUTY_LOW  = (int)(MAX_DUTY * 0.30);  // ~30%
const int FAN_DUTY_MED  = (int)(MAX_DUTY * 0.60);  // ~60%
const int FAN_DUTY_HIGH = MAX_DUTY;                // 100%

// Kick-start so LOW reliably spins
const uint16_t KICK_DUTY = MAX_DUTY;  // 100%
const uint16_t KICK_MS   = 300;
int currentDuty = 0;

// ================== DHT22 ==================
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// ================== MQ-135 ==================
const int MQ_PIN = 32;   // ADC1_6 on many ESP32 boards
// Helper to print a very rough ppm estimate (optional)
static inline float mq135_ppm_from_raw(int raw) {
  return (2000.0f * raw) / 4095.0f;  // rough placeholder
}

// ---- Air quality thresholds (new spec) ----
const int AQ_LOW_MAX     = 200;   // 0–200 → LOW
const int AQ_MEDIUM_MIN  = 201;   // 201–400 → MED
const int AQ_MEDIUM_MAX  = 400;
const int AQ_HIGH_MIN    = 401;   // ≥401 → HIGH

// Rate-limit warnings so Serial/UI isn’t spammed
unsigned long lastWarnMs   = 0;
unsigned long lastDangerMs = 0;
const unsigned long WARN_COOLDOWN_MS   = 60000; // 60s
const unsigned long DANGER_COOLDOWN_MS = 30000; // 30s

// ================== UI hooks (replace with MQTT later) ==================
void uiWarning(const String& msg) { Serial.println("[UI WARNING] " + msg); }
void uiDanger(const String& msg)  { Serial.println("[UI DANGER]  " + msg); }

// ================== Fan helpers ==================
bool pwmReady = false;

void setFanDuty(int duty) {
  duty = constrain(duty, 0, MAX_DUTY);

  if (!pwmReady) {
    static bool once = false;
    if (!once) { Serial.println("ERROR: LEDC not initialized; cannot drive fan."); once = true; }
    currentDuty = duty;
    return;
  }

  // Kick-start when going from 0 to a low duty
  if (currentDuty == 0 && duty > 0 && duty < (int)(MAX_DUTY * 0.4)) {
    ledcWrite(FAN_PIN, KICK_DUTY);
    delay(KICK_MS);
  }

  ledcWrite(FAN_PIN, duty);
  currentDuty = duty;
}

const char* speedLabel(int duty) {
  if (duty == 0) return "OFF";
  if (duty <= FAN_DUTY_LOW)  return "LOW";
  if (duty <= FAN_DUTY_MED)  return "MEDIUM";
  return "HIGH";
}

// ================== Setup ==================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\nStarting DHT22 + MQ-135 + Fan (LEDC new API)…");

  // Sensors
  dht.begin();
  analogReadResolution(12);   // ESP32 ADC: 0..4095

  // LEDC new API (automatically allocates a channel)
  pwmReady = ledcAttach(FAN_PIN, PWM_FREQ, PWM_RES);
  if (pwmReady)
    Serial.printf("LEDC attached on GPIO %d @ %d Hz, %d-bit\n", FAN_PIN, PWM_FREQ, PWM_RES);
  else
    Serial.println("ERROR: ledcAttach failed");

  // Start LOW until first reading
  setFanDuty(FAN_DUTY_LOW);
}

// ================== Main loop ==================
void loop() {
  // --- Read DHT ---
  float h = dht.readHumidity();
  float t = dht.readTemperature(); // °C
  bool dhtOk = !(isnan(h) || isnan(t));

  if (dhtOk)  Serial.printf("Temp: %.1f C  Hum: %.1f %%\n", t, h);
  else        Serial.println("DHT read failed");

  // --- Read MQ-135 ---
  int raw = analogRead(MQ_PIN);
  float ppmEst = mq135_ppm_from_raw(raw);
  Serial.printf("MQ135 ADC: %d  (~ppm est: %.0f)\n", raw, ppmEst);

  // -------- Decide base fan speed from temperature --------
  int baseDuty = currentDuty;   // default: keep current if DHT failed
  if (dhtOk) {
    if (t <= 26.0f)        baseDuty = FAN_DUTY_LOW;   // ≤ 26.0 → LOW
    else if (t <= 28.0f)   baseDuty = FAN_DUTY_MED;   // 26.1–28.0 → MED
    else                   baseDuty = FAN_DUTY_HIGH;  // ≥ 28.1 → HIGH
  }

  // -------- Air quality effects (new thresholds) --------
  unsigned long now = millis();
  bool overrideHigh = false;

  if (raw >= AQ_HIGH_MIN) {
    // High pollution → force fan HIGH + danger msg
    overrideHigh = true;
    if (now - lastDangerMs > DANGER_COOLDOWN_MS) {
      uiDanger("Air quality HIGH (ADC ≥ 401). Fan forced to MAX!");
      lastDangerMs = now;
    }
  } 
  else if (raw >= AQ_MEDIUM_MIN && raw <= AQ_MEDIUM_MAX) {
    // Medium pollution → warning only, fan unchanged
    if (now - lastWarnMs > WARN_COOLDOWN_MS) {
      uiWarning("Air quality MEDIUM (ADC 201–400). Consider ventilation.");
      lastWarnMs = now;
    }
  }
  // else (0–200) → Low → no action

  int targetDuty = overrideHigh ? FAN_DUTY_HIGH : baseDuty;

  // -------- Apply fan change if needed --------
  if (targetDuty != currentDuty) {
    setFanDuty(targetDuty);
    Serial.printf("Fan -> %s (duty=%d/%d)\n", speedLabel(currentDuty), currentDuty, MAX_DUTY);
  } else {
    Serial.printf("Fan stays %s (duty=%d/%d)\n", speedLabel(currentDuty), currentDuty, MAX_DUTY);
  }

  Serial.println("----------------------");
  delay(2500);  // DHT22 requires ≥2s; also fine for MQ-135 polling
}


