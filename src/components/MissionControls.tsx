import React, { useState } from 'react';
import {
  Activity,
  Power,
  ShieldAlert,
  Navigation,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  HelpCircle,
} from 'lucide-react';
import { MissionMode } from '../types/telemetry';
import { useTelemetry } from '../context/TelemetryContext';
import { soundManager } from '../utils/sound';

export const MissionControls: React.FC = () => {
  const { telemetry, sendCommand } = useTelemetry();
  const [showSafeModeModal, setShowSafeModeModal] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<MissionMode | null>(null);

  const modes: {
    id: MissionMode;
    label: string;
    icon: React.ReactNode;
    color: string;
    description: string;
  }[] = [
    {
      id: 'NORMAL',
      label: 'NORMAL',
      icon: <Activity className="w-4 h-4" />,
      color: 'emerald',
      description: 'Nominal operations: active sensor polling, solar tracking, standard telemetry.',
    },
    {
      id: 'POWER_SAVE',
      label: 'POWER SAVE',
      icon: <Power className="w-4 h-4" />,
      color: 'amber',
      description: 'Conserves INA219 bus current: non-critical sensors slowed down, beacon only.',
    },
    {
      id: 'SAFE_MODE',
      label: 'SAFE MODE',
      icon: <ShieldAlert className="w-4 h-4" />,
      color: 'red',
      description: 'Emergency attitude lock: solar arrays oriented to sun, payloads offline.',
    },
    {
      id: 'COURSE_CHANGE',
      label: 'COURSE CHANGE',
      icon: <Navigation className="w-4 h-4" />,
      color: 'cyan',
      description: 'Active maneuver: thruster armed, MPU6050 attitude stabilization loop.',
    },
    {
      id: 'RESUME',
      label: 'RESUME MISSION',
      icon: <Play className="w-4 h-4" />,
      color: 'emerald',
      description: 'Clears holds and restores default autonomous orbital schedule.',
    },
  ];

  const handleModeRequest = async (mode: MissionMode) => {
    if (telemetry.connection !== 'CONNECTED') {
      soundManager.playAlert();
      return;
    }

    if (mode === 'SAFE_MODE') {
      setShowSafeModeModal(true);
      return;
    }

    executeModeCommand(mode);
  };

  const executeModeCommand = async (mode: MissionMode) => {
    soundManager.playBeep(980, 0.08, 'triangle');
    setPendingTarget(mode);
    await sendCommand(mode);
    setPendingTarget(null);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-2">
          <h3 className="font-heading font-bold text-xs sm:text-sm tracking-widest text-slate-200 uppercase">
            MISSION CONTROLS
          </h3>
          {telemetry.modePending && (
            <span className="flex items-center space-x-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              <Clock className="w-3 h-3 animate-spin" />
              <span>AWAITING ACK...</span>
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          ACTIVE: <strong className="text-cyan-400">{telemetry.mode}</strong>
        </span>
      </div>

      {/* Grid of Command Mode Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {modes.slice(0, 4).map((m) => {
          const isActive = telemetry.mode === m.id;
          const isPending = telemetry.modePending && telemetry.pendingModeTarget === m.id;

          return (
            <button
              key={m.id}
              type="button"
              disabled={telemetry.connection !== 'CONNECTED' || telemetry.modePending}
              onClick={() => handleModeRequest(m.id)}
              className={`p-3 rounded-xl font-heading text-xs font-bold tracking-wider uppercase transition-all duration-150 flex flex-col items-center justify-center space-y-1.5 border active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400/50'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:border-cyan-500/40 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>
                  {m.icon}
                </span>
                <span>{m.label}</span>
              </div>
              <div className="flex items-center space-x-1">
                {isPending ? (
                  <span className="text-[9px] font-mono text-amber-400 animate-pulse">PENDING ACK</span>
                ) : isActive ? (
                  <span className="text-[9px] font-mono text-emerald-400 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>CONFIRMED</span>
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-slate-500">STANDBY</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Full-width Resume Mission button */}
      <div className="mt-2.5">
        <button
          type="button"
          disabled={telemetry.connection !== 'CONNECTED' || telemetry.modePending}
          onClick={() => handleModeRequest('RESUME')}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 font-heading text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 active:scale-98 disabled:opacity-40"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          <span>RESUME AUTONOMOUS SCHEDULE</span>
        </button>
      </div>

      {/* SAFE MODE Confirmation Dialog */}
      {showSafeModeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-950 border border-red-500/50 rounded-2xl p-5 shadow-2xl text-left">
            <div className="flex items-center space-x-2 text-red-400 mb-2">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <h3 className="font-heading font-bold text-lg text-white">
                CONFIRM SAFE MODE ENGAGEMENT
              </h3>
            </div>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4 font-sans">
              Entering <strong className="text-red-400">SAFE MODE</strong> will instruct the
              Arduino flight controller to power down all non-essential experimental payloads, lock
              the MPU6050 sun-pointing orientation loop, and restrict radio downlink to low-power
              beacons.
            </p>

            <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl mb-4 text-xs font-mono text-red-300">
              UPLINK COMMAND: <strong>SAFE_MODE\n</strong>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowSafeModeModal(false);
                  executeModeCommand('SAFE_MODE');
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-heading text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-red-500/20"
              >
                TRANSMIT SAFE MODE
              </button>
              <button
                type="button"
                onClick={() => setShowSafeModeModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-heading text-xs font-bold uppercase hover:bg-slate-800 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
