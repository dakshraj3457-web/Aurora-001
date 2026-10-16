/**
 * AURORA-01 Autonomous Spacecraft Mission Control
 * Core Telemetry and Subsystem Data Types
 */

export type MissionMode = 'NORMAL' | 'POWER_SAVE' | 'SAFE_MODE' | 'COURSE_CHANGE' | 'RESUME';

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export type TransportType = 'BLE' | 'BLUETOOTH_SERIAL' | 'WIFI' | 'DEMO';

export type SensorStatus = 'HEALTHY' | 'WARNING' | 'FAULT' | 'UNAVAILABLE';

export interface TelemetryAlert {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'CRITICAL';
  message: string;
}

export interface TelemetryHistoryPoint {
  time: string;
  voltage: number;
  current: number;
  light: number;
  tilt: number;
  distance: number;
}

export interface TelemetryData {
  connection: ConnectionState;
  mode: MissionMode;
  light: number;
  distance: number;
  distanceUnit: 'cm' | 'km';
  voltage: number;
  current: number;
  tilt: {
    pitch: number;
    roll: number;
    yaw: number;
  };
  latestAlert: string;
  timestamp: number;
  batteryLevel: number;
  powerWatts: number;
  temperature: number;
  signalDbm: number;
  packetRate: number;
  missionElapsedSeconds: number;
  orbitAltitudeKm: number;
  solarPanelStatus: 'DEPLOYED' | 'STOWED' | 'DEPLOYING';
  reactionWheelsRpm: number;
}

export interface SensorReading<T = number> {
  value: T;
  unit: string;
  status: SensorStatus;
  lastUpdated: number;
  label: string;
  sensorModel: string;
}

export interface OrientationData {
  pitch: number; // degrees
  roll: number;  // degrees
  yaw: number;   // degrees
  accelX?: number;
  accelY?: number;
  accelZ?: number;
}

export interface TelemetryState {
  // Connection and identity
  connection: ConnectionState;
  transportType: TransportType;
  isDemoMode: boolean;
  deviceName: string;
  lastHeard: number | null;
  rssi: number; // dBm
  packetRate: number; // Hz
  totalPacketsReceived: number;

  // Spacecraft operational mode
  mode: MissionMode;
  modePending: boolean;
  pendingModeTarget?: MissionMode;

  // Real sensor readings (Arduino UNO + ESP32-S3 hardware)
  light: SensorReading<number>;        // LDR
  distance: SensorReading<number>;     // HC-SR04 (cm)
  voltage: SensorReading<number>;      // INA219 (V)
  current: SensorReading<number>;      // INA219 (mA)
  power: SensorReading<number>;        // Calculated (W) = (V * mA) / 1000
  tilt: SensorReading<OrientationData>;// MPU6050
  servoAngle: SensorReading<number>;   // Servo position (0-180°)
  cameraStatus: SensorReading<string>; // ESP32-S3 OV7670
  
  // Mission telemetry metrics
  healthScore: number;                 // 0 - 100%
  overallStatus: 'NOMINAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
  latestAlert: string;
  uptimeSeconds: number;
}

export interface AnomalyThresholds {
  minVoltage: number;        // Volts (default: 6.5V for 2S bus)
  maxVoltage: number;        // Volts (default: 8.4V)
  maxCurrent: number;        // mA (default: 800mA)
  maxTilt: number;           // degrees (default: 35°)
  minDistance: number;       // cm (default: 10cm)
  minLight: number;          // Lux / ADC raw (default: 50)
  staleTelemetryTimeout: number; // ms without packet (default: 3500ms)
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
