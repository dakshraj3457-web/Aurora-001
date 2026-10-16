/**
 * Telemetry Parser for Arduino UNO Spacecraft Controller
 * Format specification:
 * DATA,light,distance,voltage,current,tilt,mode,alert
 *
 * Example:
 * DATA,850,42.5,7.82,410,3.2,NORMAL,NONE
 */

import type { MissionMode } from '../types/telemetry.ts';

export interface ParsedTelemetryPacket {
  isValid: boolean;
  rawPayload: string;
  light?: number;       // LDR reading
  distance?: number;    // HC-SR04 cm
  voltage?: number;     // INA219 V
  current?: number;     // INA219 mA
  power?: number;       // Calculated Watts
  tilt?: {
    pitch: number;
    roll: number;
    yaw: number;
  };
  mode?: MissionMode;
  alert?: string;
  servoAngle?: number;
  error?: string;
}

const VALID_MODES: MissionMode[] = ['NORMAL', 'POWER_SAVE', 'SAFE_MODE', 'COURSE_CHANGE', 'RESUME'];

export function parseTelemetryLine(line: string): ParsedTelemetryPacket {
  const trimmed = line.trim();
  if (!trimmed) {
    return { isValid: false, rawPayload: line, error: 'Empty payload' };
  }

  // Handle command ACK lines
  if (trimmed.startsWith('ACK:') || trimmed.startsWith('OK:')) {
    return {
      isValid: true,
      rawPayload: trimmed,
      alert: trimmed,
    };
  }

  // Support packets with or without 'DATA' prefix
  let parts = trimmed.split(',');
  if (parts[0] === 'DATA' || parts[0] === '$DATA') {
    parts = parts.slice(1);
  }

  // Expected at least: light, distance, voltage, current, tilt, mode
  if (parts.length < 5) {
    return {
      isValid: false,
      rawPayload: line,
      error: `Insufficient fields (found ${parts.length}, expected >= 5)`,
    };
  }

  try {
    // 1. Light (LDR)
    const rawLight = parseFloat(parts[0]);
    const light = Number.isFinite(rawLight) ? Math.max(0, rawLight) : undefined;

    // 2. Distance (HC-SR04 cm)
    const rawDistance = parseFloat(parts[1]);
    const distance = Number.isFinite(rawDistance) ? Math.max(0, rawDistance) : undefined;

    // 3. Voltage (INA219 V)
    const rawVoltage = parseFloat(parts[2]);
    const voltage = Number.isFinite(rawVoltage) ? Math.max(0, rawVoltage) : undefined;

    // 4. Current (INA219 mA)
    const rawCurrent = parseFloat(parts[3]);
    const current = Number.isFinite(rawCurrent) ? rawCurrent : undefined;

    // 5. Calculated Power in Watts
    let power: number | undefined;
    if (voltage !== undefined && current !== undefined) {
      power = Math.round(((voltage * current) / 1000) * 100) / 100;
    }

    // 6. Tilt (MPU6050)
    // Could be a single tilt angle or pitch:roll:yaw
    let tiltObj = { pitch: 0, roll: 0, yaw: 0 };
    if (parts[4]) {
      const tiltParts = parts[4].split(':');
      if (tiltParts.length >= 3) {
        tiltObj = {
          pitch: parseFloat(tiltParts[0]) || 0,
          roll: parseFloat(tiltParts[1]) || 0,
          yaw: parseFloat(tiltParts[2]) || 0,
        };
      } else {
        const singleAngle = parseFloat(parts[4]);
        tiltObj = {
          pitch: Number.isFinite(singleAngle) ? singleAngle : 0,
          roll: 0,
          yaw: 0,
        };
      }
    }

    // 7. Mode
    let mode: MissionMode | undefined;
    if (parts[5]) {
      const rawMode = parts[5].trim().toUpperCase().replace(/\s+/g, '_');
      const matched = VALID_MODES.find((m) => m === rawMode);
      if (matched) {
        mode = matched;
      }
    }

    // 8. Alert
    const alert = parts[6] ? parts[6].trim() : 'NONE';

    // 9. Optional Servo angle
    let servoAngle: number | undefined;
    if (parts[7]) {
      const rawAngle = parseFloat(parts[7]);
      if (Number.isFinite(rawAngle)) {
        servoAngle = Math.min(180, Math.max(0, rawAngle));
      }
    }

    return {
      isValid: true,
      rawPayload: trimmed,
      light,
      distance,
      voltage,
      current,
      power,
      tilt: tiltObj,
      mode,
      alert,
      servoAngle,
    };
  } catch (err) {
    return {
      isValid: false,
      rawPayload: line,
      error: err instanceof Error ? err.message : 'Parse error',
    };
  }
}

/**
 * Formats command for Arduino transmission with trailing newline
 */
export function formatCommand(cmd: MissionMode | string): string {
  const normalized = cmd.trim().toUpperCase().replace(/\s+/g, '_');
  return `${normalized}\n`;
}
