int fanPin = 23;  // GPIO 23 connected to transistor base (via resistor)

void setup() {
  pinMode(fanPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Fan test starting...");
}

void loop() {
  Serial.println("Fan ON");
  digitalWrite(fanPin, HIGH);  // Turn fan ON
  delay(5000);                 // Wait 5 seconds

  Serial.println("Fan OFF");
  digitalWrite(fanPin, LOW);   // Turn fan OFF
  delay(5000);                 // Wait 5 seconds
}
