/**
 * Web Bluetooth Low Energy (BLE) Transport
 * Connects to compatible BLE serial modules (e.g. HM-10, AT-09, ESP32 BLE UART).
 * Note: Bluetooth Classic (HC-05 SPP) is not accessible via Web Bluetooth in standard browsers.
 */

import { ITransport, TransportCallbacks, TransportStatus } from './TransportInterface';
import { parseTelemetryLine, formatCommand } from '../utils/telemetryParser';

// Common BLE UART service UUIDs (Nordic UART, HM-10 standard, etc.)
const BLE_UART_SERVICES = [
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC2541 Service
];

const BLE_UART_TX_CHARS = [
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
];

const BLE_UART_RX_CHARS = [
  '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
];

export class BleTransport implements ITransport {
  id = 'BLE';
  name = 'Bluetooth Low Energy (BLE UART)';

  private callbacks: TransportCallbacks | null = null;
  private status: TransportStatus = 'DISCONNECTED';
  private device: any = null;
  private server: any = null;
  private txCharacteristic: any = null;
  private rxCharacteristic: any = null;
  private buffer = '';

  setCallbacks(callbacks: TransportCallbacks) {
    this.callbacks = callbacks;
  }

  async isAvailable(): Promise<{ available: boolean; reason?: string }> {
    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      return {
        available: false,
        reason: 'Web Bluetooth API is not supported in this browser. Use Chrome/Edge or enable experimental flags.',
      };
    }
    return { available: true };
  }

  async connect(): Promise<boolean> {
    const avail = await this.isAvailable();
    if (!avail.available) {
      this.callbacks?.onLog('ERROR', avail.reason || 'Web Bluetooth unavailable');
      this.callbacks?.onStatusChange('ERROR', avail.reason);
      return false;
    }

    try {
      this.callbacks?.onStatusChange('CONNECTING');
      this.callbacks?.onLog('INFO', 'Scanning for nearby BLE UART peripherals...');

      const bluetooth = (navigator as any).bluetooth;
      this.device = await bluetooth.requestDevice({
        filters: [
          { namePrefix: 'AURORA' },
          { namePrefix: 'HC-' },
          { namePrefix: 'ESP32' },
          { namePrefix: 'HM-' },
        ],
        optionalServices: BLE_UART_SERVICES,
      });

      if (!this.device) {
        throw new Error('No device selected');
      }

      this.callbacks?.onLog('INFO', `Discovered BLE device: ${this.device.name || 'Unnamed'}`);

      this.device.addEventListener('gattserverdisconnected', () => {
        this.callbacks?.onLog('WARN', 'BLE device disconnected unexpectedly');
        this.callbacks?.onStatusChange('DISCONNECTED');
        this.status = 'DISCONNECTED';
      });

      this.server = await this.device.gatt.connect();
      this.callbacks?.onLog('INFO', 'GATT Server connected. Locating UART service...');

      // Find primary service
      let service: any = null;
      for (const uuid of BLE_UART_SERVICES) {
        try {
          service = await this.server.getPrimaryService(uuid);
          if (service) break;
        } catch {}
      }

      if (!service) {
        throw new Error('Compatible BLE UART service not found on device.');
      }

      // Find RX/TX characteristics
      for (const uuid of BLE_UART_RX_CHARS) {
        try {
          this.rxCharacteristic = await service.getCharacteristic(uuid);
          if (this.rxCharacteristic) break;
        } catch {}
      }

      for (const uuid of BLE_UART_TX_CHARS) {
        try {
          this.txCharacteristic = await service.getCharacteristic(uuid);
          if (this.txCharacteristic) break;
        } catch {}
      }

      if (this.rxCharacteristic) {
        await this.rxCharacteristic.startNotifications();
        this.rxCharacteristic.addEventListener(
          'characteristicvaluechanged',
          (event: any) => {
            const val = event.target.value;
            const text = new TextDecoder().decode(val);
            this.handleIncomingData(text);
          }
        );
      }

      this.status = 'CONNECTED';
      this.callbacks?.onStatusChange('CONNECTED');
      this.callbacks?.onLog('INFO', `BLE link established with ${this.device.name}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'BLE connection failed';
      this.callbacks?.onLog('ERROR', msg);
      this.callbacks?.onStatusChange('ERROR', msg);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.status = 'DISCONNECTED';
    this.callbacks?.onStatusChange('DISCONNECTED');
    this.callbacks?.onLog('INFO', 'BLE connection closed');
  }

  async sendCommand(command: string): Promise<boolean> {
    if (!this.isConnected() || !this.txCharacteristic) {
      this.callbacks?.onLog('ERROR', 'Cannot transmit: BLE TX not ready');
      return false;
    }

    try {
      const formatted = formatCommand(command);
      const data = new TextEncoder().encode(formatted);
      await this.txCharacteristic.writeValue(data);
      this.callbacks?.onLog('INFO', `TX BLE -> ${formatted.trim()}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'BLE transmission error';
      this.callbacks?.onLog('ERROR', msg);
      return false;
    }
  }

  isConnected(): boolean {
    return this.status === 'CONNECTED' && Boolean(this.device?.gatt?.connected);
  }

  private handleIncomingData(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    // Keep incomplete tail
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
