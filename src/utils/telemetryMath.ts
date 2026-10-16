/**
 * Pure math and validation utilities for Aurora-01 satellite telemetry.
 * Decoupled from React to enable ultra-fast native unit testing.
 */

import type { MissionMode } from '../types/telemetry.ts';

/**
 * Calculates battery charge percentage for a 2S Li-ion battery pack (6.0V cutoff to 8.4V max).
 */
export function calculateBatteryPercentage(voltage: number): number {
  if (voltage <= 6.0) return 0;
  if (voltage >= 8.4) return 100;
  // Non-linear discharge approximation
  const normalized = (voltage - 6.0) / (8.4 - 6.0);
  return Math.round(normalized * 100);
}

/**
 * Calculates electrical power consumption in Watts from Volts and Milliamperes.
 */
export function calculatePowerWatts(voltage: number, currentMa: number): number {
  const watts = (voltage * currentMa) / 1000;
  return Math.round(watts * 100) / 100;
}

/**
 * Computes resultant tilt magnitude from pitch and roll in degrees.
 */
export function calculateTiltMagnitude(pitch: number, roll: number): number {
  const magnitude = Math.sqrt(pitch * pitch + roll * roll);
  return Math.round(magnitude * 10) / 10;
}

/**
 * Evaluates current telemetry parameters against aerospace safe boundaries
 * to generate automated mission control alerts.
 */
export function evaluateTelemetryAlert(params: {
  voltage: number;
  current: number;
  light: number;
  tiltMagnitude: number;
  distance: number;
}): { level: 'INFO' | 'WARN' | 'CRITICAL'; message: string } {
  const { voltage, current, light, tiltMagnitude, distance } = params;

  if (voltage < 6.4) {
    return { level: 'CRITICAL', message: `CRITICAL: LOW BUS VOLTAGE (${voltage.toFixed(1)}V)` };
  }
  if (current > 800) {
    return { level: 'WARN', message: `WARN: HIGH CURRENT DRAW (${Math.round(current)}mA)` };
  }
  if (tiltMagnitude > 40) {
    return { level: 'WARN', message: `WARN: EXCESSIVE ATTITUDE TILT (${tiltMagnitude.toFixed(1)}°)` };
  }
  if (distance < 5 && distance > 0) {
    return { level: 'WARN', message: `WARN: PROXIMITY ALERT (<5cm OBJECT)` };
  }
  if (light < 50) {
    return { level: 'INFO', message: 'ECLIPSE: ORBITAL UMBRA (SOLAR FLUX LOW)' };
  }
  if (light > 2500) {
    return { level: 'INFO', message: 'DIRECT SUN: SOLAR ARRAY AT PEAK FLUX' };
  }

  return { level: 'INFO', message: 'NONE' };
}

/**
 * Generates formatted telemetry packet checksum for uplink/downlink integrity.
 */
export function calculatePacketChecksum(payload: string): string {
  let chk = 0;
  for (let i = 0; i < payload.length; i++) {
    chk = (chk + payload.charCodeAt(i)) & 0xff;
  }
  return chk.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Constructs aerospace telemetry command uplink frame.
 */
export function buildUplinkCommand(command: string, mode?: MissionMode): string {
  const payload = mode ? `AURORA-01:SET_MODE:${mode}` : `AURORA-01:CMD:${command}`;
  const checksum = calculatePacketChecksum(payload);
  return `$${payload}*${checksum}`;
}

/**
 * Returns configuration profiles for each mission mode.
 */
export function getModeConfig(mode: MissionMode | string) {
  const normalized = mode.replace(/\s+/g, '_');
  switch (normalized) {
    case 'POWER_SAVE':
      return {
        telemetryRateHz: 1,
        solarTracking: false,
        payloadEnabled: false,
        txPowerDbm: 14,
        statusColor: '#f59e0b',
        description: 'Low-frequency beacon only. Non-critical payloads powered down to conserve bus battery.',
      };
    case 'SAFE_MODE':
      return {
        telemetryRateHz: 2,
        solarTracking: true,
        payloadEnabled: false,
        txPowerDbm: 20,
        statusColor: '#ef4444',
        description: 'Emergency attitude recovery. Gyroscopic lock on Sun; ground station listen-only.',
      };
    case 'COURSE_CHANGE':
      return {
        telemetryRateHz: 20,
        solarTracking: false,
        payloadEnabled: true,
        txPowerDbm: 24,
        statusColor: '#a855f7',
        description: 'Reaction wheel spin-up and RCS attitude thrusters armed for orbital trajectory adjustment.',
      };
    case 'RESUME':
    case 'NORMAL':
    default:
      return {
        telemetryRateHz: 10,
        solarTracking: true,
        payloadEnabled: true,
        txPowerDbm: 27,
        statusColor: '#10b981',
        description: 'Nominal orbital operations. Primary optical payload active, continuous telemetry broadcast.',
      };
  }
}
