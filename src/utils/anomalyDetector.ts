/**
 * Local Rule-Based Spacecraft Anomaly Detector
 * Operates offline with zero external dependencies.
 */

import type { TelemetryState, AnomalyThresholds, AnomalyEvent } from '../types/telemetry.ts';

export const DEFAULT_THRESHOLDS: AnomalyThresholds = {
  minVoltage: 6.5,          // 2S Li-ion safe cut-off limit
  maxVoltage: 8.4,          // 2S full charge
  maxCurrent: 850,          // mA max continuous draw
  maxTilt: 35,              // degrees before attitude drift warning
  minDistance: 10,          // cm proximity warning
  minLight: 50,             // Lux/ADC umbra threshold
  staleTelemetryTimeout: 4000, // ms without packet
};

export function evaluateAnomalies(
  telemetry: TelemetryState,
  thresholds: AnomalyThresholds = DEFAULT_THRESHOLDS,
  now: number = Date.now()
): AnomalyEvent[] {
  const anomalies: AnomalyEvent[] = [];
  const origin = telemetry.isDemoMode ? 'SIMULATED' : 'REAL';

  // If disconnected, don't flag sensor values as anomalies, but flag link state
  if (telemetry.connection !== 'CONNECTED') {
    return anomalies;
  }

  // 1. Telemetry Staleness / Communication Loss
  if (telemetry.lastHeard && now - telemetry.lastHeard > thresholds.staleTelemetryTimeout) {
    const elapsedSec = ((now - telemetry.lastHeard) / 1000).toFixed(1);
    anomalies.push({
      id: `comm_loss_${now}`,
      timestamp: now,
      title: 'Telemetry Stream Stalled',
      severity: 'CRITICAL',
      sensor: 'Communication Link',
      readingValue: `No packets for ${elapsedSec}s`,
      threshold: `Max ${thresholds.staleTelemetryTimeout / 1000}s`,
      suggestedAction: 'Check controller power, baud rate, and antenna orientation.',
      origin,
      acknowledged: false,
    });
  }

  // 2. Bus Voltage Check (INA219)
  if (telemetry.voltage.status !== 'UNAVAILABLE' && typeof telemetry.voltage.value === 'number') {
    const v = telemetry.voltage.value;
    if (v < thresholds.minVoltage) {
      anomalies.push({
        id: `low_voltage_${now}`,
        timestamp: now,
        title: 'Critical Low Bus Voltage',
        severity: 'CRITICAL',
        sensor: 'INA219 Power Monitor',
        readingValue: `${v.toFixed(2)} V`,
        threshold: `< ${thresholds.minVoltage} V`,
        suggestedAction: 'Engage POWER_SAVE mode immediately. Check solar array orientation.',
        origin,
        acknowledged: false,
      });
    }
  }

  // 3. Current Draw Check (INA219)
  if (telemetry.current.status !== 'UNAVAILABLE' && typeof telemetry.current.value === 'number') {
    const i = telemetry.current.value;
    if (i > thresholds.maxCurrent) {
      anomalies.push({
        id: `high_current_${now}`,
        timestamp: now,
        title: 'High Bus Current Overload',
        severity: 'WARNING',
        sensor: 'INA219 Current Shunt',
        readingValue: `${Math.round(i)} mA`,
        threshold: `> ${thresholds.maxCurrent} mA`,
        suggestedAction: 'Power down non-critical sub-circuits or check for motor/servo stall.',
        origin,
        acknowledged: false,
      });
    }
  }

  // 4. Ultrasonic Proximity Check (HC-SR04)
  if (telemetry.distance.status !== 'UNAVAILABLE' && typeof telemetry.distance.value === 'number') {
    const d = telemetry.distance.value;
    if (d > 0 && d < thresholds.minDistance) {
      anomalies.push({
        id: `proximity_alert_${now}`,
        timestamp: now,
        title: 'Proximity Warning: Close Obstacle Detected',
        severity: 'WARNING',
        sensor: 'HC-SR04 Ultrasonic Ranger',
        readingValue: `${d.toFixed(1)} cm`,
        threshold: `< ${thresholds.minDistance} cm`,
        suggestedAction: 'Execute COURSE_CHANGE or halt maneuver.',
        origin,
        acknowledged: false,
      });
    }
  }

  // 5. Gyroscope Attitude / Tilt Check (MPU6050)
  if (telemetry.tilt.status !== 'UNAVAILABLE' && telemetry.tilt.value) {
    const { pitch, roll } = telemetry.tilt.value;
    const tiltMagnitude = Math.sqrt(pitch * pitch + roll * roll);
    if (tiltMagnitude > thresholds.maxTilt) {
      anomalies.push({
        id: `abnormal_tilt_${now}`,
        timestamp: now,
        title: 'Attitude Drift Exceeded Safe Limit',
        severity: 'WARNING',
        sensor: 'MPU6050 IMU Gyro/Accel',
        readingValue: `${tiltMagnitude.toFixed(1)}°`,
        threshold: `> ${thresholds.maxTilt}°`,
        suggestedAction: 'Engage SAFE_MODE to stabilize spacecraft attitude.',
        origin,
        acknowledged: false,
      });
    }
  }

  // 6. Light / Eclipse Transition (LDR)
  if (telemetry.light.status !== 'UNAVAILABLE' && typeof telemetry.light.value === 'number') {
    const l = telemetry.light.value;
    if (l < thresholds.minLight) {
      anomalies.push({
        id: `low_light_${now}`,
        timestamp: now,
        title: 'Orbital Eclipse Umbra Transit',
        severity: 'INFO',
        sensor: 'Cadmium-Sulfide LDR',
        readingValue: `${Math.round(l)} Lux`,
        threshold: `< ${thresholds.minLight} Lux`,
        suggestedAction: 'Monitor battery drain rate until orbital dawn.',
        origin,
        acknowledged: false,
      });
    }
  }

  // 7. Spacecraft Hardware Hazard Flag (Sent directly by Arduino)
  if (telemetry.hazard) {
    anomalies.push({
      id: `hazard_alert_${now}`,
      timestamp: now,
      title: 'Spacecraft Hardware Hazard Alert',
      severity: 'CRITICAL',
      sensor: 'Arduino Flight Computer',
      readingValue: telemetry.hazardMessage || 'HAZARD_ACTIVE',
      threshold: 'State == ACTIVE',
      suggestedAction: 'Investigate immediate obstacle or electrical anomaly. Consider engaging SAFE_MODE.',
      origin,
      acknowledged: false,
    });
  }

  return anomalies;
}

/**
 * Calculates overall spacecraft health score (0 - 100) based on active sensor states
 */
export function calculateSpacecraftHealth(
  telemetry: TelemetryState,
  anomalies: AnomalyEvent[]
): { score: number; status: 'NOMINAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL' } {
  if (telemetry.connection !== 'CONNECTED') {
    return { score: 0, status: 'ADVISORY' };
  }

  let deduction = 0;
  for (const anom of anomalies) {
    if (anom.severity === 'CRITICAL') deduction += 35;
    else if (anom.severity === 'WARNING') deduction += 15;
    else if (anom.severity === 'INFO') deduction += 3;
  }

  const score = Math.max(10, Math.min(100, 100 - deduction));
  let status: 'NOMINAL' | 'ADVISORY' | 'WARNING' | 'CRITICAL' = 'NOMINAL';
  if (score < 40) status = 'CRITICAL';
  else if (score < 70) status = 'WARNING';
  else if (score < 90) status = 'ADVISORY';

  return { score, status };
}
