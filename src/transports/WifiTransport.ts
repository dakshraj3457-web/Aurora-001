/**
 * Wi-Fi Transport for ESP32-S3 Spacecraft Subsystem
 * Connects over HTTP polling or WebSocket to the ESP32-S3 telemetry server.
 */

import { ITransport, TransportCallbacks, TransportStatus } from './TransportInterface';
import { parseTelemetryLine } from '../utils/telemetryParser';

export class WifiTransport implements ITransport {
  id = 'WIFI';
  name = 'ESP32-S3 Wi-Fi Telemetry Server';

  private callbacks: TransportCallbacks | null = null;
  private status: TransportStatus = 'DISCONNECTED';
  private baseUrl: string = 'http://192.168.4.1';
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private ws: WebSocket | null = null;

  constructor(serverUrl = 'http://192.168.4.1') {
    this.baseUrl = serverUrl.replace(/\/$/, '');
  }

  setCallbacks(callbacks: TransportCallbacks) {
    this.callbacks = callbacks;
  }

  setServerUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  async isAvailable(): Promise<{ available: boolean; reason?: string }> {
    return { available: true };
  }

  async connect(): Promise<boolean> {
    this.callbacks?.onStatusChange('CONNECTING');
    this.callbacks?.onLog('INFO', `Connecting to ESP32-S3 at ${this.baseUrl}...`);

    try {
      // 1. First probe endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const resp = await fetch(`${this.baseUrl}/status`, {
        signal: controller.signal,
        headers: { Accept: 'application/json, text/plain' },
      }).catch((e) => {
        // If /status fails, try /telemetry
        return fetch(`${this.baseUrl}/telemetry`, { signal: controller.signal });
      });

      clearTimeout(timeoutId);

      if (!resp || !resp.ok) {
        throw new Error(
          `Unable to reach ESP32-S3 server at ${this.baseUrl}. Check Wi-Fi SSID and IP address.`
        );
      }

      this.status = 'CONNECTED';
      this.callbacks?.onStatusChange('CONNECTED');
      this.callbacks?.onLog('INFO', `Wi-Fi link established with ESP32-S3 at ${this.baseUrl}`);

      // Start periodic polling
      this.startPolling();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ESP32-S3 unreachable';
      this.callbacks?.onLog('ERROR', msg);
      this.callbacks?.onStatusChange('ERROR', msg);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'DISCONNECTED';
    this.callbacks?.onStatusChange('DISCONNECTED');
    this.callbacks?.onLog('INFO', 'Wi-Fi link disconnected');
  }

  async sendCommand(command: string): Promise<boolean> {
    if (!this.isConnected()) return false;

    try {
      this.callbacks?.onLog('INFO', `TX WIFI -> ${command}`);
      const resp = await fetch(`${this.baseUrl}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: command }),
      });

      if (resp.ok) {
        this.callbacks?.onCommandAck(command, true);
        return true;
      }
      return false;
    } catch (err) {
      this.callbacks?.onLog('ERROR', `Failed sending command over Wi-Fi: ${err}`);
      return false;
    }
  }

  isConnected(): boolean {
    return this.status === 'CONNECTED';
  }

  private startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(async () => {
      if (this.status !== 'CONNECTED') return;

      try {
        const resp = await fetch(`${this.baseUrl}/telemetry`);
        if (resp.ok) {
          const raw = await resp.text();
          const parsed = parseTelemetryLine(raw);
          if (parsed.isValid) {
            this.callbacks?.onPacketReceived(parsed, raw);
          }
        }
      } catch {
        // Suppress transient poll dropouts
      }
    }, 1000);
  }
}
