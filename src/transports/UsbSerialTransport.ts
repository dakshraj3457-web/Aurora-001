/**
 * Real USB Serial Hardware Transport for AURORA-01 Spacecraft
 * Supported Communication Pathways:
 * 1. Native Android USB Host API inside the AURORA-01 APK (via window.AuroraUsb)
 * 2. Web Serial API (navigator.serial) in Chrome/Chromium on Desktop & supported browsers
 * 3. WebUSB API (navigator.usb) in Chrome on Android / mobile browsers supporting OTG WebUSB
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

  // Web Serial references
  private webSerialPort: any = null;
  private webSerialReader: any = null;
  private isReadingWebSerial: boolean = false;
  private lineBuffer: string = '';

  // WebUSB references
  private webUsbDevice: any = null;
  private isReadingWebUsb: boolean = false;
  private webUsbInEp: number = 0;
  private webUsbOutEp: number = 0;
  private webUsbIfaceNum: number = 0;

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

  public isNativeUsb(): boolean {
    return typeof window !== 'undefined' && Boolean(window.AuroraUsb?.isNativeAvailable());
  }

  public hasWebSerial(): boolean {
    return typeof navigator !== 'undefined' && Boolean((navigator as any).serial);
  }

  public hasWebUsb(): boolean {
    return typeof navigator !== 'undefined' && Boolean((navigator as any).usb);
  }

  async isAvailable(): Promise<{
    available: boolean;
    reason?: string;
    driverType: 'NATIVE_ANDROID_USB' | 'WEB_SERIAL' | 'WEB_USB' | 'NONE';
  }> {
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
    if (this.hasWebUsb()) {
      return {
        available: true,
        driverType: 'WEB_USB',
      };
    }
    return {
      available: false,
      driverType: 'NONE',
      reason: 'No native USB or Web Serial / WebUSB interface detected. Download the AURORA-01 APK for native Android USB Host OTG support, or connect via desktop Chrome.',
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
          this.setStatus('PERMISSION REQUIRED');
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
        this.callbacks?.onLog('INFO', `Connecting via native Android UsbManager (${this.baudRate} baud)...`);
        window.AuroraUsb?.connect(this.baudRate);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Native USB failed to start';
        this.setStatus('ERROR', msg);
        return false;
      }
    }

    // Path 2: Web Serial API (Desktop Chrome / Edge)
    if (this.hasWebSerial()) {
      try {
        const serial = (navigator as any).serial;
        let port: any = null;

        try {
          // Attempt filtered picker with common Arduino & clone vendor IDs
          port = await serial.requestPort({
            filters: [
              { usbVendorId: 0x2341 }, // Arduino Official
              { usbVendorId: 0x2a03 }, // Arduino LLC
              { usbVendorId: 0x1a86 }, // CH340 / CH341
              { usbVendorId: 0x0403 }, // FTDI
              { usbVendorId: 0x10c4 }, // CP2102
              { usbVendorId: 0x067b }, // Prolific
              { usbVendorId: 0x2e8a }, // Raspberry Pi RP2040
            ],
          });
        } catch (filterErr: any) {
          // If filtered picker was cancelled or failed, allow open picker
          if (filterErr?.name !== 'AbortError') {
            port = await serial.requestPort({});
          } else {
            throw filterErr;
          }
        }

        if (!port) {
          this.setStatus('DISCONNECTED', 'No USB serial port selected');
          return false;
        }

        await port.open({ baudRate: this.baudRate });
        this.webSerialPort = port;
        this.setStatus('CONNECTED');
        this.callbacks?.onLog('INFO', `Web Serial port connected at ${this.baudRate} baud.`);

        this.startWebSerialReader();
        return true;
      } catch (err: any) {
        if (err.name === 'NotFoundError' || err.name === 'AbortError') {
          this.setStatus('DISCONNECTED', 'USB device selection cancelled');
        } else {
          const msg = err instanceof Error ? err.message : 'Failed to open serial port';
          this.setStatus('ERROR', msg);
        }
        return false;
      }
    }

    // Path 3: WebUSB API (Chrome on Android / WebUSB OTG)
    if (this.hasWebUsb()) {
      try {
        const usb = (navigator as any).usb;
        const device = await usb.requestDevice({
          filters: [
            { vendorId: 0x2341 }, // Arduino
            { vendorId: 0x2a03 },
            { vendorId: 0x1a86 }, // CH340
            { vendorId: 0x0403 }, // FTDI
            { vendorId: 0x10c4 }, // CP2102
            { classCode: 2 },     // CDC
          ],
        });

        if (!device) {
          this.setStatus('DISCONNECTED', 'No USB OTG device selected');
          return false;
        }

        await device.open();
        if (device.configuration === null) {
          await device.selectConfiguration(1);
        }

        // Find interface with bulk endpoints
        let inEp = 0;
        let outEp = 0;
        let ifaceNum = 0;

        for (const iface of device.configuration.interfaces) {
          for (const alt of iface.alternates) {
            for (const ep of alt.endpoints) {
              if (ep.type === 'bulk') {
                if (ep.direction === 'in' && !inEp) inEp = ep.endpointNumber;
                if (ep.direction === 'out' && !outEp) outEp = ep.endpointNumber;
                ifaceNum = iface.interfaceNumber;
              }
            }
          }
        }

        await device.claimInterface(ifaceNum);
        this.webUsbDevice = device;
        this.webUsbInEp = inEp;
        this.webUsbOutEp = outEp;
        this.webUsbIfaceNum = ifaceNum;

        // Try standard CDC line coding setup
        try {
          const baudBytes = new Uint8Array([
            this.baudRate & 0xff,
            (this.baudRate >> 8) & 0xff,
            (this.baudRate >> 16) & 0xff,
            (this.baudRate >> 24) & 0xff,
            0, 0, 8
          ]);
          await device.controlTransferOut({
            requestType: 'class',
            recipient: 'interface',
            request: 0x20, // SET_LINE_CODING
            value: 0,
            index: ifaceNum,
          }, baudBytes);

          await device.controlTransferOut({
            requestType: 'class',
            recipient: 'interface',
            request: 0x22, // SET_CONTROL_LINE_STATE (DTR/RTS)
            value: 0x03,
            index: ifaceNum,
          });
        } catch (ignored) {}

        this.setStatus('CONNECTED');
        this.callbacks?.onLog('INFO', `WebUSB connected to ${device.productName || 'Arduino UNO'} (${this.baudRate} baud)`);

        this.startWebUsbReader();
        return true;
      } catch (err: any) {
        if (err.name === 'NotFoundError' || err.name === 'AbortError') {
          this.setStatus('DISCONNECTED', 'USB device selection cancelled');
        } else {
          this.setStatus('ERROR', `WebUSB error: ${err.message || 'Cannot access device'}`);
        }
        return false;
      }
    }

    this.setStatus('ERROR', 'No compatible USB host interface found.');
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

  private async startWebUsbReader(): Promise<void> {
    if (!this.webUsbDevice || !this.webUsbInEp) return;
    this.isReadingWebUsb = true;
    const decoder = new TextDecoder();

    try {
      while (this.isReadingWebUsb && this.webUsbDevice?.opened) {
        const result = await this.webUsbDevice.transferIn(this.webUsbInEp, 64);
        if (result.status === 'ok' && result.data) {
          const chunk = decoder.decode(result.data);
          this.lineBuffer += chunk;
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
        this.setStatus('ERROR', err instanceof Error ? err.message : 'WebUSB read error');
      }
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

    this.isReadingWebUsb = false;
    if (this.webUsbDevice) {
      try {
        await this.webUsbDevice.close();
      } catch (ignored) {}
      this.webUsbDevice = null;
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

    // Path 3: WebUSB
    if (this.webUsbDevice?.opened && this.webUsbOutEp) {
      try {
        const textEncoder = new TextEncoder();
        await this.webUsbDevice.transferOut(this.webUsbOutEp, textEncoder.encode(formatted));
        this.callbacks?.onCommandAck(command, true);
        return true;
      } catch (err) {
        this.callbacks?.onLog('ERROR', `WebUSB write error: ${err}`);
        this.callbacks?.onCommandAck(command, false);
        return false;
      }
    }

    return false;
  }
}
