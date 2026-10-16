/**
 * Web Serial API Transport
 * Connects to Arduino UNO via direct USB Serial, FTDI, CP2102, or paired Bluetooth Virtual COM ports.
 */

import { ITransport, TransportCallbacks, TransportStatus } from './TransportInterface';
import { parseTelemetryLine, formatCommand } from '../utils/telemetryParser';

export class SerialTransport implements ITransport {
  id = 'BLUETOOTH_SERIAL';
  name = 'Serial / Bluetooth Classic Bridge (HC-05 / USB)';

  private callbacks: TransportCallbacks | null = null;
  private status: TransportStatus = 'DISCONNECTED';
  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private buffer = '';
  private baudRate = 9600;

  constructor(baudRate = 9600) {
    this.baudRate = baudRate;
  }

  setCallbacks(callbacks: TransportCallbacks) {
    this.callbacks = callbacks;
  }

  async isAvailable(): Promise<{ available: boolean; reason?: string }> {
    if (typeof navigator === 'undefined' || !(navigator as any).serial) {
      return {
        available: false,
        reason:
          'Web Serial API is supported in Chrome, Edge, and Opera desktop browsers. For mobile Android devices, connect via BLE or Wi-Fi, or use an Android Bluetooth Serial bridge application.',
      };
    }
    return { available: true };
  }

  async connect(): Promise<boolean> {
    const avail = await this.isAvailable();
    if (!avail.available) {
      this.callbacks?.onLog('ERROR', avail.reason || 'Web Serial not available');
      this.callbacks?.onStatusChange('ERROR', avail.reason);
      return false;
    }

    try {
      this.callbacks?.onStatusChange('CONNECTING');
      this.callbacks?.onLog('INFO', 'Prompting user for Serial COM port selection...');

      const serial = (navigator as any).serial;
      this.port = await serial.requestPort();
      await this.port.open({ baudRate: this.baudRate });

      this.status = 'CONNECTED';
      this.callbacks?.onStatusChange('CONNECTED');
      this.callbacks?.onLog('INFO', `Serial COM link opened at ${this.baudRate} baud`);

      this.startReading();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Serial connection failed';
      this.callbacks?.onLog('ERROR', msg);
      this.callbacks?.onStatusChange('ERROR', msg);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.reader) {
        await this.reader.cancel();
      }
      if (this.port) {
        await this.port.close();
      }
    } catch {}
    this.status = 'DISCONNECTED';
    this.callbacks?.onStatusChange('DISCONNECTED');
    this.callbacks?.onLog('INFO', 'Serial COM link closed');
  }

  async sendCommand(command: string): Promise<boolean> {
    if (!this.isConnected() || !this.port?.writable) {
      this.callbacks?.onLog('ERROR', 'Cannot transmit: Serial port not writable');
      return false;
    }

    try {
      const formatted = formatCommand(command);
      const encoder = new TextEncoder();
      const writer = this.port.writable.getWriter();
      await writer.write(encoder.encode(formatted));
      writer.releaseLock();
      this.callbacks?.onLog('INFO', `TX SERIAL -> ${formatted.trim()}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Serial TX failure';
      this.callbacks?.onLog('ERROR', msg);
      return false;
    }
  }

  isConnected(): boolean {
    return this.status === 'CONNECTED' && Boolean(this.port?.readable);
  }

  private async startReading() {
    const decoder = new TextDecoder();
    try {
      while (this.port?.readable && this.status === 'CONNECTED') {
        this.reader = this.port.readable.getReader();
        try {
          while (true) {
            const { value, done } = await this.reader.read();
            if (done) break;
            if (value) {
              const text = decoder.decode(value);
              this.handleIncomingData(text);
            }
          }
        } finally {
          this.reader.releaseLock();
        }
      }
    } catch (err) {
      if (this.status === 'CONNECTED') {
        this.callbacks?.onLog('WARN', 'Serial read stream disconnected');
        this.disconnect();
      }
    }
  }

  private handleIncomingData(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parsed = parseTelemetryLine(trimmed);
      if (parsed.isValid) {
        this.callbacks?.onPacketReceived(parsed, trimmed);
        if (trimmed.startsWith('ACK:')) {
          this.callbacks?.onCommandAck(trimmed.replace('ACK:', ''), true);
        }
      }
    }
  }
}
