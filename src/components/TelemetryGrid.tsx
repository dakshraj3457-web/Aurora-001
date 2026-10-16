import React from 'react';
import {
  Wifi,
  WifiOff,
  Sun,
  Ruler,
  BatteryCharging,
  Zap,
  Compass,
  Bell,
  ShieldAlert,
  Power,
  RotateCcw,
  Navigation,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { TelemetryData, MissionMode } from '../types/telemetry';
import { getModeConfig } from '../utils/telemetryMath';
import { soundManager } from '../utils/sound';

interface TelemetryGridProps {
  telemetry: TelemetryData;
  onToggleConnection: () => void;
  onSetMode: (mode: MissionMode) => void;
  onOpenAlerts?: () => void;
  onToggleDistanceUnit?: () => void;
}

export const TelemetryGrid: React.FC<TelemetryGridProps> = ({
  telemetry,
  onToggleConnection,
  onSetMode,
  onOpenAlerts,
  onToggleDistanceUnit,
}) => {
  const isConnected = telemetry.connection === 'CONNECTED';
  const isConnecting = telemetry.connection === 'CONNECTING';

  const modes: { id: MissionMode; label: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'NORMAL',
      label: 'NORMAL',
      icon: <Activity className="w-4 h-4" />,
      color: 'emerald',
    },
    {
      id: 'POWER_SAVE',
      label: 'POWER SAVE',
      icon: <Power className="w-4 h-4" />,
      color: 'amber',
    },
    {
      id: 'SAFE_MODE',
      label: 'SAFE MODE',
      icon: <ShieldAlert className="w-4 h-4" />,
      color: 'red',
    },
    {
      id: 'COURSE_CHANGE',
      label: 'COURSE CHANGE',
      icon: <Navigation className="w-4 h-4" />,
      color: 'cyan',
    },
  ];

  const handleModeClick = (mode: MissionMode) => {
    soundManager.playModeChange();
    onSetMode(mode);
  };

  const currentModeConfig = getModeConfig(telemetry.mode);

  return (
    <div className="w-full space-y-5">
      {/* 2-Column Telemetry Cards Grid (matching photo layout) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* CARD 1: CONNECTION */}
        <div
          className={`relative p-3 sm:p-4 rounded-xl border backdrop-blur-md transition-all duration-200 ${
            isConnected
              ? 'bg-slate-900/80 border-cyan-500/40 shadow-[0_0_20px_rgba(0,240,255,0.12)]'
              : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs font-mono tracking-wider text-slate-400 uppercase">
            <span className="flex items-center space-x-1.5 truncate">
              {isConnected ? (
                <Wifi className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span className="truncate">CONNECTION</span>
            </span>
            <button
              type="button"
              onClick={onToggleConnection}
              className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors shrink-0 ${
                isConnected
                  ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {isConnected ? 'DISC' : isConnecting ? 'SYNC' : 'LINK'}
            </button>
          </div>

          <div className="mt-2">
            <div
              className={`text-lg sm:text-2xl font-heading font-bold tracking-wide truncate ${
                isConnected
                  ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                  : isConnecting
                  ? 'text-amber-400 animate-pulse'
                  : 'text-slate-400'
              }`}
            >
              {isConnected ? 'Connected' : isConnecting ? 'Syncing...' : 'Disconnected'}
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 mt-1 truncate">
              <span>{isConnected ? `${telemetry.signalDbm} dBm` : 'SIGNAL: 0%'}</span>
              <span>•</span>
              <span>{isConnected ? `${telemetry.packetRate} Hz PKT` : 'UHF 437MHz'}</span>
            </div>
          </div>
        </div>

        {/* CARD 2: MODE */}
        <div className="relative p-3.5 sm:p-4 rounded-xl border border-cyan-500/30 bg-slate-900/80 backdrop-blur-md transition-all duration-200">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono tracking-wider text-slate-400 uppercase">
            <span className="flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>MODE</span>
            </span>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentModeConfig.statusColor }}
            />
          </div>

          <div className="mt-2.5">
            <div
              className="text-lg sm:text-2xl font-heading font-bold tracking-wide truncate"
              style={{
                color: currentModeConfig.statusColor,
                textShadow: `0 0 10px ${currentModeConfig.statusColor}55`,
              }}
            >
              {telemetry.mode}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
              {currentModeConfig.telemetryRateHz}Hz • {currentModeConfig.txPowerDbm}dBm RF
            </div>
          </div>
        </div>

        {/* CARD 3: LIGHT */}
        <div className="relative p-3.5 sm:p-4 rounded-xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md transition-all duration-200">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono tracking-wider text-slate-400 uppercase">
            <span className="flex items-center space-x-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>LIGHT</span>
            </span>
            <span className="text-[10px] text-amber-400/80 font-mono">
              {isConnected ? (telemetry.light < 100 ? 'UMBRA' : 'SUNLIT') : 'STBY'}
            </span>
          </div>

          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 flex items-baseline space-x-1">
              <span>{isConnected ? Math.round(telemetry.light).toLocaleString() : '--'}</span>
              <span className="text-xs sm:text-sm font-sans text-amber-400/90 font-medium">Lux</span>
            </div>
            {isConnected && (
              <div className="w-full bg-slate-800 rounded-full h-1 mt-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-1 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(100, (telemetry.light / 2500) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: DISTANCE */}
        <div className="relative p-3.5 sm:p-4 rounded-xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md transition-all duration-200">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono tracking-wider text-slate-400 uppercase">
            <span className="flex items-center space-x-1.5">
              <Ruler className="w-3.5 h-3.5 text-cyan-400" />
              <span>DISTANCE</span>
            </span>
            {onToggleDistanceUnit && (
              <button
                type="button"
                onClick={onToggleDistanceUnit}
                className="text-[10px] font-mono text-cyan-400/80 hover:text-cyan-300 underline"
              >
                {telemetry.distanceUnit}
              </button>
            )}
          </div>

          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 flex items-baseline space-x-1">
              <span>{isConnected ? telemetry.distance.toFixed(1) : '--'}</span>
              <span className="text-xs sm:text-sm font-sans text-cyan-400/90 font-medium">
                {telemetry.distanceUnit}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
              {isConnected ? `ALT: ${telemetry.orbitAltitudeKm} km LEO` : 'LASER / PROX SENSOR'}
            </div>
          </div>
        </div>

        {/* CARD 5: VOLTAGE */}
        <div className="relative p-3.5 sm:p-4 rounded-xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md transition-all duration-200">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono tracking-wider text-slate-400 uppercase">
            <span className="flex items-center space-x-1.5">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              <span>VOLTAGE</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400/90">
              {isConnected ? `${telemetry.batteryLevel}%` : '2S BUS'}
            </span>
          </div>

          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 flex items-baseline space-x-1">
              <span>{isConnected ? telemetry.voltage.toFixed(2) : '--'}</span>
              <span className="text-xs sm:text-sm font-sans text-emerald-400/90 font-medium">V</span>
            </div>
            {isConnected && (
              <div className="w-full bg-slate-800 rounded-full h-1 mt-2 overflow-hidden">
                <div
                  className={`h-1 transition-all duration-300 rounded-full ${
                    telemetry.voltage < 6.4 ? 'bg-red-500' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, telemetry.batteryLevel))}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* CARD 6: CURRENT */}
        <div className="relative p-3.5 sm:p-4 rounded-xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md transition-all duration-200">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono tracking-wider text-slate-400 uppercase">
            <span className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>CURRENT</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-400/80">
              {isConnected ? `${telemetry.powerWatts} W` : 'PAYLOAD'}
            </span>
          </div>

          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 flex items-baseline space-x-1">
              <span>{isConnected ? Math.round(telemetry.current) : '--'}</span>
              <span className="text-xs sm:text-sm font-sans text-cyan-400/90 font-medium">mA</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
              {isConnected ? `LOAD: ${telemetry.powerWatts}W POWER` : 'SHUTDOWN DRAW: 0mA'}
            </div>
          </div>
        </div>

        {/* CARD 7: TILT */}
        <div className="relative p-3.5 sm:p-4 rounded-xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md transition-all duration-200">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono tracking-wider text-slate-400 uppercase">
            <span className="flex items-center space-x-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>TILT</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">3-AXIS GYRO</span>
          </div>

          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 flex items-baseline space-x-1">
              <span>
                {isConnected
                  ? `${telemetry.tilt.pitch >= 0 ? '+' : ''}${telemetry.tilt.pitch}`
                  : '--'}
              </span>
              <span className="text-xs sm:text-sm font-sans text-cyan-400/90 font-medium">°</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-1 flex space-x-2">
              <span>R: {isConnected ? `${telemetry.tilt.roll}°` : '--'}</span>
              <span>Y: {isConnected ? `${telemetry.tilt.yaw}°` : '--'}</span>
            </div>
          </div>
        </div>

        {/* CARD 8: LATEST ALERT */}
        <div
          onClick={onOpenAlerts}
          className={`relative p-3.5 sm:p-4 rounded-xl border backdrop-blur-md transition-all duration-200 cursor-pointer ${
            telemetry.latestAlert !== 'NONE'
              ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400/60'
              : 'bg-slate-900/60 border-cyan-500/20 hover:border-cyan-400/40'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono tracking-wider text-slate-400 uppercase">
            <span className="flex items-center space-x-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>LATEST ALERT</span>
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                telemetry.latestAlert !== 'NONE' ? 'bg-amber-400 animate-ping' : 'bg-slate-600'
              }`}
            />
          </div>

          <div className="mt-2.5">
            <div
              className={`text-base sm:text-lg font-heading font-bold tracking-wide truncate ${
                telemetry.latestAlert !== 'NONE'
                  ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                  : 'text-slate-300'
              }`}
            >
              {telemetry.latestAlert}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
              {telemetry.latestAlert !== 'NONE' ? 'Click to inspect log' : 'SYSTEM NOMINAL'}
            </div>
          </div>
        </div>
      </div>

      {/* MISSION MODES SECTION (exactly matching photo) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-heading font-bold tracking-widest text-slate-200 uppercase">
            MISSION MODES
          </h2>
          <span className="text-[10px] font-mono text-cyan-400/80">
            ACTIVE: <strong className="text-white">{telemetry.mode}</strong>
          </span>
        </div>

        {/* 2x2 Action Buttons (matching photo buttons) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {modes.map((m) => {
            const isActive = telemetry.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModeClick(m.id)}
                className={`py-3 px-3.5 rounded-xl font-heading text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-150 flex items-center justify-center space-x-2 border shadow-sm active:scale-98 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400/50'
                    : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:border-cyan-500/50 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-cyan-400' : 'text-slate-500'}>
                  {m.icon}
                </span>
                <span>{m.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-1 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
