import React from 'react';
import { X, AlertTriangle, Info, AlertOctagon, Check, Trash2 } from 'lucide-react';
import { TelemetryAlert } from '../types/telemetry';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: TelemetryAlert[];
  onClear: () => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-heading text-lg font-bold tracking-wide text-slate-100">
              MISSION TELEMETRY ALERTS
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {alerts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-sm">
              <Check className="w-8 h-8 mx-auto mb-2 text-emerald-400/60" />
              ALL SUBSYSTEMS NOMINAL • NO UNRESOLVED ALERTS
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border flex items-start space-x-3 text-xs font-mono ${
                  alert.level === 'CRITICAL'
                    ? 'bg-red-950/30 border-red-500/40 text-red-200'
                    : alert.level === 'WARN'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {alert.level === 'CRITICAL' ? (
                    <AlertOctagon className="w-4 h-4 text-red-400" />
                  ) : alert.level === 'WARN' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Info className="w-4 h-4 text-cyan-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold tracking-wider">{alert.level}</span>
                    <span className="text-[10px] text-slate-400">{alert.timestamp}</span>
                  </div>
                  <p className="mt-1 text-slate-200 leading-snug">{alert.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-red-400 hover:bg-slate-800 flex items-center space-x-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>PURGE LOG</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold transition-colors"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
