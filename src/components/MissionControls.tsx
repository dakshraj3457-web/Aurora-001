import React, { useState } from 'react';
import {
  Activity,
  Power,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Radio,
  Sliders,
  Check,
} from 'lucide-react';
import { MissionMode } from '../types/telemetry';
import { useTelemetry } from '../context/TelemetryContext';
import { soundManager } from '../utils/sound';

export const MissionControls: React.FC = () => {
  const { telemetry, sendCommand } = useTelemetry();
  const isConnected = telemetry.connection === 'CONNECTED';

  const [servoInput, setServoInput] = useState<number>(
    telemetry.servoAngle.value !== null ? telemetry.servoAngle.value : 90
  );
  const [showSafeModeConfirm, setShowSafeModeConfirm] = useState(false);

  const handleModeSend = async (modeName: string) => {
    if (!isConnected) return;
    if (modeName === 'SAFE') {
      setShowSafeModeConfirm(true);
      return;
    }
    soundManager.playBeep(980, 0.08, 'triangle');
    await sendCommand(`MODE:${modeName}`);
  };

  const handleConfirmSafeMode = async () => {
    setShowSafeModeConfirm(false);
    soundManager.playAlarm();
    await sendCommand('MODE:SAFE');
  };

  const handleServoSend = async (angle: number) => {
    if (!isConnected) return;
    const clamped = Math.min(180, Math.max(0, Math.round(angle)));
    setServoInput(clamped);
    soundManager.playBeep(1100, 0.06, 'sine');
    await sendCommand(`SERVO:${clamped}`);
  };

  const handlePing = async () => {
    if (!isConnected) return;
    soundManager.playBeep(1300, 0.05, 'sine');
    await sendCommand('PING');
  };

  // Recent commands
  const recentCommands = telemetry.pendingCommands.slice(0, 3);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-2">
          <h3 className="font-heading font-bold text-sm tracking-wider text-slate-200 uppercase">
            FLIGHT MISSION CONTROLS
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
            DISCONNECTED PROTECTION: {isConnected ? 'ARMED' : 'LOCKED'}
          </span>
        </div>

        {/* Current Active Mode Indicator */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-400">CURRENT MODE:</span>
          <span
            className={`px-2 py-0.5 rounded font-bold ${
              telemetry.mode === 'NORMAL'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : telemetry.mode === 'POWER_SAVE'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}
          >
            {telemetry.mode}
          </span>
        </div>
      </div>

      {!isConnected && (
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs font-mono flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            CONTROLS INHIBITED: Physical USB OTG connection required to transmit flight instructions to Arduino UNO.
          </span>
        </div>
      )}

      {/* Mode Control Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* NORMAL MODE */}
        <button
          type="button"
          onClick={() => handleModeSend('NORMAL')}
          disabled={!isConnected}
          className={`p-3 rounded-xl border font-mono text-left transition-all ${
            telemetry.mode === 'NORMAL'
              ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/40 text-slate-300'
          } disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-heading font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>NORMAL</span>
            </span>
            {telemetry.mode === 'NORMAL' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
          <p className="text-[10px] text-slate-400">
            Nominal flight schedule: standard polling and solar array tracking.
          </p>
        </button>

        {/* POWER SAVE MODE */}
        <button
          type="button"
          onClick={() => handleModeSend('POWER_SAVE')}
          disabled={!isConnected}
          className={`p-3 rounded-xl border font-mono text-left transition-all ${
            telemetry.mode === 'POWER_SAVE'
              ? 'bg-amber-500/20 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]'
              : 'bg-slate-900/60 border-slate-800 hover:border-amber-500/40 text-slate-300'
          } disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-heading font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <Power className="w-3.5 h-3.5" />
              <span>POWER SAVE</span>
            </span>
            {telemetry.mode === 'POWER_SAVE' && <Check className="w-3.5 h-3.5 text-amber-400" />}
          </div>
          <p className="text-[10px] text-slate-400">
            Conserves battery bus current by reducing non-critical sensor polling.
          </p>
        </button>

        {/* SAFE MODE */}
        <button
          type="button"
          onClick={() => handleModeSend('SAFE')}
          disabled={!isConnected}
          className={`p-3 rounded-xl border font-mono text-left transition-all ${
            telemetry.mode === 'SAFE_MODE'
              ? 'bg-red-500/20 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]'
              : 'bg-slate-900/60 border-slate-800 hover:border-red-500/40 text-slate-300'
          } disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-heading font-bold text-xs uppercase tracking-wider text-red-400 flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>SAFE MODE</span>
            </span>
            {telemetry.mode === 'SAFE_MODE' && <Check className="w-3.5 h-3.5 text-red-400" />}
          </div>
          <p className="text-[10px] text-slate-400">
            Emergency lockdown: freezes attitude, halts payloads, locks solar array.
          </p>
        </button>
      </div>

      {/* Solar Array Servo Control Subsystem */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-1">
          <div className="flex items-center space-x-2">
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            <span className="font-heading font-bold text-slate-200">
              SOLAR ARRAY STEERING ACTUATOR (SG90 SERVO)
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            TARGET ANGLE: <strong className="text-emerald-400 text-sm">{servoInput}°</strong> (CURRENT:{' '}
            {telemetry.servoAngle.value !== null ? `${telemetry.servoAngle.value}°` : '--'})
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={180}
            value={servoInput}
            onChange={(e) => setServoInput(Number(e.target.value))}
            disabled={!isConnected}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 disabled:opacity-40"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0° (STOWED)</span>
            <span>45°</span>
            <span>90° (ZENITH)</span>
            <span>135°</span>
            <span>180° (MAX)</span>
          </div>
        </div>

        {/* Preset Angles and Transmit Button */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center space-x-1 text-xs font-mono">
            {[0, 45, 90, 135, 180].map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() => setServoInput(deg)}
                disabled={!isConnected}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-300 text-xs font-mono disabled:opacity-40 cursor-pointer"
              >
                {deg}°
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePing}
              disabled={!isConnected}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-300 font-mono text-xs flex items-center space-x-1 disabled:opacity-40 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>PING ARDUINO</span>
            </button>

            <button
              type="button"
              onClick={() => handleServoSend(servoInput)}
              disabled={!isConnected}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-heading text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)] disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>TRANSMIT SERVO:{servoInput}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Command Acknowledgement Feed */}
      {recentCommands.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            RECENT COMMAND ACKNOWLEDGEMENT STATUS
          </div>
          <div className="space-y-1 font-mono text-xs">
            {recentCommands.map((cmd) => (
              <div key={cmd.id} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">TX: {cmd.command}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    cmd.status === 'ACKED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : cmd.status === 'SENT'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                      : cmd.status === 'TIMEOUT'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}
                >
                  {cmd.status === 'ACKED'
                    ? `CONFIRMED (ACK ${cmd.ackStatus || 'OK'})`
                    : cmd.status === 'SENT'
                    ? 'AWAITING ACK...'
                    : cmd.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safe Mode Confirmation Modal */}
      {showSafeModeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-950 border border-red-500/50 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <ShieldAlert className="w-6 h-6" />
              <h4 className="font-heading font-black text-lg text-white">CONFIRM SAFE MODE ENGAGEMENT</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Engaging SAFE MODE sends <code className="text-red-300 font-mono">MODE:SAFE</code> to the Arduino UNO.
              The flight computer will power down auxiliary payloads and lock solar array position.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSafeModeConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmSafeMode}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-heading text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
              >
                CONFIRM SAFE MODE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
