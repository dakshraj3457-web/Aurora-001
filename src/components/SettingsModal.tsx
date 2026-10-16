import React, { useState } from 'react';
import {
  X,
  Settings,
  Sliders,
  Cpu,
  Radio,
  Download,
  Info,
  Check,
  RotateCcw,
  Sparkles,
  Volume2,
  Terminal,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { soundManager } from '../utils/sound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    thresholds,
    setThresholds,
    esp32Url,
    setEsp32Url,
    deviceName,
    setDeviceName,
    telemetry,
    enterDemoMode,
    setActiveScreen,
  } = useTelemetry();

  const [activeTab, setActiveTab] = useState<'THRESHOLDS' | 'COMM' | 'WIRING' | 'ABOUT'>('THRESHOLDS');
  const [localThresholds, setLocalThresholds] = useState(thresholds);
  const [localUrl, setLocalUrl] = useState(esp32Url);
  const [localName, setLocalName] = useState(deviceName);

  if (!isOpen) return null;

  const handleSave = () => {
    soundManager.playBeep(1200, 0.08, 'triangle');
    setThresholds(localThresholds);
    setEsp32Url(localUrl);
    setDeviceName(localName);
    onClose();
  };

  const handleResetDefaults = () => {
    setLocalThresholds({
      minVoltage: 6.5,
      maxVoltage: 8.4,
      maxCurrent: 850,
      maxTilt: 35,
      minDistance: 10,
      minLight: 50,
      staleTelemetryTimeout: 4000,
    });
  };

  const handleExportDiagnostics = () => {
    const report = {
      timestamp: new Date().toISOString(),
      appVersion: '2.4.0',
      telemetry,
      thresholds: localThresholds,
      esp32Url: localUrl,
      capabilities: {
        bluetooth: typeof navigator !== 'undefined' && Boolean((navigator as any).bluetooth),
        serial: typeof navigator !== 'undefined' && Boolean((navigator as any).serial),
      },
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `AURORA01_DIAGNOSTICS_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h3 className="font-heading font-bold text-base text-white tracking-wide">
              MISSION CONTROL SETTINGS
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 pt-2 text-xs font-mono space-x-2">
          {(['THRESHOLDS', 'COMM', 'WIRING', 'ABOUT'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-3 border-b-2 font-bold transition-all ${
                activeTab === tab
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'THRESHOLDS'
                ? 'ANOMALY THRESHOLDS'
                : tab === 'COMM'
                ? 'COMMUNICATION'
                : tab === 'WIRING'
                ? 'ARDUINO PINOUT'
                : 'ABOUT'}
            </button>
          ))}
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 text-xs font-mono space-y-4">
          {activeTab === 'THRESHOLDS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  Configure local rule-based safety monitoring limits:
                </span>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-cyan-400 hover:underline flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>RESET DEFAULTS</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Min Voltage */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">MIN BUS VOLTAGE:</span>
                    <strong className="text-cyan-300">{localThresholds.minVoltage} V</strong>
                  </div>
                  <input
                    type="range"
                    min="5.0"
                    max="7.4"
                    step="0.1"
                    value={localThresholds.minVoltage}
                    onChange={(e) =>
                      setLocalThresholds({ ...localThresholds, minVoltage: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500">
                    2S Li-ion safe cutoff threshold (default: 6.5V)
                  </span>
                </div>

                {/* Max Current */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">MAX BUS CURRENT:</span>
                    <strong className="text-cyan-300">{localThresholds.maxCurrent} mA</strong>
                  </div>
                  <input
                    type="range"
                    min="400"
                    max="1500"
                    step="50"
                    value={localThresholds.maxCurrent}
                    onChange={(e) =>
                      setLocalThresholds({ ...localThresholds, maxCurrent: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500">
                    INA219 overcurrent trip limit (default: 850mA)
                  </span>
                </div>

                {/* Max Tilt */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">MAX ATTITUDE TILT:</span>
                    <strong className="text-cyan-300">{localThresholds.maxTilt}°</strong>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="1"
                    value={localThresholds.maxTilt}
                    onChange={(e) =>
                      setLocalThresholds({ ...localThresholds, maxTilt: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500">
                    MPU6050 attitude limit before warning (default: 35°)
                  </span>
                </div>

                {/* Min Proximity Distance */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">MIN PROXIMITY RANGE:</span>
                    <strong className="text-cyan-300">{localThresholds.minDistance} cm</strong>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={localThresholds.minDistance}
                    onChange={(e) =>
                      setLocalThresholds({ ...localThresholds, minDistance: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500">
                    HC-SR04 obstacle detection limit (default: 10cm)
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'COMM' && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 block mb-1">SPACECRAFT CALLSIGN / NAME:</label>
                <input
                  type="text"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">ESP32-S3 WI-FI SERVER ENDPOINT:</label>
                <input
                  type="text"
                  value={localUrl}
                  onChange={(e) => setLocalUrl(e.target.value)}
                  placeholder="http://192.168.4.1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                />
                <span className="text-[10px] text-slate-500 mt-1 block font-sans">
                  Used for polling telemetry and acquiring OV7670 event photos over HTTP.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'WIRING' && (
            <div className="space-y-3 font-sans text-xs">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px]">
                <strong className="text-cyan-300 block">ARDUINO UNO PIN CONNECTION SPECIFICATION</strong>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                  <div>• INA219 SDA: Pin A4 (I2C 0x40)</div>
                  <div>• INA219 SCL: Pin A5 (I2C 0x40)</div>
                  <div>• MPU6050 SDA: Pin A4 (I2C 0x68)</div>
                  <div>• MPU6050 SCL: Pin A5 (I2C 0x68)</div>
                  <div>• HC-SR04 Trig: Digital Pin 9</div>
                  <div>• HC-SR04 Echo: Digital Pin 10</div>
                  <div>• LDR Sensor: Analog Pin A0</div>
                  <div>• SG90 Servo PWM: Digital Pin 3</div>
                  <div>• HC-05 RX/TX: Pins 10/11 (SoftSerial)</div>
                  <div>• ESP32-S3 Camera: Dedicated AP Wi-Fi</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ABOUT' && (
            <div className="space-y-3 text-xs font-sans text-slate-300">
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-heading font-bold text-sm text-white">AURORA-01 MISSION CONTROL</h4>
                <p>
                  Next-generation autonomous spacecraft operations software designed for Arduino UNO + ESP32-S3 CubeSat aerospace engineering projects.
                </p>
                <div className="pt-2 border-t border-slate-800 font-mono text-[11px] text-slate-400 flex flex-col sm:flex-row justify-between gap-2">
                  <span>VERSION: 2.4.0 (NATIVE APK & PWA)</span>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setActiveScreen('BOOT');
                      }}
                      className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center space-x-1"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>REPLAY BOOT</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportDiagnostics}
                      className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>EXPORT REPORT</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Native Android APK Installer Block */}
              <div className="p-4 bg-emerald-950/30 rounded-xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span className="font-heading font-bold text-emerald-300 tracking-wider">
                      ANDROID APK DOWNLOAD (.apk)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                    READY FOR PHONE
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Download the standalone APK package directly to your phone files to install and run AURORA-01 as a native Android application.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <a
                    href="/aurora-01.apk"
                    download="aurora-01-ground-station.apk"
                    onClick={() => soundManager.playBeep(1200, 0.08, 'triangle')}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-heading text-xs font-bold tracking-wider uppercase flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-98 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>PRIMARY DOWNLOAD (.apk)</span>
                  </a>

                  <a
                    href="https://litter.catbox.moe/wvsg9t.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => soundManager.playBeep(1100, 0.05, 'triangle')}
                    className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    title="Direct CDN mirror without sign-in"
                  >
                    <span>FAST MIRROR 1</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href="https://gofile.io/d/GCVX9Kmt"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => soundManager.playBeep(1100, 0.05, 'triangle')}
                    className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-cyan-300 font-mono text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    title="Gofile cloud mirror"
                  >
                    <span>CLOUD MIRROR 2</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 space-y-1">
                  <span className="text-cyan-400 font-bold block mb-1">PHONE INSTALLATION STEPS:</span>
                  <div>1. Tap 'DOWNLOAD APK FILE' above to save <span className="text-white">aurora-01.apk</span> to your phone's Files / Downloads folder.</div>
                  <div>2. Open your phone's <span className="text-emerald-300">Files</span> app, go to <span className="text-emerald-300">Downloads</span>, and tap <span className="text-white">aurora-01.apk</span>.</div>
                  <div>3. If prompted with "Install unknown apps", tap <span className="text-cyan-300">Settings</span> and enable <span className="text-emerald-300">Allow from this source</span>.</div>
                  <div>4. Tap <span className="text-emerald-300">Install</span> then <span className="text-emerald-300">Open</span>.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-heading text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20"
          >
            SAVE CONFIGURATION
          </button>
        </div>
      </div>
    </div>
  );
};
