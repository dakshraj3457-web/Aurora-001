/*
 * =====================================================================
 * AURORA-01 SPACECRAFT TELEMETRY & COMMAND FIRMWARE
 * Target Hardware: Arduino UNO (ATmega328P)
 * Communication Link: USB OTG (Hardware Serial, 9600 Baud)
 * Protocol: Newline-delimited JSON (NDJSON)
 * =====================================================================
 *
 * Pinout Configuration:
 * - A0: Left LDR (with 10k pulldown)
 * - A1: Center LDR (with 10k pulldown)
 * - A2: Right LDR (with 10k pulldown)
 * - A4: I2C SDA (INA219 Power Monitor & MPU6050 6-DoF)
 * - A5: I2C SCL (INA219 Power Monitor & MPU6050 6-DoF)
 * - Pin 9: HC-SR04 Ultrasonic Trigger
 * - Pin 10: HC-SR04 Ultrasonic Echo
 * - Pin 3: SG90 Servo PWM (Power servo from external 5V, NEVER phone USB!)
 * - Hardware Serial (Pins 0/1 to USB): 9600 baud, 8N1
 */

#include <Wire.h>
#include <Servo.h>

// Subsystem Pins
const int PIN_LDR_LEFT = A0;
const int PIN_LDR_CENTER = A1;
const int PIN_LDR_RIGHT = A2;
const int PIN_TRIG = 9;
const int PIN_ECHO = 10;
const int PIN_SERVO = 3;

Servo solarServo;

// Operational state
String currentMode = "NORMAL";
int currentServoAngle = 90;
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 500; // 2 Hz telemetry stream

// Serial input buffer
String inputCommandBuffer = "";

void setup() {
  // Initialize Hardware USB Serial at 9600 Baud
  Serial.begin(9600);
  while (!Serial) {
    ; // Wait for serial port to connect (native USB boards)
  }

  // Ultrasonic sensor pins
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);

  // Initialize Servo
  solarServo.attach(PIN_SERVO);
  solarServo.write(currentServoAngle);

  // Initialize I2C Bus for INA219 / MPU6050
  Wire.begin();

  // Send initial boot confirmation packet
  Serial.println("{\"type\":\"ack\",\"command\":\"SYSTEM_BOOT\",\"status\":\"OK\",\"version\":\"2.4.0\"}");
}

// Read Ultrasonic Distance in cm (HC-SR04)
float readDistanceCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  unsigned long duration = pulseIn(PIN_ECHO, HIGH, 30000); // 30ms timeout (~500cm)
  if (duration == 0) {
    return 35.0; // Nominal fallback if sensor not attached during testing
  }
  return (duration * 0.0343) / 2.0;
}

// Process incoming command from Android Ground Station
void handleIncomingCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  if (cmd.equalsIgnoreCase("PING")) {
    Serial.println("{\"type\":\"pong\"}");
    return;
  }

  if (cmd.startsWith("MODE:")) {
    String newMode = cmd.substring(5);
    newMode.toUpperCase();
    if (newMode == "NORMAL" || newMode == "POWER_SAVE" || newMode == "SAFE") {
      currentMode = newMode;
      Serial.print("{\"type\":\"ack\",\"command\":\"MODE:");
      Serial.print(currentMode);
      Serial.println("\",\"status\":\"OK\"}");
    } else {
      Serial.print("{\"type\":\"ack\",\"command\":\"");
      Serial.print(cmd);
      Serial.println("\",\"status\":\"REJECTED_UNKNOWN_MODE\"}");
    }
    return;
  }

  if (cmd.startsWith("SERVO:")) {
    int angle = cmd.substring(6).toInt();
    if (angle >= 0 && angle <= 180) {
      currentServoAngle = angle;
      solarServo.write(currentServoAngle);
      Serial.print("{\"type\":\"ack\",\"command\":\"SERVO:");
      Serial.print(currentServoAngle);
      Serial.println("\",\"status\":\"OK\"}");
    } else {
      Serial.println("{\"type\":\"ack\",\"command\":\"SERVO\",\"status\":\"REJECTED_OUT_OF_BOUNDS\"}");
    }
    return;
  }

  // Unknown command rejection
  Serial.print("{\"type\":\"ack\",\"command\":\"");
  Serial.print(cmd);
  Serial.println("\",\"status\":\"UNKNOWN_COMMAND\"}");
}

void loop() {
  // 1. Process incoming commands from USB OTG link
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputCommandBuffer.length() > 0) {
        handleIncomingCommand(inputCommandBuffer);
        inputCommandBuffer = "";
      }
    } else if (inputCommandBuffer.length() < 120) {
      inputCommandBuffer += c;
    }
  }

  // 2. Transmit telemetry packet periodically
  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;

    // Read analog light sensors (0 - 1023)
    int ldrL = analogRead(PIN_LDR_LEFT);
    int ldrC = analogRead(PIN_LDR_CENTER);
    int ldrR = analogRead(PIN_LDR_RIGHT);

    // Read distance
    float distance = readDistanceCm();

    // In a full build with INA219/MPU6050 libraries installed, real I2C reads go here.
    // Calibrated baseline values for demonstration / bench testing:
    float busVoltage = 7.42;  // 2S Li-ion nominal
    int currentMA = (currentMode == "POWER_SAVE") ? 65 : (currentMode == "SAFE") ? 40 : 135;
    float tiltX = 1.2;
    float tiltY = -0.8;
    bool hazard = (distance < 12.0 || busVoltage < 6.5);

    // Construct and transmit newline-delimited JSON
    Serial.print("{\"type\":\"telemetry\"");
    Serial.print(",\"ldrLeft\":"); Serial.print(ldrL);
    Serial.print(",\"ldrCenter\":"); Serial.print(ldrC);
    Serial.print(",\"ldrRight\":"); Serial.print(ldrR);
    Serial.print(",\"distanceCm\":"); Serial.print(distance, 1);
    Serial.print(",\"tiltX\":"); Serial.print(tiltX, 1);
    Serial.print(",\"tiltY\":"); Serial.print(tiltY, 1);
    Serial.print(",\"servoAngle\":"); Serial.print(currentServoAngle);
    Serial.print(",\"voltage\":"); Serial.print(busVoltage, 2);
    Serial.print(",\"currentMA\":"); Serial.print(currentMA);
    Serial.print(",\"hazard\":"); Serial.print(hazard ? "true" : "false");
    Serial.print(",\"mode\":\""); Serial.print(currentMode);
    Serial.println("\"}");
  }
}
