/**
 * Real USB Serial Hardware Transport
 * Works via:
 * 1. Native Android USB Host API inside the AURORA-01 APK (via window.AuroraUsb)
 * 2. Web Serial API (navigator.serial) when running in Web/Chromium browser with OTG
 */

import { ITransport, TransportCallbacks, TransportStatus } from './TransportInterface';
import { parseTelemetryLine, validateAndFormatCommand } from '../utils/telemetryParser';

declare global {
  interface Window {
    AuroraUsb?: {
      isNativeAvailable: () => boolean;
      scanDevices: () => string;
      scanAndConnect: () => void;
      requestPermission: () => void;
      connect: (baudRate: number) => void;
      disconnect: () => void;
      sendCommand: (cmd: string) => boolean;
      getConnectionState: () => string;
      getBaudRate: () => number;
      setBaudRate: (baud: number) => void;
    };
    onAuroraUsbEvent?: (event: any) => void;
  }
}

export class UsbSerialTransport implements ITransport {
  id = 'USB_SERIAL';
  name = 'USB Serial (Arduino UNO OTG)';

  private callbacks: TransportCallbacks | null = null;
  private status: TransportStatus = 'DISCONNECTED';
  private baudRate: number = 9600;

  // Web Serial fallback references
  private webSerialPort: any = null;
  private webSerialReader: any = null;
  private webSerialWriter: any = null;
  private isReadingWebSerial: boolean = false;
  private lineBuffer: string = '';

  constructor(baudRate: number = 9600) {
    this.baudRate = baudRate;
  }

  setCallbacks(callbacks: TransportCallbacks): void {
    this.callbacks = callbacks;
    this.bindNativeUsbListener();
  }

  setBaudRate(baudRate: number): void {
    this.baudRate = baudRate;
    if (this.isNativeUsb()) {
      window.AuroraUsb?.setBaudRate(baudRate);
    }
  }

  getBaudRate(): number {
    return this.baudRate;
  }

  private isNativeUsb(): boolean {
    return typeof window !== 'undefined' && Boolean(window.AuroraUsb?.isNativeAvailable());
  }

  private hasWebSerial(): boolean {
    return typeof navigator !== 'undefined' && Boolean((navigator as any).serial);
  }

  async isAvailable(): Promise<{ available: boolean; reason?: string; driverType: 'NATIVE_ANDROID_USB' | 'WEB_SERIAL' | 'NONE' }> {
    if (this.isNativeUsb()) {
      return {
        available: true,
        driverType: 'NATIVE_ANDROID_USB',
      };
    }
    if (this.hasWebSerial()) {
      return {
        available: true,
        driverType: 'WEB_SERIAL',
      };
    }
    return {
      available: false,
      driverType: 'NONE',
      reason: 'Physical USB Serial requires the AURORA-01 Android APK with USB OTG cable, or a browser with Web Serial API support.',
    };
  }

  isConnected(): boolean {
    return this.status === 'CONNECTED';
  }

  getStatus(): TransportStatus {
    return this.status;
  }

  private setStatus(status: TransportStatus, errorMsg?: string): void {
    this.status = status;
    this.callbacks?.onStatusChange(status, errorMsg);
  }

  private bindNativeUsbListener(): void {
    if (typeof window === 'undefined') return;

    window.onAuroraUsbEvent = (evt: any) => {
      if (!evt) return;

      if (evt.type === 'state_change') {
        const nativeState = evt.state;
        const deviceName = evt.device;
        const error = evt.error;

        if (nativeState === 'CONNECTED') {
          this.setStatus('CONNECTED');
          this.callbacks?.onLog('INFO', `Native USB OTG link online: ${deviceName || 'Arduino UNO'}`);
        } else if (nativeState === 'CONNECTING') {
          this.setStatus('CONNECTING');
        } else if (nativeState === 'DEVICE FOUND') {
          this.callbacks?.onLog('INFO', `USB OTG device attached: ${deviceName}`);
        } else if (nativeState === 'PERMISSION REQUIRED') {
          this.callbacks?.onLog('WARN', 'USB permission dialog displayed. Please tap OK.');
        } else if (nativeState === 'ERROR') {
          this.setStatus('ERROR', error || 'USB communication error');
          this.callbacks?.onLog('ERROR', error || 'USB communication error');
        } else {
          this.setStatus('DISCONNECTED', error);
          this.callbacks?.onLog('INFO', 'USB OTG disconnected.');
        }
      } else if (evt.type === 'data') {
        const rawLine = evt.line;
        if (typeof rawLine === 'string' && rawLine.trim().length > 0) {
          const packet = parseTelemetryLine(rawLine);
          this.callbacks?.onPacketReceived(packet, rawLine);
        }
      } else if (evt.type === 'line_sent') {
        this.callbacks?.onCommandAck(evt.line, evt.success);
      } else if (evt.type === 'log') {
        this.callbacks?.onLog(evt.level || 'INFO', evt.message || '');
      }
    };
  }

  async connect(): Promise<boolean> {
    const avail = await this.isAvailable();
    if (!avail.available) {
      this.setStatus('ERROR', avail.reason);
      return false;
    }

    this.setStatus('CONNECTING');

    // Path 1: Native Android USB Host inside APK
    if (this.isNativeUsb()) {
      try {
        this.callbacks?.onLog('INFO', `Invoking Android UsbManager discovery at ${this.baudRate} baud...`);
        window.AuroraUsb?.connect(this.baudRate);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Native USB failed to start';
        this.setStatus('ERROR', msg);
        return false;
      }
    }

    // Path 2: Web Serial API fallback in Chrome
    if (this.hasWebSerial()) {
      try {
        const serial = (navigator as any).serial;
        const port = await serial.requestPort({
          filters: [
            { usbVendorId: 0x2341 }, // Arduino
            { usbVendorId: 0x2a03 }, // Arduino LLC
            { usbVendorId: 0x1a86 }, // CH340
            { usbVendorId: 0x0403 }, // FTDI
            { usbVendorId: 0x10c4 }, // CP2102
          ],
        });

        await port.open({ baudRate: this.baudRate });
        this.webSerialPort = port;
        this.setStatus('CONNECTED');
        this.callbacks?.onLog('INFO', `Web Serial port opened at ${this.baudRate} baud.`);

        this.startWebSerialReader();
        return true;
      } catch (err: any) {
        if (err.name === 'NotFoundError') {
          this.setStatus('DISCONNECTED', 'No USB serial port selected');
        } else {
          const msg = err instanceof Error ? err.message : 'Failed to open serial port';
          this.setStatus('ERROR', msg);
        }
        return false;
      }
    }

    this.setStatus('ERROR', 'No compatible USB serial interface found');
    return false;
  }

  private async startWebSerialReader(): Promise<void> {
    if (!this.webSerialPort?.readable) return;
    this.isReadingWebSerial = true;
    const textDecoder = new TextDecoderStream();
    this.webSerialPort.readable.pipeTo(textDecoder.writable).catch(() => {});
    const reader = textDecoder.readable.getReader();
    this.webSerialReader = reader;

    try {
      while (this.isReadingWebSerial) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          this.lineBuffer += value;
          const lines = this.lineBuffer.split(/\r?\n/);
          this.lineBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 0) {
              const packet = parseTelemetryLine(trimmed);
              this.callbacks?.onPacketReceived(packet, trimmed);
            }
          }
        }
      }
    } catch (err) {
      if (this.status === 'CONNECTED') {
        this.setStatus('ERROR', err instanceof Error ? err.message : 'Serial read error');
      }
    } finally {
      reader.releaseLock();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isNativeUsb()) {
      window.AuroraUsb?.disconnect();
    }

    this.isReadingWebSerial = false;
    if (this.webSerialReader) {
      try {
        await this.webSerialReader.cancel();
      } catch (ignored) {}
      this.webSerialReader = null;
    }
    if (this.webSerialPort) {
      try {
        await this.webSerialPort.close();
      } catch (ignored) {}
      this.webSerialPort = null;
    }

    this.setStatus('DISCONNECTED');
  }

  async sendCommand(command: string): Promise<boolean> {
    if (this.status !== 'CONNECTED') {
      this.callbacks?.onLog('WARN', `Cannot send command while disconnected: ${command}`);
      return false;
    }

    const { valid, formatted, error } = validateAndFormatCommand(command);
    if (!valid) {
      this.callbacks?.onLog('ERROR', `Command validation failed: ${error}`);
      return false;
    }

    // Path 1: Native Android USB
    if (this.isNativeUsb()) {
      try {
        const sent = window.AuroraUsb?.sendCommand(formatted) ?? false;
        return sent;
      } catch (err) {
        this.callbacks?.onLog('ERROR', `Failed to send command over native USB: ${err}`);
        return false;
      }
    }

    // Path 2: Web Serial
    if (this.webSerialPort?.writable) {
      try {
        const textEncoder = new TextEncoder();
        const writer = this.webSerialPort.writable.getWriter();
        await writer.write(textEncoder.encode(formatted));
        writer.releaseLock();
        this.callbacks?.onCommandAck(command, true);
        return true;
      } catch (err) {
        this.callbacks?.onLog('ERROR', `Serial write error: ${err}`);
        this.callbacks?.onCommandAck(command, false);
        return false;
      }
    }

    return false;
  }
}
