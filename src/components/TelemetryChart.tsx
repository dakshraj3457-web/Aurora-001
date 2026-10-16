import React from 'react';
import { TelemetryHistoryPoint } from '../types/telemetry';

interface TelemetryChartProps {
  data: TelemetryHistoryPoint[];
  metric: 'voltage' | 'current' | 'light' | 'distance' | 'tilt';
  title: string;
  unit: string;
  color: string;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  data,
  metric,
  title,
  unit,
  color,
}) => {
  if (!data || data.length < 2) {
    return (
      <div className="h-28 flex items-center justify-center text-xs text-slate-500 font-mono">
        WAITING FOR TELEMETRY FRAMES...
      </div>
    );
  }

  const values = data.map((d) => d[metric]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const width = 280;
  const height = 70;
  const paddingY = 8;
  const drawHeight = height - paddingY * 2;

  // Generate SVG path points
  const points = values.map((val, idx) => {
    const x = (idx / (values.length - 1)) * width;
    const normalized = (val - minVal) / range;
    const y = height - paddingY - normalized * drawHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  const currentVal = values[values.length - 1];

  return (
    <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/80">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
          {title} HISTORY
        </span>
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {typeof currentVal === 'number' ? currentVal.toFixed(1) : currentVal} {unit}
        </span>
      </div>

      <div className="relative w-full h-[70px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`grad-${metric}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Reference gridlines */}
          <line
            x1="0"
            y1={paddingY}
            x2={width}
            y2={paddingY}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="2,2"
          />
          <line
            x1="0"
            y1={height - paddingY}
            x2={width}
            y2={height - paddingY}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="2,2"
          />

          {/* Area fill */}
          <path d={areaPath} fill={`url(#grad-${metric})`} />

          {/* Sparkline curve */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Latest point pulse */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].split(',')[0]}
              cy={points[points.length - 1].split(',')[1]}
              r="3.5"
              fill={color}
              className="animate-pulse"
            />
          )}
        </svg>
      </div>

      <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mt-1">
        <span>MIN: {minVal.toFixed(1)}{unit}</span>
        <span>LIVE TELEMETRY WINDOW (30s)</span>
        <span>MAX: {maxVal.toFixed(1)}{unit}</span>
      </div>
    </div>
  );
};
