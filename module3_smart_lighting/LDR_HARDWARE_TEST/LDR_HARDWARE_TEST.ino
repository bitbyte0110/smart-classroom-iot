int ldrPin = 34;   // LDR connected to analog input pin 34
int ledPin = 18;   // LED connected to digital pin 18

void setup() {
  Serial.begin(115200);       // Start serial monitor
  pinMode(ledPin, OUTPUT);    // Set LED pin as output
}

void loop() {
  int ldrValue = analogRead(ldrPin);  // Read LDR value (0–4095 on ESP32)
  Serial.println(ldrValue);

  // Turn LED ON if it's dark (value > threshold)
  if (ldrValue > 2000) {  
    digitalWrite(ledPin, HIGH);   // LED ON
  } else {
    digitalWrite(ledPin, LOW);    // LED OFF
  }

  delay(200);  // Small delay for stability
}
