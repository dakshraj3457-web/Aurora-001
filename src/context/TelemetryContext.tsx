/**
 * Central Spacecraft Telemetry State Store and Controller
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  TelemetryState,
  MissionMode,
  AnomalyEvent,
  AnomalyThresholds,
  MissionLogEntry,
  CameraCapture,
  TelemetryHistoryRecord,
  TransportType,
} from '../types/telemetry';
import { ITransport, TransportStatus } from '../transports/TransportInterface';
import { MockTransport } from '../transports/MockTransport';
import { BleTransport } from '../transports/BleTransport';
import { SerialTransport } from '../transports/SerialTransport';
import { WifiTransport } from '../transports/WifiTransport';
import { evaluateAnomalies, calculateSpacecraftHealth, DEFAULT_THRESHOLDS } from '../utils/anomalyDetector';
import { soundManager } from '../utils/sound';

export type AppScreen =
  | 'BOOT'
  | 'START'
  | 'CONNECT'
  | 'DASHBOARD'
  | 'SYSTEM_HEALTH'
  | 'CAMERA'
  | 'AI_OFFICER'
  | 'LOGS'
  | 'MODEL_3D'
  | 'CHARTS'
  | 'SETTINGS';

interface TelemetryContextType {
  telemetry: TelemetryState;
  thresholds: AnomalyThresholds;
  setThresholds: React.Dispatch<React.SetStateAction<AnomalyThresholds>>;
  activeScreen: AppScreen;
  setActiveScreen: (screen: AppScreen) => void;
  anomalies: AnomalyEvent[];
  acknowledgeAnomaly: (id: string) => void;
  clearAnomalies: () => void;
  missionLogs: MissionLogEntry[];
  clearMissionLogs: () => void;
  captures: CameraCapture[];
  addCapture: (capture: CameraCapture) => void;
  history: TelemetryHistoryRecord[];
  
  // Transports & Connections
  activeTransportType: TransportType;
  setActiveTransportType: (type: TransportType) => void;
  connectTransport: (type?: TransportType) => Promise<boolean>;
  disconnectTransport: () => Promise<void>;
  enterDemoMode: () => void;
  
  // Spacecraft Command Execution
  sendCommand: (command: MissionMode | string) => Promise<boolean>;
  
  // Settings & Configuration
  esp32Url: string;
  setEsp32Url: (url: string) => void;
  deviceName: string;
  setDeviceName: (name: string) => void;
}

const initialTelemetry: TelemetryState = {
  connection: 'DISCONNECTED',
  transportType: 'DEMO',
  isDemoMode: false,
  deviceName: 'AURORA-01',
  lastHeard: null,
  rssi: 0,
  packetRate: 0,
  totalPacketsReceived: 0,
  mode: 'NORMAL',
  modePending: false,
  light: {
    value: 0,
    unit: 'Lux',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Ambient Solar Flux',
    sensorModel: 'LDR Cadmium-Sulfide',
  },
  distance: {
    value: 0,
    unit: 'cm',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Proximity Distance',
    sensorModel: 'HC-SR04 Ultrasonic',
  },
  voltage: {
    value: 0,
    unit: 'V',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Bus Voltage',
    sensorModel: 'INA219 High-Side Shunt',
  },
  current: {
    value: 0,
    unit: 'mA',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Current Draw',
    sensorModel: 'INA219 High-Side Shunt',
  },
  power: {
    value: 0,
    unit: 'W',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Power Consumption',
    sensorModel: 'INA219 Calculated (V×I)',
  },
  tilt: {
    value: { pitch: 0, roll: 0, yaw: 0 },
    unit: '°',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: '3-Axis Gyro Attitude',
    sensorModel: 'MPU6050 6-DoF IMU',
  },
  servoAngle: {
    value: 90,
    unit: '°',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Solar Array Steer Angle',
    sensorModel: 'SG90 Micro Servo',
  },
  cameraStatus: {
    value: 'UNCONFIGURED',
    unit: 'link',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Optical Imager',
    sensorModel: 'ESP32-S3 OV7670 Subsystem',
  },
  healthScore: 100,
  overallStatus: 'NOMINAL',
  latestAlert: 'NONE',
  uptimeSeconds: 0,
};

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [telemetry, setTelemetry] = useState<TelemetryState>(initialTelemetry);
  const [thresholds, setThresholds] = useState<AnomalyThresholds>(DEFAULT_THRESHOLDS);
  const [activeScreen, setActiveScreen] = useState<AppScreen>('BOOT');
  const [activeTransportType, setActiveTransportType] = useState<TransportType>('DEMO');
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [missionLogs, setMissionLogs] = useState<MissionLogEntry[]>([
    {
      id: 'init_1',
      timestamp: Date.now(),
      type: 'INITIALIZATION',
      severity: 'INFO',
      message: 'AURORA-01 Mission Control Software v2.4 initialized',
      isDemo: false,
    },
  ]);
  const [captures, setCaptures] = useState<CameraCapture[]>([]);
  const [history, setHistory] = useState<TelemetryHistoryRecord[]>([]);
  const [esp32Url, setEsp32Url] = useState<string>('http://192.168.4.1');
  const [deviceName, setDeviceName] = useState<string>('AURORA-01');

  // Transports registry
  const transportsRef = useRef<Record<TransportType, ITransport>>({
    DEMO: new MockTransport(),
    BLE: new BleTransport(),
    BLUETOOTH_SERIAL: new SerialTransport(),
    WIFI: new WifiTransport(esp32Url),
  });

  const activeTransportRef = useRef<ITransport>(transportsRef.current.DEMO);
  const packetCountRef = useRef(0);
  const lastPacketTimeRef = useRef(Date.now());

  const addLog = (
    type: MissionLogEntry['type'],
    severity: MissionLogEntry['severity'],
    message: string,
    details?: string
  ) => {
    setMissionLogs((prev) => [
      {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        type,
        severity,
        message,
        details,
        isDemo: telemetry.isDemoMode,
      },
      ...prev.slice(0, 200), // retain latest 200 logs
    ]);
  };

  // Wire transport callbacks
  const wireTransport = (transport: ITransport) => {
    transport.setCallbacks({
      onStatusChange: (status: TransportStatus, errorMsg?: string) => {
        setTelemetry((prev) => ({
          ...prev,
          connection: status,
        }));
        if (status === 'CONNECTED') {
          soundManager.playBeep(880, 0.1, 'sine');
          addLog('CONNECTION', 'INFO', `Connected to ${transport.name}`);
        } else if (status === 'DISCONNECTED') {
          addLog('CONNECTION', 'WARN', `Disconnected from ${transport.name}`);
        } else if (status === 'ERROR') {
          soundManager.playAlert();
          addLog('CONNECTION', 'CRITICAL', `Transport error: ${errorMsg || 'Failed'}`);
        }
      },
      onPacketReceived: (packet, rawLine) => {
        packetCountRef.current++;
        const now = Date.now();
        lastPacketTimeRef.current = now;

        setTelemetry((prev) => {
          const nextLightVal = packet.light !== undefined ? packet.light : prev.light.value;
          const nextDistVal = packet.distance !== undefined ? packet.distance : prev.distance.value;
          const nextVoltVal = packet.voltage !== undefined ? packet.voltage : prev.voltage.value;
          const nextCurrVal = packet.current !== undefined ? packet.current : prev.current.value;
          const nextPwrVal =
            nextVoltVal && nextCurrVal
              ? Math.round(((nextVoltVal * nextCurrVal) / 1000) * 100) / 100
              : prev.power.value;

          const nextTilt = packet.tilt || prev.tilt.value;
          const nextServo = packet.servoAngle !== undefined ? packet.servoAngle : prev.servoAngle.value;
          const nextAlert = packet.alert && packet.alert !== 'NONE' ? packet.alert : prev.latestAlert;
          const nextMode = packet.mode || prev.mode;

          // Update state with honest sensor status tags
          const updated: TelemetryState = {
            ...prev,
            lastHeard: now,
            totalPacketsReceived: packetCountRef.current,
            mode: nextMode,
            latestAlert: nextAlert,
            light: {
              ...prev.light,
              value: nextLightVal,
              status: packet.light !== undefined ? 'HEALTHY' : prev.light.status,
              lastUpdated: now,
            },
            distance: {
              ...prev.distance,
              value: nextDistVal,
              status: packet.distance !== undefined ? 'HEALTHY' : prev.distance.status,
              lastUpdated: now,
            },
            voltage: {
              ...prev.voltage,
              value: nextVoltVal,
              status: packet.voltage !== undefined ? 'HEALTHY' : prev.voltage.status,
              lastUpdated: now,
            },
            current: {
              ...prev.current,
              value: nextCurrVal,
              status: packet.current !== undefined ? 'HEALTHY' : prev.current.status,
              lastUpdated: now,
            },
            power: {
              ...prev.power,
              value: nextPwrVal,
              status: nextPwrVal > 0 ? 'HEALTHY' : prev.power.status,
              lastUpdated: now,
            },
            tilt: {
              ...prev.tilt,
              value: nextTilt,
              status: packet.tilt !== undefined ? 'HEALTHY' : prev.tilt.status,
              lastUpdated: now,
            },
            servoAngle: {
              ...prev.servoAngle,
              value: nextServo,
              status: packet.servoAngle !== undefined ? 'HEALTHY' : prev.servoAngle.status,
              lastUpdated: now,
            },
            uptimeSeconds: prev.uptimeSeconds + 1,
          };

          return updated;
        });

        // Append to rolling chart history
        setHistory((prevHist) => {
          const timeStr = new Date(now).toLocaleTimeString();
          const rec: TelemetryHistoryRecord = {
            timestamp: now,
            timeStr,
            voltage: packet.voltage ?? null,
            current: packet.current ?? null,
            power: packet.power ?? null,
            light: packet.light ?? null,
            distance: packet.distance ?? null,
            tiltPitch: packet.tilt?.pitch ?? null,
            tiltRoll: packet.tilt?.roll ?? null,
          };
          return [...prevHist.slice(-50), rec];
        });
      },
      onCommandAck: (command: string, success: boolean) => {
        soundManager.playModeChange();
        setTelemetry((prev) => ({
          ...prev,
          modePending: false,
          pendingModeTarget: undefined,
        }));
        addLog(
          'COMMAND',
          success ? 'INFO' : 'CRITICAL',
          `Command ACK received: ${command} (${success ? 'SUCCESS' : 'FAILED'})`
        );
      },
      onLog: (type, message) => {
        addLog(
          'TELEMETRY',
          type === 'ERROR' ? 'CRITICAL' : type === 'WARN' ? 'WARN' : 'INFO',
          message
        );
      },
    });
  };

  // Run anomaly detection periodic pass
  useEffect(() => {
    const interval = setInterval(() => {
      if (telemetry.connection === 'CONNECTED') {
        const detected = evaluateAnomalies(telemetry, thresholds);
        if (detected.length > 0) {
          setAnomalies(detected);
          const health = calculateSpacecraftHealth(telemetry, detected);
          setTelemetry((prev) => ({
            ...prev,
            healthScore: health.score,
            overallStatus: health.status,
            latestAlert: detected[0]?.title || prev.latestAlert,
          }));
        } else {
          setAnomalies([]);
          setTelemetry((prev) => ({
            ...prev,
            healthScore: 100,
            overallStatus: 'NOMINAL',
          }));
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [telemetry, thresholds]);

  // Connect helper
  const connectTransport = async (type: TransportType = activeTransportType): Promise<boolean> => {
    // If already connected, disconnect first
    if (activeTransportRef.current.isConnected()) {
      await activeTransportRef.current.disconnect();
    }

    const transport = transportsRef.current[type];
    if (!transport) return false;

    activeTransportRef.current = transport;
    setActiveTransportType(type);
    wireTransport(transport);

    setTelemetry((prev) => ({
      ...prev,
      transportType: type,
      isDemoMode: type === 'DEMO',
      connection: 'CONNECTING',
    }));

    const success = await transport.connect();
    return success;
  };

  const disconnectTransport = async (): Promise<void> => {
    if (activeTransportRef.current) {
      await activeTransportRef.current.disconnect();
    }
  };

  const enterDemoMode = () => {
    addLog('INITIALIZATION', 'INFO', 'Entered DEMO MODE with simulated telemetry.');
    connectTransport('DEMO');
    setActiveScreen('DASHBOARD');
  };

  const sendCommand = async (command: MissionMode | string): Promise<boolean> => {
    if (telemetry.connection !== 'CONNECTED') {
      addLog('COMMAND', 'CRITICAL', `Cannot transmit '${command}': Spacecraft disconnected.`);
      return false;
    }

    setTelemetry((prev) => ({
      ...prev,
      modePending: true,
      pendingModeTarget: command as MissionMode,
    }));

    addLog('COMMAND', 'INFO', `Transmitting command -> ${command}`);
    const sent = await activeTransportRef.current.sendCommand(command);

    if (!sent) {
      setTelemetry((prev) => ({
        ...prev,
        modePending: false,
        pendingModeTarget: undefined,
      }));
      addLog('COMMAND', 'CRITICAL', `Transmission failure for '${command}'`);
    }

    return sent;
  };

  const acknowledgeAnomaly = (id: string) => {
    setAnomalies((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const clearAnomalies = () => {
    setAnomalies([]);
    setTelemetry((prev) => ({ ...prev, latestAlert: 'NONE' }));
  };

  const clearMissionLogs = () => {
    setMissionLogs([]);
  };

  const addCapture = (capture: CameraCapture) => {
    setCaptures((prev) => [capture, ...prev]);
    addLog('CAMERA', 'INFO', `Observation image acquired: ${capture.label}`);
  };

  return (
    <TelemetryContext.Provider
      value={{
        telemetry,
        thresholds,
        setThresholds,
        activeScreen,
        setActiveScreen,
        anomalies,
        acknowledgeAnomaly,
        clearAnomalies,
        missionLogs,
        clearMissionLogs,
        captures,
        addCapture,
        history,
        activeTransportType,
        setActiveTransportType,
        connectTransport,
        disconnectTransport,
        enterDemoMode,
        sendCommand,
        esp32Url,
        setEsp32Url,
        deviceName,
        setDeviceName,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

export function useTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error('useTelemetry must be used within TelemetryProvider');
  return ctx;
}
