/**
 * Spacecraft Hardware Communication Transport Interface
 */

import { ParsedTelemetryPacket } from '../utils/telemetryParser';

export type TransportStatus =
  | 'DISCONNECTED'
  | 'DEVICE FOUND'
  | 'PERMISSION REQUIRED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR';

export interface TransportCallbacks {
  onStatusChange: (status: TransportStatus, errorMsg?: string) => void;
  onPacketReceived: (packet: ParsedTelemetryPacket, rawLine: string) => void;
  onCommandAck: (command: string, success: boolean) => void;
  onLog: (type: 'INFO' | 'WARN' | 'ERROR', message: string) => void;
}

export interface ITransport {
  id: string;
  name: string;
  isAvailable(): Promise<{ available: boolean; reason?: string }>;
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  sendCommand(command: string): Promise<boolean>;
  isConnected(): boolean;
  setCallbacks(callbacks: TransportCallbacks): void;
}
