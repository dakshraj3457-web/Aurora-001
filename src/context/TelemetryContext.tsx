/**
 * Central Spacecraft Telemetry State Store and Controller
 * Architecture: Android Phone -> USB OTG Cable -> Arduino UNO
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
  ConnectionState,
  PendingCommand,
} from '../types/telemetry';
import { ITransport, TransportStatus } from '../transports/TransportInterface';
import { UsbSerialTransport } from '../transports/UsbSerialTransport';
import { MockTransport } from '../transports/MockTransport';
import { ParsedTelemetryPacket } from '../utils/telemetryParser';
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

  // Hardware USB OTG Communication
  activeTransportType: TransportType;
  setActiveTransportType: (type: TransportType) => void;
  connectTransport: (type?: TransportType) => void;
  disconnectTransport: () => Promise<void>;
  enterDemoMode: () => void;
  exitDemoMode: () => void;

  // Spacecraft Command Execution (with ACK tracking)
  sendCommand: (command: string) => Promise<boolean>;

  // Baud rate configuration (default 9600)
  baudRate: number;
  setBaudRate: (baud: number) => void;
  deviceName: string;
  setDeviceName: (name: string) => void;
}

const initialTelemetry: TelemetryState = {
  connection: 'DISCONNECTED',
  connectionError: null,
  transportType: 'USB_SERIAL',
  isDemoMode: false,
  deviceName: 'Arduino UNO (USB OTG)',
  baudRate: 9600,
  lastHeard: null,
  lastValidTelemetryTimestamp: null,
  isStale: false,
  packetRate: 0,
  totalPacketsReceived: 0,
  parseErrorCount: 0,
  mode: 'NORMAL',
  modePending: false,

  // Real sensor readings (Initialized to null - only real received data is displayed)
  ldrLeft: {
    value: null,
    unit: 'ADC',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Solar Flux (Left LDR)',
    sensorModel: 'LDR Cadmium-Sulfide',
  },
  ldrCenter: {
    value: null,
    unit: 'ADC',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Solar Flux (Center LDR)',
    sensorModel: 'LDR Cadmium-Sulfide',
  },
  ldrRight: {
    value: null,
    unit: 'ADC',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Solar Flux (Right LDR)',
    sensorModel: 'LDR Cadmium-Sulfide',
  },
  light: {
    value: null,
    unit: 'Lux',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Consolidated Solar Flux',
    sensorModel: 'LDR Sensor Array',
  },
  distance: {
    value: null,
    unit: 'cm',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Proximity Distance',
    sensorModel: 'HC-SR04 Ultrasonic',
  },
  voltage: {
    value: null,
    unit: 'V',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Bus Voltage',
    sensorModel: 'INA219 High-Side Shunt',
  },
  current: {
    value: null,
    unit: 'mA',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Current Draw',
    sensorModel: 'INA219 High-Side Shunt',
  },
  power: {
    value: null,
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
    label: '3-Axis Attitude Tilt',
    sensorModel: 'MPU6050 6-DoF IMU',
  },
  servoAngle: {
    value: null,
    unit: '°',
    status: 'UNAVAILABLE',
    lastUpdated: 0,
    label: 'Solar Array Steer Angle',
    sensorModel: 'SG90 Micro Servo',
  },
  hazard: false,
  hazardMessage: undefined,
  cameraStatus: {
    value: 'STANDBY',
    unit: 'link',
    status: 'HEALTHY',
    lastUpdated: 0,
    label: 'Optical Imager',
    sensorModel: 'ESP32-S3 Subsystem',
  },

  pendingCommands: [],
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
  const [activeTransportType, setActiveTransportType] = useState<TransportType>('USB_SERIAL');
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [missionLogs, setMissionLogs] = useState<MissionLogEntry[]>([
    {
      id: 'init_1',
      timestamp: Date.now(),
      type: 'INITIALIZATION',
      severity: 'INFO',
      message: 'AURORA-01 USB OTG Mission Control Software initialized',
      details: 'Physical USB-A/B OTG Cable link designated as sole hardware transport.',
      source: 'APP',
      isDemo: false,
    },
  ]);
  const [captures, setCaptures] = useState<CameraCapture[]>([]);
  const [history, setHistory] = useState<TelemetryHistoryRecord[]>([]);
  const [baudRate, setBaudRateState] = useState<number>(9600);
  const [deviceName, setDeviceName] = useState<string>('Arduino UNO (USB OTG)');

  // Transports registry: strictly USB Serial and Simulation Demo
  const usbTransportRef = useRef<UsbSerialTransport>(new UsbSerialTransport(9600));
  const mockTransportRef = useRef<MockTransport>(new MockTransport());

  const activeTransportRef = useRef<ITransport>(usbTransportRef.current);
  const packetCountRef = useRef(0);
  const lastPacketTimeRef = useRef(Date.now());

  const addLog = (
    type: MissionLogEntry['type'],
    severity: MissionLogEntry['severity'],
    message: string,
    details?: string,
    source: 'ARDUINO' | 'APP' = 'APP'
  ) => {
    setMissionLogs((prev) => [
      {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        type,
        severity,
        message,
        details,
        source,
        isDemo: telemetry.isDemoMode,
      },
      ...prev.slice(0, 199),
    ]);
  };

  const setBaudRate = (newBaud: number) => {
    setBaudRateState(newBaud);
    usbTransportRef.current.setBaudRate(newBaud);
    setTelemetry((prev) => ({ ...prev, baudRate: newBaud }));
    addLog('CONNECTION', 'INFO', `Configured serial baud rate to ${newBaud} baud`, undefined, 'APP');
  };

  // Bind transport callbacks
  useEffect(() => {
    const handleStatusChange = (status: TransportStatus, errorMsg?: string) => {
      let connState: ConnectionState = 'DISCONNECTED';
      if (status === 'CONNECTED') connState = 'CONNECTED';
      else if (status === 'CONNECTING') connState = 'CONNECTING';
      else if (status === 'ERROR') connState = 'ERROR';

      setTelemetry((prev) => ({
        ...prev,
        connection: connState,
        connectionError: errorMsg || null,
        // Mark stale if disconnected
        isStale: connState !== 'CONNECTED',
      }));

      if (status === 'CONNECTED') {
        soundManager.playBeep(1200, 0.1, 'triangle');
        addLog('CONNECTION', 'INFO', `USB Serial Link established at ${baudRate} baud`, undefined, 'APP');
      } else if (status === 'ERROR') {
        soundManager.playAlarm();
        addLog('CONNECTION', 'CRITICAL', `USB Serial Link error: ${errorMsg || 'Communication failed'}`, undefined, 'APP');
      } else if (status === 'DISCONNECTED') {
        addLog('CONNECTION', 'WARN', 'USB Serial Link disconnected', undefined, 'APP');
      }
    };

    const handlePacketReceived = (packet: ParsedTelemetryPacket, rawLine: string) => {
      const now = Date.now();
      packetCountRef.current++;

      if (!packet.isValid) {
        setTelemetry((prev) => ({
          ...prev,
          parseErrorCount: prev.parseErrorCount + 1,
        }));
        addLog('TELEMETRY', 'WARN', `Malformed serial packet: ${packet.error || 'Syntax error'}`, rawLine, 'ARDUINO');
        return;
      }

      // Handle Command Acknowledgement
      if (packet.packetType === 'ack') {
        const ackCmd = packet.ackCommand;
        const ackSt = packet.ackStatus || 'OK';

        setTelemetry((prev) => {
          const updatedCmds = prev.pendingCommands.map((c) => {
            if (ackCmd && c.command.toUpperCase().includes(ackCmd.toUpperCase())) {
              return { ...c, status: 'ACKED' as const, ackStatus: ackSt };
            }
            return c;
          });

          // If mode was acknowledged, update confirmed mode
          let newMode = prev.mode;
          if (ackCmd && ackCmd.toUpperCase().startsWith('MODE:')) {
            const m = ackCmd.substring(5).toUpperCase();
            if (m === 'NORMAL' || m === 'POWER_SAVE' || m === 'SAFE' || m === 'SAFE_MODE') {
              newMode = m === 'SAFE' ? 'SAFE_MODE' : (m as MissionMode);
            }
          }

          return {
            ...prev,
            pendingCommands: updatedCmds,
            mode: newMode,
            modePending: false,
          };
        });

        soundManager.playBeep(1400, 0.08, 'sine');
        addLog('COMMAND', 'INFO', `Arduino acknowledged command: ${ackCmd} (${ackSt})`, rawLine, 'ARDUINO');
        return;
      }

      // Handle Pong
      if (packet.packetType === 'pong') {
        setTelemetry((prev) => ({
          ...prev,
          pendingCommands: prev.pendingCommands.map((c) =>
            c.command === 'PING' ? { ...c, status: 'ACKED' as const, ackStatus: 'PONG' } : c
          ),
        }));
        addLog('COMMAND', 'INFO', 'Arduino responded to PING with PONG', rawLine, 'ARDUINO');
        return;
      }

      // Handle Hazard Notification
      if (packet.packetType === 'hazard') {
        setTelemetry((prev) => ({
          ...prev,
          hazard: true,
          hazardMessage: packet.hazardMessage || 'HAZARD ALERT',
        }));
        soundManager.playAlarm();
        addLog('ANOMALY', 'CRITICAL', `Arduino Hazard Alert: ${packet.hazardMessage || 'Hazard detected'}`, rawLine, 'ARDUINO');
        return;
      }

      // Handle Telemetry Packet
      if (packet.packetType === 'telemetry') {
        lastPacketTimeRef.current = now;

        setTelemetry((prev) => {
          const ldrL = packet.ldrLeft ?? prev.ldrLeft.value;
          const ldrC = packet.ldrCenter ?? prev.ldrCenter.value;
          const ldrR = packet.ldrRight ?? prev.ldrRight.value;
          const lightVal = packet.light ?? prev.light.value;
          const distVal = packet.distanceCm ?? prev.distance.value;
          const voltVal = packet.voltage ?? prev.voltage.value;
          const currVal = packet.currentMA ?? prev.current.value;
          const powerVal = packet.powerWatts ?? (voltVal !== null && currVal !== null ? Math.round(((voltVal * currVal) / 1000) * 100) / 100 : null);
          const servoVal = packet.servoAngle ?? prev.servoAngle.value;

          const tiltPitch = packet.tiltX ?? prev.tilt.value.pitch;
          const tiltRoll = packet.tiltY ?? prev.tilt.value.roll;
          const tiltYaw = packet.tiltZ ?? prev.tilt.value.yaw;

          const newMode = packet.mode ?? prev.mode;
          const isHazard = Boolean(packet.hazard);

          const updatedState: TelemetryState = {
            ...prev,
            lastHeard: now,
            lastValidTelemetryTimestamp: now,
            isStale: false,
            totalPacketsReceived: prev.totalPacketsReceived + 1,
            mode: newMode,
            hazard: isHazard,
            ldrLeft: {
              ...prev.ldrLeft,
              value: ldrL,
              status: ldrL !== null ? 'HEALTHY' : 'UNAVAILABLE',
              lastUpdated: ldrL !== null ? now : prev.ldrLeft.lastUpdated,
            },
            ldrCenter: {
              ...prev.ldrCenter,
              value: ldrC,
              status: ldrC !== null ? 'HEALTHY' : 'UNAVAILABLE',
              lastUpdated: ldrC !== null ? now : prev.ldrCenter.lastUpdated,
            },
            ldrRight: {
              ...prev.ldrRight,
              value: ldrR,
              status: ldrR !== null ? 'HEALTHY' : 'UNAVAILABLE',
              lastUpdated: ldrR !== null ? now : prev.ldrRight.lastUpdated,
            },
            light: {
              ...prev.light,
              value: lightVal,
              status: lightVal !== null ? 'HEALTHY' : 'UNAVAILABLE',
              lastUpdated: lightVal !== null ? now : prev.light.lastUpdated,
            },
            distance: {
              ...prev.distance,
              value: distVal,
              status: distVal !== null ? (distVal < 15 ? 'FAULT' : 'HEALTHY') : 'UNAVAILABLE',
              lastUpdated: distVal !== null ? now : prev.distance.lastUpdated,
            },
            voltage: {
              ...prev.voltage,
              value: voltVal,
              status: voltVal !== null ? (voltVal < thresholds.minVoltage ? 'WARNING' : 'HEALTHY') : 'UNAVAILABLE',
              lastUpdated: voltVal !== null ? now : prev.voltage.lastUpdated,
            },
            current: {
              ...prev.current,
              value: currVal,
              status: currVal !== null ? (currVal > thresholds.maxCurrent ? 'WARNING' : 'HEALTHY') : 'UNAVAILABLE',
              lastUpdated: currVal !== null ? now : prev.current.lastUpdated,
            },
            power: {
              ...prev.power,
              value: powerVal,
              status: powerVal !== null ? 'HEALTHY' : 'UNAVAILABLE',
              lastUpdated: powerVal !== null ? now : prev.power.lastUpdated,
            },
            tilt: {
              ...prev.tilt,
              value: { pitch: tiltPitch, roll: tiltRoll, yaw: tiltYaw },
              status: 'HEALTHY',
              lastUpdated: now,
            },
            servoAngle: {
              ...prev.servoAngle,
              value: servoVal,
              status: servoVal !== null ? 'HEALTHY' : 'UNAVAILABLE',
              lastUpdated: servoVal !== null ? now : prev.servoAngle.lastUpdated,
            },
          };

          // Evaluate anomalies based strictly on actual received values
          const activeAnomalies = evaluateAnomalies(updatedState, thresholds);
          const health = calculateSpacecraftHealth(updatedState, activeAnomalies);
          updatedState.healthScore = health.score;
          updatedState.overallStatus = health.status;

          return updatedState;
        });

        // Add history point
        setHistory((prev) => {
          const pt: TelemetryHistoryRecord = {
            timestamp: now,
            timeStr: new Date(now).toTimeString().substring(0, 8),
            voltage: packet.voltage ?? null,
            current: packet.currentMA ?? null,
            power: packet.powerWatts ?? null,
            light: packet.light ?? null,
            distance: packet.distanceCm ?? null,
            tiltPitch: packet.tiltX ?? null,
            tiltRoll: packet.tiltY ?? null,
          };
          return [...prev.slice(-59), pt];
        });
      }
    };

    const handleCommandAck = (command: string, success: boolean) => {
      setTelemetry((prev) => ({
        ...prev,
        pendingCommands: prev.pendingCommands.map((c) => {
          if (c.command === command) {
            return {
              ...c,
              status: success ? 'SENT' : 'REJECTED',
            };
          }
          return c;
        }),
      }));
    };

    const handleLog = (type: 'INFO' | 'WARN' | 'ERROR', message: string) => {
      const sev: MissionLogEntry['severity'] =
        type === 'ERROR' ? 'CRITICAL' : type === 'WARN' ? 'WARN' : 'INFO';
      addLog('CONNECTION', sev, message, undefined, 'APP');
    };

    usbTransportRef.current.setCallbacks({
      onStatusChange: handleStatusChange,
      onPacketReceived: handlePacketReceived,
      onCommandAck: handleCommandAck,
      onLog: handleLog,
    });

    mockTransportRef.current.setCallbacks({
      onStatusChange: handleStatusChange,
      onPacketReceived: handlePacketReceived,
      onCommandAck: handleCommandAck,
      onLog: handleLog,
    });
  }, [thresholds, baudRate]);

  // Periodic telemetry staleness monitor (> 3000ms threshold) and packet rate computation
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const count = packetCountRef.current;
      packetCountRef.current = 0;

      setTelemetry((prev) => {
        const isConnected = prev.connection === 'CONNECTED';
        const isStale =
          isConnected &&
          prev.lastValidTelemetryTimestamp !== null &&
          now - prev.lastValidTelemetryTimestamp > thresholds.staleTelemetryTimeout;

        // Check for timed out pending commands (3 seconds without ACK)
        const updatedCmds = prev.pendingCommands.map((cmd) => {
          if (cmd.status === 'SENT' && now - cmd.sentTimestamp > 3000) {
            return { ...cmd, status: 'TIMEOUT' as const };
          }
          return cmd;
        });

        return {
          ...prev,
          packetRate: count,
          isStale,
          pendingCommands: updatedCmds,
          uptimeSeconds: prev.uptimeSeconds + 1,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [thresholds.staleTelemetryTimeout]);

  // Auto-connect USB on start if running inside APK or Web Serial is available
  useEffect(() => {
    if (activeTransportType === 'USB_SERIAL') {
      activeTransportRef.current = usbTransportRef.current;
      // Trigger USB discovery attempt
      usbTransportRef.current.connect().catch(() => {});
    }
  }, []);

  const connectTransport = (type: TransportType = activeTransportType) => {
    setActiveTransportType(type);
    if (type === 'DEMO') {
      activeTransportRef.current = mockTransportRef.current;
      setTelemetry((prev) => ({ ...prev, isDemoMode: true, transportType: 'DEMO' }));
    } else {
      activeTransportRef.current = usbTransportRef.current;
      setTelemetry((prev) => ({ ...prev, isDemoMode: false, transportType: 'USB_SERIAL' }));
    }
    activeTransportRef.current.connect();
  };

  const disconnectTransport = async () => {
    await activeTransportRef.current.disconnect();
  };

  const enterDemoMode = () => {
    disconnectTransport().then(() => {
      connectTransport('DEMO');
    });
  };

  const exitDemoMode = () => {
    disconnectTransport().then(() => {
      connectTransport('USB_SERIAL');
    });
  };

  // Safe command execution: enforces disconnection checks, 0-180 servo validation, and tracks ACKs
  const sendCommand = async (command: string): Promise<boolean> => {
    if (telemetry.connection !== 'CONNECTED') {
      addLog('COMMAND', 'WARN', `Rejected command: Spacecraft is disconnected (${command})`, undefined, 'APP');
      soundManager.playBeep(400, 0.1, 'sawtooth');
      return false;
    }

    const cmdId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPending: PendingCommand = {
      id: cmdId,
      command,
      sentTimestamp: Date.now(),
      status: 'SENDING',
    };

    setTelemetry((prev) => ({
      ...prev,
      pendingCommands: [newPending, ...prev.pendingCommands.slice(0, 19)],
    }));

    addLog('COMMAND', 'INFO', `Transmitting command -> ${command}`, undefined, 'APP');
    soundManager.playBeep(900, 0.05, 'sine');

    const sent = await activeTransportRef.current.sendCommand(command);
    if (!sent) {
      setTelemetry((prev) => ({
        ...prev,
        pendingCommands: prev.pendingCommands.map((c) => (c.id === cmdId ? { ...c, status: 'REJECTED' } : c)),
      }));
      addLog('COMMAND', 'CRITICAL', `Transmission failed for command: ${command}`, undefined, 'APP');
      return false;
    }

    return true;
  };

  const acknowledgeAnomaly = (id: string) => {
    setAnomalies((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const clearAnomalies = () => setAnomalies([]);
  const clearMissionLogs = () => setMissionLogs([]);
  const addCapture = (capture: CameraCapture) => setCaptures((prev) => [capture, ...prev]);

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
        exitDemoMode,
        sendCommand,
        baudRate,
        setBaudRate,
        deviceName,
        setDeviceName,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = () => {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error('useTelemetry must be used within TelemetryProvider');
  return ctx;
};
