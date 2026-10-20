import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTelemetryLine, validateAndFormatCommand } from './telemetryParser.ts';
import { evaluateAnomalies, calculateSpacecraftHealth, DEFAULT_THRESHOLDS } from './anomalyDetector.ts';
import type { TelemetryState } from '../types/telemetry.ts';

test('parseTelemetryLine correctly parses newline JSON telemetry format', () => {
  const jsonPacket = '{"type":"telemetry","ldrLeft":420,"ldrCenter":510,"ldrRight":390,"distanceCm":32.5,"tiltX":2.4,"tiltY":-1.8,"servoAngle":90,"voltage":4.8,"currentMA":120,"hazard":false,"mode":"NORMAL"}';
  const res = parseTelemetryLine(jsonPacket);

  assert.equal(res.isValid, true);
  assert.equal(res.packetType, 'telemetry');
  assert.equal(res.ldrLeft, 420);
  assert.equal(res.ldrCenter, 510);
  assert.equal(res.ldrRight, 390);
  assert.equal(res.distanceCm, 32.5);
  assert.equal(res.tiltX, 2.4);
  assert.equal(res.tiltY, -1.8);
  assert.equal(res.servoAngle, 90);
  assert.equal(res.voltage, 4.8);
  assert.equal(res.currentMA, 120);
  assert.equal(res.powerWatts, 0.58); // (4.8 * 120) / 1000 = 0.576 -> 0.58
  assert.equal(res.hazard, false);
  assert.equal(res.mode, 'NORMAL');
});

test('parseTelemetryLine handles acknowledgement and hazard packets', () => {
  const ack = parseTelemetryLine('{"type":"ack","command":"MODE:NORMAL","status":"OK"}');
  assert.equal(ack.isValid, true);
  assert.equal(ack.packetType, 'ack');
  assert.equal(ack.ackCommand, 'MODE:NORMAL');

  const hazard = parseTelemetryLine('{"type":"hazard","message":"OBSTACLE_DETECTED"}');
  assert.equal(hazard.isValid, true);
  assert.equal(hazard.packetType, 'hazard');
  assert.equal(hazard.hazard, true);
  assert.equal(hazard.hazardMessage, 'OBSTACLE_DETECTED');

  const textAck = parseTelemetryLine('ACK:MODE:SAFE');
  assert.equal(textAck.isValid, true);
  assert.equal(textAck.packetType, 'ack');
  assert.equal(textAck.ackCommand, 'MODE:SAFE');
});

test('validateAndFormatCommand verifies command syntax and servo bounds', () => {
  const ping = validateAndFormatCommand('PING');
  assert.equal(ping.valid, true);
  assert.equal(ping.formatted, 'PING\n');

  const mode = validateAndFormatCommand('MODE:NORMAL');
  assert.equal(mode.valid, true);
  assert.equal(mode.formatted, 'MODE:NORMAL\n');

  const servoValid = validateAndFormatCommand('SERVO:90');
  assert.equal(servoValid.valid, true);
  assert.equal(servoValid.formatted, 'SERVO:90\n');

  const servoInvalidLow = validateAndFormatCommand('SERVO:-10');
  assert.equal(servoInvalidLow.valid, false);

  const servoInvalidHigh = validateAndFormatCommand('SERVO:250');
  assert.equal(servoInvalidHigh.valid, false);
});

test('evaluateAnomalies catches low bus voltage and proximity hazard', () => {
  const now = Date.now();
  const mockTelemetry: TelemetryState = {
    connection: 'CONNECTED',
    transportType: 'USB_SERIAL',
    isDemoMode: false,
    deviceName: 'Arduino UNO (USB OTG)',
    baudRate: 9600,
    lastHeard: now,
    lastValidTelemetryTimestamp: now,
    isStale: false,
    packetRate: 5,
    totalPacketsReceived: 50,
    parseErrorCount: 0,
    mode: 'NORMAL',
    modePending: false,
    ldrLeft: { value: 420, unit: 'ADC', status: 'HEALTHY', lastUpdated: now, label: 'LDR Left', sensorModel: 'LDR' },
    ldrCenter: { value: 510, unit: 'ADC', status: 'HEALTHY', lastUpdated: now, label: 'LDR Center', sensorModel: 'LDR' },
    ldrRight: { value: 390, unit: 'ADC', status: 'HEALTHY', lastUpdated: now, label: 'LDR Right', sensorModel: 'LDR' },
    light: { value: 440, unit: 'Lux', status: 'HEALTHY', lastUpdated: now, label: 'Light', sensorModel: 'LDR' },
    distance: { value: 5.0, unit: 'cm', status: 'WARNING', lastUpdated: now, label: 'Distance', sensorModel: 'HC-SR04' },
    voltage: { value: 6.1, unit: 'V', status: 'FAULT', lastUpdated: now, label: 'Bus Voltage', sensorModel: 'INA219' },
    current: { value: 350, unit: 'mA', status: 'HEALTHY', lastUpdated: now, label: 'Current', sensorModel: 'INA219' },
    power: { value: 2.14, unit: 'W', status: 'HEALTHY', lastUpdated: now, label: 'Power', sensorModel: 'INA219' },
    tilt: { value: { pitch: 1.0, roll: 0.5, yaw: 0 }, unit: '°', status: 'HEALTHY', lastUpdated: now, label: 'Attitude', sensorModel: 'MPU6050' },
    servoAngle: { value: 90, unit: '°', status: 'HEALTHY', lastUpdated: now, label: 'Solar Servo', sensorModel: 'SG90' },
    hazard: false,
    cameraStatus: { value: 'STANDBY', unit: 'status', status: 'HEALTHY', lastUpdated: now, label: 'Camera', sensorModel: 'OV7670' },
    pendingCommands: [],
    healthScore: 70,
    overallStatus: 'WARNING',
    latestAlert: 'NONE',
    uptimeSeconds: 60,
  };

  const anomalies = evaluateAnomalies(mockTelemetry, DEFAULT_THRESHOLDS, now);
  assert.ok(anomalies.some((a) => a.title.includes('Low Bus Voltage')));
  assert.ok(anomalies.some((a) => a.title.includes('Proximity Warning')));

  const health = calculateSpacecraftHealth(mockTelemetry, anomalies);
  assert.ok(health.score < 100);
});
