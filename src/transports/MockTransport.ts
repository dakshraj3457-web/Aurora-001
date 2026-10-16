/**
 * High-Fidelity Simulated Hardware Transport for AURORA-01 Demo Mode
 */

import { ITransport, TransportCallbacks, TransportStatus } from './TransportInterface';
import { parseTelemetryLine, formatCommand } from '../utils/telemetryParser';
import { MissionMode } from '../types/telemetry';

export class MockTransport implements ITransport {
  id = 'DEMO';
  name = 'Simulated Spacecraft Engine (Demo Mode)';

  private callbacks: TransportCallbacks | null = null;
  private status: TransportStatus = 'DISCONNECTED';
  private timer: ReturnType<typeof setInterval> | null = null;
  private currentMode: MissionMode = 'NORMAL';
  private tickCount = 0;
  private baseVoltage = 7.82;
  private servoAngle = 90;

  setCallbacks(callbacks: TransportCallbacks) {
    this.callbacks = callbacks;
  }

  async isAvailable(): Promise<{ available: boolean; reason?: string }> {
    return { available: true };
  }

  async connect(): Promise<boolean> {
    this.updateStatus('CONNECTING');
    this.callbacks?.onLog('INFO', 'Initializing simulated orbital physics engine...');

    await new Promise((r) => setTimeout(r, 600));

    this.updateStatus('CONNECTED');
    this.callbacks?.onLog('INFO', 'AURORA-01 Virtual Orbit locked. Downlink stream active.');

    this.startStreaming();
    return true;
  }

  async disconnect(): Promise<void> {
    this.stopStreaming();
    this.updateStatus('DISCONNECTED');
    this.callbacks?.onLog('INFO', 'Simulated downlink link closed.');
  }

  async sendCommand(command: string): Promise<boolean> {
    if (this.status !== 'CONNECTED') return false;

    const formatted = formatCommand(command);
    this.callbacks?.onLog('INFO', `TX -> [DEMO_CONTROLLER]: ${formatted.trim()}`);

    // Simulate flight controller command ACK cycle
    const targetMode = command.trim().toUpperCase().replace(/\s+/g, '_') as MissionMode;

    setTimeout(() => {
      if (['NORMAL', 'POWER_SAVE', 'SAFE_MODE', 'COURSE_CHANGE', 'RESUME'].includes(targetMode)) {
        this.currentMode = targetMode === 'RESUME' ? 'NORMAL' : targetMode;
        this.callbacks?.onCommandAck(command, true);
        this.callbacks?.onLog('INFO', `RX <- [DEMO_CONTROLLER]: ACK:MODE_SWITCHED_${this.currentMode}`);
      } else {
        this.callbacks?.onCommandAck(command, true);
        this.callbacks?.onLog('INFO', `RX <- [DEMO_CONTROLLER]: ACK:COMMAND_EXECUTED`);
      }
    }, 350);

    return true;
  }

  isConnected(): boolean {
    return this.status === 'CONNECTED';
  }

  private updateStatus(newStatus: TransportStatus, errorMsg?: string) {
    this.status = newStatus;
    this.callbacks?.onStatusChange(newStatus, errorMsg);
  }

  private startStreaming() {
    this.stopStreaming();

    // Stream telemetry frame every 1000ms
    this.timer = setInterval(() => {
      this.tickCount++;
      const t = this.tickCount;

      // 1. Orbital day/night light cycle (LDR)
      const orbitPhase = (t % 120) / 120; // 2 min demo orbit
      const inSunlight = orbitPhase < 0.65;
      const light = inSunlight
        ? Math.round(1350 + Math.sin(t * 0.15) * 350 + (Math.random() - 0.5) * 50)
        : Math.round(Math.max(10, 25 + Math.sin(t * 0.2) * 15));

      // 2. Ultrasonic distance (HC-SR04 cm)
      const distance = Math.round((42.5 + Math.sin(t * 0.08) * 8 + (Math.random() - 0.5) * 1.5) * 10) / 10;

      // 3. Current draw based on mode (INA219 mA)
      let baseCurrent = 410;
      if (this.currentMode === 'POWER_SAVE') baseCurrent = 115;
      else if (this.currentMode === 'SAFE_MODE') baseCurrent = 210;
      else if (this.currentMode === 'COURSE_CHANGE') baseCurrent = 680;
      const current = Math.round(baseCurrent + (Math.random() - 0.5) * 12);

      // 4. Voltage dynamics (INA219 V)
      if (inSunlight && this.currentMode !== 'POWER_SAVE') {
        this.baseVoltage = Math.min(8.38, this.baseVoltage + 0.001);
      } else {
        this.baseVoltage = Math.max(6.4, this.baseVoltage - (current > 500 ? 0.003 : 0.001));
      }
      const voltage = Math.round(this.baseVoltage * 100) / 100;

      // 5. 3-axis gyro attitude (MPU6050 pitch, roll, yaw)
      const pitch = Math.round((2.8 + Math.sin(t * 0.2) * 1.5 + (Math.random() - 0.5) * 0.4) * 10) / 10;
      const roll = Math.round((-1.2 + Math.cos(t * 0.18) * 1.2 + (Math.random() - 0.5) * 0.4) * 10) / 10;
      const yaw = Math.round(((t * 1.2) % 360) * 10) / 10;
      const tiltStr = `${pitch}:${roll}:${yaw}`;

      // 6. Solar servo angle
      if (inSunlight) {
        this.servoAngle = Math.round(90 + Math.sin(t * 0.05) * 45);
      }

      // 7. Alert status
      let alert = 'NONE';
      if (voltage < 6.6) alert = 'LOW_BUS_VOLTAGE';
      else if (distance < 10) alert = 'PROXIMITY_ALERT';
      else if (light < 50) alert = 'ECLIPSE_UMBRA';

      // Assemble Arduino DATA format: DATA,light,distance,voltage,current,tilt,mode,alert,servo
      const rawLine = `DATA,${light},${distance},${voltage},${current},${tiltStr},${this.currentMode},${alert},${this.servoAngle}`;
      const packet = parseTelemetryLine(rawLine);

      this.callbacks?.onPacketReceived(packet, rawLine);
    }, 1000);
  }

  private stopStreaming() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
