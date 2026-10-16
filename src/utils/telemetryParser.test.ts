import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTelemetryLine, formatCommand } from './telemetryParser.ts';
import { evaluateAnomalies, calculateSpacecraftHealth, DEFAULT_THRESHOLDS } from './anomalyDetector.ts';
import type { TelemetryState } from '../types/telemetry.ts';

test('parseTelemetryLine parses standard Arduino DATA line', () => {
  const line = 'DATA,850,42.5,7.82,410,3.2,NORMAL,NONE';
  const res = parseTelemetryLine(line);

  assert.equal(res.isValid, true);
  assert.equal(res.light, 850);
  assert.equal(res.distance, 42.5);
  assert.equal(res.voltage, 7.82);
  assert.equal(res.current, 410);
  assert.equal(res.power, 3.21); // (7.82 * 410) / 1000 = 3.2062 -> 3.21
  assert.equal(res.mode, 'NORMAL');
  assert.equal(res.alert, 'NONE');
  assert.equal(res.tilt?.pitch, 3.2);
});

test('parseTelemetryLine handles 3-axis tilt format', () => {
  const line = 'DATA,1200,15.0,7.40,250,5.1:-2.3:45.0,SAFE_MODE,BATTERY_LOW';
  const res = parseTelemetryLine(line);

  assert.equal(res.isValid, true);
  assert.equal(res.tilt?.pitch, 5.1);
  assert.equal(res.tilt?.roll, -2.3);
  assert.equal(res.tilt?.yaw, 45.0);
  assert.equal(res.mode, 'SAFE_MODE');
  assert.equal(res.alert, 'BATTERY_LOW');
});

test('parseTelemetryLine handles ACK command lines', () => {
  const res = parseTelemetryLine('ACK:MODE_CHANGED_NORMAL');
  assert.equal(res.isValid, true);
  assert.equal(res.alert, 'ACK:MODE_CHANGED_NORMAL');
});

test('formatCommand adds newline for serial transmission', () => {
  assert.equal(formatCommand('NORMAL'), 'NORMAL\n');
  assert.equal(formatCommand('SAFE MODE'), 'SAFE_MODE\n');
  assert.equal(formatCommand('COURSE_CHANGE'), 'COURSE_CHANGE\n');
});

test('evaluateAnomalies catches low voltage and proximity obstacles', () => {
  const mockTelemetry: TelemetryState = {
    connection: 'CONNECTED',
    transportType: 'DEMO',
    isDemoMode: true,
    deviceName: 'AURORA-01',
    lastHeard: Date.now(),
    rssi: -65,
    packetRate: 10,
    totalPacketsReceived: 100,
    mode: 'NORMAL',
    modePending: false,
    light: { value: 600, unit: 'Lux', status: 'HEALTHY', lastUpdated: Date.now(), label: 'Light', sensorModel: 'LDR' },
    distance: { value: 4.2, unit: 'cm', status: 'WARNING', lastUpdated: Date.now(), label: 'Distance', sensorModel: 'HC-SR04' },
    voltage: { value: 6.1, unit: 'V', status: 'FAULT', lastUpdated: Date.now(), label: 'Bus Voltage', sensorModel: 'INA219' },
    current: { value: 350, unit: 'mA', status: 'HEALTHY', lastUpdated: Date.now(), label: 'Current', sensorModel: 'INA219' },
    power: { value: 2.14, unit: 'W', status: 'HEALTHY', lastUpdated: Date.now(), label: 'Power', sensorModel: 'INA219' },
    tilt: { value: { pitch: 1.0, roll: 0.5, yaw: 0 }, unit: '°', status: 'HEALTHY', lastUpdated: Date.now(), label: 'Attitude', sensorModel: 'MPU6050' },
    servoAngle: { value: 90, unit: '°', status: 'HEALTHY', lastUpdated: Date.now(), label: 'Solar Servo', sensorModel: 'SG90' },
    cameraStatus: { value: 'STANDBY', unit: 'status', status: 'HEALTHY', lastUpdated: Date.now(), label: 'Camera', sensorModel: 'OV7670' },
    healthScore: 65,
    overallStatus: 'WARNING',
    latestAlert: 'NONE',
    uptimeSeconds: 120,
  };

  const anomalies = evaluateAnomalies(mockTelemetry, DEFAULT_THRESHOLDS);
  assert.ok(anomalies.some((a) => a.title.includes('Low Bus Voltage')));
  assert.ok(anomalies.some((a) => a.title.includes('Proximity Warning')));

  const health = calculateSpacecraftHealth(mockTelemetry, anomalies);
  assert.ok(health.score < 100);
});
