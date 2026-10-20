# AURORA-01 USB OTG Hardware Serial Protocol Specification

## Physical Hardware Link
- **Host Device**: Android Smartphone running AURORA-01 Native APK (Target SDK 33, Min SDK 21).
- **Physical Link**: Android Phone → USB-C/Micro-USB OTG Adapter → USB-A to USB-B Data Cable → Arduino UNO (ATmega328P).
- **Hardware Serial Port**: Arduino UNO Hardware Serial (Pins 0/1 bridged to onboard ATmega16U2/CH340 USB-UART bridge).
- **Baud Rate**: 9600 bps (default, configurable to 19200, 38400, 57600, 115200 in settings).
- **Data Bits**: 8
- **Parity**: None
- **Stop Bits**: 1
- **Flow Control**: DTR / RTS handled during connection.
- **Message Framing**: Single-line ASCII formatted JSON terminated by newline (`\n` or `\r\n`).

---

## 1. Downlink Telemetry (Arduino UNO → Android App)

Telemetry packets are emitted periodically (e.g. 500ms / 2 Hz). Each telemetry line is a valid JSON object.

### Format:
```json
{
  "type": "telemetry",
  "ldrLeft": 420,
  "ldrCenter": 510,
  "ldrRight": 390,
  "distanceCm": 32.5,
  "tiltX": 2.4,
  "tiltY": -1.8,
  "servoAngle": 90,
  "voltage": 7.42,
  "currentMA": 120,
  "hazard": false,
  "mode": "NORMAL"
}
```

### Fields:
| Field | Type | Description | Safe Range |
|---|---|---|---|
| `type` | string | Constant `"telemetry"` | - |
| `ldrLeft` | integer | Left LDR ADC reading (0–1023) | 0–1023 |
| `ldrCenter` | integer | Center LDR ADC reading (0–1023) | 0–1023 |
| `ldrRight` | integer | Right LDR ADC reading (0–1023) | 0–1023 |
| `distanceCm` | float | HC-SR04 ultrasonic range in cm | 2.0–400.0 |
| `tiltX` | float | MPU6050 Pitch tilt in degrees | -90.0 to +90.0 |
| `tiltY` | float | MPU6050 Roll tilt in degrees | -90.0 to +90.0 |
| `servoAngle` | integer | SG90 Solar array servo position | 0–180 |
| `voltage` | float | INA219 2S bus voltage in Volts | 6.0–8.4 V |
| `currentMA` | integer | INA219 bus current in mA | 0–1000 mA |
| `hazard` | boolean | Spacecraft hazard active flag | `true` / `false` |
| `mode` | string | Current mission mode | `NORMAL`, `POWER_SAVE`, `SAFE` |

---

## 2. Uplink Commands (Android App → Arduino UNO)

Commands are plain ASCII strings terminated by newline (`\n`).

### Available Commands:
1. `MODE:NORMAL\n`: Transition spacecraft into full-power normal telemetry mode.
2. `MODE:POWER_SAVE\n`: Transition spacecraft to low-current mode.
3. `MODE:SAFE\n`: Transition spacecraft to emergency safe standby mode.
4. `SERVO:<angle>\n`: Steer solar array servo (angle must be between `0` and `180`).
5. `PING\n`: Heartbeat / link check.

---

## 3. Command Acknowledgements (Arduino UNO → Android App)

The app validates command execution **only** when an acknowledgement packet is received:

### Success Acknowledgement:
```json
{"type":"ack","command":"MODE:NORMAL","status":"OK"}
```
```json
{"type":"ack","command":"SERVO:90","status":"OK"}
```

### Heartbeat Response:
```json
{"type":"pong"}
```

### Command Rejection:
```json
{"type":"ack","command":"SERVO:250","status":"REJECTED_OUT_OF_BOUNDS"}
```

---

## 4. Hardware Safety Rules
1. **Never Power Servos or Actuators Directly From Phone USB**: An Android phone's OTG port only supplies ~500mA @ 5V. Servo stall currents can trigger phone USB host controller trip or reboot. Always power high-draw loads from an external 5V regulated battery/power rail.
2. **Offline Independence**: The USB connection is 100% offline. No cellular, Wi-Fi, or internet connection is required or used for telemetry.
3. **No Phantom Readings**: When the cable is disconnected or packets stop, the app displays `--` for sensor values and shows `STALE` indicator.
