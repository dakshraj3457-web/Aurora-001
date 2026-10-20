# AURORA-01 USB OTG Hardware Test Checklist

Use this checklist to verify physical connectivity, USB permissions, and sensor readings between your Android phone and Arduino UNO.

---

### Step 1: Flashing the Arduino UNO
- [ ] Connect Arduino UNO to PC via standard USB-B cable.
- [ ] Open Arduino IDE or CLI, load `arduino/aurora01_telemetry/aurora01_telemetry.ino`.
- [ ] Verify `Serial.begin(9600)` is configured.
- [ ] Upload the sketch to the Arduino UNO.
- [ ] Open Arduino Serial Monitor at 9600 baud to verify incoming JSON packets:
  ```json
  {"type":"telemetry","ldrLeft":...,"ldrCenter":...,"ldrRight":...,"distanceCm":...,"mode":"NORMAL"}
  ```
- [ ] Test typing `PING` and press Send: confirm `{"type":"pong"}` is returned.
- [ ] Test typing `SERVO:45` and press Send: confirm `{"type":"ack","command":"SERVO:45","status":"OK"}`.
- [ ] Disconnect Arduino UNO from PC.

---

### Step 2: Android Phone Preparation
- [ ] Download and install `aurora-01.apk` on your Android phone.
  - Direct download URL: `/aurora-01.apk`
  - Ensure "Install from Unknown Sources" or "Allow from this source" is enabled for your browser or files app.
- [ ] Verify OTG is supported and enabled in your Android phone settings:
  - On OnePlus / OPPO / Realme: Go to **Settings → System Settings → OTG Connection** and toggle ON.
  - On Samsung / Pixel / Xiaomi: OTG is enabled automatically when an OTG adapter is inserted.
- [ ] Ensure Bluetooth and Wi-Fi are turned OFF to confirm the app operates 100% offline via cable.

---

### Step 3: Physical Cable Connection
- [ ] Plug the USB OTG adapter into the Android phone's USB-C or Micro-USB port.
- [ ] Plug the USB-A end of the Arduino cable into the OTG adapter.
- [ ] Plug the square USB-B connector into the Arduino UNO.
- [ ] Confirm the Arduino UNO's green `ON` LED illuminates, indicating the phone is supplying bus power to the ATmega328P.
- [ ] (Important) Confirm that servos and motors are powered from a separate external battery/supply with common ground, not drawing current through the phone port.

---

### Step 4: USB Permission & App Handshake
- [ ] Open the **AURORA-01** application.
- [ ] On the Launchpad or Connection screen, tap **INITIALIZE USB OTG LINK** or **SCAN USB DEVICES**.
- [ ] When the Android system prompt appears:
  > *"Allow AURORA-01 to access the USB device?"*
  Tap **OK** / **Allow**.
- [ ] Verify the Connection State transitions through:
  `DISCONNECTED` → `DEVICE FOUND` → `CONNECTING` → `CONNECTED`.
- [ ] Check the serial link telemetry counter: packet counter increments at ~2 Hz.

---

### Step 5: Live Sensor Verification
- [ ] **LDR Sensors**: Cover the Left, Center, or Right LDR with a finger; verify the corresponding ADC value decreases in real time.
- [ ] **Ultrasonic Distance (HC-SR04)**: Wave hand closer than 15 cm in front of the ultrasonic transducer; confirm distance drops and proximity warning triggers.
- [ ] **Solar Array Servo (SG90)**: Open the Mission Control screen, slide the servo control to `120°`, and tap Send; observe physical servo movement and command ACK.
- [ ] **Mission Modes**: Tap `POWER_SAVE` or `SAFE_MODE`; verify command ACK is received and current consumption value drops.
- [ ] **Staleness Test**: Unplug the USB cable; observe the app immediately detect disconnection, mark readings as `--`, and transition status to `DISCONNECTED`.
