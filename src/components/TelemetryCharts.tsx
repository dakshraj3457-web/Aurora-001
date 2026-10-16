import React, { useState } from 'react';
import {
  LineChart,
  Sun,
  BatteryMedium,
  Zap,
  Compass,
  Ruler,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { TelemetryHistoryRecord } from '../types/telemetry';

export const TelemetryCharts: React.FC = () => {
  const { history, telemetry } = useTelemetry();
  const [selectedRange, setSelectedRange] = useState<'30s' | '1m' | '5m'>('30s');

  const sliceCount = selectedRange === '30s' ? 30 : selectedRange === '1m' ? 60 : 150;
  const currentData = history.slice(-sliceCount);

  // Reusable multi-metric SVG chart renderer
  const renderChart = (
    title: string,
    icon: React.ReactNode,
    metricKeys: { key: keyof TelemetryHistoryRecord; label: string; unit: string; color: string }[]
  ) => {
    // Gather all valid points
    const pointsList = metricKeys.map((mk) => {
      return currentData
        .map((d) => ({
          timeStr: d.timeStr,
          val: d[mk.key] as number | null,
        }))
        .filter((d): d is { timeStr: string; val: number } => typeof d.val === 'number' && Number.isFinite(d.val));
    });

    const allValues = pointsList.flatMap((pl) => pl.map((p) => p.val));

    if (allValues.length < 2) {
      return (
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-md flex flex-col items-center justify-center min-h-[160px] text-xs font-mono text-slate-500">
          <Clock className="w-6 h-6 mb-2 text-slate-600" />
          <span>Awaiting real-time telemetry frames to generate {title} curves...</span>
        </div>
      );
    }

    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const width = 500;
    const height = 110;
    const paddingY = 12;
    const drawHeight = height - paddingY * 2;

    const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;

    return (
      <div className="bg-slate-950/70 border border-cyan-500/20 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-2 border-b border-slate-800/80 gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-cyan-400">{icon}</span>
            <h4 className="font-heading font-bold text-sm text-white tracking-wide uppercase">
              {title}
            </h4>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            {metricKeys.map((mk) => {
              const lastVal =
                currentData.length > 0
                  ? (currentData[currentData.length - 1][mk.key] as number | null)
                  : null;
              return (
                <div key={mk.key} className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: mk.color }} />
                  <span className="text-slate-400">{mk.label}:</span>
                  <strong className="text-white" style={{ color: mk.color }}>
                    {typeof lastVal === 'number' ? lastVal.toFixed(1) : '--'} {mk.unit}
                  </strong>
                </div>
              );
            })}
          </div>
        </div>

        {/* SVG Sparkline Area */}
        <div className="relative w-full h-[110px]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            {/* Gridlines */}
            <line
              x1="0"
              y1={paddingY}
              x2={width}
              y2={paddingY}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="2,2"
            />
            <line
              x1="0"
              y1={height / 2}
              x2={width}
              y2={height / 2}
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="2,2"
            />
            <line
              x1="0"
              y1={height - paddingY}
              x2={width}
              y2={height - paddingY}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="2,2"
            />

            {/* Render lines for each metric */}
            {pointsList.map((pl, idx) => {
              if (pl.length < 2) return null;
              const mk = metricKeys[idx];
              const pts = pl.map((p, pIdx) => {
                const x = (pIdx / (pl.length - 1)) * width;
                const normalized = (p.val - minVal) / range;
                const y = height - paddingY - normalized * drawHeight;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              });

              return (
                <g key={mk.key}>
                  <path
                    d={`M ${pts.join(' L ')}`}
                    fill="none"
                    stroke={mk.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx={pts[pts.length - 1].split(',')[0]}
                    cy={pts[pts.length - 1].split(',')[1]}
                    r="3.5"
                    fill={mk.color}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Min / Avg / Max labels */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-900 mt-1">
          <span>MIN: {minVal.toFixed(1)}</span>
          <span>AVG: {avg.toFixed(1)}</span>
          <span>MAX: {maxVal.toFixed(1)}</span>
          <span>SAMPLES: {allValues.length}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-4">
      {/* Header Bar */}
      <div className="bg-slate-950/70 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <LineChart className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg sm:text-xl font-heading font-bold text-white tracking-wide">
              REAL-TIME TELEMETRY CHARTS
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Continuous multi-channel sensor telemetry plotting over time.
          </p>
        </div>

        {/* Time range selector */}
        <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          {(['30s', '1m', '5m'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRange(r)}
              className={`px-3 py-1 rounded-lg transition-colors ${
                selectedRange === r
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Bus Voltage */}
        {renderChart('Bus Voltage (INA219)', <BatteryMedium className="w-4 h-4" />, [
          { key: 'voltage', label: 'Voltage', unit: 'V', color: '#10b981' },
        ])}

        {/* 2. Current & Power */}
        {renderChart('Bus Current & Power (INA219)', <Zap className="w-4 h-4" />, [
          { key: 'current', label: 'Current', unit: 'mA', color: '#38bdf8' },
          { key: 'power', label: 'Power', unit: 'W', color: '#00f0ff' },
        ])}

        {/* 3. Solar Irradiance (LDR) */}
        {renderChart('Solar Irradiance Flux (LDR)', <Sun className="w-4 h-4" />, [
          { key: 'light', label: 'Illuminance', unit: 'Lux', color: '#f59e0b' },
        ])}

        {/* 4. Ultrasonic Proximity (HC-SR04) */}
        {renderChart('Proximity Obstacle Distance (HC-SR04)', <Ruler className="w-4 h-4" />, [
          { key: 'distance', label: 'Range', unit: 'cm', color: '#a855f7' },
        ])}

        {/* 5. Attitude Gyro Tilt (MPU6050 Pitch & Roll) */}
        <div className="lg:col-span-2">
          {renderChart('Attitude Orientation Tilt (MPU6050)', <Compass className="w-4 h-4" />, [
            { key: 'tiltPitch', label: 'Pitch', unit: '°', color: '#00f0ff' },
            { key: 'tiltRoll', label: 'Roll', unit: '°', color: '#ec4899' },
          ])}
        </div>
      </div>
    </div>
  );
};
