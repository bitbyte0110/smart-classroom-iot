/*
 * ESP32 LDR + LED Test
 * LDR -> GPIO34 (ADC)
 * LED -> GPIO18 (Digital Output)
 */

const int LDR_PIN = 34;   // LDR analog pin
const int LED_PIN = 18;   // LED pin
const int THRESHOLD = 2000; // Adjust after testing (0–4095)

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int ldrValue = analogRead(LDR_PIN);  // Read LDR (0-4095)
  Serial.print("LDR Value: ");
  Serial.println(ldrValue);

  if (ldrValue > THRESHOLD) {
    digitalWrite(LED_PIN, HIGH); // Dark -> LED ON
  } else {
    digitalWrite(LED_PIN, LOW);  // Bright -> LED OFF
  }

  delay(200);
}
