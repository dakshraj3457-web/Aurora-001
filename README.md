# AURORA-01 | Autonomous Spacecraft Mission Control

A complete, modern, mobile-first spacecraft monitoring and control application engineered for school and university aerospace CubeSat prototypes.

---

## 1. Hardware Subsystems Supported

| Subsystem | Sensor / Actuator | Arduino UNO Pinout | Telemetry Metric |
| :--- | :--- | :--- | :--- |
| **Power Management** | INA219 High-Side Shunt | I2C (SDA -> A4, SCL -> A5) | Bus Voltage (V), Current (mA), Power (W) |
| **Attitude / IMU** | MPU6050 6-DoF Gyro/Accel | I2C (SDA -> A4, SCL -> A5) | 3-Axis Orientation (Pitch, Roll, Yaw) |
| **Solar Flux** | LDR Photoresistor | Analog Pin A0 (with 10kΩ divider) | Solar Irradiance (Lux) |
| **Obstacle Detection** | HC-SR04 Ultrasonic | Trig -> Pin 9, Echo -> Pin 10 | Distance Range (cm) |
| **Solar Wing Actuator** | SG90 Micro Servo | Digital Pin 3 (PWM) | Solar Tracking Angle (0°–180°) |
| **Telemetry Downlink** | HC-05 Bluetooth / BLE | Pins 10 (RX) & 11 (TX) | 9600 bps serial packet stream |
| **Optical Imager** | OV7670 via ESP32-S3 | Autonomous Wi-Fi Subsystem | Event photo captures (VGA/QQVGA) |

---

## 2. Telemetry Packet Protocol

The Arduino flight controller streams newline-terminated CSV records:
```
DATA,light,distance,voltage,current,tilt,mode,alert,servo\n
```

### Example Telemetry Packet:
```
DATA,1420,42.5,7.82,418,3.2:-1.8:12.4,NORMAL,NONE,90\n
```

### Telemetry Uplink Commands:
- `NORMAL\n` — Restores nominal autonomous orbital schedule.
- `POWER_SAVE\n` — Slows polling rate to conserve bus current.
- `SAFE_MODE\n` — Locks solar orientation towards the sun; powers down payloads.
- `COURSE_CHANGE\n` — Arms attitude thrusters / stabilization loop.
- `RESUME\n` — Clears operator holds.

Controller acknowledgement replies:
```
ACK:MODE_CHANGED_NORMAL\n
```

---

## 3. Communication Transports

1. **Demo Mode**: Built-in deterministic orbital physics engine with simulated day/night transitions, INA219 power dynamics, and MPU6050 drift.
2. **Web Bluetooth (BLE)**: Connects to HM-10, AT-09, or ESP32-S3 BLE wireless UART modules directly from Android Chrome.
3. **Web Serial API**: Connects to Arduino UNO via USB cable (OTG adapter on Android) or paired Bluetooth Virtual COM ports.
4. **Wi-Fi Server**: Connects to the ESP32-S3 camera and telemetry server (default: `http://192.168.4.1`).

---

## 4. Running the Application

### Development:
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in Chrome on Android or desktop.

### Unit Tests:
Run fast native unit tests for telemetry parsing and anomaly detection:
```bash
node --test src/utils/telemetryParser.test.ts
node --test src/utils/telemetryMath.test.ts
```
