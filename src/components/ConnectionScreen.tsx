import React, { useState, useEffect } from 'react';
import {
  Usb,
  Cpu,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Info,
  ChevronLeft,
  Sliders,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { soundManager } from '../utils/sound';

export const ConnectionScreen: React.FC = () => {
  const {
    telemetry,
    activeTransportType,
    connectTransport,
    disconnectTransport,
    enterDemoMode,
    setActiveScreen,
    baudRate,
    setBaudRate,
    deviceName,
  } = useTelemetry();

  const [isScanning, setIsScanning] = useState(false);
  const [hasNativeUsb, setHasNativeUsb] = useState(false);
  const [hasWebSerial, setHasWebSerial] = useState(false);
  const [hasWebUsb, setHasWebUsb] = useState(false);

  useEffect(() => {
    setHasNativeUsb(typeof window !== 'undefined' && Boolean(window.AuroraUsb?.isNativeAvailable()));
    setHasWebSerial(typeof navigator !== 'undefined' && Boolean((navigator as any).serial));
    setHasWebUsb(typeof navigator !== 'undefined' && Boolean((navigator as any).usb));
  }, []);

  const handleConnectUsb = async () => {
    setIsScanning(true);
    soundManager.playBeep(1000, 0.08, 'sine');
    try {
      connectTransport('USB_SERIAL');
    } finally {
      setTimeout(() => setIsScanning(false), 800);
    }
  };

  const handleDisconnect = async () => {
    soundManager.playBeep(450, 0.1, 'sawtooth');
    await disconnectTransport();
  };

  const statusColor = () => {
    switch (telemetry.connection) {
      case 'CONNECTED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
      case 'CONNECTING':
      case 'DEVICE FOUND':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse';
      case 'PERMISSION REQUIRED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'ERROR':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col p-4 sm:p-6 bg-space-grid">
      {/* Top Header */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between pb-4 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveScreen('START')}
          className="flex items-center space-x-1.5 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>START SCREEN</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-slate-400">USB LINK:</span>
          <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${statusColor()}`}>
            {telemetry.connection}
          </span>
        </div>
      </div>

      {/* Main Connection Container */}
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center py-6">
        <div className="bg-slate-900/70 border border-cyan-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6">
          {/* Section Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[11px] font-mono text-cyan-300">
              <Usb className="w-3.5 h-3.5 text-cyan-400" />
              <span>HARDWARE TELEMETRY INTERFACE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-wide text-white">
              USB OTG SERIAL LINK
            </h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              Direct physical wire connection between your Android smartphone and the Arduino UNO spacecraft avionics computer.
            </p>
          </div>

          {/* Hardware Connection Cable Graphic */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider text-center">
              PHYSICAL HARDWARE CABLE CHAIN
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-900 border border-cyan-500/30 flex flex-col items-center space-y-1">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-white">Android Device</span>
                <span className="text-[10px] text-slate-400">Host (USB OTG)</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center justify-center space-y-1 text-slate-300">
                <div className="flex items-center space-x-1 text-cyan-400">
                  <Usb className="w-4 h-4" />
                  <ArrowRight className="w-3 h-3" />
                </div>
                <span className="text-[11px] font-bold">USB-A to USB-B</span>
                <span className="text-[10px] text-slate-400">Data Cable (No Wireless)</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-emerald-500/30 flex flex-col items-center space-y-1">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-white">Arduino UNO</span>
                <span className="text-[10px] text-emerald-400">CDC-ACM / CH340</span>
              </div>
            </div>
          </div>

          {/* Connection State Details Box */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">CONNECTION STATE:</span>
              <span className={`font-bold ${
                telemetry.connection === 'CONNECTED' ? 'text-emerald-400' :
                telemetry.connection === 'ERROR' ? 'text-rose-400' :
                telemetry.connection === 'PERMISSION REQUIRED' ? 'text-amber-400' : 'text-slate-300'
              }`}>
                {telemetry.connection}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">DEVICE DRIVER:</span>
              <span className="text-cyan-300">
                {hasNativeUsb
                  ? 'Native Android USB Host (UsbManager)'
                  : hasWebSerial
                  ? 'Web Serial API Driver'
                  : hasWebUsb
                  ? 'WebUSB OTG Driver (Chrome Android)'
                  : 'Web Sandbox (Install APK for Hardware OTG)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">BAUD RATE:</span>
              <div className="flex items-center space-x-2">
                <select
                  value={baudRate}
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                  disabled={telemetry.connection === 'CONNECTED'}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 text-xs font-mono focus:border-cyan-400 outline-none"
                >
                  <option value={9600}>9600 (Arduino Default)</option>
                  <option value={19200}>19200</option>
                  <option value={38400}>38400</option>
                  <option value={57600}>57600</option>
                  <option value={115200}>115200</option>
                </select>
              </div>
            </div>

            {telemetry.connectionError && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/60 space-y-2 text-xs">
                <div className="flex items-start space-x-2 text-rose-300 font-bold font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>CONNECTION ERROR: {telemetry.connectionError}</span>
                </div>
                <div className="text-[11px] font-sans text-rose-200/90 pl-6 space-y-1">
                  <div>• <strong>Android OTG Toggle:</strong> On OnePlus, OPPO, Realme, and Xiaomi, go to <em>Settings &gt; System / Additional Settings</em> and toggle <strong>OTG Connection ON</strong>.</div>
                  <div>• <strong>Cable Check:</strong> Verify the Arduino UNO's green power LED is lit and that the OTG adapter supports data transfer (not charge-only).</div>
                  {!hasNativeUsb && (
                    <div>• <strong>Install APK:</strong> Browsers restrict direct hardware USB OTG. Download the standalone APK below for native plug-and-play USB Host support.</div>
                  )}
                </div>
                <div className="pt-2 pl-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      enterDemoMode();
                      setActiveScreen('DASHBOARD');
                    }}
                    className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading text-[11px] font-bold tracking-wider uppercase transition-colors"
                  >
                    GET DATA NOW (RUN SIMULATION)
                  </button>
                  <a
                    href="/aurora-01.apk"
                    download="aurora-01-ground-station.apk"
                    className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[11px] border border-cyan-500/40 transition-colors"
                  >
                    DOWNLOAD ANDROID APK
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Power Safety Warning */}
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-start space-x-3 text-amber-200 text-xs leading-relaxed">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 block mb-0.5 font-heading">ELECTRICAL SAFETY WARNING:</strong>
              Do NOT power servos or high-draw actuators directly from your smartphone's USB OTG port. Phone USB current limits may trip and disconnect serial. Use an external battery or 5V power supply for the SG90 servo with shared common ground.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {telemetry.connection === 'CONNECTED' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveScreen('DASHBOARD')}
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-heading text-sm font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>OPEN MISSION DASHBOARD</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="w-full py-3 px-6 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-heading text-xs font-bold tracking-wider uppercase transition-all cursor-pointer"
                >
                  <span>DISCONNECT USB CABLE</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectUsb}
                disabled={isScanning}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-heading text-sm font-bold tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(0,240,255,0.4)] flex items-center justify-center space-x-2 active:scale-98 cursor-pointer disabled:opacity-60"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    <span>INITIALIZING USB OTG LINK...</span>
                  </>
                ) : (
                  <>
                    <Usb className="w-4 h-4 mr-1" />
                    <span>CONNECT ARDUINO VIA USB OTG</span>
                  </>
                )}
              </button>
            )}

            {/* Offline Simulation Fallback */}
            <button
              type="button"
              onClick={() => {
                enterDemoMode();
                setActiveScreen('DASHBOARD');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-300 font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>TEST WITH LIVE TELEMETRY SIMULATION (GET DATA NOW)</span>
            </button>
          </div>

          {/* Quick Hardware Setup Checklist */}
          <div className="pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-400 space-y-1.5">
            <div className="text-cyan-400 font-bold mb-1">OTG TROUBLESHOOTING CHECKLIST:</div>
            <div>1. Connect USB-OTG adapter to Android phone (USB-C or Micro-USB).</div>
            <div>2. Plug standard USB-A to USB-B cable into Arduino UNO. Verify UNO power LED illuminates.</div>
            <div>3. If phone does not detect, check Android Settings &gt; System and toggle <strong className="text-white">OTG Storage / OTG Connection</strong> ON.</div>
            <div>4. When prompted with "Open AURORA-01 to handle this USB device?", tap <strong className="text-emerald-400">OK</strong>.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
