/**
 * Serial Protocol Parser for AURORA-01 Spacecraft
 * Android USB OTG -> Arduino UNO
 *
 * Incoming Telemetry Format: Newline-delimited JSON
 * Example:
 * {"type":"telemetry","ldrLeft":420,"ldrCenter":510,"ldrRight":390,"distanceCm":32.5,"tiltX":2.4,"tiltY":-1.8,"servoAngle":90,"voltage":4.8,"currentMA":120,"hazard":false,"mode":"NORMAL"}
 *
 * Acknowledgements:
 * {"type":"ack","command":"MODE:NORMAL","status":"OK"}
 * {"type":"pong"}
 * {"type":"hazard","message":"OBSTACLE_DETECTED"}
 */

import type { MissionMode } from '../types/telemetry';

export interface ParsedTelemetryPacket {
  isValid: boolean;
  rawPayload: string;
  packetType: 'telemetry' | 'ack' | 'pong' | 'hazard' | 'raw_text' | 'unknown';
  
  // Telemetry fields (null if unavailable or not sent by Arduino)
  ldrLeft?: number | null;
  ldrCenter?: number | null;
  ldrRight?: number | null;
  light?: number | null;
  distanceCm?: number | null;
  voltage?: number | null;
  currentMA?: number | null;
  powerWatts?: number | null;
  tiltX?: number | null;
  tiltY?: number | null;
  tiltZ?: number | null;
  servoAngle?: number | null;
  hazard?: boolean;
  hazardMessage?: string;
  mode?: MissionMode;
  
  // ACK fields
  ackCommand?: string;
  ackStatus?: string;
  
  error?: string;
}

const VALID_MODES: MissionMode[] = ['NORMAL', 'POWER_SAVE', 'SAFE_MODE', 'COURSE_CHANGE', 'RESUME'];

export function parseTelemetryLine(line: string): ParsedTelemetryPacket {
  const trimmed = line.trim();
  if (!trimmed) {
    return {
      isValid: false,
      rawPayload: line,
      packetType: 'unknown',
      error: 'Empty serial payload',
    };
  }

  // 1. Primary: JSON protocol
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const data = JSON.parse(trimmed);
      const pType = data.type || (data.command ? 'ack' : 'telemetry');

      if (pType === 'ack') {
        return {
          isValid: true,
          rawPayload: trimmed,
          packetType: 'ack',
          ackCommand: typeof data.command === 'string' ? data.command : undefined,
          ackStatus: typeof data.status === 'string' ? data.status : 'OK',
        };
      }

      if (pType === 'pong') {
        return {
          isValid: true,
          rawPayload: trimmed,
          packetType: 'pong',
        };
      }

      if (pType === 'hazard') {
        return {
          isValid: true,
          rawPayload: trimmed,
          packetType: 'hazard',
          hazard: true,
          hazardMessage: data.message || 'HAZARD_ALERT',
        };
      }

      // Telemetry packet
      const ldrLeft = Number.isFinite(data.ldrLeft) ? Math.max(0, data.ldrLeft) : null;
      const ldrCenter = Number.isFinite(data.ldrCenter) ? Math.max(0, data.ldrCenter) : null;
      const ldrRight = Number.isFinite(data.ldrRight) ? Math.max(0, data.ldrRight) : null;
      
      // Calculate consolidated light from 3 LDRs or explicit light field
      let light: number | null = null;
      if (Number.isFinite(data.light)) {
        light = data.light;
      } else if (ldrCenter !== null || ldrLeft !== null || ldrRight !== null) {
        const available = [ldrLeft, ldrCenter, ldrRight].filter((v): v is number => v !== null);
        light = available.length > 0 ? Math.round(available.reduce((a, b) => a + b, 0) / available.length) : null;
      }

      const distanceCm = Number.isFinite(data.distanceCm) ? Math.max(0, data.distanceCm) : (Number.isFinite(data.distance) ? data.distance : null);
      const voltage = Number.isFinite(data.voltage) ? Math.max(0, data.voltage) : null;
      const currentMA = Number.isFinite(data.currentMA) ? data.currentMA : (Number.isFinite(data.current) ? data.current : null);
      
      let powerWatts: number | null = null;
      if (voltage !== null && currentMA !== null) {
        powerWatts = Math.round(((voltage * currentMA) / 1000) * 100) / 100;
      }

      const tiltX = Number.isFinite(data.tiltX) ? data.tiltX : (data.tilt?.pitch ?? null);
      const tiltY = Number.isFinite(data.tiltY) ? data.tiltY : (data.tilt?.roll ?? null);
      const tiltZ = Number.isFinite(data.tiltZ) ? data.tiltZ : (data.tilt?.yaw ?? null);

      let servoAngle: number | null = null;
      if (Number.isFinite(data.servoAngle)) {
        servoAngle = Math.min(180, Math.max(0, Math.round(data.servoAngle)));
      }

      let mode: MissionMode | undefined;
      if (typeof data.mode === 'string') {
        const normalized = data.mode.trim().toUpperCase().replace(/\s+/g, '_');
        if (VALID_MODES.includes(normalized as MissionMode)) {
          mode = normalized as MissionMode;
        }
      }

      const hazard = Boolean(data.hazard);

      return {
        isValid: true,
        rawPayload: trimmed,
        packetType: 'telemetry',
        ldrLeft,
        ldrCenter,
        ldrRight,
        light,
        distanceCm,
        voltage,
        currentMA,
        powerWatts,
        tiltX,
        tiltY,
        tiltZ,
        servoAngle,
        hazard,
        mode,
      };
    } catch (jsonErr) {
      return {
        isValid: false,
        rawPayload: trimmed,
        packetType: 'unknown',
        error: `JSON parse error: ${jsonErr instanceof Error ? jsonErr.message : 'Invalid JSON'}`,
      };
    }
  }

  // 2. Fallback: Text acknowledgements (e.g. "ACK:MODE:NORMAL" or "OK:SERVO:90")
  if (trimmed.startsWith('ACK:') || trimmed.startsWith('OK:')) {
    const cmd = trimmed.substring(trimmed.indexOf(':') + 1).trim();
    return {
      isValid: true,
      rawPayload: trimmed,
      packetType: 'ack',
      ackCommand: cmd,
      ackStatus: 'OK',
    };
  }

  // 3. Fallback: Legacy comma-separated format DATA,light,dist,volt,curr,tilt,mode
  if (trimmed.startsWith('DATA,') || trimmed.startsWith('$DATA,')) {
    const parts = trimmed.split(',').slice(1);
    if (parts.length >= 5) {
      try {
        const light = parseFloat(parts[0]);
        const distanceCm = parseFloat(parts[1]);
        const voltage = parseFloat(parts[2]);
        const currentMA = parseFloat(parts[3]);
        const powerWatts = (Number.isFinite(voltage) && Number.isFinite(currentMA))
          ? Math.round(((voltage * currentMA) / 1000) * 100) / 100
          : null;
        const tiltX = parseFloat(parts[4]);

        return {
          isValid: true,
          rawPayload: trimmed,
          packetType: 'telemetry',
          light: Number.isFinite(light) ? light : null,
          distanceCm: Number.isFinite(distanceCm) ? distanceCm : null,
          voltage: Number.isFinite(voltage) ? voltage : null,
          currentMA: Number.isFinite(currentMA) ? currentMA : null,
          powerWatts,
          tiltX: Number.isFinite(tiltX) ? tiltX : null,
          mode: 'NORMAL',
        };
      } catch (e) {
        // Fall through
      }
    }
  }

  // 4. Raw text message / non-JSON diagnostic line from Arduino
  return {
    isValid: true,
    rawPayload: trimmed,
    packetType: 'raw_text',
    error: undefined,
  };
}

/**
 * Validates and formats commands for Arduino transmission.
 * Supported commands:
 * - MODE:NORMAL
 * - MODE:POWER_SAVE
 * - MODE:SAFE
 * - SERVO:<angle> (0-180)
 * - PING
 */
export function validateAndFormatCommand(command: string): { valid: boolean; formatted: string; error?: string } {
  const trimmed = command.trim();
  if (!trimmed) {
    return { valid: false, formatted: '', error: 'Command cannot be empty' };
  }

  // Ping command
  if (trimmed.toUpperCase() === 'PING') {
    return { valid: true, formatted: 'PING\n' };
  }

  // Mode commands
  if (trimmed.toUpperCase().startsWith('MODE:')) {
    const mode = trimmed.substring(5).trim().toUpperCase();
    if (['NORMAL', 'POWER_SAVE', 'SAFE', 'SAFE_MODE'].includes(mode)) {
      const canonicalMode = mode === 'SAFE_MODE' ? 'SAFE' : mode;
      return { valid: true, formatted: `MODE:${canonicalMode}\n` };
    }
    return { valid: false, formatted: '', error: `Invalid mode '${mode}'. Allowed: NORMAL, POWER_SAVE, SAFE` };
  }

  // Servo command
  if (trimmed.toUpperCase().startsWith('SERVO:')) {
    const angleStr = trimmed.substring(6).trim();
    const angle = parseInt(angleStr, 10);
    if (isNaN(angle) || angle < 0 || angle > 180) {
      return { valid: false, formatted: '', error: `Invalid servo angle '${angleStr}'. Must be an integer between 0 and 180 degrees.` };
    }
    return { valid: true, formatted: `SERVO:${angle}\n` };
  }

  // General alphanumeric command validation
  if (/^[A-Za-z0-9_:]+$/.test(trimmed)) {
    return { valid: true, formatted: `${trimmed}\n` };
  }

  return { valid: false, formatted: '', error: 'Command contains invalid characters' };
}
