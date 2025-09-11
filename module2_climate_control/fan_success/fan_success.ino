// ==== WIFI (not used in this test, but left for later MQTT use) ====
#define WIFI_SSID "privacy_2.4G"
#define WIFI_PASS "#RkRs#1920"


// ==== DHT ====
#include <DHT.h>
#define DHTPIN 4
#define DHTTYPE DHT22    // or DHT11 if using that sensor
DHT dht(DHTPIN, DHTTYPE);


// ==== MQ-135 ====
const int MQ_PIN = 34;   // analog input pin


void setup() {
  Serial.begin(115200);


  // Start DHT
  dht.begin();


  // Configure ADC
  analogReadResolution(12);   // ESP32: 0..4095


  Serial.println("DHT + MQ-135 test start");
}


void loop() {
  // --- DHT Read ---
  float h = dht.readHumidity();
  float t = dht.readTemperature(); // Celsius


  if (isnan(h) || isnan(t)) {
    Serial.println("DHT read failed");
  } else {
    Serial.printf("Temp: %.1f C  Hum: %.1f %%\n", t, h);
  }


  // --- MQ-135 Read ---
  int raw = analogRead(MQ_PIN);
  Serial.printf("MQ135 ADC: %d\n", raw);


  Serial.println("----------------------");
  delay(2500);   // >=2s for DHT22, also good for MQ-135 polling
}



