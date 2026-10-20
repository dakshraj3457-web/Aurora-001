import React from 'react';
import {
  Sun,
  Ruler,
  Zap,
  BatteryMedium,
  Compass,
  RotateCcw,
  Camera,
  Usb,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Clock,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { MissionControls } from './MissionControls';
import { SensorStatus } from '../types/telemetry';

export const MainDashboard: React.FC = () => {
  const {
    telemetry,
    history,
    setActiveScreen,
    baudRate,
    connectTransport,
    enterDemoMode,
  } = useTelemetry();
  const isConnected = telemetry.connection === 'CONNECTED';

  // Status badge helper
  const renderStatusPill = (status: SensorStatus, isStale?: boolean) => {
    if (isStale) {
      return (
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
          STALE
        </span>
      );
    }
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            NOMINAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            WARNING
          </span>
        );
      case 'FAULT':
        return (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
            FAULT
          </span>
        );
      case 'UNAVAILABLE':
      default:
        return (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            OFFLINE
          </span>
        );
    }
  };

  // Mini sparkline renderer
  const renderSparkline = (
    key: 'voltage' | 'current' | 'light' | 'distance' | 'power',
    color: string
  ) => {
    const validData = history
      .map((h) => h[key])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

    if (validData.length < 3) {
      return (
        <div className="h-6 flex items-center text-[9px] font-mono text-slate-500">
          Awaiting real serial samples...
        </div>
      );
    }

    const min = Math.min(...validData);
    const max = Math.max(...validData);
    const range = max - min === 0 ? 1 : max - min;
    const width = 110;
    const height = 24;

    const points = validData.map((val, idx) => {
      const x = (idx / (validData.length - 1)) * width;
      const normalized = (val - min) / range;
      const y = height - normalized * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return (
      <div className="h-6 w-full flex items-center justify-end">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-24 sm:w-28 h-6 overflow-visible">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points.join(' ')}
          />
          <circle
            cx={points[points.length - 1].split(',')[0]}
            cy={points[points.length - 1].split(',')[1]}
            r="2"
            fill={color}
          />
        </svg>
      </div>
    );
  };

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return '--';
    const d = new Date(ts);
    return `${d.toTimeString().substring(0, 8)}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-4">
      {/* Spacecraft Overview & Hardware Cable Banner */}
      <div className="bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            {/* Small Spacecraft Visual */}
            <div className="w-14 h-14 rounded-xl bg-gradient-to-b from-cyan-950/60 to-slate-950 border border-cyan-500/40 flex items-center justify-center relative shrink-0">
              <svg viewBox="0 0 100 80" className="w-10 h-8">
                <polygon points="10,25 32,29 32,51 10,55" fill="#0f172a" stroke="#00f0ff" strokeWidth="1" />
                <polygon points="68,29 90,25 90,55 68,51" fill="#0f172a" stroke="#00f0ff" strokeWidth="1" />
                <rect x="35" y="18" width="30" height="44" fill="#b45309" stroke="#f59e0b" strokeWidth="1" />
                <circle cx="50" cy="33" r="6" fill="#0284c7" stroke="#00f0ff" strokeWidth="1" />
                <circle cx="50" cy="50" r="2" fill="#10b981" />
              </svg>
              {telemetry.isDemoMode && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-heading font-bold text-white tracking-wide">
                  AURORA-01
                </h2>
                {telemetry.isDemoMode ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    SIMULATED DEMO
                  </span>
                ) : isConnected ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    REAL HARDWARE LINK
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    DISCONNECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center space-x-1.5 mt-0.5">
                <Usb className="w-3.5 h-3.5 text-cyan-400 inline" />
                <span>USB OTG: {telemetry.connection} ({baudRate} baud)</span>
                <span>•</span>
                <span>PKTS: {telemetry.totalPacketsReceived}</span>
                {telemetry.parseErrorCount > 0 && (
                  <span className="text-amber-400 font-bold">({telemetry.parseErrorCount} ERR)</span>
                )}
              </p>
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 text-xs font-mono">
            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">FLIGHT MODE</span>
              <strong className="text-cyan-300 text-sm font-heading">{telemetry.mode}</strong>
            </div>

            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">SYSTEM HEALTH</span>
              <strong
                className={`text-sm font-heading ${
                  telemetry.healthScore > 80
                    ? 'text-emerald-400'
                    : telemetry.healthScore > 50
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {telemetry.healthScore}%
              </strong>
            </div>

            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">LAST TELEMETRY</span>
              <strong className="text-white text-xs font-mono block truncate">
                {formatTimestamp(telemetry.lastValidTelemetryTimestamp)}
              </strong>
            </div>
          </div>
        </div>

        {/* Hazard Alert Banner */}
        {telemetry.hazard && (
          <div className="mt-3 p-3 rounded-xl bg-red-950/60 border border-red-500/60 flex items-center space-x-3 text-red-200 text-xs animate-pulse">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <div className="flex-1 font-mono">
              <strong className="text-white font-heading">ARDUINO HAZARD DETECTED:</strong>{' '}
              {telemetry.hazardMessage || 'Critical obstacle proximity or attitude limit reached.'}
            </div>
          </div>
        )}

        {/* Telemetry Staleness Banner */}
        {telemetry.isStale && isConnected && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 flex items-center space-x-2 text-amber-200 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              DATA STALE: No serial updates received in the last 3 seconds. Verify USB cable and Arduino UNO power.
            </span>
          </div>
        )}

        {/* Offline / Error Recovery Banner */}
        {!isConnected && (
          <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${telemetry.connection === 'ERROR' ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'}`} />
                <strong className={`font-mono ${telemetry.connection === 'ERROR' ? 'text-rose-400' : 'text-amber-300'}`}>
                  USB OTG: {telemetry.connection}
                </strong>
                {telemetry.connectionError && (
                  <span className="text-slate-400 font-sans truncate max-w-xs sm:max-w-md">
                    — {telemetry.connectionError}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Sensor gauges show '--' until serial packets arrive. You can connect physical hardware or start live simulated data.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => connectTransport('USB_SERIAL')}
                className="py-1.5 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] flex items-center space-x-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                <span>CONNECT USB</span>
              </button>
              <button
                type="button"
                onClick={() => enterDemoMode()}
                className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-bold text-[11px] uppercase tracking-wider flex items-center space-x-1 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                <span>GET DATA NOW</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveScreen('CONNECT')}
                className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] transition-colors"
              >
                SETUP GUIDE
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Telemetry Sensors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. THREE LDR READINGS (Left, Center, Right) */}
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/20 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="flex items-center space-x-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>3-CHANNEL LDR ARRAY</span>
            </span>
            {renderStatusPill(telemetry.light.status, telemetry.isStale)}
          </div>

          <div className="my-1 space-y-1.5">
            <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800 text-center font-mono">
              <div>
                <span className="text-[9px] text-slate-500 block">LEFT</span>
                <span className="text-xs font-bold text-amber-300">
                  {isConnected && telemetry.ldrLeft.value !== null ? telemetry.ldrLeft.value : '--'}
                </span>
              </div>
              <div className="border-x border-slate-800">
                <span className="text-[9px] text-slate-500 block">CTR</span>
                <span className="text-xs font-bold text-amber-300">
                  {isConnected && telemetry.ldrCenter.value !== null ? telemetry.ldrCenter.value : '--'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">RIGHT</span>
                <span className="text-xs font-bold text-amber-300">
                  {isConnected && telemetry.ldrRight.value !== null ? telemetry.ldrRight.value : '--'}
                </span>
              </div>
            </div>

            <div className="flex items-baseline justify-between text-xs font-mono px-0.5">
              <span className="text-slate-400 text-[10px]">AVG FLUX:</span>
              <span className="font-bold text-white">
                {isConnected && telemetry.light.value !== null ? Math.round(telemetry.light.value) : '--'}{' '}
                <span className="text-[10px] text-amber-400">Lux</span>
              </span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[9px] font-mono text-slate-500">
              {isConnected && telemetry.light.value !== null
                ? telemetry.light.value < 50
                  ? 'UMBRA'
                  : 'SUNLIT'
                : 'OFFLINE'}
            </span>
            {isConnected && renderSparkline('light', '#f59e0b')}
          </div>
        </div>

        {/* 2. HC-SR04 ULTRASONIC DISTANCE */}
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/20 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="flex items-center space-x-1.5">
              <Ruler className="w-3.5 h-3.5 text-cyan-400" />
              <span>ULTRASONIC DISTANCE</span>
            </span>
            {renderStatusPill(telemetry.distance.status, telemetry.isStale)}
          </div>

          <div className="my-1">
            <div className="text-2xl font-mono font-bold text-white flex items-baseline space-x-1">
              <span>
                {isConnected && telemetry.distance.value !== null
                  ? telemetry.distance.value.toFixed(1)
                  : '--'}
              </span>
              <span className="text-xs text-cyan-400 font-sans">{telemetry.distance.unit}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              SENSOR: {telemetry.distance.sensorModel}
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[9px] font-mono text-slate-500">
              {isConnected && telemetry.distance.value !== null
                ? telemetry.distance.value < 15
                  ? 'PROX HAZARD'
                  : 'CLEAR'
                : 'OFFLINE'}
            </span>
            {isConnected && renderSparkline('distance', '#00f0ff')}
          </div>
        </div>

        {/* 3. INA219 BUS VOLTAGE */}
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/20 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="flex items-center space-x-1.5">
              <BatteryMedium className="w-3.5 h-3.5 text-emerald-400" />
              <span>BUS VOLTAGE</span>
            </span>
            {renderStatusPill(telemetry.voltage.status, telemetry.isStale)}
          </div>

          <div className="my-1">
            <div className="text-2xl font-mono font-bold text-white flex items-baseline space-x-1">
              <span>
                {isConnected && telemetry.voltage.value !== null
                  ? telemetry.voltage.value.toFixed(2)
                  : '--'}
              </span>
              <span className="text-xs text-emerald-400 font-sans">{telemetry.voltage.unit}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              SENSOR: {telemetry.voltage.sensorModel}
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[9px] font-mono text-slate-500">2S LI-ION BUS</span>
            {isConnected && renderSparkline('voltage', '#10b981')}
          </div>
        </div>

        {/* 4. INA219 CURRENT DRAW */}
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/20 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>CURRENT DRAW</span>
            </span>
            {renderStatusPill(telemetry.current.status, telemetry.isStale)}
          </div>

          <div className="my-1">
            <div className="text-2xl font-mono font-bold text-white flex items-baseline space-x-1">
              <span>
                {isConnected && telemetry.current.value !== null
                  ? Math.round(telemetry.current.value)
                  : '--'}
              </span>
              <span className="text-xs text-cyan-400 font-sans">{telemetry.current.unit}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              SENSOR: {telemetry.current.sensorModel}
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[9px] font-mono text-slate-500">SHUNT MONITOR</span>
            {isConnected && renderSparkline('current', '#38bdf8')}
          </div>
        </div>

        {/* 5. CALCULATED POWER IN WATTS */}
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/20 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-300" />
              <span>TOTAL POWER</span>
            </span>
            {renderStatusPill(telemetry.power.status, telemetry.isStale)}
          </div>

          <div className="my-1">
            <div className="text-2xl font-mono font-bold text-white flex items-baseline space-x-1">
              <span>
                {isConnected && telemetry.power.value !== null
                  ? telemetry.power.value.toFixed(2)
                  : '--'}
              </span>
              <span className="text-xs text-cyan-300 font-sans">{telemetry.power.unit}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              FORMULA: (V × mA) / 1000
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[9px] font-mono text-slate-500">CALCULATED WATTAGE</span>
            {isConnected && renderSparkline('power', '#00f0ff')}
          </div>
        </div>

        {/* 6. MPU6050 3-AXIS GYRO / TILT */}
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/20 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="flex items-center space-x-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>ATTITUDE TILT</span>
            </span>
            {renderStatusPill(telemetry.tilt.status, telemetry.isStale)}
          </div>

          <div className="my-1">
            <div className="text-2xl font-mono font-bold text-white flex items-baseline space-x-1">
              <span>
                {isConnected
                  ? `${telemetry.tilt.value.pitch >= 0 ? '+' : ''}${telemetry.tilt.value.pitch.toFixed(1)}`
                  : '--'}
              </span>
              <span className="text-xs text-cyan-400 font-sans">{telemetry.tilt.unit}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              X: {isConnected ? `${telemetry.tilt.value.pitch}°` : '--'} • Y:{' '}
              {isConnected ? `${telemetry.tilt.value.roll}°` : '--'}
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-500">
            <span>MPU6050 6-DoF</span>
            <button
              type="button"
              onClick={() => setActiveScreen('MODEL_3D')}
              className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
            >
              VIEW 3D
            </button>
          </div>
        </div>

        {/* 7. SOLAR ARRAY SERVO ANGLE */}
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/20 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="flex items-center space-x-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>SOLAR SERVO</span>
            </span>
            {renderStatusPill(telemetry.servoAngle.status, telemetry.isStale)}
          </div>

          <div className="my-1">
            <div className="text-2xl font-mono font-bold text-white flex items-baseline space-x-1">
              <span>
                {isConnected && telemetry.servoAngle.value !== null
                  ? Math.round(telemetry.servoAngle.value)
                  : '--'}
              </span>
              <span className="text-xs text-emerald-400 font-sans">{telemetry.servoAngle.unit}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              ACTUATOR: {telemetry.servoAngle.sensorModel}
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-500">
            <span>STEERING LIMIT</span>
            <span className="text-emerald-400">0° - 180°</span>
          </div>
        </div>

        {/* 8. ESP32-S3 OV7670 CAMERA */}
        <div
          onClick={() => setActiveScreen('CAMERA')}
          className="p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/20 backdrop-blur-md flex flex-col justify-between cursor-pointer hover:border-cyan-400/40 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="flex items-center space-x-1.5">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>OV7670 CAMERA</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="my-1">
            <div className="text-base sm:text-lg font-heading font-bold text-slate-200">
              {telemetry.isDemoMode
                ? 'DEMO IMAGER'
                : isConnected
                ? 'STANDBY'
                : 'OFFLINE'}
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              ESP32-S3 Subsystem
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-500">
            <span>VGA / QQVGA</span>
            <span className="text-cyan-400">CLICK TO VIEW</span>
          </div>
        </div>
      </div>

      {/* Mission Control Commands Section */}
      <div className="bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl">
        <MissionControls />
      </div>
    </div>
  );
};
