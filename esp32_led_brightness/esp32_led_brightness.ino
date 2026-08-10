#include <WiFi.h>
#include <WebServer.h>

#define LED_FLASH_PIN   4
#define LED_LEDC_CHANNEL 0
#define LED_LEDC_RES     8          // 8-bit -> độ sáng 0-255
#define LED_LEDC_FREQ    5000       // 5 kHz

const char* WIFI_SSID = "ten_wifi";
const char* WIFI_PASS = "mat_khau_wifi";

int brightness = 128;

WebServer server(80);

void setLedBrightness(int value) {
  brightness = constrain(value, 0, 255);
  ledcWrite(LED_LEDC_CHANNEL, brightness);
  Serial.printf("[LED] brightness = %d\n", brightness);
}

void handleSetBrightness() {
  if (!server.hasArg("value")) {
    server.send(400, "text/plain", "Missing 'value' (0-255)");
    return;
  }
  int value = server.arg("value").toInt();
  setLedBrightness(value);
  server.send(200, "application/json",
              "{\"brightness\":" + String(brightness) + "}");
}

void handleGetBrightness() {
  server.send(200, "application/json",
              "{\"brightness\":" + String(brightness) + "}");
}

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);

  ledcSetup(LED_LEDC_CHANNEL, LED_LEDC_FREQ, LED_LEDC_RES);
  ledcAttachPin(LED_FLASH_PIN, LED_LEDC_CHANNEL);
  setLedBrightness(0);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected: " + WiFi.localIP().toString());

  server.on("/led", HTTP_GET, handleGetBrightness);
  server.on("/led/set", HTTP_GET, handleSetBrightness);
  server.begin();
  Serial.println("HTTP server started. Dung: GET /led/set?value=0-255");
}

void loop() {
  server.handleClient();

  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.length() > 0) {
      setLedBrightness(input.toInt());
    }
  }
  delay(10);
}
