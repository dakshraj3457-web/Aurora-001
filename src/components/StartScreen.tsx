import React, { useState, useEffect } from 'react';
import {
  Satellite,
  Radio,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Cpu,
  Layers,
  Sparkles,
  Terminal,
  Download,
  Smartphone,
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { soundManager } from '../utils/sound';

export const StartScreen: React.FC = () => {
  const { setActiveScreen, enterDemoMode } = useTelemetry();

  const [capabilities, setCapabilities] = useState<{
    bluetooth: boolean | null;
    serial: boolean | null;
    network: boolean;
    storage: boolean;
  }>({
    bluetooth: null,
    serial: null,
    network: true,
    storage: true,
  });

  const [initStage, setInitStage] = useState(0);

  useEffect(() => {
    // Perform genuine browser capability detection
    const hasBluetooth = typeof navigator !== 'undefined' && Boolean((navigator as any).bluetooth);
    const hasSerial = typeof navigator !== 'undefined' && Boolean((navigator as any).serial);
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    let hasStorage = true;
    try {
      localStorage.setItem('__aurora_test', '1');
      localStorage.removeItem('__aurora_test');
    } catch {
      hasStorage = false;
    }

    setCapabilities({
      bluetooth: hasBluetooth,
      serial: hasSerial,
      network: isOnline,
      storage: hasStorage,
    });

    // Staged animation reveal
    const t1 = setTimeout(() => setInitStage(1), 300);
    const t2 = setTimeout(() => setInitStage(2), 700);
    const t3 = setTimeout(() => setInitStage(3), 1100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleInitialize = () => {
    soundManager.playBeep(900, 0.08, 'sine');
    setActiveScreen('CONNECT');
  };

  const handleEnterDemo = () => {
    soundManager.playModeChange();
    enterDemoMode();
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden bg-space-grid">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Top Emblem Bar */}
      <header className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]">
            <Satellite className="w-4 h-4" />
          </div>
          <span className="font-heading font-bold text-xs tracking-widest text-slate-400 uppercase">
            AEROSPACE SYSTEMS LAB • MISSION CONTROL
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-cyan-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>STANDBY</span>
        </div>
      </header>

      {/* Hero Spacecraft Visual & Typography */}
      <main className="flex-1 flex flex-col items-center justify-center text-center my-6 z-10 max-w-xl mx-auto w-full">
        {/* Animated CubeSat Spacecraft Illustration */}
        <div className="relative w-52 h-52 sm:w-64 sm:h-64 mb-6 flex items-center justify-center">
          {/* Orbital Radar Ring */}
          <div className="absolute inset-0 rounded-full border border-cyan-500/20 border-dashed animate-spin [animation-duration:35s]" />
          <div className="absolute inset-4 rounded-full border border-cyan-500/15" />
          <div className="absolute inset-10 rounded-full bg-gradient-to-b from-cyan-950/20 to-slate-950/40 backdrop-blur-xs" />

          {/* Glowing Center Core */}
          <div className="relative z-10 flex flex-col items-center">
            {/* SVG CubeSat with deployable solar panels */}
            <svg
              viewBox="0 0 200 160"
              className="w-44 h-36 filter drop-shadow-[0_0_20px_rgba(0,240,255,0.4)] animate-pulse [animation-duration:4s]"
            >
              {/* Left Solar Array Wing */}
              <polygon
                points="20,50 65,58 65,102 20,110"
                fill="#0f172a"
                stroke="#00f0ff"
                strokeWidth="1.5"
              />
              <line x1="35" y1="53" x2="35" y2="107" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
              <line x1="50" y1="56" x2="50" y2="104" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
              <line x1="20" y1="80" x2="65" y2="80" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />

              {/* Right Solar Array Wing */}
              <polygon
                points="135,58 180,50 180,110 135,102"
                fill="#0f172a"
                stroke="#00f0ff"
                strokeWidth="1.5"
              />
              <line x1="150" y1="56" x2="150" y2="104" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
              <line x1="165" y1="53" x2="165" y2="107" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
              <line x1="135" y1="80" x2="180" y2="80" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />

              {/* Solar Array Hinges */}
              <rect x="65" y="76" width="6" height="8" fill="#d97706" rx="1" />
              <rect x="129" y="76" width="6" height="8" fill="#d97706" rx="1" />

              {/* Central 3U Chassis (Gold Kapton Insulation) */}
              <polygon
                points="71,35 129,35 129,125 71,125"
                fill="#b45309"
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
              {/* Inner Chassis Facets */}
              <polygon
                points="76,42 124,42 124,118 76,118"
                fill="#78350f"
                stroke="#00f0ff"
                strokeWidth="1"
                opacity="0.8"
              />

              {/* Optical Payload Lens (OV7670 nadir camera) */}
              <circle cx="100" cy="65" r="12" fill="#0f172a" stroke="#00f0ff" strokeWidth="2" />
              <circle cx="100" cy="65" r="7" fill="#0284c7" />
              <circle cx="98" cy="63" r="2.5" fill="#ffffff" opacity="0.8" />

              {/* Sensor Apertures (LDR + INA219 + HC-SR04 ports) */}
              <rect x="85" y="90" width="10" height="7" rx="1.5" fill="#00f0ff" opacity="0.8" />
              <circle cx="110" cy="94" r="3.5" fill="#10b981" />
              <circle cx="100" cy="110" r="2" fill="#ef4444" />

              {/* Dipole Antennas */}
              <line x1="100" y1="35" x2="100" y2="15" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="100" cy="13" r="2" fill="#00f0ff" />
              <line x1="100" y1="125" x2="80" y2="150" stroke="#94a3b8" strokeWidth="1" />
              <line x1="100" y1="125" x2="120" y2="150" stroke="#94a3b8" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* Mission Titles */}
        <div className="space-y-1 mb-3">
          <div className="inline-block px-3 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] tracking-wider uppercase mb-1">
            AUTONOMOUS CUBESAT SYSTEM
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold tracking-tight text-white">
            AURORA-01
          </h1>
          <p className="text-cyan-400 font-heading font-semibold text-xs sm:text-sm tracking-widest uppercase">
            AUTONOMOUS SPACECRAFT MISSION CONTROL
          </p>
        </div>

        <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto leading-relaxed mb-6 font-sans">
          Monitor spacecraft health. Detect anomalies. Protect the mission.
        </p>

        {/* Real Browser Capabilities & System Check Sequence */}
        <div className="w-full max-w-md bg-slate-950/70 border border-slate-800 rounded-xl p-3 mb-6 text-left backdrop-blur-md">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2 flex items-center justify-between">
            <span>PRE-FLIGHT HARDWARE SUBSYSTEM CHECK</span>
            <span className="text-cyan-400">READY</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex items-center space-x-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
              <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[9px]">WEB BLUETOOTH</span>
                <span className={capabilities.bluetooth ? 'text-emerald-400' : 'text-amber-400'}>
                  {capabilities.bluetooth ? 'SUPPORTED' : 'UNSUPPORTED'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[9px]">WEB SERIAL API</span>
                <span className={capabilities.serial ? 'text-emerald-400' : 'text-slate-400'}>
                  {capabilities.serial ? 'SUPPORTED' : 'DESKTOP ONLY'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[9px]">OFFLINE STORAGE</span>
                <span className="text-emerald-400">INDEXED/READY</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
              <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[9px]">CAMERA PIPELINE</span>
                <span className="text-cyan-300">ESP32-S3 OV7670</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-sm space-y-2.5">
          <button
            type="button"
            onClick={handleInitialize}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-heading text-sm font-bold tracking-wider uppercase transition-all duration-150 shadow-[0_0_25px_rgba(0,240,255,0.35)] flex items-center justify-center space-x-2 active:scale-98"
          >
            <span>INITIALIZE MISSION</span>
            <Radio className="w-4 h-4 ml-1" />
          </button>

          <button
            type="button"
            onClick={handleEnterDemo}
            className="w-full py-3 px-6 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-cyan-300 font-heading text-xs font-semibold tracking-wider uppercase transition-all duration-150 flex items-center justify-center space-x-2 active:scale-98"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>ENTER DEMO MODE (SIMULATED TELEMETRY)</span>
          </button>

          <a
            href="/aurora-01.apk"
            download="aurora-01-ground-station.apk"
            onClick={() => soundManager.playBeep(1200, 0.08, 'triangle')}
            className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-600/30 via-teal-600/20 to-cyan-600/30 hover:from-emerald-500/40 hover:to-cyan-500/40 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 font-heading text-xs font-bold tracking-wider uppercase transition-all duration-150 flex items-center justify-between shadow-[0_0_18px_rgba(16,185,129,0.2)] active:scale-98 group cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>DOWNLOAD ANDROID APK</span>
            </div>
            <div className="flex items-center space-x-1.5 font-mono text-[10px]">
              <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40">
                .apk
              </span>
              <Download className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
            </div>
          </a>

          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(900, 0.05, 'sine');
              setActiveScreen('BOOT');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 font-mono text-[11px] uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>REPLAY CINEMATIC BOOT WINDOW</span>
          </button>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-500 pt-4 border-t border-slate-900 z-10 gap-2">
        <div className="flex items-center space-x-2">
          <span>AURORA OS v2.4.0</span>
          <span>•</span>
          <span className="text-emerald-500 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>OFFLINE CAPABLE PWA</span>
          </span>
        </div>
        <div className="text-slate-500 text-center sm:text-right">
          ARDUINO UNO • MPU6050 • INA219 • HC-SR04 • LDR • ESP32-S3
        </div>
      </footer>
    </div>
  );
};
