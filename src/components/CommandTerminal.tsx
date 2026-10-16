import React, { useState } from 'react';
import { Terminal, Send, Play, RefreshCw, Zap, ShieldAlert, Sliders, CheckCircle2 } from 'lucide-react';
import { buildUplinkCommand } from '../utils/telemetryMath';
import { soundManager } from '../utils/sound';

interface CommandTerminalProps {
  onSendCommand: (cmd: string) => void;
  onFireThruster: () => void;
  onCalibrateGyro: () => void;
  onToggleSolarPanels: () => void;
  onResetOBC: () => void;
  onClearAlerts: () => void;
  onUpdateManualTelemetry: (field: string, value: number) => void;
  isSimulated: boolean;
  setIsSimulated: (val: boolean) => void;
  solarStatus: string;
  commandLogs: { time: string; type: 'UPLINK' | 'DOWNLINK' | 'SYSTEM'; text: string }[];
  currentValues: {
    voltage: number;
    current: number;
    light: number;
    distance: number;
    pitch: number;
    roll: number;
  };
}

export const CommandTerminal: React.FC<CommandTerminalProps> = ({
  onSendCommand,
  onFireThruster,
  onCalibrateGyro,
  onToggleSolarPanels,
  onResetOBC,
  onClearAlerts,
  onUpdateManualTelemetry,
  isSimulated,
  setIsSimulated,
  solarStatus,
  commandLogs,
  currentValues,
}) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'override'>('terminal');
  const [customCommand, setCustomCommand] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommand.trim()) return;
    const formatted = buildUplinkCommand(customCommand.trim().toUpperCase());
    onSendCommand(formatted);
    soundManager.playBeep(1200, 0.05, 'triangle');
    setCustomCommand('');
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl flex flex-col h-full">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-heading text-sm font-semibold tracking-wider text-slate-200 uppercase">
            GROUND CONTROL TERMINAL
          </span>
        </div>

        <div className="flex items-center space-x-1.5 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1 rounded-md font-mono transition-colors ${
              activeTab === 'terminal'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            COMMAND LOGS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('override')}
            className={`px-3 py-1 rounded-md font-mono transition-colors flex items-center space-x-1 ${
              activeTab === 'override'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3 h-3 mr-1" />
            <span>SENSOR OVERRIDE</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'terminal' ? (
          <div className="flex flex-col h-full space-y-4">
            {/* Quick Action Buttons */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-2">
                RAPID UPLINK COMMANDS
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={onFireThruster}
                  className="px-3 py-2 text-xs font-mono rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>FIRE THRUSTER</span>
                </button>

                <button
                  type="button"
                  onClick={onCalibrateGyro}
                  className="px-3 py-2 text-xs font-mono rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-slate-200 transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>CALIBRATE GYRO</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleSolarPanels}
                  className="px-3 py-2 text-xs font-mono rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-slate-200 transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{solarStatus === 'DEPLOYED' ? 'STOW WINGS' : 'DEPLOY WINGS'}</span>
                </button>

                <button
                  type="button"
                  onClick={onResetOBC}
                  className="px-3 py-2 text-xs font-mono rounded-lg bg-amber-950/20 hover:bg-amber-900/30 border border-amber-500/30 text-amber-300 transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>RESET OBC</span>
                </button>

                <button
                  type="button"
                  onClick={onClearAlerts}
                  className="px-3 py-2 text-xs font-mono rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CLEAR ALERTS</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSendCommand('$AURORA-01:CMD:PING*6E')}
                  className="px-3 py-2 text-xs font-mono rounded-lg bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/20 text-cyan-300 transition-all flex items-center justify-center space-x-1.5 shadow-sm active:scale-95"
                >
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>PING BEACON</span>
                </button>
              </div>
            </div>

            {/* Downlink / Uplink Log Window */}
            <div className="flex-1 min-h-[140px] max-h-[180px] bg-black/60 rounded-xl p-3 border border-slate-800 font-mono text-[11px] overflow-y-auto space-y-1">
              <div className="text-slate-500 select-none border-b border-slate-800/80 pb-1 mb-1">
                // AURORA-01 GS-UPLINK LOG STREAM (FREQ: 437.450 MHz)
              </div>
              {commandLogs.map((log, index) => (
                <div key={index} className="flex items-start space-x-2 leading-relaxed">
                  <span className="text-slate-500 shrink-0">[{log.time}]</span>
                  <span
                    className={`font-semibold shrink-0 px-1 rounded text-[9px] ${
                      log.type === 'UPLINK'
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : log.type === 'DOWNLINK'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {log.type}
                  </span>
                  <span className="text-slate-300 break-all">{log.text}</span>
                </div>
              ))}
            </div>

            {/* Custom Command Input */}
            <form onSubmit={handleSend} className="flex items-center space-x-2 pt-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder="Enter command (e.g., STATUS, ECHO, GYRO_RESET, SLEEP)..."
                  className="w-full bg-slate-950/90 border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
                />
              </div>
              <button
                type="submit"
                aria-label="Send telemetry command"
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-lg shadow-cyan-500/20 active:scale-95"
              >
                <span>TRANSMIT</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        ) : (
          /* Manual Sensor Override Sliders */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h4 className="text-xs font-mono font-bold text-slate-200">
                  MANUAL SENSOR BENCH OVERRIDE
                </h4>
                <p className="text-[11px] text-slate-400">
                  Adjust simulated sensor inputs in real-time to verify alert limits and attitude response.
                </p>
              </div>
              <label className="flex items-center space-x-2 text-xs font-mono text-cyan-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSimulated}
                  onChange={(e) => setIsSimulated(e.target.checked)}
                  className="rounded border-cyan-500/40 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                />
                <span>ORBIT AUTORUN</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Voltage Slider */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">BUS VOLTAGE:</span>
                  <span className="text-cyan-300 font-bold">{currentValues.voltage.toFixed(2)} V</span>
                </div>
                <input
                  type="range"
                  min="5.8"
                  max="8.6"
                  step="0.05"
                  value={currentValues.voltage}
                  onChange={(e) => onUpdateManualTelemetry('voltage', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                  <span>5.8V (Cutoff)</span>
                  <span>7.4V (Nominal)</span>
                  <span>8.4V (Full)</span>
                </div>
              </div>

              {/* Current Slider */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">CURRENT DRAW:</span>
                  <span className="text-cyan-300 font-bold">{Math.round(currentValues.current)} mA</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1200"
                  step="10"
                  value={currentValues.current}
                  onChange={(e) => onUpdateManualTelemetry('current', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                  <span>50mA</span>
                  <span>450mA</span>
                  <span>1200mA (Overload)</span>
                </div>
              </div>

              {/* Light Intensity Slider */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">LIGHT INTENSITY:</span>
                  <span className="text-amber-300 font-bold">{Math.round(currentValues.light)} Lux</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3000"
                  step="25"
                  value={currentValues.light}
                  onChange={(e) => onUpdateManualTelemetry('light', parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                  <span>0 (Eclipse)</span>
                  <span>1200 (Nominal)</span>
                  <span>3000 (Direct Solar)</span>
                </div>
              </div>

              {/* Distance Slider */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">DISTANCE SENSOR:</span>
                  <span className="text-cyan-300 font-bold">{currentValues.distance.toFixed(1)} cm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  step="1"
                  value={currentValues.distance}
                  onChange={(e) => onUpdateManualTelemetry('distance', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                  <span>0 cm (Collision)</span>
                  <span>50 cm</span>
                  <span>150 cm</span>
                </div>
              </div>

              {/* Pitch Slider */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">GYRO PITCH:</span>
                  <span className="text-cyan-300 font-bold">{currentValues.pitch}°</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="1"
                  value={currentValues.pitch}
                  onChange={(e) => onUpdateManualTelemetry('pitch', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                  <span>-60°</span>
                  <span>0° (Stable)</span>
                  <span>+60°</span>
                </div>
              </div>

              {/* Roll Slider */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">GYRO ROLL:</span>
                  <span className="text-cyan-300 font-bold">{currentValues.roll}°</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="1"
                  value={currentValues.roll}
                  onChange={(e) => onUpdateManualTelemetry('roll', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                  <span>-60°</span>
                  <span>0° (Stable)</span>
                  <span>+60°</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
