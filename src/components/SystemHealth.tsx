import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Trash2,
  Sliders,
  Filter,
  Activity,
  Check,
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { AnomalyEvent } from '../types/telemetry';
import { soundManager } from '../utils/sound';

export const SystemHealth: React.FC = () => {
  const {
    telemetry,
    anomalies,
    acknowledgeAnomaly,
    clearAnomalies,
    thresholds,
    setActiveScreen,
  } = useTelemetry();

  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');

  const filtered = anomalies.filter((a) => {
    if (severityFilter === 'ALL') return true;
    return a.severity === severityFilter;
  });

  return (
    <div className="max-w-7xl mx-auto w-full space-y-4">
      {/* Header */}
      <div className="bg-slate-950/70 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-heading font-bold text-white tracking-wide">
              SYSTEM HEALTH & ANOMALY MONITOR
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Real-time rule-based telemetry monitoring running fully offline.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Severity Filters */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  severityFilter === sev
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={clearAnomalies}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
            title="Clear anomalies"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Thresholds Quick Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">MIN VOLTAGE</span>
          <strong className="text-cyan-300">{thresholds.minVoltage} V</strong>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">MAX CURRENT</span>
          <strong className="text-cyan-300">{thresholds.maxCurrent} mA</strong>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">MAX TILT</span>
          <strong className="text-cyan-300">{thresholds.maxTilt}°</strong>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">MIN DISTANCE</span>
          <strong className="text-cyan-300">{thresholds.minDistance} cm</strong>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">MIN LIGHT</span>
          <strong className="text-cyan-300">{thresholds.minLight} Lux</strong>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-500 block uppercase">STALE TIMEOUT</span>
          <strong className="text-cyan-300">{thresholds.staleTelemetryTimeout / 1000}s</strong>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h3 className="font-heading font-bold text-base text-white">ALL SYSTEMS NOMINAL</h3>
            <p className="text-xs text-slate-400 font-sans mt-1">
              No anomalies exceeding configured safety thresholds detected on current downlink.
            </p>
          </div>
        ) : (
          filtered.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`p-4 rounded-xl border backdrop-blur-md transition-all ${
                anomaly.severity === 'CRITICAL'
                  ? 'bg-red-950/20 border-red-500/40 text-red-200'
                  : anomaly.severity === 'WARNING'
                  ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                  : 'bg-cyan-950/20 border-cyan-500/30 text-cyan-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5 shrink-0">
                    {anomaly.severity === 'CRITICAL' ? (
                      <AlertOctagon className="w-5 h-5 text-red-400" />
                    ) : anomaly.severity === 'WARNING' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Info className="w-5 h-5 text-cyan-400" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-heading font-bold text-sm text-white">
                        {anomaly.title}
                      </h4>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          anomaly.severity === 'CRITICAL'
                            ? 'bg-red-500/30 text-red-300'
                            : anomaly.severity === 'WARNING'
                            ? 'bg-amber-500/30 text-amber-300'
                            : 'bg-cyan-500/30 text-cyan-300'
                        }`}
                      >
                        {anomaly.severity}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {anomaly.origin}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono mt-2 text-slate-300">
                      <div>
                        <span className="text-slate-500 block text-[10px]">SUBSYSTEM / SENSOR:</span>
                        <span>{anomaly.sensor}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">CURRENT VALUE:</span>
                        <strong className="text-white">{anomaly.readingValue}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">SAFE THRESHOLD:</span>
                        <span>{anomaly.threshold}</span>
                      </div>
                    </div>

                    <div className="mt-2.5 p-2 rounded-lg bg-black/40 border border-slate-800 text-xs font-sans text-slate-200">
                      <strong className="text-cyan-300 font-mono text-[11px] block mb-0.5">
                        FLIGHT CONTROLLER RECOMMENDATION:
                      </strong>
                      {anomaly.suggestedAction}
                    </div>
                  </div>
                </div>

                {/* Acknowledge Button */}
                {!anomaly.acknowledged && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playBeep(1100, 0.05, 'triangle');
                      acknowledgeAnomaly(anomaly.id);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs flex items-center space-x-1 shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ACK</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
