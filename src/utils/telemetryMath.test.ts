import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBatteryPercentage,
  calculatePowerWatts,
  calculateTiltMagnitude,
  evaluateTelemetryAlert,
  calculatePacketChecksum,
  buildUplinkCommand,
  getModeConfig,
} from './telemetryMath.ts';

test('calculateBatteryPercentage accurately maps 2S Li-ion battery curves', () => {
  assert.equal(calculateBatteryPercentage(6.0), 0);
  assert.equal(calculateBatteryPercentage(5.5), 0);
  assert.equal(calculateBatteryPercentage(8.4), 100);
  assert.equal(calculateBatteryPercentage(8.8), 100);
  assert.equal(calculateBatteryPercentage(7.2), 50);
});

test('calculatePowerWatts computes voltage and current product', () => {
  assert.equal(calculatePowerWatts(8.0, 500), 4.0);
  assert.equal(calculatePowerWatts(7.4, 250), 1.85);
});

test('calculateTiltMagnitude computes Pythagorean angle', () => {
  assert.equal(calculateTiltMagnitude(3, 4), 5.0);
  assert.equal(calculateTiltMagnitude(0, 0), 0.0);
});

test('evaluateTelemetryAlert detects critical conditions correctly', () => {
  const lowBatt = evaluateTelemetryAlert({
    voltage: 6.2,
    current: 400,
    light: 500,
    tiltMagnitude: 5,
    distance: 20,
  });
  assert.equal(lowBatt.level, 'CRITICAL');
  assert.ok(lowBatt.message.includes('LOW BUS VOLTAGE'));

  const highCurr = evaluateTelemetryAlert({
    voltage: 7.8,
    current: 950,
    light: 500,
    tiltMagnitude: 5,
    distance: 20,
  });
  assert.equal(highCurr.level, 'WARN');
  assert.ok(highCurr.message.includes('HIGH CURRENT DRAW'));

  const nominal = evaluateTelemetryAlert({
    voltage: 7.8,
    current: 420,
    light: 800,
    tiltMagnitude: 3,
    distance: 25,
  });
  assert.equal(nominal.message, 'NONE');
});

test('calculatePacketChecksum and buildUplinkCommand construct valid frames', () => {
  const chk = calculatePacketChecksum('TEST');
  assert.equal(typeof chk, 'string');
  assert.equal(chk.length, 2);

  const cmd = buildUplinkCommand('PING');
  assert.ok(cmd.startsWith('$AURORA-01:CMD:PING*'));
});

test('getModeConfig returns correct operational profile', () => {
  const normal = getModeConfig('NORMAL');
  assert.equal(normal.telemetryRateHz, 10);
  assert.equal(normal.payloadEnabled, true);

  const safe = getModeConfig('SAFE_MODE');
  assert.equal(safe.payloadEnabled, false);
  assert.equal(safe.solarTracking, true);
});

import { parseTelemetryLine, validateAndFormatCommand } from './telemetryParser.ts';

test('parseTelemetryLine correctly parses newline-delimited JSON telemetry', () => {
  const jsonStr = '{"type":"telemetry","ldrLeft":420,"ldrCenter":510,"ldrRight":390,"distanceCm":32.5,"tiltX":2.4,"tiltY":-1.8,"servoAngle":90,"voltage":4.8,"currentMA":120,"hazard":false,"mode":"NORMAL"}';
  const packet = parseTelemetryLine(jsonStr);

  assert.equal(packet.isValid, true);
  assert.equal(packet.packetType, 'telemetry');
  assert.equal(packet.ldrLeft, 420);
  assert.equal(packet.ldrCenter, 510);
  assert.equal(packet.ldrRight, 390);
  assert.equal(packet.light, 440); // average of 420, 510, 390
  assert.equal(packet.distanceCm, 32.5);
  assert.equal(packet.tiltX, 2.4);
  assert.equal(packet.tiltY, -1.8);
  assert.equal(packet.servoAngle, 90);
  assert.equal(packet.voltage, 4.8);
  assert.equal(packet.currentMA, 120);
  assert.equal(packet.powerWatts, 0.58);
  assert.equal(packet.hazard, false);
  assert.equal(packet.mode, 'NORMAL');
});

test('parseTelemetryLine parses command ACKs and ignores malformed input safely', () => {
  const ackLine = '{"type":"ack","command":"MODE:NORMAL","status":"OK"}';
  const ack = parseTelemetryLine(ackLine);
  assert.equal(ack.isValid, true);
  assert.equal(ack.packetType, 'ack');
  assert.equal(ack.ackCommand, 'MODE:NORMAL');
  assert.equal(ack.ackStatus, 'OK');

  const malformed = '{bad json: true}';
  const bad = parseTelemetryLine(malformed);
  assert.equal(bad.isValid, false);
  assert.ok(bad.error?.includes('JSON parse error'));
});

test('validateAndFormatCommand enforces 0-180 servo limit and valid modes', () => {
  const validServo = validateAndFormatCommand('SERVO:90');
  assert.equal(validServo.valid, true);
  assert.equal(validServo.formatted, 'SERVO:90\n');

  const invalidServo = validateAndFormatCommand('SERVO:240');
  assert.equal(invalidServo.valid, false);

  const validMode = validateAndFormatCommand('MODE:SAFE');
  assert.equal(validMode.valid, true);
  assert.equal(validMode.formatted, 'MODE:SAFE\n');

  const invalidMode = validateAndFormatCommand('MODE:WARP_DRIVE');
  assert.equal(invalidMode.valid, false);
});

