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
