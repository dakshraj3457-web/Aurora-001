import React, { useState } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Radio,
  Camera,
  Activity,
  Bot,
  Layers,
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { MissionLogEntry } from '../types/telemetry';
import { soundManager } from '../utils/sound';

export const MissionLog: React.FC = () => {
  const { missionLogs, clearMissionLogs } = useTelemetry();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filter logs
  const filteredLogs = missionLogs.filter((log) => {
    if (selectedSeverity !== 'ALL' && log.severity !== selectedSeverity) return false;
    if (selectedType !== 'ALL' && log.type !== selectedType) return false;
    if (
      searchTerm &&
      !log.message.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !log.details?.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Export to JSON
  const handleExportJSON = () => {
    soundManager.playBeep(1100, 0.05, 'triangle');
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(missionLogs, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `AURORA01_MISSION_LOG_${Date.now()}.json`;
    a.click();
  };

  // Export to CSV
  const handleExportCSV = () => {
    soundManager.playBeep(1100, 0.05, 'triangle');
    const header = ['Timestamp', 'ISO Date', 'Type', 'Severity', 'Simulated', 'Message', 'Details'];
    const rows = missionLogs.map((l) => [
      l.timestamp,
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.type}"`,
      `"${l.severity}"`,
      l.isDemo ? 'true' : 'false',
      `"${l.message.replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csvContent);
    a.download = `AURORA01_MISSION_LOG_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-4">
      {/* Header Bar */}
      <div className="bg-slate-950/70 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ScrollText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg sm:text-xl font-heading font-bold text-white tracking-wide">
              MISSION EVENT LOG
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Immutable flight events, telemetry acknowledgements, and command audit trail.
          </p>
        </div>

        {/* Export & Clear Actions */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-300 font-mono text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-300 font-mono text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors"
            title="Clear Mission Logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search event logs by keyword, command, or status..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">ALL SEVERITY</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">ALL EVENT TYPES</option>
            <option value="INITIALIZATION">INITIALIZATION</option>
            <option value="CONNECTION">CONNECTION</option>
            <option value="COMMAND">COMMAND</option>
            <option value="TELEMETRY">TELEMETRY</option>
            <option value="ANOMALY">ANOMALY</option>
            <option value="CAMERA">CAMERA</option>
          </select>
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="bg-slate-950/70 rounded-2xl border border-cyan-500/20 overflow-hidden backdrop-blur-md">
        <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-800/80 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No mission records match current search or filter criteria.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 hover:bg-slate-900/50 transition-colors flex items-start space-x-3"
              >
                <span className="text-slate-500 text-[10px] shrink-0 mt-0.5">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>

                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase ${
                    log.severity === 'CRITICAL'
                      ? 'bg-red-500/20 text-red-300'
                      : log.severity === 'WARN'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                  }`}
                >
                  {log.severity}
                </span>

                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                  {log.type}
                </span>

                {log.isDemo && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 shrink-0 border border-amber-500/20">
                    DEMO
                  </span>
                )}

                <div className="flex-1 min-w-0">
                  <span className="text-slate-200 break-words">{log.message}</span>
                  {log.details && (
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      {log.details}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl text-left">
            <h4 className="font-heading font-bold text-base text-white mb-2">
              PURGE MISSION LOGS?
            </h4>
            <p className="text-slate-400 text-xs font-sans mb-4">
              This will clear all stored event records for the current session. Exported CSV and JSON copies will remain untouched.
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  clearMissionLogs();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-semibold"
              >
                CONFIRM PURGE
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs"
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
