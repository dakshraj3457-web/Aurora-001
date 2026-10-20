/**
 * AURORA-01 Autonomous Spacecraft Mission Control
 * Core Telemetry and Subsystem Data Types
 * Physical USB OTG Cable -> Arduino UNO Architecture
 */

export type MissionMode = 'NORMAL' | 'POWER_SAVE' | 'SAFE_MODE' | 'COURSE_CHANGE' | 'RESUME';

export type ConnectionState =
  | 'DISCONNECTED'
  | 'DEVICE FOUND'
  | 'PERMISSION REQUIRED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR';

export type TransportType = 'USB_SERIAL' | 'DEMO';

export type SensorStatus = 'HEALTHY' | 'WARNING' | 'FAULT' | 'UNAVAILABLE';

export interface TelemetryAlert {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'CRITICAL';
  message: string;
}

export interface TelemetryHistoryPoint {
  time: string;
  voltage: number | null;
  current: number | null;
  light: number | null;
  tilt: number | null;
  distance: number | null;
}

export interface SensorReading<T = number> {
  value: T;
  unit: string;
  status: SensorStatus;
  lastUpdated: number;
  label: string;
  sensorModel: string;
  rawString?: string;
}

export interface OrientationData {
  pitch: number; // degrees (tiltX)
  roll: number;  // degrees (tiltY)
  yaw: number;   // degrees (tiltZ)
}

export interface PendingCommand {
  id: string;
  command: string;
  sentTimestamp: number;
  status: 'SENDING' | 'SENT' | 'ACKED' | 'TIMEOUT' | 'REJECTED';
  ackStatus?: string;
}

export interface TelemetryState {
  // Connection and identity (USB OTG only)
  connection: ConnectionState;
  connectionError?: string | null;
  transportType: TransportType;
  isDemoMode: boolean;
  deviceName: string;
  baudRate: number;
  lastHeard: number | null;
  lastValidTelemetryTimestamp: number | null;
  isStale: boolean;
  packetRate: number; // Hz
  totalPacketsReceived: number;
  parseErrorCount: number;

  // Spacecraft operational mode
  mode: MissionMode;
  modePending: boolean;
  pendingModeTarget?: MissionMode;

  // Real sensor readings received from Arduino UNO
  ldrLeft: SensorReading<number | null>;     // LDR Left
  ldrCenter: SensorReading<number | null>;   // LDR Center
  ldrRight: SensorReading<number | null>;    // LDR Right
  light: SensorReading<number | null>;       // Consolidated Light
  distance: SensorReading<number | null>;    // HC-SR04 (cm)
  voltage: SensorReading<number | null>;     // INA219 (V)
  current: SensorReading<number | null>;     // INA219 (mA)
  power: SensorReading<number | null>;       // Calculated (W) = (V * mA) / 1000
  tilt: SensorReading<OrientationData>;      // MPU6050 6-DoF
  servoAngle: SensorReading<number | null>;  // SG90 position (0-180°)
  hazard: boolean;                           // Spacecraft hazard flag
  hazardMessage?: string;
  cameraStatus: SensorReading<string>;

  // Pending command queue and acknowledgements
  pendingCommands: PendingCommand[];

  // Mission telemetry health metrics
  healthScore: number;                       // 0 - 100%
  overallStatus: 'NOMINAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
  latestAlert: string;
  uptimeSeconds: number;
}

export interface AnomalyThresholds {
  minVoltage: number;        // Volts (default: 6.5V for 2S bus)
  maxVoltage: number;        // Volts (default: 8.4V)
  maxCurrent: number;        // mA (default: 800mA)
  maxTilt: number;           // degrees (default: 35°)
  minDistance: number;       // cm (default: 15cm)
  minLight: number;          // Lux / ADC raw (default: 50)
  staleTelemetryTimeout: number; // ms without packet (default: 3000ms)
}

export interface AnomalyEvent {
  id: string;
  timestamp: number;
  title: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  sensor: string;
  readingValue: string;
  threshold: string;
  suggestedAction: string;
  origin: 'REAL' | 'SIMULATED' | 'UNCONFIRMED';
  acknowledged: boolean;
}

export interface CameraCapture {
  id: string;
  timestamp: number;
  dataUrl: string;
  label: string;
  eventAssociated?: string;
  resolution: string;
  source: 'ESP32_S3' | 'DEMO_CACHE';
  fileSizeBytes: number;
}

export interface MissionLogEntry {
  id: string;
  timestamp: number;
  type: 'INITIALIZATION' | 'CONNECTION' | 'COMMAND' | 'TELEMETRY' | 'ANOMALY' | 'CAMERA' | 'AI_ADVICE';
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  message: string;
  details?: string;
  source: 'ARDUINO' | 'APP';
  isDemo: boolean;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  suggestedCommand?: {
    command: MissionMode;
    label: string;
    rationale: string;
  };
  isSimulatedTelemetry?: boolean;
}

export interface TelemetryHistoryRecord {
  timestamp: number;
  timeStr: string;
  voltage: number | null;
  current: number | null;
  power: number | null;
  light: number | null;
  distance: number | null;
  tiltPitch: number | null;
  tiltRoll: number | null;
}
