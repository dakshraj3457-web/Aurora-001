import React, { useState, useEffect, useRef } from 'react';
import {
  Satellite,
  Radio,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  ShieldCheck,
  Cpu,
  ChevronRight,
  Maximize2,
  Terminal,
  Compass,
  Download,
  Smartphone,
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { soundManager } from '../utils/sound';

type VideoFeedMode = 'ORBITAL' | 'WARP' | 'TACTICAL';

export const BootWindow: React.FC = () => {
  const { setActiveScreen, enterDemoMode } = useTelemetry();

  // State management
  const [feedMode, setFeedMode] = useState<VideoFeedMode>('ORBITAL');
  const [isMuted, setIsMuted] = useState(soundManager.isMuted());
  const [progress, setProgress] = useState(0);
  const [typedTitle, setTypedTitle] = useState('');
  const [typedSubtitle, setTypedSubtitle] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isBootComplete, setIsBootComplete] = useState(false);
  const [subsystemsReady, setSubsystemsReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const fullTitle = 'AURORA-01';
  const fullSubtitle = 'AUTONOMOUS SPACECRAFT MISSION CONTROL';

  const bootStages = [
    { pct: 12, log: '>> [INIT] BIOS v4.19 / QUANTUM RTOS KERNEL LINKED' },
    { pct: 28, log: '>> [BUS] I2C_0 (0x40 INA219, 0x68 MPU6050) DETECTED' },
    { pct: 44, log: '>> [AVIONICS] MPU-6050 6-DoF GYROSCOPE ZERO-CALIBRATED' },
    { pct: 58, log: '>> [POWER] INA219 HIGH-SIDE SHUNT VOLTAGE: 7.84V | 410mA NOMINAL' },
    { pct: 72, log: '>> [OPTICS] ESP32-S3 / OV7670 CMOS NADIR PAYLOAD ACTIVE' },
    { pct: 86, log: '>> [SONIC] HC-SR04 PROXIMITY ARRAY: 185cm CLEARANCE CONFIRMED' },
    { pct: 94, log: '>> [COMM] UHF CARRIER 437.450 MHz SYNCHRONIZED' },
    { pct: 100, log: '>> [SYSTEM] ALL SUBSYSTEMS NOMINAL. SPACECRAFT ONLINE.' },
  ];

  // Canvas-based stylized video generator (simulating high-tech aerospace orbital feed)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Starfield particles
    const starCount = 140;
    const stars = Array.from({ length: starCount }, () => ({
      x: (Math.random() - 0.5) * width * 1.5,
      y: (Math.random() - 0.5) * height * 1.5,
      z: Math.random() * width,
      size: Math.random() * 1.8 + 0.6,
      color: Math.random() > 0.4 ? '#00f0ff' : Math.random() > 0.5 ? '#38bdf8' : '#ffffff',
    }));

    const render = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;

      ctx.clearRect(0, 0, width, height);

      // Deep space background gradient
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.4,
        50,
        width / 2,
        height / 2,
        Math.max(width, height)
      );
      bgGrad.addColorStop(0, '#0a192f');
      bgGrad.addColorStop(0.5, '#050b18');
      bgGrad.addColorStop(1, '#02050b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Starfield rendering (Speed depends on feedMode)
      const speed = feedMode === 'WARP' ? 18 : feedMode === 'TACTICAL' ? 2 : 4;
      stars.forEach((star) => {
        star.z -= speed;
        if (star.z <= 0) {
          star.z = width;
          star.x = (Math.random() - 0.5) * width * 1.5;
          star.y = (Math.random() - 0.5) * height * 1.5;
        }

        const k = 280 / star.z;
        const px = star.x * k + width / 2;
        const py = star.y * k + height / 2;

        if (px >= 0 && px < width && py >= 0 && py < height) {
          const sz = Math.max(0.8, (1 - star.z / width) * star.size * 2.2);
          ctx.beginPath();
          ctx.arc(px, py, sz, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = Math.min(1, Math.max(0.2, (1 - star.z / width) * 1.2));
          ctx.fill();

          // Motion streak in WARP mode
          if (feedMode === 'WARP') {
            const prevK = 280 / (star.z + speed * 3.5);
            const prevPx = star.x * prevK + width / 2;
            const prevPy = star.y * prevK + height / 2;
            ctx.beginPath();
            ctx.moveTo(prevPx, prevPy);
            ctx.lineTo(px, py);
            ctx.strokeStyle = star.color;
            ctx.lineWidth = sz * 0.8;
            ctx.stroke();
          }
        }
      });
      ctx.globalAlpha = 1;

      // Draw Earth Limb / Horizon with Atmospheric Aurora Glow (in ORBITAL and TACTICAL modes)
      if (feedMode === 'ORBITAL' || feedMode === 'TACTICAL') {
        const earthRadius = Math.max(width, height) * 1.4;
        const earthCenterX = width * 0.5;
        const earthCenterY = height + earthRadius - 90;

        // Outer atmospheric glow
        const atmoGrad = ctx.createRadialGradient(
          earthCenterX,
          earthCenterY,
          earthRadius - 40,
          earthCenterX,
          earthCenterY,
          earthRadius + 60
        );
        atmoGrad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
        atmoGrad.addColorStop(0.3, 'rgba(14, 165, 233, 0.25)');
        atmoGrad.addColorStop(0.7, 'rgba(99, 102, 241, 0.12)');
        atmoGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = atmoGrad;
        ctx.beginPath();
        ctx.arc(earthCenterX, earthCenterY, earthRadius + 60, 0, Math.PI * 2);
        ctx.fill();

        // Aurora waves shimmer along polar atmosphere
        ctx.save();
        ctx.beginPath();
        for (let x = 0; x <= width; x += 15) {
          const wave =
            Math.sin(x * 0.008 + t * 2) * 14 +
            Math.cos(x * 0.015 - t * 1.5) * 8 +
            Math.sin(x * 0.03 + t * 3.2) * 4;
          const y = height - 70 + wave;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#00ffaa';
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.restore();

        // Earth Dark Body
        ctx.fillStyle = '#030814';
        ctx.beginPath();
        ctx.arc(earthCenterX, earthCenterY, earthRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw Orbit Trajectory Arcs
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(width / 2, height * 0.52, width * 0.45, height * 0.3, -0.22, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Draw Stylized Wireframe Spacecraft (AURORA-01 CubeSat)
      ctx.save();
      const satX = width / 2;
      const satY = height * 0.38 + Math.sin(t * 1.8) * 8;
      const satScale = Math.min(width, height) * 0.0028;

      ctx.translate(satX, satY);

      // Rotating Solar Array Wings & Chassis
      const angle = Math.sin(t * 0.8) * 0.08;
      ctx.rotate(angle);

      // Left Solar Panel
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(-90 * satScale, -28 * satScale, 48 * satScale, 56 * satScale);
      ctx.fill();
      ctx.stroke();

      // Left Panel Solar Cells
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 0.8;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo((-90 + i * 12) * satScale, -28 * satScale);
        ctx.lineTo((-90 + i * 12) * satScale, 28 * satScale);
        ctx.stroke();
      }

      // Right Solar Panel
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(42 * satScale, -28 * satScale, 48 * satScale, 56 * satScale);
      ctx.fill();
      ctx.stroke();

      // Right Panel Solar Cells
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo((42 + i * 12) * satScale, -28 * satScale);
        ctx.lineTo((42 + i * 12) * satScale, 28 * satScale);
        ctx.stroke();
      }

      // Panel Hinge Bars
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-42 * satScale, 0);
      ctx.lineTo(-24 * satScale, 0);
      ctx.moveTo(24 * satScale, 0);
      ctx.lineTo(42 * satScale, 0);
      ctx.stroke();

      // Central CubeSat Body (3U Form Factor)
      ctx.fillStyle = 'rgba(180, 83, 9, 0.8)';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(-24 * satScale, -38 * satScale, 48 * satScale, 76 * satScale);
      ctx.fill();
      ctx.stroke();

      // Inner Optical Payload Bezel (OV7670)
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -6 * satScale, 11 * satScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Optical Reflection
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-3 * satScale, -9 * satScale, 3 * satScale, 0, Math.PI * 2);
      ctx.fill();

      // Status indicator LED blinking
      const ledGlow = Math.sin(t * 8) > 0;
      ctx.fillStyle = ledGlow ? '#10b981' : '#059669';
      ctx.beginPath();
      ctx.arc(10 * satScale, 22 * satScale, 2.5 * satScale, 0, Math.PI * 2);
      ctx.fill();

      // Dipole Antenna Mast
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -38 * satScale);
      ctx.lineTo(0, -56 * satScale);
      ctx.stroke();
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, -56 * satScale, 2 * satScale, 0, Math.PI * 2);
      ctx.fill();

      // Attitude Vectors in Tactical Mode
      if (feedMode === 'TACTICAL') {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // X
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(45 * satScale, 0);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)'; // Y
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -45 * satScale);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)'; // Z
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-30 * satScale, 30 * satScale);
        ctx.stroke();
      }

      ctx.restore();

      // HUD Reticle Overlay
      ctx.save();
      ctx.translate(satX, satY);

      // Rotating dashed target circle
      ctx.rotate(t * 0.2);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, 85 * satScale, 0, Math.PI * 2);
      ctx.stroke();

      // Corner Reticle Brackets
      ctx.setLineDash([]);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      const bSize = 95 * satScale;
      const bLen = 14 * satScale;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(-bSize, -bSize + bLen);
      ctx.lineTo(-bSize, -bSize);
      ctx.lineTo(-bSize + bLen, -bSize);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(bSize - bLen, -bSize);
      ctx.lineTo(bSize, -bSize);
      ctx.lineTo(bSize, -bSize + bLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(-bSize, bSize - bLen);
      ctx.lineTo(-bSize, bSize);
      ctx.lineTo(-bSize + bLen, bSize);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(bSize - bLen, bSize);
      ctx.lineTo(bSize, bSize);
      ctx.lineTo(bSize, bSize - bLen);
      ctx.stroke();

      ctx.restore();

      // Spectrum Audio / Telemetry waveform at the bottom
      ctx.save();
      const waveWidth = Math.min(260, width * 0.4);
      const startX = width / 2 - waveWidth / 2;
      const waveY = height - 35;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < waveWidth; x += 4) {
        const h = Math.sin(x * 0.12 + t * 8) * Math.cos(x * 0.05 - t * 4) * 9;
        ctx.moveTo(startX + x, waveY);
        ctx.lineTo(startX + x, waveY - Math.abs(h));
      }
      ctx.stroke();
      ctx.restore();

      // CRT Scanlines Effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.2);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [feedMode]);

  // Typing Sequence for "AURORA-01" / "AURORA 1" and Mission Control Boot sequence
  useEffect(() => {
    let titleIndex = 0;
    let subtitleIndex = 0;
    let stageIndex = 0;
    let typingTimer: NodeJS.Timeout;
    let progressTimer: NodeJS.Timeout;

    // Type out the main title character by character with audio ticks
    const typeTitle = () => {
      if (titleIndex <= fullTitle.length) {
        setTypedTitle(fullTitle.slice(0, titleIndex));
        if (titleIndex > 0) {
          soundManager.playKeyClick();
        }
        titleIndex++;
        typingTimer = setTimeout(typeTitle, 110);
      } else {
        // Play majestic boot chime when AURORA-01 finishes typing
        soundManager.playBootChime();
        typeSubtitle();
      }
    };

    // Type out subtitle
    const typeSubtitle = () => {
      if (subtitleIndex <= fullSubtitle.length) {
        setTypedSubtitle(fullSubtitle.slice(0, subtitleIndex));
        subtitleIndex++;
        typingTimer = setTimeout(typeSubtitle, 35);
      } else {
        setSubsystemsReady(true);
      }
    };

    // Progress counter and staged terminal logs
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 2;
      const next = Math.min(100, currentProgress);
      setProgress(next);

      if (stageIndex < bootStages.length) {
        const stage = bootStages[stageIndex];
        if (stage && next >= stage.pct) {
          setTerminalLogs((logs) => [...logs, stage.log]);
          soundManager.playKeyClick();
          stageIndex++;
        }
      }

      if (next >= 100) {
        clearInterval(interval);
        setIsBootComplete(true);
      }
    }, 45);

    // Start title typing after initial delay
    const startTimeout = setTimeout(() => {
      typeTitle();
    }, 300);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(typingTimer);
      clearInterval(interval);
    };
  }, []);

  const handleLaunch = () => {
    soundManager.playModeChange();
    setActiveScreen('START');
  };

  const handleQuickDemo = () => {
    soundManager.playModeChange();
    enterDemoMode();
    setActiveScreen('DASHBOARD');
  };

  const handleSkip = () => {
    soundManager.playBeep(900, 0.08, 'sine');
    setTypedTitle(fullTitle);
    setTypedSubtitle(fullSubtitle);
    setProgress(100);
    setIsBootComplete(true);
    setSubsystemsReady(true);
    setTerminalLogs(bootStages.map((s) => s.log));
  };

  const handleReplay = () => {
    soundManager.playBeep(1100, 0.05, 'triangle');
    setTypedTitle('');
    setTypedSubtitle('');
    setProgress(0);
    setIsBootComplete(false);
    setSubsystemsReady(false);
    setTerminalLogs([]);

    let titleIndex = 0;
    const typeAgain = () => {
      if (titleIndex <= fullTitle.length) {
        setTypedTitle(fullTitle.slice(0, titleIndex));
        if (titleIndex > 0) soundManager.playKeyClick();
        titleIndex++;
        setTimeout(typeAgain, 90);
      } else {
        soundManager.playBootChime();
        setTypedSubtitle(fullSubtitle);
        setIsBootComplete(true);
        setSubsystemsReady(true);
      }
    };

    let p = 0;
    let sIdx = 0;
    const pTimer = setInterval(() => {
      p += 4;
      const nextP = Math.min(100, p);
      setProgress(nextP);
      if (sIdx < bootStages.length) {
        const st = bootStages[sIdx];
        if (st && nextP >= st.pct) {
          setTerminalLogs((logs) => [...logs, st.log]);
          soundManager.playKeyClick();
          sIdx++;
        }
      }
      if (nextP >= 100) {
        clearInterval(pTimer);
      }
    }, 35);

    setTimeout(typeAgain, 150);
  };

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col justify-between overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background Interactive Spacecraft Video Canvas */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Cyber Grid & Ambient Radial Lighting */}
      <div className="absolute inset-0 bg-space-grid opacity-30 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Aerospace HUD Header */}
      <header className="relative z-10 p-3 sm:p-6 flex items-center justify-between border-b border-cyan-500/20 bg-slate-950/60 backdrop-blur-md">
        {/* Logo and Tag */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.35)] animate-pulse">
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-heading font-extrabold text-sm tracking-wider text-white">
                AURORA AEROSPACE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                BOOT v2.4
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase block -mt-0.5">
              AUTONOMOUS MISSION CONTROL SYSTEM
            </span>
          </div>
        </div>

        {/* Video Mode Selector & Quick Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Feed Switcher */}
          <div className="hidden sm:flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5 text-[10px] font-mono">
            {(['ORBITAL', 'WARP', 'TACTICAL'] as VideoFeedMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  soundManager.playBeep(900, 0.03, 'sine');
                  setFeedMode(mode);
                }}
                className={`px-2.5 py-1 rounded transition-colors ${
                  feedMode === mode
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-400 hover:text-cyan-300 transition-colors shadow-sm"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Skip Intro */}
          {!isBootComplete && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/60 transition-all flex items-center space-x-1"
            >
              <span>SKIP</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {isBootComplete && (
            <button
              type="button"
              onClick={handleReplay}
              title="Replay boot sequence"
              aria-label="Replay boot sequence"
              className="p-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-400 hover:text-cyan-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Center Cinematic Display & Stylized Typing Experience */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full text-center">
        {/* Orbital Target Badge */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-xs tracking-wider mb-4 backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.2)]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>DEEP SPACE ASSET IDENTIFICATION</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">LEO-POLAR 412 KM</span>
        </div>

        {/* Cinematic Stylized Typing Box for "AURORA-01" */}
        <div className="relative mb-3 group">
          {/* Cyber Neon Bracket Frames */}
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-blue-500/20 to-cyan-500/10 blur-xl opacity-75" />

          <div className="relative px-6 py-3 rounded-2xl bg-slate-950/75 border border-cyan-500/40 backdrop-blur-xl shadow-[0_0_35px_rgba(0,240,255,0.25)]">
            {/* Glowing Corner Accents */}
            <span className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400" />
            <span className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400" />
            <span className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400" />

            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <span className="text-cyan-400/60 font-mono text-2xl sm:text-4xl">[</span>
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-heading font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-400 drop-shadow-[0_0_25px_rgba(0,240,255,0.6)]">
                {typedTitle || ' '}
              </h1>
              {typedTitle.length < fullTitle.length && (
                <span className="w-1.5 sm:w-2.5 h-8 sm:h-12 bg-cyan-400 inline-block animate-pulse -ml-1" />
              )}
              <span className="text-cyan-400/60 font-mono text-2xl sm:text-4xl">]</span>
            </div>

            {/* Subtitle with dynamic typing */}
            <div className="min-h-[24px] mt-1.5 flex items-center justify-center">
              <p className="font-heading font-semibold text-xs sm:text-sm tracking-[0.25em] text-cyan-300 uppercase">
                {typedSubtitle}
                {typedSubtitle.length < fullSubtitle.length && typedTitle.length >= fullTitle.length && (
                  <span className="w-1.5 h-3.5 bg-cyan-300 inline-block animate-pulse ml-1 align-middle" />
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Mission Motto / Tagline */}
        <p className="text-slate-300 text-xs sm:text-sm font-sans max-w-md mx-auto mb-5 leading-relaxed">
          Autonomous spacecraft telemetry, real-time sensor anomaly detection & deep-space flight control.
        </p>

        {/* Segmented Cyber Progress Bar */}
        <div className="w-full max-w-lg mb-5 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">INITIALIZATION SEQUENCE</span>
            </div>
            <span
              className={`font-bold ${
                isBootComplete ? 'text-emerald-400' : 'text-cyan-400'
              }`}
            >
              {progress}% {isBootComplete ? 'COMPLETE' : 'LOADING'}
            </span>
          </div>

          {/* 20-Segment Glowing LED Progress Bar */}
          <div className="grid grid-cols-20 gap-1 h-3.5 w-full bg-slate-900 rounded-md p-1 border border-slate-800/80">
            {Array.from({ length: 20 }).map((_, idx) => {
              const active = idx * 5 < progress;
              return (
                <div
                  key={idx}
                  className={`h-full rounded-xs transition-all duration-150 ${
                    active
                      ? idx > 16
                        ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                        : 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
                      : 'bg-slate-800/50'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2">
            <span>UHF CARRIER: 437.450 MHz</span>
            <span>ARDUINO UNO + ESP32-S3 SUBSYSTEM</span>
            <span>ENCRYPTION: AES-256</span>
          </div>
        </div>

        {/* Real-Time Terminal Log Box */}
        <div className="w-full max-w-lg bg-black/75 border border-cyan-500/20 rounded-xl p-3 mb-6 text-left font-mono text-[11px] backdrop-blur-md shadow-inner overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2 text-[10px] text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>DIAGNOSTIC TELEMETRY CONSOLE</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400">BUS ACTIVE</span>
            </div>
          </div>

          <div className="h-20 overflow-y-auto space-y-1 text-slate-300">
            {terminalLogs.length === 0 ? (
              <span className="text-slate-500 italic">Connecting to spacecraft serial bus...</span>
            ) : (
              terminalLogs.map((log, index) => (
                <div
                  key={index}
                  className={
                    log.includes('NOMINAL') || log.includes('ONLINE')
                      ? 'text-emerald-300 font-bold'
                      : log.includes('POWER')
                      ? 'text-cyan-300'
                      : 'text-slate-300'
                  }
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons to Enter Mission Control */}
        <div className="w-full max-w-sm space-y-2.5">
          <button
            type="button"
            onClick={handleLaunch}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-heading text-sm font-bold tracking-wider uppercase transition-all duration-150 shadow-[0_0_25px_rgba(0,240,255,0.4)] flex items-center justify-center space-x-2 active:scale-98 cursor-pointer"
          >
            <span>INITIALIZE MISSION CONTROL</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>

          <button
            type="button"
            onClick={handleQuickDemo}
            className="w-full py-3 px-6 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-cyan-300 font-heading text-xs font-semibold tracking-wider uppercase transition-all duration-150 flex items-center justify-center space-x-2 active:scale-98 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>ENTER DEMO MODE (SIMULATED SENSORS)</span>
          </button>

          <a
            href="/aurora-01.apk"
            download="aurora-01-ground-station.apk"
            onClick={() => soundManager.playBeep(1200, 0.08, 'triangle')}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600/25 via-emerald-500/20 to-teal-600/25 hover:from-emerald-500/35 hover:to-teal-500/35 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 font-heading text-xs font-bold tracking-wider uppercase transition-all duration-150 flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.2)] active:scale-98 cursor-pointer group"
          >
            <div className="flex items-center space-x-2">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>DOWNLOAD ANDROID APK (.apk)</span>
            </div>
            <div className="flex items-center space-x-1.5 font-mono text-[10px]">
              <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                INSTALLER
              </span>
              <Download className="w-3 h-3 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
            </div>
          </a>
        </div>
      </main>

      {/* Bottom Technical Telemetry Footer */}
      <footer className="relative z-10 p-3 sm:p-4 border-t border-cyan-500/20 bg-slate-950/80 backdrop-blur-md text-[11px] font-mono text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-cyan-300 font-bold">STATUS: READY FOR FLIGHT OPERATIONS</span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">LAT: 28.5721° N  LON: 80.6480° W</span>
        </div>
        <div className="flex items-center space-x-3 text-slate-500">
          <span>INA219 • MPU6050 • HC-SR04 • LDR • OV7670</span>
          <span>•</span>
          <span className="text-slate-400">AURORA OS v2.4.0</span>
        </div>
      </footer>
    </div>
  );
};
