import React, { useState } from 'react';
import { X, Radio, Cpu, Network, Check, Plug, AlertCircle } from 'lucide-react';

interface LinkConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSimulated: boolean;
  setIsSimulated: (sim: boolean) => void;
  onConnectSerial: () => void;
  hasWebSerial: boolean;
}

export const LinkConfigModal: React.FC<LinkConfigModalProps> = ({
  isOpen,
  onClose,
  isSimulated,
  setIsSimulated,
  onConnectSerial,
  hasWebSerial,
}) => {
  const [activeTab, setActiveTab] = useState<'sim' | 'serial' | 'network'>(isSimulated ? 'sim' : 'serial');
  const [baudRate, setBaudRate] = useState('115200');
  const [wsUrl, setWsUrl] = useState('ws://127.0.0.1:8080/telemetry');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <h3 className="font-heading text-lg font-bold tracking-wide text-slate-100">
              COMMUNICATION LINK CONFIG
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

        {/* Tab selection */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setActiveTab('sim');
              setIsSimulated(true);
            }}
            className={`py-2 rounded-lg text-center transition-colors ${
              activeTab === 'sim'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SIMULATOR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('serial')}
            className={`py-2 rounded-lg text-center transition-colors ${
              activeTab === 'serial'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            WEB SERIAL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('network')}
            className={`py-2 rounded-lg text-center transition-colors ${
              activeTab === 'network'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            WEBSOCKET
          </button>
        </div>

        {/* Tab bodies */}
        {activeTab === 'sim' && (
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-mono font-bold">
              <Check className="w-4 h-4" />
              <span>ORBITAL SIMULATION ENGINE ACTIVE</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Streams continuous simulated orbital physics including LEO altitude decay, solar illumination angles, day/night eclipse transitions, and payload power draws for testing Aurora-01 systems without hardware.
            </p>
          </div>
        )}

        {activeTab === 'serial' && (
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                HARDWARE BAUD RATE:
              </label>
              <select
                value={baudRate}
                onChange={(e) => setBaudRate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100"
              >
                <option value="9600">9600 bps</option>
                <option value="57600">57600 bps</option>
                <option value="115200">115200 bps (Recommended)</option>
                <option value="230400">230400 bps</option>
              </select>
            </div>

            {hasWebSerial ? (
              <button
                type="button"
                onClick={() => {
                  onConnectSerial();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
              >
                <Plug className="w-4 h-4" />
                <span>CONNECT USB SERIAL DEVICE</span>
              </button>
            ) : (
              <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs font-sans flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Web Serial API is available in Chromium-based desktop browsers. On mobile, use Simulated telemetry or WebSocket relay.
                </span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'network' && (
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">
                GROUND STATION WEBSOCKET RELAY:
              </label>
              <input
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
            >
              <Network className="w-4 h-4" />
              <span>SAVE & CONNECT RELAY</span>
            </button>
          </div>
        )}

        {/* Done Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
