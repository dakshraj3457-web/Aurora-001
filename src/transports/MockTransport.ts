/**
 * High-Fidelity Simulated Spacecraft Engine for AURORA-01 Demo Mode
 * Outputs standard newline-delimited JSON matching the physical Arduino UNO protocol.
 */

import { ITransport, TransportCallbacks, TransportStatus } from './TransportInterface';
import { parseTelemetryLine, validateAndFormatCommand } from '../utils/telemetryParser';
import { MissionMode } from '../types/telemetry';

export class MockTransport implements ITransport {
  id = 'DEMO';
  name = 'Simulated Spacecraft Engine (Demo Mode)';

  private callbacks: TransportCallbacks | null = null;
  private status: TransportStatus = 'DISCONNECTED';
  private timer: ReturnType<typeof setInterval> | null = null;
  private currentMode: MissionMode = 'NORMAL';
  private tickCount = 0;
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

    await new Promise((r) => setTimeout(r, 400));

    this.updateStatus('CONNECTED');
    this.callbacks?.onLog('INFO', 'AURORA-01 Simulated Telemetry linked. Downlink active.');

    this.startStreaming();
    return true;
  }

  async disconnect(): Promise<void> {
    this.stopStreaming();
    this.updateStatus('DISCONNECTED');
    this.callbacks?.onLog('INFO', 'Simulated telemetry stopped.');
  }

  async sendCommand(command: string): Promise<boolean> {
    if (this.status !== 'CONNECTED') return false;

    const { valid, formatted, error } = validateAndFormatCommand(command);
    if (!valid) {
      this.callbacks?.onLog('ERROR', `Simulation rejected command: ${error}`);
      return false;
    }

    this.callbacks?.onLog('INFO', `TX -> [SIMULATED ARDUINO]: ${formatted.trim()}`);

    const trimmed = command.trim().toUpperCase();

    setTimeout(() => {
      if (trimmed === 'PING') {
        const ack = JSON.stringify({ type: 'pong' });
        this.callbacks?.onPacketReceived(parseTelemetryLine(ack), ack);
        this.callbacks?.onCommandAck('PING', true);
        return;
      }

      if (trimmed.startsWith('MODE:')) {
        const mode = trimmed.substring(5);
        if (mode === 'NORMAL' || mode === 'POWER_SAVE' || mode === 'SAFE' || mode === 'SAFE_MODE') {
          this.currentMode = mode === 'SAFE' ? 'SAFE_MODE' : (mode as MissionMode);
          const ack = JSON.stringify({ type: 'ack', command: `MODE:${mode}`, status: 'OK' });
          this.callbacks?.onPacketReceived(parseTelemetryLine(ack), ack);
          this.callbacks?.onCommandAck(command, true);
          return;
        }
      }

      if (trimmed.startsWith('SERVO:')) {
        const angle = parseInt(trimmed.substring(6), 10);
        if (!isNaN(angle) && angle >= 0 && angle <= 180) {
          this.servoAngle = angle;
          const ack = JSON.stringify({ type: 'ack', command: `SERVO:${angle}`, status: 'OK' });
          this.callbacks?.onPacketReceived(parseTelemetryLine(ack), ack);
          this.callbacks?.onCommandAck(command, true);
          return;
        }
      }

      this.callbacks?.onCommandAck(command, false);
    }, 120);

    return true;
  }

  isConnected(): boolean {
    return this.status === 'CONNECTED';
  }

  private updateStatus(newStatus: TransportStatus, error?: string) {
    this.status = newStatus;
    this.callbacks?.onStatusChange(newStatus, error);
  }

  private startStreaming() {
    this.stopStreaming();

    this.timer = setInterval(() => {
      this.tickCount++;

      // Math for orbital light cycle
      const solarCycle = Math.sin(this.tickCount * 0.1);
      const isSunlit = solarCycle > -0.2;
      const baseLight = isSunlit ? 600 + Math.sin(this.tickCount * 0.2) * 350 : 25 + Math.random() * 20;

      const ldrLeft = Math.round(Math.max(10, baseLight + Math.sin(this.tickCount * 0.3) * 45));
      const ldrCenter = Math.round(Math.max(10, baseLight));
      const ldrRight = Math.round(Math.max(10, baseLight - Math.sin(this.tickCount * 0.3) * 45));

      // Ultrasonic proximity
      const distanceCm = Math.round((35 + Math.sin(this.tickCount * 0.08) * 18 + Math.random() * 2) * 10) / 10;
      const hazard = distanceCm < 15;

      // Power calculation
      const voltage = Math.round((7.8 - (this.tickCount * 0.0002) % 0.6) * 100) / 100;
      const currentMA = Math.round(
        this.currentMode === 'POWER_SAVE' ? 120 + Math.random() * 15 :
        this.currentMode === 'SAFE_MODE' ? 65 + Math.random() * 10 :
        390 + Math.random() * 35
      );

      // Attitude tilt
      const tiltX = Math.round((Math.sin(this.tickCount * 0.12) * 4.5) * 10) / 10;
      const tiltY = Math.round((Math.cos(this.tickCount * 0.15) * 3.8) * 10) / 10;

      // Newline-delimited JSON telemetry matching specification
      const telemetryObj = {
        type: 'telemetry',
        ldrLeft,
        ldrCenter,
        ldrRight,
        distanceCm,
        tiltX,
        tiltY,
        servoAngle: this.servoAngle,
        voltage,
        currentMA,
        hazard,
        mode: this.currentMode,
      };

      const jsonLine = JSON.stringify(telemetryObj);
      const packet = parseTelemetryLine(jsonLine);
      this.callbacks?.onPacketReceived(packet, jsonLine);
    }, 500);
  }

  private stopStreaming() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
